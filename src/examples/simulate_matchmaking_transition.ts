import { ConsoleAuditSink } from "../core/audit.js";
import { newId } from "../core/ids.js";
import { InMemoryIdentityStore } from "../identity/in_memory_store.js";
import { InMemoryEconomyLedger } from "../economy/in_memory_ledger.js";
import { EscrowService } from "../economy/escrow.js";
import { InMemoryTransitionStore } from "../core/transition/in_memory_transition_store.js";
import { ShardTransitionFSM } from "../core/transition/fsm.js";

import { createDefaultRegistry } from "../transitions/createDefaultRegistry.js";
import { executeTransition } from "../transitions/executeTransition.js";
import { InMemoryRequestIdempotencyStore } from "../transitions/requestIdempotencyStore.js";
import type { TransitionKind } from "../transitions/base/transition_types.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function main() {
  const actor = "sim.matchmaking";
  const audit = new ConsoleAuditSink();

  const identityStore = new InMemoryIdentityStore();
  const ledger = new InMemoryEconomyLedger();
  const escrow = new EscrowService(ledger);
  const transitions = new InMemoryTransitionStore();

  const fsm = new ShardTransitionFSM({ transitions, escrow, audit });

  const ctx = { fsm, identityStore, ledger, actor };
  const registry = createDefaultRegistry(ctx);
  const idempotency = new InMemoryRequestIdempotencyStore();

  // Seed identity
  const pid = newId("pid", 16);
  await identityStore.put({
    schema_version: "1.0.0",
    identity_id: pid,
    created_at: new Date().toISOString(),
    status: "active",
    auth: { provider: "internal", subject: `user:${pid}`, last_authenticated_at: new Date().toISOString() },
    profile: { display_name: "QueueRunner" },
    scopes: ["world.travel", "assets.transfer"],
    entitlements: [],
    audit: { created_by: actor, change_log_ref: "memory://audit" }
  });

  // Seed a protected asset (e.g., equipped weapon that must not dupe)
  const aid = newId("aid", 16);
  const currencyAid = newId("aid", 16);
  ledger.seed({
    schema_version: "1.0.0",
    asset_id: aid,
    asset_class: "item",
    asset_type: "equipped_weapon",
    scope: "global",
    owner: { owner_type: "player", owner_id: pid },
    state: { status: "active", quantity: 1, attributes: { label: "MatchWeapon" } },
    lifecycle: { created_at: new Date().toISOString(), origin: { origin_type: "grant", origin_ref: "seed" } },
    transfer_policy: { transferable: true, transfer_scope: "global", requires_escrow: true },
    integrity: { idempotency_key: newId("tx", 12), version: 1 },
    audit: { change_log_ref: "memory://audit", last_change_id: "seed" }
  });

  // Game-only currency is still an AssetOwnershipRecord. Match rewards are
  // reconciled through EconomicEvent -> EconomyLedger.mutate(), never by a
  // scalar transition field.
  ledger.seed({
    schema_version: "1.0.0",
    asset_id: currencyAid,
    asset_class: "currency",
    asset_type: "match_points",
    scope: "global",
    owner: { owner_type: "player", owner_id: pid },
    state: { status: "active", quantity: 0, attributes: { label: "MatchPoints" } },
    lifecycle: { created_at: new Date().toISOString(), origin: { origin_type: "grant", origin_ref: "seed" } },
    transfer_policy: { transferable: false, transfer_scope: "none", requires_escrow: false },
    integrity: { idempotency_key: newId("tx", 12), version: 1 },
    audit: { change_log_ref: "memory://audit", last_change_id: "seed" }
  });

  const match_id = `mid_${Date.now()}`;
  console.log(`Identity=${pid}`);
  console.log(`Match=${match_id}`);
  console.log(`Asset=${aid}`);
  console.log(`CurrencyAsset=${currencyAid}`);

  // Begin matchmaking transition (prepare+commit)
  const kind: TransitionKind = "matchmaking_queue";
  const begin = await executeTransition(ctx, registry, idempotency, {
    action: "begin",
    request_id: "req_mm_begin_001",
    change_id: "chg_mm_begin_001",
    request: {
      kind,
      identity_id: pid,
      from_shard: "sid_world_hub",
      // to_shard may be assigned by matchmaker later; we provide one for simulation clarity
      to_shard: "sid_match_instance_777",
      protected_assets: [aid],
      metadata: { match_id }
    }
  });

  assert(begin.outcome?.success === true, "Match begin should succeed.");
  const transition_id = begin.outcome?.transition_id!;
  assert(!!transition_id, "transition_id should exist.");

  const afterBegin = await ledger.get(aid);
  assert(afterBegin?.state.status === "escrow", "Asset should be escrowed during match.");

  // Simulate match completion: confirm transition to release escrow
  const confirm = await executeTransition(ctx, registry, idempotency, {
    action: "confirm",
    kind,
    transition_id,
    change_id: "chg_mm_confirm_001",
    outcome: {
      success: true,
      flags: ["win"],
      economic_events: [{
        asset_id: currencyAid,
        amount: 100,
        reason: "match_win_reward",
        change_id: "chg_mm_reward_001",
        timestamp: Date.now()
      }]
    }
  });

  assert(confirm.transition?.status === "confirmed", "Match transition should confirm.");

  const afterConfirm = await ledger.get(aid);
  assert(afterConfirm?.state.status === "active", "Asset should be active after confirm.");

  const afterCurrency = await ledger.get(currencyAid);
  assert(afterCurrency?.state.quantity === 100, "Currency event should be applied through ledger mutation.");

  console.log("Matchmaking simulation complete ✅");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

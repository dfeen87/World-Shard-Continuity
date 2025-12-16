import { ConsoleAuditSink } from "../core/audit.js";
import { newId } from "../core/ids.js";
import { InMemoryIdentityStore } from "../identity/in_memory_store.js";
import { InMemoryEconomyLedger } from "../economy/in_memory_ledger.js";
import { EscrowService } from "../economy/escrow.js";
import { InMemoryTransitionStore } from "../core/transition/in_memory_transition_store.js";
import { ShardTransitionFSM } from "../core/transition/fsm.js";

import { createDefaultRegistry } from "../transitions/createDefaultRegistry.js";
import { executeTransition } from "../transitions/executeTransition.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function main() {
  const actor = "sim.instance";
  const audit = new ConsoleAuditSink();

  const identityStore = new InMemoryIdentityStore();
  const ledger = new InMemoryEconomyLedger();
  const escrow = new EscrowService(ledger);
  const transitions = new InMemoryTransitionStore();

  const fsm = new ShardTransitionFSM({ transitions, escrow, audit });

  const ctx = { fsm, identityStore, ledger, actor };
  const registry = createDefaultRegistry(ctx);

  // Seed identity
  const pid = newId("pid", 16);
  await identityStore.put({
    schema_version: "1.0.0",
    identity_id: pid,
    created_at: new Date().toISOString(),
    status: "active",
    auth: { provider: "internal", subject: `user:${pid}`, last_authenticated_at: new Date().toISOString() },
    profile: { display_name: "InstanceRunner" },
    scopes: ["world.travel", "assets.transfer"],
    entitlements: [],
    audit: { created_by: actor, change_log_ref: "memory://audit" }
  });

  // Seed a transferable asset
  const aid = newId("aid", 16);
  ledger.seed({
    schema_version: "1.0.0",
    asset_id: aid,
    asset_class: "item",
    asset_type: "instance_key",
    scope: "global",
    owner: { owner_type: "player", owner_id: pid },
    state: { status: "active", quantity: 1, attributes: { label: "GateKey" } },
    lifecycle: { created_at: new Date().toISOString(), origin: { origin_type: "grant", origin_ref: "seed" } },
    transfer_policy: { transferable: true, transfer_scope: "global", requires_escrow: true },
    integrity: { idempotency_key: newId("tx", 12), version: 1 },
    audit: { change_log_ref: "memory://audit", last_change_id: "seed" }
  });

  console.log(`Identity=${pid}`);
  console.log(`Asset=${aid}`);

  // Begin instance transition (prepare+commit)
  const begin = await executeTransition(ctx, registry, {
    action: "begin",
    change_id: "chg_instance_begin_001",
    request: {
      kind: "instance_gate",
      identity_id: pid,
      from_shard: "sid_world_overworld",
      to_shard: "sid_instance_dungeon_001",
      protected_assets: [aid],
      metadata: { gate_id: "gate://dungeon/alpha" }
    }
  });

  assert(begin.outcome?.success === true, "Instance begin should succeed.");
  const transition_id = begin.outcome?.transition_id!;
  assert(!!transition_id, "transition_id should exist.");

  const afterPrepare = await ledger.get(aid);
  assert(afterPrepare?.state.status === "escrow", "Asset should be escrowed after begin.");

  // Simulate instance completion; finalize by confirming
  const confirm = await executeTransition(ctx, registry, {
    action: "confirm",
    kind: "instance_gate",
    transition_id,
    change_id: "chg_instance_confirm_001",
    outcome: { success: true, flags: ["boss_defeated"] }
  });

  assert(confirm.transition?.status === "confirmed", "Instance transition should confirm.");
  const afterConfirm = await ledger.get(aid);
  assert(afterConfirm?.state.status === "active", "Asset should be active after confirm (escrow released).");

  console.log("Instance gate simulation complete ✅");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

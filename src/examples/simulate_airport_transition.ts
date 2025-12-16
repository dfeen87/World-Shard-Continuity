import { ConsoleAuditSink } from "../core/audit.js";
import { newId } from "../core/ids.js";
import { InMemoryIdentityStore } from "../identity/in_memory_store.js";
import { InMemoryEconomyLedger } from "../economy/in_memory_ledger.js";
import { EscrowService } from "../economy/escrow.js";
import { InMemoryTransitionStore } from "../core/transition/in_memory_transition_store.js";
import { ShardTransitionFSM } from "../core/transition/fsm.js";
import type { PlayerIdentity } from "../identity/types.js";
import type { AssetOwnershipRecord } from "../economy/types.js";

/**
 * Simulation goal:
 * - Show staged handoff (prepare -> commit -> confirm)
 * - Demonstrate deterministic rollback
 * - Validate idempotency properties at the reference level
 *
 * Run:
 *   npm run build
 *   node dist/examples/simulate_airport_transition.js
 */

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

async function seedIdentity(store: InMemoryIdentityStore, actor: string): Promise<PlayerIdentity> {
  const pid = newId("pid", 16);

  const identity: PlayerIdentity = {
    schema_version: "1.0.0",
    identity_id: pid,
    created_at: new Date().toISOString(),
    status: "active",
    auth: {
      provider: "internal",
      subject: `user:${pid}`,
      last_authenticated_at: new Date().toISOString()
    },
    profile: {
      display_name: "TestPilot"
    },
    scopes: ["world.travel", "assets.read", "assets.transfer"],
    entitlements: [],
    audit: {
      created_by: actor,
      change_log_ref: "memory://audit"
    }
  };

  await store.put(identity);
  return identity;
}

function seedAsset(ledger: InMemoryEconomyLedger, ownerPid: string, scope: "global" | "world_local" | "shard_local", world?: string, shard?: string): AssetOwnershipRecord {
  const assetId = newId("aid", 16);

  const asset: AssetOwnershipRecord = {
    schema_version: "1.0.0",
    asset_id: assetId,
    asset_class: "item",
    asset_type: "demo_item",
    scope,
    world_ref: world,
    shard_ref: shard,
    owner: { owner_type: "player", owner_id: ownerPid },
    state: { status: "active", quantity: 1, attributes: { label: "AirportCase" } },
    lifecycle: {
      created_at: new Date().toISOString(),
      origin: { origin_type: "grant", origin_ref: "seed" }
    },
    transfer_policy: {
      transferable: true,
      transfer_scope: scope === "global" ? "global" : scope === "world_local" ? "world_only" : "shard_only",
      requires_escrow: true
    },
    integrity: {
      idempotency_key: newId("tx", 12),
      version: 1
    },
    audit: {
      change_log_ref: "memory://audit",
      last_change_id: "seed"
    }
  };

  ledger.seed(asset);
  return asset;
}

async function printAsset(ledger: InMemoryEconomyLedger, aid: string, label: string): Promise<void> {
  const a = await ledger.get(aid);
  if (!a) throw new Error(`Missing asset ${aid}`);
  console.log(`${label}: asset_id=${a.asset_id} status=${a.state.status} owner=${a.owner.owner_id} v=${a.integrity.version ?? 1}`);
}

async function happyPath(fsm: ShardTransitionFSM, ledger: InMemoryEconomyLedger, actor: string, pid: string, protectedAssets: string[]) {
  console.log("\n=== HAPPY PATH ===");

  const fromShard = "sid_origin";
  const toShard = "sid_destination";

  const prepareChangeId = "chg_prepare_001";
  const t = await fsm.prepare(actor, pid, fromShard, toShard, protectedAssets, prepareChangeId);

  for (const aid of protectedAssets) await printAsset(ledger, aid, "After prepare (escrow expected)");

  assert(t.status === "prepared", "Transition should be prepared.");

  const commitChangeId = "chg_commit_001";
  const t2 = await fsm.commit(actor, t.transition_id, commitChangeId);
  assert(t2.status === "committed", "Transition should be committed.");

  const confirmChangeId = "chg_confirm_001";
  const t3 = await fsm.confirm(actor, t.transition_id, confirmChangeId);
  assert(t3.status === "confirmed", "Transition should be confirmed.");

  for (const aid of protectedAssets) await printAsset(ledger, aid, "After confirm (active expected)");
}

async function destinationFailureRollback(fsm: ShardTransitionFSM, ledger: InMemoryEconomyLedger, actor: string, pid: string, protectedAssets: string[]) {
  console.log("\n=== DESTINATION FAILURE -> ROLLBACK ===");

  const fromShard = "sid_origin";
  const toShard = "sid_destination";

  const prepareChangeId = "chg_prepare_002";
  const t = await fsm.prepare(actor, pid, fromShard, toShard, protectedAssets, prepareChangeId);
  assert(t.status === "prepared", "Transition should be prepared.");

  // Commit succeeds, then simulate a failure before confirm.
  const commitChangeId = "chg_commit_002";
  const t2 = await fsm.commit(actor, t.transition_id, commitChangeId);
  assert(t2.status === "committed", "Transition should be committed.");

  // Simulated failure reason
  const rbChangeId = "chg_rb_002";
  const t3 = await fsm.rollback(actor, t.transition_id, rbChangeId, "destination_hydration_failed");
  assert(t3.status === "rolled_back", "Transition should be rolled_back.");

  for (const aid of protectedAssets) await printAsset(ledger, aid, "After rollback (active expected)");
}

async function idempotencyChecks(fsm: ShardTransitionFSM, ledger: InMemoryEconomyLedger, actor: string, pid: string, protectedAssets: string[]) {
  console.log("\n=== IDEMPOTENCY CHECKS ===");

  const fromShard = "sid_origin";
  const toShard = "sid_destination";

  // Prepare with a change ID, then call prepare again with the same change ID.
  // Note: Our FSM generates a new transition_id each time; idempotency for the *transition itself*
  // is typically implemented at the API layer via a client-provided idempotency key.
  // Here we validate the asset layer idempotency and escrow conflicts.
  const prepareChangeId = "chg_prepare_003";

  const t = await fsm.prepare(actor, pid, fromShard, toShard, protectedAssets, prepareChangeId);
  assert(t.status === "prepared", "Transition should be prepared.");

  let threw = false;
  try {
    // Second prepare will attempt to escrow already-escrowed assets, which should fail fast (conflict),
    // preventing duplicate holds. This is correct behavior for this reference layer.
    await fsm.prepare(actor, pid, fromShard, toShard, protectedAssets, prepareChangeId);
  } catch (e) {
    threw = true;
    console.log("Expected conflict on double-prepare (asset already escrowed).");
  }
  assert(threw, "Double prepare should conflict due to existing escrow.");

  // Now rollback the first transition so assets return to active.
  await fsm.rollback(actor, t.transition_id, "chg_rb_003", "test_cleanup");

  for (const aid of protectedAssets) await printAsset(ledger, aid, "After cleanup rollback (active expected)");
}

async function main() {
  const actor = "simulator";
  const audit = new ConsoleAuditSink();

  const identityStore = new InMemoryIdentityStore();
  const ledger = new InMemoryEconomyLedger();
  const escrow = new EscrowService(ledger);
  const transitions = new InMemoryTransitionStore();

  const fsm = new ShardTransitionFSM({ transitions, escrow, audit });

  const identity = await seedIdentity(identityStore, actor);

  // Seed two global assets (transferable)
  const a1 = seedAsset(ledger, identity.identity_id, "global");
  const a2 = seedAsset(ledger, identity.identity_id, "global");
  const protectedAssets = [a1.asset_id, a2.asset_id];

  console.log(`Identity: ${identity.identity_id}`);
  console.log(`Protected assets: ${protectedAssets.join(", ")}`);

  await happyPath(fsm, ledger, actor, identity.identity_id, protectedAssets);

  // Seed fresh assets for rollback test (avoid reusing already mutated records)
  const b1 = seedAsset(ledger, identity.identity_id, "global");
  const b2 = seedAsset(ledger, identity.identity_id, "global");
  await destinationFailureRollback(fsm, ledger, actor, identity.identity_id, [b1.asset_id, b2.asset_id]);

  // Seed fresh assets for idempotency checks
  const c1 = seedAsset(ledger, identity.identity_id, "global");
  await idempotencyChecks(fsm, ledger, actor, identity.identity_id, [c1.asset_id]);

  console.log("\nSimulation complete ✅");
}

main().catch((err) => {
  console.error("Simulation failed ❌");
  console.error(err);
  process.exit(1);
});

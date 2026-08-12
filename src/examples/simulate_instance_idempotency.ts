// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { ConsoleAuditSink } from "../core/audit.js";
import { newId } from "../core/ids.js";
import { InMemoryIdentityStore } from "../identity/in_memory_store.js";
import { InMemoryEconomyLedger } from "../economy/in_memory_ledger.js";
import { EscrowService } from "../economy/escrow.js";
import { InMemoryTransitionStore } from "../core/transition/in_memory_transition_store.js";
import { ShardTransitionFSM } from "../core/transition/fsm.js";
import { InMemoryRequestIdempotencyStore } from "../transitions/requestIdempotencyStore.js";
import { createDefaultRegistry } from "../transitions/createDefaultRegistry.js";
import { executeTransition } from "../transitions/executeTransition.js";
import type { TransitionKind } from "../transitions/base/transition_types.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function main() {
  const actor = "sim.instance.idempotency";
  const audit = new ConsoleAuditSink();

  const identityStore = new InMemoryIdentityStore();
  const ledger = new InMemoryEconomyLedger();
  const escrow = new EscrowService(ledger);
  const transitions = new InMemoryTransitionStore();
  const fsm = new ShardTransitionFSM({ transitions, escrow, audit });

  const ctx = { fsm, identityStore, ledger, actor };
  const registry = createDefaultRegistry(ctx);
  const idempotency = new InMemoryRequestIdempotencyStore();

  const pid = newId("pid", 16);
  await identityStore.put({
    schema_version: "1.0.0",
    identity_id: pid,
    created_at: new Date().toISOString(),
    status: "active",
    auth: { provider: "internal", subject: `user:${pid}`, last_authenticated_at: new Date().toISOString() },
    profile: { display_name: "IdempInstance" },
    scopes: ["world.travel", "assets.transfer"],
    entitlements: [],
    audit: { created_by: actor, change_log_ref: "memory://audit" }
  });

  const aid = newId("aid", 16);
  ledger.seed({
    schema_version: "1.0.0",
    asset_id: aid,
    asset_class: "item",
    asset_type: "gate_key",
    scope: "global",
    owner: { owner_type: "player", owner_id: pid },
    state: { status: "active", quantity: 1, attributes: { label: "GateKey" } },
    lifecycle: { created_at: new Date().toISOString(), origin: { origin_type: "grant", origin_ref: "seed" } },
    transfer_policy: { transferable: true, transfer_scope: "global", requires_escrow: true },
    integrity: { idempotency_key: newId("tx", 12), version: 1 },
    audit: { change_log_ref: "memory://audit", last_change_id: "seed" }
  });

  const kind: TransitionKind = "instance_gate";
  const request = {
    kind,
    identity_id: pid,
    from_shard: "sid_world",
    to_shard: "sid_instance",
    protected_assets: [aid],
    metadata: { gate_id: "gate://alpha" }
  };

  const first = await executeTransition(ctx, registry, idempotency, {
    action: "begin",
    request_id: "req-instance-001",
    change_id: "chg-001",
    request
  });

  const second = await executeTransition(ctx, registry, idempotency, {
    action: "begin",
    request_id: "req-instance-001",
    change_id: "chg-002",
    request
  });

  assert(first.transition?.transition_id, "First transition should exist.");
  assert(second.transition?.transition_id, "Second transition should exist.");
  assert(first.transition!.transition_id === second.transition!.transition_id, "Idempotency violation: transition_id mismatch");

  console.log("Instance idempotency verified ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

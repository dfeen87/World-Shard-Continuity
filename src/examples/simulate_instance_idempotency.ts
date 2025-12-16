import { InMemoryRequestIdempotencyStore } from "../transitions/requestIdempotencyStore.js";
import { createDefaultRegistry } from "../transitions/createDefaultRegistry.js";
import { executeTransition } from "../transitions/executeTransition.js";

// reuse same setup pattern as previous instance sim
// assume ctx already constructed

const idempotency = new InMemoryRequestIdempotencyStore();

const request = {
  kind: "instance_gate",
  identity_id: pid,
  from_shard: "sid_world",
  to_shard: "sid_instance",
  protected_assets: [aid],
  metadata: { gate_id: "gate://alpha" }
};

// First call
const first = await executeTransition(ctx, registry, idempotency, {
  action: "begin",
  request_id: "req-instance-001",
  change_id: "chg-001",
  request
});

// Retry (simulates client retry / timeout)
const second = await executeTransition(ctx, registry, idempotency, {
  action: "begin",
  request_id: "req-instance-001",
  change_id: "chg-002",
  request
});

if (first.transition!.transition_id !== second.transition!.transition_id) {
  throw new Error("Idempotency violation: transition_id mismatch");
}

console.log("Instance idempotency verified ✅");

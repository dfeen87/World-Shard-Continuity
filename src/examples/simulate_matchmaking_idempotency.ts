import { InMemoryRequestIdempotencyStore } from "../transitions/requestIdempotencyStore.js";
import { createDefaultRegistry } from "../transitions/createDefaultRegistry.js";
import { executeTransition } from "../transitions/executeTransition.js";

const idempotency = new InMemoryRequestIdempotencyStore();

const request = {
  kind: "matchmaking_queue",
  identity_id: pid,
  from_shard: "sid_hub",
  to_shard: "sid_match_001",
  protected_assets: [aid],
  metadata: { match_id: "mid_777" }
};

const a = await executeTransition(ctx, registry, idempotency, {
  action: "begin",
  request_id: "req-mm-777",
  change_id: "chg-mm-1",
  request
});

const b = await executeTransition(ctx, registry, idempotency, {
  action: "begin",
  request_id: "req-mm-777",
  change_id: "chg-mm-2",
  request
});

if (a.transition!.transition_id !== b.transition!.transition_id) {
  throw new Error("Matchmaking idempotency failed");
}

console.log("Matchmaking idempotency verified ✅");

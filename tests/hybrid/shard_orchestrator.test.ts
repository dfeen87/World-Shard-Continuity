// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import assert from "node:assert/strict";
import test from "node:test";
import { ShardOrchestrator } from "../../src/simulation/ShardOrchestrator.js";
import { HybridWorldShard } from "../../src/worldshards/hybrid/HybridWorldShard.js";

test("ShardOrchestrator schedules hybrid shards with coherent time sync", () => {
  const orchestrator = new ShardOrchestrator(0);
  const shard1 = new HybridWorldShard("shard_hybrid_01", 0);
  const shard2 = new HybridWorldShard("shard_hybrid_02", 0);

  orchestrator.registerHybridShard(shard1);
  orchestrator.registerHybridShard(shard2);

  assert.equal(orchestrator.getRegisteredShardCount(), 2);
  assert.equal(orchestrator.getRegisteredHybridShardCount(), 2);

  orchestrator.tick(10);

  assert.equal(orchestrator.getGlobalLogicalTime(), 10);
  assert.equal(shard1.getLogicalTime(), 10);
  assert.equal(shard2.getLogicalTime(), 10);

  orchestrator.stepToTime(25);

  assert.equal(orchestrator.getGlobalLogicalTime(), 25);
  assert.equal(shard1.getLogicalTime(), 25);
  assert.equal(shard2.getLogicalTime(), 25);
});

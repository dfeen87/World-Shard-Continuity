// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import assert from "node:assert/strict";
import test from "node:test";
import { HybridWorldShard } from "../../src/worldshards/hybrid/HybridWorldShard.js";
import { translateActionSimEvent, translateLifeSimEvent } from "../../src/ontology/UnifiedEvent.js";

test("HybridWorldShard ingests dual-schema events and maintains state", () => {
  const shard = new HybridWorldShard("hybrid_shard_01");

  const e1 = shard.ingestLifeSimEvent({
    actorId: "actor_hero",
    timestamp: 100,
    interactionType: "CookMeal",
    attributes: { energy: 80 },
  });

  const e2 = shard.ingestActionSimEvent({
    actorId: "actor_hero",
    timestamp: 200,
    actionType: "VehicleMove",
    physicsPayload: { speed: 100 },
  });

  assert.equal(e1.sourceDomain, "LifeSim");
  assert.equal(e2.sourceDomain, "ActionSim");

  const state = shard.getActorState("actor_hero");
  assert.equal(state?.eventCount, 2);
  assert.equal(state?.recentInteractions.length, 2);
  assert.equal(state?.attributes.lastLifeSimInteraction, "CookMeal");
  assert.equal(state?.attributes.lastActionSimAction, "VehicleMove");
  assert.equal(state?.attributes.speed, 100);
});

test("Deterministic replay produces identical state hash across multiple runs", () => {
  const events = [
    translateLifeSimEvent({
      eventId: "e1",
      actorId: "actor_1",
      timestamp: 1000,
      interactionType: "TalkToNPC",
      attributes: { friendship: 5 },
    }),
    translateActionSimEvent({
      eventId: "e2",
      actorId: "actor_2",
      timestamp: 1005,
      actionType: "WeaponFire",
      physicsPayload: { recoil: 12 },
    }),
    translateLifeSimEvent({
      eventId: "e3",
      actorId: "actor_1",
      timestamp: 1010,
      interactionType: "CleanObject",
    }),
    translateActionSimEvent({
      eventId: "e4",
      actorId: "actor_2",
      timestamp: 1015,
      actionType: "TakeDamage",
      physicsPayload: { damage: 25 },
    }),
  ];

  const replayRun1 = HybridWorldShard.replay(events);
  const replayRun2 = HybridWorldShard.replay(events);

  assert.equal(replayRun1.replayedCount, 4);
  assert.equal(replayRun2.replayedCount, 4);
  assert.equal(replayRun1.finalStateHash, replayRun2.finalStateHash);
  assert.deepEqual(replayRun1.stepHashes, replayRun2.stepHashes);

  // Partial replay test
  const partialReplay = HybridWorldShard.replay(events, { maxEvents: 2 });
  assert.equal(partialReplay.replayedCount, 2);
  assert.equal(partialReplay.stepHashes[1].stateHash, replayRun1.stepHashes[1].stateHash);
});

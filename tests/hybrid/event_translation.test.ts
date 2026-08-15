// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import assert from "node:assert/strict";
import test from "node:test";
import {
  ActionSimEvent,
  LifeSimEvent,
  translateActionSimEvent,
  translateLifeSimEvent,
} from "../../src/ontology/UnifiedEvent.js";

test("translateLifeSimEvent normalizes LifeSimEvent into UnifiedEvent", () => {
  const lifeEvent: LifeSimEvent = {
    eventId: "evt_life_001",
    actorId: "actor_player_1",
    timestamp: 1700000000000,
    interactionType: "CookMeal",
    targetId: "stove_001",
    location: { x: 10, y: 0, z: 5 },
    attributes: { mood: "happy", hunger: 20 },
    originShard: "lifesim_shard_alpha",
    contextTags: ["social", "kitchen"],
  };

  const unified = translateLifeSimEvent(lifeEvent);

  assert.equal(unified.eventId, "evt_life_001");
  assert.equal(unified.actorId, "actor_player_1");
  assert.equal(unified.timestamp, 1700000000000);
  assert.equal(unified.originShard, "lifesim_shard_alpha");
  assert.equal(unified.sourceDomain, "LifeSim");
  assert.equal(unified.originalEventType, "CookMeal");
  assert.equal(unified.payload.interactionType, "CookMeal");
  assert.equal(unified.payload.targetId, "stove_001");
  assert.deepEqual(unified.payload.location, { x: 10, y: 0, z: 5 });
  assert.deepEqual(unified.payload.attributes, { mood: "happy", hunger: 20 });
  assert.ok(unified.contextTags.includes("lifesim"));
  assert.ok(unified.contextTags.includes("CookMeal"));
});

test("translateActionSimEvent normalizes ActionSimEvent into UnifiedEvent", () => {
  const actionEvent: ActionSimEvent = {
    eventId: "evt_action_001",
    actorId: "actor_player_1",
    timestamp: 1700000001000,
    actionType: "VehicleMove",
    targetId: "sports_car_01",
    physicsPayload: { velocity: 120, impulse: 450 },
    originShard: "actionsim_shard_beta",
    contextTags: ["high_speed", "vehicle"],
  };

  const unified = translateActionSimEvent(actionEvent);

  assert.equal(unified.eventId, "evt_action_001");
  assert.equal(unified.actorId, "actor_player_1");
  assert.equal(unified.timestamp, 1700000001000);
  assert.equal(unified.originShard, "actionsim_shard_beta");
  assert.equal(unified.sourceDomain, "ActionSim");
  assert.equal(unified.originalEventType, "VehicleMove");
  assert.equal(unified.payload.actionType, "VehicleMove");
  assert.deepEqual(unified.payload.physicsPayload, { velocity: 120, impulse: 450 });
  assert.ok(unified.contextTags.includes("actionsim"));
  assert.ok(unified.contextTags.includes("VehicleMove"));
});

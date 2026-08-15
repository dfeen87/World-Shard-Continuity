// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import assert from "node:assert/strict";
import test from "node:test";
import { CrossShardIdentityToken } from "../../src/identity/CrossShardIdentityToken.js";
import { InterShardGateway } from "../../src/gateway/InterShardGateway.js";

test("InterShardGateway transitions actor from LifeSim to ActionSim shard", async () => {
  const gateway = new InterShardGateway();
  const token = new CrossShardIdentityToken("actor_sim_01", "shard_lifesim_01");

  const snapshot = {
    actorId: "actor_sim_01",
    sourceShard: "shard_lifesim_01",
    sourceDomain: "LifeSim" as const,
    attributes: { energy: 90 },
    assets: [
      {
        assetId: "asset_chair_01",
        domain: "LifeSim" as const,
        category: "home_object",
        name: "Oak Chair",
      },
    ],
  };

  const result = await gateway.transitionActor({
    token,
    fromShard: "shard_lifesim_01",
    toShard: "shard_actionsim_01",
    targetDomain: "ActionSim",
    stateSnapshot: snapshot,
  });

  assert.equal(result.success, true);
  assert.equal(result.token.currentShard, "shard_actionsim_01");
  assert.equal(result.token.continuityVersion, 2);
  assert.equal(result.targetSnapshot.targetShard, "shard_actionsim_01");
  assert.equal(result.targetSnapshot.translatedAssets.length, 1);
  assert.equal(result.targetSnapshot.translatedAssets[0].targetDomain, "ActionSim");
  assert.ok(result.transitionEvent.stateSnapshotHash.length > 0);

  const ledger = gateway.getTransitionLedger();
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].actorId, "actor_sim_01");
  assert.equal(ledger[0].fromShard, "shard_lifesim_01");
  assert.equal(ledger[0].toShard, "shard_actionsim_01");
});

test("InterShardGateway validates identity token and prevents mismatch transitions", async () => {
  const gateway = new InterShardGateway();
  const token = new CrossShardIdentityToken("actor_sim_01", "shard_lifesim_01");

  const snapshot = {
    actorId: "actor_sim_02", // Mismatch actorId
    sourceShard: "shard_lifesim_01",
    sourceDomain: "LifeSim" as const,
    attributes: {},
    assets: [],
  };

  await assert.rejects(
    gateway.transitionActor({
      token,
      fromShard: "shard_lifesim_01",
      toShard: "shard_actionsim_01",
      targetDomain: "ActionSim",
      stateSnapshot: snapshot,
    }),
    /Identity mismatch/
  );
});

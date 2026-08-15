// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import assert from "node:assert/strict";
import test from "node:test";
import { CrossShardIdentityToken } from "../../src/identity/CrossShardIdentityToken.js";

test("CrossShardIdentityToken tracks migration and increments continuity version", () => {
  const token = new CrossShardIdentityToken(
    "actor_global_100",
    "lifesim_shard_01",
    ["can_drive", "can_cook"]
  );

  assert.equal(token.globalActorId, "actor_global_100");
  assert.equal(token.currentShard, "lifesim_shard_01");
  assert.equal(token.continuityVersion, 1);
  assert.equal(token.migrationHistory.length, 0);

  token.migrateIdentityToShard("actionsim_shard_02");

  assert.equal(token.currentShard, "actionsim_shard_02");
  assert.equal(token.continuityVersion, 2);
  assert.equal(token.migrationHistory.length, 1);
  assert.equal(token.migrationHistory[0].previousShard, "lifesim_shard_01");
  assert.equal(token.migrationHistory[0].targetShardId, "actionsim_shard_02");

  const json = token.toJSON();
  const restoredToken = CrossShardIdentityToken.fromJSON(json);

  assert.equal(restoredToken.globalActorId, "actor_global_100");
  assert.equal(restoredToken.currentShard, "actionsim_shard_02");
  assert.equal(restoredToken.continuityVersion, 2);
  assert.equal(restoredToken.migrationHistory.length, 1);
});

test("CrossShardIdentityToken throws error on invalid target shard migration", () => {
  const token = new CrossShardIdentityToken("actor_global_100", "lifesim_shard_01");
  assert.throws(() => token.migrateIdentityToShard(""), /Target shard ID must be provided/);
});

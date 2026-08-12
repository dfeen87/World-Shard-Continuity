// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import assert from "node:assert/strict";
import test from "node:test";
import { ConflictError } from "../../src/core/errors.js";
import { ShardTransitionFSM } from "../../src/core/transition/fsm.js";
import { InMemoryTransitionStore } from "../../src/core/transition/in_memory_transition_store.js";
import { TransitionStore } from "../../src/core/transition/transition_store.js";
import { ShardTransition } from "../../src/core/transition/types.js";
import { RedisLikeClient, RedisTransitionStore } from "../../src/adapters/redis_transition_store.js";
import { EscrowService } from "../../src/economy/escrow.js";
import { InMemoryEconomyLedger } from "../../src/economy/in_memory_ledger.js";
import { AssetOwnershipRecord } from "../../src/economy/types.js";

class FakeRedisClient implements RedisLikeClient {
  private readonly data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    options?: { NX?: boolean; EX?: number }
  ): Promise<"OK" | null> {
    if (options?.NX && this.data.has(key)) return null;
    this.data.set(key, value);
    return "OK";
  }

  async eval(
    _script: string,
    options: { keys: string[]; arguments: string[] }
  ): Promise<string> {
    if (options.arguments.length === 2) {
      const transitionKey = options.keys[0];
      const changeKey = options.keys[1];
      if (!transitionKey || !changeKey) return "UNSUPPORTED";
      const value = options.arguments[0];
      const transitionId = options.arguments[1];
      if (!value || !transitionId) return "UNSUPPORTED";
      if (this.data.has(transitionKey)) return "CONFLICT_TRANSITION";
      const existing = this.data.get(changeKey);
      if (existing && existing !== transitionId) return "CONFLICT_CHANGE";
      this.data.set(transitionKey, value);
      this.data.set(changeKey, transitionId);
      return "OK";
    }

    if (options.arguments.length === 3) {
      const transitionKey = options.keys[0];
      const changeKeys = options.keys.slice(1);
      if (!transitionKey) return "UNSUPPORTED";
      const expectedVersion = options.arguments[0];
      const transitionId = options.arguments[1];
      const value = options.arguments[2];
      if (!expectedVersion || !transitionId || !value) return "UNSUPPORTED";
      const raw = this.data.get(transitionKey);
      if (!raw) return "NOT_FOUND";
      const parsed = JSON.parse(raw) as { version: number };
      if (parsed.version !== Number(expectedVersion)) return "VERSION_MISMATCH";
      for (const changeKey of changeKeys) {
        const existing = this.data.get(changeKey);
        if (existing && existing !== transitionId) return "CONFLICT_CHANGE";
      }
      this.data.set(transitionKey, value);
      for (const changeKey of changeKeys) {
        this.data.set(changeKey, transitionId);
      }
      return "OK";
    }

    return "UNSUPPORTED";
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }
}

class FakeAudit {
  events: unknown[] = [];

  record(event: unknown): void {
    this.events.push(event);
  }
}

const storeFactories: Array<{
  name: string;
  create: () => TransitionStore;
}> = [
  {
    name: "in-memory",
    create: () => new InMemoryTransitionStore()
  },
  {
    name: "redis",
    create: () => new RedisTransitionStore(new FakeRedisClient())
  }
];

function createPreparedTransition(store: TransitionStore): ShardTransition {
  const now = new Date().toISOString();
  return {
    transition_id: store.generateId(),
    identity_id: "identity_1",
    from_shard: "shard_a",
    to_shard: "shard_b",
    protected_assets: ["asset_1"],
    status: "prepared",
    created_at: now,
    updated_at: now,
    change_id_prepare: `change_prepare_${Math.random().toString(16).slice(2)}`
  };
}

function createAssetRecord(ownerId: string, assetId: string): AssetOwnershipRecord {
  const now = new Date().toISOString();
  return {
    schema_version: "1.0.0",
    asset_id: assetId,
    asset_class: "item",
    scope: "global",
    owner: { owner_type: "player", owner_id: ownerId },
    state: { status: "active" },
    lifecycle: {
      created_at: now,
      origin: { origin_type: "mint" }
    },
    transfer_policy: {
      transferable: true,
      transfer_scope: "global",
      requires_escrow: true
    },
    integrity: {
      idempotency_key: `idemp_${assetId}`
    },
    audit: {
      change_log_ref: "audit",
      last_change_id: `seed_${assetId}`
    }
  };
}

function createEscrowService(assetRecords: AssetOwnershipRecord[]): EscrowService {
  const ledger = new InMemoryEconomyLedger();
  assetRecords.forEach((record) => ledger.seed(record));
  return new EscrowService(ledger);
}

for (const factory of storeFactories) {
  test(`duplicate change_id does not create multiple transitions (${factory.name})`, async () => {
    const store = factory.create();
    const escrow = createEscrowService([createAssetRecord("identity_1", "asset_1")]);
    const fsm = new ShardTransitionFSM({
      transitions: store,
      escrow,
      audit: new FakeAudit()
    });

    const changeId = "change_prepare_dup";
    const first = await fsm.prepare("actor", "identity_1", "shard_a", "shard_b", ["asset_1"], changeId);
    const second = await fsm.prepare("actor", "identity_1", "shard_a", "shard_b", ["asset_1"], changeId);

    assert.equal(first.transition_id, second.transition_id);
  });

  test(`replaying the same request is deterministic (${factory.name})`, async () => {
    const store = factory.create();
    const escrow = createEscrowService([createAssetRecord("identity_1", "asset_1")]);
    const fsm = new ShardTransitionFSM({
      transitions: store,
      escrow,
      audit: new FakeAudit()
    });

    const prepared = await fsm.prepare("actor", "identity_1", "shard_a", "shard_b", ["asset_1"], "change_prepare");
    const committed = await fsm.commit("actor", prepared.transition_id, "change_commit");
    const replayed = await store.findByChangeId("change_commit");

    assert.ok(replayed);
    assert.equal(committed.transition_id, replayed.transition_id);
    assert.equal(committed.status, replayed.status);
    assert.equal(replayed.change_id_commit, "change_commit");
  });

  test(`update is atomic with concurrent updates (${factory.name})`, async () => {
    const store = factory.create();
    const transition = createPreparedTransition(store);
    await store.put(transition);

    const update1 = store.update(transition.transition_id, (cur) => ({
      ...cur,
      updated_at: "update_1"
    }));

    const update2 = store.update(transition.transition_id, (cur) => ({
      ...cur,
      updated_at: "update_2"
    }));

    await Promise.all([update1, update2]);
    const final = await store.get(transition.transition_id);

    assert.ok(final);
    assert.ok(final.updated_at === "update_1" || final.updated_at === "update_2");
  });

  test(`escrowed transitions cannot be finalized twice (${factory.name})`, async () => {
    const store = factory.create();
    const escrow = createEscrowService([createAssetRecord("identity_1", "asset_1")]);
    const fsm = new ShardTransitionFSM({
      transitions: store,
      escrow,
      audit: new FakeAudit()
    });

    const prepared = await fsm.prepare("actor", "identity_1", "shard_a", "shard_b", ["asset_1"], "prepare_once");
    await fsm.commit("actor", prepared.transition_id, "commit_once");
    await fsm.confirm("actor", prepared.transition_id, "confirm_once");

    await assert.rejects(
      () => fsm.confirm("actor", prepared.transition_id, "confirm_again"),
      (err) => err instanceof ConflictError
    );
  });

  test(`partial failures do not violate change_id invariants (${factory.name})`, async () => {
    const store = factory.create();
    const escrow = createEscrowService([
      createAssetRecord("identity_1", "asset_1"),
      createAssetRecord("identity_2", "asset_2")
    ]);
    const fsm = new ShardTransitionFSM({
      transitions: store,
      escrow,
      audit: new FakeAudit()
    });

    const first = await fsm.prepare("actor", "identity_1", "shard_a", "shard_b", ["asset_1"], "prepare_one");
    const second = await fsm.prepare("actor", "identity_2", "shard_a", "shard_c", ["asset_2"], "prepare_two");

    await fsm.commit("actor", first.transition_id, "commit_shared");

    await assert.rejects(
      () => fsm.commit("actor", second.transition_id, "commit_shared"),
      (err) => err instanceof ConflictError
    );
  });
}

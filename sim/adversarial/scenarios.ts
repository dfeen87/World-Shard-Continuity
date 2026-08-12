// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { InMemoryTransitionStore } from "../../src/core/transition/in_memory_transition_store.js";
import { TransitionStore } from "../../src/core/transition/transition_store.js";
import { ShardTransitionFSM } from "../../src/core/transition/fsm.js";
import { InMemoryEconomyLedger } from "../../src/economy/in_memory_ledger.js";
import { EscrowService } from "../../src/economy/escrow.js";
import { AssetOwnershipRecord } from "../../src/economy/types.js";
import { RedisLikeClient, RedisTransitionStore } from "../../src/adapters/redis_transition_store.js";
import { assert, runOperations } from "./runner.js";

class MemoryAudit {
  events: unknown[] = [];

  async record(event: unknown): Promise<void> {
    this.events.push(event);
  }
}

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

export type StoreFactory = {
  name: string;
  create: () => TransitionStore;
};

export const storeFactories: StoreFactory[] = [
  {
    name: "in-memory",
    create: () => new InMemoryTransitionStore()
  },
  {
    name: "redis",
    create: () => new RedisTransitionStore(new FakeRedisClient())
  }
];

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

function createFsm(store: TransitionStore, assetRecords: AssetOwnershipRecord[]) {
  const escrow = createEscrowService(assetRecords);
  const audit = new MemoryAudit();
  const fsm = new ShardTransitionFSM({ transitions: store, escrow, audit });
  return { fsm, escrow, audit };
}

export async function scenarioDuplicateStorm(factory: StoreFactory): Promise<void> {
  const store = factory.create();
  const { fsm } = createFsm(store, [createAssetRecord("identity_1", "asset_1")]);

  const changeId = "dup_prepare";
  const prepareCalls = Array.from({ length: 25 }, () =>
    fsm.prepare("actor", "identity_1", "shard_a", "shard_b", ["asset_1"], changeId)
  );

  const results = await Promise.all(prepareCalls);
  const ids = new Set(results.map((t) => t.transition_id));

  assert(ids.size === 1, "Duplicate storm should yield a single transition_id.");

  const stored = await store.findByChangeId(changeId);
  assert(stored, "Transition should be found by change_id.");
  assert(stored.transition_id === results[0]?.transition_id, "Stored transition matches storm id.");

  const commitChangeId = "dup_commit";
  const commitCalls = Array.from({ length: 10 }, () =>
    fsm.commit("actor", stored.transition_id, commitChangeId)
  );
  const committed = await Promise.all(commitCalls);
  const commitIds = new Set(committed.map((t) => t.transition_id));

  assert(commitIds.size === 1, "Commit storm should be idempotent.");
  assert(committed.every((t) => t.status === "committed"), "No double-commit occurs.");
}

export async function scenarioPartialConfirmationFailure(factory: StoreFactory): Promise<void> {
  const store = factory.create();
  const { fsm } = createFsm(store, [createAssetRecord("identity_1", "asset_1")]);

  const prepared = await fsm.prepare(
    "actor",
    "identity_1",
    "shard_a",
    "shard_b",
    ["asset_1"],
    "confirm_prepare"
  );

  await fsm.commit("actor", prepared.transition_id, "confirm_commit");

  const operations = [
    {
      name: "confirm",
      run: async () => {
        await fsm.confirm("actor", prepared.transition_id, "confirm_once");
      }
    }
  ];

  const report = await runOperations(operations, { failBeforeIndex: 0 });
  assert(report.failedAt === "confirm", "Simulated failure should occur before confirmation.");

  const confirmed = await fsm.confirm("actor", prepared.transition_id, "confirm_once");
  assert(confirmed.status === "confirmed", "Replay should finalize transition exactly once.");

  const stored = await store.findByChangeId("confirm_once");
  assert(stored?.transition_id === prepared.transition_id, "Confirmed change_id should map to the same transition.");
}

export async function scenarioDelayedReplay(factory: StoreFactory): Promise<void> {
  const store = factory.create();
  const { fsm } = createFsm(store, [
    createAssetRecord("identity_1", "asset_1"),
    createAssetRecord("identity_2", "asset_2")
  ]);

  const first = await fsm.prepare(
    "actor",
    "identity_1",
    "shard_a",
    "shard_b",
    ["asset_1"],
    "delay_prepare_1"
  );

  await fsm.commit("actor", first.transition_id, "delay_commit_1");

  const second = await fsm.prepare(
    "actor",
    "identity_2",
    "shard_a",
    "shard_c",
    ["asset_2"],
    "delay_prepare_2"
  );

  await fsm.commit("actor", second.transition_id, "delay_commit_2");

  const replayPrepared = await fsm.prepare(
    "actor",
    "identity_1",
    "shard_a",
    "shard_b",
    ["asset_1"],
    "delay_prepare_1"
  );

  const replayCommit = await fsm.commit("actor", first.transition_id, "delay_commit_1");

  assert(replayPrepared.transition_id === first.transition_id, "Replay should return original transition.");
  assert(replayCommit.transition_id === first.transition_id, "Replay commit should target original transition.");

  const newer = await store.findByChangeId("delay_commit_2");
  assert(newer?.transition_id === second.transition_id, "Replay should not overwrite newer transitions.");
  assert(second.identity_id === "identity_2", "Authority boundaries remain intact.");
}

export async function scenarioUpdateContention(factory: StoreFactory): Promise<void> {
  const store = factory.create();
  const { fsm } = createFsm(store, [createAssetRecord("identity_1", "asset_1")]);

  const prepared = await fsm.prepare(
    "actor",
    "identity_1",
    "shard_a",
    "shard_b",
    ["asset_1"],
    "contention_prepare"
  );

  const addToken = (token: string) =>
    store.update(prepared.transition_id, (cur) => {
      const current = cur.failure_reason ? cur.failure_reason.split(",") : [];
      const next = Array.from(new Set([...current, token])).sort();
      return {
        ...cur,
        failure_reason: next.join(","),
        updated_at: `update_${token}`
      };
    });

  const [first, second] = await Promise.all([addToken("alpha"), addToken("beta")]);

  assert(first.transition_id === prepared.transition_id, "Update should target same transition.");
  assert(second.transition_id === prepared.transition_id, "Update should target same transition.");

  const final = await store.get(prepared.transition_id);
  assert(final, "Final transition should exist after contention.");
  assert(final.failure_reason === "alpha,beta", "No lost updates; deterministic merged state.");
}

export const scenarios = [
  { name: "Duplicate Storm", run: scenarioDuplicateStorm },
  { name: "Partial Confirmation Failure", run: scenarioPartialConfirmationFailure },
  { name: "Delayed Replay", run: scenarioDelayedReplay },
  { name: "Update Contention", run: scenarioUpdateContention }
];

/**
 * WorldExpansionPlan placeholder.
 *
 * Documents engine-agnostic continuity contracts for adding, versioning,
 * draining, and retiring shards over long-lived world expansion. It is not a
 * routing service, map editor, matchmaking layer, marketplace, wallet, payment
 * system, or real-money ledger.
 */
import type { ShardMetadata } from "./shard_metadata.js";

export interface ExpansionShardAddition {
  shard: ShardMetadata;
  /** Stable identifiers for predecessor shards, if this expands an existing region. */
  predecessor_shard_ids?: string[];
  /** Optional operational note; must not encode game-specific rules. */
  continuity_note?: string;
}

export interface ShardRetirementPlan {
  shard_id: string;
  replacement_shard_ids: string[];
  /** Retire only after no prepared or committed transitions depend on this shard. */
  require_no_open_transitions: true;
  /** Keep historical identity and asset references resolvable after retirement. */
  preserve_identity_references: true;
}

export interface WorldExpansionPlan {
  additions: ExpansionShardAddition[];
  retirements: ShardRetirementPlan[];
}

/**
 * Expansion invariants:
 *
 * - New shards, cities, or regions are appended with stable `shard_id` values;
 *   existing shard identifiers are never repurposed for unrelated locations.
 * - Asset identity remains stable because ownership records reference durable
 *   asset and identity IDs rather than mutable deployment hosts or map cells.
 * - Transitions remain deterministic by recording explicit source shard,
 *   destination shard, transition ID, and change IDs before side effects are
 *   reconciled.
 * - Old shards can be retired safely only after operators stop new admissions,
 *   drain open transitions, keep archival metadata readable, and preserve
 *   identity/asset references for audit and recovery.
 *
 * TODO(high-scale): Large expansion waves may need batch validation of shard
 * metadata and transition compatibility before deployment, but this continuity
 * layer should continue to expose only interfaces and invariants.
 */

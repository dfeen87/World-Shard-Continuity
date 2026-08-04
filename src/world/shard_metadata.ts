// Licensed under the PolyForm Noncommercial License 1.0.0

/**
 * ShardMetadataRegistry placeholder.
 *
 * This module defines the minimum metadata a continuity layer needs to reason
 * about very large maps composed of many independently deployed shards.
 * It intentionally does not implement routing, matchmaking, placement, load
 * balancing, or game-specific region selection.
 */

export type ShardLifecycleState = "active" | "draining" | "retired";

export interface ShardMetadata {
  /** Stable shard identifier used by transition records and asset references. */
  shard_id: string;

  /** Human-readable operational grouping; not an authority or routing rule. */
  region_name: string;

  /** Deployment/schema/content version for compatibility checks. */
  version: string;

  /** Engine-agnostic capability labels advertised by the shard. */
  capabilities: string[];

  /** Lifecycle phase used by operators to plan handoff and retirement. */
  lifecycle: ShardLifecycleState;
}

export interface ShardMetadataRegistry {
  get(shard_id: string): Promise<ShardMetadata | null>;
  listByRegion(region_name: string): Promise<ShardMetadata[]>;

  /**
   * Return shards that are eligible for continuity operations.
   *
   * Implementations should treat `active` as generally writable,
   * `draining` as existing-transition-only, and `retired` as read-only or
   * unavailable except for archival verification. This interface deliberately
   * leaves routing and placement decisions to a separate orchestration layer.
   */
  listByLifecycle(lifecycle: ShardLifecycleState): Promise<ShardMetadata[]>;
}

/**
 * TODO(high-scale): Back production implementations with a cached metadata
 * snapshot plus invalidation from the deployment control plane. Cache entries
 * must not become the source of truth for lifecycle decisions.
 *
 * TODO(concurrency): Shard lifecycle transitions may require distributed locks
 * or compare-and-swap semantics so a shard cannot be retired while prepared or
 * committed transitions still reference it.
 */

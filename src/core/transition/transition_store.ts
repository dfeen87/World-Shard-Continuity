// Licensed under the PolyForm Noncommercial License 1.0.0

import { ShardTransition } from "./types.js";

/**
 * Persistence contract for transition lifecycle records.
 *
 * TODO(high-scale): Production implementations should expose atomic compare-and-swap
 * or equivalent optimistic concurrency for update(), plus indexes on change IDs,
 * identity IDs, source shard, destination shard, status, and updated_at for draining
 * and rollback-storm operations. Pessimistic locking belongs around assets/authority
 * that cannot be concurrently transferred.
 */
export interface TransitionStore {
  get(id: string): Promise<ShardTransition | null>;
  put(t: ShardTransition): Promise<void>;
  update(
    id: string,
    fn: (cur: ShardTransition) => ShardTransition
  ): Promise<ShardTransition>;
  findByChangeId(changeId: string): Promise<ShardTransition | null>;
  generateId(): string;
}

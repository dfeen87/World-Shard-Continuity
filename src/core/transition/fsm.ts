// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import {
  createTransitionCommittedEvent,
  createTransitionConfirmedEvent,
  createTransitionPreparedEvent,
  createTransitionRolledBackEvent,
  type AuditSink
} from "../audit.js";
import type { TransitionStore } from "./transition_store.js";
import type { ShardTransition } from "./types.js";
import type { EscrowService } from "../../economy/escrow.js";
import { ConflictError, ValidationError } from "../errors.js";

/**
 * ShardTransitionFSM
 *
 * Authoritative finite-state machine governing shard transitions.
 * Owns lifecycle:
 *   PREPARED -> COMMITTED -> CONFIRMED | ROLLED_BACK
 *
 * This class is intentionally strict:
 * - All state changes are audited
 * - All economy movement flows through escrow
 * - Idempotency is enforced at the FSM boundary
 * - Prepared and committed transitions are reversible; confirmed transitions are not
 *
 * High-scale invariants:
 * - Exactly one lifecycle mutation should win for a transition/change_id pair.
 * - Stores must make update() atomic and reject conflicting concurrent writes.
 * - Escrow release must be idempotent because rollback and confirm retries can race
 *   during regional failover or rollback storms.
 *
 * TODO(high-scale): Insert read-through caches only around immutable or versioned
 * transition lookups; never cache pending transition authority without a staleness
 * boundary. Use distributed locks or compare-and-swap around shard drain/retire
 * workflows that touch many open transitions.
 */
export class ShardTransitionFSM {
  private readonly deps: {
    transitions: TransitionStore;
    escrow: EscrowService;
    audit: AuditSink;
  };

  constructor(deps: {
    transitions: TransitionStore;
    escrow: EscrowService;
    audit: AuditSink;
  }) {
    this.deps = deps;
  }

  /**
   * Expose transition store in a controlled, read-only way.
   * Used by orchestration layers (e.g. executeTransition).
   *
   * NOTE:
   * - Do not mutate transitions directly from callers
   * - All lifecycle changes must go through FSM methods
   */
  getStore(): TransitionStore {
    return this.deps.transitions;
  }

  /**
   * Prepare a new transition.
   * - Creates transition record
   * - Escrows protected assets
   * - Does NOT finalize state
   *
   * Concurrency note: prepare is safe for optimistic idempotent retries by
   * change_id, but production stores should protect the identity/assets being
   * moved with a pessimistic escrow or equivalent authority lock.
   */
  async prepare(
    actor: string,
    identity_id: string,
    from_shard: string,
    to_shard: string,
    protected_assets: string[],
    change_id: string
  ): Promise<ShardTransition> {
    if (!identity_id) throw new ValidationError("identity_id required.");
    if (!from_shard || !to_shard) throw new ValidationError("from_shard and to_shard required.");
    if (!change_id) throw new ValidationError("change_id required.");

    const existing = await this.deps.transitions.findByChangeId(change_id);
    if (existing) return existing;

    const transition: ShardTransition = {
      transition_id: this.deps.transitions.generateId(),
      identity_id,
      from_shard,
      to_shard,
      protected_assets,
      status: "prepared",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      change_id_prepare: change_id
    };

    await this.deps.escrow.lock(identity_id, protected_assets, transition.transition_id);
    await this.deps.transitions.put(transition);

    await this.deps.audit.record(
      createTransitionPreparedEvent({
        actor,
        transition_id: transition.transition_id,
        identity_id,
        from_shard,
        to_shard
      })
    );

    return transition;
  }

  /**
   * Commit a prepared transition.
   * - Confirms entry into target shard or authority
   * - Still reversible
   *
   * Failure mode: if the destination acknowledges arrival but the commit write
   * times out, callers must retry with the same change_id instead of issuing a
   * new transition.
   */
  async commit(
    actor: string,
    transition_id: string,
    change_id: string
  ): Promise<ShardTransition> {
    const transition = await this.requireTransition(transition_id);

    if (transition.status !== "prepared") {
      throw new ConflictError(`Cannot commit transition in state: ${transition.status}`);
    }

    const existing = await this.deps.transitions.findByChangeId(change_id);
    if (existing) {
      if (existing.transition_id !== transition.transition_id) {
        throw new ConflictError("Change ID already used for another transition.", { change_id });
      }
      return existing;
    }

    const updated = await this.deps.transitions.update(transition_id, cur => ({
      ...cur,
      status: "committed",
      updated_at: new Date().toISOString(),
      change_id_commit: change_id
    }));

    await this.deps.audit.record(
      createTransitionCommittedEvent({
        actor,
        transition_id,
        identity_id: transition.identity_id
      })
    );

    return updated;
  }

  /**
   * Confirm a committed transition.
   * - Releases escrow
   * - Makes destination authoritative
   * - Irreversible
   *
   * Idempotency boundary: confirmation idempotency covers the continuity state
   * transition and escrow release. External reconciliation must provide its own
   * idempotent change IDs.
   */
  async confirm(
    actor: string,
    transition_id: string,
    change_id: string
  ): Promise<ShardTransition> {
    const transition = await this.requireTransition(transition_id);

    if (transition.status !== "committed") {
      throw new ConflictError(`Cannot confirm transition in state: ${transition.status}`);
    }

    const existing = await this.deps.transitions.findByChangeId(change_id);
    if (existing) {
      if (existing.transition_id !== transition.transition_id) {
        throw new ConflictError("Change ID already used for another transition.", { change_id });
      }
      return existing;
    }

    await this.deps.escrow.release(transition.identity_id, transition.transition_id);

    const updated = await this.deps.transitions.update(transition_id, cur => ({
      ...cur,
      status: "confirmed",
      updated_at: new Date().toISOString(),
      change_id_confirm: change_id
    }));

    await this.deps.audit.record(
      createTransitionConfirmedEvent({
        actor,
        transition_id,
        identity_id: transition.identity_id
      })
    );

    return updated;
  }

  /**
   * Roll back a prepared or committed transition.
   * - Restores assets
   * - Returns authority to source shard
   *
   * TODO(high-scale): Rollback storms should be batched by shard/region by an
   * orchestration layer while preserving per-transition idempotency and audit
   * ordering in this FSM.
   */
  async rollback(
    actor: string,
    transition_id: string,
    change_id: string,
    reason: string
  ): Promise<ShardTransition> {
    const transition = await this.requireTransition(transition_id);

    if (transition.status === "confirmed") {
      throw new ConflictError("Confirmed transitions cannot be rolled back.");
    }

    const existing = await this.deps.transitions.findByChangeId(change_id);
    if (existing) {
      if (existing.transition_id !== transition.transition_id) {
        throw new ConflictError("Change ID already used for another transition.", { change_id });
      }
      return existing;
    }

    await this.deps.escrow.release(transition.identity_id, transition.transition_id);

    const updated = await this.deps.transitions.update(transition_id, cur => ({
      ...cur,
      status: "rolled_back",
      updated_at: new Date().toISOString(),
      change_id_rollback: change_id
    }));

    await this.deps.audit.record(
      createTransitionRolledBackEvent({
        actor,
        transition_id,
        identity_id: transition.identity_id,
        reason
      })
    );

    return updated;
  }

  /**
   * Internal helper to enforce existence.
   */
  private async requireTransition(transition_id: string): Promise<ShardTransition> {
    const t = await this.deps.transitions.get(transition_id);
    if (!t) throw new ConflictError(`Transition not found: ${transition_id}`);
    return t;
  }
}

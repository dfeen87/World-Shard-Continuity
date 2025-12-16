import type { AuditSink } from "../audit.js";
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
      updated_at: new Date().toISOString()
    };

    await this.deps.escrow.lock(identity_id, protected_assets, transition.transition_id);
    await this.deps.transitions.put(transition);

    await this.deps.audit.record({
      type: "transition.prepared",
      actor,
      transition_id: transition.transition_id,
      identity_id,
      metadata: { from_shard, to_shard }
    });

    return transition;
  }

  /**
   * Commit a prepared transition.
   * - Confirms entry into target shard or authority
   * - Still reversible
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
    if (existing) return existing;

    transition.status = "committed";
    transition.updated_at = new Date().toISOString();

    await this.deps.transitions.put(transition);

    await this.deps.audit.record({
      type: "transition.committed",
      actor,
      transition_id,
      identity_id: transition.identity_id
    });

    return transition;
  }

  /**
   * Confirm a committed transition.
   * - Releases escrow
   * - Makes destination authoritative
   * - Irreversible
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
    if (existing) return existing;

    await this.deps.escrow.release(transition.identity_id, transition.transition_id);

    transition.status = "confirmed";
    transition.updated_at = new Date().toISOString();

    await this.deps.transitions.put(transition);

    await this.deps.audit.record({
      type: "transition.confirmed",
      actor,
      transition_id,
      identity_id: transition.identity_id
    });

    return transition;
  }

  /**
   * Roll back a prepared or committed transition.
   * - Restores assets
   * - Returns authority to source shard
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
    if (existing) return existing;

    await this.deps.escrow.release(transition.identity_id, transition.transition_id);

    transition.status = "rolled_back";
    transition.updated_at = new Date().toISOString();

    await this.deps.transitions.put(transition);

    await this.deps.audit.record({
      type: "transition.rolled_back",
      actor,
      transition_id,
      identity_id: transition.identity_id,
      metadata: { reason }
    });

    return transition;
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

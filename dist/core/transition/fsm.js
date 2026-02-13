import { createTransitionCommittedEvent, createTransitionConfirmedEvent, createTransitionPreparedEvent, createTransitionRolledBackEvent } from "../audit.js";
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
    deps;
    constructor(deps) {
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
    getStore() {
        return this.deps.transitions;
    }
    /**
     * Prepare a new transition.
     * - Creates transition record
     * - Escrows protected assets
     * - Does NOT finalize state
     */
    async prepare(actor, identity_id, from_shard, to_shard, protected_assets, change_id) {
        if (!identity_id)
            throw new ValidationError("identity_id required.");
        if (!from_shard || !to_shard)
            throw new ValidationError("from_shard and to_shard required.");
        if (!change_id)
            throw new ValidationError("change_id required.");
        const existing = await this.deps.transitions.findByChangeId(change_id);
        if (existing)
            return existing;
        const transition = {
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
        await this.deps.audit.record(createTransitionPreparedEvent({
            actor,
            transition_id: transition.transition_id,
            identity_id,
            from_shard,
            to_shard
        }));
        return transition;
    }
    /**
     * Commit a prepared transition.
     * - Confirms entry into target shard or authority
     * - Still reversible
     */
    async commit(actor, transition_id, change_id) {
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
        await this.deps.audit.record(createTransitionCommittedEvent({
            actor,
            transition_id,
            identity_id: transition.identity_id
        }));
        return updated;
    }
    /**
     * Confirm a committed transition.
     * - Releases escrow
     * - Makes destination authoritative
     * - Irreversible
     */
    async confirm(actor, transition_id, change_id) {
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
        await this.deps.audit.record(createTransitionConfirmedEvent({
            actor,
            transition_id,
            identity_id: transition.identity_id
        }));
        return updated;
    }
    /**
     * Roll back a prepared or committed transition.
     * - Restores assets
     * - Returns authority to source shard
     */
    async rollback(actor, transition_id, change_id, reason) {
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
        await this.deps.audit.record(createTransitionRolledBackEvent({
            actor,
            transition_id,
            identity_id: transition.identity_id,
            reason
        }));
        return updated;
    }
    /**
     * Internal helper to enforce existence.
     */
    async requireTransition(transition_id) {
        const t = await this.deps.transitions.get(transition_id);
        if (!t)
            throw new ConflictError(`Transition not found: ${transition_id}`);
        return t;
    }
}

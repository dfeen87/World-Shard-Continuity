import { type AuditSink } from "../audit.js";
import type { TransitionStore } from "./transition_store.js";
import type { ShardTransition } from "./types.js";
import type { EscrowService } from "../../economy/escrow.js";
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
export declare class ShardTransitionFSM {
    private readonly deps;
    constructor(deps: {
        transitions: TransitionStore;
        escrow: EscrowService;
        audit: AuditSink;
    });
    /**
     * Expose transition store in a controlled, read-only way.
     * Used by orchestration layers (e.g. executeTransition).
     *
     * NOTE:
     * - Do not mutate transitions directly from callers
     * - All lifecycle changes must go through FSM methods
     */
    getStore(): TransitionStore;
    /**
     * Prepare a new transition.
     * - Creates transition record
     * - Escrows protected assets
     * - Does NOT finalize state
     */
    prepare(actor: string, identity_id: string, from_shard: string, to_shard: string, protected_assets: string[], change_id: string): Promise<ShardTransition>;
    /**
     * Commit a prepared transition.
     * - Confirms entry into target shard or authority
     * - Still reversible
     */
    commit(actor: string, transition_id: string, change_id: string): Promise<ShardTransition>;
    /**
     * Confirm a committed transition.
     * - Releases escrow
     * - Makes destination authoritative
     * - Irreversible
     */
    confirm(actor: string, transition_id: string, change_id: string): Promise<ShardTransition>;
    /**
     * Roll back a prepared or committed transition.
     * - Restores assets
     * - Returns authority to source shard
     */
    rollback(actor: string, transition_id: string, change_id: string, reason: string): Promise<ShardTransition>;
    /**
     * Internal helper to enforce existence.
     */
    private requireTransition;
}

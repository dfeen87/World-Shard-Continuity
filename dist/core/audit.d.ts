interface AuditEventBase {
    at: string;
    actor: string;
}
export interface IdentityCreatedEvent extends AuditEventBase {
    type: "identity.created";
    identity_id: string;
}
export interface IdentityMutatedEvent extends AuditEventBase {
    type: "identity.mutated";
    identity_id: string;
    change_id: string;
}
export interface AssetEscrowedEvent extends AuditEventBase {
    type: "asset.escrowed";
    asset_id: string;
    escrow_id: string;
}
export interface AssetReleasedEvent extends AuditEventBase {
    type: "asset.released";
    asset_id: string;
    escrow_id: string;
}
export interface TransitionPreparedEvent extends AuditEventBase {
    type: "transition.prepared";
    transition_id: string;
    identity_id: string;
    from_shard: string;
    to_shard: string;
}
export interface TransitionCommittedEvent extends AuditEventBase {
    type: "transition.committed";
    transition_id: string;
    identity_id: string;
}
export interface TransitionConfirmedEvent extends AuditEventBase {
    type: "transition.confirmed";
    transition_id: string;
    identity_id: string;
}
export interface TransitionRolledBackEvent extends AuditEventBase {
    type: "transition.rolled_back";
    transition_id: string;
    identity_id: string;
    reason: string;
}
export type AuditEvent = IdentityCreatedEvent | IdentityMutatedEvent | AssetEscrowedEvent | AssetReleasedEvent | TransitionPreparedEvent | TransitionCommittedEvent | TransitionConfirmedEvent | TransitionRolledBackEvent;
export interface AuditSink {
    record(ev: AuditEvent): void;
}
export declare class ConsoleAuditSink implements AuditSink {
    record(ev: AuditEvent): void;
}
export declare function createTransitionPreparedEvent(input: {
    actor: string;
    transition_id: string;
    identity_id: string;
    from_shard: string;
    to_shard: string;
}): TransitionPreparedEvent;
export declare function createTransitionCommittedEvent(input: {
    actor: string;
    transition_id: string;
    identity_id: string;
}): TransitionCommittedEvent;
export declare function createTransitionConfirmedEvent(input: {
    actor: string;
    transition_id: string;
    identity_id: string;
}): TransitionConfirmedEvent;
export declare function createTransitionRolledBackEvent(input: {
    actor: string;
    transition_id: string;
    identity_id: string;
    reason: string;
}): TransitionRolledBackEvent;
export {};

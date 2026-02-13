import { nowIso } from "./time.js";
export class ConsoleAuditSink {
    record(ev) {
        // You can replace this with a file sink, Kafka, DB, etc.
        console.log(JSON.stringify(ev));
    }
}
export function createTransitionPreparedEvent(input) {
    return {
        type: "transition.prepared",
        at: nowIso(),
        actor: input.actor,
        transition_id: input.transition_id,
        identity_id: input.identity_id,
        from_shard: input.from_shard,
        to_shard: input.to_shard
    };
}
export function createTransitionCommittedEvent(input) {
    return {
        type: "transition.committed",
        at: nowIso(),
        actor: input.actor,
        transition_id: input.transition_id,
        identity_id: input.identity_id
    };
}
export function createTransitionConfirmedEvent(input) {
    return {
        type: "transition.confirmed",
        at: nowIso(),
        actor: input.actor,
        transition_id: input.transition_id,
        identity_id: input.identity_id
    };
}
export function createTransitionRolledBackEvent(input) {
    return {
        type: "transition.rolled_back",
        at: nowIso(),
        actor: input.actor,
        transition_id: input.transition_id,
        identity_id: input.identity_id,
        reason: input.reason
    };
}

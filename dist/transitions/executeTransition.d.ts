import type { TransitionControllerRegistry } from "./TransitionControllerRegistry.js";
import type { TransitionRequest, TransitionOutcome, TransitionKind } from "./base/transition_types.js";
import type { TransitionContext } from "./base/transition_context.js";
import type { ShardTransition } from "../core/transition/types.js";
import type { RequestIdempotencyStore } from "./requestIdempotencyStore.js";
export type ExecuteAction = "begin" | "confirm" | "rollback";
export interface ExecuteBeginInput {
    action: "begin";
    request_id: string;
    request: TransitionRequest;
    change_id: string;
    ttl_ms?: number;
    options?: ExecuteOptions;
}
export interface ExecuteConfirmInput {
    action: "confirm";
    kind: TransitionKind;
    transition_id: string;
    change_id: string;
    outcome?: TransitionOutcome;
    options?: ExecuteOptions;
}
export interface ExecuteRollbackInput {
    action: "rollback";
    kind: TransitionKind;
    transition_id: string;
    change_id: string;
    reason: string;
    options?: ExecuteOptions;
}
export type ExecuteTransitionInput = ExecuteBeginInput | ExecuteConfirmInput | ExecuteRollbackInput;
export interface ExecuteOptions {
    preflight?: (input: ExecuteTransitionInput) => Promise<void>;
    hooks?: {
        onStart?: (input: ExecuteTransitionInput) => void;
        onSuccess?: (result: ExecuteTransitionResult) => void;
        onFailure?: (err: unknown, input: ExecuteTransitionInput) => void;
        onIdempotentReplay?: (info: {
            kind: TransitionKind;
            request_id: string;
            transition_id: string;
        }) => void;
    };
    sweep?: {
        enabled: boolean;
        max_to_remove?: number;
    };
}
export interface ExecuteTransitionResult {
    action: ExecuteAction;
    kind: TransitionKind;
    transition?: ShardTransition;
    outcome?: TransitionOutcome;
}
export declare function executeTransition(ctx: TransitionContext, registry: TransitionControllerRegistry, idempotency: RequestIdempotencyStore, input: ExecuteTransitionInput): Promise<ExecuteTransitionResult>;

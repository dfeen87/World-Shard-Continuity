import { TransitionController } from "./base/transition_controller.js";
import type { TransitionKind, TransitionRequest } from "./base/transition_types.js";
/**
 * Production-minded controller registry:
 * - Explicit registration (no magic)
 * - Safe routing by kind
 * - Introspectable (listKinds)
 */
export declare class TransitionControllerRegistry {
    private controllers;
    register(controller: TransitionController): void;
    get(kind: TransitionKind): TransitionController;
    listKinds(): TransitionKind[];
    /**
     * Convenience helper: validate a request using the routed controller.
     */
    validate(req: TransitionRequest): Promise<void>;
}

import { TransitionContext } from "./transition_context.js";
import { TransitionRequest, TransitionOutcome } from "./transition_types.js";
export declare abstract class TransitionController {
    protected readonly ctx: TransitionContext;
    constructor(ctx: TransitionContext);
    abstract readonly kind: TransitionRequest["kind"];
    abstract validate(req: TransitionRequest): Promise<void>;
    abstract execute(req: TransitionRequest): Promise<TransitionOutcome>;
}

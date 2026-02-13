import { TransitionController } from "../base/transition_controller.js";
import { TransitionRequest, TransitionOutcome } from "../base/transition_types.js";
export declare class MatchmakingController extends TransitionController {
    readonly kind = "matchmaking_queue";
    validate(req: TransitionRequest): Promise<void>;
    execute(req: TransitionRequest): Promise<TransitionOutcome>;
}

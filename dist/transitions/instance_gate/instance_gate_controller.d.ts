import { TransitionController } from "../base/transition_controller.js";
import { TransitionRequest, TransitionOutcome } from "../base/transition_types.js";
export declare class InstanceGateController extends TransitionController {
    readonly kind = "instance_gate";
    validate(req: TransitionRequest): Promise<void>;
    execute(req: TransitionRequest): Promise<TransitionOutcome>;
}

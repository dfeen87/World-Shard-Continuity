import { TransitionController } from "../base/transition_controller.js";
import { TransitionRequest, TransitionOutcome } from "../base/transition_types.js";
export declare class VehicleVesselController extends TransitionController {
    readonly kind = "vehicle_vessel";
    validate(req: TransitionRequest): Promise<void>;
    execute(req: TransitionRequest): Promise<TransitionOutcome>;
}

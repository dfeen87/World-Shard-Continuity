import { TransitionControllerRegistry } from "./TransitionControllerRegistry.js";
import { InstanceGateController } from "./instance_gate/instance_gate_controller.js";
import { MatchmakingController } from "./matchmaking/matchmaking_controller.js";
/**
 * Default registry for v1:
 * - instance gate
 * - matchmaking
 *
 * Add airport/vehicle controllers here when you want those routed via the unified API as well.
 */
export function createDefaultRegistry(ctx) {
    const reg = new TransitionControllerRegistry();
    reg.register(new InstanceGateController(ctx));
    reg.register(new MatchmakingController(ctx));
    return reg;
}

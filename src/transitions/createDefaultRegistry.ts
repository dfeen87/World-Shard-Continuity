import { TransitionControllerRegistry } from "./TransitionControllerRegistry.js";
import type { TransitionContext } from "./base/transition_context.js";
import { InstanceGateController } from "./instance_gate/InstanceGateController.js";
import { MatchmakingController } from "./matchmaking/MatchmakingController.js";

/**
 * Default registry for v1:
 * - instance gate
 * - matchmaking
 *
 * Add airport/vehicle controllers here when you want those routed via the unified API as well.
 */
export function createDefaultRegistry(ctx: TransitionContext): TransitionControllerRegistry {
  const reg = new TransitionControllerRegistry();
  reg.register(new InstanceGateController(ctx));
  reg.register(new MatchmakingController(ctx));
  return reg;
}

import { TransitionControllerRegistry } from "./TransitionControllerRegistry.js";
import type { TransitionContext } from "./base/transition_context.js";
/**
 * Default registry for v1:
 * - instance gate
 * - matchmaking
 *
 * Add airport/vehicle controllers here when you want those routed via the unified API as well.
 */
export declare function createDefaultRegistry(ctx: TransitionContext): TransitionControllerRegistry;

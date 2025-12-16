import { TransitionController } from "./base/transition_controller.js";
import type { TransitionKind, TransitionRequest } from "./base/transition_types.js";
import { ValidationError } from "../core/errors.js";

/**
 * Production-minded controller registry:
 * - Explicit registration (no magic)
 * - Safe routing by kind
 * - Introspectable (listKinds)
 */
export class TransitionControllerRegistry {
  private controllers = new Map<TransitionKind, TransitionController>();

  register(controller: TransitionController): void {
    if (this.controllers.has(controller.kind)) {
      throw new ValidationError(`Controller already registered for kind: ${controller.kind}`);
    }
    this.controllers.set(controller.kind, controller);
  }

  get(kind: TransitionKind): TransitionController {
    const ctrl = this.controllers.get(kind);
    if (!ctrl) throw new ValidationError(`No controller registered for kind: ${kind}`);
    return ctrl;
  }

  listKinds(): TransitionKind[] {
    return Array.from(this.controllers.keys());
  }

  /**
   * Convenience helper: validate a request using the routed controller.
   */
  async validate(req: TransitionRequest): Promise<void> {
    await this.get(req.kind).validate(req);
  }
}

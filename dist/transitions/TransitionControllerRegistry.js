import { ValidationError } from "../core/errors.js";
/**
 * Production-minded controller registry:
 * - Explicit registration (no magic)
 * - Safe routing by kind
 * - Introspectable (listKinds)
 */
export class TransitionControllerRegistry {
    controllers = new Map();
    register(controller) {
        if (this.controllers.has(controller.kind)) {
            throw new ValidationError(`Controller already registered for kind: ${controller.kind}`);
        }
        this.controllers.set(controller.kind, controller);
    }
    get(kind) {
        const ctrl = this.controllers.get(kind);
        if (!ctrl)
            throw new ValidationError(`No controller registered for kind: ${kind}`);
        return ctrl;
    }
    listKinds() {
        return Array.from(this.controllers.keys());
    }
    /**
     * Convenience helper: validate a request using the routed controller.
     */
    async validate(req) {
        await this.get(req.kind).validate(req);
    }
}

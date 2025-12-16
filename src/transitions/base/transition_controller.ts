import { TransitionContext } from "./transition_context.js";
import { TransitionRequest, TransitionOutcome } from "./transition_types.js";

export abstract class TransitionController {
  constructor(protected readonly ctx: TransitionContext) {}

  abstract readonly kind: TransitionRequest["kind"];

  abstract validate(req: TransitionRequest): Promise<void>;

  abstract execute(req: TransitionRequest): Promise<TransitionOutcome>;
}

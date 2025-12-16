import { TransitionController } from "../base/transition_controller.js";
import { TransitionRequest, TransitionOutcome } from "../base/transition_types.js";
import { ConflictError } from "../../core/errors.js";

export class InstanceGateController extends TransitionController {
  readonly kind = "instance_gate";

  async validate(req: TransitionRequest): Promise<void> {
    if (!req.to_shard) {
      throw new ConflictError("Instance gate requires destination instance shard.");
    }
  }

  async execute(req: TransitionRequest): Promise<TransitionOutcome> {
    const changeId = `inst_${Date.now()}`;

    const t = await this.ctx.fsm.prepare(
      this.ctx.actor,
      req.identity_id,
      req.from_shard,
      req.to_shard!,
      req.protected_assets,
      changeId
    );

    // Commit immediately (instances are short-lived)
    await this.ctx.fsm.commit(this.ctx.actor, t.transition_id, `${changeId}:commit`);

    // Instance execution happens outside this controller
    // Controller only governs entry + reintegration

    return {
      success: true,
      flags: ["instance_entered"]
    };
  }
}

import { TransitionController } from "../base/transition_controller.js";
import { TransitionRequest, TransitionOutcome } from "../base/transition_types.js";
import { ConflictError } from "../../core/errors.js";

export class MatchmakingController extends TransitionController {
  readonly kind = "matchmaking_queue";

  async validate(req: TransitionRequest): Promise<void> {
    if (!req.metadata?.match_id) {
      throw new ConflictError("match_id required for matchmaking transition.");
    }
  }

  async execute(req: TransitionRequest): Promise<TransitionOutcome> {
    const changeId = `mm_${Date.now()}`;

    const t = await this.ctx.fsm.prepare(
      this.ctx.actor,
      req.identity_id,
      req.from_shard,
      req.to_shard ?? "instance_match",
      req.protected_assets,
      changeId
    );

    await this.ctx.fsm.commit(this.ctx.actor, t.transition_id, `${changeId}:commit`);

    return {
      success: true,
      flags: ["match_started"],
    };
  }
}

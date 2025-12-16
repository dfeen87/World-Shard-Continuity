import { TransitionController } from "../base/transition_controller.js";
import { TransitionRequest, TransitionOutcome } from "../base/transition_types.js";
import { ConflictError } from "../../core/errors.js";

export class VehicleVesselController extends TransitionController {
  readonly kind = "vehicle_vessel";

  async validate(req: TransitionRequest): Promise<void> {
    if (!req.to_shard) {
      throw new ConflictError("Vehicle transition requires destination shard.");
    }
    if (!req.metadata?.vehicle_id) {
      throw new ConflictError("vehicle_id required for vehicle transition.");
    }
  }

  async execute(req: TransitionRequest): Promise<TransitionOutcome> {
    const changeId = `veh_${Date.now()}`;

    const t = await this.ctx.fsm.prepare(
      this.ctx.actor,
      req.identity_id,
      req.from_shard,
      req.to_shard!,
      req.protected_assets,
      changeId
    );

    // NOTE: commit may be delayed until arrival
    await this.ctx.fsm.commit(this.ctx.actor, t.transition_id, `${changeId}:depart`);

    return {
      success: true,
      flags: ["in_transit"],
    };
  }
}

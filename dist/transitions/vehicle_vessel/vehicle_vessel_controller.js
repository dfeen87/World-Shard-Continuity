import { TransitionController } from "../base/transition_controller.js";
import { ConflictError } from "../../core/errors.js";
export class VehicleVesselController extends TransitionController {
    kind = "vehicle_vessel";
    async validate(req) {
        if (!req.to_shard) {
            throw new ConflictError("Vehicle transition requires destination shard.");
        }
        if (!req.metadata?.vehicle_id) {
            throw new ConflictError("vehicle_id required for vehicle transition.");
        }
    }
    async execute(req) {
        const changeId = `veh_${Date.now()}`;
        const t = await this.ctx.fsm.prepare(this.ctx.actor, req.identity_id, req.from_shard, req.to_shard, req.protected_assets, changeId);
        // NOTE: commit may be delayed until arrival
        await this.ctx.fsm.commit(this.ctx.actor, t.transition_id, `${changeId}:depart`);
        return {
            success: true,
            flags: ["in_transit"],
            transition_id: t.transition_id,
        };
    }
}

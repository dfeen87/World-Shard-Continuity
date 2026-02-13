import { TransitionController } from "../base/transition_controller.js";
import { ConflictError } from "../../core/errors.js";
export class InstanceGateController extends TransitionController {
    kind = "instance_gate";
    async validate(req) {
        if (!req.to_shard) {
            throw new ConflictError("Instance gate requires destination instance shard.");
        }
    }
    async execute(req) {
        const changeId = `inst_${Date.now()}`;
        const t = await this.ctx.fsm.prepare(this.ctx.actor, req.identity_id, req.from_shard, req.to_shard, req.protected_assets, changeId);
        // Commit immediately (instances are short-lived)
        await this.ctx.fsm.commit(this.ctx.actor, t.transition_id, `${changeId}:commit`);
        // Instance execution happens outside this controller
        // Controller only governs entry + reintegration
        return {
            success: true,
            flags: ["instance_entered"],
            transition_id: t.transition_id
        };
    }
}

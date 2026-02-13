import { TransitionError, ValidationError } from "../core/errors.js";
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
export async function executeTransition(ctx, registry, idempotency, input) {
    const hooks = input.options?.hooks;
    try {
        hooks?.onStart?.(input);
        await input.options?.preflight?.(input);
        // Best-effort opportunistic sweep (bounded)
        if (input.options?.sweep?.enabled) {
            await idempotency.sweep(Date.now(), input.options.sweep.max_to_remove ?? 5000);
        }
        if (input.action === "begin") {
            if (!input.request_id)
                throw new ValidationError("begin requires request_id.");
            if (!input.change_id || input.change_id.length < 6) {
                throw new ValidationError("begin requires a strong change_id (>= 6 chars).");
            }
            // API-level idempotency (pre-controller)
            const existingTid = await idempotency.get(input.request.kind, input.request_id);
            if (existingTid) {
                const transition = await ctx.fsm.getStore().get(existingTid);
                if (!transition) {
                    throw new TransitionError("Idempotency store points to missing transition.", {
                        kind: input.request.kind,
                        request_id: input.request_id,
                        transition_id: existingTid
                    });
                }
                hooks?.onIdempotentReplay?.({
                    kind: input.request.kind,
                    request_id: input.request_id,
                    transition_id: existingTid
                });
                const result = {
                    action: "begin",
                    kind: input.request.kind,
                    transition,
                    outcome: { success: true, flags: ["idempotent_replay"], transition_id: existingTid }
                };
                hooks?.onSuccess?.(result);
                return result;
            }
            await registry.validate(input.request);
            const controller = registry.get(input.request.kind);
            const outcome = await controller.execute(input.request);
            const transition_id = outcome.transition_id;
            if (!transition_id) {
                throw new TransitionError("Controller did not return transition_id (required for request_id binding).");
            }
            await idempotency.put(input.request.kind, input.request_id, transition_id, input.ttl_ms ?? DEFAULT_TTL_MS);
            const transition = await ctx.fsm.getStore().get(transition_id);
            if (!transition) {
                throw new TransitionError("Controller produced missing transition.", { transition_id });
            }
            const result = { action: "begin", kind: input.request.kind, transition, outcome };
            hooks?.onSuccess?.(result);
            return result;
        }
        // confirm / rollback
        const existing = await ctx.fsm.getStore().get(input.transition_id);
        if (!existing)
            throw new TransitionError("Transition not found.", { transition_id: input.transition_id });
        if (input.action === "confirm") {
            const t = await ctx.fsm.confirm(ctx.actor, input.transition_id, input.change_id);
            const result = input.outcome
                ? { action: "confirm", kind: input.kind, transition: t, outcome: input.outcome }
                : { action: "confirm", kind: input.kind, transition: t };
            hooks?.onSuccess?.(result);
            return result;
        }
        if (input.action === "rollback") {
            const t = await ctx.fsm.rollback(ctx.actor, input.transition_id, input.change_id, input.reason);
            const result = {
                action: "rollback",
                kind: input.kind,
                transition: t,
                outcome: { success: false, failure_reason: input.reason }
            };
            hooks?.onSuccess?.(result);
            return result;
        }
        throw new ValidationError("Unknown action.");
    }
    catch (err) {
        hooks?.onFailure?.(err, input);
        throw err;
    }
}

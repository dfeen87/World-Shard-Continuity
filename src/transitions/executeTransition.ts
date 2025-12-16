import type { TransitionControllerRegistry } from "./TransitionControllerRegistry.js";
import type { TransitionRequest, TransitionOutcome, TransitionKind } from "./base/transition_types.js";
import type { TransitionContext } from "./base/transition_context.js";
import type { ShardTransition } from "../core/transition/types.js";
import { TransitionError, ValidationError } from "../core/errors.js";

/**
 * ExecuteTransition API
 *
 * - begin: route request by kind and execute controller logic (typically prepare+commit or prepare only)
 * - confirm: finalize the transition via FSM confirm (releases escrow, marks confirmed)
 * - rollback: abort transition via FSM rollback (restores escrow, marks rolled_back)
 *
 * Controllers are responsible for "begin" semantics.
 * Kernel FSM is authoritative for confirm/rollback semantics.
 */

export type ExecuteAction = "begin" | "confirm" | "rollback";

export interface ExecuteBeginInput {
  action: "begin";
  request: TransitionRequest;
  change_id: string; // idempotency token for the begin operation at the API boundary
  options?: ExecuteOptions;
}

export interface ExecuteConfirmInput {
  action: "confirm";
  kind: TransitionKind;
  transition_id: string;
  change_id: string;
  options?: ExecuteOptions;
  outcome?: TransitionOutcome; // optional: attach outcome for higher-level callers; not settled by kernel
}

export interface ExecuteRollbackInput {
  action: "rollback";
  kind: TransitionKind;
  transition_id: string;
  change_id: string;
  reason: string;
  options?: ExecuteOptions;
}

export type ExecuteTransitionInput = ExecuteBeginInput | ExecuteConfirmInput | ExecuteRollbackInput;

export interface ExecuteOptions {
  /**
   * Provide additional guards without changing core logic.
   * Example: forbid certain routes, enforce shard health checks, etc.
   */
  preflight?: (input: ExecuteTransitionInput) => Promise<void>;

  /**
   * Lifecycle hooks for telemetry & observability.
   */
  hooks?: {
    onStart?: (input: ExecuteTransitionInput) => void;
    onSuccess?: (result: ExecuteTransitionResult) => void;
    onFailure?: (err: unknown, input: ExecuteTransitionInput) => void;
  };
}

export interface ExecuteTransitionResult {
  action: ExecuteAction;
  kind: TransitionKind;
  transition?: ShardTransition;
  outcome?: TransitionOutcome;
}

export async function executeTransition(
  ctx: TransitionContext,
  registry: TransitionControllerRegistry,
  input: ExecuteTransitionInput
): Promise<ExecuteTransitionResult> {
  const hooks = input.options?.hooks;

  try {
    hooks?.onStart?.(input);
    await input.options?.preflight?.(input);

    if (input.action === "begin") {
      if (!input.change_id || input.change_id.length < 6) {
        throw new ValidationError("begin requires a strong change_id (>= 6 chars).");
      }

      // Validate schema/shape requirements for this kind
      await registry.validate(input.request);

      // Delegate "begin" semantics to controller
      const ctrl = registry.get(input.request.kind);
      const outcome = await ctrl.execute(input.request, input.change_id);

      // The controller should have created a transition and stored it;
      // but for reliability, we allow controller to return it explicitly via outcome.transition_id.
      // We'll attempt to read it from store if transition_id is present.
      let transition: ShardTransition | undefined;

      const maybeTid = (outcome as any)?.transition_id as string | undefined;
      if (maybeTid) {
        transition = (await ctx.fsm["deps"]?.transitions?.get?.(maybeTid)) ?? undefined;
      }

      const result: ExecuteTransitionResult = {
        action: "begin",
        kind: input.request.kind,
        transition,
        outcome
      };
      hooks?.onSuccess?.(result);
      return result;
    }

    // confirm / rollback paths are kernel-owned and consistent across kinds
    if (!input.transition_id) throw new ValidationError("transition_id required.");

    const existing = await ctx.fsm["deps"]?.transitions?.get?.(input.transition_id);
    if (!existing) throw new TransitionError("Transition not found.", { transition_id: input.transition_id });

    if (input.action === "confirm") {
      const transition = await ctx.fsm.confirm(ctx.actor, input.transition_id, input.change_id);

      const result: ExecuteTransitionResult = {
        action: "confirm",
        kind: input.kind,
        transition,
        outcome: input.outcome
      };
      hooks?.onSuccess?.(result);
      return result;
    }

    if (input.action === "rollback") {
      const transition = await ctx.fsm.rollback(ctx.actor, input.transition_id, input.change_id, input.reason);

      const result: ExecuteTransitionResult = {
        action: "rollback",
        kind: input.kind,
        transition,
        outcome: { success: false, failure_reason: input.reason }
      };
      hooks?.onSuccess?.(result);
      return result;
    }

    throw new ValidationError(`Unknown action: ${(input as any).action}`);
  } catch (err) {
    hooks?.onFailure?.(err, input);
    throw err;
  }
}

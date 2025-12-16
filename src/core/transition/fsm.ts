import { AuditSink, auditNow } from "../audit.js";
import { TransitionError } from "../errors.js";
import { newId } from "../ids.js";
import { nowIso } from "../time.js";
import { EscrowService } from "../../economy/escrow.js";
import { TransitionStore } from "./in_memory_transition_store.js";
import { ShardTransition } from "./types.js";

export interface TransitionDeps {
  transitions: TransitionStore;
  escrow: EscrowService;
  audit: AuditSink;
}

export class ShardTransitionFSM {
  constructor(private deps: TransitionDeps) {}

  async prepare(actor: string, identityId: string, fromShard: string, toShard: string, protectedAssets: string[], changeId: string): Promise<ShardTransition> {
    const transition: ShardTransition = {
      transition_id: newId("tx", 16),
      identity_id: identityId,
      from_shard: fromShard,
      to_shard: toShard,
      started_at: nowIso(),
      status: "prepared",
      protected_assets: protectedAssets,
      change_id_prepare: changeId
    };

    // escrow protected assets (idempotency handled at ledger level)
    for (const aid of protectedAssets) {
      await this.deps.escrow.holdAsset(aid, identityId, `${changeId}:escrow:${aid}`);
      this.deps.audit.emit(auditNow({ type: "asset.escrowed", actor, asset_id: aid, escrow_id: "held" }));
    }

    await this.deps.transitions.put(transition);
    this.deps.audit.emit(auditNow({ type: "transition.started", actor, transition_id: transition.transition_id, from: fromShard, to: toShard }));
    return transition;
  }

  async commit(actor: string, transitionId: string, changeId: string): Promise<ShardTransition> {
    const cur = await this.deps.transitions.get(transitionId);
    if (!cur) throw new TransitionError("Transition not found.", { transition_id: transitionId });

    if (cur.status === "committed" || cur.status === "confirmed") return cur;
    if (cur.status !== "prepared") throw new TransitionError("Invalid transition state for commit.", { status: cur.status });

    // In a real system: serialize state, validate destination readiness, reserve capacity, etc.

    const next = await this.deps.transitions.update(transitionId, (t) => ({
      ...t,
      status: "committed",
      change_id_commit: changeId
    }));

    this.deps.audit.emit(auditNow({ type: "transition.committed", actor, transition_id: transitionId }));
    return next;
  }

  async confirm(actor: string, transitionId: string, changeId: string): Promise<ShardTransition> {
    const cur = await this.deps.transitions.get(transitionId);
    if (!cur) throw new TransitionError("Transition not found.", { transition_id: transitionId });

    if (cur.status === "confirmed") return cur;
    if (cur.status !== "committed") throw new TransitionError("Invalid transition state for confirm.", { status: cur.status });

    // Release escrow now that destination is authoritative
    for (const aid of cur.protected_assets) {
      await this.deps.escrow.releaseAsset(aid, `${changeId}:release:${aid}`);
      this.deps.audit.emit(auditNow({ type: "asset.released", actor, asset_id: aid, escrow_id: "released" }));
    }

    const next = await this.deps.transitions.update(transitionId, (t) => ({
      ...t,
      status: "confirmed",
      change_id_confirm: changeId
    }));

    this.deps.audit.emit(auditNow({ type: "transition.confirmed", actor, transition_id: transitionId }));
    return next;
  }

  async rollback(actor: string, transitionId: string, changeId: string, reason: string): Promise<ShardTransition> {
    const cur = await this.deps.transitions.get(transitionId);
    if (!cur) throw new TransitionError("Transition not found.", { transition_id: transitionId });

    if (cur.status === "rolled_back") return cur;
    if (cur.status === "confirmed") throw new TransitionError("Cannot rollback a confirmed transition.", { transition_id: transitionId });

    for (const aid of cur.protected_assets) {
      await this.deps.escrow.rollbackAsset(aid, `${changeId}:rb:${aid}`, reason);
    }

    const next = await this.deps.transitions.update(transitionId, (t) => ({
      ...t,
      status: "rolled_back",
      failure_reason: reason
    }));

    this.deps.audit.emit(auditNow({ type: "transition.rolled_back", actor, transition_id: transitionId, reason }));
    return next;
  }
}

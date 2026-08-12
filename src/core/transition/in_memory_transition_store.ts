// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "../errors.js";
import { TransitionStore } from "./transition_store.js";
import { ShardTransition } from "./types.js";

export class InMemoryTransitionStore implements TransitionStore {
  private map = new Map<string, ShardTransition>();

  async get(id: string): Promise<ShardTransition | null> {
    return this.map.get(id) ?? null;
  }

  async put(t: ShardTransition): Promise<void> {
    if (this.map.has(t.transition_id)) throw new ConflictError("Transition exists.", { transition_id: t.transition_id });
    this.map.set(t.transition_id, t);
  }

  async update(id: string, fn: (cur: ShardTransition) => ShardTransition): Promise<ShardTransition> {
    const cur = this.map.get(id);
    if (!cur) throw new NotFoundError("Transition not found.", { transition_id: id });
    const next = fn(cur);
    this.map.set(id, next);
    return next;
  }

  async findByChangeId(changeId: string): Promise<ShardTransition | null> {
    for (const transition of this.map.values()) {
      if (
        transition.change_id_prepare === changeId ||
        transition.change_id_commit === changeId ||
        transition.change_id_confirm === changeId ||
        transition.change_id_rollback === changeId
      ) {
        return transition;
      }
    }
    return null;
  }

  generateId(): string {
    return `tr_${randomUUID()}`;
  }
}

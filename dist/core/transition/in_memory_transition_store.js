import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "../errors.js";
export class InMemoryTransitionStore {
    map = new Map();
    async get(id) {
        return this.map.get(id) ?? null;
    }
    async put(t) {
        if (this.map.has(t.transition_id))
            throw new ConflictError("Transition exists.", { transition_id: t.transition_id });
        this.map.set(t.transition_id, t);
    }
    async update(id, fn) {
        const cur = this.map.get(id);
        if (!cur)
            throw new NotFoundError("Transition not found.", { transition_id: id });
        const next = fn(cur);
        this.map.set(id, next);
        return next;
    }
    async findByChangeId(changeId) {
        for (const transition of this.map.values()) {
            if (transition.change_id_prepare === changeId ||
                transition.change_id_commit === changeId ||
                transition.change_id_confirm === changeId ||
                transition.change_id_rollback === changeId) {
                return transition;
            }
        }
        return null;
    }
    generateId() {
        return `tr_${randomUUID()}`;
    }
}

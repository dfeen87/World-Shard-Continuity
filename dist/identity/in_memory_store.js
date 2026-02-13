import { ConflictError, NotFoundError } from "../core/errors.js";
import { nowIso } from "../core/time.js";
export class InMemoryIdentityStore {
    map = new Map();
    async get(identityId) {
        return this.map.get(identityId) ?? null;
    }
    async put(identity) {
        if (this.map.has(identity.identity_id)) {
            throw new ConflictError("Identity already exists.", { identity_id: identity.identity_id });
        }
        this.map.set(identity.identity_id, identity);
    }
    async mutate(identityId, changeId, fn) {
        const cur = this.map.get(identityId);
        if (!cur)
            throw new NotFoundError("Identity not found.", { identity_id: identityId });
        if (cur.audit.last_change_id && cur.audit.last_change_id === changeId) {
            // idempotent: return current without applying again
            return cur;
        }
        const next = fn(cur);
        next.updated_at = nowIso();
        next.audit = { ...next.audit, last_change_id: changeId };
        this.map.set(identityId, next);
        return next;
    }
}

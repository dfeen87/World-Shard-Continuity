import { ConflictError, NotFoundError } from "../core/errors.js";
import { nowIso } from "../core/time.js";
import { IdentityStore } from "./store.js";
import { PlayerIdentity } from "./types.js";

export class InMemoryIdentityStore implements IdentityStore {
  private map = new Map<string, PlayerIdentity>();

  async get(identityId: string): Promise<PlayerIdentity | null> {
    return this.map.get(identityId) ?? null;
  }

  async put(identity: PlayerIdentity): Promise<void> {
    if (this.map.has(identity.identity_id)) {
      throw new ConflictError("Identity already exists.", { identity_id: identity.identity_id });
    }
    this.map.set(identity.identity_id, identity);
  }

  async mutate(identityId: string, changeId: string, fn: (cur: PlayerIdentity) => PlayerIdentity): Promise<PlayerIdentity> {
    const cur = this.map.get(identityId);
    if (!cur) throw new NotFoundError("Identity not found.", { identity_id: identityId });

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

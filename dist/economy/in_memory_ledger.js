import { ConflictError, NotFoundError } from "../core/errors.js";
import { nowIso } from "../core/time.js";
export class InMemoryEconomyLedger {
    map = new Map();
    seed(asset) {
        if (this.map.has(asset.asset_id))
            throw new ConflictError("Asset already exists.", { asset_id: asset.asset_id });
        this.map.set(asset.asset_id, asset);
    }
    async get(assetId) {
        return this.map.get(assetId) ?? null;
    }
    async mutate(assetId, changeId, fn) {
        const cur = this.map.get(assetId);
        if (!cur)
            throw new NotFoundError("Asset not found.", { asset_id: assetId });
        if (cur.audit.last_change_id === changeId)
            return cur; // idempotent
        const next = fn(cur);
        next.lifecycle.updated_at = nowIso();
        next.audit.last_change_id = changeId;
        next.audit.last_changed_at = nowIso();
        // increment version defensively
        const currentVersion = cur.integrity.version ?? 0;
        next.integrity.version = currentVersion + 1;
        this.map.set(assetId, next);
        return next;
    }
}

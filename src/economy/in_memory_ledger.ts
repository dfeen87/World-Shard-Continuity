import { ConflictError, NotFoundError } from "../core/errors.js";
import { nowIso } from "../core/time.js";
import { EconomyLedger } from "./ledger.js";
import { AssetOwnershipRecord } from "./types.js";

export class InMemoryEconomyLedger implements EconomyLedger {
  private map = new Map<string, AssetOwnershipRecord>();

  seed(asset: AssetOwnershipRecord): void {
    if (this.map.has(asset.asset_id)) throw new ConflictError("Asset already exists.", { asset_id: asset.asset_id });
    this.map.set(asset.asset_id, asset);
  }

  async get(assetId: string): Promise<AssetOwnershipRecord | null> {
    return this.map.get(assetId) ?? null;
  }

  async mutate(
    assetId: string,
    changeId: string,
    fn: (cur: AssetOwnershipRecord) => AssetOwnershipRecord
  ): Promise<AssetOwnershipRecord> {
    const cur = this.map.get(assetId);
    if (!cur) throw new NotFoundError("Asset not found.", { asset_id: assetId });

    if (cur.audit.last_change_id === changeId) return cur; // idempotent

    const next = fn(cur);
    next.lifecycle.updated_at = nowIso();
    next.audit.last_change_id = changeId;
    next.audit.last_changed_at = nowIso();

    // increment version defensively
    next.integrity.version = (cur.integrity.version ?? 1) + 1;

    this.map.set(assetId, next);
    return next;
  }
}

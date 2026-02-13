import { AssetOwnershipRecord } from "./types.js";
export interface EconomyLedger {
    get(assetId: string): Promise<AssetOwnershipRecord | null>;
    mutate(assetId: string, changeId: string, fn: (cur: AssetOwnershipRecord) => AssetOwnershipRecord): Promise<AssetOwnershipRecord>;
}

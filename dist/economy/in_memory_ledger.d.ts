import { EconomyLedger } from "./ledger.js";
import { AssetOwnershipRecord } from "./types.js";
export declare class InMemoryEconomyLedger implements EconomyLedger {
    private map;
    seed(asset: AssetOwnershipRecord): void;
    get(assetId: string): Promise<AssetOwnershipRecord | null>;
    mutate(assetId: string, changeId: string, fn: (cur: AssetOwnershipRecord) => AssetOwnershipRecord): Promise<AssetOwnershipRecord>;
}

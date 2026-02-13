import { EconomyLedger } from "./ledger.js";
import { EscrowRecord } from "./types.js";
export declare class EscrowService {
    private ledger;
    private escrows;
    private assetToEscrow;
    private transitionToAssets;
    constructor(ledger: EconomyLedger);
    lock(ownerId: string, assetIds: string[], changeId: string): Promise<EscrowRecord[]>;
    release(ownerId: string, changeId: string): Promise<EscrowRecord[]>;
    holdAsset(assetId: string, ownerId: string, changeId: string): Promise<EscrowRecord>;
    releaseAsset(assetId: string, changeId: string): Promise<EscrowRecord>;
    rollbackAsset(assetId: string, changeId: string, reason: string): Promise<EscrowRecord>;
}

// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { AssetOwnershipRecord } from "./types.js";

export interface EconomyLedger {
  get(assetId: string): Promise<AssetOwnershipRecord | null>;

  // atomic mutation with idempotency
  // TODO(high-scale): Batch independent asset mutations where ordering is not
  // significant, but require pessimistic authority/escrow for the same asset or
  // identity. This game-only ledger is not a wallet, marketplace, payment rail,
  // real-money ledger, or compliance-ready system.
  mutate(
    assetId: string,
    changeId: string,
    fn: (cur: AssetOwnershipRecord) => AssetOwnershipRecord
  ): Promise<AssetOwnershipRecord>;
}

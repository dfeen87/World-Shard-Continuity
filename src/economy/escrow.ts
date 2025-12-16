import { ConflictError, SecurityError } from "../core/errors.js";
import { newId } from "../core/ids.js";
import { nowIso } from "../core/time.js";
import { EconomyLedger } from "./ledger.js";
import { EscrowRecord } from "./types.js";

export class EscrowService {
  private escrows = new Map<string, EscrowRecord>();
  private assetToEscrow = new Map<string, string>();

  constructor(private ledger: EconomyLedger) {}

  async holdAsset(assetId: string, ownerId: string, changeId: string): Promise<EscrowRecord> {
    // prevent double escrow
    if (this.assetToEscrow.has(assetId)) {
      throw new ConflictError("Asset already escrowed.", { asset_id: assetId, escrow_id: this.assetToEscrow.get(assetId) });
    }

    const asset = await this.ledger.get(assetId);
    if (!asset) throw new SecurityError("Cannot escrow non-existent asset.", { asset_id: assetId });
    if (asset.owner.owner_id !== ownerId) throw new SecurityError("Only the owner can escrow an asset.", { asset_id: assetId });

    await this.ledger.mutate(assetId, changeId, (cur) => {
      if (cur.state.status !== "active") {
        throw new ConflictError("Asset must be active to escrow.", { asset_id: assetId, status: cur.state.status });
      }
      return { ...cur, state: { ...cur.state, status: "escrow" } };
    });

    const escrow: EscrowRecord = {
      escrow_id: newId("tx", 16),
      asset_id: assetId,
      owner_id: ownerId,
      created_at: nowIso(),
      status: "held"
    };

    this.escrows.set(escrow.escrow_id, escrow);
    this.assetToEscrow.set(assetId, escrow.escrow_id);
    return escrow;
  }

  async releaseAsset(assetId: string, changeId: string): Promise<EscrowRecord> {
    const escrowId = this.assetToEscrow.get(assetId);
    if (!escrowId) throw new ConflictError("Asset not escrowed.", { asset_id: assetId });

    const escrow = this.escrows.get(escrowId)!;
    if (escrow.status !== "held") return escrow;

    await this.ledger.mutate(assetId, changeId, (cur) => {
      if (cur.state.status !== "escrow") return cur;
      return { ...cur, state: { ...cur.state, status: "active" } };
    });

    const next: EscrowRecord = { ...escrow, status: "released", released_at: nowIso() };
    this.escrows.set(escrowId, next);
    this.assetToEscrow.delete(assetId);
    return next;
  }

  async rollbackAsset(assetId: string, changeId: string, reason: string): Promise<EscrowRecord> {
    const escrowId = this.assetToEscrow.get(assetId);
    if (!escrowId) throw new ConflictError("Asset not escrowed.", { asset_id: assetId });

    const escrow = this.escrows.get(escrowId)!;
    if (escrow.status !== "held") return escrow;

    await this.ledger.mutate(assetId, changeId, (cur) => {
      // rollback to active; higher-level systems may apply additional repairs
      return { ...cur, state: { ...cur.state, status: "active" }, state_reason: reason } as any;
    });

    const next: EscrowRecord = { ...escrow, status: "rolled_back", released_at: nowIso() };
    this.escrows.set(escrowId, next);
    this.assetToEscrow.delete(assetId);
    return next;
  }
}

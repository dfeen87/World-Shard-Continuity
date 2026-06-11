import { ValidationError } from "../core/errors.js";
import type { EconomyLedger } from "./ledger.js";
import type { AssetOwnershipRecord, EconomicEvent } from "./types.js";

/**
 * Applies placeholder in-game economic deltas through the authoritative ledger path.
 *
 * Guardrails:
 * - This is not a payment system.
 * - This is not a monetization layer.
 * - This is not a real-money wallet.
 * - This is not a compliance-ready ledger.
 *
 * EconomicEvent is intentionally small: it records typed, auditable game-only
 * quantity deltas for currency AssetOwnershipRecord entries. It does not model
 * balancing formulas, external value, or settlement outside the continuity layer.
 */
export async function applyEconomicEvents(
  ledger: EconomyLedger,
  events: readonly EconomicEvent[] | undefined
): Promise<void> {
  if (!events?.length) return;

  for (const event of events) {
    validateEconomicEvent(event);

    await ledger.mutate(event.asset_id, event.change_id, (cur) => applyEconomicEvent(cur, event));
  }
}

function validateEconomicEvent(event: EconomicEvent): void {
  if (!event.asset_id) throw new ValidationError("EconomicEvent requires asset_id.");
  if (!event.change_id) throw new ValidationError("EconomicEvent requires change_id.");
  if (!event.reason) throw new ValidationError("EconomicEvent requires reason.");
  if (!Number.isFinite(event.amount)) throw new ValidationError("EconomicEvent amount must be finite.");
  if (!Number.isFinite(event.timestamp)) throw new ValidationError("EconomicEvent timestamp must be finite.");
}

function applyEconomicEvent(cur: AssetOwnershipRecord, event: EconomicEvent): AssetOwnershipRecord {
  if (cur.asset_class !== "currency") {
    throw new ValidationError("EconomicEvent may only mutate game-only currency assets through the ledger.", {
      asset_id: event.asset_id,
      asset_class: cur.asset_class
    });
  }

  const currentQuantity = cur.state.quantity ?? 0;
  const nextQuantity = currentQuantity + event.amount;
  if (nextQuantity < 0) {
    throw new ValidationError("EconomicEvent would make currency quantity negative.", {
      asset_id: event.asset_id,
      change_id: event.change_id
    });
  }

  return {
    ...cur,
    state: {
      ...cur.state,
      quantity: nextQuantity,
      state_reason: event.reason
    },
    audit: {
      ...cur.audit,
      last_changed_by: "continuity:economic_event"
    }
  };
}

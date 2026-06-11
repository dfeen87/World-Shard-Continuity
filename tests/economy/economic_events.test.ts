import assert from "node:assert/strict";
import test from "node:test";
import { applyEconomicEvents } from "../../src/economy/economic_events.js";
import { InMemoryEconomyLedger } from "../../src/economy/in_memory_ledger.js";
import type { AssetOwnershipRecord } from "../../src/economy/types.js";

function asset(asset_id: string, asset_class: AssetOwnershipRecord["asset_class"], quantity: number): AssetOwnershipRecord {
  return {
    schema_version: "1.0.0",
    asset_id,
    asset_class,
    scope: "global",
    owner: { owner_type: "player", owner_id: "pid_test_player" },
    state: { status: "active", quantity },
    lifecycle: { created_at: new Date().toISOString(), origin: { origin_type: "grant", origin_ref: "test" } },
    transfer_policy: { transferable: false, transfer_scope: "none", requires_escrow: false },
    integrity: { idempotency_key: `idem_${asset_id}`, version: 1 },
    audit: { change_log_ref: "memory://audit", last_change_id: "seed" }
  };
}

test("economic events mutate game-only currency through the ledger idempotently", async () => {
  const ledger = new InMemoryEconomyLedger();
  ledger.seed(asset("aid_currency_test_001", "currency", 10));

  const event = {
    asset_id: "aid_currency_test_001",
    amount: 5,
    reason: "test_reward",
    change_id: "chg_reward_001",
    timestamp: Date.now()
  };

  await applyEconomicEvents(ledger, [event]);
  await applyEconomicEvents(ledger, [event]);

  const after = await ledger.get(event.asset_id);
  assert.equal(after?.state.quantity, 15);
  assert.equal(after?.audit.last_change_id, event.change_id);
});

test("economic events reject non-currency asset mutation", async () => {
  const ledger = new InMemoryEconomyLedger();
  ledger.seed(asset("aid_item_test_001", "item", 1));

  await assert.rejects(
    applyEconomicEvents(ledger, [{
      asset_id: "aid_item_test_001",
      amount: 5,
      reason: "invalid_reward",
      change_id: "chg_invalid_001",
      timestamp: Date.now()
    }]),
    /currency assets/
  );
});

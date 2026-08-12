// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import type { EconomicEvent } from "../../economy/types.js";

export type TransitionKind =
  | "airport_terminal"
  | "instance_gate"
  | "vehicle_vessel"
  | "matchmaking_queue";

export interface TransitionRequest {
  kind: TransitionKind;
  identity_id: string;
  from_shard: string;
  to_shard?: string;
  protected_assets: string[];
  metadata?: Record<string, unknown>;
}

export interface TransitionOutcome {
  success: boolean;
  flags?: string[];
  failure_reason?: string;

  // Optional convenience: controller may return transition_id explicitly
  transition_id?: string;

  // Optional: for match/instance resolution (not required at begin)
  granted_assets?: string[];
  consumed_assets?: string[];
  /**
   * Typed game-only economic deltas to reconcile through EconomyLedger.mutate().
   * This field is a placeholder for future continuity-authorized currency
   * handling; it is not a payment system, monetization layer, real-money wallet,
   * or compliance-ready ledger.
   */
  economic_events?: EconomicEvent[];

  /**
   * @deprecated Use economic_events. This scalar is retained only for backward
   * compatibility and must never be treated as authoritative.
   */
  currency_delta?: number;
}

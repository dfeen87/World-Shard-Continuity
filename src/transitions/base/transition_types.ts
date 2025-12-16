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
  applied_assets?: string[];
  consumed_assets?: string[];
  currency_delta?: number;
  flags?: string[];
  failure_reason?: string;
}

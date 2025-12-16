export type TransitionStatus =
  | "prepared"
  | "committed"
  | "confirmed"
  | "rolled_back";

export interface ShardTransition {
  transition_id: string;
  identity_id: string;
  from_shard: string;
  to_shard: string;
  started_at: string;
  status: TransitionStatus;

  // assets that must be protected during transfer
  protected_assets: string[];

  // idempotency for retries
  change_id_prepare: string;
  change_id_commit?: string;
  change_id_confirm?: string;

  failure_reason?: string;
}

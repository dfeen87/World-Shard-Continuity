export type AssetClass = "currency" | "item" | "vehicle" | "property" | "entitlement" | "reputation" | "other";
export type AssetScope = "global" | "world_local" | "shard_local";

export interface AssetOwnershipRecord {
  schema_version: "1.0.0";
  asset_id: string;
  asset_class: AssetClass;
  asset_type?: string;
  scope: AssetScope;
  world_ref?: string;
  shard_ref?: string;

  owner: { owner_type: "player" | "system" | "world" | "guild"; owner_id: string };

  state: {
    status: "active" | "locked" | "escrow" | "consumed" | "destroyed" | "suspended";
    quantity?: number;
    durability?: number;
    attributes?: Record<string, unknown>;
  };

  lifecycle: {
    created_at: string;
    updated_at?: string;
    origin: {
      origin_type: "mint" | "reward" | "purchase" | "drop" | "grant" | "migration";
      origin_ref?: string;
      origin_world_ref?: string;
    };
  };

  transfer_policy: {
    transferable: boolean;
    transfer_scope?: "none" | "world_only" | "shard_only" | "global";
    cooldown_seconds?: number;
    requires_escrow?: boolean;
    restrictions?: Array<Record<string, unknown>>;
  };

  integrity: {
    idempotency_key: string;
    hash_alg?: "none" | "sha256" | "sha512";
    content_hash?: string;
    version?: number;
  };

  audit: {
    change_log_ref: string;
    last_change_id: string;
    last_changed_at?: string;
    last_changed_by?: string;
  };
}

export interface EscrowRecord {
  escrow_id: string;
  asset_id: string;
  owner_id: string;
  created_at: string;
  released_at?: string;
  status: "held" | "released" | "rolled_back";
}


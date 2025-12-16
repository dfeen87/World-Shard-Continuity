export type IdentityStatus = "active" | "suspended" | "banned" | "deleted";

export interface PlayerIdentity {
  schema_version: "1.0.0";
  identity_id: string;
  created_at: string;
  updated_at?: string;
  status: IdentityStatus;

  auth: {
    provider: "internal" | "oauth" | "platform" | "sso";
    issuer?: string;
    subject: string;
    mfa_enabled?: boolean;
    last_authenticated_at: string;
    session_constraints?: {
      max_concurrent_sessions?: number;
      session_ttl_seconds?: number;
    };
  };

  profile: {
    display_name: string;
    avatar_ref?: string;
    region?: string;
    locale?: string;
    privacy?: {
      visibility?: "public" | "friends" | "private";
      allow_discovery?: boolean;
      allow_cross_world_presence?: boolean;
    };
  };

  scopes: string[];
  entitlements: Array<{
    entitlement_id: string;
    type: "access" | "license" | "cosmetic" | "feature" | "subscription";
    scope?: "global" | "world" | "shard";
    target_ref?: string;
    expires_at?: string;
    granted_at: string;
    metadata?: Record<string, unknown>;
  }>;

  reputation?: {
    trust_score?: number;
    risk_flags?: string[];
    last_reviewed_at?: string;
  };

  social?: {
    friends?: string[];
    groups?: string[];
  };

  audit: {
    created_by: string;
    change_log_ref: string;
    last_change_id?: string;
    integrity?: {
      hash_alg?: "none" | "sha256" | "sha512";
      content_hash?: string;
    };
  };
}

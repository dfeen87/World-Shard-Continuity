/**
 * Placeholder contract for globally stable asset identity.
 *
 * This module intentionally contains no implementation. It documents the shape
 * and invariants a future GlobalAssetIdentityService must preserve so assets can
 * survive shard movement, world expansion, and long-term schema evolution.
 *
 * Scope guardrails:
 * - This is not a marketplace, pricing, payment, wallet, or compliance module.
 * - This does not define gameplay, balancing, rewards, or asset utility.
 * - This only describes continuity-layer identity invariants.
 */

/**
 * Stable identifier for an asset across shards and world expansions.
 *
 * Invariants:
 * - Must remain stable for the lifetime of the asset.
 * - Must not be rewritten when the asset changes shard residency.
 * - Must not encode mutable shard topology as the source of identity.
 * - Must be collision-resistant across independently operated teams and shards.
 */
export type GlobalAssetId = string;

/**
 * Version marker for the identity contract used to interpret a GlobalAssetId.
 *
 * Invariants:
 * - Must evolve additively where possible.
 * - Must allow historical asset IDs to remain interpretable after migrations.
 * - Must not require asset ID rewrites during normal world expansion.
 */
export type GlobalAssetIdentityVersion = string;

/**
 * Optional location metadata for where an asset is currently known or routed.
 *
 * Invariants:
 * - Describes residency or routing only; it does not define identity.
 * - May change as shards split, merge, retire, or expand.
 * - Must be safe to refresh without minting a new global asset identity.
 */
export interface AssetResidencyHint {
  world_ref?: string;
  shard_ref?: string;
  region_ref?: string;
}

/**
 * Continuity record describing an asset's globally stable identity.
 *
 * Invariants:
 * - global_asset_id is the durable identity anchor across shards.
 * - identity_version states how to interpret the identity contract.
 * - namespace should partition independent producers to avoid collisions.
 * - origin_ref may describe provenance, but origin must not constrain future movement.
 * - residency_hint may change without changing global_asset_id.
 */
export interface GlobalAssetIdentityRecord {
  global_asset_id: GlobalAssetId;
  identity_version: GlobalAssetIdentityVersion;
  namespace: string;
  origin_ref?: string;
  residency_hint?: AssetResidencyHint;
}

/**
 * Placeholder service boundary for future global asset identity resolution.
 *
 * Invariants for any future implementation:
 * - Creation must produce collision-resistant GlobalAssetId values.
 * - Resolution must be deterministic for a given known GlobalAssetId.
 * - Version upgrades must preserve prior identities and auditability.
 * - World expansion must add routing or residency metadata, not replace identity.
 * - Shard migration must never create duplicate identities for the same asset.
 */
export interface GlobalAssetIdentityService {
  describe(global_asset_id: GlobalAssetId): Promise<GlobalAssetIdentityRecord | undefined>;
  reserveIdentity(input: GlobalAssetIdentityReservation): Promise<GlobalAssetIdentityRecord>;
}

/**
 * Placeholder reservation request for a future identity authority.
 *
 * Invariants:
 * - idempotency_key must make retries safe.
 * - namespace must isolate independently operated producers.
 * - origin_ref should support auditability without encoding gameplay rules.
 */
export interface GlobalAssetIdentityReservation {
  namespace: string;
  idempotency_key: string;
  identity_version?: GlobalAssetIdentityVersion;
  origin_ref?: string;
  residency_hint?: AssetResidencyHint;
}

# Future Modules Roadmap

This roadmap lists possible future continuity modules without committing to implementation details. These placeholders are intentionally non-breaking, monetization-neutral, and game-logic-neutral.

Any future module should follow the continuity principles: global authority, idempotency, deterministic replay, escrow-based safety, shard-agnostic identity, and additive evolution.

## EconomicAuthorityService (Future)

Potential responsibility: define the authoritative boundary for game-only economic reconciliation records.

Placeholder notes:

- Must remain separate from pricing, payments, marketplaces, and compliance systems.
- Should route all game-only quantity changes through auditable, idempotent continuity records.
- Should not define balancing formulas, rewards, sinks, sources, or other game-specific economic rules.

## ShardRoutingService (Future)

Potential responsibility: resolve shard location and routing metadata for globally scoped continuity records.

Placeholder notes:

- Should not redefine global identity; it should only describe where records are currently served or resident.
- Should support shard splits, merges, failover, archival, and world expansion.
- Should make stale routing data detectable and recoverable.

## WorldExpansionOrchestrator (Future)

Potential responsibility: coordinate continuity-safe expansion from existing worlds into new worlds or shards.

Placeholder notes:

- Should preserve identity, ownership, and audit history through additive expansion.
- Should use deterministic, idempotent orchestration records for long-running operations.
- Should avoid embedding game-specific launch, quest, monetization, or progression logic.

## AssetMigrationService (Future)

Potential responsibility: coordinate safe movement of asset records between authorities, storage regions, or shard residency models.

Placeholder notes:

- Should prefer escrow or equivalent hold states for reversible multi-step movement.
- Should preserve stable asset IDs, schema versions, and audit trails.
- Should make migration retries safe and collision-resistant at high scale.

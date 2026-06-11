# Continuity Layer Principles

This document is the north star for contributors working on the continuity layer. It defines the architectural constraints that keep identity, assets, transitions, and reconciliation durable across very large worlds and long-running products.

The continuity layer is intentionally engine-agnostic, game-agnostic, and monetization-neutral. It provides contracts and safety boundaries for persistence and movement; it does not define gameplay, pricing, markets, or real-money systems.

## 1. Global Authority

Continuity decisions must have a single authoritative path for each record type.

- Identity, ownership, transition, and reconciliation state should be written through explicit authority boundaries.
- Shards may cache, mirror, or request state, but they should not silently become the source of truth for globally scoped records.
- Authority should be documented so future teams can reason about ownership, failure recovery, and audit trails.
- When authority changes during migrations or world expansion, the handoff must be explicit, idempotent, and replayable.

## 2. Idempotency

Every cross-shard or long-running continuity operation should be safe to retry.

- Requests that mutate continuity state should carry stable idempotency keys or change identifiers.
- Replayed requests should converge on the same final state instead of duplicating assets, transitions, or ledger effects.
- Retry safety is required for network partitions, service restarts, multi-region failover, and operational replays.
- Contributors should design new contracts so duplicate delivery is expected, not exceptional.

## 3. Deterministic Replay

Continuity records should support deterministic reconstruction of state.

- Events, transitions, and reconciliation records should contain enough context to explain how state changed.
- Ordering, timestamps, versions, and change identifiers should be explicit where they affect reconstruction.
- Replay should not depend on volatile shard-local code, random behavior, or undocumented side effects.
- Long-term evolution should preserve historical interpretability even after schemas or worlds expand.

## 4. Escrow-Based Safety

Unsafe movement should be guarded by escrow-like intermediate states.

- Assets or identities crossing authority boundaries should avoid direct destructive updates when a reversible hold is safer.
- Escrow states should make partial failure recoverable without duplication or loss.
- Release and rollback paths should be explicit, auditable, and idempotent.
- Escrow is a continuity safety pattern only; it is not a payment, marketplace, settlement, or compliance feature.

## 5. Shard-Agnostic Asset Identity

Globally relevant assets must retain stable identity independent of their current shard.

- Asset identifiers should not encode assumptions that make an asset belong permanently to one shard.
- Shard metadata may describe current location, routing, or residency, but it should not redefine the asset's identity.
- Asset identity must survive migrations, shard splits, shard merges, archival, and future world expansion.
- Collision avoidance should be part of the identity contract so teams can operate independently at high scale.

## 6. Non-Monetization Scope

This project must remain monetization-neutral.

The continuity layer must not introduce:

- real-money balances or wallets;
- pricing, exchange rates, or valuation rules;
- payment rails, checkout flows, or settlement systems;
- marketplaces, auctions, trading venues, or order books;
- tax, sanctions, KYC, AML, chargeback, or other compliance logic.

Game-only quantities and ownership records may be represented for continuity and reconciliation, but they must not be modeled as real-money instruments.

## 7. Future-Proofing Guidelines

Design for very large worlds, long timelines, and independent teams.

- Prefer additive schema evolution over destructive replacement.
- Document invariants beside interfaces so downstream teams understand what must remain true.
- Keep contracts engine-neutral, vendor-neutral, and game-logic-neutral.
- Separate global identity from shard routing, presentation, balancing, and gameplay rules.
- Preserve auditability for migrations, expansions, and operational repair.
- Avoid coupling continuity contracts to any single launch topology; assume worlds will split, merge, retire, and expand.
- Keep placeholder modules implementation-free until a concrete contract is needed and reviewed.

## Contributor Reminder

When in doubt, choose the design that preserves stable identity, deterministic recovery, idempotent retries, and clear authority boundaries without introducing monetization or game-specific behavior.

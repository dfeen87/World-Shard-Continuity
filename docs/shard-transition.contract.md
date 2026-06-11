# Shard Transition Contract

This contract defines the required guarantees and constraints for transitioning a player between distributed game worlds or server shards.

Any system implementing shard transitions must satisfy the conditions outlined below to ensure continuity, security, and player trust.

## Contract Scope

This contract governs:

* Player-initiated shard transitions
* System-initiated shard transitions
* Cross-world and cross-region handoffs
* Temporary or permanent shard migration

This contract does not prescribe engine, network, or storage implementations.

## Required Guarantees

### 1. Identity Preservation

* The player's global identity must remain unchanged throughout the transition.
* Authentication context must be verified prior to state transfer.
* Social identifiers and reputation must persist across shards.

### 2. State Integrity

* Player state must be serialized atomically prior to transition.
* Partial or corrupted state must never be applied on the destination shard.
* Transition operations must be idempotent to prevent duplication.

### 3. Asset Safety

* Player-owned assets must not be duplicated, lost, or modified during transition.
* Asset eligibility for transfer must be validated before serialization.
* Non-transferable assets must be explicitly excluded and documented.

### 4. Transactional Transfer

* Shard transitions must follow transactional semantics:
  * Prepare
  * Commit
  * Confirm
* Failure at any stage must trigger rollback to a known-safe state.

### 5. Failure Recovery

* The system must provide a deterministic recovery path in the event of failure.
* Players must never be stranded in an undefined or inaccessible state.
* Recovery actions must be auditable.

### 6. Security and Exploit Resistance

* Transition boundaries must not expose intermediate state to the client.
* Client-side authority must be strictly limited during transitions.
* Transition logic must assume adversarial conditions.

### 7. Player Experience Guarantees

* Transitions must be initiated through explicit player action or clearly communicated system events.
* Player control must only be restored after destination shard readiness is confirmed.
* Visual or narrative framing must mask technical latency where possible.

### 8. Observability and Auditing

* All transitions must be logged with:
  * Source shard
  * Destination shard
  * Timestamp
  * Outcome
* Logs must support replay and forensic analysis.


## Transition FSM Invariants

The continuity FSM has exactly four lifecycle states and this document adds no new states:

* `prepared` means source authority has reserved the transition and protected assets are held.
* `committed` means destination authority has accepted the handoff, but rollback remains possible.
* `confirmed` means the destination is authoritative and the transition is irreversible.
* `rolled_back` means source authority is restored and protected assets are released.

Required invariants:

* A transition must never skip directly from `prepared` to `confirmed`.
* A `confirmed` transition must never be rolled back.
* A `rolled_back` transition must not be recommitted; a new attempt needs a new transition and change IDs.
* Protected assets must be reserved before a transition record is exposed as prepared.
* Escrow release must be safe to retry because confirm and rollback calls can be replayed after timeouts.
* Audit records must be emitted for every successful lifecycle mutation.

## Idempotency Boundaries

The continuity layer uses two separate idempotency scopes:

* Request idempotency binds a client-stable request ID to a transition ID before controller execution.
* FSM idempotency binds a mutation change ID to prepare, commit, confirm, or rollback.

These boundaries must not be merged. Request IDs prevent duplicate transition creation, while change IDs prevent duplicate lifecycle mutations. Game-only economic reconciliation must provide its own idempotent change IDs and must not rely on deprecated scalar currency metadata.

## Concurrency and Failure Modes

Concurrent workers may observe retries, duplicate submits, partial writes, delayed audit sinks, and regional failover. Implementations must treat the transition store as the authority for lifecycle status and must make lifecycle updates atomic. Optimistic concurrency is appropriate for single-transition status updates when version checks are available. Pessimistic locking or equivalent escrow authority is required for protected assets and identities that cannot be transferred concurrently.

Expected failure modes include:

* Prepare succeeds but the caller times out: retry prepare with the same change ID.
* Destination accepts arrival but commit times out: retry commit with the same change ID.
* Confirmation applies but audit is delayed: do not roll back; retry audit or rebuild from transition state.
* Regional rollback storm: batch operational work by shard or region, but preserve per-transition idempotency and audit order.
* Store conflict on stale version: reload authoritative state and retry only when the desired lifecycle transition is still valid.

## Distributed Deployment Considerations

Large deployments should keep routing, matchmaking, placement, cache invalidation, and shard admission control outside the FSM. The FSM should receive explicit source and destination shard IDs and deterministic change IDs. Shard metadata registries may be cached for reads, but lifecycle transitions such as active-to-draining-to-retired require authoritative writes and should be guarded by distributed locks or compare-and-swap semantics in production.

## Monetization and Real-Money Guardrails

Shard transition continuity is not a payment system, wallet, marketplace, real-money ledger, or compliance-ready financial system. Transition records may protect game-only assets during handoff, but they must never encode external value, real-money settlement, monetization policy, marketplace exchange, or payment authorization.

## Optional Enhancements

The following are recommended but not mandatory:

* Pre-transition eligibility checks
* Destination shard pre-warming
* Graceful degradation under load
* Cross-shard transition metrics

## Explicit Non-Guarantees

This contract does not guarantee:

* Real-time synchronization between shards
* Identical world state across environments
* Preservation of world-local narrative or events

These behaviors must be defined by higher-level systems.

## Summary

The Shard Transition Contract establishes a strict boundary between worlds while ensuring player continuity and systemic integrity. Adhering to this contract prevents exploit vectors, reduces operational risk, and preserves player trust in long-lived, distributed game platforms.

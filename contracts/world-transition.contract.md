# World Transition Contract

**Contract ID:** `world-transition.v1`  
**Status:** Stable  
**Applies To:** All cross-world, cross-shard, and cross-authority transitions

## Purpose

This contract defines the authoritative rules and guarantees governing transitions that move a player, identity, or asset between distinct worlds.

A world is defined as a boundary where:

* authority changes,
* persistence domains differ,
* failure modes are non-local,
* and rollback may not be trivial.

This contract ensures that world transitions remain safe, deterministic, auditable, and idempotent.

## Scope

This contract applies to:

* World-to-world travel (e.g. city → city)
* World sunsetting and migration
* Cross-world matchmaking
* World-level shard reassignment
* Any transition where both sides cannot be assumed to share state

This contract does not define:

* UI flows
* networking protocols
* engine-specific logic

## Definitions

### World

An authoritative execution domain with its own persistence, economy authority, and failure boundaries.

### Source World

The world currently authoritative over the identity and assets.

### Destination World

The world requesting authority after transition confirmation.

### Transition Authority

The continuity layer coordinating escrow, idempotency, and lifecycle enforcement.

## Lifecycle Overview

All world transitions MUST follow the same lifecycle:

```
PREPARED → COMMITTED → CONFIRMED | ROLLED_BACK
```

No step may be skipped.

## Required Guarantees

### 1. Identity Continuity

* Identity IDs MUST remain globally stable across worlds
* Authentication context MAY change
* Authorization scopes MUST be re-evaluated on entry
* Identity MUST never exist in two authoritative worlds simultaneously

### 2. Asset Safety

* All transferable assets MUST be escrowed before authority transfer
* Escrow MUST be authoritative and reversible until confirmation
* Assets MUST NOT duplicate across worlds
* Asset release MUST occur only after confirmation

### 3. Economic Integrity

* All currency, items, and entitlements MUST obey transfer policy
* World-local economies MUST NOT mutate global assets directly
* Settlement MUST be atomic with respect to confirmation

### 4. Idempotency

World transitions MUST be idempotent at three levels:

| Layer | Requirement |
|-------|-------------|
| Request | Same `request_id` MUST map to same `transition_id` |
| Mutation | Same `change_id` MUST NOT duplicate state |
| Economy | Escrow MUST prevent duplication under retries |

Retries are expected and must be safe.

### 5. Authority Exclusivity

At any moment:

* Exactly one world may be authoritative over an identity
* Escrowed assets are owned by the transition authority
* Destination worlds MUST NOT assume authority before confirmation

## Failure Handling

### Allowed Failures

* Network interruption
* Client retry
* Destination refusal
* Timeout during transit
* World shutdown events

### Required Responses

* Prepared transitions MAY be rolled back
* Committed transitions MUST either confirm or roll back
* Confirmed transitions MUST NOT roll back

Silent failure is not permitted.

## Audit & Observability

Each world transition MUST produce:

* A transition record
* An audit event for each lifecycle stage
* A traceable identity → world authority change

Audit data MUST survive crashes and retries.

## Security Considerations

World boundaries are trust boundaries.

Destination worlds MUST validate:

* identity
* asset manifests
* authorization scopes

No world may mint or destroy assets outside policy.

## Contract Compliance

A system is compliant with this contract if:

* All world transitions use an explicit lifecycle
* Asset movement is escrow-backed
* Idempotency is enforced
* Authority is exclusive
* Failures are observable and recoverable

## Non-Goals

This contract intentionally does NOT define:

* Client UX
* Transport mechanisms
* Engine bindings
* Monetization rules
* Gameplay balance

## Versioning

This contract is versioned independently.

Changes that weaken guarantees require a major version increment.  
Extensions that preserve guarantees may be additive.

## Final Note

World transitions are the highest-risk operations in long-lived online systems.

This contract exists to ensure that they are also the most disciplined.

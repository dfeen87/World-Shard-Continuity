# Economy Continuity

This document defines the architectural principles required to maintain a stable, persistent economy across multiple game worlds and server shards.

Economic continuity ensures that player effort, asset value, and systemic balance are preserved as worlds expand, migrate, or interconnect.

## Definition of a Cross-World Economy

A cross-world economy is a system in which value-bearing assets, currencies, and entitlements persist beyond a single world or shard.

Economic state must be:

* Durable across transitions
* Resistant to duplication and inflation
* Governed independently of world-specific logic

## Economy as a Platform System

The economy is a platform-level system, not a world feature.

### Worlds may

* Reference balances
* Price goods
* Apply local modifiers

### Worlds must not

* Define global value
* Mint or destroy assets without authorization
* Override ownership or supply constraints

## Asset Classes and Scope

Economies must distinguish between asset scopes:

### Global Assets

* Persist across all worlds
* Require strong consistency guarantees
* High impact on platform stability

### World-Local Assets

* Scoped to a specific world or shard
* May reset, expire, or transform
* Must be clearly delineated

Blurring asset scope creates inflation risk and player distrust.

## Supply Control and Inflation Management

Economic continuity depends on controlled supply.

### Requirements

* Explicit mint and burn rules
* Auditable asset lifecycle
* Deterministic transfer constraints

Supply control must be enforced at the platform layer.

## Cross-World Asset Transfer

When assets move between worlds:

* Ownership must remain consistent
* Value must not be duplicated
* Transfer rules must be deterministic

Transfer eligibility must be validated prior to transition.

## Transactional Integrity

All economic mutations must be transactional.

### Properties

* Atomic
* Consistent
* Idempotent
* Auditable

Partial or speculative mutations must not be visible to players.

## World-Specific Economic Modifiers

Worlds may apply localized modifiers, such as:

* Pricing differences
* Availability constraints
* Temporary bonuses or penalties

Modifiers must not alter global asset truth.

## Failure and Recovery

Economic systems must degrade safely.

### Requirements

* Rollback on failure
* No silent asset loss or duplication
* Deterministic recovery paths

Economic correctness takes precedence over availability.

## Player Trust and Perceived Fairness

Continuity systems must prioritize player trust.

### Guidelines

* Predictable rules
* Transparent boundaries
* Consistent outcomes across worlds

Perceived unfairness erodes long-term engagement.

## Observability and Auditability

Economic activity must be observable.

### Minimum logging

* Asset creation
* Transfer
* Modification
* Destruction

Logs must support forensic analysis and dispute resolution.

## Explicit Non-Goals

This document does not define:

* Monetization strategies
* Real-money exchange mechanisms
* Pricing models or balancing formulas

Those concerns belong to game-specific design layers.

## Summary

Economy continuity transforms isolated worlds into a coherent platform by preserving value across time and space. By treating the economy as a platform system—separate from world logic—developers can expand, interconnect, and evolve worlds without destabilizing player trust or systemic balance.

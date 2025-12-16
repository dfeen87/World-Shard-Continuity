# Economy Persistence Contract

This contract defines the guarantees, constraints, and authority boundaries required to maintain a persistent, stable economy across multiple game worlds and server shards.

Any system that creates, modifies, transfers, or destroys economic value must adhere to this contract.

## Contract Scope

This contract governs:

* Asset and currency persistence
* Economic mutations and settlement
* Cross-world and cross-shard value transfer
* Economic recovery and auditing

This contract does not define monetization models, pricing formulas, or balancing logic.

## Authoritative Control

* Economic state must be globally authoritative.
* No individual world or shard may act as the source of truth for global value.
* Authority over minting, burning, and settlement must be centralized or cryptographically verifiable.

Worlds consume economic state; they do not define it.

## Asset and Currency Identity

* All economic assets must have globally unique identifiers.
* Asset identity must be immutable once created.
* Asset class and scope must be explicitly defined at creation time.

Undefined or ambiguous assets are invalid.

## Minting and Destruction Rules

* Asset minting must be explicitly authorized.
* Asset destruction must be intentional and auditable.
* Implicit creation or loss of value must not occur.

All supply changes must be deterministic and logged.

## Transactional Guarantees

All economic mutations must be transactional.

### Required properties

* Atomicity
* Consistency
* Idempotency
* Durability

Partial or speculative transactions must not be visible to players.

## Cross-World Transfers

During asset transfer between worlds or shards:

* Ownership must not change unintentionally
* Value must not be duplicated
* Transfers must be reversible on failure

Eligibility for transfer must be validated before execution.

## World-Local Modifiers

Worlds may apply local modifiers affecting:

* Pricing
* Availability
* Access rules

Modifiers must not mutate global asset truth or supply.

## Failure Handling and Recovery

Economic systems must fail safely.

### Requirements

* Deterministic rollback paths
* No silent loss or duplication of assets
* Recovery must prioritize correctness over availability

Economic state must remain valid under partial outages.

## Security and Exploit Resistance

* Clients must not mutate economic state directly.
* Economic operations must assume adversarial conditions.
* Privileged actions must be authenticated and authorized.

Security failures must fail closed.

## Observability and Auditing

All economic events must be logged, including:

* Asset creation
* Transfers
* Modifications
* Destruction
* Recovery actions

Logs must support replay, forensic analysis, and dispute resolution.

## Explicit Non-Guarantees

This contract does not guarantee:

* Economic balance or fairness
* Price stability across worlds
* Real-world value equivalence

These outcomes depend on game-specific design.

## Summary

The Economy Persistence Contract establishes economic value as a durable, authoritative system independent of world logic. Adherence to this contract enables long-lived, interconnected game worlds without sacrificing stability, security, or player trust.

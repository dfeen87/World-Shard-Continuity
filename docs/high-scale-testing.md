# High-Scale Testing Strategy

This strategy describes how to validate the continuity layer at very large scale without adding game-specific behavior, monetization, real-money logic, routing, matchmaking, or marketplace features.

## Scope and Guardrails

The continuity layer must remain:

* Not a payment system.
* Not a wallet.
* Not a marketplace.
* Not a real-money ledger.
* Not a compliance-ready financial system.

High-scale tests should exercise continuity contracts only: identity preservation, transition idempotency, asset safety, shard lifecycle metadata, rollback behavior, auditability, and deterministic recovery.

## 10k Concurrent Transitions

Test objective: prove that many actors can begin, commit, confirm, and roll back transitions without duplicate records, stranded authority, or inconsistent lifecycle states.

Recommended approach:

* Generate 10,000 unique identities, transition requests, request IDs, and FSM change IDs.
* Spread source and destination shard IDs across multiple regions and shard versions.
* Run begin/commit/confirm flows with randomized retry, timeout, and duplicate-submit patterns.
* Assert exactly one authoritative transition outcome per request ID.
* Assert prepared and committed records either complete or roll back through a deterministic cleanup pass.
* Measure transition-store conflict rates, idempotent replay rates, audit write latency, and tail latency.

## 100k Asset Mutations

Test objective: prove that high-volume game-only asset mutations remain atomic, idempotent, and ledger-reconciled without duplication or loss.

Recommended approach:

* Seed 100,000 asset records with stable asset IDs and owner identity IDs.
* Apply typed `EconomicEvent` mutations only after confirmed transitions.
* Reuse selected change IDs to simulate retries and verify idempotent ledger behavior.
* Introduce conflicting same-asset updates to verify that production stores use pessimistic authority or atomic compare-and-swap where required.
* Assert aggregate asset quantity, ownership, version, and audit metadata after the run.

## Shard Failover

Test objective: prove that regional or shard failures do not create undefined authority or unresolvable asset identity.

Recommended approach:

* Mark source and destination shards as `active`, `draining`, and `retired` through a metadata-registry test double.
* Simulate failure before prepare, after prepare, after commit, and during confirmation.
* Verify that draining shards reject new admissions at the orchestration layer while existing prepared/committed transitions can finish or roll back.
* Verify that retired shard metadata remains readable for audit and historical asset references.

## Transition Rollback Storms

Test objective: prove that mass rollback preserves state integrity and audit ordering under operational stress.

Recommended approach:

* Create large batches of prepared and committed transitions across many shards.
* Trigger rollback for an entire region and replay rollback requests with duplicate change IDs.
* Assert confirmed transitions are never rolled back.
* Assert escrow release remains idempotent and no protected asset remains locked indefinitely.
* Measure queue depth, audit throughput, and recovery time objective by shard and region.

## Idempotency Under Load

Test objective: prove that client request idempotency and FSM change-id idempotency remain distinct and correct under retries.

Recommended approach:

* Reuse request IDs for begin retries and assert they bind to the same transition ID.
* Reuse FSM change IDs for commit, confirm, and rollback retries and assert they return the existing transition.
* Attempt to reuse a change ID for a different transition and assert a conflict.
* Expire request-idempotency entries and verify that the underlying transition state is still authoritative.
* Run the same scenarios through in-memory and production-adapter test doubles.

## Distributed Deployment Considerations

Large deployments should test with multiple regional workers, clock skew, delayed audit sinks, store failover, and partial network partitions. The expected result is not perfect availability; it is deterministic continuity recovery without asset duplication, asset loss, or ambiguous shard authority.

Caching, batching, and locking should be tested as deployment concerns around the interfaces. They must not change the public continuity contracts or introduce real-money semantics.

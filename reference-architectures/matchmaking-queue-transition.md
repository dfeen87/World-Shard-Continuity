# Matchmaking Queue Transition

A reference architecture for transitioning players from a queueing state into a temporary match instance and back into the persistent world with deterministic reintegration.

This pattern is optimized for high-frequency, high-concurrency flows such as PvP matches, co-op sessions, raids, battlegrounds, and competitive modes.

## 1. Pattern Summary

### Player Experience

1. Player enters a matchmaking queue.
2. Queue shows estimated wait time and status.
3. Match is found.
4. Player accepts (or auto-accepts).
5. Brief loading or ready-up phase.
6. Player enters match instance.
7. Match concludes.
8. Player returns to the persistent world with results applied.

### System Reality

1. Queue is non-authoritative and stateless
2. Match instance is authoritative but temporary
3. Persistent world regains authority after reintegration
4. Only validated outcomes mutate identity or economy

## 2. Goals and Non-Goals

### Goals

* Scale to large player populations
* Avoid ghost entries and duplicate match joins
* Ensure deterministic reintegration
* Prevent economy exploits via match outcomes
* Support retries, disconnects, and timeouts

### Non-Goals

* Guarantee instant matchmaking
* Preserve in-match state across different matches
* Allow direct player control over settlement logic
* Cross-match continuity

## 3. Key Insight: Queue ≠ World

The matchmaking queue is not a world and must never be treated as one.

| Component | Authority |
|-----------|-----------|
| Queue | None (coordination only) |
| Match Instance | Temporary, scoped authority |
| Persistent World | Global authority |

Queues coordinate intent — they do not own state.

## 4. Roles and Services

### Client / Runtime

* Displays queue UI
* Handles accept / decline
* Manages ready-up and loading
* Reconnects on match or reintegration

### Matchmaking Service

* Groups compatible players
* Issues match offers
* Handles accept / timeout logic
* Does not mutate identity or economy

### Match Instance Shard

* Owns simulation for duration of match
* Applies match rules
* Produces an outcome summary

### Persistent World Shard

* Owns player before and after match
* Applies validated outcomes
* Restores world context

### Platform Services

* **Identity Authority**
* **Economy Authority**
* **Transition Orchestrator**
* **Audit Sink**

## 5. Queue Lifecycle

Queues follow a non-authoritative lifecycle:

1. Enqueued
2. Matched
3. Offered
4. Accepted / Timed Out
5. Released

At no point does the queue become authoritative.

## 6. Transition States

The matchmaking pattern uses a Dual-Authority Handoff:

* **Prepare** — Lock queue slot, validate eligibility, snapshot minimal state
* **Enter Match** — Assign match instance, transfer control
* **Resolve** — Match simulation completes, outcome summary produced
* **Reintegrate** — Apply outcomes, restore persistent world authority

Rollback is permitted until reintegration.

## 7. Sequence Flow

### 7.1 Happy Path

```
Player -> Client: Join queue
Client -> Matchmaker: Enqueue(identity_id)

Matchmaker -> Client: Match found
Client -> Matchmaker: Accept

Matchmaker -> Orchestrator: CreateMatchTransition(identity_id, match_id)

Orchestrator -> IdentityAuthority: Validate eligibility
Orchestrator -> EconomyAuthority: Prepare escrow (if needed)
Orchestrator -> WorldShard: Snapshot state
Orchestrator: Transition PREPARED

Client -> MatchInstance: Connect
Orchestrator: Transition ENTERED

MatchInstance: Run match
MatchInstance -> Orchestrator: OutcomeSummary

Orchestrator -> EconomyAuthority: Apply deltas
Orchestrator -> EconomyAuthority: Release escrow
Orchestrator: Transition CONFIRMED

Client -> WorldShard: Reconnect
Client: Spawn at reintegration anchor
```

## 8. Match Outcome Model

Match instances must produce a bounded outcome summary, never raw state.

Example:

```json
{
  "match_id": "mid_456",
  "identity_id": "pid_...",
  "result": "win",
  "rating_delta": +24,
  "granted_assets": ["aid_reward_001"],
  "consumed_assets": [],
  "currency_delta": 100,
  "flags": ["clean_match"]
}
```

Outcome summaries must be:

* deterministic
* validated against rules
* idempotent
* auditable

## 9. Asset and Economy Rules

### 9.1 Allowed in Match

* Temporary loadouts
* Consumable usage
* Match-specific rewards (pending approval)

### 9.2 Forbidden in Match

* Direct asset minting
* Trading between players
* Market access
* Permanent upgrades

All permanent changes occur after match confirmation.

## 10. Failure Modes and Recovery

### 10.1 Queue Abandonment

**Issue:**

* Player disconnects while queued

**Recovery:**

* Remove from queue
* No state change

### 10.2 Match Offer Timeout

**Issue:**

* Player does not accept

**Recovery:**

* Release queue slot
* Return player to world
* No penalties (unless policy-defined)

### 10.3 Failure During Match

**Examples:**

* Instance crash
* Player disconnect
* Network partition

**Recovery Options:**

* Rejoin match
* Forfeit
* Draw/no-contest
* Abort match (no settlement)

Outcome must be deterministic.

### 10.4 Failure During Reintegration

**Examples:**

* Economy authority unavailable
* Outcome validation fails

**Recovery:**

* Hold player in reintegration buffer
* Retry settlement
* Do not release escrow prematurely

## 11. Security Considerations

* Clients cannot self-report match outcomes
* Match instances must not settle economy
* Replay protection required for outcome submission
* Duplicate submissions must be idempotent
* Rating and reward logic must be server-owned

## 12. Observability and Telemetry

### Events

* `queue.entered`
* `match.offered`
* `match.accepted`
* `match.started`
* `match.completed`
* `match.aborted`
* `match.reintegrated`

### Metrics

* queue wait times
* acceptance rate
* match completion rate
* reintegration latency
* outcome rejection rate

## 13. Design Notes

### 13.1 Queues as Intent Buffers

Queues represent intent, not commitment.

Never mutate permanent state until a match is confirmed.

### 13.2 Acceptance Windows Matter

Explicit accept phases reduce:

* AFK joins
* wasted instance capacity
* unfair match starts

## 14. Acceptance Tests

* Player queues and matches successfully
* Player declines match → returns to world cleanly
* Player disconnects mid-match → rejoin or forfeit
* Match completes → outcome applied exactly once
* Duplicate outcome submission → no duplication
* Failed settlement → escrow not released
* Player reintegrates correctly

## 15. Optional Extensions

* Ranked vs unranked queues
* Party-based matchmaking
* Cross-world matchmaking pools
* Spectator slots
* Backfill on disconnect

## Summary

The Matchmaking Queue Transition pattern safely bridges stateless coordination with authoritative gameplay. By keeping queues non-authoritative, matches scoped, and settlement centralized, platforms can scale competitive and cooperative play without compromising continuity, fairness, or economic integrity.

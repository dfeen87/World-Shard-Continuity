# Instance Gate Transition

A reference architecture for controlled transitions between persistent worlds and temporary or scoped instances using an in-world gate, portal, elevator, or doorway.

This pattern is optimized for short-lived instances (dungeons, matches, interiors, missions) that must integrate cleanly with global identity, assets, and economy while maintaining strict authority boundaries.

## 1. Pattern Summary

### Player Experience

1. Player approaches a gate (portal, door, elevator, matchmaking terminal).
2. Gate indicates eligibility and readiness.
3. Player activates the gate.
4. Brief transition animation or fade.
5. Player enters an isolated instance.
6. On completion or exit, player returns to the parent world at a deterministic location.

### System Reality

1. Validate identity and eligibility
2. Snapshot minimal persistent state
3. Apply scoped asset and rule changes
4. Create or assign an instance shard
5. Enforce instance authority
6. Reconcile outcomes on exit
7. Restore persistent world authority

## 2. Goals and Non-Goals

### Goals

* Fast, low-latency transitions
* Strict isolation between instance and persistent world
* Deterministic reintegration of player state
* No economic duplication or leakage
* Safe concurrent instance participation

### Non-Goals

* Cross-instance persistence
* Instance-to-instance transfers
* Long-lived shard migration
* Global economy settlement inside instances

## 3. Common Use Cases

* Dungeons / raids
* PvP matches
* Story missions
* Interiors (buildings, ships)
* Private party instances
* Tutorial or onboarding flows

## 4. Roles and Services

### Client / Runtime

* Renders gate UX
* Shows eligibility feedback
* Applies brief transition effects
* Maintains session continuity

### Parent World Shard

* Owns authoritative persistent state
* Initiates instance transition
* Receives reintegration results

### Instance Shard

* Owns simulation inside the instance
* Applies instance-specific rules
* Produces a bounded outcome summary

### Platform Services

* **Identity Authority** (read-only)
* **Economy Authority** (escrow + reconciliation)
* **Transition Orchestrator** (scoped FSM)
* **Audit Sink**

## 5. Instance Characteristics

Instances are scoped by design:

| Property | Rule |
|----------|------|
| Lifetime | Finite |
| Authority | Instance-only |
| Visibility | Fully isolated |
| Economy | Restricted |
| Assets | Scoped subset |
| Persistence | None (except outcomes) |

## 6. State Boundary Definition

### Persistent State (Outside Instance)

* Identity
* Global assets
* Currency balances
* Reputation
* World position (entry/exit anchors)

### Instance-Scoped State

* Health / stamina
* Temporary buffs/debuffs
* Consumable usage
* Local inventory deltas
* Match scores / loot rolls

Instance state must not mutate global state directly.

## 7. Transition States

The Instance Gate implements a Scoped Handoff Pattern:

* **Prepare** — Validate eligibility, snapshot minimal persistent state, escrow relevant assets if required
* **Enter** — Assign or create instance shard, transfer control to instance authority
* **Resolve** — Produce outcome summary
* **Reintegrate** — Apply approved deltas, release escrow, restore parent world authority

Rollback is permitted until reintegration completes.

## 8. Sequence Flow

### 8.1 Happy Path

```
Player -> Client: Activate gate
Client -> Orchestrator: RequestInstanceTransition(identity_id, gate_id)

Orchestrator -> IdentityAuthority: Validate scopes
Orchestrator -> EconomyAuthority: Prepare scoped escrow (if needed)
Orchestrator -> ParentShard: Snapshot minimal state
Orchestrator: Instance PREPARED

Orchestrator -> InstanceShard: Create/Assign instance
Client -> InstanceShard: Connect
Orchestrator: Instance ENTERED

InstanceShard: Run simulation
InstanceShard -> Orchestrator: OutcomeSummary

Orchestrator -> EconomyAuthority: Apply approved deltas
Orchestrator -> EconomyAuthority: Release escrow
Orchestrator: Instance REINTEGRATED

Client -> ParentShard: Reconnect
Client: Spawn at exit anchor
```

## 9. Asset and Economy Rules

### 9.1 Allowed Inside Instance

* Consumables
* Temporary equipment state
* Instance-specific loot tables
* Match rewards (pending approval)

### 9.2 Forbidden Inside Instance

* Minting global currency directly
* Permanent asset creation
* Cross-player asset transfer
* External market access

### 9.3 Outcome-Based Settlement

Only the Outcome Summary may mutate global economy:

```json
{
  "instance_id": "iid_123",
  "identity_id": "pid_...",
  "granted_assets": ["aid_..."],
  "consumed_assets": ["aid_..."],
  "currency_delta": 250,
  "flags": ["victory", "clean_run"]
}
```

Outcome application must be:

* validated
* atomic
* auditable
* idempotent

## 10. Failure Modes and Recovery

### 10.1 Failure Before Enter

**Examples:**

* Instance creation fails
* Eligibility revoked

**Recovery:**

* Cancel transition
* No state changes
* Return control immediately

### 10.2 Failure During Instance

**Examples:**

* Instance shard crash
* Client disconnect
* Network partition

**Recovery Options:**

* Rejoin instance (preferred)
* Resume from checkpoint
* Abort instance and roll back to entry state

Outcome must be deterministic.

### 10.3 Failure During Reintegration

**Examples:**

* Economy authority unavailable
* Outcome validation fails

**Recovery:**

* Hold player in reintegration buffer
* Retry settlement
* Do not release escrow until confirmed

## 11. Security Considerations

* Instance shards must assume adversarial clients
* Clients must not submit their own outcome summaries
* Parent world must not trust instance blindly
* Outcome summaries must be verified against ruleset
* Replay protection is mandatory

## 12. Observability and Telemetry

### Minimum events

* `instance.prepared`
* `instance.entered`
* `instance.completed`
* `instance.aborted`
* `instance.reintegrated`
* `instance.rollback`

### Metrics

* average instance duration
* abort rate
* reintegration latency
* outcome rejection rate
* duplicate submission attempts

## 13. Design Notes

### 13.1 Gates as Cognitive Boundaries

Players intuitively understand that:

* rules change past the gate
* outcomes are evaluated on exit
* failure may eject them

Use this expectation to enforce strict boundaries.

### 13.2 Deterministic Exit Anchors

Always define:

* exit location
* fallback exit
* timeout behavior

Never strand players.

## 14. Acceptance Tests

* Enter instance with valid eligibility
* Consume items inside instance
* Complete instance successfully
* Verify only approved deltas apply
* Re-enter world at correct anchor
* Abort instance mid-run → no dupes
* Re-run same instance request → idempotent behavior

## 15. Optional Extensions

* Party-based instance entry
* Difficulty scaling by identity attributes
* Spectator instances
* Instance chaining
* Soft persistence via checkpoints

## Summary

The Instance Gate Transition pattern enables high-frequency, low-latency instancing without compromising identity continuity or economic integrity. By isolating authority inside the instance and reconciling only validated outcomes, platforms can scale gameplay variety while preserving long-term trust and stability.

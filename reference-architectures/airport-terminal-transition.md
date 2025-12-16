# Airport Terminal Transition

A reference architecture for diegetic, seamless transitions between worlds/shards using an airport terminal mechanic. The terminal provides an in-world justification for staging handoff, escrow, and identity continuity while masking latency and enforcing integrity.

This pattern is designed for long-lived game platforms that expand via modular worlds rather than full resets.

## 1. Pattern Summary

### Player Experience (What the player sees)

1. Player enters terminal.
2. Selects destination (world/city/shard).
3. Buys a "ticket" (permission + transition intent).
4. Boarding sequence begins (controlled movement, cinematic, or guided corridor).
5. "Flight" occurs (hidden load / server transfer / world stream).
6. Player arrives at destination terminal with identity, assets, and continuity preserved.

### System Reality (What the platform does)

1. Validates identity and eligibility
2. Escrows transferable assets
3. Serializes player state
4. Executes a staged shard handoff (prepare → commit → confirm)
5. Releases escrow only on confirmed arrival
6. Rolls back deterministically on failure

## 2. Goals and Non-Goals

### Goals

* Seamless-feeling cross-world travel with strong correctness guarantees
* Preserve global identity and eligible assets
* Prevent duplication, loss, and partial state application
* Provide deterministic rollback and audit trails
* Maintain economic integrity across world boundaries

### Non-Goals

* Real-time synchronization of world-local state across worlds
* Forcing a single economy model or monetization approach
* Prescribing specific engine streaming or networking methods

## 3. Roles and Services

### Client / Game Runtime

* Renders terminal UX and boarding sequence
* Requests a transition intent
* Displays progress and failure recovery messaging
* Remains non-authoritative for identity/assets/economy mutations

### World Shard (Source)

* Hosts current simulation
* Produces authoritative player snapshot for transfer
* Enforces soft-lock during boarding

### World Shard (Destination)

* Accepts player arrival intent
* Pre-warms/allocates spawn context
* Hydrates player snapshot
* Confirms readiness before control is returned

### Platform Services (Engine-agnostic)

* **Identity Authority**: authoritative identity reads
* **Economy/Ledger Authority**: asset ownership + balances
* **Transition Orchestrator**: staged handoff state machine
* **Audit Sink**: logs for forensic replay and dispute resolution

## 4. Data Model Alignment

This pattern uses these repository artifacts:

### Schemas

* `schemas/player-identity.schema.json`
* `schemas/asset-ownership.schema.json`
* `schemas/world-shard.schema.json`

### Contracts

* `contracts/shard-transition.contract.md`
* `contracts/identity-persistence.contract.md`
* `contracts/economy-persistence.contract.md`

### Supporting Docs

* `docs/shard-transition-patterns.md`
* `docs/identity-and-asset-continuity.md`
* `docs/economy-continuity.md`

## 5. Transition States

The airport terminal implements the Staged Handoff Pattern:

* **Prepare** — Validate + escrow + snapshot
* **Commit** — Reserve destination + transfer snapshot
* **Confirm** — Destination becomes authoritative + escrow release
* **Rollback (on failure)** — Restore player to origin with deterministic safety guarantees

## 6. Sequence Flow

### 6.1 Happy Path (Diegetic "Flight")

```
Player -> Client: Select destination at terminal kiosk
Client -> Orchestrator: CreateTransitionIntent(identity_id, from_shard, to_shard, assets_hint)

Orchestrator -> IdentityAuthority: Validate identity + scopes
Orchestrator -> EconomyAuthority: Validate transfer eligibility (assets)
Orchestrator -> EconomyAuthority: Escrow eligible assets (idempotent)
Orchestrator -> SourceShard: RequestPlayerSnapshot(identity_id)
Orchestrator: Transition PREPARED

Client: Begin boarding sequence (soft-lock, corridor, cinematic)

Orchestrator -> DestinationShard: ReserveSlot(to_shard, identity_id)
Orchestrator -> DestinationShard: SendSnapshot(snapshot)
Orchestrator: Transition COMMITTED

DestinationShard -> Orchestrator: ReadyToSpawn(identity_id)
Orchestrator -> EconomyAuthority: Release escrow (idempotent)
Orchestrator: Transition CONFIRMED

Orchestrator -> Client: Provide join token / routing info
Client -> DestinationShard: Connect + Spawn
Client: Restore control in destination terminal
```

### 6.2 Minimal Payload Needed for Handoff

The "player snapshot" should be the smallest valid bundle that enables deterministic hydration:

* `identity_id`
* `last_known_position` (terminal gate spawn point)
* core vitals / health / status
* inventory references (not raw world objects)
* equipped loadout references
* world-local context pointers (optional, may be dropped)

## 7. Asset Eligibility and Escrow

### 7.1 Transfer Eligibility Rules

Assets must be classified as:

* **Global** (transferable across worlds)
* **World-local** (may not transfer)
* **Shard-local** (should never transfer)

Eligibility must be explicit and deterministic.

Recommended rule hierarchy:

1. Asset scope (global/world_local/shard_local)
2. Transfer policy (transferable, transfer_scope, cooldown, restrictions)
3. World allow/deny lists
4. Trust/risk gate (optional but common in production)

### 7.2 Escrow Semantics

Escrow is used to prevent:

* duplication across retries
* double-spends
* exploit-driven desync

Escrow should:

* set asset status to `escrow`
* be idempotent under retries
* be released only on confirmed arrival
* roll back to `active` if transition fails

## 8. Failure Modes and Recovery

The airport terminal pattern must treat failure as expected, not exceptional.

### 8.1 Failure Before Commit (PREPARED only)

**Examples:**

* Destination shard unavailable
* Validation fails late
* Snapshot cannot be produced

**Recovery:**

* Roll back escrow
* Return player control at origin terminal
* Display "Flight Cancelled" message

### 8.2 Failure After Commit, Before Confirm (COMMITTED)

**Examples:**

* Destination reserved slot expires
* Snapshot transfer succeeds but hydration fails
* Client disconnects mid-flight

**Recovery:**

* Roll back escrow
* Either:
  * return player to origin terminal, or
  * place player in a "holding lounge" instance until retry completes

### 8.3 Failure After Confirm (CONFIRMED)

At this point, the destination is authoritative.

**Rule:**

Do not roll back confirmed transitions.

**Recovery:**

Use normal reconnection and spawn recovery on destination shard.

## 9. Security Considerations

### 9.1 Client Authority Limitations

During boarding/flight:

* client must not mutate identity or asset state
* client inputs should be constrained (soft-lock)
* client should not receive escrow details or intermediate states

### 9.2 Replay and Idempotency

All calls must be safe to retry:

* use change IDs and idempotency keys
* do not allow multiple commits for the same transition
* confirm/release must be idempotent

### 9.3 Exploit Surfaces to Guard

* "disconnect to dupe" attempts during flight
* client-forged destination selection
* partial snapshot injection
* time-of-check/time-of-use gaps on eligibility

## 10. Observability and Telemetry

### Minimum recommended events

* `transition.started` (from/to, identity_id)
* `transition.prepared` (assets escrowed count)
* `transition.committed` (destination reservation)
* `transition.confirmed` (arrival)
* `transition.rolled_back` (reason)
* `escrow.held` / `escrow.released` / `escrow.rolled_back`
* `destination.hydration_failed` (error category)

### Suggested metrics

* success rate by route
* p50/p95 transition duration
* rollback rate by failure reason
* escrow hold time distribution
* duplicate/retry frequency (signals instability or attack)

## 11. Implementation Notes

### 11.1 Terminal UX as a Control Surface

The terminal provides a player-facing reason to:

* validate eligibility
* enforce soft-lock
* stage readiness checks
* mask routing and load times

### 11.2 "Flight" as a Technical Buffer

The flight duration can be:

* fixed (cinematic)
* dynamic (progress bar)
* adaptively extended under load (within reason)

Avoid lying too aggressively; prefer:

* "delays" messaging
* lounge holding pattern
* retry prompts

## 12. Acceptance Tests

A robust implementation should pass:

* **Idempotent prepare** — Repeating prepare with same change ID does not duplicate escrow.
* **No duplication under disconnect** — Disconnect during flight cannot duplicate assets on reconnect.
* **Atomic state application** — Destination never spawns player with partial inventory/state.
* **Rollback correctness** — If destination hydration fails, assets return to active on origin.
* **Confirmed is final** — Once confirmed, escrow releases and transition cannot revert.
* **Audit completeness** — Every transition has a traceable event chain.

## 13. Optional Extensions

* Multi-hop itineraries (A → B → C) with chained transitions
* Luggage rules (transfer subset of assets automatically)
* Customs gates (risk-based eligibility filters)
* Dynamic routing (choose best shard based on latency/capacity)
* World sunsetting migration (terminals redirect to replacement worlds)

## Summary

The Airport Terminal Transition pattern is a practical, scalable approach to connecting worlds while preserving continuity. It converts a complex distributed-systems handoff into an intuitive player ritual, enforcing strict integrity via escrow, staged handoff, and deterministic recovery.

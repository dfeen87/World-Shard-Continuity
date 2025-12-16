# Engine-Agnostic Integration Guide

This repository provides **contracts, schemas, and reference implementations** for world/shard continuity.
This guide shows how to integrate the continuity layer into any engine (Unreal, Unity, custom) without assuming a specific networking, streaming, or persistence stack.

The continuity system is best treated as a **platform boundary**: the game runtime requests transitions; authoritative services enforce identity, economy, and transfer correctness.

---

## 1. The Minimal Integration Surface

An engine/runtime only needs to implement three outward-facing behaviors:

1. **Initiate transition intent**
   - Player chooses destination (world/shard) from an in-world terminal UI
   - Client sends request to Transition Orchestrator

2. **Enter a controlled transition state**
   - Soft-lock input (or restrict to safe actions)
   - Play a boarding/flight cinematic or guided corridor
   - Maintain client session until routing info arrives

3. **Connect to destination and spawn**
   - Receive join token / routing info
   - Connect to destination shard
   - Hydrate/restore presentation state
   - Restore control when destination confirms readiness

The engine should not own:
- identity authority
- asset/economy authority
- final settlement
- cross-shard commit/confirm semantics

---

## 2. Recommended Component Breakdown

### Client / Engine Runtime
- Terminal UI
- Transition overlay (boarding/flight)
- “holding lounge” UX for delays/retries
- Spawn controller (apply snapshot references to in-world representation)

### Platform Services (Engine-neutral)
- Identity Authority (read, validate, scoped exposure)
- Economy/Ledger Authority (ownership, escrow, idempotency)
- Transition Orchestrator (staged handoff FSM)
- Audit Sink (log chain)

### Shards
- Source shard: snapshot producer, soft-lock enforcer
- Destination shard: slot reservation, hydration, spawn readiness

---

## 3. Canonical Transition API (Reference)

These are not required endpoints—just a clean reference shape.
Implement as HTTP, gRPC, WebSocket RPC, message bus, etc.

### 3.1 Create Transition Intent
**Request**
- identity_id (pid_*)
- from_shard (sid_*)
- to_shard (sid_*)
- protected_assets (aid_*[]) (optional, but recommended)

**Response**
- transition_id
- status = prepared

### 3.2 Commit Transition
**Request**
- transition_id
- change_id (idempotency)

**Response**
- transition_id
- status = committed

### 3.3 Confirm Transition
**Request**
- transition_id
- change_id (idempotency)

**Response**
- transition_id
- status = confirmed
- join_token / routing info (implementation-defined)

### 3.4 Rollback Transition
**Request**
- transition_id
- change_id
- reason

**Response**
- transition_id
- status = rolled_back

---

## 4. Data Boundaries and Schemas

Enforce schemas at the boundaries (service ingress/egress). At minimum:

- player identity objects must validate against:
  - schemas/player-identity.schema.json

- asset records must validate against:
  - schemas/asset-ownership.schema.json

- shard descriptors should validate against:
  - schemas/world-shard.schema.json

This can be done:
- at service edges (recommended)
- in build-time validation for config
- in CI with sample fixtures

---

## 5. The “Airport Terminal” Implementation Checklist

Engine-side checklist:
- [ ] Terminal kiosk UI that selects a destination shard
- [ ] Transition overlay / cinematic
- [ ] Soft-lock input and block risky actions during boarding/flight
- [ ] Handle success: connect to destination and spawn at terminal entry point
- [ ] Handle failure: show “Flight Cancelled” and restore player at origin terminal
- [ ] Handle delay: optionally place player in a holding lounge instance

Platform-side checklist:
- [ ] Identity validation (scopes/permissions)
- [ ] Asset eligibility checks + escrow
- [ ] Snapshot request from source shard
- [ ] Destination shard reserve + hydration pipeline
- [ ] Confirm-only escrow release
- [ ] Deterministic rollback prior to confirm
- [ ] Full audit trail

---

## 6. Production-Hardening Guidance

### 6.1 Idempotency Everywhere
All mutation paths must be safe to retry:
- escrow hold/release
- commit/confirm
- snapshot send
- spawn finalize

### 6.2 Correctness > Availability
If the economy/identity authority is unavailable, do not proceed.
Fail closed and roll back.

### 6.3 Observability
Track:
- per-route success rate
- rollback reasons
- p95 transition latency
- escrow hold duration
- repeated retries (stability or attack signal)

### 6.4 Security
Assume adversarial clients:
- never trust destination selection without server validation
- never expose intermediate settlement state
- restrict input during transition windows

---

## 7. Suggested Adoption Path

1. Implement the airport terminal UX in-engine (no platform changes)
2. Integrate Transition Orchestrator in “dry-run” mode (no escrow, no settlement)
3. Add escrow + idempotency + audit
4. Turn on cross-shard routing + hydration
5. Expand to additional transition patterns (gates, vessels, elevators)

---

### Summary

The continuity layer is a platform system that the engine integrates with—not a replacement for engine networking or streaming.
By enforcing contracts at boundaries and using staged handoff semantics, teams can connect worlds without sacrificing identity integrity, economic stability, or player trust.


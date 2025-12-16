# World-Shard Continuity

A reference architecture and execution model for identity-safe, asset-safe, long-lived game worlds.

This repository defines how players, assets, and economies move safely and deterministically across worlds, shards, instances, matches, and migrations — without resets, duplication, or trust erosion.

**It is not a game engine.**  
**It is not a backend framework.**  
**It is the missing continuity layer beneath modern online games.**

## Why This Exists

Modern games already support:

* multiple worlds
* instancing
* matchmaking
* live updates
* migrations

What they don't consistently support is **continuity**.

Across the industry, players lose:

* progress during transitions
* assets during crashes
* trust during resets
* confidence during retries

Those failures are not caused by graphics, networking, or scale —  
they are caused by **unclear authority boundaries** and **non-idempotent transitions**.

This repository exists to solve that problem at the architectural level.

## What This Repo Provides

### 1. Transition Reference Architectures

Production-grade patterns for every major player transition:

* **Airport Terminal Transition** — Scheduled, diegetic world travel
* **Instance Gate Transition** — Short-lived, scoped instancing (dungeons, interiors, missions)
* **Vehicle / Vessel Transition** — Time-based, shared, interruptible transit (ships, trains, aircraft)
* **Matchmaking Queue Transition** — Stateless queues → authoritative matches → safe reintegration
* **World Sunsetting & Migration** — Retiring worlds without player loss or economic damage

Each architecture defines:

* authority boundaries
* lifecycle states
* failure modes
* security considerations
* acceptance tests

### 2. Executable Continuity Engine

A real execution model, not pseudocode:

* Authoritative transition FSM
* Escrow-based asset protection
* Idempotent lifecycle mutations
* Audit-first design
* Explicit begin / confirm / rollback semantics

This is how transitions behave in reality, under retries and failures.

### 3. Controllers & Routing

* Transition controllers per pattern
* A registry-based router (no switch statements)
* A unified `executeTransition()` API
* Hooks for telemetry and policy enforcement

The architecture scales horizontally, not via special cases.

### 4. Multi-Layer Idempotency (This Matters)

This repo implements three independent idempotency layers:

| Layer | Purpose |
|-------|---------|
| `request_id` | Client retry safety |
| `change_id` | Server mutation idempotency |
| Escrow | Economic anti-duplication |

Plus:

* TTL-bound idempotency storage
* GC / sweep support
* replay metrics
* persistence adapter skeletons

Retries are not a problem here — they are first-class citizens.

### 5. Proof via Simulation

This repo does not ask for trust — it demonstrates invariants.

Runnable simulations show:

* instance transitions
* matchmaking transitions
* retry safety
* idempotent replays
* escrow lock / release behavior
* TTL expiration

To see the core guarantees in action:

```bash
npm install
npm run build
npm run sim:quick
```

## What This Repo Intentionally Does NOT Include

This is just as important as what is included.

### ❌ No Game Engine Code

This repo is engine-agnostic by design.  
Unity, Unreal, custom engines — all can adopt this layer.

### ❌ No Networking Stack

Transport protocols change.  
Continuity rules do not.

### ❌ No Database Assumptions

In-memory stores are used for clarity.  
Production teams can substitute Redis, Spanner, DynamoDB, etc.

### ❌ No Client UI

Continuity is a server-side contract problem.  
UX flows are intentionally left to product teams.

### ❌ No Monetization Logic

This repo protects economies — it does not design them.

### ❌ No "Metaverse" Abstractions

No speculative claims.  
No virtual real estate promises.  
Only enforceable guarantees.

## Why These Omissions Are Intentional

Including those concerns would:

* couple the architecture to short-lived tech choices
* reduce portability
* dilute correctness guarantees
* turn a reference into a framework

This repo is designed to age well.

## Related Contracts

This repository includes formal contracts and guidance documents that define
system-level guarantees beyond individual transition patterns.

- **World Transition Contract**  
  (`contracts/world-transition.contract.md`)  
  Defines authoritative rules for identity, asset, and economy continuity across
  distinct worlds and authority domains.

- **Economy Persistence Contract**  
  (`contracts/economy-persistence.contract.md`)  
  Defines durability, escrow, settlement, and idempotency guarantees required to
  preserve economic integrity across shard, instance, and world transitions.

- **Narrative Timeline Layering**  
  (`docs/narrative-timeline-layering.md`)  
  Describes how narrative state can be layered on top of shard and world continuity
  without violating authority boundaries or persistence guarantees.

These documents are normative and intended to guide implementation,
verification, and long-term evolution of continuity-safe systems.

## Who This Is For

* Backend / platform engineers
* Live-ops teams
* Game studios building long-lived worlds
* Researchers studying online system continuity
* Anyone tired of "just reset it" as a solution

## Versioning Philosophy

This repository is tagged **v1.0.0**.

However, it intentionally includes:

* v1.1-grade idempotency
* production-level failure handling
* extensibility hooks

The surface area is frozen.  
The guarantees are strong.  
Future versions will extend — not rewrite.

## Final Note

This project is not about features.

**It is about player trust.**

Once lost, trust is nearly impossible to regain.  
Continuity — done correctly — preserves it.

## Getting Started (Fast Path)

```bash
npm run sim:quick   # see retry-safe transitions in action
npm run sim:all     # full behavioral confidence run
```

---

**World-Shard Continuity**  
*A calm foundation for worlds that are meant to last.*

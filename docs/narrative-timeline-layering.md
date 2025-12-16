# Narrative Timeline Layering

**Status:** Informational / Normative Guidance  
**Applies To:** Long-lived worlds, shared universes, persistent narratives

## Purpose

This document describes how narrative timelines can be layered on top of world, shard, and instance continuity without breaking system guarantees.

Narrative progression often evolves independently from:

* shard topology
* world migrations
* instancing
* matchmaking

This document provides guidance for preserving story coherence while allowing technical continuity to scale and evolve.

## Core Principle

**Narrative time and system authority must be decoupled.**

A player may move between:

* worlds
* shards
* instances
* matches

…but their narrative state must remain:

* consistent
* explainable
* non-contradictory

## Definitions

### Narrative Timeline

A logical sequence of story states, events, and flags that define what a player has experienced.

### Timeline Layer

A projection of narrative state applied to a world or instance without changing the world's authoritative simulation.

### Canonical Timeline

The authoritative narrative history for an identity.

## Separation of Concerns

This repository enforces a strict separation:

| Layer | Responsibility |
|-------|----------------|
| Continuity Layer | Identity, assets, authority, economy |
| Narrative Layer | Story state, progression, world perception |
| Presentation Layer | Dialogue, quests, visuals |

Narrative logic MUST NOT:

* control asset ownership
* bypass escrow
* change authority boundaries
* invalidate transition lifecycles

## Narrative Layering Model

### 1. Canonical Narrative State

Each identity maintains a canonical narrative timeline, independent of world.

This state:

* persists across worlds
* survives migrations
* is never reset by shard transitions
* is authoritative per identity

### 2. World Narrative Projection

Worlds MAY project narrative context based on:

* timeline version
* completed arcs
* global events

**Examples:**

* A city appears "post-event" for one player and "pre-event" for another
* NPC dialogue adapts without changing world authority
* Quests resolve differently per timeline layer

### 3. Instance Narrative Isolation

Instances MAY:

* temporarily override narrative presentation
* simulate past or future events
* represent flashbacks or alternate viewpoints

Instance narrative state MUST NOT:

* mutate canonical narrative timelines directly
* leak into other instances
* bypass confirmation semantics

## Timeline Consistency Rules

### Required Invariants

* Narrative state MUST be deterministic
* Narrative progression MUST be idempotent
* Timeline updates MUST be auditable
* Canonical state MUST be forward-only (no rewinds)

### Allowed Flexibility

* Parallel arcs
* Optional branches
* Non-linear discovery
* Asynchronous story delivery

## Narrative and World Transitions

World transitions MUST NOT:

* implicitly advance narrative state
* reset narrative flags
* invalidate story progression

Narrative advancement MAY:

* occur during transitions
* be gated by confirmation
* be deferred until stable authority is established

## Failure Handling

If a transition fails:

* narrative state MUST remain unchanged
* partial narrative effects MUST be rolled back
* presentation MAY adapt to reflect interruption

Narrative state MUST NEVER be partially committed.

## Audit & Debugging

Narrative systems SHOULD:

* version narrative timelines
* record narrative mutations
* associate story changes with transition IDs

This enables:

* replay analysis
* consistency validation
* player support resolution

## Non-Goals

This document does NOT define:

* quest systems
* dialogue trees
* content authoring tools
* branching logic engines
* narrative design philosophy

It only defines where narrative fits safely in a continuity-first system.

## Why This Matters

As worlds persist longer:

* stories overlap
* players return years later
* content evolves asynchronously

Without narrative layering:

* resets become necessary
* contradictions accumulate
* player trust erodes

Layering preserves story coherence without sacrificing system integrity.

## Final Note

**Narrative is meaning.**  
**Continuity is trust.**

This document ensures that both can scale — together — without compromise.

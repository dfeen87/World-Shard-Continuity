# How to Read This Repository

This repository is a **reference architecture and executable framework** for maintaining
world continuity across shards, instances, and system boundaries.

It is intentionally layered.

This document explains how to approach it without cognitive overload.

---

## What This Repository Is

- A set of **explicit continuity contracts**
- A **deterministic transition framework**
- A reference for **identity, asset, and economy persistence**
- Engine-agnostic by design

---

## What This Repository Is Not

- A full game engine
- A networking stack
- A cloud-specific implementation
- A production drop-in SDK

It provides **patterns and guarantees**, not product opinions.

---

## Recommended Reading Order

### 1️⃣ Start Here (Conceptual)
Read first to understand intent:

- `docs/design-principles.md`
- `docs/problem-space.md`

These explain *why* the system exists.

---

### 2️⃣ Continuity Layers
Understand the core ideas:

- `docs/identity-and-asset-continuity.md`
- `docs/economy-continuity.md`
- `docs/narrative-timeline-layering.md`

These define what must never break.

---

### 3️⃣ Contracts
Define enforceable guarantees:

- `contracts/identity-persistence.contract.md`
- `contracts/economy-persistence.contract.md`
- `contracts/world-transition.contract.md`

Contracts are **normative**.

---

### 4️⃣ Schemas
Define persistent structure:

- `schemas/player-identity.schema.json`
- `schemas/asset-ownership.schema.json`
- `schemas/world-shard.schema.json`

Schemas define *what is stored* and *what must remain valid*.

---

### 5️⃣ Transition Patterns
See real movement between worlds:

- `docs/shard-transition-patterns.md`
- `reference-architectures/`

These show how transitions are composed safely.

---

### 6️⃣ Source Code (Executable Reference)

Key entry points:
- `src/core/executeTransition.ts`
- `src/transitions/transition_controller.ts`
- `src/transitions/transition_context.ts`

These files define:
- Determinism
- Idempotency
- Transition safety

---

### 7️⃣ Examples & Simulations

Used to validate behavior:
- `src/examples/`
- `examples/fixtures/`

Examples are illustrative, not authoritative.

---

## If You Are a…

### Game Architect
Focus on:
- Contracts
- Schemas
- Transition patterns

You may never need to run the code.

---

### Engine Developer
Focus on:
- `src/transitions/`
- `src/core/`
- Idempotency and time handling

The code is designed to be adapted.

---

### Infrastructure / Backend Engineer
Focus on:
- Request idempotency stores
- Audit surfaces
- Ledger semantics

Cloud specifics are intentionally abstracted.

---

### Evaluating Continuity Risk
Focus on:
- What is persisted
- What is immutable
- What is explicitly versioned

Assume anything undocumented is unsafe to rely on.

---

## Conceptual vs Enforceable

| Area | Status |
|----|----|
| Contracts | Enforceable |
| Schemas | Enforceable |
| Transition logic | Enforceable |
| Reference architectures | Illustrative |
| Examples | Demonstrative |

This distinction is intentional.

---

## Final Note

This repository rewards **slow reading**.

It is designed to:
- Be audited
- Be adapted
- Outlive individual implementations

If something feels strict, it is protecting continuity.

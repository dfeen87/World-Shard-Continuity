# Versioning and Compatibility

This document defines how versioning, compatibility, and evolution are handled across
contracts, schemas, and transition logic in this repository.

The goal is to enable long-lived world continuity without breaking player identity,
assets, or economic state.

This repository treats *compatibility as a first-class system concern*.

---

## Guiding Principles

1. **Continuity over novelty**
   - Existing worlds, identities, and assets must remain valid across versions.
2. **Explicit evolution**
   - Breaking changes are never implicit.
3. **Additive first**
   - Prefer extension over mutation.
4. **Deterministic interpretation**
   - Given the same inputs and version, behavior must be reproducible.

---

## Semantic Versioning Policy

This repository follows **Semantic Versioning (SemVer)** with additional guarantees.

MAJOR.MINOR.PATCH


### MAJOR
- Breaking changes to:
  - contracts/
  - schemas/
  - transition semantics
- Requires explicit migration strategy

### MINOR
- Backward-compatible additions
- New optional fields
- New transition types that do not alter existing behavior
- Documentation and reference architecture expansion

### PATCH
- Clarifications
- Bug fixes that do not alter externally observable behavior
- Documentation improvements

---

## Compatibility Scope by Directory

### `contracts/`
**Stability: High**

Contracts define external guarantees between systems.

Rules:
- Fields may be added, never removed
- Existing meanings must not change
- Deprecated fields must remain readable

Breaking a contract requires a **MAJOR** version bump.

---

### `schemas/`
**Stability: High**

Schemas define persisted world state.

Rules:
- Additive changes only in MINOR versions
- Default values must preserve behavior
- Schema evolution must be reversible or dual-readable

No schema change may invalidate existing stored state.

---

### `src/transitions/`
**Stability: Medium–High**

Transition controllers encode behavior.

Rules:
- Existing transition behavior is immutable
- New transitions must be isolated and registered explicitly
- Transition identifiers are permanent once published

---

### `src/economy/` and `src/identity/`
**Stability: High**

Economic and identity continuity is non-negotiable.

Rules:
- Ledger semantics must remain consistent
- Identity resolution must remain deterministic
- Idempotency guarantees must not weaken

---

### `examples/`
**Stability: Low**

Examples are illustrative and may evolve freely.
They are not considered compatibility surfaces.

---

## Backward Compatibility Guarantees

The repository guarantees:

- Old schemas remain readable
- Old contracts remain interpretable
- Old transitions remain executable
- Existing player identities remain resolvable
- Existing assets retain ownership semantics

No release may silently invalidate persisted state.

---

## Deprecation Strategy

When behavior must change:

1. Mark old behavior as deprecated
2. Introduce new behavior alongside it
3. Support both for at least one MINOR release
4. Document migration explicitly

Deletion without migration is forbidden.

---

## Migration vs Coexistence

### Migration
Used when:
- State must be transformed
- Old representation is unsustainable

### Coexistence
Preferred when:
- Old and new representations can be interpreted side-by-side
- Runtime branching is acceptable

This repository strongly prefers **coexistence**.

---

## Determinism Guarantee

For any given version:
- The same inputs
- With the same schemas
- Under the same contracts

Must produce identical outcomes.

This applies to:
- Transitions
- Identity resolution
- Economic accounting

---

## Summary

This repository is designed for:
- Multi-year worlds
- Long-lived player identities
- Persistent economies

Versioning exists to **protect continuity**, not to accelerate change.

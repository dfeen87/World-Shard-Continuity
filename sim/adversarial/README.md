# Adversarial Transition Simulations

This directory contains a focused, deterministic simulation harness that stress-tests the
`TransitionStore` implementations under adversarial conditions. The simulations exercise the
same public APIs used in production (the `ShardTransitionFSM` plus `TransitionStore`), and
fail fast if any existing invariants are violated.

## Failure modes simulated

- **Duplicate storms:** many concurrent requests with the same `change_id`.
- **Partial confirmation failure:** confirmation is interrupted before it runs, then replayed.
- **Delayed replay:** older requests are replayed after newer transitions already exist.
- **Update contention:** concurrent `update(id, fn)` calls fight over state.

## Invariants stressed

- Idempotency via `change_id` (no duplicate transitions or commits).
- Escrow-before-confirm (confirmed transitions only after escrow lifecycle).
- Replay safety (old requests do not overwrite newer state).
- Authority exclusivity (identity boundaries remain intact).
- Atomic updates (no lost updates, deterministic final state).

## Running the simulations

The simulations run for both the in-memory store and the Redis-backed adapter (via an
in-process fake Redis client).

```sh
node --loader ts-node/esm/transpile-only sim/adversarial/index.ts
```

## Extending safely

1. Add a new scenario to `sim/adversarial/scenarios.ts` that uses the FSM + `TransitionStore`.
2. Keep the scenario deterministic (avoid randomness or time-dependent branching).
3. Explicitly assert invariants: transition count, final state consistency, replay safety, and
   absence of conflicting records.
4. Register the scenario in the exported `scenarios` list so it runs for every store.

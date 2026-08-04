# World-Shard Continuity

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-blue.svg)](LICENSE)
[![CI](https://github.com/dfeen87/World-Shard-Continuity/actions/workflows/ci.yml/badge.svg)](https://github.com/dfeen87/World-Shard-Continuity/actions/workflows/ci.yml)

A reference architecture and execution model for identity-safe, asset-safe, long-lived game worlds.

This repository defines how players, assets, and economies move safely and deterministically across worlds, shards, instances, matches, and migrations — without resets, duplication, or trust erosion.

**It is not a game engine.**  
**It is not a backend framework.**  
**It is the missing continuity layer beneath modern online games.**

## Table of Contents

- [Why This Exists](#why-this-exists)
- [What This Repo Provides](#what-this-repo-provides)
- [What This Repo Intentionally Does NOT Include](#what-this-repo-intentionally-does-not-include)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Getting Started (Fast Path)](#getting-started-fast-path)
- [Continuity Validation](#continuity-validation)
- [Continuity Search](#continuity-search)
- [Relationship Graph Export](#relationship-graph-export)
- [Project Structure](#project-structure)
- [Related Contracts](#related-contracts)
- [API Documentation](#api-documentation)
- [Who This Is For](#who-this-is-for)
- [Contributing](#contributing)
- [Continuous Integration](#continuous-integration)
- [Versioning Philosophy](#versioning-philosophy)
- [Acknowledgements](#acknowledgements)
- [License](#license)
- [Final Note](#final-note)

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

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)
- A Unix-like environment (Linux, macOS, WSL on Windows)

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/dfeen87/World-Shard-Continuity.git
cd World-Shard-Continuity
npm install
npm run build
```

## Getting Started (Fast Path)

Run simulations to see retry-safe transitions in action:

```bash
npm run sim:all     # full behavioral confidence run
```

To run all CI checks locally:

```bash
npm run ci
```

## Continuity Validation

Run continuity data validation locally:

```bash
npm run build
npm run validate -- --root examples/fixtures
```

Machine-readable output:

```bash
npm run validate -- --root examples/fixtures --json
```

### Exit Codes

- `0` = no validation errors
- `1` = validation errors found
- `2` = fatal execution error (usage/runtime exception)

### Output Interpretation

The validator reports grouped results for:

- duplicate IDs
- missing required fields
- broken references
- timeline ordering violations
- schema violations
- parse errors
- warnings (for skipped/unknown folders)

### Consistency Checks (Current Coverage)

Continuity data fixtures live under:

- `examples/fixtures/player-identity/*.json`
- `examples/fixtures/asset-ownership/*.json`
- `examples/fixtures/world-shard/*.json`

Primary identifiers indexed by the validator:

- player: `identity_id`
- asset: `asset_id`
- world-shard: `shard.shard_id`
- world (for references): `world.world_id`

Reference checks currently include:

- asset owner player lookup: `owner.owner_id` when `owner.owner_type=player`
- `world_ref`, `shard_ref`, and `lifecycle.origin.origin_world_ref`
- generic dependency arrays when present: `predecessors`, `dependencies`, `depends_on`

Timeline date fields used for ordering checks:

- player: `created_at` / `updated_at`
- asset: `lifecycle.created_at` / `lifecycle.updated_at`
- world-shard: `health.last_heartbeat_at` / `audit.last_changed_at`

### Add New Rules

Add or extend rule functions in:

- `src/continuity/validator.ts`

Recommended pattern:

1. implement a pure rule function that returns `ValidationIssue[]`
2. add rule invocation in `validateContinuityData()`
3. add unit tests under `tests/continuity/`
4. add/update CLI integration tests if output/exit behavior changes

## Continuity Search

Search continuity entities (players, assets, worlds, shards) across fixture JSON content:

```bash
npm run build
npm run search -- TestPilot
```

Filter by type, shard/era, tags, and request JSON output:

```bash
npm run search -- --query AirportCase --type asset --json
npm run search -- --type shard --tag global_authoritative
npm run search -- --query DemoWorld --shard sid_DemoShard001
```

Supported search filters:

- `--type <player|asset|world|shard|entry>` (repeat or comma-separated)
- `--shard <shard_id>`
- `--era <era_id>` (when present in data)
- `--tag <tag>` (repeat or comma-separated)
- `--json` for structured output

## Relationship Graph Export

Export continuity entities and relationships as a graph:

```bash
npm run build
npm run graph -- --out continuity-graph.json
```

Optional Graphviz DOT export:

```bash
npm run graph -- --out continuity-graph.json --dot continuity-graph.dot
```

### Graph JSON Schema

Top-level:

- `rootPath` (string): scanned fixtures root
- `generatedAt` (ISO timestamp)
- `nodes` (array)
- `edges` (array)

Node fields:

- `stableId` (string, stable): `<entityType>:<entityId>`
- `entityType`: `player | asset | world | shard | entry`
- `entityId` (string)
- `schema`: `player-identity | asset-ownership | world-shard`
- `filePath` (string)
- `label` (string)
- `shard` (string | undefined)
- `era` (string | undefined)
- `tags` (string[])

Edge fields:

- `edgeId` (string, stable): `<source>|<target>|<relationship>|<path>`
- `source` (node `stableId`)
- `target` (node `stableId`)
- `relationship` (e.g. `owned_by`, `originated_in_world`, `part_of_world`)
- `path` (source field path)
- `filePath` (source file)

### Tiny Static Viewer (Optional)

Open `tools/viewer/index.html` in a browser and load an exported `continuity-graph.json` file to:

- list nodes
- search/filter nodes
- inspect connected edges for a selected node

## Project Structure

```
World-Shard-Continuity/
├── .github/workflows/         # CI and fixture validation workflows
├── contracts/              # Formal continuity contracts
│   ├── economy-persistence.contract.md
│   ├── identity-persistence.contract.md
│   └── world-transition.contract.md
├── docs/                   # Architecture and design documentation
│   ├── design-principles.md
│   ├── how-to-read-this-repo.md
│   ├── identity-and-asset-continuity.md
│   ├── economy-continuity.md
│   └── narrative-timeline-layering.md
├── examples/               # Example fixtures and demonstrations
│   ├── fixtures/
│   │   ├── asset-ownership/
│   │   ├── player-identity/
│   │   └── world-shard/
│   └── engine-agnostic.md
├── reference-architectures/ # Production-grade transition patterns
│   ├── airport-terminal-transition.md
│   ├── instance-gate-transition.md
│   ├── matchmaking-queue-transition.md
│   ├── vehicle-or-vessel-transition.md
│   └── world-sunsetting-migration.md
├── schemas/                # JSON schemas for persistence
│   ├── asset-ownership.schema.json
│   ├── player-identity.schema.json
│   └── world-shard.schema.json
├── src/                    # Core implementation
│   ├── continuity/         # Validation, search indexing, graph building
│   ├── core/               # Transition execution engine
│   ├── transitions/        # Transition controllers and FSM
│   ├── economy/            # Escrow and economic guarantees
│   ├── identity/           # Identity persistence
│   ├── cli/                # validate/search/graph commands
│   ├── examples/           # runnable transition/idempotency demos
│   └── adapters/           # Persistence adapters
├── sim/adversarial/        # Adversarial simulation scenarios
├── tools/viewer/           # Static graph viewer
└── tests/                  # Contract tests

```

For a complete guide on how to navigate this repository, see [docs/how-to-read-this-repo.md](docs/how-to-read-this-repo.md).

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

## API Documentation

### Core Concepts

- **[Design Principles](docs/design-principles.md)** - Foundational architectural principles
- **[Problem Space](docs/problem-space.md)** - Understanding continuity challenges
- **[How to Read This Repo](docs/how-to-read-this-repo.md)** - Navigation guide

### Continuity Layers

- **[Identity & Asset Continuity](docs/identity-and-asset-continuity.md)** - Player and asset persistence
- **[Economy Continuity](docs/economy-continuity.md)** - Economic integrity guarantees
- **[Narrative Timeline Layering](docs/narrative-timeline-layering.md)** - Story state management

### Transition Patterns

- **[Shard Transition Patterns](docs/shard-transition-patterns.md)** - Overview of transition types
- **[Airport Terminal Transition](reference-architectures/airport-terminal-transition.md)** - Scheduled world travel
- **[Instance Gate Transition](reference-architectures/instance-gate-transition.md)** - Dungeons and instances
- **[Matchmaking Queue Transition](reference-architectures/matchmaking-queue-transition.md)** - Queue-based matches
- **[Vehicle/Vessel Transition](reference-architectures/vehicle-or-vessel-transition.md)** - Shared transit
- **[World Sunsetting & Migration](reference-architectures/world-sunsetting-migration.md)** - Safe world retirement

### Schemas

See the [schemas/](schemas/) directory for JSON schema definitions of persistent structures.

## Who This Is For

* Backend / platform engineers
* Live-ops teams
* Game studios building long-lived worlds
* Researchers studying online system continuity
* Anyone tired of "just reset it" as a solution

## Contributing

Contributions are welcome! This project values:

- **Correctness over features** - Precision and determinism are paramount
- **Clarity over cleverness** - Code should be auditable and understandable
- **Contracts over code** - Guarantees must be explicit and enforceable

### How to Contribute

1. **Read the documentation** - Start with [docs/how-to-read-this-repo.md](docs/how-to-read-this-repo.md)
2. **Understand the contracts** - Review the normative contracts in [contracts/](contracts/)
3. **Run the test suite** - Ensure `npm run ci` passes before making changes
4. **Keep changes minimal** - Surgical precision over sweeping refactors
5. **Update documentation** - If you change contracts or patterns, update related docs

### Before Submitting

```bash
npm run typecheck  # Verify TypeScript types
npm run build      # Ensure clean build
npm run test       # Run contract tests
npm run validate -- --root examples/fixtures
npm run sim:all    # Validate simulations
```

Questions or proposals? Open an issue to discuss before implementing.

## Versioning Philosophy

This repository is tagged **v3.2.1**.

However, it intentionally includes:

* v3.x-grade idempotency
* production-level failure handling
* extensibility hooks

The surface area is frozen.  
The guarantees are strong.  
Future versions will extend — not rewrite.

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
```bash
npm run clean
npm install
npm run build
```

**Simulations don't run**
- Ensure you've run `npm run build` first
- Check that Node.js version is 18 or higher: `node --version`

**Tests fail unexpectedly**
- Run `npm run clean && npm run build` to ensure fresh build
- Check that all dependencies are installed: `npm install`

**Need help?**
- Review [docs/how-to-read-this-repo.md](docs/how-to-read-this-repo.md) for guidance
- Check existing issues in the repository
- Open a new issue with detailed reproduction steps

---

## Acknowledgements

I would like to acknowledge **Microsoft Copilot**, **Anthropic Claude**, and **OpenAI ChatGPT** for their meaningful assistance in refining concepts, improving clarity, and strengthening the overall quality of this work.

## License

This repository is licensed under the **[PolyForm Noncommercial License 1.0.0](LICENSE)**.

You may use, copy, modify, and distribute this project for non-commercial purposes under the terms of the license. Commercial use is not permitted unless you obtain a separate commercial license or written permission from the licensor.

---

## Enterprise Consulting & Integration
This architecture is available under the PolyForm Noncommercial License 1.0.0. If your organization requires commercial use, custom scaling, proprietary integration, or dedicated technical consulting to deploy these models at an enterprise level, please reach out at: dfeen87@gmail.com

## Final Note

This project is not about features.

**It is about player trust.**

Once lost, trust is nearly impossible to regain.  
Continuity — done correctly — preserves it.

---

**World-Shard Continuity**  
*A calm foundation for worlds that are meant to last.*

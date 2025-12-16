# World Sunsetting & Migration

A reference architecture for retiring, replacing, or merging worlds while preserving player identity, assets, progression, and trust.

This pattern enables platforms to evolve without forcing destructive resets or abandoning player investment.

## 1. Pattern Summary

### Player Experience

1. Players are informed that a world will be retired ("sunset").
2. Clear timelines and migration options are presented.
3. Players continue to play normally during the sunset window.
4. On or before the sunset date, players are migrated automatically or via opt-in flows.
5. Players resume play in a successor world with continuity preserved.

### System Reality

1. World enters a managed deprecation state
2. New entries are restricted
3. Migration targets are validated and prepared
4. Identity and eligible assets are migrated deterministically
5. The retired world is locked and archived
6. No player data is orphaned

## 2. Goals and Non-Goals

### Goals

* Preserve identity, assets, and progression
* Avoid forced hard resets
* Allow engine, content, or topology upgrades
* Maintain economic integrity during migration
* Provide clear player communication and consent paths

### Non-Goals

* Perfect spatial or narrative continuity
* Real-time bidirectional sync between old and new worlds
* Infinite backward compatibility
* Migrating world-local bugs or exploits

## 3. When Sunsetting Is Appropriate

Common triggers:

* Engine upgrades
* Content revamps
* Technical debt removal
* Regulatory or licensing changes
* Population fragmentation
* Economy stabilization

Sunsetting should be treated as planned evolution, not failure.

## 4. World Lifecycle States

A world should explicitly move through lifecycle states:

| State | Behavior |
|-------|----------|
| Active | Full access, new players allowed |
| Frozen | No new entries, existing players allowed |
| Migrating | Active migration to successor |
| Read-Only | Exploration only, no progression |
| Archived | No player access, data retained |
| Retired | Decommissioned |

State transitions must be auditable and irreversible past certain points.

## 5. Roles and Services

### Client / Runtime

* Displays sunset notices and timelines
* Presents migration UI
* Supports preview or "arrival ceremony" in new world

### Source World (Sunsetting)

* Enforces lifecycle restrictions
* Produces authoritative migration snapshots
* Stops permanent mutations past freeze deadlines

### Destination World (Successor)

* Accepts migrated players
* Maps incoming state to new ruleset
* Becomes authoritative post-migration

### Platform Services

* **Identity Authority**
* **Economy Authority**
* **Migration Orchestrator**
* **Audit & Compliance Store**

## 6. Migration Scope Definition

### Always Migrated

* Identity
* Global assets
* Currency balances
* Entitlements
* Reputation and progression markers

### Conditionally Migrated

* World-local assets
* Property
* Quests or missions
* Titles or cosmetics

### Never Migrated

* Exploit-tainted assets
* Deprecated mechanics
* Temporary event items
* Debug or test artifacts

Eligibility must be deterministic and documented.

## 7. Migration Strategies

### 7.1 Automatic Migration

* Default for most players
* Occurs at login or scheduled cutoff
* Minimal player friction

### 7.2 Opt-In Migration

* Used for major rule changes
* Players choose timing or destination
* Allows preview or staging worlds

### 7.3 Assisted Migration

* Support-mediated
* Used for edge cases or disputes
* Requires audit review

## 8. Migration States

World migration uses a Bulk Staged Handoff:

* **Prepare** — Validate identity, determine eligible assets, snapshot source world state
* **Freeze** — Lock permanent mutations, prevent new entries
* **Transfer** — Apply migration mapping rules, escrow or lock assets
* **Confirm** — Destination world becomes authoritative
* **Archive** — Source world locked, data retained for audit/compliance

Rollback is permitted until confirm.

## 9. Sequence Flow

### 9.1 Standard Migration

```
Player -> Client: Login
Client -> Orchestrator: CheckWorldStatus(world_id)

Orchestrator: World = MIGRATING
Client: Display migration notice

Orchestrator -> IdentityAuthority: Validate identity
Orchestrator -> EconomyAuthority: Determine eligible assets
Orchestrator -> SourceWorld: Snapshot migration state
Orchestrator: Migration PREPARED

Orchestrator -> DestinationWorld: Apply snapshot
Orchestrator -> EconomyAuthority: Settle assets
Orchestrator: Migration CONFIRMED

Client -> DestinationWorld: Connect
Client: Spawn in successor world
```

## 10. Economy and Asset Handling

### 10.1 Asset Mapping

Assets may be:

* preserved as-is
* converted to new equivalents
* downgraded to compensation tokens
* retired with compensation

### 10.2 Inflation Protection

* Migration must not mint new value
* Conversions must be deterministic
* Compensation must be bounded and auditable

## 11. Failure Modes and Recovery

### 11.1 Failure Before Freeze

* Migration aborted
* No changes applied
* World remains active

### 11.2 Failure During Transfer

**Issue:**

* Partial migration detected

**Recovery:**

* Roll back changes
* Resume from snapshot
* No partial player state allowed

### 11.3 Failure After Confirm

At this point, destination is authoritative.

**Recovery:**

* Support-mediated correction only
* No automated rollback

## 12. Security and Compliance

* Migration scripts must be reviewed and versioned
* All transformations must be logged
* PII and regulated data must respect retention laws
* Archived worlds must be immutable

## 13. Observability and Telemetry

### Events

* `world.sunset_announced`
* `world.frozen`
* `migration.prepared`
* `migration.confirmed`
* `world.archived`

### Metrics

* migration success rate
* rollback count
* player opt-out rate
* asset conversion anomalies

## 14. Design Notes

### 14.1 Communication Is Architecture

Sunsetting failures are usually communication failures, not technical ones.

Clear timelines and expectations are as important as correctness.

### 14.2 Preserve Dignity

Players should feel their time mattered.

Migration should feel like continuation, not loss.

## 15. Acceptance Tests

* World enters frozen state
* No new entries allowed
* Existing players migrate successfully
* Assets map deterministically
* No value duplication
* Source world becomes read-only
* Destination world authoritative
* Archived world immutable

## Summary

World Sunsetting & Migration enables platforms to evolve without erasing player history. By treating world retirement as a first-class, staged transition, systems can modernize engines, economies, and content while preserving trust, continuity, and long-term value.

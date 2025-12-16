# Vehicle or Vessel Transition

A reference architecture for in-transit world transitions using vehicles or vessels such as ships, trains, aircraft, caravans, or spacefaring craft.

This pattern supports time-based, interruptible, shared transitions where players move between worlds or shards while remaining partially interactive during transit.

## 1. Pattern Summary

### Player Experience

1. Player boards a vehicle or vessel.
2. Vehicle departs and enters an in-transit state.
3. During transit, players may move, interact, or socialize (within constraints).
4. Arrival occurs at a destination port, station, dock, or landing zone.
5. Players disembark into the destination world with continuity preserved.

### System Reality

1. Transition begins before departure
2. Authority shifts to a transit shard
3. Assets and identity are protected during travel
4. Arrival confirmation finalizes settlement
5. Failures resolve based on transit state

## 2. Goals and Non-Goals

### Goals

* Support immersive, shared travel
* Allow partial interactivity during transition
* Enforce strong asset and identity guarantees
* Support interruption, delay, or rerouting
* Maintain narrative plausibility for latency

### Non-Goals

* Real-time synchronization between origin and destination
* Mid-transit economy settlement
* Permanent state mutation while in transit
* Infinite-duration vehicle instances

## 3. Common Use Cases

* Ships between continents
* Trains between cities
* Spacecraft between orbital zones
* Caravans between regions
* Mobile hubs (airships, capital ships)

## 4. Roles and Services

### Client / Runtime

* Boarding and disembark UX
* In-transit interaction UI
* Delay, reroute, or emergency messaging

### Origin World Shard

* Validates boarding eligibility
* Produces departure snapshot
* Hands off authority on departure

### Transit Shard (Vehicle Authority)

* Owns simulation during transit
* Hosts players concurrently
* Enforces transit-specific rules

### Destination World Shard

* Accepts arrivals
* Spawns players at arrival anchors
* Becomes authoritative only after confirmation

### Platform Services

* **Identity Authority**
* **Economy Authority** (escrow + settlement)
* **Transition Orchestrator**
* **Audit Sink**

## 5. Vehicle as a Temporary World

The vehicle/vessel itself is treated as a temporary world shard:

| Property | Behavior |
|----------|----------|
| Authority | Transit shard |
| Duration | Bounded |
| Persistence | None |
| Economy | Locked |
| Visibility | Occupants only |
| Failure Handling | Deterministic |

This keeps the system consistent with other shard types.

## 6. State Boundaries

### Persistent (Protected)

* Identity
* Global assets
* Currency balances
* Reputation
* Long-lived progression

### Transit-Scoped

* Player position on vehicle
* Temporary buffs/debuffs
* Social interactions
* Cosmetic interactions
* Emotes, chat, mini-activities

Transit shards must not mutate persistent state directly.

## 7. Transition States

The vehicle pattern uses a Time-Based Staged Handoff:

* **Prepare (Boarding)** — Validate identity and ticket/permission, escrow eligible assets, snapshot departure state
* **Depart** — Authority transfers to transit shard
* **In Transit** — Players interact under constrained rules, no permanent state mutation
* **Arrive** — Destination shard reserved
* **Confirm** — Authority transfers to destination, escrow released

Rollback is permitted until arrival is confirmed.

## 8. Sequence Flow

### 8.1 Happy Path

```
Player -> Client: Board vehicle
Client -> Orchestrator: RequestVehicleTransition(identity_id, vehicle_id)

Orchestrator -> IdentityAuthority: Validate eligibility
Orchestrator -> EconomyAuthority: Escrow transferable assets
Orchestrator -> OriginShard: Snapshot departure state
Orchestrator: Transition PREPARED

Vehicle departs
Orchestrator -> TransitShard: Activate transit authority
Client -> TransitShard: Connect
Orchestrator: Transition IN_TRANSIT

TransitShard -> Orchestrator: Arrival imminent
Orchestrator -> DestinationShard: Reserve arrival slots

TransitShard -> Orchestrator: Arrived
Orchestrator -> EconomyAuthority: Release escrow
Orchestrator: Transition CONFIRMED

Client -> DestinationShard: Connect
Client: Disembark at arrival port
```

## 9. Asset and Economy Rules

### 9.1 During Transit

* Assets are locked or escrowed
* Trading is disabled
* Currency cannot change
* No mint/burn allowed

### 9.2 Arrival Settlement

Only on confirm:

* Escrow released
* World-local assets rehydrated
* Cosmetic or narrative flags applied

No settlement is allowed mid-transit.

## 10. Failure Modes and Recovery

### 10.1 Failure Before Departure

**Examples:**

* Boarding validation fails
* Vehicle cancelled

**Recovery:**

* Cancel transition
* Release escrow
* Return player to origin dock

### 10.2 Failure During Transit

**Examples:**

* Transit shard crash
* Client disconnect
* Network partition

**Recovery Options:**

* Rejoin transit shard
* Pause transit
* Emergency dock at fallback destination
* Abort and roll back to origin (if arrival not committed)

Outcome must be deterministic and auditable.

### 10.3 Failure During Arrival

**Examples:**

* Destination shard unavailable
* Spawn hydration fails

**Recovery:**

* Hold players in transit shard
* Retry destination reservation
* Do not release escrow until confirmed

## 11. Security Considerations

* Clients must not influence route or destination
* Transit shards must not mint or mutate economy
* Replay protection for boarding requests
* Identity must remain immutable throughout transit
* Prevent "jump ship" exploits

## 12. Observability and Telemetry

### Events

* `vehicle.boarded`
* `vehicle.departed`
* `vehicle.in_transit`
* `vehicle.arrived`
* `vehicle.confirmed`
* `vehicle.rollback`

### Metrics

* average transit duration
* passenger count per vehicle
* rollback rate
* disconnect rate during transit
* arrival delay frequency

## 13. Design Notes

### 13.1 Vehicles as Latency Masks

Transit time provides:

* natural loading window
* buffer for retries
* space for social interaction

Longer routes can absorb higher latency safely.

### 13.2 Shared Risk

Shared transit reinforces:

* fairness
* social tension
* narrative stakes

Use this sparingly and intentionally.

## 14. Acceptance Tests

* Board vehicle with valid ticket
* Enter transit shard
* Disconnect mid-transit → rejoin
* Transit completes successfully
* Assets remain unchanged during transit
* Arrival releases escrow exactly once
* Destination spawn is correct
* Transit rollback restores origin state

## 15. Optional Extensions

* Dynamic routing
* Weather or hazard events
* PvE encounters during transit
* Premium cabins (purely cosmetic)
* Convoy-based travel

## Summary

The Vehicle or Vessel Transition pattern enables immersive, shared world travel while enforcing strict continuity guarantees. By treating the vehicle as a temporary shard and deferring settlement until arrival, platforms gain narrative richness without sacrificing correctness, security, or trust.

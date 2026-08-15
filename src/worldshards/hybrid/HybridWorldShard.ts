// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { createHash } from "crypto";
import {
  ActionSimEvent,
  LifeSimEvent,
  UnifiedEvent,
  translateActionSimEvent,
  translateLifeSimEvent,
} from "../../ontology/UnifiedEvent.js";

export interface HybridActorState {
  actorId: string;
  lastUpdatedTimestamp: number;
  eventCount: number;
  recentInteractions: string[];
  attributes: Record<string, unknown>;
}

export interface StepHashRecord {
  step: number;
  eventId: string;
  actorId: string;
  stateHash: string;
}

export interface ReplayResult {
  replayedCount: number;
  finalStateHash: string;
  finalActorStates: Map<string, HybridActorState>;
  stepHashes: StepHashRecord[];
}

export class HybridWorldShard {
  public readonly shardId: string;
  private currentLogicalTime: number = 0;
  private eventLedger: UnifiedEvent[] = [];
  private actorStates: Map<string, HybridActorState> = new Map();

  constructor(shardId: string, initialLogicalTime: number = 0) {
    this.shardId = shardId;
    this.currentLogicalTime = initialLogicalTime;
  }

  public getLogicalTime(): number {
    return this.currentLogicalTime;
  }

  public tick(logicalTimestamp?: number): void {
    if (typeof logicalTimestamp === "number") {
      if (logicalTimestamp < this.currentLogicalTime) {
        throw new Error(`Cannot regress logical time: current ${this.currentLogicalTime}, received ${logicalTimestamp}`);
      }
      this.currentLogicalTime = logicalTimestamp;
    } else {
      this.currentLogicalTime += 1;
    }
  }

  /**
   * Ingests a LifeSimEvent, normalizes it to a UnifiedEvent, and updates shard state.
   */
  public ingestLifeSimEvent(event: LifeSimEvent): UnifiedEvent {
    const normalized = translateLifeSimEvent({
      ...event,
      originShard: event.originShard || this.shardId,
    });
    return this.applyAndCommitEvent(normalized);
  }

  /**
   * Ingests an ActionSimEvent, normalizes it to a UnifiedEvent, and updates shard state.
   */
  public ingestActionSimEvent(event: ActionSimEvent): UnifiedEvent {
    const normalized = translateActionSimEvent({
      ...event,
      originShard: event.originShard || this.shardId,
    });
    return this.applyAndCommitEvent(normalized);
  }

  /**
   * Ingests an already normalized UnifiedEvent and updates shard state.
   */
  public ingestUnifiedEvent(event: UnifiedEvent): UnifiedEvent {
    return this.applyAndCommitEvent(event);
  }

  /**
   * Returns a read-only view of the event ledger.
   */
  public getEventLedger(): readonly UnifiedEvent[] {
    return [...this.eventLedger];
  }

  /**
   * Returns a copy of the state for a specific actor.
   */
  public getActorState(actorId: string): HybridActorState | null {
    const state = this.actorStates.get(actorId);
    if (!state) return null;
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Computes deterministic state hash of the current shard state.
   */
  public getShardStateHash(): string {
    return HybridWorldShard.computeStateHash(this.actorStates);
  }

  /**
   * Executes a pure, isolated, step-by-step deterministic replay over a list of UnifiedEvents.
   * Supports partial replay via maxEvents option.
   */
  public static replay(
    events: readonly UnifiedEvent[],
    options?: {
      initialStates?: Map<string, HybridActorState>;
      maxEvents?: number;
    }
  ): ReplayResult {
    // Isolated state copy
    const workingStates = new Map<string, HybridActorState>();
    if (options?.initialStates) {
      for (const [key, value] of options.initialStates.entries()) {
        workingStates.set(key, JSON.parse(JSON.stringify(value)));
      }
    }

    const limit = options?.maxEvents !== undefined ? Math.min(events.length, options.maxEvents) : events.length;
    const stepHashes: StepHashRecord[] = [];

    for (let i = 0; i < limit; i++) {
      const event = events[i];
      if (!event) continue;
      HybridWorldShard.applyEventToStateMap(workingStates, event);
      const stateHash = HybridWorldShard.computeStateHash(workingStates);

      stepHashes.push({
        step: i + 1,
        eventId: event.eventId,
        actorId: event.actorId,
        stateHash,
      });
    }

    const finalStateHash = HybridWorldShard.computeStateHash(workingStates);

    return {
      replayedCount: limit,
      finalStateHash,
      finalActorStates: workingStates,
      stepHashes,
    };
  }

  private applyAndCommitEvent(event: UnifiedEvent): UnifiedEvent {
    HybridWorldShard.applyEventToStateMap(this.actorStates, event);
    this.eventLedger.push(event);

    if (event.timestamp > this.currentLogicalTime) {
      this.currentLogicalTime = event.timestamp;
    }

    return event;
  }

  private static applyEventToStateMap(map: Map<string, HybridActorState>, event: UnifiedEvent): void {
    let state = map.get(event.actorId);
    if (!state) {
      state = {
        actorId: event.actorId,
        lastUpdatedTimestamp: event.timestamp,
        eventCount: 0,
        recentInteractions: [],
        attributes: {},
      };
      map.set(event.actorId, state);
    }

    state.lastUpdatedTimestamp = Math.max(state.lastUpdatedTimestamp, event.timestamp);
    state.eventCount += 1;
    state.recentInteractions = [...state.recentInteractions, event.originalEventType].slice(-20);

    if (event.sourceDomain === "LifeSim") {
      state.attributes = {
        ...state.attributes,
        lastLifeSimInteraction: event.originalEventType,
        ...(event.payload.attributes as Record<string, unknown> || {}),
        ...(event.payload.location ? { location: event.payload.location } : {}),
      };
    } else {
      state.attributes = {
        ...state.attributes,
        lastActionSimAction: event.originalEventType,
        ...(event.payload.physicsPayload as Record<string, unknown> || {}),
        ...(event.payload.location ? { location: event.payload.location } : {}),
      };
    }
  }

  private static computeStateHash(map: Map<string, HybridActorState>): string {
    const sortedActorIds = Array.from(map.keys()).sort();
    const sortedData = sortedActorIds.map((actorId) => {
      const s = map.get(actorId)!;
      return {
        actorId: s.actorId,
        lastUpdatedTimestamp: s.lastUpdatedTimestamp,
        eventCount: s.eventCount,
        recentInteractions: s.recentInteractions,
        attributes: s.attributes,
      };
    });

    return createHash("sha256").update(JSON.stringify(sortedData)).digest("hex");
  }
}

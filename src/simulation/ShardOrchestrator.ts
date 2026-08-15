// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { HybridWorldShard } from "../worldshards/hybrid/HybridWorldShard.js";

export interface IShard {
  shardId: string;
  getLogicalTime(): number;
  tick(logicalTimestamp?: number): void;
}

export class ShardOrchestrator {
  private globalLogicalTime: number;
  private shards: Map<string, IShard> = new Map();
  private hybridShards: Map<string, HybridWorldShard> = new Map();

  constructor(initialGlobalTime: number = 0) {
    this.globalLogicalTime = initialGlobalTime;
  }

  public getGlobalLogicalTime(): number {
    return this.globalLogicalTime;
  }

  /**
   * Registers a generic world shard with the orchestrator.
   */
  public registerShard(shard: IShard): void {
    if (!shard || !shard.shardId) {
      throw new Error("Cannot register invalid shard: Missing shardId.");
    }
    this.shards.set(shard.shardId, shard);
    // Align shard time to global orchestrator time if lagging
    if (shard.getLogicalTime() < this.globalLogicalTime) {
      shard.tick(this.globalLogicalTime);
    }
  }

  /**
   * Registers a HybridWorldShard specifically with the orchestrator.
   */
  public registerHybridShard(shard: HybridWorldShard): void {
    if (!shard || !shard.shardId) {
      throw new Error("Cannot register invalid hybrid shard: Missing shardId.");
    }
    this.registerShard(shard);
    this.hybridShards.set(shard.shardId, shard);
  }

  public getShard(shardId: string): IShard | undefined {
    return this.shards.get(shardId);
  }

  public getHybridShard(shardId: string): HybridWorldShard | undefined {
    return this.hybridShards.get(shardId);
  }

  public getRegisteredShardCount(): number {
    return this.shards.size;
  }

  public getRegisteredHybridShardCount(): number {
    return this.hybridShards.size;
  }

  /**
   * Advances simulation time coherently across all registered shards.
   */
  public tick(deltaSteps: number = 1): number {
    if (deltaSteps <= 0) {
      throw new Error("Tick delta must be a positive number.");
    }

    this.globalLogicalTime += deltaSteps;

    for (const shard of this.shards.values()) {
      shard.tick(this.globalLogicalTime);
    }

    return this.globalLogicalTime;
  }

  /**
   * Synchronizes all registered shards to a specific target logical timestamp.
   */
  public stepToTime(targetTime: number): void {
    if (targetTime < this.globalLogicalTime) {
      throw new Error(`Target time (${targetTime}) cannot be earlier than global logical time (${this.globalLogicalTime}).`);
    }

    this.globalLogicalTime = targetTime;

    for (const shard of this.shards.values()) {
      shard.tick(this.globalLogicalTime);
    }
  }
}

// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

export interface IdentityMigrationRecord {
  previousShard: string;
  targetShardId: string;
  timestamp: number;
  continuityVersion: number;
}

export class CrossShardIdentityToken {
  public globalActorId: string;
  public currentShard: string;
  public capabilities: string[];
  public continuityVersion: number;
  public migrationHistory: IdentityMigrationRecord[];

  constructor(
    globalActorId: string,
    currentShard: string,
    capabilities: string[] = [],
    continuityVersion: number = 1,
    migrationHistory: IdentityMigrationRecord[] = []
  ) {
    this.globalActorId = globalActorId;
    this.currentShard = currentShard;
    this.capabilities = [...capabilities];
    this.continuityVersion = continuityVersion;
    this.migrationHistory = [...migrationHistory];
  }

  /**
   * Migrates the actor's identity to a new target shard, incrementing continuity version.
   */
  public migrateIdentityToShard(targetShardId: string): void {
    if (!targetShardId) {
      throw new Error("Target shard ID must be provided for identity migration.");
    }

    const previousShard = this.currentShard;
    this.currentShard = targetShardId;
    this.continuityVersion += 1;

    this.migrationHistory.push({
      previousShard,
      targetShardId,
      timestamp: Date.now(),
      continuityVersion: this.continuityVersion,
    });
  }

  public toJSON(): Record<string, unknown> {
    return {
      globalActorId: this.globalActorId,
      currentShard: this.currentShard,
      capabilities: this.capabilities,
      continuityVersion: this.continuityVersion,
      migrationHistory: this.migrationHistory,
    };
  }

  public static fromJSON(data: any): CrossShardIdentityToken {
    if (!data || !data.globalActorId || !data.currentShard) {
      throw new Error("Invalid identity token data for deserialization.");
    }
    return new CrossShardIdentityToken(
      data.globalActorId,
      data.currentShard,
      data.capabilities || [],
      typeof data.continuityVersion === "number" ? data.continuityVersion : 1,
      Array.isArray(data.migrationHistory) ? data.migrationHistory : []
    );
  }
}

// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { createHash } from "crypto";
import { CrossShardIdentityToken } from "../identity/CrossShardIdentityToken.js";
import {
  AssetDefinition,
  ProceduralMeshTranslator,
  TranslatedMesh,
} from "../assets/ProceduralMeshTranslator.js";

export interface ShardTransitionEvent {
  transitionId: string;
  actorId: string;
  fromShard: string;
  toShard: string;
  timestamp: number;
  stateSnapshotHash: string;
  translationSummary: {
    assetsTranslated: number;
    fallbacksApplied: number;
    translatedAssets: TranslatedMesh[];
  };
}

export interface ActorStateSnapshot {
  actorId: string;
  sourceShard: string;
  sourceDomain: "LifeSim" | "ActionSim";
  attributes: Record<string, unknown>;
  assets: AssetDefinition[];
}

export interface TargetStateSnapshot {
  actorId: string;
  targetShard: string;
  targetDomain: "LifeSim" | "ActionSim";
  attributes: Record<string, unknown>;
  translatedAssets: TranslatedMesh[];
  snapshotHash: string;
}

export interface TransitionRequest {
  token: CrossShardIdentityToken;
  fromShard: string;
  toShard: string;
  targetDomain: "LifeSim" | "ActionSim";
  stateSnapshot: ActorStateSnapshot;
}

export interface TransitionResult {
  success: boolean;
  token: CrossShardIdentityToken;
  targetSnapshot: TargetStateSnapshot;
  transitionEvent: ShardTransitionEvent;
}

export class InterShardGateway {
  private meshTranslator: ProceduralMeshTranslator;
  private transitionLedger: ShardTransitionEvent[] = [];

  constructor(meshTranslator?: ProceduralMeshTranslator) {
    this.meshTranslator = meshTranslator || new ProceduralMeshTranslator();
  }

  /**
   * Retrieves all emitted ShardTransitionEvent records from the gateway's ledger.
   */
  public getTransitionLedger(): readonly ShardTransitionEvent[] {
    return [...this.transitionLedger];
  }

  /**
   * Handles inter-shard transitions between LifeSim and ActionSim shards.
   */
  public async transitionActor(request: TransitionRequest): Promise<TransitionResult> {
    const { token, fromShard, toShard, targetDomain, stateSnapshot } = request;

    // 1. Validate identity token
    if (!token || !token.globalActorId) {
      throw new Error("Invalid identity token: Missing actor identifier.");
    }
    if (token.globalActorId !== stateSnapshot.actorId) {
      throw new Error(`Identity mismatch: Token actor (${token.globalActorId}) does not match state snapshot actor (${stateSnapshot.actorId}).`);
    }
    if (token.currentShard !== fromShard) {
      throw new Error(`Token shard mismatch: Token current shard '${token.currentShard}' does not match expected source shard '${fromShard}'.`);
    }

    // 2. Migrate identity token
    token.migrateIdentityToShard(toShard);

    // 3. Translate state snapshot assets for target shard schema
    const translatedAssets: TranslatedMesh[] = [];
    let fallbacksApplied = 0;

    for (const asset of stateSnapshot.assets) {
      let translated: TranslatedMesh;
      if (targetDomain === "ActionSim") {
        translated = this.meshTranslator.translateLifeSimToActionSim(asset);
      } else {
        translated = this.meshTranslator.translateActionSimToLifeSim(asset);
      }
      if (translated.fallbackApplied) {
        fallbacksApplied++;
      }
      translatedAssets.push(translated);
    }

    // 4. Build target state snapshot & hash
    const serializedTarget = JSON.stringify({
      actorId: token.globalActorId,
      targetShard: toShard,
      targetDomain,
      attributes: stateSnapshot.attributes,
      translatedAssets,
    });

    const snapshotHash = createHash("sha256").update(serializedTarget).digest("hex");

    const targetSnapshot: TargetStateSnapshot = {
      actorId: token.globalActorId,
      targetShard: toShard,
      targetDomain,
      attributes: { ...stateSnapshot.attributes },
      translatedAssets,
      snapshotHash,
    };

    // 5. Emit ShardTransitionEvent into ledger
    const transitionEvent: ShardTransitionEvent = {
      transitionId: `trn_${token.globalActorId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actorId: token.globalActorId,
      fromShard,
      toShard,
      timestamp: Date.now(),
      stateSnapshotHash: snapshotHash,
      translationSummary: {
        assetsTranslated: translatedAssets.length,
        fallbacksApplied,
        translatedAssets,
      },
    };

    this.transitionLedger.push(transitionEvent);

    return {
      success: true,
      token,
      targetSnapshot,
      transitionEvent,
    };
  }
}

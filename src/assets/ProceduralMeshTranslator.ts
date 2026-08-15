// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

export interface AssetDefinition {
  assetId: string;
  domain: "LifeSim" | "ActionSim" | "Canonical";
  category: string; // e.g. "home_object", "prop", "npc", "vehicle", "weapon", "physics_body"
  name: string;
  tags?: string[];
  properties?: Record<string, unknown>;
  meshRef?: string;
}

export interface TranslatedMesh {
  assetId: string;
  targetDomain: "LifeSim" | "ActionSim";
  translatedCategory: string;
  translatedMeshRef: string;
  name: string;
  tags: string[];
  properties: Record<string, unknown>;
  fallbackApplied: boolean;
  translationLog?: string;
}

export class ProceduralMeshTranslator {
  /**
   * Translates a LifeSim asset (home objects, props, NPCs) into an ActionSim-compatible mesh.
   */
  public translateLifeSimToActionSim(asset: AssetDefinition): TranslatedMesh {
    const tags = Array.from(new Set([...(asset.tags || []), "actionsim_translated"]));
    const properties = {
      ...(asset.properties || {}),
      originalDomain: asset.domain,
      originalCategory: asset.category,
      originalMeshRef: asset.meshRef || "mesh_default_lifesim",
    };

    const categoryLower = asset.category.toLowerCase();

    if (categoryLower.includes("home") || categoryLower.includes("prop") || categoryLower.includes("furniture")) {
      return {
        assetId: asset.assetId,
        targetDomain: "ActionSim",
        translatedCategory: "interactive_obstacle",
        translatedMeshRef: `mesh_action_prop_${asset.assetId}`,
        name: `${asset.name} (Destructible Prop)`,
        tags,
        properties: {
          ...properties,
          destructible: true,
          mass: 50.0,
        },
        fallbackApplied: false,
      };
    }

    if (categoryLower.includes("npc") || categoryLower.includes("character")) {
      return {
        assetId: asset.assetId,
        targetDomain: "ActionSim",
        translatedCategory: "action_npc",
        translatedMeshRef: `mesh_action_npc_${asset.assetId}`,
        name: `${asset.name} (Combatant/AI)`,
        tags,
        properties: {
          ...properties,
          aiBehavior: "combat_neutral",
          health: 100,
        },
        fallbackApplied: false,
      };
    }

    // Fallback rule for unknown or unhandled LifeSim categories
    return {
      assetId: asset.assetId,
      targetDomain: "ActionSim",
      translatedCategory: "GenericObstacle",
      translatedMeshRef: "mesh_fallback_obstacle",
      name: `${asset.name} (Generic Obstacle)`,
      tags: [...tags, "fallback"],
      properties,
      fallbackApplied: true,
      translationLog: `LifeSim category '${asset.category}' unhandled; applied GenericObstacle fallback.`,
    };
  }

  /**
   * Translates an ActionSim asset (vehicles, weapons, physics bodies) into a LifeSim-safe variant.
   */
  public translateActionSimToLifeSim(asset: AssetDefinition): TranslatedMesh {
    const tags = Array.from(new Set([...(asset.tags || []), "lifesim_translated"]));
    const properties = {
      ...(asset.properties || {}),
      originalDomain: asset.domain,
      originalCategory: asset.category,
      originalMeshRef: asset.meshRef || "mesh_default_actionsim",
    };

    const categoryLower = asset.category.toLowerCase();

    if (categoryLower.includes("vehicle") || categoryLower.includes("car") || categoryLower.includes("vessel")) {
      return {
        assetId: asset.assetId,
        targetDomain: "LifeSim",
        translatedCategory: "garage_display_item",
        translatedMeshRef: `mesh_lifesim_vehicle_${asset.assetId}`,
        name: `${asset.name} (Showcase Vehicle)`,
        tags,
        properties: {
          ...properties,
          interactable: true,
          comfortRating: 8,
        },
        fallbackApplied: false,
      };
    }

    if (categoryLower.includes("weapon") || categoryLower.includes("gun") || categoryLower.includes("blade")) {
      return {
        assetId: asset.assetId,
        targetDomain: "LifeSim",
        translatedCategory: "trophy_decor",
        translatedMeshRef: `mesh_lifesim_trophy_${asset.assetId}`,
        name: `${asset.name} (Display Weapon)`,
        tags,
        properties: {
          ...properties,
          decorRating: 15,
          mountedOnWall: true,
        },
        fallbackApplied: false,
      };
    }

    if (categoryLower.includes("physics") || categoryLower.includes("rigid_body") || categoryLower.includes("debris")) {
      return {
        assetId: asset.assetId,
        targetDomain: "LifeSim",
        translatedCategory: "sculpture_decor",
        translatedMeshRef: `mesh_lifesim_sculpture_${asset.assetId}`,
        name: `${asset.name} (Modern Sculpture)`,
        tags,
        properties: {
          ...properties,
          decorRating: 5,
        },
        fallbackApplied: false,
      };
    }

    // Fallback rule for unknown or unhandled ActionSim categories
    return {
      assetId: asset.assetId,
      targetDomain: "LifeSim",
      translatedCategory: "GenericProp",
      translatedMeshRef: "mesh_fallback_prop",
      name: `${asset.name} (Generic Decoration)`,
      tags: [...tags, "fallback"],
      properties,
      fallbackApplied: true,
      translationLog: `ActionSim category '${asset.category}' unhandled; applied GenericProp fallback.`,
    };
  }
}

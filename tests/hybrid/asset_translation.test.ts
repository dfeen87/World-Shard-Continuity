// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import assert from "node:assert/strict";
import test from "node:test";
import { ProceduralMeshTranslator } from "../../src/assets/ProceduralMeshTranslator.js";

test("ProceduralMeshTranslator converts LifeSim assets to ActionSim meshes", () => {
  const translator = new ProceduralMeshTranslator();

  const homeObject = {
    assetId: "asset_sofa_001",
    domain: "LifeSim" as const,
    category: "home_object",
    name: "Luxury Leather Sofa",
    tags: ["furniture", "comfort"],
    properties: { comfort: 10 },
  };

  const translatedSofa = translator.translateLifeSimToActionSim(homeObject);
  assert.equal(translatedSofa.targetDomain, "ActionSim");
  assert.equal(translatedSofa.translatedCategory, "interactive_obstacle");
  assert.equal(translatedSofa.fallbackApplied, false);
  assert.equal(translatedSofa.properties.destructible, true);

  const npc = {
    assetId: "asset_npc_smith",
    domain: "LifeSim" as const,
    category: "npc",
    name: "Agent Smith",
    tags: ["townie"],
  };

  const translatedNpc = translator.translateLifeSimToActionSim(npc);
  assert.equal(translatedNpc.translatedCategory, "action_npc");
  assert.equal(translatedNpc.fallbackApplied, false);
});

test("ProceduralMeshTranslator converts ActionSim assets to LifeSim variants", () => {
  const translator = new ProceduralMeshTranslator();

  const vehicle = {
    assetId: "asset_car_99",
    domain: "ActionSim" as const,
    category: "vehicle",
    name: "Supercar GT",
    properties: { topSpeed: 250 },
  };

  const translatedCar = translator.translateActionSimToLifeSim(vehicle);
  assert.equal(translatedCar.targetDomain, "LifeSim");
  assert.equal(translatedCar.translatedCategory, "garage_display_item");
  assert.equal(translatedCar.fallbackApplied, false);

  const weapon = {
    assetId: "asset_laser_sword",
    domain: "ActionSim" as const,
    category: "weapon",
    name: "Plasma Blade",
  };

  const translatedWeapon = translator.translateActionSimToLifeSim(weapon);
  assert.equal(translatedWeapon.translatedCategory, "trophy_decor");
  assert.equal(translatedWeapon.fallbackApplied, false);
});

test("ProceduralMeshTranslator applies fallback rules for unknown asset categories", () => {
  const translator = new ProceduralMeshTranslator();

  const unknownAsset = {
    assetId: "asset_quantum_core",
    domain: "LifeSim" as const,
    category: "quantum_anomaly",
    name: "Unknown Artifact",
  };

  const translatedFallback = translator.translateLifeSimToActionSim(unknownAsset);
  assert.equal(translatedFallback.translatedCategory, "GenericObstacle");
  assert.equal(translatedFallback.fallbackApplied, true);
  assert.ok(translatedFallback.tags.includes("fallback"));
});

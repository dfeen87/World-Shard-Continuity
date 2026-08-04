// Licensed under the PolyForm Noncommercial License 1.0.0

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { indexContinuityDocuments, searchContinuityDocuments } from "../../src/continuity/explorer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../..");

function createFixtureSet(): string {
  const root = mkdtempSync(resolve(tmpdir(), "continuity-search-fixtures-"));
  const schemaFolders: Array<"player-identity" | "asset-ownership" | "world-shard"> = [
    "player-identity",
    "asset-ownership",
    "world-shard"
  ];
  for (const folder of schemaFolders) {
    const targetDir = resolve(root, folder);
    mkdirSync(targetDir, { recursive: true });
    const samplePath = resolve(repoRoot, "examples/fixtures", folder, "valid.sample.json");
    writeFileSync(resolve(targetDir, "valid.sample.json"), readFileSync(samplePath, "utf-8"), "utf-8");
  }
  return root;
}

test("indexContinuityDocuments indexes known fixture entities", () => {
  const root = createFixtureSet();
  const docs = indexContinuityDocuments(root);
  const byType = new Map(docs.map((doc) => [doc.entityType, doc]));

  assert.equal(docs.length, 4);
  assert.ok(byType.has("player"));
  assert.ok(byType.has("asset"));
  assert.ok(byType.has("world"));
  assert.ok(byType.has("shard"));
});

test("searchContinuityDocuments supports text and filters", () => {
  const root = createFixtureSet();
  const docs = indexContinuityDocuments(root);

  const textResults = searchContinuityDocuments(docs, {
    query: "TestPilot",
    types: [],
    shard: undefined,
    era: undefined,
    tags: []
  });
  assert.equal(textResults.length, 1);
  assert.equal(textResults[0]?.entityType, "player");

  const typeFiltered = searchContinuityDocuments(docs, {
    query: "AirportCase",
    types: ["asset"],
    shard: undefined,
    era: undefined,
    tags: []
  });
  assert.equal(typeFiltered.length, 1);
  assert.equal(typeFiltered[0]?.entityType, "asset");

  const tagFiltered = searchContinuityDocuments(docs, {
    query: "",
    types: [],
    shard: undefined,
    era: undefined,
    tags: ["global_authoritative"]
  });
  assert.equal(tagFiltered.length, 2);
  assert.ok(tagFiltered.every((result) => ["world", "shard"].includes(result.entityType)));
});

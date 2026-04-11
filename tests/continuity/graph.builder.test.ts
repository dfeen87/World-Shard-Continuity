import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildContinuityGraph } from "../../src/continuity/explorer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../..");

function createFixtureSet(): string {
  const root = mkdtempSync(resolve(tmpdir(), "continuity-graph-fixtures-"));
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

test("buildContinuityGraph creates expected nodes and edges for fixture set", () => {
  const root = createFixtureSet();
  const graph = buildContinuityGraph(root);
  const nodeIds = new Set(graph.nodes.map((node) => node.stableId));
  const edgeKeys = new Set(graph.edges.map((edge) => `${edge.source}|${edge.relationship}|${edge.target}`));

  assert.ok(nodeIds.has("player:pid_AbCdEfGhIjKlMnOpQrSt"));
  assert.ok(nodeIds.has("asset:aid_ZxCvBnMmAsDfGhJkLqWeRtY"));
  assert.ok(nodeIds.has("world:wid_DemoWorld001"));
  assert.ok(nodeIds.has("shard:sid_DemoShard001"));

  assert.ok(
    edgeKeys.has("asset:aid_ZxCvBnMmAsDfGhJkLqWeRtY|owned_by|player:pid_AbCdEfGhIjKlMnOpQrSt"),
    "expected owned_by edge"
  );
  assert.ok(
    edgeKeys.has("asset:aid_ZxCvBnMmAsDfGhJkLqWeRtY|originated_in_world|world:wid_DemoWorld001"),
    "expected originated_in_world edge"
  );
  assert.ok(
    edgeKeys.has("shard:sid_DemoShard001|part_of_world|world:wid_DemoWorld001"),
    "expected part_of_world edge"
  );
});

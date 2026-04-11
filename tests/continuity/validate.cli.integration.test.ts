import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../..");
const cliPath = resolve(repoRoot, "src/cli/validate.ts");

function sampleFixturePath(schemaFolder: "player-identity" | "asset-ownership" | "world-shard"): string {
  return resolve(repoRoot, "examples/fixtures", schemaFolder, "valid.sample.json");
}

function createFixtureSet(): string {
  const root = mkdtempSync(resolve(tmpdir(), "continuity-fixtures-"));
  const schemaFolders: Array<"player-identity" | "asset-ownership" | "world-shard"> = [
    "player-identity",
    "asset-ownership",
    "world-shard"
  ];
  for (const folder of schemaFolders) {
    const targetDir = resolve(root, folder);
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(resolve(targetDir, "valid.sample.json"), readFileSync(sampleFixturePath(folder), "utf-8"), "utf-8");
  }
  return root;
}

test("validate CLI succeeds for valid fixture dataset", () => {
  const root = createFixtureSet();
  const result = spawnSync(
    process.execPath,
    ["--loader", "ts-node/esm/transpile-only", cliPath, "--root", root, "--json"],
    { cwd: repoRoot, encoding: "utf-8" }
  );

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const parsed = JSON.parse(result.stdout) as { errors: number; scannedFiles: number };
  assert.equal(parsed.errors, 0);
  assert.equal(parsed.scannedFiles, 3);
});

test("validate CLI fails with duplicate IDs", () => {
  const root = createFixtureSet();
  const dupDir = resolve(root, "player-identity");
  const sample = JSON.parse(readFileSync(resolve(dupDir, "valid.sample.json"), "utf-8")) as Record<string, unknown>;
  sample.audit = { ...(sample.audit as Record<string, unknown>), last_change_id: "chg_identity_dup_002" };
  writeFileSync(resolve(dupDir, "dup.sample.json"), JSON.stringify(sample, null, 2), "utf-8");

  const result = spawnSync(
    process.execPath,
    ["--loader", "ts-node/esm/transpile-only", cliPath, "--root", root, "--json"],
    { cwd: repoRoot, encoding: "utf-8" }
  );

  assert.equal(result.status, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const parsed = JSON.parse(result.stdout) as {
    errors: number;
    groups: { duplicate_ids: Array<unknown> };
  };
  assert.ok(parsed.errors > 0);
  assert.ok(parsed.groups.duplicate_ids.length > 0);
});

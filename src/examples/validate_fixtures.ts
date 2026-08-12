// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import { defaultSchemaRegistry, type SchemaName } from "../core/validator.js";

/**
 * Production-grade fixture validator:
 * - Recursively walks examples/fixtures
 * - Uses the folder name as the schema key:
 *     examples/fixtures/player-identity/*.json  -> "player-identity"
 *     examples/fixtures/asset-ownership/*.json  -> "asset-ownership"
 *     examples/fixtures/world-shard/*.json      -> "world-shard"
 * - Validates each JSON with AJV strict mode
 * - Exits non-zero on any failure (CI-friendly)
 */

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = resolve(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function schemaFromPath(fixturesRoot: string, filePath: string): SchemaName | null {
  const rel = filePath.slice(fixturesRoot.length).replace(/^[\\/]/, "");
  const top = rel.split(/[\\/]/)[0]; // first folder under fixtures root
  if (top === "player-identity") return "player-identity";
  if (top === "asset-ownership") return "asset-ownership";
  if (top === "world-shard") return "world-shard";
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function main() {
  const fixturesRoot = resolve(process.cwd(), "examples", "fixtures");
  const reg = defaultSchemaRegistry();

  const files = walk(fixturesRoot).filter((p) => extname(p).toLowerCase() === ".json");

  if (files.length === 0) {
    console.error(`No JSON fixtures found under: ${fixturesRoot}`);
    process.exit(2);
  }

  let failures = 0;

  for (const f of files) {
    const schema = schemaFromPath(fixturesRoot, f);
    if (!schema) {
      console.warn(`SKIP (unknown schema folder): ${f}`);
      continue;
    }

    try {
      const raw = readFileSync(f, "utf-8");
      const data = JSON.parse(raw);
      reg.validateOrThrow(schema, data);
      console.log(`OK   [${schema}] ${basename(f)}`);
    } catch (err: unknown) {
      failures++;
      console.error(`FAIL [${schema}] ${f}`);
      if (isRecord(err) && "code" in err && typeof err.code === "string") {
        console.error(`  code: ${err.code}`);
      }
      if (err instanceof Error) {
        console.error(`  msg : ${err.message}`);
      }
      if (isRecord(err) && "details" in err && isRecord(err.details) && Array.isArray(err.details.errors)) {
        // AJV error list can be long; print a compact view
        const errors = err.details.errors;
        for (const e of errors.slice(0, 10)) {
          if (isRecord(e)) {
            const instancePath = typeof e.instancePath === "string" ? e.instancePath : "(root)";
            const message = typeof e.message === "string" ? e.message : "invalid";
            console.error(`  ajv : ${instancePath} ${message}`);
          }
        }
        if (errors.length > 10) console.error(`  ajv : ... (${errors.length - 10} more)`);
      }
    }
  }

  if (failures > 0) {
    console.error(`\nFixture validation failed: ${failures} file(s)`);
    process.exit(1);
  }

  console.log("\nAll fixtures valid ✅");
}

main();

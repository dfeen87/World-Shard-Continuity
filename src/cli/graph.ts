// Licensed under the PolyForm Noncommercial License 1.0.0

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildContinuityGraph, graphToDot } from "../continuity/explorer.js";

interface CliOptions {
  rootPath: string;
  outPath: string;
  dotPath: string | undefined;
}

function usage(): never {
  console.error("Usage: npm run graph -- [--root <path>] [--out <graph.json>] [--dot <graph.dot>]");
  console.error("Defaults:");
  console.error("  --root examples/fixtures");
  console.error("  --out continuity-graph.json");
  process.exit(2);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    rootPath: resolve(process.cwd(), "examples", "fixtures"),
    outPath: resolve(process.cwd(), "continuity-graph.json"),
    dotPath: undefined
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === "--root") {
      const value = argv[i + 1];
      if (!value) usage();
      options.rootPath = resolve(process.cwd(), value);
      i++;
      continue;
    }
    if (arg === "--out") {
      const value = argv[i + 1];
      if (!value) usage();
      options.outPath = resolve(process.cwd(), value);
      i++;
      continue;
    }
    if (arg === "--dot") {
      const value = argv[i + 1];
      if (!value) usage();
      options.dotPath = resolve(process.cwd(), value);
      i++;
      continue;
    }
    usage();
  }

  return options;
}

function writeOutput(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
}

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    const graph = buildContinuityGraph(options.rootPath);
    writeOutput(options.outPath, `${JSON.stringify(graph, null, 2)}\n`);
    if (options.dotPath) {
      writeOutput(options.dotPath, `${graphToDot(graph)}\n`);
    }
    console.log(`Graph nodes: ${graph.nodes.length}`);
    console.log(`Graph edges: ${graph.edges.length}`);
    console.log(`JSON export: ${options.outPath}`);
    if (options.dotPath) {
      console.log(`DOT export: ${options.dotPath}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(message);
    process.exit(2);
  }
}

main();

// Licensed under the PolyForm Noncommercial License 1.0.0

import { resolve } from "node:path";
import {
  type ContinuityEntityType,
  indexContinuityDocuments,
  searchContinuityDocuments
} from "../continuity/explorer.js";

interface CliOptions {
  rootPath: string;
  query: string;
  json: boolean;
  types: ContinuityEntityType[];
  shard: string | undefined;
  era: string | undefined;
  tags: string[];
}

const validTypes = new Set<ContinuityEntityType>(["player", "asset", "world", "shard", "entry"]);

function usage(): never {
  console.error(
    "Usage: npm run search -- [query terms] [--query <text>] [--root <path>] [--type <type>] [--shard <id>] [--era <id>] [--tag <tag>] [--json]"
  );
  process.exit(2);
}

function parseListArg(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    rootPath: resolve(process.cwd(), "examples", "fixtures"),
    query: "",
    json: false,
    types: [],
    shard: undefined,
    era: undefined,
    tags: []
  };
  const queryParts: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--root") {
      const value = argv[i + 1];
      if (!value) usage();
      options.rootPath = resolve(process.cwd(), value);
      i++;
      continue;
    }
    if (arg === "--query") {
      const value = argv[i + 1];
      if (!value) usage();
      queryParts.push(value);
      i++;
      continue;
    }
    if (arg === "--type") {
      const value = argv[i + 1];
      if (!value) usage();
      for (const t of parseListArg(value)) {
        if (!validTypes.has(t as ContinuityEntityType)) usage();
        options.types.push(t as ContinuityEntityType);
      }
      i++;
      continue;
    }
    if (arg === "--shard") {
      const value = argv[i + 1];
      if (!value) usage();
      options.shard = value;
      i++;
      continue;
    }
    if (arg === "--era") {
      const value = argv[i + 1];
      if (!value) usage();
      options.era = value;
      i++;
      continue;
    }
    if (arg === "--tag") {
      const value = argv[i + 1];
      if (!value) usage();
      options.tags.push(...parseListArg(value));
      i++;
      continue;
    }
    if (arg.startsWith("--")) usage();
    queryParts.push(arg);
  }

  options.query = queryParts.join(" ").trim();
  return options;
}

function formatTextResults(
  options: CliOptions,
  results: ReturnType<typeof searchContinuityDocuments>,
  totalDocs: number
): string {
  const lines: string[] = [];
  lines.push(`Search root: ${options.rootPath}`);
  lines.push(`Indexed entities: ${totalDocs}`);
  lines.push(`Matches: ${results.length}`);
  lines.push("");
  for (const result of results) {
    lines.push(`- [${result.entityType}] ${result.title} (${result.entityId})`);
    lines.push(`  stable_id: ${result.stableId}`);
    lines.push(`  schema: ${result.schema}`);
    lines.push(`  score: ${result.score}`);
    if (result.shard) lines.push(`  shard: ${result.shard}`);
    if (result.era) lines.push(`  era: ${result.era}`);
    if (result.tags.length > 0) lines.push(`  tags: ${result.tags.join(", ")}`);
    lines.push(`  file: ${result.filePath}`);
  }
  if (results.length === 0) {
    lines.push("No matching continuity entities.");
  }
  return lines.join("\n");
}

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    const docs = indexContinuityDocuments(options.rootPath);
    const results = searchContinuityDocuments(docs, {
      query: options.query,
      types: options.types,
      shard: options.shard,
      era: options.era,
      tags: options.tags
    });

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            rootPath: options.rootPath,
            query: options.query,
            filters: {
              types: options.types,
              shard: options.shard,
              era: options.era,
              tags: options.tags
            },
            totalIndexed: docs.length,
            totalMatches: results.length,
            results
          },
          null,
          2
        )
      );
    } else {
      console.log(formatTextResults(options, results, docs.length));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(message);
    process.exit(2);
  }
}

main();

import { resolve } from "node:path";
import {
  formatValidationReportText,
  validateContinuityData
} from "../continuity/validator.js";

interface CliOptions {
  rootPath: string;
  json: boolean;
}

function usage(): never {
  console.error("Usage: npm run validate -- [--root <path>] [--json]");
  console.error("Defaults:");
  console.error("  --root examples/fixtures");
  process.exit(2);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    rootPath: resolve(process.cwd(), "examples", "fixtures"),
    json: false
  };

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
    usage();
  }

  return options;
}

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = validateContinuityData(options.rootPath);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatValidationReportText(report));
    }

    process.exit(report.errors > 0 ? 1 : 0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(message);
    process.exit(2);
  }
}

main();

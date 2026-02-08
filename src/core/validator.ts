import { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ValidationError } from "./errors.js";

export type SchemaName =
  | "player-identity"
  | "asset-ownership"
  | "world-shard";

export class SchemaRegistry {
  private ajv: Ajv2020;
  private validators = new Map<SchemaName, ValidateFunction>();

  constructor(private readonly schemaDirAbs: string) {
    this.ajv = new Ajv2020({
      allErrors: true,
      strictRequired: false,
      strict: true,
      validateFormats: true
    });
    addFormats(this.ajv);

    // Important: schemas reference only internal defs, so we can compile directly.
    this.load("player-identity", "player-identity.schema.json");
    this.load("asset-ownership", "asset-ownership.schema.json");
    this.load("world-shard", "world-shard.schema.json");
  }

  private load(name: SchemaName, filename: string): void {
    const p = resolve(this.schemaDirAbs, filename);
    const raw = readFileSync(p, "utf-8");
    const schema = JSON.parse(raw) as object;
    const validate = this.ajv.compile(schema);
    this.validators.set(name, validate);
  }

  validateOrThrow<T>(name: SchemaName, data: unknown): T {
    const v = this.validators.get(name);
    if (!v) throw new ValidationError(`Schema not registered: ${name}`);
    const ok = v(data);
    if (!ok) {
      throw new ValidationError(`Schema validation failed: ${name}`, {
        errors: v.errors ?? []
      });
    }
    return data as T;
  }
}

export function defaultSchemaRegistry(baseDir?: string): SchemaRegistry {
  if (baseDir) {
    return new SchemaRegistry(resolve(baseDir, "schemas"));
  }

  const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const moduleSchemas = resolve(moduleRoot, "schemas");
  if (existsSync(moduleSchemas)) {
    return new SchemaRegistry(moduleSchemas);
  }

  return new SchemaRegistry(resolve(process.cwd(), "schemas"));
}

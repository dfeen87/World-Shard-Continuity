import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { defaultSchemaRegistry, type SchemaName } from "../core/validator.js";

export type ReferenceTargetType = "player" | "asset" | "world" | "shard" | "entry";

export interface ContinuityIdentifier {
  id: string;
  type: ReferenceTargetType;
  filePath: string;
  path: string;
}

export interface ContinuityReference {
  targetType: ReferenceTargetType;
  targetId: string;
  filePath: string;
  path: string;
  entryId?: string;
}

export interface ContinuityTimelineNode {
  id: string;
  filePath: string;
  date?: string;
  updatedDate?: string;
  dependencies: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  filePath?: string;
  path?: string;
  entryId?: string;
}

export interface ContinuityValidationReport {
  rootPath: string;
  scannedFiles: number;
  parsedEntries: number;
  errors: number;
  warnings: number;
  groups: {
    duplicate_ids: ValidationIssue[];
    missing_required_fields: ValidationIssue[];
    broken_references: ValidationIssue[];
    timeline_ordering: ValidationIssue[];
    schema_violations: ValidationIssue[];
    parse_errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
}

interface LoadedEntry {
  filePath: string;
  schema: SchemaName;
  data: Record<string, unknown>;
  identifiers: ContinuityIdentifier[];
  references: ContinuityReference[];
  timeline: ContinuityTimelineNode;
}

interface ParsedArgs {
  id?: string;
  date?: string;
  updatedDate?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function walkJsonFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = resolve(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkJsonFiles(p));
    else if (extname(p).toLowerCase() === ".json") out.push(p);
  }
  return out;
}

function schemaFromPath(fixturesRoot: string, filePath: string): SchemaName | null {
  const rel = filePath.slice(fixturesRoot.length).replace(/^[\\/]/, "");
  const top = rel.split(/[\\/]/)[0];
  if (top === "player-identity") return "player-identity";
  if (top === "asset-ownership") return "asset-ownership";
  if (top === "world-shard") return "world-shard";
  return null;
}

function firstDependencyArray(data: Record<string, unknown>): string[] {
  const keys = ["predecessors", "dependencies", "depends_on"];
  for (const key of keys) {
    const raw = data[key];
    if (Array.isArray(raw)) {
      const ids: string[] = [];
      for (const item of raw) {
        if (typeof item === "string") ids.push(item);
        else if (isRecord(item)) {
          const id = asString(item.id) ?? asString(item.ref) ?? asString(item.dependency_id);
          if (id) ids.push(id);
        }
      }
      return ids;
    }
  }
  return [];
}

function parsePlayerIdentity(data: Record<string, unknown>): ParsedArgs {
  return {
    id: asString(data.identity_id),
    date: asString(data.created_at),
    updatedDate: asString(data.updated_at)
  };
}

function parseAssetOwnership(data: Record<string, unknown>): ParsedArgs {
  const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : undefined;
  return {
    id: asString(data.asset_id),
    date: lifecycle ? asString(lifecycle.created_at) : undefined,
    updatedDate: lifecycle ? asString(lifecycle.updated_at) : undefined
  };
}

function parseWorldShard(data: Record<string, unknown>): ParsedArgs {
  const shard = isRecord(data.shard) ? data.shard : undefined;
  const health = isRecord(data.health) ? data.health : undefined;
  const audit = isRecord(data.audit) ? data.audit : undefined;
  return {
    id: shard ? asString(shard.shard_id) : undefined,
    date: health ? asString(health.last_heartbeat_at) : undefined,
    updatedDate: audit ? asString(audit.last_changed_at) : undefined
  };
}

function parseEntryBySchema(schema: SchemaName, data: Record<string, unknown>): ParsedArgs {
  if (schema === "player-identity") return parsePlayerIdentity(data);
  if (schema === "asset-ownership") return parseAssetOwnership(data);
  return parseWorldShard(data);
}

function collectIdentifiers(
  schema: SchemaName,
  filePath: string,
  data: Record<string, unknown>,
  parsed: ParsedArgs
): ContinuityIdentifier[] {
  const ids: ContinuityIdentifier[] = [];
  if (parsed.id) {
    const type: ReferenceTargetType =
      schema === "player-identity" ? "player" : schema === "asset-ownership" ? "asset" : "shard";
    const path = schema === "player-identity" ? "identity_id" : schema === "asset-ownership" ? "asset_id" : "shard.shard_id";
    ids.push({ id: parsed.id, type, filePath, path });
  }

  if (schema === "world-shard") {
    const world = isRecord(data.world) ? data.world : undefined;
    const worldId = world ? asString(world.world_id) : undefined;
    if (worldId) {
      ids.push({ id: worldId, type: "world", filePath, path: "world.world_id" });
    }
  }
  return ids;
}

function collectReferences(
  schema: SchemaName,
  filePath: string,
  data: Record<string, unknown>,
  entryId: string | undefined,
  dependencies: string[]
): ContinuityReference[] {
  const refs: ContinuityReference[] = dependencies.map((d) => ({
    targetType: "entry",
    targetId: d,
    filePath,
    path: "dependencies",
    entryId
  }));

  if (schema === "player-identity") {
    const social = isRecord(data.social) ? data.social : undefined;
    const friends = social ? asStringArray(social.friends) : [];
    for (const friendId of friends) {
      refs.push({
        targetType: "player",
        targetId: friendId,
        filePath,
        path: "social.friends",
        entryId
      });
    }
    return refs;
  }

  if (schema === "asset-ownership") {
    const owner = isRecord(data.owner) ? data.owner : undefined;
    const ownerType = owner ? asString(owner.owner_type) : undefined;
    const ownerId = owner ? asString(owner.owner_id) : undefined;
    if (ownerType === "player" && ownerId) {
      refs.push({
        targetType: "player",
        targetId: ownerId,
        filePath,
        path: "owner.owner_id",
        entryId
      });
    }

    const worldRef = asString(data.world_ref);
    const shardRef = asString(data.shard_ref);
    if (worldRef) refs.push({ targetType: "world", targetId: worldRef, filePath, path: "world_ref", entryId });
    if (shardRef) refs.push({ targetType: "shard", targetId: shardRef, filePath, path: "shard_ref", entryId });

    const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : undefined;
    const origin = lifecycle && isRecord(lifecycle.origin) ? lifecycle.origin : undefined;
    const originWorldRef = origin ? asString(origin.origin_world_ref) : undefined;
    if (originWorldRef) {
      refs.push({
        targetType: "world",
        targetId: originWorldRef,
        filePath,
        path: "lifecycle.origin.origin_world_ref",
        entryId
      });
    }
  }

  return refs;
}

function toTime(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function describeIssue(issue: ValidationIssue): string {
  const fileName = issue.filePath ? basename(issue.filePath) : "";
  const loc = issue.path ? ` @ ${issue.path}` : "";
  const entry = issue.entryId ? ` (${issue.entryId})` : "";
  return `${issue.code}${fileName ? ` ${fileName}` : ""}${entry}${loc}: ${issue.message}`;
}

export function detectDuplicateIds(identifiers: ContinuityIdentifier[]): ValidationIssue[] {
  const seen = new Map<string, ContinuityIdentifier>();
  const issues: ValidationIssue[] = [];
  for (const identifier of identifiers) {
    const existing = seen.get(identifier.id);
    if (!existing) {
      seen.set(identifier.id, identifier);
      continue;
    }
    issues.push({
      code: "DUPLICATE_ID",
      message: `ID '${identifier.id}' is duplicated across files (${existing.filePath} and ${identifier.filePath}).`,
      filePath: identifier.filePath,
      path: identifier.path,
      entryId: identifier.id
    });
  }
  return issues;
}

export function detectBrokenReferences(
  references: ContinuityReference[],
  idSets: Record<ReferenceTargetType, Set<string>>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const ref of references) {
    const targetSet = idSets[ref.targetType];
    if (!targetSet.has(ref.targetId)) {
      issues.push({
        code: "BROKEN_REFERENCE",
        message: `Reference '${ref.targetId}' (${ref.targetType}) does not exist.`,
        filePath: ref.filePath,
        path: ref.path,
        entryId: ref.entryId
      });
    }
  }
  return issues;
}

export function detectTimelineViolations(
  nodes: ContinuityTimelineNode[],
  byId: Map<string, ContinuityTimelineNode>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const node of nodes) {
    const nodeDate = toTime(node.date);
    const nodeUpdated = toTime(node.updatedDate);
    if (nodeDate !== undefined && nodeUpdated !== undefined && nodeUpdated < nodeDate) {
      issues.push({
        code: "TIMELINE_SELF_ORDER",
        message: "Updated timestamp is earlier than created timestamp.",
        filePath: node.filePath,
        entryId: node.id
      });
    }

    for (const depId of node.dependencies) {
      const dep = byId.get(depId);
      if (!dep) continue;
      const depDate = toTime(dep.date);
      if (nodeDate !== undefined && depDate !== undefined && depDate > nodeDate) {
        issues.push({
          code: "TIMELINE_DEPENDENCY_ORDER",
          message: `Dependency '${depId}' is dated after dependent entry.`,
          filePath: node.filePath,
          entryId: node.id
        });
      }
    }
  }
  return issues;
}

function readAjvErrors(err: unknown): Array<Record<string, unknown>> {
  if (!isRecord(err)) return [];
  const details = isRecord(err.details) ? err.details : undefined;
  const errors = details ? details.errors : undefined;
  if (!Array.isArray(errors)) return [];
  return errors.filter(isRecord);
}

function createEmptyReport(rootPath: string): ContinuityValidationReport {
  return {
    rootPath,
    scannedFiles: 0,
    parsedEntries: 0,
    errors: 0,
    warnings: 0,
    groups: {
      duplicate_ids: [],
      missing_required_fields: [],
      broken_references: [],
      timeline_ordering: [],
      schema_violations: [],
      parse_errors: [],
      warnings: []
    }
  };
}

function countReport(report: ContinuityValidationReport): ContinuityValidationReport {
  const errors =
    report.groups.duplicate_ids.length +
    report.groups.missing_required_fields.length +
    report.groups.broken_references.length +
    report.groups.timeline_ordering.length +
    report.groups.schema_violations.length +
    report.groups.parse_errors.length;
  const warnings = report.groups.warnings.length;
  return { ...report, errors, warnings };
}

export function formatValidationReportText(report: ContinuityValidationReport): string {
  const lines: string[] = [];
  lines.push(`Continuity validation root: ${report.rootPath}`);
  lines.push(`Scanned JSON files: ${report.scannedFiles}`);
  lines.push(`Parsed entries: ${report.parsedEntries}`);
  lines.push(`Errors: ${report.errors}`);
  lines.push(`Warnings: ${report.warnings}`);
  lines.push("");

  const groups: Array<[string, ValidationIssue[]]> = [
    ["Duplicate IDs", report.groups.duplicate_ids],
    ["Missing Required Fields", report.groups.missing_required_fields],
    ["Broken References", report.groups.broken_references],
    ["Timeline Ordering", report.groups.timeline_ordering],
    ["Schema Violations", report.groups.schema_violations],
    ["Parse Errors", report.groups.parse_errors],
    ["Warnings", report.groups.warnings]
  ];

  for (const [name, issues] of groups) {
    if (issues.length === 0) continue;
    lines.push(`${name} (${issues.length})`);
    for (const issue of issues) {
      lines.push(`  - ${describeIssue(issue)}`);
    }
    lines.push("");
  }

  if (report.errors === 0) {
    lines.push("Validation completed with no errors.");
  }
  return lines.join("\n");
}

export function validateContinuityData(rootPath: string): ContinuityValidationReport {
  const report = createEmptyReport(rootPath);
  const registry = defaultSchemaRegistry();
  const files = walkJsonFiles(rootPath);
  report.scannedFiles = files.length;

  const entries: LoadedEntry[] = [];

  for (const filePath of files) {
    const schema = schemaFromPath(rootPath, filePath);
    if (!schema) {
      report.groups.warnings.push({
        code: "UNKNOWN_SCHEMA_FOLDER",
        message: "JSON file is outside known schema folders and was skipped.",
        filePath
      });
      continue;
    }

    let data: unknown;
    try {
      data = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch (err: unknown) {
      report.groups.parse_errors.push({
        code: "JSON_PARSE_ERROR",
        message: err instanceof Error ? err.message : "Invalid JSON",
        filePath
      });
      continue;
    }

    if (!isRecord(data)) {
      report.groups.schema_violations.push({
        code: "SCHEMA_OBJECT_REQUIRED",
        message: "Top-level JSON value must be an object.",
        filePath
      });
      continue;
    }

    try {
      registry.validateOrThrow(schema, data);
    } catch (err: unknown) {
      const ajvErrors = readAjvErrors(err);
      if (ajvErrors.length === 0) {
        report.groups.schema_violations.push({
          code: "SCHEMA_VALIDATION_ERROR",
          message: err instanceof Error ? err.message : "Schema validation failed.",
          filePath
        });
      } else {
        for (const ajvErr of ajvErrors) {
          const keyword = asString(ajvErr.keyword) ?? "unknown";
          const instancePath = asString(ajvErr.instancePath) ?? "";
          const message = asString(ajvErr.message) ?? "schema violation";
          const issue: ValidationIssue = {
            code: keyword === "required" ? "MISSING_REQUIRED_FIELD" : "SCHEMA_VIOLATION",
            message,
            filePath,
            path: instancePath || undefined
          };
          if (keyword === "required") report.groups.missing_required_fields.push(issue);
          else report.groups.schema_violations.push(issue);
        }
      }
      continue;
    }

    const deps = firstDependencyArray(data);
    const parsed = parseEntryBySchema(schema, data);
    const identifiers = collectIdentifiers(schema, filePath, data, parsed);
    const entryId = parsed.id;
    const references = collectReferences(schema, filePath, data, entryId, deps);
    const timeline: ContinuityTimelineNode = {
      id: entryId ?? filePath,
      filePath,
      date: parsed.date,
      updatedDate: parsed.updatedDate,
      dependencies: deps
    };

    entries.push({ filePath, schema, data, identifiers, references, timeline });
    report.parsedEntries++;
  }

  const allIds = entries.flatMap((e) => e.identifiers);
  const allRefs = entries.flatMap((e) => e.references);
  const nodes = entries.map((e) => e.timeline);

  report.groups.duplicate_ids.push(...detectDuplicateIds(allIds));

  const idSets: Record<ReferenceTargetType, Set<string>> = {
    player: new Set(allIds.filter((id) => id.type === "player").map((id) => id.id)),
    asset: new Set(allIds.filter((id) => id.type === "asset").map((id) => id.id)),
    world: new Set(allIds.filter((id) => id.type === "world").map((id) => id.id)),
    shard: new Set(allIds.filter((id) => id.type === "shard").map((id) => id.id)),
    entry: new Set(allIds.map((id) => id.id))
  };
  report.groups.broken_references.push(...detectBrokenReferences(allRefs, idSets));

  const byId = new Map<string, ContinuityTimelineNode>();
  for (const node of nodes) {
    byId.set(node.id, node);
  }
  report.groups.timeline_ordering.push(...detectTimelineViolations(nodes, byId));

  return countReport(report);
}

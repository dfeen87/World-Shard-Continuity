import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

export type ContinuitySchema = "player-identity" | "asset-ownership" | "world-shard";
export type ContinuityEntityType = "player" | "asset" | "world" | "shard" | "entry";

export interface ContinuitySearchDocument {
  stableId: string;
  entityType: ContinuityEntityType;
  entityId: string;
  schema: ContinuitySchema;
  filePath: string;
  title: string;
  description: string | undefined;
  shard: string | undefined;
  era: string | undefined;
  tags: string[];
  searchText: string;
}

export interface ContinuityGraphNode {
  stableId: string;
  entityType: ContinuityEntityType;
  entityId: string;
  schema: ContinuitySchema;
  filePath: string;
  label: string;
  shard: string | undefined;
  era: string | undefined;
  tags: string[];
}

export interface ContinuityGraphEdge {
  edgeId: string;
  source: string;
  target: string;
  relationship: string;
  path: string;
  filePath: string;
}

export interface ContinuityGraph {
  rootPath: string;
  generatedAt: string;
  nodes: ContinuityGraphNode[];
  edges: ContinuityGraphEdge[];
}

interface LoadedEntity {
  node: ContinuityGraphNode;
  searchText: string;
}

interface LoadedReference {
  sourceStableId: string;
  targetType: ContinuityEntityType;
  targetId: string;
  relationship: string;
  path: string;
  filePath: string;
}

interface LoadedDataset {
  entities: LoadedEntity[];
  references: LoadedReference[];
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

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function buildStableId(entityType: ContinuityEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function schemaFromPath(fixturesRoot: string, filePath: string): ContinuitySchema | undefined {
  const rel = relative(fixturesRoot, filePath);
  const top = rel.split(/[\\/]/)[0];
  if (top === "player-identity") return "player-identity";
  if (top === "asset-ownership") return "asset-ownership";
  if (top === "world-shard") return "world-shard";
  return undefined;
}

function walkJsonFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      out.push(...walkJsonFiles(path));
    } else if (extname(path).toLowerCase() === ".json") {
      out.push(path);
    }
  }
  return out;
}

function flattenStringValues(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenStringValues(item, out);
    return;
  }
  if (!isRecord(value)) return;
  for (const [k, v] of Object.entries(value)) {
    out.push(k);
    flattenStringValues(v, out);
  }
}

function detectEra(data: Record<string, unknown>): string | undefined {
  const era = asString(data.era) ?? asString(data.era_id) ?? asString(data.timeline_era);
  if (era) return era;

  const timeline = isRecord(data.timeline) ? data.timeline : undefined;
  if (!timeline) return undefined;
  return asString(timeline.era) ?? asString(timeline.era_id);
}

function uniqueSortedTags(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeTag).filter(Boolean))).sort();
}

function loadPlayerEntity(filePath: string, data: Record<string, unknown>): LoadedEntity[] {
  const identityId = asString(data.identity_id);
  if (!identityId) return [];

  const profile = isRecord(data.profile) ? data.profile : undefined;
  const social = isRecord(data.social) ? data.social : undefined;
  const status = asString(data.status);
  const tags = uniqueSortedTags([
    ...asStringArray(data.scopes),
    ...asStringArray(social?.groups),
    ...(status ? [status] : [])
  ]);

  const flat: string[] = [];
  flattenStringValues(data, flat);
  const title = asString(profile?.display_name) ?? identityId;
  return [
    {
      node: {
        stableId: buildStableId("player", identityId),
        entityType: "player",
        entityId: identityId,
        schema: "player-identity",
        filePath,
        label: title,
        shard: undefined,
        era: detectEra(data),
        tags
      },
      searchText: flat.join(" ").toLowerCase()
    }
  ];
}

function loadAssetEntity(filePath: string, data: Record<string, unknown>): LoadedEntity[] {
  const assetId = asString(data.asset_id);
  if (!assetId) return [];

  const state = isRecord(data.state) ? data.state : undefined;
  const attributes = state && isRecord(state.attributes) ? state.attributes : undefined;
  const transferPolicy = isRecord(data.transfer_policy) ? data.transfer_policy : undefined;
  const restrictions = Array.isArray(transferPolicy?.restrictions) ? transferPolicy.restrictions : [];
  const restrictionTypes = restrictions
    .filter(isRecord)
    .map((restriction) => asString(restriction.type))
    .filter((v): v is string => typeof v === "string");

  const tags = uniqueSortedTags([
    ...restrictionTypes,
    ...asStringArray(data.tags),
    ...[asString(data.asset_class), asString(data.asset_type), asString(data.scope), asString(state?.status)].filter(
      (v): v is string => typeof v === "string"
    )
  ]);

  const label = asString(attributes?.label) ?? asString(data.asset_type) ?? assetId;
  const shard = asString(data.shard_ref);
  const flat: string[] = [];
  flattenStringValues(data, flat);

  return [
    {
      node: {
        stableId: buildStableId("asset", assetId),
        entityType: "asset",
        entityId: assetId,
        schema: "asset-ownership",
        filePath,
        label,
        shard,
        era: detectEra(data),
        tags
      },
      searchText: flat.join(" ").toLowerCase()
    }
  ];
}

function loadWorldShardEntities(filePath: string, data: Record<string, unknown>): LoadedEntity[] {
  const world = isRecord(data.world) ? data.world : undefined;
  const shard = isRecord(data.shard) ? data.shard : undefined;
  const transition = isRecord(data.transition) ? data.transition : undefined;
  const capabilities = isRecord(data.capabilities) ? data.capabilities : undefined;
  const supportedModes = asStringArray(transition?.supported_modes);
  const tags = uniqueSortedTags([
    ...asStringArray(data.tags),
    ...supportedModes,
    ...[
      asString(shard?.shard_type),
      asString(shard?.status),
      asString(shard?.region),
      asString(capabilities?.economy_mode)
    ].filter((v): v is string => typeof v === "string")
  ]);

  const worldId = asString(world?.world_id);
  const shardId = asString(shard?.shard_id);
  const flat: string[] = [];
  flattenStringValues(data, flat);
  const searchText = flat.join(" ").toLowerCase();

  const out: LoadedEntity[] = [];
  if (worldId) {
    out.push({
      node: {
        stableId: buildStableId("world", worldId),
        entityType: "world",
        entityId: worldId,
        schema: "world-shard",
        filePath,
        label: asString(world?.name) ?? worldId,
        shard: shardId,
        era: detectEra(data),
        tags
      },
      searchText
    });
  }
  if (shardId) {
    out.push({
      node: {
        stableId: buildStableId("shard", shardId),
        entityType: "shard",
        entityId: shardId,
        schema: "world-shard",
        filePath,
        label: asString(world?.name) ? `${asString(world?.name)}:${shardId}` : shardId,
        shard: shardId,
        era: detectEra(data),
        tags
      },
      searchText
    });
  }
  return out;
}

function extractReferences(entities: LoadedEntity[], data: Record<string, unknown>, schema: ContinuitySchema): LoadedReference[] {
  if (entities.length === 0) return [];
  const refs: LoadedReference[] = [];

  const sourceByType = new Map<ContinuityEntityType, LoadedEntity>();
  for (const entity of entities) {
    sourceByType.set(entity.node.entityType, entity);
  }
  const primarySource = entities[0];
  if (!primarySource) return refs;

  const dependencies = ["predecessors", "dependencies", "depends_on"]
    .map((key) => data[key])
    .find(Array.isArray);
  if (Array.isArray(dependencies)) {
    for (const dep of dependencies) {
      const depId =
        typeof dep === "string"
          ? dep
          : isRecord(dep)
            ? asString(dep.id) ?? asString(dep.ref) ?? asString(dep.dependency_id)
            : undefined;
      if (!depId) continue;
      refs.push({
        sourceStableId: primarySource.node.stableId,
        targetType: "entry",
        targetId: depId,
        relationship: "depends_on",
        path: "dependencies",
        filePath: primarySource.node.filePath
      });
    }
  }

  if (schema === "asset-ownership") {
    const source = sourceByType.get("asset");
    if (!source) return refs;
    const owner = isRecord(data.owner) ? data.owner : undefined;
    const ownerType = asString(owner?.owner_type);
    const ownerId = asString(owner?.owner_id);
    if (ownerType === "player" && ownerId) {
      refs.push({
        sourceStableId: source.node.stableId,
        targetType: "player",
        targetId: ownerId,
        relationship: "owned_by",
        path: "owner.owner_id",
        filePath: source.node.filePath
      });
    }

    const worldRef = asString(data.world_ref);
    if (worldRef) {
      refs.push({
        sourceStableId: source.node.stableId,
        targetType: "world",
        targetId: worldRef,
        relationship: "located_in_world",
        path: "world_ref",
        filePath: source.node.filePath
      });
    }

    const shardRef = asString(data.shard_ref);
    if (shardRef) {
      refs.push({
        sourceStableId: source.node.stableId,
        targetType: "shard",
        targetId: shardRef,
        relationship: "located_in_shard",
        path: "shard_ref",
        filePath: source.node.filePath
      });
    }

    const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : undefined;
    const origin = lifecycle && isRecord(lifecycle.origin) ? lifecycle.origin : undefined;
    const originWorldRef = asString(origin?.origin_world_ref);
    if (originWorldRef) {
      refs.push({
        sourceStableId: source.node.stableId,
        targetType: "world",
        targetId: originWorldRef,
        relationship: "originated_in_world",
        path: "lifecycle.origin.origin_world_ref",
        filePath: source.node.filePath
      });
    }
  }

  if (schema === "world-shard") {
    const shardEntity = sourceByType.get("shard");
    const worldEntity = sourceByType.get("world");
    if (shardEntity && worldEntity) {
      refs.push({
        sourceStableId: shardEntity.node.stableId,
        targetType: "world",
        targetId: worldEntity.node.entityId,
        relationship: "part_of_world",
        path: "world.world_id",
        filePath: shardEntity.node.filePath
      });
    }
  }

  return refs;
}

function loadEntitiesForSchema(schema: ContinuitySchema, filePath: string, data: Record<string, unknown>): LoadedEntity[] {
  if (schema === "player-identity") return loadPlayerEntity(filePath, data);
  if (schema === "asset-ownership") return loadAssetEntity(filePath, data);
  return loadWorldShardEntities(filePath, data);
}

function ensureEntryNode(
  entries: Map<string, ContinuityGraphNode>,
  entryId: string,
  filePath: string,
  schema: ContinuitySchema
): ContinuityGraphNode {
  const stableId = buildStableId("entry", entryId);
  const existing = entries.get(stableId);
  if (existing) return existing;
  const node: ContinuityGraphNode = {
    stableId,
    entityType: "entry",
    entityId: entryId,
    schema,
    filePath,
    label: entryId,
    shard: undefined,
    era: undefined,
    tags: []
  };
  entries.set(stableId, node);
  return node;
}

function loadDataset(rootPath: string): LoadedDataset {
  const absoluteRoot = resolve(rootPath);
  const files = walkJsonFiles(absoluteRoot);
  const entities: LoadedEntity[] = [];
  const references: LoadedReference[] = [];

  for (const filePath of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;
    const schema = schemaFromPath(absoluteRoot, filePath);
    if (!schema) continue;

    const fileEntities = loadEntitiesForSchema(schema, filePath, parsed);
    entities.push(...fileEntities);
    references.push(...extractReferences(fileEntities, parsed, schema));
  }

  return { entities, references };
}

export function buildContinuityGraph(rootPath: string): ContinuityGraph {
  const absoluteRoot = resolve(rootPath);
  const dataset = loadDataset(absoluteRoot);
  const nodes = new Map<string, ContinuityGraphNode>();
  const edges = new Map<string, ContinuityGraphEdge>();
  const refBuffer: LoadedReference[] = [];

  for (const entity of dataset.entities) {
    nodes.set(entity.node.stableId, entity.node);
  }
  refBuffer.push(...dataset.references);

  const allNodes = Array.from(nodes.values());
  const idToStable = new Map<string, string>();
  for (const node of allNodes) {
    if (node.entityType !== "entry") {
      idToStable.set(node.entityId, node.stableId);
    }
  }

  for (const ref of refBuffer) {
    const resolvedTargetStable =
      ref.targetType === "entry"
        ? idToStable.get(ref.targetId) ?? ensureEntryNode(nodes, ref.targetId, ref.filePath, "player-identity").stableId
        : idToStable.get(ref.targetId);
    if (!resolvedTargetStable) continue;

    const edgeId = `${ref.sourceStableId}|${resolvedTargetStable}|${ref.relationship}|${ref.path}`;
    edges.set(edgeId, {
      edgeId,
      source: ref.sourceStableId,
      target: resolvedTargetStable,
      relationship: ref.relationship,
      path: ref.path,
      filePath: ref.filePath
    });
  }

  return {
    rootPath: absoluteRoot,
    generatedAt: new Date().toISOString(),
    nodes: Array.from(nodes.values()).sort((a, b) => a.stableId.localeCompare(b.stableId)),
    edges: Array.from(edges.values()).sort((a, b) => a.edgeId.localeCompare(b.edgeId))
  };
}

export function indexContinuityDocuments(rootPath: string): ContinuitySearchDocument[] {
  const graph = buildContinuityGraph(rootPath);
  const dataset = loadDataset(rootPath);
  const documents: ContinuitySearchDocument[] = [];
  const textByStableId = new Map(dataset.entities.map((entity) => [entity.node.stableId, entity.searchText]));
  const nodeByStableId = new Map(graph.nodes.map((node) => [node.stableId, node]));
  const edgeDescriptions = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const source = nodeByStableId.get(edge.source);
    const target = nodeByStableId.get(edge.target);
    if (!source || !target) continue;
    const line = `${edge.relationship} ${target.entityType} ${target.entityId}`;
    const list = edgeDescriptions.get(source.stableId) ?? [];
    list.push(line);
    edgeDescriptions.set(source.stableId, list);
  }

  for (const node of graph.nodes) {
    if (node.entityType === "entry") continue;
    const relationshipText = edgeDescriptions.get(node.stableId)?.join(" ") ?? "";
    documents.push({
      stableId: node.stableId,
      entityType: node.entityType,
      entityId: node.entityId,
      schema: node.schema,
      filePath: node.filePath,
      title: node.label,
      description: relationshipText || undefined,
      shard: node.shard,
      era: node.era,
      tags: node.tags,
      searchText: `${node.label} ${node.entityId} ${node.schema} ${node.tags.join(" ")} ${
        textByStableId.get(node.stableId) ?? ""
      } ${relationshipText}`.toLowerCase()
    });
  }

  return documents;
}

export interface SearchQuery {
  query: string;
  types: ContinuityEntityType[];
  shard: string | undefined;
  era: string | undefined;
  tags: string[];
}

export interface SearchResult {
  stableId: string;
  entityType: ContinuityEntityType;
  entityId: string;
  title: string;
  schema: ContinuitySchema;
  filePath: string;
  shard: string | undefined;
  era: string | undefined;
  tags: string[];
  score: number;
}

function termScore(haystack: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    let idx = haystack.indexOf(term);
    while (idx !== -1) {
      score++;
      idx = haystack.indexOf(term, idx + term.length);
    }
  }
  return score;
}

export function searchContinuityDocuments(documents: ContinuitySearchDocument[], query: SearchQuery): SearchResult[] {
  const terms = query.query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const tagFilters = query.tags.map(normalizeTag).filter(Boolean);
  const typeFilters = new Set(query.types);

  const results: SearchResult[] = [];
  for (const doc of documents) {
    if (typeFilters.size > 0 && !typeFilters.has(doc.entityType)) continue;
    if (query.shard && doc.shard !== query.shard) continue;
    if (query.era && doc.era !== query.era) continue;
    const docTags = new Set(doc.tags.map(normalizeTag));
    if (tagFilters.some((tag) => !docTags.has(tag))) continue;
    if (terms.some((term) => !doc.searchText.includes(term))) continue;

    const score = terms.length === 0 ? 1 : termScore(doc.searchText, terms);
    results.push({
      stableId: doc.stableId,
      entityType: doc.entityType,
      entityId: doc.entityId,
      title: doc.title,
      schema: doc.schema,
      filePath: doc.filePath,
      shard: doc.shard,
      era: doc.era,
      tags: doc.tags,
      score
    });
  }

  return results.sort((a, b) => b.score - a.score || a.stableId.localeCompare(b.stableId));
}

export function graphToDot(graph: ContinuityGraph): string {
  const lines: string[] = [];
  lines.push("digraph ContinuityGraph {");
  lines.push("  rankdir=LR;");
  for (const node of graph.nodes) {
    const safeLabel = `${node.entityType}\\n${node.label}`.replace(/"/g, '\\"');
    lines.push(`  "${node.stableId}" [label="${safeLabel}"];`);
  }
  for (const edge of graph.edges) {
    const safeLabel = edge.relationship.replace(/"/g, '\\"');
    lines.push(`  "${edge.source}" -> "${edge.target}" [label="${safeLabel}"];`);
  }
  lines.push("}");
  return lines.join("\n");
}

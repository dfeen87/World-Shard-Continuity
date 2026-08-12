// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import assert from "node:assert/strict";
import test from "node:test";
import {
  collectDependencyRefs,
  detectBrokenReferences,
  detectDuplicateIds,
  detectTimelineViolations,
  type ContinuityIdentifier,
  type ContinuityReference,
  type ContinuityTimelineNode,
  type ReferenceTargetType
} from "../../src/continuity/validator.js";

test("detectDuplicateIds finds duplicate IDs across files", () => {
  const ids: ContinuityIdentifier[] = [
    { id: "pid_1", type: "player", filePath: "/a.json", path: "identity_id" },
    { id: "pid_1", type: "player", filePath: "/b.json", path: "identity_id" }
  ];

  const issues = detectDuplicateIds(ids);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.code, "DUPLICATE_ID");
});

test("detectBrokenReferences finds missing references", () => {
  const refs: ContinuityReference[] = [
    {
      targetType: "player",
      targetId: "pid_missing",
      filePath: "/asset.json",
      path: "owner.owner_id"
    }
  ];
  const idSets: Record<ReferenceTargetType, Set<string>> = {
    player: new Set(["pid_ok"]),
    asset: new Set(),
    world: new Set(),
    shard: new Set(),
    entry: new Set(["pid_ok"])
  };

  const issues = detectBrokenReferences(refs, idSets);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.code, "BROKEN_REFERENCE");
});

test("detectTimelineViolations enforces dependency ordering", () => {
  const nodes: ContinuityTimelineNode[] = [
    {
      id: "entry_a",
      filePath: "/a.json",
      date: "2025-01-02T00:00:00.000Z",
      dependencies: []
    },
    {
      id: "entry_b",
      filePath: "/b.json",
      date: "2025-01-01T00:00:00.000Z",
      dependencies: ["entry_a"]
    }
  ];
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const issues = detectTimelineViolations(nodes, byId);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.code, "TIMELINE_DEPENDENCY_ORDER");
});

test("collectDependencyRefs collects all supported dependency arrays", () => {
  const refs = collectDependencyRefs({
    predecessors: ["a1", { id: "a2" }],
    dependencies: [{ ref: "b1" }],
    depends_on: [{ dependency_id: "c1" }, "c2"]
  });

  assert.deepEqual(
    refs.map((ref) => `${ref.path}:${ref.targetId}`),
    ["predecessors:a1", "predecessors:a2", "dependencies:b1", "depends_on:c1", "depends_on:c2"]
  );
});

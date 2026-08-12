// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

export type Operation = {
  name: string;
  run: () => Promise<void>;
};

export type FailurePlan = {
  failBeforeIndex?: number;
};

export type RunReport = {
  executed: string[];
  failedAt?: string;
};

export async function runOperations(
  operations: Operation[],
  plan: FailurePlan = {}
): Promise<RunReport> {
  const executed: string[] = [];
  for (let i = 0; i < operations.length; i += 1) {
    if (plan.failBeforeIndex === i) {
      return { executed, failedAt: operations[i]?.name };
    }
    const op = operations[i];
    if (!op) continue;
    await op.run();
    executed.push(op.name);
  }
  return { executed };
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERT FAILED: ${message}`);
  }
}

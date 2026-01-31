import { ShardTransition } from "./types.js";

export interface TransitionStore {
  get(id: string): Promise<ShardTransition | null>;
  put(t: ShardTransition): Promise<void>;
  update(
    id: string,
    fn: (cur: ShardTransition) => ShardTransition
  ): Promise<ShardTransition>;
  findByChangeId(changeId: string): Promise<ShardTransition | null>;
  generateId(): string;
}

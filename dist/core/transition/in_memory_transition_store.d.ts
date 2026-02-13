import { TransitionStore } from "./transition_store.js";
import { ShardTransition } from "./types.js";
export declare class InMemoryTransitionStore implements TransitionStore {
    private map;
    get(id: string): Promise<ShardTransition | null>;
    put(t: ShardTransition): Promise<void>;
    update(id: string, fn: (cur: ShardTransition) => ShardTransition): Promise<ShardTransition>;
    findByChangeId(changeId: string): Promise<ShardTransition | null>;
    generateId(): string;
}

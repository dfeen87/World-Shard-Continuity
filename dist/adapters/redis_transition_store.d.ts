import { TransitionStore } from "../core/transition/transition_store.js";
import { ShardTransition } from "../core/transition/types.js";
/**
 * RedisTransitionStore
 *
 * Guarantees relied upon:
 * - Redis Lua scripting executes atomically for multi-key writes.
 * - SET with NX option provides unique-key semantics for idempotency.
 *
 * Limitations / assumptions:
 * - Requires a Redis client that supports `eval` with keys/arguments options.
 * - Escrow expiry metadata is stored separately and should be swept externally
 *   if the Redis key TTL is not used or expires before completion.
 */
export interface RedisLikeClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: {
        NX?: boolean;
        EX?: number;
    }): Promise<"OK" | null>;
    eval(script: string, options: {
        keys: string[];
        arguments: string[];
    }): Promise<string>;
    del(key: string): Promise<number>;
}
export declare class RedisTransitionStore implements TransitionStore {
    private readonly client;
    private readonly escrowTtlSeconds;
    constructor(client: RedisLikeClient, options?: {
        escrowTtlSeconds?: number;
    });
    generateId(): string;
    get(id: string): Promise<ShardTransition | null>;
    put(t: ShardTransition): Promise<void>;
    update(id: string, fn: (cur: ShardTransition) => ShardTransition): Promise<ShardTransition>;
    findByChangeId(changeId: string): Promise<ShardTransition | null>;
    private transitionKey;
    private changeKey;
    private escrowKey;
    private changeKeys;
    private serialize;
    private deserialize;
    private setEscrowExpiry;
    private updateEscrowExpiry;
}

import type { IdempotencyRecord, RequestIdempotencyStore } from "./requestIdempotencyStore.js";
/**
 * Redis adapter skeleton (production-ready shape).
 *
 * We DO NOT ship a redis dependency in v1.0.0 to avoid bloat.
 * Teams can implement this adapter with ioredis/node-redis.
 *
 * Suggested Redis keys:
 *   key = `wsc:idemp:${kind}:${request_id}`
 *   value = transition_id
 *   TTL = ttl_ms
 */
export declare class RedisRequestIdempotencyStore implements RequestIdempotencyStore {
    private readonly redis;
    private readonly keyPrefix;
    constructor(redis: RedisClient, keyPrefix?: string);
    get(kind: string, request_id: string): Promise<string | undefined>;
    put(kind: string, request_id: string, transition_id: string, ttl_ms: number): Promise<void>;
    peek(): Promise<IdempotencyRecord | undefined>;
    sweep(): Promise<number>;
    stats(): {
        size: number;
        hits: number;
        misses: number;
        evictions: number;
    };
}
interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode: "PX", duration: number): Promise<unknown>;
}
export {};

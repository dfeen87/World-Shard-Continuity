/**
 * Maps (kind, request_id) -> transition_id with TTL & observability.
 *
 * Production stores: Redis/Dynamo/Spanner would implement this interface.
 * This in-memory store provides:
 * - TTL expiration
 * - deterministic overwrite prevention
 * - periodic GC hooks
 * - metrics-friendly hit/miss counters
 */
export interface IdempotencyRecord {
    kind: string;
    request_id: string;
    transition_id: string;
    created_at_ms: number;
    expires_at_ms: number;
    hits: number;
}
export interface RequestIdempotencyStore {
    get(kind: string, request_id: string, now_ms?: number): Promise<string | undefined>;
    put(kind: string, request_id: string, transition_id: string, ttl_ms: number, now_ms?: number): Promise<void>;
    peek(kind: string, request_id: string, now_ms?: number): Promise<IdempotencyRecord | undefined>;
    sweep(now_ms?: number, max_to_remove?: number): Promise<number>;
    stats(): {
        size: number;
        hits: number;
        misses: number;
        evictions: number;
    };
}
export declare class InMemoryRequestIdempotencyStore implements RequestIdempotencyStore {
    private readonly map;
    private _hits;
    private _misses;
    private _evictions;
    private key;
    private now;
    private assertInputs;
    get(kind: string, request_id: string, now_ms?: number): Promise<string | undefined>;
    peek(kind: string, request_id: string, now_ms?: number): Promise<IdempotencyRecord | undefined>;
    put(kind: string, request_id: string, transition_id: string, ttl_ms: number, now_ms?: number): Promise<void>;
    /**
     * Garbage collect expired keys.
     * max_to_remove lets you bound work per sweep (important in hot paths).
     */
    sweep(now_ms?: number, max_to_remove?: number): Promise<number>;
    stats(): {
        size: number;
        hits: number;
        misses: number;
        evictions: number;
    };
}

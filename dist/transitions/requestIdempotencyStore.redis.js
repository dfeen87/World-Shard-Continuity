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
export class RedisRequestIdempotencyStore {
    redis;
    keyPrefix;
    constructor(redis, keyPrefix = "wsc:idemp") {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
    }
    async get(kind, request_id) {
        const v = await this.redis.get(`${this.keyPrefix}:${kind}:${request_id}`);
        return v ?? undefined;
    }
    async put(kind, request_id, transition_id, ttl_ms) {
        // NX prevents rebind; if you want to allow same value re-put, read first then set.
        // Safer approach for production: Lua script to enforce "same or empty".
        const key = `${this.keyPrefix}:${kind}:${request_id}`;
        const existing = await this.redis.get(key);
        if (existing && existing !== transition_id) {
            throw new Error("request_id already bound to a different transition_id");
        }
        await this.redis.set(key, transition_id, "PX", ttl_ms);
    }
    async peek() {
        throw new Error("peek not implemented for redis adapter skeleton");
    }
    async sweep() {
        // Redis handles TTL evictions. No-op.
        return 0;
    }
    stats() {
        return { size: -1, hits: 0, misses: 0, evictions: 0 };
    }
}

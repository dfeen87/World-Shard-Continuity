// Licensed under the PolyForm Noncommercial License 1.0.0

import type { IdempotencyRecord, RequestIdempotencyStore } from "./requestIdempotencyStore.js";
import { ConflictError, ValidationError } from "../core/errors.js";

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
export class RedisRequestIdempotencyStore implements RequestIdempotencyStore {
  constructor(private readonly redis: RedisClient, private readonly keyPrefix = "wsc:idemp") {}

  async get(kind: string, request_id: string): Promise<string | undefined> {
    const v = await this.redis.get(`${this.keyPrefix}:${kind}:${request_id}`);
    return v ?? undefined;
  }

  async put(kind: string, request_id: string, transition_id: string, ttl_ms: number): Promise<void> {
    // NX prevents rebind; if you want to allow same value re-put, read first then set.
    // Safer approach for production: Lua script to enforce "same or empty".
    const key = `${this.keyPrefix}:${kind}:${request_id}`;
    const existing = await this.redis.get(key);
    if (existing && existing !== transition_id) {
      throw new ConflictError("request_id already bound to a different transition_id");
    }
    await this.redis.set(key, transition_id, "PX", ttl_ms);
  }

  async peek(): Promise<IdempotencyRecord | undefined> {
    throw new ValidationError("peek not implemented for redis adapter skeleton");
  }

  async sweep(): Promise<number> {
    // Redis handles TTL evictions. No-op.
    return 0;
  }

  stats(): { size: number; hits: number; misses: number; evictions: number } {
    return { size: -1, hits: 0, misses: 0, evictions: 0 };
  }
}

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "PX", duration: number): Promise<unknown>;
}

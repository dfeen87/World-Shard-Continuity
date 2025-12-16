import { ConflictError, ValidationError } from "../core/errors.js";

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
  stats(): { size: number; hits: number; misses: number; evictions: number };
}

export class InMemoryRequestIdempotencyStore implements RequestIdempotencyStore {
  private readonly map = new Map<string, IdempotencyRecord>();
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;

  private key(kind: string, request_id: string): string {
    return `${kind}::${request_id}`;
  }

  private now(now_ms?: number): number {
    return typeof now_ms === "number" ? now_ms : Date.now();
  }

  private assertInputs(kind: string, request_id: string): void {
    if (!kind) throw new ValidationError("kind required for idempotency store.");
    if (!request_id || request_id.length < 8) {
      throw new ValidationError("request_id must be strong (>= 8 chars).");
    }
  }

  async get(kind: string, request_id: string, now_ms?: number): Promise<string | undefined> {
    const rec = await this.peek(kind, request_id, now_ms);
    if (!rec) {
      this._misses++;
      return undefined;
    }
    rec.hits += 1;
    this._hits++;
    return rec.transition_id;
  }

  async peek(kind: string, request_id: string, now_ms?: number): Promise<IdempotencyRecord | undefined> {
    this.assertInputs(kind, request_id);
    const k = this.key(kind, request_id);
    const rec = this.map.get(k);
    if (!rec) return undefined;

    const t = this.now(now_ms);
    if (rec.expires_at_ms <= t) {
      // expired
      this.map.delete(k);
      this._evictions++;
      return undefined;
    }
    return rec;
  }

  async put(
    kind: string,
    request_id: string,
    transition_id: string,
    ttl_ms: number,
    now_ms?: number
  ): Promise<void> {
    this.assertInputs(kind, request_id);
    if (!transition_id) throw new ValidationError("transition_id required.");
    if (!Number.isFinite(ttl_ms) || ttl_ms < 1_000) {
      throw new ValidationError("ttl_ms must be >= 1000.");
    }

    const k = this.key(kind, request_id);
    const existing = await this.peek(kind, request_id, now_ms);
    if (existing && existing.transition_id !== transition_id) {
      throw new ConflictError("request_id already bound to a different transition_id.", {
        kind,
        request_id,
        existing_transition_id: existing.transition_id,
        new_transition_id: transition_id
      });
    }

    const t = this.now(now_ms);
    const rec: IdempotencyRecord = {
      kind,
      request_id,
      transition_id,
      created_at_ms: existing?.created_at_ms ?? t,
      expires_at_ms: t + ttl_ms,
      hits: existing?.hits ?? 0
    };

    this.map.set(k, rec);
  }

  /**
   * Garbage collect expired keys.
   * max_to_remove lets you bound work per sweep (important in hot paths).
   */
  async sweep(now_ms?: number, max_to_remove = 10_000): Promise<number> {
    const t = this.now(now_ms);
    let removed = 0;

    for (const [k, rec] of this.map) {
      if (removed >= max_to_remove) break;
      if (rec.expires_at_ms <= t) {
        this.map.delete(k);
        removed++;
        this._evictions++;
      }
    }

    return removed;
  }

  stats(): { size: number; hits: number; misses: number; evictions: number } {
    return { size: this.map.size, hits: this._hits, misses: this._misses, evictions: this._evictions };
  }
}

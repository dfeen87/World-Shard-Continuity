import { ConflictError, ValidationError } from "../core/errors.js";
export class InMemoryRequestIdempotencyStore {
    map = new Map();
    _hits = 0;
    _misses = 0;
    _evictions = 0;
    key(kind, request_id) {
        return `${kind}::${request_id}`;
    }
    now(now_ms) {
        return typeof now_ms === "number" ? now_ms : Date.now();
    }
    assertInputs(kind, request_id) {
        if (!kind)
            throw new ValidationError("kind required for idempotency store.");
        if (!request_id || request_id.length < 8) {
            throw new ValidationError("request_id must be strong (>= 8 chars).");
        }
    }
    async get(kind, request_id, now_ms) {
        const rec = await this.peek(kind, request_id, now_ms);
        if (!rec) {
            this._misses++;
            return undefined;
        }
        rec.hits += 1;
        this._hits++;
        return rec.transition_id;
    }
    async peek(kind, request_id, now_ms) {
        this.assertInputs(kind, request_id);
        const k = this.key(kind, request_id);
        const rec = this.map.get(k);
        if (!rec)
            return undefined;
        const t = this.now(now_ms);
        if (rec.expires_at_ms <= t) {
            // expired
            this.map.delete(k);
            this._evictions++;
            return undefined;
        }
        return rec;
    }
    async put(kind, request_id, transition_id, ttl_ms, now_ms) {
        this.assertInputs(kind, request_id);
        if (!transition_id)
            throw new ValidationError("transition_id required.");
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
        const rec = {
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
    async sweep(now_ms, max_to_remove = 10_000) {
        const t = this.now(now_ms);
        let removed = 0;
        for (const [k, rec] of this.map) {
            if (removed >= max_to_remove)
                break;
            if (rec.expires_at_ms <= t) {
                this.map.delete(k);
                removed++;
                this._evictions++;
            }
        }
        return removed;
    }
    stats() {
        return { size: this.map.size, hits: this._hits, misses: this._misses, evictions: this._evictions };
    }
}

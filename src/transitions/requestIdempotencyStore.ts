import { ConflictError } from "../core/errors.js";

/**
 * Maps (request_id, kind) -> transition_id
 *
 * This store is authoritative for API-level idempotency.
 * It prevents duplicate transitions when clients retry requests.
 */
export interface RequestIdempotencyStore {
  get(kind: string, request_id: string): Promise<string | undefined>;
  put(kind: string, request_id: string, transition_id: string): Promise<void>;
}

/**
 * Simple in-memory implementation (production systems would replace this
 * with Redis, DynamoDB, Spanner, etc.)
 */
export class InMemoryRequestIdempotencyStore implements RequestIdempotencyStore {
  private readonly map = new Map<string, string>();

  private key(kind: string, request_id: string): string {
    return `${kind}::${request_id}`;
  }

  async get(kind: string, request_id: string): Promise<string | undefined> {
    return this.map.get(this.key(kind, request_id));
  }

  async put(kind: string, request_id: string, transition_id: string): Promise<void> {
    const k = this.key(kind, request_id);
    const existing = this.map.get(k);

    if (existing && existing !== transition_id) {
      throw new ConflictError(
        `request_id already bound to a different transition_id: ${request_id}`
      );
    }

    this.map.set(k, transition_id);
  }
}

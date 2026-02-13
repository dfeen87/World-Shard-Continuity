import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "../core/errors.js";
const PUT_SCRIPT = `
  local transitionKey = KEYS[1]
  local changeKey = KEYS[2]
  local value = ARGV[1]
  local transitionId = ARGV[2]
  if redis.call("exists", transitionKey) == 1 then
    return "CONFLICT_TRANSITION"
  end
  local existing = redis.call("get", changeKey)
  if existing and existing ~= transitionId then
    return "CONFLICT_CHANGE"
  end
  redis.call("set", transitionKey, value)
  redis.call("set", changeKey, transitionId)
  return "OK"
`;
const UPDATE_SCRIPT = `
  local transitionKey = KEYS[1]
  local expectedVersion = tonumber(ARGV[1])
  local transitionId = ARGV[2]
  local value = ARGV[3]
  local raw = redis.call("get", transitionKey)
  if not raw then
    return "NOT_FOUND"
  end
  local data = cjson.decode(raw)
  if data["version"] ~= expectedVersion then
    return "VERSION_MISMATCH"
  end
  for i = 2, #KEYS do
    local changeKey = KEYS[i]
    local existing = redis.call("get", changeKey)
    if existing and existing ~= transitionId then
      return "CONFLICT_CHANGE"
    end
  end
  redis.call("set", transitionKey, value)
  for i = 2, #KEYS do
    redis.call("set", KEYS[i], transitionId)
  end
  return "OK"
`;
export class RedisTransitionStore {
    client;
    escrowTtlSeconds;
    constructor(client, options) {
        this.client = client;
        this.escrowTtlSeconds = options?.escrowTtlSeconds ?? 24 * 60 * 60;
    }
    generateId() {
        return `tr_${randomUUID()}`;
    }
    async get(id) {
        const raw = await this.client.get(this.transitionKey(id));
        if (!raw)
            return null;
        return this.deserialize(raw).transition;
    }
    async put(t) {
        const payload = this.serialize({ version: 1, transition: t });
        const result = await this.client.eval(PUT_SCRIPT, {
            keys: [this.transitionKey(t.transition_id), this.changeKey(t.change_id_prepare)],
            arguments: [payload, t.transition_id]
        });
        if (result === "CONFLICT_TRANSITION") {
            throw new ConflictError("Transition exists.", { transition_id: t.transition_id });
        }
        if (result === "CONFLICT_CHANGE") {
            throw new ConflictError("Change ID already used for another transition.", {
                change_id: t.change_id_prepare
            });
        }
        if (result !== "OK") {
            throw new ConflictError("Failed to write transition.", { result });
        }
        await this.setEscrowExpiry(t);
    }
    async update(id, fn) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const raw = await this.client.get(this.transitionKey(id));
            if (!raw)
                throw new NotFoundError("Transition not found.", { transition_id: id });
            const current = this.deserialize(raw);
            const next = fn(current.transition);
            const payload = this.serialize({ version: current.version + 1, transition: next });
            const changeKeys = this.changeKeys(next);
            const result = await this.client.eval(UPDATE_SCRIPT, {
                keys: [this.transitionKey(id), ...changeKeys],
                arguments: [String(current.version), id, payload]
            });
            if (result === "OK") {
                await this.updateEscrowExpiry(next);
                return next;
            }
            if (result === "VERSION_MISMATCH") {
                continue;
            }
            if (result === "CONFLICT_CHANGE") {
                throw new ConflictError("Change ID already used for another transition.", {
                    transition_id: id
                });
            }
            if (result === "NOT_FOUND") {
                throw new NotFoundError("Transition not found.", { transition_id: id });
            }
            throw new ConflictError("Failed to update transition.", { result });
        }
        throw new ConflictError("Failed to update transition due to concurrent writes.", { transition_id: id });
    }
    async findByChangeId(changeId) {
        const transitionId = await this.client.get(this.changeKey(changeId));
        if (!transitionId)
            return null;
        return this.get(transitionId);
    }
    transitionKey(id) {
        return `transition:${id}`;
    }
    changeKey(changeId) {
        return `transition:change:${changeId}`;
    }
    escrowKey(id) {
        return `transition:escrow_expiry:${id}`;
    }
    changeKeys(transition) {
        return [
            transition.change_id_prepare,
            transition.change_id_commit,
            transition.change_id_confirm,
            transition.change_id_rollback
        ]
            .filter((value) => Boolean(value))
            .map((changeId) => this.changeKey(changeId));
    }
    serialize(value) {
        return JSON.stringify(value);
    }
    deserialize(raw) {
        return JSON.parse(raw);
    }
    async setEscrowExpiry(transition) {
        if (this.escrowTtlSeconds <= 0)
            return;
        const expiresAt = new Date(Date.now() + this.escrowTtlSeconds * 1000).toISOString();
        await this.client.set(this.escrowKey(transition.transition_id), expiresAt, {
            EX: this.escrowTtlSeconds
        });
    }
    async updateEscrowExpiry(transition) {
        if (transition.status === "confirmed" || transition.status === "rolled_back") {
            await this.client.del(this.escrowKey(transition.transition_id));
            return;
        }
        await this.setEscrowExpiry(transition);
    }
}

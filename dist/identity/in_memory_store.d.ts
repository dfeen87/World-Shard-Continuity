import { IdentityStore } from "./store.js";
import { PlayerIdentity } from "./types.js";
export declare class InMemoryIdentityStore implements IdentityStore {
    private map;
    get(identityId: string): Promise<PlayerIdentity | null>;
    put(identity: PlayerIdentity): Promise<void>;
    mutate(identityId: string, changeId: string, fn: (cur: PlayerIdentity) => PlayerIdentity): Promise<PlayerIdentity>;
}

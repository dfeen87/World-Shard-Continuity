// Copyright (c) Don Michael Feeney Jr. Licensed under the MIT License.

import { PlayerIdentity } from "./types.js";

export interface IdentityStore {
  get(identityId: string): Promise<PlayerIdentity | null>;
  put(identity: PlayerIdentity): Promise<void>;
  mutate(identityId: string, changeId: string, fn: (cur: PlayerIdentity) => PlayerIdentity): Promise<PlayerIdentity>;
}

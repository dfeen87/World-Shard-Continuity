// Licensed under the PolyForm Noncommercial License 1.0.0

import { ShardTransitionFSM } from "../../core/transition/fsm.js";
import { EconomyLedger } from "../../economy/ledger.js";
import { IdentityStore } from "../../identity/store.js";

export interface TransitionContext {
  fsm: ShardTransitionFSM;
  identityStore: IdentityStore;
  ledger: EconomyLedger;
  actor: string;
}

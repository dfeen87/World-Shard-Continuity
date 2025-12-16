import { ShardTransitionFSM } from "../../core/transition/fsm.js";
import { EconomyLedger } from "../../economy/ledger.js";
import { IdentityStore } from "../../identity/store.js";

export interface TransitionContext {
  fsm: ShardTransitionFSM;
  identityStore: IdentityStore;
  ledger: EconomyLedger;
  actor: string;
}

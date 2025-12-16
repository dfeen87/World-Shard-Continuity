import { nowIso } from "./time.js";

export type AuditEvent =
  | { type: "identity.created"; at: string; actor: string; identity_id: string }
  | { type: "identity.mutated"; at: string; actor: string; identity_id: string; change_id: string }
  | { type: "asset.escrowed"; at: string; actor: string; asset_id: string; escrow_id: string }
  | { type: "asset.released"; at: string; actor: string; asset_id: string; escrow_id: string }
  | { type: "transition.started"; at: string; actor: string; transition_id: string; from: string; to: string }
  | { type: "transition.committed"; at: string; actor: string; transition_id: string }
  | { type: "transition.confirmed"; at: string; actor: string; transition_id: string }
  | { type: "transition.rolled_back"; at: string; actor: string; transition_id: string; reason: string };

export interface AuditSink {
  emit(ev: AuditEvent): void;
}

export class ConsoleAuditSink implements AuditSink {
  emit(ev: AuditEvent): void {
    // You can replace this with a file sink, Kafka, DB, etc.
    console.log(JSON.stringify(ev));
  }
}

export function auditNow<T extends Omit<AuditEvent, "at">>(ev: T): AuditEvent {
  return { ...ev, at: nowIso() } as AuditEvent;
}

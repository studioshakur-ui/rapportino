import { insertCoreEvent } from "./coreEvents.api";
import type { CoreEvent, InsertCoreEvent } from "../types";
import {
  buildFieldVerificationEvent,
  type FieldVerificationSource,
  type FieldVerificationStatus,
} from "../../../domain/core-engine";

export interface RecordFieldVerificationInput {
  cableCodeRaw: string;
  cableCodeNormalized: string;
  verificationSource: FieldVerificationSource;
  verificationStatus?: FieldVerificationStatus;
  verifiedBy: string;
  note: string | null;
  appPartenza?: string | null;
  appArrivo?: string | null;
  occurredAt?: string;
}

export async function recordFieldVerification(input: RecordFieldVerificationInput): Promise<CoreEvent> {
  // INCA stays read-only: a field verification is persisted only as a core_event.
  // Callers without a directional outcome (e.g. the generic cable verify button)
  // default to CONNECTED_BOTH — a full positive confirmation.
  const event = buildFieldVerificationEvent({
    cableCodeRaw: input.cableCodeRaw,
    cableCodeNormalized: input.cableCodeNormalized,
    verificationStatus: input.verificationStatus ?? "CONNECTED_BOTH",
    verificationSource: input.verificationSource,
    verifiedBy: input.verifiedBy,
    note: input.note,
    appPartenza: input.appPartenza,
    appArrivo: input.appArrivo,
    occurredAt: input.occurredAt,
  });

  return insertCoreEvent(event as unknown as InsertCoreEvent);
}

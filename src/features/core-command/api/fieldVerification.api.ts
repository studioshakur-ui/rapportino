import { insertCoreEvent } from "./coreEvents.api";
import type { CoreEvent } from "../types";
import type { FieldVerification, FieldVerificationSource, FieldVerificationStatus } from "../../../domain/core-engine";

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
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const verificationStatus = input.verificationStatus ?? "CONNECTED_BOTH";
  const fieldVerification: FieldVerification = {
    cable_code: input.cableCodeNormalized,
    cable_code_normalized: input.cableCodeNormalized,
    verification_status: verificationStatus,
    verification_source: input.verificationSource,
    source: input.verificationSource,
    verified_by: input.verifiedBy,
    verified_at: occurredAt,
    note: input.note ?? null,
    app_partenza: input.appPartenza ?? null,
    app_arrivo: input.appArrivo ?? null,
  };

  return insertCoreEvent({
    event_type: "FIELD_VERIFIED",
    occurred_at: occurredAt,
    source: fieldVerification.source,
    cable_code_raw: input.cableCodeRaw,
    cable_code_normalized: fieldVerification.cable_code_normalized,
    confidence: 1,
    validation_status: "validated",
    raw_text: fieldVerification.note,
    payload: {
      cable_code: fieldVerification.cable_code,
      cable_code_normalized: fieldVerification.cable_code_normalized,
      verification_status: fieldVerification.verification_status,
      source: fieldVerification.source,
      verification_source: fieldVerification.verification_source,
      verified_by: fieldVerification.verified_by,
      verified_at: fieldVerification.verified_at,
      note: fieldVerification.note,
      app_partenza: fieldVerification.app_partenza,
      app_arrivo: fieldVerification.app_arrivo,
    },
  });
}

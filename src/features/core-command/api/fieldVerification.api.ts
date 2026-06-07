import { insertCoreEvent } from "./coreEvents.api";
import type { CoreEvent } from "../types";
import type { FieldVerification, FieldVerificationSource } from "../../../domain/core-engine";

export interface RecordFieldVerificationInput {
  cableCodeRaw: string;
  cableCodeNormalized: string;
  verificationSource: FieldVerificationSource;
  verifiedBy: string;
  note: string | null;
  occurredAt?: string;
}

export async function recordFieldVerification(input: RecordFieldVerificationInput): Promise<CoreEvent> {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const fieldVerification: FieldVerification = {
    cable_code: input.cableCodeNormalized,
    verification_source: input.verificationSource,
    verified_by: input.verifiedBy,
    verified_at: occurredAt,
    note: input.note ?? null,
  };

  return insertCoreEvent({
    event_type: "FIELD_VERIFIED",
    occurred_at: occurredAt,
    source: fieldVerification.verification_source,
    cable_code_raw: input.cableCodeRaw,
    cable_code_normalized: fieldVerification.cable_code,
    confidence: 1,
    validation_status: "validated",
    raw_text: fieldVerification.note,
    payload: {
      verification_source: fieldVerification.verification_source,
      verified_by: fieldVerification.verified_by,
      verified_at: fieldVerification.verified_at,
      note: fieldVerification.note,
    },
  });
}

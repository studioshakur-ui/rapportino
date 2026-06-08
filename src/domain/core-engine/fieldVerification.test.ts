import { describe, expect, it } from "vitest";
import {
  buildFieldVerificationEvent,
  canConfirmFieldVerification,
  FIELD_VERIFICATION_STATUS_OPTIONS,
  formatFieldStatusLabel,
  getFieldVerificationStatusLabel,
  isVerifiedFieldVerificationStatus,
  resolveFieldStatus,
  type FieldVerificationStatus,
} from "./fieldVerification";

describe("fieldVerification", () => {
  it("returns BLOCKED for critical findings", () => {
    expect(resolveFieldStatus({ hasCriticalFinding: true })).toBe("BLOCKED");
  });

  it("returns VERIFIED when field proof exists", () => {
    expect(resolveFieldStatus({ hasVerificationProof: true })).toBe("VERIFIED");
  });

  it("falls back to TO_VERIFY", () => {
    expect(resolveFieldStatus({})).toBe("TO_VERIFY");
    expect(formatFieldStatusLabel("TO_VERIFY")).toBe("Da verificare");
  });

  it("classifies only positive manual statuses as verified", () => {
    expect(isVerifiedFieldVerificationStatus("AT_DESTINATION")).toBe(true);
    expect(isVerifiedFieldVerificationStatus("AT_DEPARTURE")).toBe(true);
    expect(isVerifiedFieldVerificationStatus("CONNECTED_BOTH")).toBe(true);
    expect(isVerifiedFieldVerificationStatus("NOT_FOUND")).toBe(false);
    expect(isVerifiedFieldVerificationStatus("RECHECK")).toBe(false);
    expect(getFieldVerificationStatusLabel("AT_DESTINATION")).toBe("A destinazione");
  });
});

describe("canConfirmFieldVerification", () => {
  it("is not possible without a selected status", () => {
    expect(canConfirmFieldVerification("TO_VERIFY", null)).toBe(false);
    expect(canConfirmFieldVerification("TO_VERIFY", undefined)).toBe(false);
  });

  it("is possible once a status is selected on a to-verify cable", () => {
    expect(canConfirmFieldVerification("TO_VERIFY", "AT_DESTINATION")).toBe(true);
    expect(canConfirmFieldVerification("TO_VERIFY", "NOT_FOUND")).toBe(true);
  });

  it("is never possible on already verified or blocked cables", () => {
    expect(canConfirmFieldVerification("VERIFIED", "AT_DESTINATION")).toBe(false);
    expect(canConfirmFieldVerification("BLOCKED", "AT_DESTINATION")).toBe(false);
  });
});

describe("buildFieldVerificationEvent", () => {
  const base = {
    cableCodeRaw: "I RS 012",
    cableCodeNormalized: "IRS 012",
    verifiedBy: "user-1",
    note: "Foto scattata",
    appPartenza: "415001150002",
    appArrivo: "415001150010",
    occurredAt: "2026-06-08T10:00:00.000Z",
  };

  it("builds a FIELD_VERIFIED core_event containing verification_status", () => {
    const event = buildFieldVerificationEvent({ ...base, verificationStatus: "CONNECTED_BOTH" });

    expect(event.event_type).toBe("FIELD_VERIFIED");
    expect(event.source).toBe("manual");
    expect(event.validation_status).toBe("validated");
    expect(event.payload.verification_status).toBe("CONNECTED_BOTH");
    expect(event.payload.verification_status_label).toBe("Collegato entrambi");
    expect(event.payload.verification_source).toBe("manual");
    expect(event.payload.verified_by).toBe("user-1");
    expect(event.payload.verified_at).toBe("2026-06-08T10:00:00.000Z");
    expect(event.payload.note).toBe("Foto scattata");
    expect(event.payload.app_partenza).toBe("415001150002");
    expect(event.payload.app_arrivo).toBe("415001150010");
    expect(event.payload.cable_code).toBe("IRS 012");
    expect(event.payload.cable_code_normalized).toBe("IRS 012");
  });

  it("downgrades confidence for non-positive outcomes but still records the event", () => {
    const positive = buildFieldVerificationEvent({ ...base, verificationStatus: "AT_DESTINATION" });
    const negative = buildFieldVerificationEvent({ ...base, verificationStatus: "NOT_FOUND" });

    expect(positive.confidence).toBe(1);
    expect(negative.confidence).toBe(0.5);
    expect(negative.payload.verification_status).toBe("NOT_FOUND");
  });

  it("never targets INCA — the event is a core_event only", () => {
    const event = buildFieldVerificationEvent({ ...base, verificationStatus: "AT_DEPARTURE" });
    // INCA stays read-only: no inca_cavi reference is ever produced.
    expect(JSON.stringify(event).toLowerCase()).not.toContain("inca_cavi");
    expect(event.event_type).toBe("FIELD_VERIFIED");
  });

  it("accepts every selectable option", () => {
    for (const option of FIELD_VERIFICATION_STATUS_OPTIONS) {
      const status = option.value as FieldVerificationStatus;
      expect(buildFieldVerificationEvent({ ...base, verificationStatus: status }).payload.verification_status).toBe(status);
    }
  });
});

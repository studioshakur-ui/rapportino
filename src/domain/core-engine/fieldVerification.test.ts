import { describe, expect, it } from "vitest";
import {
  buildFieldVerificationEvent,
  canConfirmFieldVerification,
  deriveCableFieldState,
  deriveForensicCableFieldState,
  FIELD_VERIFICATION_STATUS_OPTIONS,
  formatFieldStatusLabel,
  getFieldVerificationStatusLabel,
  isBlockingFieldVerificationStatus,
  isRealBlocker,
  isVerifiedFieldVerificationStatus,
  resolveFieldStatus,
  type FieldVerificationStatus,
} from "./fieldVerification";

const at = (status: FieldVerificationStatus, occurred_at: string) => ({
  status,
  occurred_at,
});

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
    expect(isVerifiedFieldVerificationStatus("BLOCKED")).toBe(false);
    expect(getFieldVerificationStatusLabel("AT_DESTINATION")).toBe(
      "Trovato ad arrivo",
    );
  });
});

describe("canConfirmFieldVerification", () => {
  it("is not possible without a selected status", () => {
    expect(canConfirmFieldVerification("TO_VERIFY", null)).toBe(false);
    expect(canConfirmFieldVerification("TO_VERIFY", undefined)).toBe(false);
  });

  it("is possible once a status is selected on a to-verify cable", () => {
    expect(canConfirmFieldVerification("TO_VERIFY", "AT_DESTINATION")).toBe(
      true,
    );
    expect(canConfirmFieldVerification("TO_VERIFY", "NOT_FOUND")).toBe(true);
  });

  it("is never possible on already verified or blocked cables", () => {
    expect(canConfirmFieldVerification("VERIFIED", "AT_DESTINATION")).toBe(
      false,
    );
    expect(canConfirmFieldVerification("BLOCKED", "AT_DESTINATION")).toBe(
      false,
    );
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
    const event = buildFieldVerificationEvent({
      ...base,
      verificationStatus: "CONNECTED_BOTH",
    });

    expect(event.event_type).toBe("FIELD_VERIFIED");
    expect(event.source).toBe("manual");
    expect(event.validation_status).toBe("validated");
    expect(event.payload.verification_status).toBe("CONNECTED_BOTH");
    expect(event.payload.verification_status_label).toBe("Trovato a entrambi");
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
    const positive = buildFieldVerificationEvent({
      ...base,
      verificationStatus: "AT_DESTINATION",
    });
    const negative = buildFieldVerificationEvent({
      ...base,
      verificationStatus: "NOT_FOUND",
    });

    expect(positive.confidence).toBe(1);
    expect(negative.confidence).toBe(0.5);
    expect(negative.payload.verification_status).toBe("NOT_FOUND");
  });

  it("never targets INCA — the event is a core_event only", () => {
    const event = buildFieldVerificationEvent({
      ...base,
      verificationStatus: "AT_DEPARTURE",
    });
    // INCA stays read-only: no inca_cavi reference is ever produced.
    expect(JSON.stringify(event).toLowerCase()).not.toContain("inca_cavi");
    expect(event.event_type).toBe("FIELD_VERIFIED");
  });

  it("accepts every selectable option", () => {
    for (const option of FIELD_VERIFICATION_STATUS_OPTIONS) {
      const status = option.value as FieldVerificationStatus;
      expect(
        buildFieldVerificationEvent({ ...base, verificationStatus: status })
          .payload.verification_status,
      ).toBe(status);
    }
  });
});

describe("FIELD_VERIFICATION_STATUS_OPTIONS (6 azioni esplicite)", () => {
  it("exposes the six explicit Italian actions including Bloccato", () => {
    expect(FIELD_VERIFICATION_STATUS_OPTIONS.map((o) => o.label)).toEqual([
      "Trovato a partenza",
      "Trovato ad arrivo",
      "Trovato a entrambi",
      "Non trovato",
      "Da ricontrollare",
      "Bloccato",
    ]);
    const blocked = FIELD_VERIFICATION_STATUS_OPTIONS.find(
      (o) => o.value === "BLOCKED",
    );
    expect(blocked?.isBlocker).toBe(true);
    expect(blocked?.countsAsVerified).toBe(false);
    expect(isBlockingFieldVerificationStatus("BLOCKED")).toBe(true);
    expect(isBlockingFieldVerificationStatus("CONNECTED_BOTH")).toBe(false);
  });
});

describe("deriveCableFieldState (2 assi partenza/arrivo)", () => {
  it("two separate single-end verifications accumulate to collegato", () => {
    const s = deriveCableFieldState([
      at("AT_DEPARTURE", "2026-06-01T08:00:00Z"),
      at("AT_DESTINATION", "2026-06-02T08:00:00Z"),
    ]);
    expect(s.stato_partenza).toBe("trovato");
    expect(s.stato_arrivo).toBe("trovato");
    expect(s.status).toBe("collegato");
  });

  it("one end only is parziale (never squashed to verificato)", () => {
    const s = deriveCableFieldState([
      at("AT_DEPARTURE", "2026-06-01T08:00:00Z"),
    ]);
    expect(s.stato_partenza).toBe("trovato");
    expect(s.stato_arrivo).toBe("ignoto");
    expect(s.status).toBe("parziale");
  });

  it("arrivo only is parziale and misses partenza", () => {
    const s = deriveCableFieldState([
      at("AT_DESTINATION", "2026-06-01T08:00:00Z"),
    ]);
    expect(s.stato_partenza).toBe("ignoto");
    expect(s.stato_arrivo).toBe("trovato");
    expect(s.status).toBe("parziale");
  });

  it("CONNECTED_BOTH is immediately collegato", () => {
    expect(
      deriveCableFieldState([at("CONNECTED_BOTH", "2026-06-01T08:00:00Z")])
        .status,
    ).toBe("collegato");
  });

  it("NOT_FOUND / RECHECK / empty", () => {
    expect(
      deriveCableFieldState([at("NOT_FOUND", "2026-06-01T08:00:00Z")]).status,
    ).toBe("non_trovato");
    expect(
      deriveCableFieldState([at("RECHECK", "2026-06-01T08:00:00Z")]).status,
    ).toBe("da_rivedere");
    expect(deriveCableFieldState([]).status).toBe("da_verificare");
  });

  it("BLOCKED sets bloccato; a later TROVATO clears it", () => {
    expect(
      deriveCableFieldState([at("BLOCKED", "2026-06-01T08:00:00Z")]).status,
    ).toBe("bloccato");
    const cleared = deriveCableFieldState([
      at("BLOCKED", "2026-06-01T08:00:00Z"),
      at("CONNECTED_BOTH", "2026-06-02T08:00:00Z"),
    ]);
    expect(cleared.is_blocked).toBe(false);
    expect(cleared.status).toBe("collegato");
  });
});

describe("isRealBlocker (unica fonte di verità)", () => {
  it("is a real blocker on strong proof only", () => {
    expect(isRealBlocker({ incaIsBlocked: true })).toBe(true);
    expect(isRealBlocker({ fieldStatus: "bloccato" })).toBe(true);
    expect(isRealBlocker({ computedStatus: "blocked" })).toBe(true);
    expect(isRealBlocker({ hasOpenBlockingFinding: true })).toBe(true);
  });

  it("never confuses da-verificare / parziale / non-trovato with bloccato", () => {
    expect(isRealBlocker({ fieldStatus: "da_verificare" })).toBe(false);
    expect(isRealBlocker({ fieldStatus: "parziale" })).toBe(false);
    expect(isRealBlocker({ fieldStatus: "non_trovato" })).toBe(false);
    expect(isRealBlocker({})).toBe(false);
  });
});

describe("deriveForensicCableFieldState", () => {
  it("ignores ambiguous and related evidence for the main status", () => {
    const s = deriveForensicCableFieldState([
      {
        status: "CONNECTED_BOTH",
        occurred_at: "2026-06-01T08:00:00Z",
        evidence_bucket: "ambiguous",
      },
      {
        status: "BLOCKED",
        occurred_at: "2026-06-02T08:00:00Z",
        evidence_bucket: "related",
      },
    ]);
    expect(s.status).toBe("da_verificare");
  });

  it("lets linked evidence influence the main status", () => {
    const s = deriveForensicCableFieldState([
      {
        status: "AT_DEPARTURE",
        occurred_at: "2026-06-01T08:00:00Z",
        evidence_bucket: "linked",
      },
    ]);
    expect(s.stato_partenza).toBe("trovato");
    expect(s.status).toBe("parziale");
  });

  it("lets manual capo validation influence the main status", () => {
    const s = deriveForensicCableFieldState([
      {
        status: "CONNECTED_BOTH",
        occurred_at: "2026-06-01T08:00:00Z",
        evidence_bucket: "related",
        is_manual_validation: true,
      },
    ]);
    expect(s.status).toBe("collegato");
  });
});

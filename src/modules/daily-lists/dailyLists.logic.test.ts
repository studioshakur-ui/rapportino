import { describe, expect, it } from "vitest";
import { buildItemVM, computeItemStatus } from "./dailyLists.logic";
import type { DailyItemEvidence, DailyListItem } from "./dailyLists.types";

const baseItem: DailyListItem = {
  id: "item-1",
  import_id: "import-1",
  list_number: null,
  list_resolution_date: null,
  cable_code_raw: "I RS 012",
  cable_code_normalized: "IRS 012",
  inca_cavo_id: "inca-1",
  stato_collegamento: null,
  app_partenza: null,
  app_arrivo: null,
  perimetro: null,
  data_perimetro: null,
  situazione_inca: null,
  note: null,
  priority_level: null,
  planned_status: null,
  created_at: "2026-06-07T00:00:00.000Z",
};

describe("dailyLists.logic", () => {
  it("treats manual field verification as confirmed_field", () => {
    const evidence: DailyItemEvidence[] = [
      {
        cable_event_id: null,
        core_event_id: "core-1",
        whatsapp_message_id: null,
        source_type: "manual",
        event_kind: "FIELD_VERIFIED",
        occurred_at: "2026-06-07T10:00:00.000Z",
        actor_label: "Hamid",
        raw_note: "Verifica sul campo",
        last_message: "Verifica sul campo",
        confidence: 1,
        progress_percent: null,
        verification_status: "AT_DESTINATION",
      },
    ];

    expect(computeItemStatus(baseItem, evidence, false)).toBe("confirmed_field");
    expect(buildItemVM(baseItem, evidence, false).confirmed_by_whatsapp).toBe(false);
    expect(buildItemVM(baseItem, evidence, false).computed_status).toBe("confirmed_field");
  });

  it("keeps manual non-found evidence in to_verify", () => {
    const evidence: DailyItemEvidence[] = [
      {
        cable_event_id: null,
        core_event_id: "core-2",
        whatsapp_message_id: null,
        source_type: "manual",
        event_kind: "FIELD_VERIFIED",
        occurred_at: "2026-06-07T10:05:00.000Z",
        actor_label: "Hamid",
        raw_note: "Non trovato",
        last_message: "Non trovato",
        confidence: 1,
        progress_percent: null,
        verification_status: "NOT_FOUND",
      },
    ];

    expect(computeItemStatus(baseItem, evidence, false)).toBe("to_verify");
  });
});

function manualVerification(status: string | null): DailyItemEvidence {
  return {
    cable_event_id: null,
    core_event_id: "core-1",
    whatsapp_message_id: null,
    source_type: "manual",
    event_kind: "FIELD_VERIFIED",
    occurred_at: "2026-06-07T10:00:00.000Z",
    actor_label: "Hamid",
    raw_note: "Verifica sul campo",
    last_message: "Verifica sul campo",
    confidence: 1,
    progress_percent: null,
    verification_status: status,
  };
}

function manualVerificationAt(status: string, occurred_at: string): DailyItemEvidence {
  return { ...manualVerification(status), occurred_at };
}

describe("dailyLists.logic — Bloccato (blocco reale)", () => {
  it("a manual Bloccato makes the cable blocked (not to_verify)", () => {
    expect(computeItemStatus(baseItem, [manualVerification("BLOCKED")], false)).toBe("blocked");
  });

  it("a later TROVATO clears the manual block", () => {
    const evidence = [
      manualVerificationAt("BLOCKED", "2026-06-01T08:00:00.000Z"),
      manualVerificationAt("CONNECTED_BOTH", "2026-06-02T08:00:00.000Z"),
    ];
    expect(computeItemStatus(baseItem, evidence, false)).toBe("confirmed_field");
  });
});

describe("dailyLists.logic — directional field verification", () => {
  it("A destinazione / In partenza / Collegato entrambi → confirmed_field (VERIFIED)", () => {
    expect(computeItemStatus(baseItem, [manualVerification("AT_DESTINATION")], false)).toBe("confirmed_field");
    expect(computeItemStatus(baseItem, [manualVerification("AT_DEPARTURE")], false)).toBe("confirmed_field");
    expect(computeItemStatus(baseItem, [manualVerification("CONNECTED_BOTH")], false)).toBe("confirmed_field");
  });

  it("Non trovato / Da ricontrollare → to_verify (stays TO_VERIFY, never blocked)", () => {
    const notFound = computeItemStatus(baseItem, [manualVerification("NOT_FOUND")], false);
    const recheck = computeItemStatus(baseItem, [manualVerification("RECHECK")], false);
    expect(notFound).toBe("to_verify");
    expect(recheck).toBe("to_verify");
    expect(notFound).not.toBe("blocked");
    expect(recheck).not.toBe("blocked");
  });

  it("a positive verification wins over an earlier non-positive one", () => {
    const evidence = [manualVerification("NOT_FOUND"), manualVerification("CONNECTED_BOTH")];
    expect(computeItemStatus(baseItem, evidence, false)).toBe("confirmed_field");
  });

  it("INCA block (open finding) stays BLOCKED regardless of verification", () => {
    expect(computeItemStatus(baseItem, [manualVerification("NOT_FOUND")], true)).toBe("blocked");
    expect(computeItemStatus(baseItem, [manualVerification("CONNECTED_BOTH")], true)).toBe("blocked");
  });

  it("a non-blocked cable (INCA P) never becomes BLOCKED via verification", () => {
    const posato = { ...baseItem, situazione_inca: "P" };
    expect(computeItemStatus(posato, [manualVerification("NOT_FOUND")], false)).toBe("to_verify");
    expect(computeItemStatus(posato, [manualVerification("RECHECK")], false)).not.toBe("blocked");
  });

  it("legacy manual evidence without a status stays confirmed_field", () => {
    expect(computeItemStatus(baseItem, [manualVerification(null)], false)).toBe("confirmed_field");
  });
});

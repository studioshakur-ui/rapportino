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
      proof_source: "manual",
      proof_source_type: "manual_validation",
      confidence: 1,
      confidence_reason: null,
      progress_percent: null,
      verification_status: "AT_DESTINATION",
      extracted_cable_codes: ["IRS 012"],
      extracted_equipment_codes: [],
      extracted_eswbs: [],
      detected_position: "arrivo",
      detected_status: "Trovato a arrivo",
      requires_human_validation: false,
      recommended_action: "valida prova",
      incoherence_reason: null,
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
        proof_source: "manual",
        proof_source_type: "manual_validation",
        confidence: 1,
        confidence_reason: null,
        progress_percent: null,
        verification_status: "NOT_FOUND",
        extracted_cable_codes: ["IRS 012"],
        extracted_equipment_codes: [],
        extracted_eswbs: [],
        detected_position: "sconosciuto",
        detected_status: "Non trovato",
        requires_human_validation: false,
        recommended_action: "ricontrolla in campo",
        incoherence_reason: null,
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
    proof_source: "manual",
    proof_source_type: "manual_validation",
    confidence: 1,
    confidence_reason: null,
    progress_percent: null,
    verification_status: status,
    extracted_cable_codes: ["IRS 012"],
    extracted_equipment_codes: [],
    extracted_eswbs: [],
    detected_position: "sconosciuto",
    detected_status: null,
    requires_human_validation: false,
    recommended_action: "valida prova",
    incoherence_reason: null,
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

  it("keeps a clear Telegram proof in to_verify until manual validation", () => {
    const evidence: DailyItemEvidence[] = [
      {
        cable_event_id: null,
        core_event_id: "core-ai-1",
        whatsapp_message_id: "msg-1",
        source_type: "core_event",
        proof_source: "telegram",
        proof_source_type: "telegram_text",
        event_kind: "CABLE_MENTION",
        occurred_at: "2026-06-07T12:00:00.000Z",
        actor_label: "Team A",
        raw_note: "IRS 012 trovato arrivo",
        last_message: "IRS 012 trovato arrivo",
        confidence: 0.9,
        confidence_reason: "Codice cavo riconosciuto e posizione esplicita",
        progress_percent: null,
        verification_status: null,
        extracted_cable_codes: ["IRS 012"],
        extracted_equipment_codes: [],
        extracted_eswbs: [],
        detected_position: "arrivo",
        detected_status: "Trovato a arrivo",
        requires_human_validation: true,
        recommended_action: "valida prova",
        incoherence_reason: null,
      },
    ];

    const item = buildItemVM(baseItem, evidence, false);

    expect(computeItemStatus(baseItem, evidence, false)).toBe("to_verify");
    expect(item.requires_human_validation).toBe(true);
    expect(item.latest_detected_status).toBe("Trovato a arrivo");
    expect(item.recommended_action).toBe("valida prova");
  });

  it("marks contradictory proof as to_verify with an incoherence action", () => {
    const evidence: DailyItemEvidence[] = [
      {
        cable_event_id: null,
        core_event_id: "core-ai-2",
        whatsapp_message_id: "msg-2",
        source_type: "core_event",
        proof_source: "telegram",
        proof_source_type: "telegram_text",
        event_kind: "CABLE_MENTION",
        occurred_at: "2026-06-07T13:00:00.000Z",
        actor_label: "Team B",
        raw_note: "IRS 012 arrivo ok ma INCA diverso",
        last_message: "IRS 012 arrivo ok ma INCA diverso",
        confidence: 0.72,
        confidence_reason: "Conflitto con stato precedente",
        progress_percent: null,
        verification_status: null,
        extracted_cable_codes: ["IRS 012"],
        extracted_equipment_codes: [],
        extracted_eswbs: [],
        detected_position: "arrivo",
        detected_status: "Da validare",
        requires_human_validation: true,
        recommended_action: "ricontrolla in campo",
        incoherence_reason: "Incoerenza da verificare",
      },
    ];

    const item = buildItemVM(baseItem, evidence, false);

    expect(item.computed_status).toBe("to_verify");
    expect(item.has_incoherence).toBe(true);
    expect(item.recommended_action).toBe("ricontrolla in campo");
  });

  it("keeps a partenza + arrivo Telegram proof as to_verify without defaulting to CONNECTED_BOTH", () => {
    const evidence: DailyItemEvidence[] = [
      {
        cable_event_id: null,
        core_event_id: "core-ai-3",
        whatsapp_message_id: "msg-3",
        source_type: "core_event",
        proof_source: "telegram",
        proof_source_type: "telegram_text",
        event_kind: "CABLE_MENTION",
        occurred_at: "2026-06-07T14:00:00.000Z",
        actor_label: "Team C",
        raw_note: "IRS 012 partenza ok arrivo ok",
        last_message: "IRS 012 partenza ok arrivo ok",
        confidence: 0.91,
        confidence_reason: "Entrambe le estremità sono nominate nel testo",
        progress_percent: null,
        verification_status: null,
        extracted_cable_codes: ["IRS 012"],
        extracted_equipment_codes: [],
        extracted_eswbs: [],
        detected_position: "entrambi",
        detected_status: "Trovato a entrambi",
        requires_human_validation: true,
        recommended_action: "valida prova",
        incoherence_reason: null,
      },
    ];

    const item = buildItemVM(baseItem, evidence, false);

    expect(item.computed_status).toBe("to_verify");
    expect(item.latest_detected_status).toBe("Trovato a entrambi");
    expect(item.last_event_type).not.toBe("CONNECTED_BOTH");
  });

  it("keeps a Telegram partial percentage in to_verify", () => {
    const evidence: DailyItemEvidence[] = [
      {
        cable_event_id: null,
        core_event_id: "core-ai-4",
        whatsapp_message_id: "msg-4",
        source_type: "core_event",
        proof_source: "telegram",
        proof_source_type: "telegram_text",
        event_kind: "CABLE_MENTION",
        occurred_at: "2026-06-07T15:00:00.000Z",
        actor_label: "Team D",
        raw_note: "TCC 021 posato 70%",
        last_message: "TCC 021 posato 70%",
        confidence: 0.82,
        confidence_reason: "Percentuale esplicita ma non finale",
        progress_percent: 70,
        verification_status: null,
        extracted_cable_codes: ["TCC 021"],
        extracted_equipment_codes: [],
        extracted_eswbs: [],
        detected_position: "sconosciuto",
        detected_status: "Parziale",
        requires_human_validation: true,
        recommended_action: "chiedi conferma al team",
        incoherence_reason: null,
      },
    ];

    expect(buildItemVM(baseItem, evidence, false).computed_status).toBe("to_verify");
  });

  it("keeps an OCR low-confidence proof in to_verify", () => {
    const evidence: DailyItemEvidence[] = [
      {
        cable_event_id: null,
        core_event_id: "core-ai-5",
        whatsapp_message_id: "msg-5",
        source_type: "core_event",
        proof_source: "telegram",
        proof_source_type: "ocr_photo",
        event_kind: "CABLE_MENTION",
        occurred_at: "2026-06-07T16:00:00.000Z",
        actor_label: "OCR",
        raw_note: "foto OCR debole",
        last_message: "foto OCR debole",
        confidence: 0.35,
        confidence_reason: "Testo poco leggibile",
        progress_percent: null,
        verification_status: null,
        extracted_cable_codes: [],
        extracted_equipment_codes: [],
        extracted_eswbs: [],
        detected_position: "sconosciuto",
        detected_status: "Da validare",
        requires_human_validation: true,
        recommended_action: "mantieni da validare",
        incoherence_reason: null,
      },
    ];

    const item = buildItemVM(baseItem, evidence, false);
    expect(item.computed_status).toBe("to_verify");
    expect(item.recommended_action).toBe("mantieni da validare");
  });

  it("keeps an OCR unrecognized cable as to_verify with explicit action", () => {
    const evidence: DailyItemEvidence[] = [
      {
        cable_event_id: null,
        core_event_id: "core-ai-6",
        whatsapp_message_id: "msg-6",
        source_type: "core_event",
        proof_source: "telegram",
        proof_source_type: "ocr_photo",
        event_kind: "CABLE_MENTION",
        occurred_at: "2026-06-07T17:00:00.000Z",
        actor_label: "OCR",
        raw_note: "foto senza cavo riconosciuto",
        last_message: "foto senza cavo riconosciuto",
        confidence: 0.3,
        confidence_reason: "OCR senza codice cavo affidabile",
        progress_percent: null,
        verification_status: null,
        extracted_cable_codes: [],
        extracted_equipment_codes: ["415001120001"],
        extracted_eswbs: ["415001120001"],
        detected_position: "sconosciuto",
        detected_status: "Cavo non riconosciuto",
        requires_human_validation: true,
        recommended_action: "associa a cavo",
        incoherence_reason: null,
      },
    ];

    const item = buildItemVM(baseItem, evidence, false);
    expect(item.computed_status).toBe("to_verify");
    expect(item.latest_detected_status).toBe("Cavo non riconosciuto");
    expect(item.recommended_action).toBe("associa a cavo");
  });
});

describe("dailyLists.logic — INCA numeric status without field message", () => {
  it("keeps W SF 080 as to_verify when INCA says side 2 is connected", () => {
    const item: DailyListItem = {
      ...baseItem,
      cable_code_raw: "W SF 080",
      cable_code_normalized: "WSF 080",
      stato_collegamento: "2",
      situazione_inca: "2",
      app_partenza: "436001040001",
      app_arrivo: "436001080001",
      perimetro: "SFN",
    };

    expect(computeItemStatus(item, [], false)).toBe("to_verify");
  });

  it("treats fully connected INCA C as usable even without WhatsApp evidence", () => {
    expect(computeItemStatus({ ...baseItem, situazione_inca: "C" }, [], false)).toBe("likely_laid");
  });
});

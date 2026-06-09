import { describe, expect, it } from "vitest";
import { buildDailySituationView } from "./dailySituation";
import { buildSdcCableLookup } from "./sdc";

type SituationInput = Parameters<typeof buildDailySituationView>[0];

function makeCard(overrides: Partial<SituationInput["field"]["priority_items"][number]>): SituationInput["field"]["priority_items"][number] {
  return {
    cable_code_raw: "I RS 012",
    cable_code: "IRS012",
    display_cable_code: "I RS 012",
    cable_story_path: "/cable/IRS012",
    perimetro: "RACK A DATA CENTER C2",
    app_partenza: "415001120001",
    app_arrivo: null,
    stato_collegamento: "P",
    situazione_inca: "P",
    note: null,
    computed_status: "no_evidence",
    evidence_count: 0,
    last_event_at: "2026-06-06T05:37:00Z",
    last_actor: "WhatsApp",
    last_message: "I RS 012 OK",
    recommended_action: "Richiedere conferma",
    confirmed_by_whatsapp: false,
    missing_evidence: true,
    has_partial_progress: false,
    has_short_issue: false,
    has_missing_issue: false,
    ...overrides,
  };
}

function buildEmptyInput(): SituationInput {
  return {
    today: {
      latest_import: null,
      summary: null,
      open_priorities: [],
      metrics: {
        total_cables: 0,
        confirmed_cables: 0,
        remaining_cables: 0,
        blocked_cables: 0,
        open_systems: 0,
        blocked_systems: 0,
        open_equipments: 0,
        blocked_equipments: 0,
        telegram_impacts: 0,
      },
      critical_closures: [],
      telegram_impacts: [],
    },
    field: {
      imports: [],
      summary: null,
      priority_items: [],
      missing_evidence_items: [],
      partial_items: [],
      blocked_items: [],
    },
    apparatus: {
      systems: [],
      equipments: [],
    },
  };
}

function buildBaseInput(): SituationInput {
  const sdc = buildSdcCableLookup([
    {
      cable_code_raw: "IRS012",
      app_partenza: "415001120001",
      app_arrivo: null,
      perimetro: "RACK A DATA CENTER C2",
      sistema: "RACK A DATA CENTER C2",
      sottosistema: "RACK A",
      situazione_inca: "P",
      note: "AREA RACK A",
      locale: "Locale A",
      area: "AREA RACK A",
    },
    {
      cable_code_raw: "WTI036",
      app_partenza: "415001150002",
      app_arrivo: "415001150003",
      perimetro: "RACK B DATA CENTER C1",
      sistema: "RACK B DATA CENTER C1",
      sottosistema: "RACK B",
      situazione_inca: "P",
      note: "AREA RACK B",
      locale: "Locale B",
      area: "AREA RACK B",
    },
    {
      cable_code_raw: "FSG002",
      app_partenza: "415001130001",
      app_arrivo: "415001130002",
      perimetro: "RACK C DATA CENTER C3",
      sistema: "RACK C DATA CENTER C3",
      sottosistema: "RACK C",
      situazione_inca: "P",
      note: "AREA RACK C",
      locale: "Locale C",
      area: "AREA RACK C",
    },
    {
      cable_code_raw: "TCK621",
      app_partenza: "415001110001",
      app_arrivo: "415001110002",
      perimetro: "RACK A DATA CENTER C2",
      sistema: "RACK A DATA CENTER C2",
      sottosistema: "RACK A",
      situazione_inca: "B",
      note: "AREA RACK A",
      locale: "Locale A",
      area: "AREA RACK A",
    },
  ]);

  const proof1 = makeCard({
    cable_code_raw: "R IF 008",
    cable_code: "RIF008",
    display_cable_code: "R IF 008",
    app_partenza: "415001120001",
    perimetro: "RACK A DATA CENTER C2",
    last_event_at: "2026-06-06T05:37:00Z",
    last_actor: "WhatsApp",
    last_message: "R IF 008 OK",
    confirmed_by_whatsapp: true,
    missing_evidence: false,
    computed_status: "confirmed_field",
  });

  const proof2 = makeCard({
    cable_code_raw: "T CE 020",
    cable_code: "TCE020",
    display_cable_code: "T CE 020",
    app_partenza: "415001150002",
    perimetro: "RACK B DATA CENTER C1",
    last_event_at: "2026-06-06T05:37:00Z",
    last_actor: "WhatsApp",
    last_message: "T CE 020 OK",
    confirmed_by_whatsapp: true,
    missing_evidence: false,
    computed_status: "confirmed_field",
  });

  const proof3 = makeCard({
    cable_code_raw: "C CS 503",
    cable_code: "CCS503",
    display_cable_code: "C CS 503",
    app_partenza: "415001150002",
    perimetro: "RACK B DATA CENTER C1",
    last_event_at: "2026-06-06T05:37:00Z",
    last_actor: "WhatsApp",
    last_message: "C CS 503 OK",
    confirmed_by_whatsapp: true,
    missing_evidence: false,
    computed_status: "confirmed_field",
  });

  return {
    today: {
      latest_import: {
        id: "import-1",
        file_name: "L3.pdf",
        list_date: "2026-06-05",
        rows_count: 50,
      },
      summary: {
        import_id: "import-1",
        list_date: "2026-06-05",
        file_name: "L3.pdf",
        total: 50,
        confirmed: 40,
        likely_laid: 0,
        to_verify: 10,
        no_evidence: 10,
        missing: 0,
        blocked: 0,
        outside_inca: 0,
        confirmed_by_whatsapp: 3,
        missing_evidence: 10,
        short_issues: 0,
        missing_issues: 0,
        partial_progress: 0,
        by_perimeter: [],
        tomorrow_actions: [],
      },
      open_priorities: [],
      metrics: {
        total_cables: 50,
        confirmed_cables: 40,
        remaining_cables: 10,
        blocked_cables: 0,
        open_systems: 1,
        blocked_systems: 0,
        open_equipments: 2,
        blocked_equipments: 0,
        telegram_impacts: 2,
      },
      critical_closures: [],
      telegram_impacts: [
        {
          message_id: "msg-1",
          message_ts: "2026-06-06T05:37:00Z",
          text: "I RS 012 OK",
          cable_codes: ["I RS 012", "T CE 020", "C CS 503"],
          systems: ["RACK A"],
          before_label: "15/16",
          after_label: "16/16",
          system_closed: true,
        },
        {
          message_id: "msg-2",
          message_ts: "2026-06-06T09:11:00Z",
          text: "C CS 574 OK",
          cable_codes: ["C CS 574"],
          systems: ["RACK B"],
          before_label: "26/27",
          after_label: "27/27",
          system_closed: false,
        },
      ],
    },
    field: {
      imports: [
        {
          id: "import-1",
          file_name: "L3.pdf",
          list_date: "2026-06-05",
          rows_count: 50,
        },
      ],
      summary: {
        import_id: "import-1",
        list_date: "2026-06-05",
        file_name: "L3.pdf",
        total: 50,
        confirmed: 40,
        likely_laid: 0,
        to_verify: 10,
        no_evidence: 10,
        missing: 0,
        blocked: 0,
        outside_inca: 0,
        confirmed_by_whatsapp: 3,
        missing_evidence: 10,
        short_issues: 0,
        missing_issues: 0,
        partial_progress: 0,
        by_perimeter: [],
        tomorrow_actions: [],
      },
      priority_items: [proof1, proof2, proof3],
      missing_evidence_items: [
        makeCard({
          cable_code_raw: "I RS 012",
          cable_code: "IRS012",
          display_cable_code: "I RS 012",
          app_partenza: "415001120001",
          perimetro: "RACK A DATA CENTER C2",
          computed_status: "no_evidence",
          missing_evidence: true,
          confirmed_by_whatsapp: false,
          last_event_at: null,
          last_actor: null,
          last_message: null,
          note: null,
        }),
        makeCard({
          cable_code_raw: "W TI 036",
          cable_code: "WTI036",
          display_cable_code: "W TI 036",
          app_partenza: "415001150002",
          perimetro: "RACK B DATA CENTER C1",
          computed_status: "no_evidence",
          missing_evidence: true,
          confirmed_by_whatsapp: false,
          last_event_at: null,
          last_actor: null,
          last_message: null,
          note: null,
        }),
      ],
      partial_items: [],
      blocked_items: [],
    },
    apparatus: {
      systems: [
        {
          system: "Rack A Data Center C2",
          zone: "Zona A",
          total_equipments: 2,
          closed_equipments: 1,
          open_equipments: 1,
          blocked_equipments: 0,
          closure_status: "PARTIAL",
          completion_rate: 50,
          critical_path: [],
          equipment_codes: ["415001120001", "415001120002"],
        },
        {
          system: "Rack B Data Center C1",
          zone: "Zona B",
          total_equipments: 1,
          closed_equipments: 0,
          open_equipments: 1,
          blocked_equipments: 0,
          closure_status: "PARTIAL",
          completion_rate: 0,
          critical_path: [],
          equipment_codes: ["415001150002"],
        },
      ],
      equipments: [
        {
          equipment_code: "415001120001",
          equipment_name: "App 1",
          zone: "Zona A",
          system: "Rack A Data Center C2",
          closure_status: "PARTIAL",
          risk_level: "high",
          total_cables: 4,
          confirmed_cables: 3,
          open_cables: 1,
          blocked_cables: 0,
          without_field_evidence: 1,
          status_distribution: { P: 2, C: 1 },
          recommended_actions: ["azione 1"],
          completion_rate: 75,
          blocker: null,
          critical_path: [],
          route: "/equipment/415001120001",
          confirmed: false,
        },
        {
          equipment_code: "415001150002",
          equipment_name: "App 2",
          zone: "Zona B",
          system: "Rack B Data Center C1",
          closure_status: "PARTIAL",
          risk_level: "medium",
          total_cables: 2,
          confirmed_cables: 0,
          open_cables: 2,
          blocked_cables: 0,
          without_field_evidence: 2,
          status_distribution: { P: 2 },
          recommended_actions: [],
          completion_rate: 0,
          blocker: null,
          critical_path: [],
          route: "/equipment/415001150002",
          confirmed: false,
        },
      ],
    },
    sdc,
  };
}

describe("buildDailySituationView", () => {
  it("keeps non-proof cables out of real blockers", () => {
    const result = buildDailySituationView(buildBaseInput());

    expect(result.toVerifyCables.map((item) => item.displayCableCode)).toContain("I RS 012");
    expect(result.realBlockers.map((item) => item.displayCableCode)).not.toContain("I RS 012");
    expect(result.messageToSend).toContain("Cavi da verificare:");
    expect(result.messageToSend).not.toContain("Bloccanti reali:\n- I RS 012");
  });

  it("treats INCA B as a real blocker", () => {
    const input = buildBaseInput();
    input.field.blocked_items = [
      makeCard({
        cable_code_raw: "T CK 621",
        cable_code: "TCK621",
        display_cable_code: "T CK 621",
        app_partenza: "415001110001",
        perimetro: "RACK A DATA CENTER C2",
        situazione_inca: "B",
        stato_collegamento: "B",
        computed_status: "blocked",
        missing_evidence: false,
        confirmed_by_whatsapp: false,
      }),
    ];

    const result = buildDailySituationView(input);

    expect(result.realBlockers.map((item) => item.displayCableCode)).toContain("T CK 621");
    expect(result.totals.blockedCables).toBe(1);
  });

  it("keeps the original cable mark in the output", () => {
    const result = buildDailySituationView(buildBaseInput());

    expect(result.messageToSend).toContain("I RS 012");
    expect(result.messageToSend).not.toContain("IRS 012");
  });

  it("matches compact and spaced cable variants without false missing messages", () => {
    const result = buildDailySituationView(buildBaseInput());

    expect(result.toVerifyCables.map((item) => item.displayCableCode)).toContain("W TI 036");
    expect(result.toVerifyCables.find((item) => item.displayCableCode === "W TI 036")?.area).toBe("AREA RACK B");
    expect(result.messageToSend).not.toContain("Cavo non trovato in INCA");
  });

  it("extracts the system from the note when present", () => {
    const input = buildBaseInput();
    input.field.missing_evidence_items = [
      makeCard({
        cable_code_raw: "C CS 629",
        cable_code: "CCS629",
        display_cable_code: "C CS 629",
        perimetro: null,
        note: "PRIORITA' ASSOLUTA LATO RACK B DATA CENTER C1",
        app_partenza: "415001150002",
        computed_status: "no_evidence",
        missing_evidence: true,
        confirmed_by_whatsapp: false,
      }),
    ];
    input.field.priority_items = [...input.field.missing_evidence_items];

    const result = buildDailySituationView(input);

    expect(result.toVerifyCables[0]?.system).toBe("Rack B Data Center C1");
    expect(result.messageToSend).toContain("Rack B Data Center C1");
  });

  it("deduplicates WhatsApp evidence groups", () => {
    const input = buildBaseInput();
    input.field.priority_items = [
      makeCard({
        cable_code_raw: "R IF 008",
        cable_code: "RIF008",
        display_cable_code: "R IF 008",
        last_event_at: "2026-06-06T05:37:00Z",
        last_actor: "WhatsApp",
        last_message: "15 cables recognized",
        confirmed_by_whatsapp: true,
        missing_evidence: false,
        computed_status: "confirmed_field",
      }),
      makeCard({
        cable_code_raw: "T CE 020",
        cable_code: "TCE020",
        display_cable_code: "T CE 020",
        last_event_at: "2026-06-06T05:37:00Z",
        last_actor: "WhatsApp",
        last_message: "15 cables recognized",
        confirmed_by_whatsapp: true,
        missing_evidence: false,
        computed_status: "confirmed_field",
      }),
      makeCard({
        cable_code_raw: "C CS 503",
        cable_code: "CCS503",
        display_cable_code: "C CS 503",
        last_event_at: "2026-06-06T05:37:00Z",
        last_actor: "WhatsApp",
        last_message: "15 cables recognized",
        confirmed_by_whatsapp: true,
        missing_evidence: false,
        computed_status: "confirmed_field",
      }),
    ];

    const result = buildDailySituationView(input);

    expect(result.fieldEvidenceGroups).toHaveLength(1);
    expect(result.messageToSend).toContain("3 cavi riconosciuti");
  });

  it("separates situation and list dates", () => {
    const result = buildDailySituationView(buildBaseInput());

    expect(result.messageToSend).toContain("Data situazione:");
    expect(result.messageToSend).toContain("Data lista:");
    expect(result.messageToSend).toContain("Lista:");
  });

  it("returns an empty situation view when no data exists", () => {
    const result = buildDailySituationView(buildEmptyInput());

    expect(result.toVerifyCables).toEqual([]);
    expect(result.realBlockers).toEqual([]);
    expect(result.fieldEvidenceGroups).toEqual([]);
    expect(result.totals).toEqual({
      totalCables: 0,
      verifiedCables: 0,
      remainingCables: 0,
      blockedCables: 0,
      withoutFieldEvidence: 0,
      toVerifyCables: 0,
    });
    expect(result.messageToSend).toContain("Nessun blocco reale dichiarato.");
    expect(result.messageToSend).toContain("Nessuna prova campo disponibile");
  });
});

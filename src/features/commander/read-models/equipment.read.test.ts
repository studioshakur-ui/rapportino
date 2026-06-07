import { describe, expect, it, vi } from "vitest";

vi.mock("../../../domain/core-engine", () => ({
  loadCoreEngineSnapshot: async () => ({
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
    apparatus: {
      systems: [],
      equipments: [
        {
          equipment_code: "415001120001",
          equipment_name: "Apparato test",
          zone: "Z1",
          system: "SYS",
          closure_status: "PARTIAL",
          risk_level: "high",
          total_cables: 4,
          confirmed_cables: 3,
          open_cables: 1,
          blocked_cables: 1,
          without_field_evidence: 2,
          status_distribution: { P: 2, C: 1 },
          recommended_actions: ["azione 1", "azione 2"],
          blocker: null,
          critical_path: [],
          route: "/equipment/415001120001",
        },
      ],
    },
    field: {
      imports: [],
      summary: null,
      priority_items: [],
      missing_evidence_items: [],
      partial_items: [],
      blocked_items: [],
    },
    charts: {
      system_closures: [],
      blocked_by_zone: [],
      telegram_trend: [],
      inca_distribution: [],
    },
  }),
}));

import { loadCommanderEquipment, summarizeCommanderIncaStatusDistribution } from "./equipment.read";

describe("summarizeCommanderIncaStatusDistribution", () => {
  it("uses canonical INCA translation for raw keys", () => {
    const result = summarizeCommanderIncaStatusDistribution({
      P: 3,
      "1": 2,
      "2": 4,
      C: 5,
      B: 1,
      M: 7,
      X: 9,
    });

    expect(result).toEqual({
      posati: 14,
      collegatiCompleti: 5,
    });
  });

  it("adapts commander equipment data from the core snapshot", async () => {
    const result = await loadCommanderEquipment("415001120001");

    expect(result).toEqual({
      equipmentCode: "415001120001",
      cablesTotal: 4,
      posati: 3,
      collegatiCompleti: 1,
      bloccati: 1,
      withoutEvidence: 2,
      riskLevel: "Alto",
      actions: ["azione 1", "azione 2"],
    });
  });
});

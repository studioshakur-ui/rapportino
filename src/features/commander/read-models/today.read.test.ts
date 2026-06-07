import { describe, expect, it, vi } from "vitest";

vi.mock("../../../domain/core-engine", () => ({
  loadCoreEngineSnapshot: async () => ({
    today: {
      latest_import: null,
      summary: {
        import_id: "import-1",
        list_date: "2026-06-07",
        file_name: "L1.pdf",
        total: 10,
        confirmed: 4,
        likely_laid: 2,
        to_verify: 1,
        no_evidence: 1,
        missing: 0,
        blocked: 2,
        outside_inca: 1,
        confirmed_by_whatsapp: 0,
        missing_evidence: 0,
        short_issues: 0,
        missing_issues: 0,
        partial_progress: 0,
        by_perimeter: [],
        tomorrow_actions: [],
      },
      open_priorities: [
        {
          cable_code: "I RS 002",
          reason: "sans preuve",
          priority: "high",
        },
      ],
      metrics: {
        total_cables: 10,
        confirmed_cables: 6,
        remaining_cables: 4,
        blocked_cables: 2,
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
      equipments: [],
    },
    field: {
      imports: [],
      summary: {
        import_id: "import-1",
        list_date: "2026-06-07",
        file_name: "L1.pdf",
        total: 10,
        confirmed: 4,
        likely_laid: 2,
        to_verify: 1,
        no_evidence: 1,
        missing: 0,
        blocked: 2,
        outside_inca: 1,
        confirmed_by_whatsapp: 0,
        missing_evidence: 0,
        short_issues: 0,
        missing_issues: 0,
        partial_progress: 0,
        by_perimeter: [
          { perimetro: "RACK A", total: 4, confirmed: 1, no_evidence: 3, pct: 25 },
          { perimetro: "RACK B", total: 6, confirmed: 5, no_evidence: 1, pct: 83 },
        ],
        tomorrow_actions: [],
      },
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

import { loadCommanderToday } from "./today.read";

describe("loadCommanderToday", () => {
  it("adapts today data from the core snapshot", async () => {
    const result = await loadCommanderToday();

    expect(result).toEqual({
      planned: 10,
      confirmed: 4,
      withoutEvidence: 1,
      toVerify: 4,
      blocked: 2,
      topPriority: "I RS 002 — sans preuve",
      criticalZones: ["RACK A", "RACK B"],
    });
  });
});

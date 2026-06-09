import { describe, expect, it } from "vitest";
import { buildEquipmentIntelligence } from "./equipment.intelligence";
import type { DailyListItemVM } from "../daily-lists/dailyLists.types";

const baseItem: DailyListItemVM = {
  id: "item-1",
  import_id: "import-1",
  list_number: "5",
  list_resolution_date: "2026-06-09",
  cable_code_raw: "W SF 080",
  cable_code_normalized: "WSF 080",
  inca_cavo_id: "inca-1",
  stato_collegamento: "2",
  app_partenza: "436001040001",
  app_arrivo: "436001080001",
  perimetro: "SFN",
  data_perimetro: "2026-07-15",
  situazione_inca: "2",
  note: null,
  priority_level: null,
  planned_status: "2",
  created_at: "2026-06-09T00:00:00.000Z",
  computed_status: "to_verify",
  evidence: [],
  confirmed_by_whatsapp: false,
  missing_evidence: true,
  has_short_issue: false,
  has_missing_issue: false,
  has_partial_progress: false,
  evidence_count: 0,
  last_evidence_at: null,
  last_event_at: null,
  last_actor: null,
  last_message: null,
  last_event_type: null,
  last_confidence: null,
  progress_percent: null,
  inca_matched: true,
  cable_story_path: "/cable/WSF%20080",
  recommended_action: "Validare il completamento prima della chiusura lista",
  requires_human_validation: false,
  has_incoherence: false,
  latest_detected_status: null,
  latest_confidence_reason: null,
};

describe("equipment.intelligence", () => {
  it("does not close an apparato when W SF 080 is only connected on one side", () => {
    const equipments = buildEquipmentIntelligence([
      {
        item: baseItem,
        inca: null,
        priority: undefined,
      },
    ]);

    const partenza = equipments.find((equipment) => equipment.equipment_code === "436001040001");
    const arrivo = equipments.find((equipment) => equipment.equipment_code === "436001080001");

    expect(partenza?.closure_status).toBe("OPEN");
    expect(arrivo?.closure_status).toBe("OPEN");
    expect(partenza?.confirmed_cables).toBe(0);
    expect(partenza?.open_cables).toBe(1);
    expect(partenza?.critical_path.map((item) => item.cable_code)).toEqual(["WSF 080"]);
  });

  it("tracks AI proofs to validate without closing the apparato", () => {
    const equipments = buildEquipmentIntelligence([
      {
        item: {
          ...baseItem,
          requires_human_validation: true,
          has_incoherence: true,
          latest_detected_status: "Da validare",
        },
        inca: null,
        priority: undefined,
      },
    ]);

    const partenza = equipments.find((equipment) => equipment.equipment_code === "436001040001");

    expect(partenza?.closure_status).toBe("OPEN");
    expect(partenza?.ai_validation_required).toBe(1);
    expect(partenza?.ai_incoherences).toBe(1);
    expect(partenza?.recommended_actions[0]).toContain("incoerenze IA");
  });
});

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
      },
    ];

    expect(computeItemStatus(baseItem, evidence, false)).toBe("confirmed_field");
    expect(buildItemVM(baseItem, evidence, false).confirmed_by_whatsapp).toBe(false);
    expect(buildItemVM(baseItem, evidence, false).computed_status).toBe("confirmed_field");
  });
});

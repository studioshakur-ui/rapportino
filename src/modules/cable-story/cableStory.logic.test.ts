import { describe, expect, it } from "vitest";
import { computeStoryStatus, mapStoryEventType } from "./cableStory.logic";
import type { CableStoryFinding, CableStoryIncaCard, CableStoryPriority, CableStoryTimelineItem } from "./cableStory.types";

const inca: CableStoryIncaCard = {
  id: null,
  codice: null,
  situazione: null,
  metri_teo: null,
  impianto: null,
  zona_da: null,
  zona_a: null,
  commessa: null,
  created_at: null,
};

describe("cableStory.logic", () => {
  it("maps FIELD_VERIFIED to a field verification event", () => {
    expect(mapStoryEventType("FIELD_VERIFIED")).toBe("FIELD_VERIFIED");
  });

  it("treats field verification as pose confirmed", () => {
    const timeline: CableStoryTimelineItem[] = [
      {
        id: "t-1",
        event_at: "2026-06-07T10:00:00.000Z",
        event_type: "FIELD_VERIFIED",
        status: "validated",
        actor_label: "Hamid",
        source_type: "manual",
        summary: "Vérifié terrain",
        detail: "Verifica sul campo",
        confidence: 100,
        priority_level: null,
        message_id: null,
        core_event_id: "core-1",
        is_contradictory: false,
      },
    ];

    expect(computeStoryStatus({
      inca,
      timeline,
      priorities: [] as CableStoryPriority[],
      findings: [] as CableStoryFinding[],
    })).toBe("Pose confirmée");
  });
});

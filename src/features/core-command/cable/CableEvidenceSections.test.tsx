import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { classifyCableEvidence } from "../../../core/cable/cableEvidence";
import {
  CableEvidenceSections,
  type CableEvidenceItem,
} from "./CableEvidenceSections";

function evidenceItem(
  id: string,
  targetCableCode: string,
  note: string,
): CableEvidenceItem {
  return {
    id,
    occurred_at: "2026-06-10T08:00:00.000Z",
    event_kind: "GENERAL_MESSAGE",
    source: "core_event",
    note,
    match: classifyCableEvidence({
      targetCableCode,
      sourceText: note,
      sourceType: "telegram",
    }),
    is_manual_validation: false,
  };
}

describe("CableEvidenceSections", () => {
  it("does not render a related message inside Prove collegate", () => {
    const linked = evidenceItem("linked", "ISE 003", "ISE 003 posato");
    const related = evidenceItem("related", "ISE 003", "ISE 004 posato");

    expect(linked.match.bucket).toBe("linked");
    expect(related.match.bucket).toBe("related");

    const html = renderToStaticMarkup(
      <CableEvidenceSections
        linkedEvidence={[linked]}
        ambiguousEvidence={[]}
        relatedEvidence={[related]}
      />,
    );

    const linkedSection = html.slice(
      html.indexOf("Prove collegate"),
      html.indexOf("Candidati ambigui"),
    );

    expect(linkedSection).toContain("ISE 003");
    expect(linkedSection).not.toContain("ISE 004");
    expect(html).toContain("Segnali correlati");
    expect(html).toContain("Nessuna azione");
  });
});

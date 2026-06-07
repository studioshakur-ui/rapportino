import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SituazioneView } from "./SituazioneView";
import type { DailySituationView } from "../../../domain/core-engine/dailySituation";

function buildSituation(): DailySituationView {
  return {
    date: "2026-06-07",
    situationDate: "2026-06-07",
    listDate: "2026-06-05",
    listName: "L1.pdf",
    totals: {
      totalCables: 12,
      verifiedCables: 8,
      remainingCables: 4,
      blockedCables: 2,
      withoutFieldEvidence: 1,
      toVerifyCables: 4,
    },
    toVerifyCables: [
      {
        cableCode: "IRS012",
        displayCableCode: "I RS 012",
        area: "AREA RACK A",
        apparatusCode: "415001120001",
        system: "Rack A Data Center C2",
        reason: "senza prova campo",
      },
    ],
    realBlockers: [
      {
        cableCode: "TCK621",
        displayCableCode: "T CK 621",
        area: "AREA RACK A",
        apparatusCode: "415001120001",
        system: "Rack A Data Center C2",
        reason: "Blocco aperto",
      },
    ],
    impactedApparatus: [
      {
        equipmentCode: "415001120001",
        area: "Zona A",
        system: "Rack A Data Center C2",
        closureStatus: "PARTIAL",
        openCables: 1,
        blockedCables: 1,
        riskLevel: "high",
      },
    ],
    impactedSystems: [
      {
        systemName: "RACK A",
        status: "PARTIAL",
        openEquipments: 1,
        blockedEquipments: 1,
      },
    ],
    fieldEvidenceGroups: [
      {
        source: "WhatsApp",
        timestamp: "2026-06-07T05:37:00Z",
        cableCodes: ["I RS 012", "T CE 020"],
        count: 2,
        summary: "2 cavi riconosciuti",
      },
    ],
    blockers: [
      {
        cableCode: "TCK621",
        displayCableCode: "T CK 621",
        area: "AREA RACK A",
        apparatusCode: "415001120001",
        system: "Rack A Data Center C2",
        reason: "Blocco aperto",
      },
    ],
    fieldEvidenceToday: [],
    telegramImpacts: [],
    recommendedActions: ["Sbloccare I RS 002"],
    messageToSend: "SITUAZIONE ORE 16:30\nLista: L1.pdf",
  };
}

describe("SituazioneView", () => {
  it("renders an empty state when the snapshot is missing", () => {
    const html = renderToStaticMarkup(<SituazioneView situation={null} />);

    expect(html).toContain("Nessun dato disponibile");
    expect(html).toContain("Situazione 16:30");
  });

  it("renders the operational message and copy action when data exists", () => {
    const html = renderToStaticMarkup(<SituazioneView situation={buildSituation()} />);

    expect(html).toContain("Situazione 16:30");
    expect(html).toContain("Copia testo");
    expect(html).toContain("Testo pronto da inviare");
    expect(html).toContain("SITUAZIONE ORE 16:30");
    expect(html).toContain("Cavi da verificare");
    expect(html).toContain("Bloccanti reali");
    expect(html).toContain("Prove campo");
  });
});

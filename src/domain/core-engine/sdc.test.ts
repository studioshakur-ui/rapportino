import { describe, expect, it } from "vitest";
import { buildSdcCableLookup, findSdcCableRecord, getDisplayCableCode, normalizeCableCode } from "./sdc";

function buildRows() {
  return [
    {
      cable_code_raw: "WTI036",
      app_partenza: "415001120001",
      app_arrivo: "415001120002",
      perimetro: "RACK A DATA CENTER C2",
      sistema: "RACK A DATA CENTER C2",
      sottosistema: "RACK A",
      situazione_inca: "P",
      note: "AREA RACK A",
      locale: "Locale A",
      area: "AREA RACK A",
    },
    {
      cable_code_raw: "FSG002",
      app_partenza: "415001130001",
      app_arrivo: "415001130002",
      perimetro: "RACK B DATA CENTER C1",
      sistema: "RACK B DATA CENTER C1",
      sottosistema: "RACK B",
      situazione_inca: "C",
      note: "AREA RACK B",
      locale: "Locale B",
      area: "AREA RACK B",
    },
    {
      cable_code_raw: "TCK621",
      app_partenza: "415001110001",
      app_arrivo: "415001110002",
      perimetro: "RACK C DATA CENTER C3",
      sistema: "RACK C DATA CENTER C3",
      sottosistema: "RACK C",
      situazione_inca: "B",
      note: "AREA RACK C",
      locale: "Locale C",
      area: "AREA RACK C",
    },
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
  ];
}

describe("sdc cable lookup", () => {
  it("normalizes the compact forms used on the field", () => {
    expect(normalizeCableCode("WTI036")).toBe("WTI 036");
    expect(normalizeCableCode("FSG002")).toBe("FSG 002");
    expect(normalizeCableCode("TCK621")).toBe("TCK 621");
    expect(normalizeCableCode("IRS012")).toBe("IRS 012");
  });

  it("keeps the original human display for the mark", () => {
    expect(getDisplayCableCode("WTI036")).toBe("W TI 036");
    expect(getDisplayCableCode("FSG002")).toBe("F SG 002");
    expect(getDisplayCableCode("TCK621")).toBe("T CK 621");
    expect(getDisplayCableCode("IRS012")).toBe("I RS 012");
  });

  it("builds a lookup with normalized and original keys", () => {
    const lookup = buildSdcCableLookup(buildRows());

    expect(lookup.byNormalizedCode.get("WTI 036")?.[0]?.cableCodeOriginal).toBe("W TI 036");
    expect(lookup.byOriginalCode.get("W TI 036")?.[0]?.cableCodeNormalized).toBe("WTI 036");
    expect(findSdcCableRecord(lookup, "W TI 036")?.cableCodeNormalized).toBe("WTI 036");
    expect(findSdcCableRecord(lookup, "F SG 002")?.cableCodeOriginal).toBe("F SG 002");
  });

  it("derives equipment master and edges from APP codes", () => {
    const lookup = buildSdcCableLookup(buildRows());

    expect(lookup.equipmentMasterByCode.get("415001120001")).toMatchObject({
      equipmentCode: "415001120001",
      area: "AREA RACK A",
      system: "RACK A DATA CENTER C2",
    });
    expect(lookup.equipmentEdges[0]).toMatchObject({
      cableCodeOriginal: "W TI 036",
      cableCodeNormalized: "WTI 036",
      fromEquipment: "415001120001",
      toEquipment: "415001120002",
      area: "AREA RACK A",
    });
  });
});

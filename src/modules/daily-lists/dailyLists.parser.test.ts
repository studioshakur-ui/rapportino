import { describe, expect, it } from "vitest";
import { parseL4TextRows } from "./dailyLists.parser";

describe("dailyLists.parser", () => {
  it("parses L4 PDF text rows with compact cable codes", () => {
    const rows = parseL4TextRows([
      "4 08/06/2026 1-5 I GF007 1 320001050001 415001120002 INS_1 08/06/2026 1 PRIORITA' ASSOLUTA LATO RACK B DATA CENTER C2",
      "4 08/06/2026 C CS 544 411001080001 415001120002 CMS 24/08/2026 P PRIORITA' ASSOLUTA LATO RACK B DATA CENTER C2",
      "4 08/06/2026 T LK 017 415004020001 415001120002 MIDS & MDLP 30/10/2026 B PRIORITA' ASSOLUTA LATO RACK B DATA CENTER C2",
      "4 08/06/2026 W SR 267 711002130002 415001120002 SCG TBC PRIORITA' ASSOLUTA LATO RACK B DATA CENTER C2",
    ]);

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      lista: "4",
      risoluzione: "08/06/2026",
      marca_pezzo: "1-5 I GF007",
      stato_collegamento: "1",
      app_partenza: "320001050001",
      app_arrivo: "415001120002",
      perimetro: "INS_1",
      data_perimetro: "2026-06-08",
      situazione_inca: "1",
    });
    expect(rows[1]).toMatchObject({
      marca_pezzo: "C CS 544",
      stato_collegamento: null,
      perimetro: "CMS",
      data_perimetro: "2026-08-24",
      situazione_inca: "P",
    });
    expect(rows[2]).toMatchObject({
      marca_pezzo: "T LK 017",
      perimetro: "MIDS & MDLP",
      situazione_inca: "B",
    });
    expect(rows[3]).toMatchObject({
      marca_pezzo: "W SR 267",
      perimetro: "SCG",
      data_perimetro: null,
      situazione_inca: null,
    });
  });
});

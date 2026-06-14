import { describe, expect, it } from "vitest";
import { gestoFromLiveCavo, mancaFromLiveCavo, type LiveConsegnaCable } from "./statoConsegna";

function cable(overrides: Partial<LiveConsegnaCable> = {}): LiveConsegnaCable {
  return {
    situazione: null,
    sist_partenza: null,
    sist_arrivo: null,
    collegato: null,
    ...overrides,
  };
}

describe("statoConsegna live pipeline", () => {
  it("uses the official collegato mapping", () => {
    expect(gestoFromLiveCavo(cable({ situazione: "P", collegato: "C" }))).toBe("consegnato");
    expect(gestoFromLiveCavo(cable({ situazione: "P", collegato: "1" }))).toBe("da_finire");
    expect(gestoFromLiveCavo(cable({ situazione: "P", collegato: "2" }))).toBe("da_finire");
    expect(mancaFromLiveCavo(cable({ situazione: "P", sist_partenza: "OK", sist_arrivo: "OK", collegato: "1" }))).toBe("collegare arrivo");
    expect(mancaFromLiveCavo(cable({ situazione: "P", sist_partenza: "OK", sist_arrivo: "OK", collegato: "2" }))).toBe("collegare partenza");
  });

  it("follows posa then sistemazione then collegamento", () => {
    expect(gestoFromLiveCavo(cable())).toBe("da_posare");
    expect(gestoFromLiveCavo(cable({ situazione: "P" }))).toBe("da_sistemare");
    expect(gestoFromLiveCavo(cable({ situazione: "P", sist_partenza: "OK", sist_arrivo: "OK" }))).toBe("pronto_coll");
    expect(mancaFromLiveCavo(cable({ situazione: "P", sist_partenza: "OK" }))).toBe("sistemare arrivo");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildCableIdentity,
  extractAlimentoPrefix,
  normalizeCableLoose,
  normalizeCableStrict,
  resolveCableMatch,
} from "./cableIdentity";

describe("normalizeCableLoose (historical, prefix-stripped)", () => {
  it("strips the alimento prefix and normalises the body", () => {
    expect(normalizeCableLoose("1-7 W SF038")).toBe("WSF 038");
    expect(normalizeCableLoose("N AH163")).toBe("NAH 163");
    expect(normalizeCableLoose("I RS 002")).toBe("IRS 002");
    expect(normalizeCableLoose("1-5 I RS002")).toBe("IRS 002");
  });
});

describe("normalizeCableStrict (prefix preserved)", () => {
  it("keeps the alimento prefix as part of identity", () => {
    expect(normalizeCableStrict("1-7 W SF038")).toBe("1-7 WSF 038");
    expect(normalizeCableStrict("1-1 N AH163")).toBe("1-1 NAH 163");
    expect(normalizeCableStrict("I RS 002")).toBe("IRS 002");
  });

  it("does NOT collapse different alimenti into one key (no false merge)", () => {
    expect(normalizeCableStrict("1-5 I RS002")).toBe("1-5 IRS 002");
    expect(normalizeCableStrict("I RS 002")).toBe("IRS 002");
    expect(normalizeCableStrict("1-5 I RS002")).not.toBe(normalizeCableStrict("I RS 002"));
  });

  it("matches the INCA stored form for prefixed cables", () => {
    // daily SDC raw vs INCA marca_cavo — both carry the prefix
    expect(normalizeCableStrict("1-7 W SF038")).toBe(normalizeCableStrict("1-7 W SF038"));
  });
});

describe("extractAlimentoPrefix", () => {
  it("splits prefix and rest", () => {
    expect(extractAlimentoPrefix("1-7 W SF038")).toEqual({ prefix: "1-7", rest: "W SF038" });
    expect(extractAlimentoPrefix("2/1 N AH163")).toEqual({ prefix: "2-1", rest: "N AH163" });
    expect(extractAlimentoPrefix("I RS 002")).toEqual({ prefix: null, rest: "I RS 002" });
  });
});

describe("buildCableIdentity", () => {
  it("keeps raw + display + both keys + prefix flag", () => {
    const id = buildCableIdentity("1-7 W SF038");
    expect(id.raw).toBe("1-7 W SF038");
    expect(id.strict).toBe("1-7 WSF 038");
    expect(id.loose).toBe("WSF 038");
    expect(id.hasPrefix).toBe(true);
    expect(id.display).toContain("1-7");
  });
});

describe("resolveCableMatch (non-destructive)", () => {
  const inca = [
    { id: "a", strict: "1-5 IRS 002", loose: "IRS 002" },
    { id: "b", strict: "IRS 002", loose: "IRS 002" },
    { id: "c", strict: "1-7 WSF 038", loose: "WSF 038" },
    { id: "d", strict: "1-8 WSF 038", loose: "WSF 038" },
    { id: "e", strict: "1-9 TVU 074", loose: "TVU 074" },
  ];

  it("prefers an exact strict match (confidence 1)", () => {
    expect(resolveCableMatch("1-5 I RS002", inca)).toEqual({ incaCavoId: "a", source: "strict", confidence: 1 });
    expect(resolveCableMatch("1-7 W SF038", inca)).toEqual({ incaCavoId: "c", source: "strict", confidence: 1 });
  });

  it("a non-prefixed input strictly matches the non-prefixed cable (not ambiguous)", () => {
    expect(resolveCableMatch("I RS 002", inca)).toEqual({ incaCavoId: "b", source: "strict", confidence: 1 });
  });

  it("uses a single loose match with lower confidence (field signal, no prefix)", () => {
    // "TVU 074" has no plain (non-prefixed) INCA row -> single loose -> e
    expect(resolveCableMatch("TVU 074", inca)).toEqual({ incaCavoId: "e", source: "loose", confidence: 0.7 });
  });

  it("never auto-assigns when a loose key spans several alimenti", () => {
    // "WSF 038" loose matches both c (1-7) and d (1-8) -> ambiguous, no assignment
    expect(resolveCableMatch("WSF 038", inca)).toEqual({ incaCavoId: null, source: "ambiguous", confidence: 0 });
  });

  it("returns none when nothing matches", () => {
    expect(resolveCableMatch("ZZZ 999", inca)).toEqual({ incaCavoId: null, source: "none", confidence: 0 });
  });
});

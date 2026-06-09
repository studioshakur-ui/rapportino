import { describe, expect, it } from "vitest";
import { cableCodeVariants, extractCableRefs, normalizeCableCode } from "./normalizer.agent";

describe("normalizer.agent", () => {
  it("does not confuse deck locations with cable codes", () => {
    const refs = extractCableRefs("Anche ponte 10 - squadra RABBI e MBALLOW");

    expect(refs.map((ref) => ref.normalized)).not.toContain("PONTE 10");
    expect(refs).toHaveLength(0);
  });

  it("keeps real single-letter ship cable prefixes", () => {
    const refs = extractCableRefs("P RS 021 completato sul ponte 10");

    expect(refs.map((ref) => ref.normalized)).toEqual(["PRS 021"]);
  });

  it("normalizes compact and prefixed chantier forms consistently", () => {
    expect(normalizeCableCode("1-6 c cs 006")).toBe("CCS 006");
    expect(normalizeCableCode("Rco012")).toBe("RCO 012");
    expect(normalizeCableCode("T NA🚦009")).toBe("TNA 009");
  });

  it("builds stable INCA lookup variants from the normalized code", () => {
    expect(cableCodeVariants("WTI 036")).toEqual([
      "WTI 036",
      "W TI 036",
      "WTI036",
      "wti 036",
      "w ti 036",
    ]);
  });
});

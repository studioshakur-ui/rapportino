import { describe, expect, it } from "vitest";
import { classifyCableEvidence, detectCableCodesInText } from "./cableEvidence";

function classify(targetCableCode: string, sourceText: string, overrides = {}) {
  return classifyCableEvidence({ targetCableCode, sourceText, ...overrides });
}

describe("cableEvidence forensic matching", () => {
  it("prevents adjacent ISE/ICS/IRS codes from becoming linked proof for ISE 003", () => {
    for (const other of ["ISE 004", "ISE 005", "ICS 103", "IRS 010"]) {
      const result = classify("I SE 003", `Segnale campo ${other} completato`);
      expect(result.bucket).not.toBe("linked");
      expect(result.match_type).toBe("ambiguous");
      expect(result.normalized_detected_code).toBe(other);
    }
  });

  it("links a multi-code message only to codes really present", () => {
    const text = "TCK 271, TCK 520, CCS 358, ISE 004, ISE 005";
    expect(classify("TCK 271", text).bucket).toBe("linked");
    expect(classify("CCS 358", text).bucket).toBe("linked");
    expect(classify("ISE 003", text).bucket).toBe("related");
  });

  it("does not put a message without the target code in cable history", () => {
    const result = classify("ISE 003", "Foto arrivo per I GF 002 e C CS 104");
    expect(result.bucket).toBe("related");
    expect(result.requires_human_validation).toBe(true);
  });

  it("does not absorb Italian conjunction e as a cable suffix", () => {
    expect(
      detectCableCodesInText("I GF 002 e C CS 104").map(
        (code) => code.normalizedStrict,
      ),
    ).toEqual(["IGF 002", "CCS 104"]);
    expect(
      detectCableCodesInText("ISE 003 e ISE 004").map(
        (code) => code.normalizedStrict,
      ),
    ).toEqual(["ISE 003", "ISE 004"]);
    expect(
      detectCableCodesInText("TCK 271 e TCK 520").map(
        (code) => code.normalizedStrict,
      ),
    ).toEqual(["TCK 271", "TCK 520"]);
    expect(
      detectCableCodesInText("CCS 358, ICS 103 e IRS 010").map(
        (code) => code.normalizedStrict,
      ),
    ).toEqual(["CCS 358", "ICS 103", "IRS 010"]);
  });

  it("keeps loose matches as ambiguous candidates instead of linked proof", () => {
    const result = classify("1-5 ISE 003", "Telegram: ISE 003 trovato a bordo");
    expect(result.bucket).toBe("ambiguous");
    expect(result.match_type).toBe("loose");
    expect(result.requires_human_validation).toBe(true);
  });

  it("allows manual validation to link evidence even when the code is not auto-read", () => {
    const result = classify("ISE 003", "foto sfocata senza codice leggibile", {
      isManualValidation: true,
    });
    expect(result.bucket).toBe("linked");
    expect(result.match_type).toBe("manual");
    expect(result.highlight_start).toBeNull();
  });

  it("does not extract single/generic tokens as cable proof", () => {
    expect(
      detectCableCodesInText("I 003 SE 003 C 003 T 003 senza codice valido"),
    ).toHaveLength(0);
    expect(classify("ISE 003", "I SE C T generici").bucket).toBe("ambiguous");
  });

  it("confirmed history is strict text proof or manual validation only", () => {
    expect(classify("ISE 003", "ISE 003 posato").bucket).toBe("linked");
    expect(classify("ISE 003", "ISE 004 posato").bucket).not.toBe("linked");
    expect(classify("1-5 ISE 003", "ISE 003 posato").bucket).not.toBe("linked");
  });
});

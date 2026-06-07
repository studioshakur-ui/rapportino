import { describe, expect, it } from "vitest";
import {
  getIncaStatusLabel,
  isIncaBlocked,
  isIncaClosed,
  isIncaVerified,
  translateIncaStatus,
} from "./incaStatus";

describe("translateIncaStatus", () => {
  it("handles empty and missing values", () => {
    expect(translateIncaStatus(null)).toMatchObject({
      raw: null,
      status: "DA_VERIFICARE",
      label: "Da verificare",
      isBlocked: false,
      isStarted: false,
      isVerified: false,
      isClosed: false,
      sortWeight: 0,
    });

    expect(translateIncaStatus("")).toMatchObject({
      raw: null,
      status: "DA_VERIFICARE",
    });

    expect(translateIncaStatus(undefined)).toMatchObject({
      raw: null,
      status: "DA_VERIFICARE",
    });
  });

  it.each([
    ["M", "MISURATO", false, false, true, false],
    ["T", "TAGLIATO", false, false, true, false],
    ["P", "POSATO", false, false, true, false],
    ["1", "PARZIALMENTE_COLLEGATO", false, false, true, true],
    [1, "PARZIALMENTE_COLLEGATO", false, false, true, true],
    ["2", "PARZIALMENTE_COLLEGATO", false, false, true, true],
    [2, "PARZIALMENTE_COLLEGATO", false, false, true, true],
    ["C", "COLLEGATO", false, true, true, false],
    ["B", "BLOCCATO", true, false, false, false],
    [" b ", "BLOCCATO", true, false, false, false],
  ])(
    "maps %s correctly",
    (raw, expectedStatus, expectedBlocked, expectedClosed, expectedVerified, expectedPartiallyConnected) => {
      const translated = translateIncaStatus(raw);
      expect(translated.status).toBe(expectedStatus);
      expect(translated.isBlocked).toBe(expectedBlocked);
      expect(translated.isClosed).toBe(expectedClosed);
      expect(translated.isVerified).toBe(expectedVerified);
      expect(translated.isPartiallyConnected).toBe(expectedPartiallyConnected);
      expect(translated.raw).toBe(typeof raw === "string" ? raw.trim().toUpperCase() : String(raw));
    },
  );

  it("returns a safe fallback for unknown values", () => {
    const translated = translateIncaStatus("x");
    expect(translated).toMatchObject({
      status: "SCONOSCIUTO",
      label: "Sconosciuto",
      description: "Stato INCA non riconosciuto",
      isBlocked: false,
      isClosed: false,
    });
  });
});

describe("helpers", () => {
  it("derive booleans and label", () => {
    expect(isIncaBlocked("B")).toBe(true);
    expect(isIncaClosed("C")).toBe(true);
    expect(isIncaVerified("P")).toBe(true);
    expect(getIncaStatusLabel("M")).toBe("Misurato");
  });
});

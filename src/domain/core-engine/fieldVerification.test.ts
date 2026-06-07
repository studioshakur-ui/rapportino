import { describe, expect, it } from "vitest";
import { formatFieldStatusLabel, resolveFieldStatus } from "./fieldVerification";

describe("fieldVerification", () => {
  it("returns BLOCKED for critical findings", () => {
    expect(resolveFieldStatus({ hasCriticalFinding: true })).toBe("BLOCKED");
  });

  it("returns VERIFIED when field proof exists", () => {
    expect(resolveFieldStatus({ hasVerificationProof: true })).toBe("VERIFIED");
  });

  it("falls back to TO_VERIFY", () => {
    expect(resolveFieldStatus({})).toBe("TO_VERIFY");
    expect(formatFieldStatusLabel("TO_VERIFY")).toBe("Da verificare");
  });
});

import { describe, expect, it } from "vitest";
import { formatFieldStatusLabel, getFieldVerificationStatusLabel, isVerifiedFieldVerificationStatus, resolveFieldStatus } from "./fieldVerification";

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

  it("classifies only positive manual statuses as verified", () => {
    expect(isVerifiedFieldVerificationStatus("AT_DESTINATION")).toBe(true);
    expect(isVerifiedFieldVerificationStatus("AT_DEPARTURE")).toBe(true);
    expect(isVerifiedFieldVerificationStatus("CONNECTED_BOTH")).toBe(true);
    expect(isVerifiedFieldVerificationStatus("NOT_FOUND")).toBe(false);
    expect(isVerifiedFieldVerificationStatus("RECHECK")).toBe(false);
    expect(getFieldVerificationStatusLabel("AT_DESTINATION")).toBe("A destinazione");
  });
});

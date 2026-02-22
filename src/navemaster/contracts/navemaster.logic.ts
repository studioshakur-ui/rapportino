// src/navemaster/contracts/navemaster.logic.ts
import type { NavSeverity, NavStatus } from "./navemaster.types";

export const NAV_STATUS: Readonly<Record<NavStatus, NavStatus>> = {
  P: "P",
  R: "R",
  T: "T",
  B: "B",
  E: "E",
  NP: "NP",
};

export const NAV_SEVERITY: Readonly<Record<NavSeverity, NavSeverity>> = {
  CRITICAL: "CRITICAL",
  MAJOR: "MAJOR",
  INFO: "INFO",
};

export function navStatusFromText(x: unknown): NavStatus {
  const v = String(x ?? "").trim().toUpperCase();
  if (v === "P") return "P";
  if (v === "R") return "R";
  if (v === "T") return "T";
  if (v === "B") return "B";
  if (v === "E") return "E";
  if (v === "NP") return "NP";
  return "NP";
}

export function severityFromText(x: unknown): NavSeverity {
  const v = String(x ?? "").trim().toUpperCase();
  if (v === "CRITICAL") return "CRITICAL";
  if (v === "MAJOR") return "MAJOR";
  return "INFO";
}

export function formatIt(dt: unknown): string {
  try {
    if (!dt) return "—";
    return new Date(String(dt)).toLocaleString("it-IT");
  } catch {
    return "—";
  }
}

export function safeUpper(x: unknown): string {
  return String(x ?? "").trim().toUpperCase();
}

export function ilikePattern(s: string): string {
  // Supabase ilike uses % wildcard
  const v = String(s ?? "").trim();
  if (!v) return "%";
  return `%${v.replaceAll("%", "\\%")}%`;
}

export function severityRank(s: NavSeverity): number {
  if (s === "CRITICAL") return 3;
  if (s === "MAJOR") return 2;
  return 1;
}
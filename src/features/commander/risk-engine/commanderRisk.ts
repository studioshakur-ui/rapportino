import type { CommanderRiskLevel } from "../commands/CommandTypes";

export function computeCommanderRiskLevel(values: {
  blocked?: number | null;
  withoutEvidence?: number | null;
  openPriorities?: number | null;
}): CommanderRiskLevel {
  const blocked = values.blocked ?? 0;
  const withoutEvidence = values.withoutEvidence ?? 0;
  const openPriorities = values.openPriorities ?? 0;

  if (blocked >= 3 || openPriorities >= 6) return "Critico";
  if (blocked >= 1 || openPriorities >= 3) return "Alto";
  if (withoutEvidence >= 3 || openPriorities >= 1) return "Medio";
  return "Basso";
}

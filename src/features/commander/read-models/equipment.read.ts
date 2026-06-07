import { loadCoreEngineSnapshot } from "../../../domain/core-engine";
import { translateIncaStatus } from "../../../domain/core-engine/incaStatus";
import type { CommanderEquipmentReadModel, CommanderRiskLevel } from "../commands/CommandTypes";

export function summarizeCommanderIncaStatusDistribution(statusDistribution: Record<string, number>): {
  posati: number;
  collegatiCompleti: number;
} {
  const posati = Object.entries(statusDistribution).reduce((total, [rawStatus, count]) => {
    const translated = translateIncaStatus(rawStatus);
    if (translated.status === "POSATO" || translated.status === "PARZIALMENTE_COLLEGATO" || translated.status === "COLLEGATO") {
      return total + count;
    }
    return total;
  }, 0);
  const collegatiCompleti = Object.entries(statusDistribution).reduce((total, [rawStatus, count]) => {
    const translated = translateIncaStatus(rawStatus);
    return translated.status === "COLLEGATO" ? total + count : total;
  }, 0);

  return { posati, collegatiCompleti };
}

function toCommanderRiskLevel(level: string): CommanderRiskLevel {
  switch (level) {
    case "critical":
      return "Critico";
    case "high":
      return "Alto";
    case "medium":
      return "Medio";
    default:
      return "Basso";
  }
}

function normalizeEquipmentCode(value: string): string {
  return value.trim().toUpperCase();
}

export async function loadCommanderEquipment(
  equipmentCode: string
): Promise<CommanderEquipmentReadModel> {
  const snapshot = await loadCoreEngineSnapshot();
  const normalizedCode = normalizeEquipmentCode(equipmentCode);
  const equipment = snapshot.apparatus.equipments.find((item) => item.equipment_code === normalizedCode) ?? null;
  const summary = equipment;
  const { posati, collegatiCompleti } = summarizeCommanderIncaStatusDistribution(summary?.status_distribution ?? {});

  return {
    equipmentCode: summary?.equipment_code ?? normalizedCode,
    cablesTotal: summary?.total_cables ?? 0,
    posati,
    collegatiCompleti,
    bloccati: summary?.blocked_cables ?? 0,
    withoutEvidence: summary?.without_field_evidence ?? 0,
    riskLevel: summary ? toCommanderRiskLevel(summary.risk_level) : null,
    actions: summary?.recommended_actions ?? [],
  };
}

import { loadEquipmentStory } from "../../../modules/equipment/equipment.repo";
import type { CommanderEquipmentReadModel, CommanderRiskLevel } from "../commands/CommandTypes";

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

export async function loadCommanderEquipment(
  equipmentCode: string
): Promise<CommanderEquipmentReadModel> {
  const story = await loadEquipmentStory(equipmentCode);
  const summary = story.summary;
  const posati = (summary.status_distribution["P"] ?? 0) + (summary.status_distribution["C"] ?? 0);
  const collegatiCompleti = summary.status_distribution["C"] ?? 0;

  return {
    equipmentCode: story.equipment_code,
    cablesTotal: summary.total_cables,
    posati,
    collegatiCompleti,
    bloccati: summary.open_blockers,
    withoutEvidence: summary.without_field_evidence,
    riskLevel: toCommanderRiskLevel(summary.risk_level),
    actions: summary.recommended_actions,
  };
}

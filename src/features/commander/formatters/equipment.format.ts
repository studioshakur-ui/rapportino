import type { CommanderEquipmentReadModel } from "../commands/CommandTypes";

function displayNumber(value: number | null): string {
  return value == null ? "Non lo so." : String(value);
}

export function formatCommanderEquipment(model: CommanderEquipmentReadModel): string {
  return [
    `🔌 ${model.equipmentCode}`,
    "",
    `Cavi: ${displayNumber(model.cablesTotal)}`,
    `Posati: ${displayNumber(model.posati)}`,
    `Collegati completi: ${displayNumber(model.collegatiCompleti)}`,
    `Bloccati: ${displayNumber(model.bloccati)}`,
    `Senza prova: ${displayNumber(model.withoutEvidence)}`,
    `Rischio: ${model.riskLevel ?? "Non lo so."}`,
    "",
    "Azioni:",
    ...(model.actions.length > 0 ? model.actions.map((action) => `- ${action}`) : ["- Non lo so."]),
  ].join("\n");
}

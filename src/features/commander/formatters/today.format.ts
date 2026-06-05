import type { CommanderTodayReadModel } from "../commands/CommandTypes";

function displayNumber(value: number | null): string {
  return value == null ? "Non lo so." : String(value);
}

export function formatCommanderToday(model: CommanderTodayReadModel): string {
  return [
    "📊 Situazione cantiere",
    "",
    `Previsti: ${displayNumber(model.planned)}`,
    `Confermati: ${displayNumber(model.confirmed)}`,
    `Senza prova: ${displayNumber(model.withoutEvidence)}`,
    `Da verificare: ${displayNumber(model.toVerify)}`,
    `Bloccati: ${displayNumber(model.blocked)}`,
    "",
    `Priorità: ${model.topPriority ?? "Non lo so."}`,
    `Zone critiche: ${model.criticalZones.length > 0 ? model.criticalZones.join(", ") : "Non lo so."}`,
  ].join("\n");
}

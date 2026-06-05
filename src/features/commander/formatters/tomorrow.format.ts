import type { CommanderTomorrowReadModel } from "../commands/CommandTypes";

export function formatCommanderTomorrow(model: CommanderTomorrowReadModel): string {
  return [
    "📋 Azioni domani",
    "",
    ...(model.actions.length > 0
      ? model.actions.map((action, index) => `${index + 1}. ${action.title}\n${action.detail}`)
      : ["Non lo so."]),
    "",
    `Raccomandazione: ${model.recommendation ?? "Non lo so."}`,
  ].join("\n");
}

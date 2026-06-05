import type { CommanderRiskReadModel } from "../commands/CommandTypes";

export function formatCommanderRisk(model: CommanderRiskReadModel): string {
  if (model.items.length === 0) {
    return ["⚠️ Rischi", "", "Non lo so."].join("\n");
  }

  return [
    "⚠️ Rischi",
    "",
    ...model.items.map((item, index) => `${index + 1}. ${item.title}\n${item.level} — ${item.detail}`),
  ].join("\n");
}

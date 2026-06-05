import type { CommanderPriorityReadModel } from "../commands/CommandTypes";

export function formatCommanderPriority(model: CommanderPriorityReadModel): string {
  if (model.openItems.length === 0) {
    return ["📌 Priorità aperte", "", "Non lo so."].join("\n");
  }

  return [
    "📌 Priorità aperte",
    "",
    ...model.openItems.map(
      (item, index) =>
        `${index + 1}. ${item.cableCode}\n${item.priority} — ${item.reason ?? "Motivo non disponibile"}`
    ),
  ].join("\n");
}

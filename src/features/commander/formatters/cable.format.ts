import type { CommanderCableReadModel } from "../commands/CommandTypes";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

export function formatCommanderCable(model: CommanderCableReadModel): string {
  if (model.resolution.kind === "ambiguous") {
    return [
      `🔎 ${formatCableDisplay(model.code)}`,
      "",
      "Più cavi compatibili trovati.",
      ...model.resolution.candidates.map((candidate) => `- ${formatCableDisplay(candidate.display_code)}`),
    ].join("\n");
  }

  if (!model.story) {
    return [`🔎 ${formatCableDisplay(model.code)}`, "", "Non lo so."].join("\n");
  }

  const inca = model.story.inca;
  const summary = model.story.memory_summary;

  return [
    `🔎 ${formatCableDisplay(model.story.cable.normalized_code)}`,
    "",
    `Stato: ${summary.computed_status}`,
    `Confidenza: ${summary.global_confidence}%`,
    `Eventi: ${summary.events_count}`,
    `Messaggi prova: ${summary.source_messages_count}`,
    `Priorità aperte: ${summary.open_priorities_count}`,
    "",
    `INCA: ${inca?.codice ?? "Non lo so."}`,
    `Situazione: ${inca?.situazione ?? "Non lo so."}`,
    `Metri teorici: ${inca?.metri_teo ?? "Non lo so."}`,
    `Commessa: ${inca?.commessa ?? "Non lo so."}`,
  ].join("\n");
}

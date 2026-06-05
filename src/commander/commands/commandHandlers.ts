import { formatPrioritiesSummary } from "../priority/priorityFormatter";
import { formatTodaySummary, formatTomorrowSummary } from "../production/todayFormatter";
import { formatRiskSummary } from "../risk/riskFormatter";
import { formatCableStory } from "../story/storyFormatter";
import type {
  CableSummaryResponse,
  CommanderCommandName,
  InternalApiClient,
} from "../types";
import { CommanderHttpError } from "../infra/http";

function formatCableSummary(payload: CableSummaryResponse): string {
  return [
    `Code: ${payload.code}`,
    `Statut: ${payload.status ?? "inconnu"}`,
    `Confiance: ${payload.confidence ?? "n/a"}`,
    `Dernier signal: ${payload.last_signal_text ?? "aucun"}`,
    `INCA: ${payload.inca_found ? "trouve" : "non trouve"}`,
  ].join("\n");
}

function requireArgument(command: CommanderCommandName, argument: string | null): string {
  const value = argument?.trim();
  if (!value) {
    throw new CommanderHttpError(400, "missing_argument", `Missing argument for #${command}`);
  }
  return value;
}

export async function handleCommanderCommand(
  command: CommanderCommandName,
  argument: string | null,
  api: InternalApiClient,
): Promise<string> {
  switch (command) {
    case "cable": {
      const code = requireArgument(command, argument);
      return formatCableSummary(await api.getCableSummary(code));
    }
    case "story": {
      const code = requireArgument(command, argument);
      return formatCableStory(await api.getCableStory(code));
    }
    case "priority":
      return formatPrioritiesSummary(await api.getPriorities());
    case "risk":
      return formatRiskSummary(await api.getRiskSummary());
    case "today":
      return formatTodaySummary(await api.getTodaySummary());
    case "tomorrow":
      return formatTomorrowSummary(await api.getTomorrowSummary());
  }
}

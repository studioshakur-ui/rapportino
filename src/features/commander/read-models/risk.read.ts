import { listOpenFindings } from "../../core-command/api/agentFindings.api";
import { listOpenPriorities } from "../../core-command/api/cablePriorities.api";
import type { Priority } from "../../core-command/types";
import type { CommanderRiskItem, CommanderRiskLevel, CommanderRiskReadModel } from "../commands/CommandTypes";

function mapPriorityLevel(priority: string): CommanderRiskLevel {
  switch (priority as Priority) {
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

function mapFindingLevel(severity: string): CommanderRiskLevel {
  switch (severity) {
    case "block":
      return "Critico";
    case "warn":
      return "Alto";
    default:
      return "Medio";
  }
}

function rankLevel(level: CommanderRiskLevel): number {
  switch (level) {
    case "Critico":
      return 4;
    case "Alto":
      return 3;
    case "Medio":
      return 2;
    default:
      return 1;
  }
}

function buildPriorityRiskItems(): Promise<CommanderRiskItem[]> {
  return listOpenPriorities(10).then((priorities) =>
    priorities.map((item) => ({
      title: item.cable_code,
      detail: item.reason ?? "Priorità aperta senza motivo dettagliato",
      level: mapPriorityLevel(item.priority),
    }))
  );
}

function buildFindingRiskItems(): Promise<CommanderRiskItem[]> {
  return listOpenFindings(undefined, 10).then((findings) =>
    findings.map((item) => ({
      title: item.entity_id || item.finding_type || "Rischio aperto",
      detail: item.message,
      level: mapFindingLevel(item.severity),
    }))
  );
}

export async function loadCommanderRisk(): Promise<CommanderRiskReadModel> {
  const [priorityItems, findingItems] = await Promise.all([
    buildPriorityRiskItems(),
    buildFindingRiskItems(),
  ]);

  const items = [...priorityItems, ...findingItems]
    .sort((left, right) => rankLevel(right.level) - rankLevel(left.level))
    .slice(0, 12);

  return {
    items,
  };
}

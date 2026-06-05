import type { TodaySummaryResponse, TomorrowSummaryResponse } from "../types";

export function formatTodaySummary(payload: TodaySummaryResponse): string {
  const problems = payload.problems.slice(0, 3).join(", ") || "aucun";
  const priorities = payload.priorities.slice(0, 3).join(", ") || "aucune";
  return [
    payload.plain_language_summary,
    `Messages: ${payload.messages_today}`,
    `Cables actifs: ${payload.active_cables}`,
    `Problemes: ${problems}`,
    `Priorites: ${priorities}`,
  ].join("\n");
}

export function formatTomorrowSummary(payload: TomorrowSummaryResponse): string {
  const actions = payload.recommended_actions.slice(0, 3).join(", ") || "aucune";
  const risks = payload.blocking_risks.slice(0, 3).join(", ") || "aucun";
  const zones = payload.priority_zones.slice(0, 3).join(", ") || "aucune";
  return [
    `Actions demain: ${actions}`,
    `Risques: ${risks}`,
    `Zones: ${zones}`,
  ].join("\n");
}

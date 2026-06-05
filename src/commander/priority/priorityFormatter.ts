import type { PrioritiesResponse } from "../types";

export function formatPrioritiesSummary(payload: PrioritiesResponse): string {
  if (payload.top.length === 0) {
    return "Aucune priorite ouverte.";
  }

  const lines = payload.top.slice(0, 5).map((item) => {
    const reason = item.reason ? ` - ${item.reason}` : "";
    return `${item.cable_code} [${item.priority}]${reason}`;
  });

  return [
    `Priorites ouvertes: ${payload.counts.open}`,
    ...lines,
  ].join("\n");
}

import type { PrioritiesResponse } from "../types";
import { formatCableDisplay } from "../../core/cable/cableDisplay";

export function formatPrioritiesSummary(payload: PrioritiesResponse): string {
  if (payload.top.length === 0) {
    return "Aucune priorite ouverte.";
  }

  const lines = payload.top.slice(0, 5).map((item) => {
    const reason = item.reason ? ` - ${item.reason}` : "";
    return `${formatCableDisplay(item.cable_code)} [${item.priority}]${reason}`;
  });

  return [
    `Priorites ouvertes: ${payload.counts.open}`,
    ...lines,
  ].join("\n");
}

import type { RiskSummaryResponse } from "../types";

function summarizeBucket(label: string, count: number): string {
  return `${label}: ${count}`;
}

export function formatRiskSummary(payload: RiskSummaryResponse): string {
  const lines = [
    summarizeBucket("Cables courts", payload.short_cables.length),
    summarizeBucket("Cables manquants", payload.missing_cables.length),
    summarizeBucket("Contradictions", payload.contradictions.length),
    summarizeBucket("Sans confirmation", payload.unconfirmed.length),
  ];

  if (payload.zones.length > 0) {
    lines.push(`Zones a risque: ${payload.zones.slice(0, 3).join(", ")}`);
  }

  return lines.join("\n");
}

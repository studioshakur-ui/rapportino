import type { CableStoryResponse } from "../types";

export function formatCableStory(payload: CableStoryResponse): string {
  const majorEvents = payload.major_events.slice(0, 3).join(" | ") || "Aucun evenement majeur";
  return [
    payload.headline,
    `Premier signal: ${payload.first_signal ?? "inconnu"}`,
    `Moments cles: ${majorEvents}`,
    `Dernier signal: ${payload.last_signal ?? "inconnu"}`,
  ].join("\n");
}

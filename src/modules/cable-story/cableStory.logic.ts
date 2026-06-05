import type {
  CableStoryConfidenceBand,
  CableStoryFinding,
  CableStoryIncaCard,
  CableStoryPriority,
  CableStorySource,
  CableStoryTimelineItem,
} from "./cableStory.types";
import { getIncaStatusDefinition } from "../../core/inca/statusDictionary";

type StoryStatus =
  | "Pose confirmée"
  | "À vérifier"
  | "Bloqué"
  | "Court"
  | "Mentionné"
  | "Sans signal récent";

const EVENT_SUMMARY: Record<string, string> = {
  MATCHED_INCA: "Créé dans INCA",
  MENTIONED: "Mentionné",
  MATCHED: "Match INCA détecté",
  MATCHED_INCA_EVENT: "Match INCA détecté",
  POSED_REPORTED: "Signalé posé",
  SHORT_REPORTED: "Signalé court",
  MISSING_REPORTED: "Signalé manquant",
  BLOCKED_REPORTED: "Signalé à vérifier",
  CONFIRMED: "Confirmé",
  RESOLVED: "Résolu",
};

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function mapStoryEventType(rawType: string): string {
  switch (rawType) {
    case "MATCHED_INCA":
      return "MATCHED_INCA";
    case "CABLE_POSATO":
      return "POSED_REPORTED";
    case "CABLE_CORTO":
      return "SHORT_REPORTED";
    case "CABLE_MANCANTE":
      return "MISSING_REPORTED";
    case "CABLE_DA_CONTROLLARE":
      return "BLOCKED_REPORTED";
    case "CABLE_MENTION":
    case "GENERAL_MESSAGE":
      return "MENTIONED";
    case "validated":
      return "CONFIRMED";
    case "resolved":
      return "RESOLVED";
    default:
      return rawType || "MENTIONED";
  }
}

export function getTimelineSummary(eventType: string, actorLabel: string | null): string {
  const base = EVENT_SUMMARY[eventType] ?? eventType.replace(/_/g, " ");
  return actorLabel ? `${base} par ${actorLabel}` : base;
}

export function getConfidenceBand(confidence: number): CableStoryConfidenceBand {
  if (confidence >= 80) return "High";
  if (confidence >= 50) return "Medium";
  return "Low";
}

function mapIncaSituazioneStatus(situazione: string | null | undefined): StoryStatus {
  const definition = getIncaStatusDefinition(situazione);
  if (definition?.code === "P" || definition?.code === "C") return "Pose confirmée";
  if (definition?.isBlocked) return "Bloqué";
  if (definition) return "À vérifier";
  return "Sans signal récent";
}

function highestPriority(priorities: CableStoryPriority[]): CableStoryPriority | null {
  const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...priorities]
    .filter((priority) => priority.status === "open")
    .sort((left, right) => (rank[right.priority] ?? 0) - (rank[left.priority] ?? 0))[0] ?? null;
}

export function hasContradictions(
  timeline: CableStoryTimelineItem[],
  findings: CableStoryFinding[]
): boolean {
  const kinds = new Set(timeline.map((item) => item.event_type));
  const contradictoryEvents =
    (kinds.has("POSED_REPORTED") && kinds.has("SHORT_REPORTED")) ||
    (kinds.has("POSED_REPORTED") && kinds.has("MISSING_REPORTED"));

  const contradictoryFindings = findings.some(
    (finding) =>
      finding.status === "open" &&
      (finding.severity === "warn" || finding.severity === "block") &&
      /incoh|contradic|ambigu/i.test(finding.message)
  );

  return contradictoryEvents || contradictoryFindings;
}

export function computeGlobalConfidence(args: {
  timeline: CableStoryTimelineItem[];
  findings: CableStoryFinding[];
  priorities: CableStoryPriority[];
  hasExactIncaMatch: boolean;
}): number {
  const { timeline, findings, priorities, hasExactIncaMatch } = args;
  if (timeline.length === 0) {
    return hasExactIncaMatch ? 55 : 20;
  }

  const baseAverage = timeline.reduce((sum, item) => sum + item.confidence, 0) / timeline.length;
  const promotedCount = timeline.filter((item) => item.status === "promoted").length;
  const confirmationCount = timeline.filter((item) => item.event_type === "CONFIRMED").length;
  const contradictionPenalty = hasContradictions(timeline, findings) ? 18 : 0;
  const severePriorityPenalty = priorities.some(
    (priority) => priority.status === "open" && (priority.priority === "high" || priority.priority === "critical")
  )
    ? 12
    : 0;
  const openFindingPenalty = findings.filter((finding) => finding.status === "open" && finding.severity !== "info").length * 4;
  const exactMatchBonus = hasExactIncaMatch ? 15 : 0;
  const promotedBonus = Math.min(promotedCount * 4, 12);
  const confirmationBonus = Math.min(confirmationCount * 6, 12);

  const total =
    baseAverage +
    exactMatchBonus +
    promotedBonus +
    confirmationBonus -
    contradictionPenalty -
    severePriorityPenalty -
    openFindingPenalty;

  return Math.max(0, Math.min(100, Math.round(total)));
}

export function computeStoryStatus(args: {
  inca: CableStoryIncaCard | null;
  timeline: CableStoryTimelineItem[];
  priorities: CableStoryPriority[];
  findings: CableStoryFinding[];
}): StoryStatus {
  const { inca, timeline, priorities, findings } = args;
  const topPriority = highestPriority(priorities);

  if (topPriority?.status === "open") {
    if (topPriority.priority === "critical" || topPriority.priority === "high") return "À vérifier";
    if (/court/i.test(topPriority.reason ?? "")) return "Court";
    if (/bloqu|contr[oô]l/i.test(topPriority.reason ?? "")) return "Bloqué";
  }

  const latestEvent = [...timeline]
    .filter((item) => item.event_type !== "MATCHED_INCA")
    .sort((left, right) => right.event_at.localeCompare(left.event_at))[0];

  if (latestEvent) {
    if (latestEvent.event_type === "POSED_REPORTED" || latestEvent.event_type === "RESOLVED") return "Pose confirmée";
    if (latestEvent.event_type === "SHORT_REPORTED") return "Court";
    if (latestEvent.event_type === "BLOCKED_REPORTED") return "Bloqué";
    if (latestEvent.event_type === "MISSING_REPORTED") return "À vérifier";
    if (latestEvent.event_type === "MENTIONED" || latestEvent.event_type === "CONFIRMED") return "Mentionné";
  }

  const criticalFinding = findings.find(
    (finding) => finding.status === "open" && (finding.severity === "block" || finding.severity === "warn")
  );
  if (criticalFinding) return "À vérifier";

  if (inca) return mapIncaSituazioneStatus(inca.situazione);
  if (timeline.length > 0) return "Mentionné";
  return "Sans signal récent";
}

export function buildShortStory(args: {
  inca: CableStoryIncaCard | null;
  timeline: CableStoryTimelineItem[];
  findings: CableStoryFinding[];
}): string[] {
  const story: string[] = [];
  const seen = new Set<string>();

  if (args.inca) {
    story.push("Créé dans INCA");
  }

  const significantEvents = args.timeline
    .filter((item) => item.event_type !== "MATCHED_INCA")
    .sort((left, right) => left.event_at.localeCompare(right.event_at));

  for (const event of significantEvents) {
    const date = new Date(event.event_at);
    const label = `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${event.summary}`;
    if (!seen.has(label)) {
      story.push(label);
      seen.add(label);
    }
    if (story.length >= 7) break;
  }

  const openFinding = args.findings.find((finding) => finding.status === "open");
  if (openFinding && story.length < 8) {
    story.push(`Signal faible: ${openFinding.message}`);
  }

  return unique(story).slice(0, 8);
}

export function formatStatusTone(status: string): string {
  switch (status) {
    case "Pose confirmée":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
    case "Court":
      return "bg-orange-500/15 text-orange-200 border-orange-500/30";
    case "Bloqué":
      return "bg-red-500/15 text-red-200 border-red-500/30";
    case "À vérifier":
      return "bg-amber-500/15 text-amber-200 border-amber-500/30";
    case "Mentionné":
      return "bg-sky-500/15 text-sky-200 border-sky-500/30";
    default:
      return "bg-zinc-500/15 text-zinc-200 border-zinc-500/30";
  }
}

export function formatConfidenceTone(band: CableStoryConfidenceBand): string {
  switch (band) {
    case "High":
      return "text-emerald-300";
    case "Medium":
      return "text-amber-300";
    default:
      return "text-red-300";
  }
}

export function buildSourceHint(source: string | null | undefined): string {
  if (!source) return "CORE Memory";
  if (source === "whatsapp") return "WhatsApp";
  if (source === "inca") return "INCA";
  return source;
}

export function buildMessageExcerpt(source: CableStorySource): string {
  const text = String(source.excerpt ?? "").trim();
  if (!text) return "Message sans texte exploitable";
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

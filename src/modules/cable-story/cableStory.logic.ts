import type {
  CableStoryConfidenceBand,
  CableStoryFinding,
  CableStoryIncaCard,
  CableStoryPriority,
  CableStorySource,
  CableStoryTimelineItem,
} from "./cableStory.types";
import { ensureArray } from "../../core/utils/array";
import { translateIncaStatus } from "../../domain/core-engine/incaStatus";
import { resolveFieldStatus } from "../../domain/core-engine/fieldVerification";

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
  FIELD_VERIFIED: "Vérifié terrain",
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
    case "FIELD_VERIFIED":
      return "FIELD_VERIFIED";
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
  const status = translateIncaStatus(situazione);
  if (status.status === "POSATO" || status.status === "COLLEGATO" || status.status === "PARZIALMENTE_COLLEGATO") return "Pose confirmée";
  if (status.isBlocked) return "Bloqué";
  if (status.status !== "SCONOSCIUTO" && status.status !== "DA_VERIFICARE") return "À vérifier";
  if (status.status === "DA_VERIFICARE") return "Sans signal récent";
  return "Sans signal récent";
}

function highestPriority(priorities: CableStoryPriority[]): CableStoryPriority | null {
  const safePriorities = ensureArray(priorities, "cableStory.highestPriority.priorities");
  const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...safePriorities]
    .filter((priority) => priority.status === "open")
    .sort((left, right) => (rank[right.priority] ?? 0) - (rank[left.priority] ?? 0))[0] ?? null;
}

export function hasContradictions(
  timeline: CableStoryTimelineItem[],
  findings: CableStoryFinding[]
): boolean {
  const safeTimeline = ensureArray(timeline, "cableStory.hasContradictions.timeline");
  const safeFindings = ensureArray(findings, "cableStory.hasContradictions.findings");
  const kinds = new Set(safeTimeline.map((item) => item.event_type));
  const contradictoryEvents =
    (kinds.has("POSED_REPORTED") && kinds.has("SHORT_REPORTED")) ||
    (kinds.has("POSED_REPORTED") && kinds.has("MISSING_REPORTED"));

  const contradictoryFindings = safeFindings.some(
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
  const safeTimeline = ensureArray(timeline, "cableStory.computeGlobalConfidence.timeline");
  const safeFindings = ensureArray(findings, "cableStory.computeGlobalConfidence.findings");
  const safePriorities = ensureArray(priorities, "cableStory.computeGlobalConfidence.priorities");
  if (safeTimeline.length === 0) {
    return hasExactIncaMatch ? 55 : 20;
  }

  const baseAverage = safeTimeline.reduce((sum, item) => sum + item.confidence, 0) / safeTimeline.length;
  const promotedCount = safeTimeline.filter((item) => item.status === "promoted").length;
  const confirmationCount = safeTimeline.filter((item) => item.event_type === "CONFIRMED").length;
  const contradictionPenalty = hasContradictions(safeTimeline, safeFindings) ? 18 : 0;
  const severePriorityPenalty = safePriorities.some(
    (priority) => priority.status === "open" && (priority.priority === "high" || priority.priority === "critical")
  )
    ? 12
    : 0;
  const openFindingPenalty = safeFindings.filter((finding) => finding.status === "open" && finding.severity !== "info").length * 4;
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
  const safeTimeline = ensureArray(timeline, "cableStory.computeStoryStatus.timeline");
  const safeFindings = ensureArray(findings, "cableStory.computeStoryStatus.findings");
  const topPriority = highestPriority(priorities);
  const hasVerifiedFieldProof = safeTimeline.some(
    (item) => item.event_type === "POSED_REPORTED" || item.event_type === "RESOLVED" || item.event_type === "FIELD_VERIFIED" || item.event_type === "CONFIRMED"
  );
  const hasCriticalFinding = Boolean(
    safeFindings.find((finding) => finding.status === "open" && finding.severity === "block")
  );
  const fieldStatus = resolveFieldStatus({
    hasCriticalFinding: hasCriticalFinding || topPriority?.status === "open" && (topPriority.priority === "critical" || /bloqu|contr[oô]l/i.test(topPriority.reason ?? "")),
    hasVerificationProof: hasVerifiedFieldProof,
  });

  if (fieldStatus === "BLOCKED") return "Bloqué";
  if (fieldStatus === "VERIFIED") return "Pose confirmée";

  if (topPriority?.status === "open") {
    if (topPriority.priority === "critical" || topPriority.priority === "high") return "À vérifier";
    if (/court/i.test(topPriority.reason ?? "")) return "Court";
    if (/bloqu|contr[oô]l/i.test(topPriority.reason ?? "")) return "Bloqué";
  }

  const latestEvent = [...safeTimeline]
    .filter((item) => item.event_type !== "MATCHED_INCA")
    .sort((left, right) => right.event_at.localeCompare(left.event_at))[0];

  if (latestEvent) {
    if (latestEvent.event_type === "POSED_REPORTED" || latestEvent.event_type === "RESOLVED" || latestEvent.event_type === "FIELD_VERIFIED") return "Pose confirmée";
    if (latestEvent.event_type === "SHORT_REPORTED") return "Court";
    if (latestEvent.event_type === "BLOCKED_REPORTED") return "Bloqué";
    if (latestEvent.event_type === "MISSING_REPORTED") return "À vérifier";
    if (latestEvent.event_type === "MENTIONED" || latestEvent.event_type === "CONFIRMED") return "Mentionné";
  }

  const criticalFinding = safeFindings.find(
    (finding) => finding.status === "open" && (finding.severity === "block" || finding.severity === "warn")
  );
  if (criticalFinding) return "À vérifier";

  if (inca) return mapIncaSituazioneStatus(inca.situazione);
  if (safeTimeline.length > 0) return "Mentionné";
  return "Sans signal récent";
}

export function buildShortStory(args: {
  inca: CableStoryIncaCard | null;
  timeline: CableStoryTimelineItem[];
  findings: CableStoryFinding[];
}): string[] {
  const safeTimeline = ensureArray(args.timeline, "cableStory.buildShortStory.timeline");
  const safeFindings = ensureArray(args.findings, "cableStory.buildShortStory.findings");
  const story: string[] = [];
  const seen = new Set<string>();

  if (args.inca) {
    story.push("Créé dans INCA");
  }

  const significantEvents = safeTimeline
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

  const openFinding = safeFindings.find((finding) => finding.status === "open");
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

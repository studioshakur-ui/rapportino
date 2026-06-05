import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../types/supabase.generated";
import { normalizeCableCode } from "../../features/core-command/agents/normalizer.agent";
import { buildShortStory, buildSourceHint, computeGlobalConfidence, computeStoryStatus, getConfidenceBand, getTimelineSummary, hasContradictions, mapStoryEventType } from "./cableStory.logic";
import type {
  CableStoryCandidate,
  CableStoryIncaCard,
  CableStoryLoadResult,
  CableStoryPriority,
  CableStorySource,
  CableStoryTimelineItem,
  CableStoryViewModel,
} from "./cableStory.types";
import { toCableStoryFinding, toCableStoryPriority } from "./cableStory.types";

type IncaCableRow = Pick<
  Database["public"]["Tables"]["inca_cavi"]["Row"],
  "id" | "codice" | "codice_norm" | "situazione" | "metri_teo" | "impianto" | "zona_da" | "zona_a" | "commessa" | "created_at"
>;

type CoreEventRow = Database["public"]["Tables"]["core_events"]["Row"];
type CableEventRow = Database["public"]["Tables"]["cable_events"]["Row"];
type WhatsAppMessageRow = Database["public"]["Tables"]["whatsapp_messages"]["Row"];

const INCA_SELECT =
  "id,codice,codice_norm,situazione,metri_teo,impianto,zona_da,zona_a,commessa,created_at";

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const items: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    items.push(row);
  }
  return items;
}

function compactCode(code: string): string {
  return code.replace(/\s+/g, "");
}

function sanitizeCodeVariant(code: string): string {
  return code
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/[◑●○◐◒◓◔◕▶▷►◀◁◄]/g, "")
    .replace(/[.\s]+/g, " ")
    .trim()
    .toUpperCase();
}

function buildLetterGroupings(letters: string): string[] {
  if (letters.length <= 1) return [letters];

  const values = new Set<string>();
  for (let index = 1; index < letters.length; index += 1) {
    const head = letters.slice(0, index);
    const tail = letters.slice(index);
    for (const groupedTail of buildLetterGroupings(tail)) {
      values.add(`${head} ${groupedTail}`);
    }
  }
  values.add(letters);
  return Array.from(values);
}

function buildCodeVariants(rawInput: string, normalizedCode: string): string[] {
  const values = new Set<string>();
  const sanitizedRaw = sanitizeCodeVariant(rawInput);
  const sanitizedNormalized = sanitizeCodeVariant(normalizedCode);

  if (sanitizedRaw) values.add(sanitizedRaw);
  if (sanitizedNormalized) values.add(sanitizedNormalized);

  const match = sanitizedNormalized.match(/^([A-Z]{2,5})\s+(\d{2,5})(?:\s+([A-Z]))?$/);
  if (!match) {
    values.add(compactCode(sanitizedNormalized));
    return Array.from(values);
  }

  const [, letters, digits, suffix] = match;
  const compactNormalized = `${letters}${digits}${suffix ? suffix : ""}`;
  values.add(compactNormalized);

  for (const grouping of buildLetterGroupings(letters)) {
    values.add(suffix ? `${grouping} ${digits} ${suffix}` : `${grouping} ${digits}`);
  }

  return Array.from(values);
}

function toIncaCard(row: IncaCableRow | null): CableStoryIncaCard | null {
  if (!row) return null;
  return {
    id: row.id,
    codice: row.codice,
    situazione: row.situazione,
    metri_teo: row.metri_teo,
    impianto: row.impianto,
    zona_da: row.zona_da,
    zona_a: row.zona_a,
    commessa: row.commessa,
    created_at: row.created_at,
  };
}

async function listIncaCandidates(
  rawInput: string,
  normalizedCode: string,
  linkedIncaIds: string[]
): Promise<IncaCableRow[]> {
  const exactVariants = buildCodeVariants(rawInput, normalizedCode);
  const compactVariants = Array.from(new Set(exactVariants.map((variant) => compactCode(variant)).filter(Boolean)));
  const wildcardVariants = Array.from(
    new Set(
      exactVariants
        .map((variant) => `%${variant.replace(/\s+/g, "%")}%`)
        .filter((variant) => variant !== "%%")
    )
  );

  const queries = [
    supabase.from("inca_cavi").select(INCA_SELECT).in("codice", exactVariants).limit(12),
    supabase.from("inca_cavi").select(INCA_SELECT).in("codice_norm", compactVariants).limit(12),
    ...wildcardVariants.slice(0, 4).map((variant) =>
      supabase.from("inca_cavi").select(INCA_SELECT).ilike("codice", variant).limit(12)
    ),
  ];

  if (linkedIncaIds.length > 0) {
    queries.unshift(
      supabase.from("inca_cavi").select(INCA_SELECT).in("id", linkedIncaIds).limit(12)
    );
  }

  const results = await Promise.all(queries);
  const errors = results.map((result) => result.error).filter(Boolean);
  if (errors.length > 0) {
    throw errors[0];
  }

  return dedupeById(results.flatMap((result) => (result.data ?? []) as IncaCableRow[]));
}

function buildCandidates(rows: IncaCableRow[], normalizedCode: string): CableStoryCandidate[] {
  return rows.map((row) => ({
    id: row.id,
    normalized_code: normalizedCode,
    display_code: row.codice,
    commessa: row.commessa,
    impianto: row.impianto,
    zona_da: row.zona_da,
    zona_a: row.zona_a,
    source: "inca" as const,
  }));
}

async function loadEventsForCable(normalizedCode: string): Promise<{ coreEvents: CoreEventRow[]; cableEvents: CableEventRow[] }> {
  const [coreEventsResult, cableEventsResult] = await Promise.all([
    supabase
      .from("core_events")
      .select("*")
      .eq("cable_code_normalized", normalizedCode)
      .order("occurred_at", { ascending: true })
      .limit(400),
    supabase
      .from("cable_events")
      .select("*")
      .eq("cable_code", normalizedCode)
      .order("occurred_at", { ascending: true })
      .limit(400),
  ]);

  if (coreEventsResult.error) throw coreEventsResult.error;
  if (cableEventsResult.error) throw cableEventsResult.error;

  return {
    coreEvents: coreEventsResult.data ?? [],
    cableEvents: cableEventsResult.data ?? [],
  };
}

async function loadSources(messageIds: string[]): Promise<Map<string, WhatsAppMessageRow>> {
  if (messageIds.length === 0) return new Map<string, WhatsAppMessageRow>();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .in("id", messageIds);

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function loadPriorities(normalizedCode: string): Promise<CableStoryPriority[]> {
  const { data, error } = await supabase
    .from("cable_priorities")
    .select("*")
    .eq("cable_code", normalizedCode)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toCableStoryPriority);
}

async function loadFindings(normalizedCode: string, coreEventIds: string[]): Promise<ReturnType<typeof toCableStoryFinding>[]> {
  const queries = [
    supabase
      .from("agent_findings")
      .select("*")
      .eq("entity_type", "cable_code")
      .eq("entity_id", normalizedCode)
      .order("created_at", { ascending: false }),
  ];

  if (coreEventIds.length > 0) {
    queries.push(
      supabase
        .from("agent_findings")
        .select("*")
        .in("core_event_id", coreEventIds)
        .order("created_at", { ascending: false })
    );
  }

  const results = await Promise.all(queries);
  for (const result of results) {
    if (result.error) throw result.error;
  }

  return dedupeById(results.flatMap((result) => (result.data ?? []).map(toCableStoryFinding)));
}

function buildTimeline(args: {
  inca: CableStoryIncaCard | null;
  coreEvents: CoreEventRow[];
  cableEvents: CableEventRow[];
  messageMap: Map<string, WhatsAppMessageRow>;
  priorities: CableStoryPriority[];
  contradictory: boolean;
}): CableStoryTimelineItem[] {
  const { inca, coreEvents, cableEvents, messageMap, priorities, contradictory } = args;
  const coreById = new Map(coreEvents.map((event) => [event.id, event]));
  const priorityByCoreEventId = new Map(
    priorities
      .filter((priority) => priority.source_event_id)
      .map((priority) => [priority.source_event_id as string, priority.priority])
  );

  const timeline: CableStoryTimelineItem[] = [];
  const promotedCoreIds = new Set<string>();

  if (inca?.created_at) {
    timeline.push({
      id: `inca-${inca.id ?? "unknown"}`,
      event_at: inca.created_at,
      event_type: "MATCHED_INCA",
      status: "read_only",
      actor_label: "INCA",
      source_type: "INCA",
      summary: "Créé dans INCA",
      detail: inca.codice ? `Câble ${inca.codice} présent dans INCA.` : "Câble présent dans INCA.",
      confidence: 100,
      priority_level: null,
      message_id: null,
      core_event_id: null,
      is_contradictory: contradictory,
    });
  }

  for (const cableEvent of cableEvents) {
    const linkedCore = coreById.get(cableEvent.core_event_id);
    const linkedMessage = cableEvent.source_message_id ? messageMap.get(cableEvent.source_message_id) ?? null : null;
    promotedCoreIds.add(cableEvent.core_event_id);

    const payloadAuthor = String((linkedCore?.payload as Record<string, unknown> | null)?.author ?? "").trim();
    const actorLabel = linkedMessage?.author ?? (payloadAuthor || null);

    const eventType = mapStoryEventType(cableEvent.event_kind);
    timeline.push({
      id: cableEvent.id,
      event_at: cableEvent.occurred_at,
      event_type: eventType,
      status: linkedCore?.validation_status ?? "promoted",
      actor_label: actorLabel,
      source_type: buildSourceHint(linkedCore?.source ?? "core_memory"),
      summary: getTimelineSummary(eventType, actorLabel),
      detail: linkedMessage?.raw_message ?? linkedCore?.raw_text ?? cableEvent.note,
      confidence: Math.round((cableEvent.confidence ?? 0) * 100),
      priority_level: priorityByCoreEventId.get(cableEvent.core_event_id) ?? null,
      message_id: cableEvent.source_message_id,
      core_event_id: cableEvent.core_event_id,
      is_contradictory: contradictory,
    });
  }

  for (const coreEvent of coreEvents) {
    if (promotedCoreIds.has(coreEvent.id)) continue;
    const linkedMessage = coreEvent.source_message_id ? messageMap.get(coreEvent.source_message_id) ?? null : null;
    const payloadAuthor = String((coreEvent.payload as Record<string, unknown> | null)?.author ?? "").trim();
    const actorLabel = linkedMessage?.author ?? (payloadAuthor || null);

    const baseType = mapStoryEventType(coreEvent.event_type);
    const eventType =
      coreEvent.validation_status === "validated" ? "CONFIRMED" :
      coreEvent.validation_status === "rejected" ? "BLOCKED_REPORTED" :
      baseType;

    timeline.push({
      id: `core-${coreEvent.id}`,
      event_at: coreEvent.occurred_at,
      event_type: eventType,
      status: coreEvent.validation_status,
      actor_label: actorLabel,
      source_type: buildSourceHint(coreEvent.source),
      summary: getTimelineSummary(eventType, actorLabel),
      detail: linkedMessage?.raw_message ?? coreEvent.raw_text,
      confidence: Math.round((coreEvent.confidence ?? 0) * 100),
      priority_level: priorityByCoreEventId.get(coreEvent.id) ?? null,
      message_id: coreEvent.source_message_id,
      core_event_id: coreEvent.id,
      is_contradictory: contradictory,
    });
  }

  return timeline.sort((left, right) => left.event_at.localeCompare(right.event_at));
}

function buildSources(messageMap: Map<string, WhatsAppMessageRow>, timeline: CableStoryTimelineItem[]): CableStorySource[] {
  const ids = Array.from(
    new Set(
      timeline
        .map((item) => item.message_id)
        .filter((messageId): messageId is string => Boolean(messageId))
    )
  );

  return ids
    .map((id) => messageMap.get(id))
    .filter((message): message is WhatsAppMessageRow => Boolean(message))
    .sort((left, right) => left.message_ts.localeCompare(right.message_ts))
    .map((message) => ({
      id: message.id,
      source_type: "whatsapp" as const,
      author: message.author,
      occurred_at: message.message_ts,
      excerpt: message.raw_message,
      media_type: message.media_type,
      media_filename: message.media_filename,
    }));
}

export async function loadCableStory(inputCode: string, selectedCandidateId?: string | null): Promise<CableStoryLoadResult> {
  const normalizedCode = normalizeCableCode(inputCode);
  const { coreEvents, cableEvents } = await loadEventsForCable(normalizedCode);
  const linkedIncaIds = Array.from(
    new Set(coreEvents.map((event) => event.inca_cavo_id).filter((value): value is string => Boolean(value)))
  );
  const candidatesRows = await listIncaCandidates(inputCode, normalizedCode, linkedIncaIds);
  const candidates = buildCandidates(candidatesRows, normalizedCode);

  const exactCandidates = candidates.filter((candidate) => compactCode(candidate.display_code) === compactCode(normalizedCode));
  const effectiveCandidates = exactCandidates.length > 0 ? exactCandidates : candidates;

  if (effectiveCandidates.length > 1 && !selectedCandidateId) {
    return {
      kind: "ambiguous",
      normalized_code: normalizedCode,
      candidates: effectiveCandidates,
      selected_candidate_id: null,
    };
  }

  const selectedRow =
    candidatesRows.find((row) => row.id === selectedCandidateId) ??
    (effectiveCandidates.length === 1
      ? candidatesRows.find((row) => row.id === effectiveCandidates[0].id) ?? null
      : null);

  const inca = toIncaCard(selectedRow);

  const messageIds = Array.from(
    new Set(
      [...coreEvents.map((event) => event.source_message_id), ...cableEvents.map((event) => event.source_message_id)].filter(
        (messageId): messageId is string => Boolean(messageId)
      )
    )
  );

  const [messageMap, priorities, findings] = await Promise.all([
    loadSources(messageIds),
    loadPriorities(normalizedCode),
    loadFindings(normalizedCode, coreEvents.map((event) => event.id)),
  ]);

  const provisionalTimeline = buildTimeline({
    inca,
    coreEvents,
    cableEvents,
    messageMap,
    priorities,
    contradictory: false,
  });

  const contradictory = hasContradictions(provisionalTimeline, findings);
  const timeline = buildTimeline({
    inca,
    coreEvents,
    cableEvents,
    messageMap,
    priorities,
    contradictory,
  });
  const sources = buildSources(messageMap, timeline);

  const globalConfidence = computeGlobalConfidence({
    timeline,
    findings,
    priorities,
    hasExactIncaMatch: Boolean(inca?.id),
  });
  const computedStatus = computeStoryStatus({ inca, timeline, priorities, findings });
  const confidenceBand = getConfidenceBand(globalConfidence);

  const model: CableStoryViewModel = {
    cable: {
      code: inputCode,
      normalized_code: normalizedCode,
    },
    inca,
    memory_summary: {
      first_signal_at: timeline[0]?.event_at ?? null,
      last_signal_at: timeline[timeline.length - 1]?.event_at ?? null,
      source_messages_count: sources.length,
      events_count: timeline.filter((item) => item.event_type !== "MATCHED_INCA").length,
      findings_count: findings.length,
      open_priorities_count: priorities.filter((priority) => priority.status === "open").length,
      global_confidence: globalConfidence,
      confidence_band: confidenceBand,
      computed_status: computedStatus,
      has_contradictions: contradictory,
    },
    timeline,
    priorities,
    findings,
    sources,
    short_story: buildShortStory({ inca, timeline, findings }),
  };

  return {
    kind: "resolved",
    model,
    candidates: effectiveCandidates,
    selected_candidate_id: selectedRow?.id ?? null,
  };
}

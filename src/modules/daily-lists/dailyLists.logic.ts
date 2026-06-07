// src/modules/daily-lists/dailyLists.logic.ts
// CORE COMMAND — Daily List Engine
// Status computation + AI-ready briefing context builder.
// NO LLM calls. Pure deterministic functions.
// INCA read-only.

import type {
  DailyItemEvidence,
  DailyItemStatus,
  DailyListItem,
  DailyListItemVM,
  DailyListSummary,
  DailyBriefingContext,
  PerimeterSummary,
  TomorrowAction,
} from "./dailyLists.types";

// ── Progress % extraction from WhatsApp raw note ───────────────────────────
const PERCENT_RE = /(\d{1,3})\s*%/;

export function extractProgressPercent(note: string | null): number | null {
  if (!note) return null;
  const m = note.match(PERCENT_RE);
  if (!m) return null;
  const val = parseInt(m[1], 10);
  return val >= 0 && val <= 100 ? val : null;
}

// ── Event kinds that mean "cable is posed / confirmed on the field" ─────────
// cable_events store raw kinds ("CABLE_POSATO"); core_events store the mapped
// story type ("POSED_REPORTED", "RESOLVED"). Both must count as field proof.
const POSED_EVENT_KINDS = new Set(["CABLE_POSATO", "POSED_REPORTED", "RESOLVED"]);

function isPosedEvent(eventKind: string | null | undefined): boolean {
  return eventKind ? POSED_EVENT_KINDS.has(eventKind) : false;
}

// ── Status computation ─────────────────────────────────────────────────────
export function computeItemStatus(
  item: DailyListItem,
  evidence: DailyItemEvidence[],
  hasOpenBlockingFinding: boolean
): DailyItemStatus {
  // Blocked by an open finding — always wins.
  if (hasOpenBlockingFinding) return "blocked";

  // ── Field evidence is the source of truth ─────────────────────────────────
  // REGRESSION FIX (P3): the previous version ran `if (!item.inca_cavo_id)
  // return "outside_inca"` FIRST, so whenever INCA resolution failed at import
  // time (e.g. PDF "I RS 002" vs normalized "IRS 002" vs inca_cavi.marca_cavo),
  // every item collapsed to "outside_inca" — dropping the list to 0% even with
  // real terrain proof. Field evidence must be evaluated before INCA matching.
  if (evidence.length > 0) {
    // Explicit 100% or a posed/confirmed event → confirmed terrain.
    const confirmed100 = evidence.some((e) => {
      const pct = extractProgressPercent(e.raw_note) ?? e.progress_percent;
      return isPosedEvent(e.event_kind) && (pct === 100 || pct === null);
    });
    if (confirmed100) return "confirmed_field";

    // Posed/confirmed event without explicit percent → likely laid.
    if (evidence.some((e) => isPosedEvent(e.event_kind))) return "likely_laid";

    // Partial % reported (e.g. 70%) → to verify. NOT counted as confirmed.
    const anyPartial = evidence.some((e) => {
      const pct = extractProgressPercent(e.raw_note) ?? e.progress_percent;
      return pct !== null && pct < 100;
    });
    if (anyPartial) return "to_verify";

    // Some signal exists but kind is unknown → likely laid (a message refs it).
    return "likely_laid";
  }

  // ── No field evidence at all ──────────────────────────────────────────────
  // Never matched in inca_cavi and never seen on the field.
  if (!item.inca_cavo_id) return "outside_inca";

  // Matched in INCA but no WhatsApp / field signal yet.
  return "no_evidence";
}

export function computeProgressPct(evidence: DailyItemEvidence[]): number | null {
  if (evidence.length === 0) return null;

  // Pick best percent from evidence
  let best: number | null = null;
  for (const e of evidence) {
    const pct = extractProgressPercent(e.raw_note) ?? e.progress_percent;
    if (pct !== null && (best === null || pct > best)) best = pct;
  }
  return best;
}

export function hasShortIssue(item: DailyListItem, evidence: DailyItemEvidence[]): boolean {
  const haystack = [
    item.note,
    item.situazione_inca,
    item.stato_collegamento,
    ...evidence.map((e) => e.raw_note),
  ].filter(Boolean).join(" ").toLowerCase();

  return /\b(corto|court|short|shortage|manca corto|troppo corto)\b/i.test(haystack);
}

export function hasMissingIssue(item: DailyListItem, evidence: DailyItemEvidence[]): boolean {
  const haystack = [
    item.note,
    item.situazione_inca,
    item.stato_collegamento,
    ...evidence.map((e) => e.raw_note),
  ].filter(Boolean).join(" ").toLowerCase();

  return /\b(manca|mancante|missing|non trovato|assente|da trovare)\b/i.test(haystack);
}

export function buildRecommendedAction(
  status: DailyItemStatus,
  flags: {
    hasShortIssue: boolean;
    hasMissingIssue: boolean;
    hasPartialProgress: boolean;
  }
): string {
  if (status === "outside_inca") return "Verificare il codice INCA prima di procedere sul terreno";
  if (status === "blocked") return "Risolvere il blocco aperto prima della chiusura";
  if (flags.hasShortIssue) return "Controllare lunghezza e avviare correzione cavo corto";
  if (flags.hasMissingIssue) return "Localizzare cavo mancante e confermare su Telegram/WhatsApp";
  if (flags.hasPartialProgress) return "Richiedere percentuale finale ed evidenza di posa";
  if (status === "no_evidence") return "Richiedere conferma Telegram/WhatsApp con foto o messaggio chiaro";
  if (status === "to_verify") return "Validare il completamento prima della chiusura lista";
  return "Archiviare come utilizzabile in Cable Story";
}

// ── Build ItemVM from DB rows ──────────────────────────────────────────────
export function buildItemVM(
  item: DailyListItem,
  evidence: DailyItemEvidence[],
  hasOpenBlockingFinding: boolean
): DailyListItemVM {
  const sorted = [...evidence].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  const computed_status = computeItemStatus(item, evidence, hasOpenBlockingFinding);
  const progress_percent = computeProgressPct(evidence);
  const last_event_at = sorted[0]?.occurred_at ?? null;
  const last_actor    = sorted[0]?.actor_label ?? null;
  const last_message  = sorted[0]?.last_message ?? sorted[0]?.raw_note ?? null;
  const last_event_type = sorted[0]?.event_kind ?? null;
  const last_confidence = sorted[0]?.confidence ?? null;
  const inca_matched  = Boolean(item.inca_cavo_id);
  const confirmed_by_whatsapp = evidence.some((e) => Boolean(e.whatsapp_message_id));
  const missing_evidence = evidence.length === 0;
  const has_short_issue = hasShortIssue(item, evidence);
  const has_missing_issue = hasMissingIssue(item, evidence);
  const has_partial_progress = progress_percent !== null && progress_percent < 100;
  const recommended_action = buildRecommendedAction(computed_status, {
    hasShortIssue: has_short_issue,
    hasMissingIssue: has_missing_issue,
    hasPartialProgress: has_partial_progress,
  });

  return {
    ...item,
    computed_status,
    evidence,
    confirmed_by_whatsapp,
    missing_evidence,
    has_short_issue,
    has_missing_issue,
    has_partial_progress,
    evidence_count: evidence.length,
    last_evidence_at: last_event_at,
    last_event_at,
    last_actor,
    last_message,
    last_event_type,
    last_confidence,
    progress_percent,
    inca_matched,
    cable_story_path: `/command/cable/${encodeURIComponent(item.cable_code_normalized)}`,
    recommended_action,
  };
}

// ── List summary ───────────────────────────────────────────────────────────
export function buildListSummary(
  importId: string,
  listDate: string | null,
  fileName: string,
  items: DailyListItemVM[]
): DailyListSummary {
  const counts = {
    confirmed_field: 0,
    likely_laid:     0,
    to_verify:       0,
    no_evidence:     0,
    missing:         0,
    blocked:         0,
    outside_inca:    0,
  };

  const perimeterMap = new Map<string, { total: number; confirmed: number; no_evidence: number }>();

  for (const item of items) {
    counts[item.computed_status]++;

    const perim = item.perimetro ?? "—";
    const p = perimeterMap.get(perim) ?? { total: 0, confirmed: 0, no_evidence: 0 };
    p.total++;
    if (item.computed_status === "confirmed_field" || item.computed_status === "likely_laid") {
      p.confirmed++;
    } else if (item.computed_status === "no_evidence" || item.computed_status === "outside_inca") {
      p.no_evidence++;
    }
    perimeterMap.set(perim, p);
  }

  const by_perimeter: PerimeterSummary[] = [...perimeterMap.entries()]
    .map(([perimetro, v]) => ({
      perimetro,
      ...v,
      pct: v.total > 0 ? Math.round((v.confirmed / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.no_evidence - a.no_evidence);

  const tomorrow_actions = buildTomorrowActions(items, by_perimeter);

  return {
    import_id:    importId,
    list_date:    listDate,
    file_name:    fileName,
    total:        items.length,
    confirmed:    counts.confirmed_field,
    likely_laid:  counts.likely_laid,
    to_verify:    counts.to_verify,
    no_evidence:  counts.no_evidence,
    missing:      counts.missing,
    blocked:      counts.blocked,
    outside_inca: counts.outside_inca,
    confirmed_by_whatsapp: items.filter((i) => i.confirmed_by_whatsapp).length,
    missing_evidence:      items.filter((i) => i.missing_evidence).length,
    short_issues:          items.filter((i) => i.has_short_issue).length,
    missing_issues:        items.filter((i) => i.has_missing_issue).length,
    partial_progress:      items.filter((i) => i.has_partial_progress).length,
    by_perimeter,
    tomorrow_actions,
  };
}

export function buildTomorrowActions(
  items: DailyListItemVM[],
  byPerimeter: PerimeterSummary[]
): TomorrowAction[] {
  const missingEvidence = items.filter((i) => i.missing_evidence);
  const qualityIssues = items.filter((i) =>
    i.has_short_issue || i.has_missing_issue || i.has_partial_progress
  );
  const zeroZones = byPerimeter.filter((p) => p.pct === 0 && p.total > 0);

  const actions: TomorrowAction[] = [];
  if (missingEvidence.length > 0) {
    actions.push({
      kind: "missing_evidence",
      label: "Trattare i cavi senza evidenza Telegram/WhatsApp",
      count: missingEvidence.length,
      cable_codes: missingEvidence.slice(0, 10).map((i) => i.cable_code_normalized),
      perimetro: null,
      priority: 1,
    });
  }

  if (qualityIssues.length > 0) {
    actions.push({
      kind: "quality_issue",
      label: "Trattare cavi corti, mancanti e progressioni parziali",
      count: qualityIssues.length,
      cable_codes: qualityIssues.slice(0, 10).map((i) => i.cable_code_normalized),
      perimetro: null,
      priority: 2,
    });
  }

  for (const zone of zeroZones.slice(0, 5)) {
    const zoneItems = items.filter((i) => (i.perimetro ?? "—") === zone.perimetro);
    actions.push({
      kind: "zero_zone",
      label: `Zona a 0%: ${zone.perimetro}`,
      count: zone.total,
      cable_codes: zoneItems.slice(0, 8).map((i) => i.cable_code_normalized),
      perimetro: zone.perimetro,
      priority: 3,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

// ── Phase G — AI-ready briefing context ───────────────────────────────────
// buildDailyBriefingContext returns a clean JSON context.
// Does NOT call any LLM. Meant to be fed to an AI Advisor later.
export function buildDailyBriefingContext(
  importId: string,
  listDate: string | null,
  items: DailyListItemVM[]
): DailyBriefingContext {
  const total    = items.length;
  const confirmed    = items.filter((i) => i.computed_status === "confirmed_field").length;
  const likely_laid  = items.filter((i) => i.computed_status === "likely_laid").length;
  const to_verify    = items.filter((i) => i.computed_status === "to_verify").length;
  const no_evidence  = items.filter((i) => i.computed_status === "no_evidence").length;
  const missing      = items.filter((i) => i.computed_status === "missing").length;
  const blocked      = items.filter((i) => i.computed_status === "blocked").length;
  const completion_rate_pct = total > 0
    ? Math.round(((confirmed + likely_laid) / total) * 100)
    : 0;

  // Progress by perimeter
  const perimMap = new Map<string, { total: number; confirmed: number; no_evidence: number }>();
  for (const item of items) {
    const key = item.perimetro ?? "—";
    const e = perimMap.get(key) ?? { total: 0, confirmed: 0, no_evidence: 0 };
    e.total++;
    if (item.computed_status === "confirmed_field") e.confirmed++;
    if (item.computed_status === "no_evidence")      e.no_evidence++;
    perimMap.set(key, e);
  }
  const progress_by_perimeter = [...perimMap.entries()].map(([perimetro, v]) => ({
    perimetro,
    total:       v.total,
    confirmed:   v.confirmed,
    no_evidence: v.no_evidence,
    pct: v.total > 0 ? Math.round((v.confirmed / v.total) * 100) : 0,
  })).sort((a, b) => a.pct - b.pct);

  // Critical items: blocked, missing, outside_inca
  const critical_items = items
    .filter((i) => ["blocked", "missing", "outside_inca"].includes(i.computed_status))
    .slice(0, 20)
    .map((i) => ({
      cable_code: i.cable_code_normalized,
      perimetro:  i.perimetro,
      status:     i.computed_status,
      note:       i.note,
    }));

  // Confirmed items
  const confirmed_items = items
    .filter((i) => i.computed_status === "confirmed_field")
    .map((i) => ({
      cable_code: i.cable_code_normalized,
      actor:      i.last_actor,
      at:         i.last_event_at,
      perimetro:  i.perimetro,
    }));

  // Missing evidence
  const missing_evidence_items = items
    .filter((i) => i.computed_status === "no_evidence")
    .slice(0, 30)
    .map((i) => ({
      cable_code:     i.cable_code_normalized,
      perimetro:      i.perimetro,
      situazione_inca: i.situazione_inca,
      planned_status: i.planned_status,
    }));

  // To verify (partial %)
  const to_verify_items = items
    .filter((i) => i.computed_status === "to_verify")
    .map((i) => ({
      cable_code:      i.cable_code_normalized,
      progress_percent: i.progress_percent,
      actor:           i.last_actor,
      note:            i.evidence[0]?.raw_note?.slice(0, 120) ?? null,
    }));

  // Deterministic recommendations
  const recommended_actions_deterministic: string[] = [];
  if (no_evidence > 0) {
    recommended_actions_deterministic.push(
      `${no_evidence} cav${no_evidence === 1 ? "o" : "i"} senza evidenza terreno — richiedere conferma Telegram/WhatsApp per: ${
        missing_evidence_items.slice(0, 5).map((i) => i.cable_code).join(", ")
      }...`
    );
  }
  if (to_verify > 0) {
    recommended_actions_deterministic.push(
      `${to_verify} cav${to_verify === 1 ? "o" : "i"} segnalati parziali — verificare completamento prima della chiusura lista`
    );
  }
  if (blocked > 0) {
    recommended_actions_deterministic.push(
      `${blocked} cav${blocked === 1 ? "o" : "i"} bloccati — trattare anomalie aperte in priorità`
    );
  }
  if (completion_rate_pct < 50) {
    recommended_actions_deterministic.push(
      `Avanzamento basso (${completion_rate_pct}%) — rivedere allocazione squadra per domani`
    );
  }

  const zeroPerims = progress_by_perimeter.filter((p) => p.pct === 0 && p.total > 0);
  if (zeroPerims.length > 0) {
    recommended_actions_deterministic.push(
      `Zone senza alcuna conferma: ${zeroPerims.map((p) => p.perimetro).join(", ")}`
    );
  }

  return {
    import_id:     importId,
    list_date:     listDate,
    generated_at:  new Date().toISOString(),
    list_summary: {
      total_cables:       total,
      confirmed_field:    confirmed,
      likely_laid,
      to_verify,
      no_evidence,
      missing,
      blocked,
      completion_rate_pct,
    },
    progress_by_perimeter,
    critical_items,
    confirmed_items,
    missing_evidence_items,
    to_verify_items,
    recommended_actions_deterministic,
  };
}

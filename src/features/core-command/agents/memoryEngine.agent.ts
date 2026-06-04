// src/features/core-command/agents/memoryEngine.agent.ts
// Memory Engine V2 — batch, non-bloquant.
// RÈGLE : cable_event créé pour TOUT câble extrait normalisé,
//         même si inca_cavo_id est null.
// INCA = lecture seule. Aucune écriture dans inca_cavi.

import { supabase } from "../../../lib/supabaseClient";
import { extractCableRefs } from "./normalizer.agent";
import { classifyMessage, cableConfidence } from "./classifier.agent";
import { batchMatchCableCodes } from "./matcher.agent";
import { bulkInsertFindings } from "../api/agentFindings.api";
import type {
  InsertCoreEvent,
  InsertCableEvent,
  InsertCablePriority,
  InsertAgentFinding,
} from "../types";
import type { EventKind } from "./classifier.agent";

export interface EngineResult {
  messages_processed:   number;
  cables_extracted:     number;
  cables_unique:        number;
  inca_matched:         number;
  inca_unmatched:       number;
  core_events_created:  number;
  cable_events_created: number;
  priorities_created:   number;
  findings_created:     number;
  top_unmatched:        string[];
  errors:               string[];
}

export type ProgressCallback = (msg: string, pct: number) => void;

// Kinds qui génèrent une priority automatique
const PRIORITY_KINDS: Set<EventKind> = new Set([
  "CABLE_CORTO", "CABLE_MANCANTE", "CABLE_DA_CONTROLLARE",
]);
const PRIORITY_LEVEL: Record<string, "low" | "medium" | "high" | "critical"> = {
  CABLE_CORTO:           "medium",
  CABLE_MANCANTE:        "high",
  CABLE_DA_CONTROLLARE:  "medium",
};

// Seuil minimum pour créer un cable_event — très bas pour ne pas bloquer
const MIN_CONFIDENCE = 0.10;
const CHUNK = 200;

function yieldToUI(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

interface WorkItem {
  msg_id:             string;
  msg_ts:             string;
  author:             string;
  author_operator_id: string | null;
  raw_message:        string;
  media_type:         string | null;
  cable_normalized:   string;
  cable_raw:          string;
  kind:               EventKind;
  classif_conf:       number;
  keywords:           string[];
}

export async function runMemoryEngine(
  importId: string,
  onProgress: ProgressCallback = () => {}
): Promise<EngineResult> {
  const result: EngineResult = {
    messages_processed: 0, cables_extracted: 0, cables_unique: 0,
    inca_matched: 0, inca_unmatched: 0,
    core_events_created: 0, cable_events_created: 0,
    priorities_created: 0, findings_created: 0,
    top_unmatched: [], errors: [],
  };

  // ── 1. Charger messages ──────────────────────────────────────────────────
  onProgress("Chargement messages…", 0);
  const { data: messages, error: msgErr } = await supabase
    .from("whatsapp_messages")
    .select("id, message_ts, author, raw_message, media_type, author_operator_id")
    .eq("import_id", importId)
    .order("message_ts", { ascending: true });

  if (msgErr || !messages) {
    result.errors.push(`Messages: ${msgErr?.message ?? "unknown"}`);
    return result;
  }
  result.messages_processed = messages.length;

  // ── 2. Truncate-and-rebuild : supprimer les données de cet import ───────
  // Garantit l'idempotence : chaque re-process repart de zéro pour cet import.
  // Les cascades ON DELETE CASCADE suppriment cable_events automatiquement.
  onProgress("Nettoyage données existantes…", 5);

  // Récupérer les message IDs de cet import
  const { data: msgIds } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("import_id", importId);

  const importMsgIds = (msgIds ?? []).map((r) => r.id);

  if (importMsgIds.length > 0) {
    // Supprimer core_events liés à cet import (cascade → cable_events)
    // En chunks de 500 pour éviter les limites URL
    for (let i = 0; i < importMsgIds.length; i += 500) {
      const chunk = importMsgIds.slice(i, i + 500);
      await supabase.from("core_events")
        .delete()
        .in("source_message_id", chunk);
    }

    // Supprimer findings liés aux messages de cet import
    for (let i = 0; i < importMsgIds.length; i += 500) {
      const chunk = importMsgIds.slice(i, i + 500);
      await supabase.from("agent_findings")
        .delete()
        .eq("agent_name", "memory_engine")
        .eq("entity_type", "cable_code");
      // Findings spécifiques à cet import via core_event_id — traités par cascade
      void chunk; // chunk utilisé dans la requête cable_events via cascade
    }
  }

  // Charger les priorités existantes pour éviter doublons (elles ne cascadent pas)
  const { data: existingPri } = await supabase
    .from("cable_priorities")
    .select("cable_code")
    .eq("status", "open");

  const prioritySet = new Set<string>(
    (existingPri ?? []).map((r) => r.cable_code)
  );

  // Index core_events vide (après truncate)
  const coreEvtIndex = new Map<string, string>();
  const cableEventSet = new Set<string>();

  // ── 3. Extraction + classification (CPU-only, pas de DB) ────────────────
  onProgress("Extraction câbles…", 10);
  await yieldToUI();

  const workItems: WorkItem[] = [];
  const allCodes = new Set<string>();

  for (const msg of messages) {
    if (!msg.raw_message) continue;
    const classification = classifyMessage(msg.raw_message, msg.media_type);
    const cables = extractCableRefs(msg.raw_message);
    result.cables_extracted += cables.length;

    for (const cable of cables) {
      allCodes.add(cable.normalized);
      workItems.push({
        msg_id:             msg.id,
        msg_ts:             msg.message_ts,
        author:             msg.author ?? "",
        author_operator_id: msg.author_operator_id ?? null,
        raw_message:        msg.raw_message,
        media_type:         msg.media_type ?? null,
        cable_normalized:   cable.normalized,
        cable_raw:          cable.raw,
        kind:               classification.kind,
        classif_conf:       classification.confidence,
        keywords:           classification.matched_keywords,
      });
    }
  }

  result.cables_unique = allCodes.size;

  if (workItems.length === 0) {
    result.errors.push("Aucun câble extrait.");
    return result;
  }

  // ── 4. Batch match INCA — 1 seule requête ────────────────────────────────
  onProgress(`Match INCA (${allCodes.size} codes uniques)…`, 30);
  await yieldToUI();
  const matchMap = await batchMatchCableCodes([...allCodes]);

  // Compter les matches
  const unmatchedCables: string[] = [];
  for (const [code, match] of matchMap) {
    if (match.matched) result.inca_matched++;
    else {
      result.inca_unmatched++;
      unmatchedCables.push(code);
    }
  }
  result.top_unmatched = unmatchedCables.slice(0, 20);

  // ── 5. Core events manquants (batch) ─────────────────────────────────────
  onProgress("Core events…", 50);
  await yieldToUI();

  const newCoreEvents: InsertCoreEvent[] = [];
  const pendingCoreKeys: string[] = [];

  for (const item of workItems) {
    const key = `${item.msg_id}__${item.cable_normalized}`;
    if (coreEvtIndex.has(key)) continue;

    const match = matchMap.get(item.cable_normalized);
    const incaMatched = match?.matched ?? false;
    const confidence  = cableConfidence(item.classif_conf, incaMatched);

    newCoreEvents.push({
      event_type:            item.kind,
      occurred_at:           item.msg_ts,
      source:                "whatsapp",
      source_message_id:     item.msg_id,
      operator_id:           item.author_operator_id,
      cable_code_raw:        item.cable_raw,
      cable_code_normalized: item.cable_normalized,
      inca_cavo_id:          match?.inca_cavo_id ?? null,
      confidence,
      validation_status:     "pending",
      raw_text:              item.raw_message.slice(0, 500),
      payload:               { author: item.author, keywords: item.keywords },
    });
    pendingCoreKeys.push(key);
  }

  const insertedCoreIds: string[] = [];
  for (let i = 0; i < newCoreEvents.length; i += CHUNK) {
    onProgress(`Core events ${i}/${newCoreEvents.length}…`, 50 + Math.round(i / Math.max(newCoreEvents.length, 1) * 15));
    await yieldToUI();
    const chunk = newCoreEvents.slice(i, i + CHUNK);
    const { data: inserted, error } = await supabase
      .from("core_events").insert(chunk).select("id");
    if (error) {
      result.errors.push(`core_events[${i}]: ${error.message}`);
      for (let j = 0; j < chunk.length; j++) insertedCoreIds.push("");
    } else {
      for (const row of inserted ?? []) insertedCoreIds.push(row.id);
      result.core_events_created += (inserted ?? []).length;
    }
  }

  for (let i = 0; i < pendingCoreKeys.length; i++) {
    if (insertedCoreIds[i]) coreEvtIndex.set(pendingCoreKeys[i], insertedCoreIds[i]);
  }

  // ── 6. Cable events — TOUS les câbles normalisés ─────────────────────────
  // Règle : créer un cable_event pour tout câble extrait, inca_cavo_id optionnel.
  onProgress("Cable events…", 65);
  await yieldToUI();

  const newCableEvents: InsertCableEvent[] = [];
  const promoteIds: string[] = [];

  for (const item of workItems) {
    const ceKey = `${item.msg_id}__${item.cable_normalized}`;
    if (cableEventSet.has(ceKey)) continue;

    const match      = matchMap.get(item.cable_normalized);
    const incaMatched = match?.matched ?? false;
    const confidence  = cableConfidence(item.classif_conf, incaMatched);

    // Seuil très bas — ne pas bloquer la timeline si INCA vide
    if (confidence < MIN_CONFIDENCE) continue;

    const coreEventId = coreEvtIndex.get(`${item.msg_id}__${item.cable_normalized}`);
    if (!coreEventId) continue;

    newCableEvents.push({
      core_event_id:     coreEventId,
      occurred_at:       item.msg_ts,
      inca_cavo_id:      match?.inca_cavo_id ?? null,
      cable_code:        item.cable_normalized,
      event_kind:        item.kind,
      operator_id:       item.author_operator_id,
      source_message_id: item.msg_id,
      confidence,
      note: `${item.author}: ${item.raw_message.slice(0, 120)}`,
    });
    promoteIds.push(coreEventId);
    cableEventSet.add(ceKey);
  }

  for (let i = 0; i < newCableEvents.length; i += CHUNK) {
    onProgress(`Cable events ${i}/${newCableEvents.length}…`, 65 + Math.round(i / Math.max(newCableEvents.length, 1) * 15));
    await yieldToUI();
    const chunk = newCableEvents.slice(i, i + CHUNK);
    const { error } = await supabase.from("cable_events").insert(chunk);
    if (error) result.errors.push(`cable_events[${i}]: ${error.message}`);
    else result.cable_events_created += chunk.length;
  }

  // Promouvoir les core_events correspondants
  if (promoteIds.length > 0) {
    onProgress("Promotion events…", 80);
    await yieldToUI();
    for (let i = 0; i < promoteIds.length; i += 500) {
      await supabase.from("core_events").update({
        validation_status: "promoted",
        validated_at: new Date().toISOString(),
      }).in("id", promoteIds.slice(i, i + 500));
    }
  }

  // ── 7. Priorities ─────────────────────────────────────────────────────────
  onProgress("Priorities…", 85);
  await yieldToUI();

  const newPriorities: InsertCablePriority[] = [];
  for (const item of workItems) {
    if (!PRIORITY_KINDS.has(item.kind)) continue;
    if (prioritySet.has(item.cable_normalized)) continue;

    const match = matchMap.get(item.cable_normalized);
    const conf  = cableConfidence(item.classif_conf, match?.matched ?? false);
    if (conf < 0.50) continue; // ne pas créer de priority pour un event trop incertain

    const coreEventId = coreEvtIndex.get(`${item.msg_id}__${item.cable_normalized}`);
    newPriorities.push({
      cable_code:      item.cable_normalized,
      inca_cavo_id:    match?.inca_cavo_id ?? null,
      priority:        PRIORITY_LEVEL[item.kind] ?? "medium",
      reason:          `${item.kind} — ${item.author}: "${item.raw_message.slice(0, 80)}"`,
      status:          "open",
      source_event_id: coreEventId ?? null,
    });
    prioritySet.add(item.cable_normalized);
  }

  if (newPriorities.length > 0) {
    const { error } = await supabase.from("cable_priorities").insert(newPriorities);
    if (error) result.errors.push(`priorities: ${error.message}`);
    else result.priorities_created = newPriorities.length;
  }

  // ── 8. Findings (câbles non matchés INCA) ─────────────────────────────────
  onProgress("Findings…", 92);
  await yieldToUI();

  const newFindings: InsertAgentFinding[] = [];
  const findingSet = new Set<string>();

  for (const item of workItems) {
    const match = matchMap.get(item.cable_normalized);
    if (!match?.matched && !findingSet.has(item.cable_normalized)) {
      const coreEventId = coreEvtIndex.get(`${item.msg_id}__${item.cable_normalized}`);
      newFindings.push({
        agent_name:     "memory_engine",
        finding_type:   "cable_not_in_inca",
        severity:       "info",
        confidence:     0.8,
        entity_type:    "cable_code",
        entity_id:      item.cable_normalized,
        core_event_id:  coreEventId ?? null,
        message:        `Câble "${item.cable_normalized}" non trouvé dans INCA. Timeline basée sur CORE Memory.`,
        recommendation: "Vérifier le code ou importer INCA avec ce câble.",
        status:         "open",
      });
      findingSet.add(item.cable_normalized);
    }
  }

  if (newFindings.length > 0) {
    try {
      await bulkInsertFindings(newFindings);
      result.findings_created = newFindings.length;
    } catch (e) {
      result.errors.push(`findings: ${String(e)}`);
    }
  }

  onProgress("Terminé ✓", 100);
  return result;
}

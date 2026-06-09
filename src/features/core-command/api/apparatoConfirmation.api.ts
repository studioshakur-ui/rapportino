// src/features/core-command/api/apparatoConfirmation.api.ts
// Conferma di chiusura apparato — evento (regola: tutto diventa evento).
// Un cavo verificato NON chiude l'apparato: serve la conferma esplicita del capo.
// INCA resta read-only: scriviamo solo su core_events.

import { insertCoreEvent } from "./coreEvents.api";
import { supabase } from "../../../lib/supabaseClient";
import type { CoreEvent, InsertCoreEvent } from "../types";

type ApparatoConfirmEvent = "APPARATO_CONFIRMED" | "APPARATO_UNCONFIRMED";

function buildEvent(eventType: ApparatoConfirmEvent, equipmentCode: string, uid: string): InsertCoreEvent {
  const now = new Date().toISOString();
  return {
    event_type: eventType,
    occurred_at: now,
    source: "manual",
    cable_code_raw: equipmentCode,
    cable_code_normalized: equipmentCode,
    confidence: 1,
    validation_status: "validated",
    raw_text: null,
    payload: { equipment_code: equipmentCode, confirmed_by: uid, confirmed_at: now },
  } as unknown as InsertCoreEvent;
}

export async function confirmApparatoClosure(equipmentCode: string, uid: string): Promise<CoreEvent> {
  return insertCoreEvent(buildEvent("APPARATO_CONFIRMED", equipmentCode, uid));
}

export async function removeApparatoConfirmation(equipmentCode: string, uid: string): Promise<CoreEvent> {
  return insertCoreEvent(buildEvent("APPARATO_UNCONFIRMED", equipmentCode, uid));
}

interface ConfirmRow {
  event_type: string;
  cable_code_normalized: string | null;
  occurred_at: string;
  payload: Record<string, unknown> | null;
}

/** Insieme degli apparati attualmente confermati (ultimo evento per apparato vince). */
export async function loadApparatoConfirmations(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("core_events")
    .select("event_type, cable_code_normalized, occurred_at, payload")
    .in("event_type", ["APPARATO_CONFIRMED", "APPARATO_UNCONFIRMED"])
    .order("occurred_at", { ascending: false })
    .limit(5000);
  if (error) throw error;

  const seen = new Set<string>();
  const confirmed = new Set<string>();
  for (const row of (data ?? []) as ConfirmRow[]) {
    const code = (row.payload?.["equipment_code"] as string | undefined) ?? row.cable_code_normalized ?? "";
    if (!code || seen.has(code)) continue;
    seen.add(code);
    if (row.event_type === "APPARATO_CONFIRMED") confirmed.add(code);
  }
  return confirmed;
}

// src/features/core-command/api/cableEvents.api.ts
// CORE Memory — cable events (promoted, validated).
// Read from inca_cavi allowed; no writes.
import { supabase } from "../../../lib/supabaseClient";
import type { CableEvent, InsertCableEvent } from "../types";

export interface CableEventFilters {
  cable_code?: string;
  inca_cavo_id?: string;
  operator_id?: string;
  event_kind?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export async function listCableEvents(filters: CableEventFilters = {}): Promise<CableEvent[]> {
  const { cable_code, inca_cavo_id, operator_id, event_kind, date_from, date_to, limit = 200 } = filters;

  let q = supabase
    .from("cable_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (cable_code)    q = q.ilike("cable_code", `%${cable_code}%`);
  if (inca_cavo_id)  q = q.eq("inca_cavo_id", inca_cavo_id);
  if (operator_id)   q = q.eq("operator_id", operator_id);
  if (event_kind)    q = q.eq("event_kind", event_kind);
  if (date_from)     q = q.gte("occurred_at", new Date(date_from).toISOString());
  if (date_to) {
    const end = new Date(date_to);
    end.setHours(23, 59, 59, 999);
    q = q.lte("occurred_at", end.toISOString());
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function insertCableEvent(payload: InsertCableEvent): Promise<CableEvent> {
  const { data, error } = await supabase
    .from("cable_events")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCableTimeline(
  cableCode: string,
  limit = 100
): Promise<CableEvent[]> {
  return listCableEvents({ cable_code: cableCode, limit });
}

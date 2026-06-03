// src/core/events/eventBus.ts
//
// Moteur événementiel central de CORE COMMAND.
//
// RÈGLE MÉTIER ABSOLUE :
//   - Toute information entrante (WhatsApp, agent, saisie manuelle) crée un core_event `pending`.
//   - INCA n'est JAMAIS écrit ici.
//   - Hamidou valide (validate) -> l'event passe `validated` et est *promu* vers l'état
//     personnel (cable_events / cable_priorities). Le rejet (reject) le passe `rejected`.
//
// Aucun module ne doit muter core_events/cable_events directement : tout passe par ce bus.

import { supabase } from "../supabase";
import type {
  CoreEvent,
  EventSource,
  EventStatus,
  CableEventType,
} from "../db/types";

export type DraftCoreEvent = {
  source: EventSource;
  event_type: string;
  payload?: Record<string, unknown>;
  source_ref?: string | null;
  occurred_at?: string;
  /** Bypass de la file de validation pour une saisie manuelle déjà fiable. */
  autoValidate?: boolean;
};

/** Crée un événement. Par défaut `pending` (sauf saisie manuelle auto-validée). */
export async function createEvent(draft: DraftCoreEvent): Promise<CoreEvent> {
  const status: EventStatus = draft.autoValidate ? "validated" : "pending";
  const { data, error } = await supabase
    .from("core_events")
    .insert({
      source: draft.source,
      event_type: draft.event_type,
      payload: draft.payload ?? {},
      source_ref: draft.source_ref ?? null,
      occurred_at: draft.occurred_at ?? new Date().toISOString(),
      status,
      validated_at: draft.autoValidate ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) throw error;
  const event = data as CoreEvent;
  if (event.status === "validated") await promoteEvent(event);
  return event;
}

export async function listEvents(opts?: {
  status?: EventStatus;
  source?: EventSource;
  limit?: number;
}): Promise<CoreEvent[]> {
  let q = supabase.from("core_events").select("*").order("occurred_at", { ascending: false });
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.source) q = q.eq("source", opts.source);
  q = q.limit(opts?.limit ?? 100);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CoreEvent[];
}

/** Hamidou valide -> état personnel mis à jour (promotion). */
export async function validateEvent(id: string, validatedBy?: string | null): Promise<CoreEvent> {
  const { data, error } = await supabase
    .from("core_events")
    .update({
      status: "validated",
      validated_at: new Date().toISOString(),
      validated_by: validatedBy ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  const event = data as CoreEvent;
  await promoteEvent(event);
  return event;
}

export async function rejectEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from("core_events")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) throw error;
}

const CABLE_EVENT_TYPES: CableEventType[] = ["posa", "ripresa", "blocco", "anomalia"];

/**
 * Promotion d'un événement validé vers l'état personnel.
 * - événements câble -> cable_events (+ cable_priorities si bloquant/anomalie/ripresa)
 * INCA reste intouché.
 */
export async function promoteEvent(event: CoreEvent): Promise<void> {
  const p = event.payload ?? {};
  const type = String((p as { kind?: string }).kind ?? event.event_type);

  if (!CABLE_EVENT_TYPES.includes(type as CableEventType)) return;

  const cavoCode = (p.cavo_code ?? p.marca_cavo ?? null) as string | null;
  const meters = typeof p.meters === "number" ? (p.meters as number) : null;
  const zone = (p.zone ?? null) as string | null;
  const operatorId = (p.operator_id ?? null) as string | null;

  const { error: ceErr } = await supabase.from("cable_events").insert({
    cavo_code: cavoCode,
    inca_cavo_id: (p.inca_cavo_id ?? null) as string | null,
    event_type: type as CableEventType,
    meters,
    occurred_at: event.occurred_at,
    operator_id: operatorId,
    zone,
    core_event_id: event.id,
  });
  if (ceErr) throw ceErr;

  if (cavoCode && (type === "blocco" || type === "anomalia" || type === "ripresa")) {
    const reason = type === "blocco" ? "blocco" : type === "anomalia" ? "anomalia" : "ripresa";
    const priority = type === "blocco" ? 100 : type === "anomalia" ? 60 : 30;
    const { error: cpErr } = await supabase
      .from("cable_priorities")
      .insert({ cavo_code: cavoCode, reason, priority, status: "open" });
    if (cpErr) throw cpErr;
  }
}

export async function countPending(): Promise<number> {
  const { count, error } = await supabase
    .from("core_events")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

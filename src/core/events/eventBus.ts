import type { CoreEvent, InsertCoreEvent } from "../../features/core-command/types";
import type { Json } from "../../types/supabase.generated";
import { SDC_AUTOMATIC_POLICY } from "../../modules/targhetti/targhetti.resolution";

// CORE COMMAND event bus: every cockpit state mutation is persisted as an event.
// INCA is read-only here: this module never writes to inca_cavi.
export async function publishCoreEvent(payload: InsertCoreEvent): Promise<CoreEvent> {
  const { supabase } = await import("../../lib/supabaseClient");
  const { data, error } = await supabase
    .from("core_events")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface EventTransport {
  owner(): Promise<string>;
  insert(event: InsertCoreEvent): Promise<CoreEvent>;
  get(id: string): Promise<CoreEvent>;
  transition(id: string, status: "validated" | "rejected", ownerId: string): Promise<CoreEvent>;
}
// Every new TARGHETTI mutation enters pending. The owner may explicitly
// authorize a source-specific automatic resolution policy. Storage carries sources.
export function createEventBus(transport: EventTransport) {
  return {
    async propose(type: string, prepare: (ownerId: string) => Promise<Record<string, unknown>>): Promise<CoreEvent> {
      if (!type.startsWith("targhetti.")) throw new Error("Type d’événement non pris en charge.");
      const ownerId = await transport.owner();
      const payload = await prepare(ownerId);
      return transport.insert({ event_type: type, source: "targhetti", occurred_at: new Date().toISOString(), validation_status: "pending", confidence: 0, payload: JSON.parse(JSON.stringify({ ...payload, owner_id: ownerId })) as Json });
    },
    async decide(id: string, decision: "validated" | "rejected"): Promise<CoreEvent> {
      const ownerId = await transport.owner();
      const event = await transport.get(id);
      const payload = event.payload as Record<string, unknown> | null;
      if (!event.event_type.startsWith("targhetti.") || payload?.owner_id !== ownerId || event.validation_status !== "pending") throw new Error("Événement déjà traité ou inaccessible.");
      return transport.transition(id, decision, ownerId);
    },
    async activateAutomaticResolution(id: string, verify: (event: CoreEvent) => Promise<void>): Promise<CoreEvent> {
      const ownerId = await transport.owner();
      const event = await transport.get(id);
      const payload = event.payload as Record<string, unknown> | null;
      if (event.event_type !== "targhetti.auto_resolution" || event.validation_status !== "pending" || payload?.owner_id !== ownerId || payload.decisionMode !== "automatic") throw new Error("Résolution automatique inaccessible.");
      if (payload.documentSha256 !== SDC_AUTOMATIC_POLICY.documentSha256 || payload.extractorVersion !== SDC_AUTOMATIC_POLICY.extractorVersion || payload.policyVersion !== SDC_AUTOMATIC_POLICY.policyVersion || typeof payload.resolutionSha256 !== "string" || !/^[a-f0-9]{64}$/.test(payload.resolutionSha256) || typeof payload.resolutionPath !== "string" || !payload.resolutionPath.startsWith(`targhetti/${ownerId}/`) || payload.resolutionPath.includes("..")) throw new Error("Résolution automatique hors politique autorisée.");
      await verify(event);
      return transport.transition(id, "validated", ownerId);
    },
  };
}

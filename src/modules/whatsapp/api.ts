// src/modules/whatsapp/api.ts
import { supabase } from "../../core/supabase";
import { createEvent } from "../../core/events/eventBus";
import { normalizeMessage } from "./normalize";
import { parseWhatsappTxt } from "./parser";
import type { WhatsappImport, WhatsappMessage } from "../../core/db/types";

const MIN_CONFIDENCE = 0.6; // seuil pour proposer un event à valider

export type ImportResult = {
  importId: string;
  messages: number;
  eventsCreated: number;
};

/**
 * Importe un export WhatsApp .txt :
 *  1) parse les messages
 *  2) enregistre l'import + messages en staging
 *  3) pour les messages "structurables", crée un core_event PENDING (jamais INCA direct)
 */
export async function importWhatsappTxt(fileName: string, content: string): Promise<ImportResult> {
  const parsed = parseWhatsappTxt(content);

  const { data: imp, error: impErr } = await supabase
    .from("whatsapp_imports")
    .insert({ file_name: fileName, message_count: parsed.length, status: "parsed" })
    .select("*")
    .single();
  if (impErr) throw impErr;
  const importRow = imp as WhatsappImport;

  let eventsCreated = 0;
  for (const m of parsed) {
    const norm = normalizeMessage(m.raw_text);

    const { data: msg, error: msgErr } = await supabase
      .from("whatsapp_messages")
      .insert({
        import_id: importRow.id,
        sent_at: m.sent_at,
        author: m.author,
        raw_text: m.raw_text,
        parsed_payload: norm as unknown as Record<string, unknown>,
      })
      .select("*")
      .single();
    if (msgErr) throw msgErr;
    const messageRow = msg as WhatsappMessage;

    if (norm.kind && norm.cavo_code && norm.confidence >= MIN_CONFIDENCE) {
      const event = await createEvent({
        source: "whatsapp",
        event_type: norm.kind,
        occurred_at: m.sent_at ?? undefined,
        source_ref: messageRow.id,
        payload: {
          kind: norm.kind,
          cavo_code: norm.cavo_code,
          meters: norm.meters,
          zone: norm.zone,
          author: m.author,
          confidence: norm.confidence,
          raw_text: m.raw_text,
        },
      });
      await supabase
        .from("whatsapp_messages")
        .update({ core_event_id: event.id })
        .eq("id", messageRow.id);
      eventsCreated += 1;
    }
  }

  return { importId: importRow.id, messages: parsed.length, eventsCreated };
}

export async function listImports(): Promise<WhatsappImport[]> {
  const { data, error } = await supabase
    .from("whatsapp_imports")
    .select("*")
    .order("imported_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as WhatsappImport[];
}

export async function listMessages(importId: string): Promise<WhatsappMessage[]> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("import_id", importId)
    .order("sent_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WhatsappMessage[];
}

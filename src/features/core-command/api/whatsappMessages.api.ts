// src/features/core-command/api/whatsappMessages.api.ts
import { supabase } from "../../../lib/supabaseClient";
import type { WhatsAppMessage, InsertWhatsAppMessage } from "../types";

export async function listWhatsAppMessages(
  importId: string,
  limit = 500
): Promise<WhatsAppMessage[]> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("import_id", importId)
    .order("message_ts", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function bulkInsertMessages(
  messages: InsertWhatsAppMessage[]
): Promise<WhatsAppMessage[]> {
  if (messages.length === 0) return [];
  // Insert in chunks of 500 to avoid payload limits
  const CHUNK = 500;
  const results: WhatsAppMessage[] = [];
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .insert(chunk)
      .select("*");
    if (error) throw error;
    results.push(...((data ?? []) as WhatsAppMessage[]));
  }
  return results;
}

export async function searchWhatsAppMessages(
  query: string,
  importId?: string,
  limit = 100
): Promise<WhatsAppMessage[]> {
  let q = supabase
    .from("whatsapp_messages")
    .select("*")
    .ilike("raw_message", `%${query}%`)
    .order("message_ts", { ascending: false })
    .limit(limit);
  if (importId) q = q.eq("import_id", importId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

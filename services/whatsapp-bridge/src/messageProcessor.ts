// src/messageProcessor.ts — traitement d'un message WhatsApp entrant
// Insère dans whatsapp_messages (si nouveau) + incoming_messages.
// AUCUNE écriture dans inca_cavi.

import crypto from "crypto";
import { supabase } from "./supabase.js";
import { extractCableRefs, extractProgressPercent } from "./normalizer.js";

export interface IncomingMessage {
  wamid:       string;   // ID unique WhatsApp (évite les doublons)
  sender:      string;   // ex: "393401234567@c.us"
  sender_name: string;   // nom affiché
  group_name:  string;
  message_ts:  Date;
  text:        string;
  media_type:  string | null;   // "image"/"document"/null
  media_name:  string | null;
}

export interface ProcessResult {
  skipped:     boolean;  // déjà traité
  msg_id:      string | null;
  cable_refs:  string[];
  progress:    number | null;
}

export async function processMessage(msg: IncomingMessage): Promise<ProcessResult> {
  // 1. Hash pour déduplication (wamid est déjà unique mais certains bridges re-émettent)
  const hash = crypto
    .createHash("sha256")
    .update(`${msg.wamid}:${msg.text}`)
    .digest("hex")
    .slice(0, 32);

  // 2. Vérifier doublon dans whatsapp_messages
  const { data: existing } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("message_hash", hash)
    .maybeSingle();

  if (existing) {
    return { skipped: true, msg_id: existing.id as string, cable_refs: [], progress: null };
  }

  // 3. Extraire références câbles
  const refs      = extractCableRefs(msg.text);
  const cableRefs = refs.map((r) => r.normalized);
  const progress  = extractProgressPercent(msg.text);

  // 4. Insérer dans whatsapp_messages
  const { data: inserted, error: msgErr } = await supabase
    .from("whatsapp_messages")
    .insert({
      import_id:    null,               // pas d'import batch — direct
      message_ts:   msg.message_ts.toISOString(),
      author:       msg.sender_name,
      raw_message:  msg.text,
      media_type:   msg.media_type,
      media_filename: msg.media_name,
      message_hash: hash,
    })
    .select("id")
    .single();

  if (msgErr) {
    console.error("❌ Insert whatsapp_messages:", msgErr.message);
    return { skipped: false, msg_id: null, cable_refs: cableRefs, progress };
  }

  const msgId = inserted.id as string;

  // 5. Insérer dans incoming_messages (pour la pipeline CORE COMMAND)
  const { error: incErr } = await supabase
    .from("incoming_messages")
    .insert({
      source:       "whatsapp_web",
      wamid:        msg.wamid,
      sender:       msg.sender,
      sender_name:  msg.sender_name,
      message_ts:   msg.message_ts.toISOString(),
      message_type: msg.media_type ?? "text",
      text:         msg.text,
      cable_refs:   cableRefs,
      classification: {
        group:    msg.group_name,
        refs:     refs,
        progress: progress,
      },
      raw_payload:  { wamid: msg.wamid, group: msg.group_name },
      processed:    false,
    });

  if (incErr) {
    // Non-fatal: whatsapp_messages est déjà inséré
    console.warn("⚠  Insert incoming_messages (non-fatal):", incErr.message);
  }

  return { skipped: false, msg_id: msgId, cable_refs: cableRefs, progress };
}

import { supabase } from "../../../lib/supabaseClient";
import type { Database, Json } from "../../../types/supabase.generated";

type IncomingMessageRow = Database["public"]["Tables"]["incoming_messages"]["Row"];

export interface TelegramLiveMessage {
  id: string;
  sender_name: string | null;
  message_ts: string | null;
  text: string | null;
  cable_refs: string[];
  message_type: string | null;
  processed: boolean;
  created_at: string;
}

function parseCableRefs(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTelegramLiveMessage(row: IncomingMessageRow): TelegramLiveMessage {
  return {
    id: row.id,
    sender_name: row.sender_name,
    message_ts: row.message_ts,
    text: row.text,
    cable_refs: parseCableRefs(row.cable_refs),
    message_type: row.message_type,
    processed: row.processed,
    created_at: row.created_at,
  };
}

export async function listRecentTelegramMessages(limit = 12): Promise<TelegramLiveMessage[]> {
  const { data, error } = await supabase
    .from("incoming_messages")
    .select("id,sender_name,message_ts,text,cable_refs,message_type,processed,created_at")
    .eq("source", "telegram")
    .order("message_ts", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as IncomingMessageRow[]).map(toTelegramLiveMessage);
}

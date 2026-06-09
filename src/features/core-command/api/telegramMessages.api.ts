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
  classification: TelegramProofClassification;
  linked_to_cable: boolean;
  linked_to_equipment: boolean;
}

export interface TelegramProofClassification {
  source_type: "telegram_text" | "telegram_photo" | "ocr_photo" | "manual_validation" | "imported_note" | "system_inference" | null;
  event_kind: string | null;
  detected_position: "partenza" | "arrivo" | "entrambi" | "sconosciuto" | null;
  detected_status: string | null;
  confidence: number | null;
  confidence_reason: string | null;
  requires_human_validation: boolean;
  recommended_action: string | null;
  extracted_cable_codes: string[];
  extracted_equipment_codes: string[];
  extracted_eswbs: string[];
  ocr_status: string | null;
  incoherence_reason: string | null;
}

function parseCableRefs(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTelegramLiveMessage(row: IncomingMessageRow): TelegramLiveMessage {
  const classification = parseClassification(row.classification);
  return {
    id: row.id,
    sender_name: row.sender_name,
    message_ts: row.message_ts,
    text: row.text,
    cable_refs: parseCableRefs(row.cable_refs),
    message_type: row.message_type,
    processed: row.processed,
    created_at: row.created_at,
    classification,
    linked_to_cable: parseCableRefs(row.cable_refs).length > 0,
    linked_to_equipment: classification.extracted_equipment_codes.length > 0,
  };
}

function parseClassification(value: Json): TelegramProofClassification {
  const obj = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    source_type: getString(obj.source_type) as TelegramProofClassification["source_type"] ?? null,
    event_kind: getString(obj.event_kind),
    detected_position: getString(obj.detected_position) as TelegramProofClassification["detected_position"] ?? null,
    detected_status: getString(obj.detected_status),
    confidence: typeof obj.confidence === "number" ? obj.confidence : null,
    confidence_reason: getString(obj.confidence_reason),
    requires_human_validation: obj.requires_human_validation === true,
    recommended_action: getString(obj.recommended_action),
    extracted_cable_codes: parseStringArray(obj.extracted_cable_codes),
    extracted_equipment_codes: parseStringArray(obj.extracted_equipment_codes),
    extracted_eswbs: parseStringArray(obj.extracted_eswbs),
    ocr_status: getString(obj.ocr_status),
    incoherence_reason: getString(obj.incoherence_reason),
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function listRecentTelegramMessages(limit = 12): Promise<TelegramLiveMessage[]> {
  const { data, error } = await supabase
    .from("incoming_messages")
    .select("id,sender_name,message_ts,text,cable_refs,message_type,processed,created_at,classification")
    .eq("source", "telegram")
    .order("message_ts", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as IncomingMessageRow[]).map(toTelegramLiveMessage);
}

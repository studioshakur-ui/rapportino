import type { Json } from "../../types/supabase.generated";
import type { ParsedIncomingMessage } from "../types";

interface MetaMessageValue {
  messages?: Array<{
    from?: string;
    id?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
  }>;
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
}

interface MetaChange {
  value?: MetaMessageValue;
}

interface MetaEntry {
  id?: string;
  changes?: MetaChange[];
}

interface MetaWebhookPayload {
  object?: string;
  entry?: MetaEntry[];
}

function buildProviderEventId(
  phoneNumberId: string | null,
  wamid: string | null,
  timestamp: string,
): string {
  return [phoneNumberId ?? "unknown-phone", wamid ?? "unknown-wamid", timestamp].join(":");
}

export function extractIncomingMessages(payload: Json): ParsedIncomingMessage[] {
  const typed = payload as MetaWebhookPayload;
  if (typed.object !== "whatsapp_business_account") {
    return [];
  }

  const records: ParsedIncomingMessage[] = [];
  for (const entry of typed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id ?? null;
      const contact = value?.contacts?.[0];
      for (const message of value?.messages ?? []) {
        const timestamp = message.timestamp
          ? new Date(Number.parseInt(message.timestamp, 10) * 1000).toISOString()
          : new Date().toISOString();
        const wamid = message.id ?? null;
        records.push({
          providerEventId: buildProviderEventId(phoneNumberId, wamid, timestamp),
          wamid,
          sender: message.from ?? contact?.wa_id ?? "",
          senderName: contact?.profile?.name ?? null,
          groupId: entry.id ?? null,
          groupName: null,
          messageType: message.type ?? "unknown",
          text: message.text?.body ?? null,
          receivedAt: timestamp,
          rawPayload: payload,
        });
      }
    }
  }

  return records;
}

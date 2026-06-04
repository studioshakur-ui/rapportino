// apps/commander/src/whatsappMessageMapper.ts
// Maps a Meta WhatsApp Cloud API webhook payload into flat MappedMessage records.
// Unsupported payloads (statuses, unknown shapes) are ignored cleanly (-> []).

export interface MappedMessage {
  wamid: string; // Meta message id (idempotency key)
  from: string; // sender wa_id (phone)
  sender_name: string | null;
  timestamp: string; // ISO 8601
  message_type: string; // text | image | audio | video | document | location | ...
  text: string | null; // body for text messages, caption for media when present
  media_type: string | null; // image | audio | video | document | null
}

// --- Minimal structural types for the Meta payload (only what we read) ----
interface MetaTextMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  audio?: unknown;
}
interface MetaContact {
  wa_id?: string;
  profile?: { name?: string };
}
interface MetaChangeValue {
  messaging_product?: string;
  contacts?: MetaContact[];
  messages?: MetaTextMessage[];
  statuses?: unknown[];
}
interface MetaChange {
  field?: string;
  value?: MetaChangeValue;
}
interface MetaEntry {
  id?: string;
  changes?: MetaChange[];
}
export interface MetaWebhookBody {
  object?: string;
  entry?: MetaEntry[];
}

const MEDIA_TYPES = new Set(["image", "audio", "video", "document"]);

function toIso(tsSeconds: string | undefined): string {
  const n = Number(tsSeconds);
  if (Number.isFinite(n) && n > 0) return new Date(n * 1000).toISOString();
  return new Date().toISOString();
}

function extractText(m: MetaTextMessage): string | null {
  if (m.type === "text") return m.text?.body ?? null;
  if (m.type === "image") return m.image?.caption ?? null;
  if (m.type === "video") return m.video?.caption ?? null;
  if (m.type === "document") return m.document?.caption ?? m.document?.filename ?? null;
  return null;
}

export function mapWhatsAppPayload(body: MetaWebhookBody): MappedMessage[] {
  const out: MappedMessage[] = [];
  if (!body || body.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
    return out;
  }

  for (const entry of body.entry) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const messages = value?.messages;
      if (!Array.isArray(messages) || messages.length === 0) continue; // status-only / unsupported

      const nameByWaId = new Map<string, string>();
      for (const c of value?.contacts ?? []) {
        if (c.wa_id && c.profile?.name) nameByWaId.set(c.wa_id, c.profile.name);
      }

      for (const m of messages) {
        if (!m.id || !m.from || !m.type) continue; // malformed → ignore cleanly
        const media_type = MEDIA_TYPES.has(m.type) ? m.type : null;
        out.push({
          wamid: m.id,
          from: m.from,
          sender_name: nameByWaId.get(m.from) ?? null,
          timestamp: toIso(m.timestamp),
          message_type: m.type,
          text: extractText(m),
          media_type,
        });
      }
    }
  }

  return out;
}

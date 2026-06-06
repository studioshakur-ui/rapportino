// CORE COMMAND — Telegram Bridge
// grammy (long polling) → Supabase
// Aucun serveur HTTPS requis. Aucune approbation Meta.
// Démarrage : npm run dev → lire SETUP.md

import "dotenv/config";
import crypto                    from "crypto";
import http                      from "http";
import { Bot, type Context }     from "grammy";
import { createClient }          from "@supabase/supabase-js";

// ── Config ─────────────────────────────────────────────────────────────────
const BOT_TOKEN    = process.env.BOT_TOKEN    ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const STATUS_PORT  = parseInt(process.env.STATUS_PORT ?? "3098", 10);

const WATCH_IDS: Set<number> = new Set(
  (process.env.WATCH_CHAT_IDS ?? "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))
);

if (!BOT_TOKEN)    { console.error("❌ BOT_TOKEN manquant dans .env"); process.exit(1); }
if (!SUPABASE_URL) { console.error("❌ SUPABASE_URL manquant dans .env"); process.exit(1); }
if (!SUPABASE_KEY) { console.error("❌ SUPABASE_SERVICE_KEY manquant dans .env"); process.exit(1); }

// ── Supabase (service role — server-side only) ─────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ── Normalizer (copie autonome de normalizer.agent.ts) ─────────────────────
const COMMON_WORDS = new Set([
  "OK","SI","NO","HO","HA","CI","DA","DI","IN","UN","LA","LE","LO","AI",
  "ME","TE","SE","MA","OR","ED","AL","NE","SU","GU","DO","RE","FA","MI",
  "IS","IT","AT","AS","BE","BY","IF","OF","ON","TO","UP","WE",
  "IO","SA","SO","CO","PO","BO","VO","GO",
]);

function extractCableRefs(text: string): string[] {
  const found = new Set<string>();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/^\d+[-/]\d+\s+/, "")
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/@\S+/g, "")
      .replace(/[.\s]+/g, " ")
      .trim();
    if (!line) continue;

    const re = /\b([A-Za-z](?:[\s.]*[A-Za-z]){1,4})[\s.]*(\d{2,5})\s*([A-Za-z]?)\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const letters = m[1].replace(/[\s.]+/g, "").toUpperCase();
      const digits  = m[2];
      const suffix  = m[3].toUpperCase();
      if (letters.length < 2 || letters.length > 5) continue;
      if (COMMON_WORDS.has(letters)) continue;
      found.add(suffix ? `${letters} ${digits} ${suffix}` : `${letters} ${digits}`);
    }
  }
  return [...found];
}

function extractPercent(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  return v >= 0 && v <= 100 ? v : null;
}

// ── Minimal deterministic classifier (mirror of classifier.agent.ts) ───────
// Enough to mark "posato / sistemato / fatto / 100%" as a field confirmation.
function classifyEventKind(text: string): { kind: string; confidence: number } {
  const t = text.toLowerCase();
  if (/\bposat|sistemat|\bfatt|finit|complet|tirat|100\s*%/.test(t)) return { kind: "CABLE_POSATO", confidence: 0.9 };
  if (/\bcort|manca\s*metr|non\s*arriva/.test(t))                    return { kind: "CABLE_CORTO", confidence: 0.85 };
  if (/\bmancant|non\s*trovat|non\s*c'?è|assente/.test(t))           return { kind: "CABLE_MANCANTE", confidence: 0.85 };
  if (/\bda\s*controllar|verificar|errore/.test(t))                 return { kind: "CABLE_DA_CONTROLLARE", confidence: 0.8 };
  return { kind: "CABLE_MENTION", confidence: 0.5 };
}

// ── INCA match (READ-ONLY — never writes inca_cavi) ────────────────────────
// Normalized "IRS 002" → tries ["IRS 002", "I RS 002", "IRS002"] against marca_cavo.
function incaCandidates(normalized: string): string[] {
  const parts = normalized.split(" ");
  const letters = parts[0] ?? "";
  const digits = parts.slice(1).join(" ");
  const compactAll = normalized.replace(/\s+/g, "");
  const expanded = letters.length > 1 ? `${letters[0]} ${letters.slice(1)} ${digits}`.trim() : normalized;
  return Array.from(new Set([normalized, expanded, compactAll].filter(Boolean)));
}

async function matchIncaCavoId(normalized: string): Promise<string | null> {
  const { data } = await supabase
    .from("inca_cavi")
    .select("id")
    .in("marca_cavo", incaCandidates(normalized))
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

interface FieldEventLink {
  cableEventId: string;
  coreEventId: string;
  messageId: string;
  kind: string;
  occurredAt: string;
  author: string;
  note: string;
  confidence: number;
  progress: number | null;
}

// Link a confirmed cable to every daily-list item that carries the same code,
// so the Daily List progression reacts live. Uses the real schema columns.
async function linkDailyListItems(code: string, ev: FieldEventLink): Promise<void> {
  const { data: items, error } = await supabase
    .from("daily_list_items")
    .select("id,import_id")
    .eq("cable_code_normalized", code)
    .limit(200);
  if (error || !items || items.length === 0) return;

  const rows = items.map((it) => ({
    import_id:             it.import_id,
    daily_list_item_id:    it.id,
    cable_code_normalized: code,
    cable_event_id:        ev.cableEventId,
    core_event_id:         ev.coreEventId,
    whatsapp_message_id:   ev.messageId,
    source_type:           "cable_event",
    event_kind:            ev.kind,
    occurred_at:           ev.occurredAt,
    actor_label:           ev.author,
    raw_note:              ev.note,
    confidence:            ev.confidence,
    progress_percent:      ev.progress,
  }));

  const { error: insErr } = await supabase.from("daily_list_item_events").insert(rows);
  if (insErr) console.warn(`⚠  daily_list_item_events (${code}):`, insErr.message);
}

// For each cable mentioned in a Telegram message: core_event + cable_event + links.
async function recordFieldEvents(params: {
  messageId: string;
  cableRefs: string[];
  text: string;
  author: string;
  occurredAt: string;
  progress: number | null;
}): Promise<void> {
  const { messageId, cableRefs, text, author, occurredAt, progress } = params;
  if (cableRefs.length === 0) return;

  const { kind, confidence } = classifyEventKind(text);
  const note = `${author}: ${text.slice(0, 120)}`;

  for (const code of cableRefs) {
    try {
      const incaCavoId = await matchIncaCavoId(code);

      const { data: coreEvent, error: coreErr } = await supabase
        .from("core_events")
        .insert({
          event_type:            kind,
          occurred_at:           occurredAt,
          source:                "telegram",
          source_message_id:     messageId,
          operator_id:           null,
          inca_cavo_id:          incaCavoId,
          cable_code_raw:        code,
          cable_code_normalized: code,
          confidence,
          validation_status:     incaCavoId ? "promoted" : "pending",
          raw_text:              text.slice(0, 500),
          payload:               { author, progress },
        })
        .select("id")
        .single();
      if (coreErr || !coreEvent) { console.warn(`⚠  core_events (${code}):`, coreErr?.message); continue; }

      const { data: cableEvent, error: cableErr } = await supabase
        .from("cable_events")
        .insert({
          core_event_id:     coreEvent.id,
          occurred_at:       occurredAt,
          inca_cavo_id:      incaCavoId,
          cable_code:        code,
          event_kind:        kind,
          operator_id:       null,
          source_message_id: messageId,
          confidence,
          note,
        })
        .select("id")
        .single();
      if (cableErr || !cableEvent) { console.warn(`⚠  cable_events (${code}):`, cableErr?.message); continue; }

      await linkDailyListItems(code, {
        cableEventId: cableEvent.id as string,
        coreEventId:  coreEvent.id as string,
        messageId,
        kind,
        occurredAt,
        author,
        note,
        confidence,
        progress,
      });
    } catch (err) {
      console.warn(`⚠  recordFieldEvents (${code}) non-fatal:`, (err as Error).message);
    }
  }
}

// ── Statut bridge ─────────────────────────────────────────────────────────
let stats = {
  status:          "starting" as "starting"|"connected"|"error",
  bot_username:    null as string|null,
  messages_today:  0,
  last_message_at: null as string|null,
  watched_groups:  [...WATCH_IDS].map(String),   // même clé que le widget
  started_at:      new Date().toISOString(),
};

http.createServer((_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify({ ...stats, uptime_s: Math.round(process.uptime()) }, null, 2));
}).listen(STATUS_PORT, () => {
  console.log(`📡 Status: http://localhost:${STATUS_PORT}/`);
});

// ── Bot ────────────────────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

bot.on("message", async (ctx: Context) => {
  const msg  = ctx.message;
  if (!msg) return;

  const chatId   = msg.chat.id;
  const chatName = "title" in msg.chat ? msg.chat.title : String(chatId);
  const text     = msg.text ?? msg.caption ?? "";
  const sender   = msg.from?.first_name ?? msg.from?.username ?? String(msg.from?.id ?? "unknown");
  const senderId = String(msg.from?.id ?? "");

  // ── Détecter groupe si pas encore configuré ────────────────────────────
  if (WATCH_IDS.size === 0) {
    console.log(`📋 Groupe détecté: "${chatName}" → ID: ${chatId}`);
    console.log(`   Ajouter dans .env : WATCH_CHAT_IDS=${chatId}`);
  }

  // ── Filtrer par groupe ─────────────────────────────────────────────────
  if (WATCH_IDS.size > 0 && !WATCH_IDS.has(chatId)) return;

  // ── Ignorer messages vides ─────────────────────────────────────────────
  const hasMedia = Boolean(msg.photo ?? msg.document ?? msg.video);
  if (!text && !hasMedia) return;

  const displayText = text || `[media: ${msg.document?.file_name ?? msg.photo ? "photo" : "fichier"}]`;
  console.log(`\n📨 [${chatName}] ${sender}: ${displayText.slice(0, 100)}`);

  // ── Extraire cables + % ────────────────────────────────────────────────
  const cableRefs = extractCableRefs(text);
  const progress  = extractPercent(text);

  // ── Déduplication ──────────────────────────────────────────────────────
  const msgKey = `tg:${chatId}:${msg.message_id}`;
  const hash   = crypto.createHash("sha256").update(msgKey).digest("hex").slice(0, 32);

  const { data: existing } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("message_hash", hash)
    .maybeSingle();

  if (existing) {
    console.log(`   ↳ Doublon ignoré`);
    return;
  }

  // ── Insert whatsapp_messages ───────────────────────────────────────────
  const { data: inserted, error: msgErr } = await supabase
    .from("whatsapp_messages")
    .insert({
      import_id:      null,
      message_ts:     new Date(msg.date * 1000).toISOString(),
      author:         sender,
      raw_message:    displayText,
      media_type:     hasMedia ? (msg.photo ? "image" : "document") : null,
      media_filename: msg.document?.file_name ?? null,
      message_hash:   hash,
    })
    .select("id")
    .single();

  if (msgErr) {
    console.error("❌ Insert whatsapp_messages:", msgErr.message);
    return;
  }

  // ── Insert incoming_messages ───────────────────────────────────────────
  await supabase.from("incoming_messages").insert({
    source:       "telegram",
    wamid:        msgKey,
    sender:       senderId,
    sender_name:  sender,
    message_ts:   new Date(msg.date * 1000).toISOString(),
    message_type: hasMedia ? "media" : "text",
    text:         displayText,
    cable_refs:   cableRefs,
    classification: { chat_id: chatId, chat_name: chatName, progress },
    raw_payload:  { message_id: msg.message_id, chat_id: chatId },
    processed:    false,
  }).then(({ error }) => {
    if (error) console.warn("⚠  incoming_messages (non-fatal):", error.message);
  });

  // ── Live field reaction: core_events + cable_events + daily list links ──
  await recordFieldEvents({
    messageId:  inserted.id as string,
    cableRefs,
    text:       displayText,
    author:     sender,
    occurredAt: new Date(msg.date * 1000).toISOString(),
    progress,
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  stats.messages_today++;
  stats.last_message_at = new Date().toISOString();

  // ── Log ───────────────────────────────────────────────────────────────
  if (cableRefs.length > 0) {
    console.log(`   ↳ ✓ ID ${inserted.id} | Câbles: ${cableRefs.join(", ")}${progress != null ? ` | ${progress}%` : ""}`);
  } else {
    console.log(`   ↳ ✓ ID ${inserted.id} | Pas de code câble`);
  }
});

// ── Démarrage ──────────────────────────────────────────────────────────────
console.log("🚀 CORE COMMAND Telegram Bridge démarrage...\n");

// Long polling résilient au 409 (Conflict). Pendant un redéploiement, l'ancien
// conteneur tient encore le getUpdates : quitter le process (process.exit) crée
// un deadlock — Railway garde l'ancien build en vie tant que le nouveau n'est
// pas « sain ». On réessaie donc au lieu de quitter : le nouveau process reste
// vivant, Railway stoppe l'ancien, le poll se libère et le bot prend le relais.
async function startBot(): Promise<void> {
  try {
    await bot.start({
      drop_pending_updates: true,
      onStart: async (info) => {
        stats.status       = "connected";
        stats.bot_username = info.username;
        console.log(`🟢 Bot connecté: @${info.username}`);
        if (WATCH_IDS.size > 0) {
          console.log(`👀 Groupes surveillés: ${[...WATCH_IDS].join(", ")}`);
        } else {
          console.log("⚠  WATCH_CHAT_IDS vide — envoyer un message dans le groupe pour obtenir l'ID\n");
        }
      },
    });
  } catch (err) {
    stats.status = "error";
    console.error("❌ Erreur bot (nouvelle tentative dans 5s):", (err as Error).message);
    setTimeout(() => { void startBot(); }, 5000);
  }
}
void startBot();

process.on("SIGINT", async () => {
  console.log("\n⏹  Arrêt...");
  await bot.stop();
  process.exit(0);
});

// src/main.ts — CORE COMMAND WhatsApp Bridge
// Lance whatsapp-web.js, affiche QR code, écoute le groupe chantier,
// insère les messages dans Supabase automatiquement.
// Aucun compte Meta. Aucune approbation. Juste un QR code.

import qrcode   from "qrcode-terminal";
import { Client, LocalAuth, type Message, type GroupChat } from "whatsapp-web.js";
import { CONFIG, validateConfig }  from "./config.js";
import { processMessage }          from "./messageProcessor.js";
import { startStatusServer, updateState, incrementMessages } from "./statusServer.js";

// ── Config validation ──────────────────────────────────────────────────────
validateConfig();

// ── Status server ──────────────────────────────────────────────────────────
startStatusServer();

// ── WhatsApp client ────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: CONFIG.SESSION_DIR,
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  },
});

// ── QR Code ────────────────────────────────────────────────────────────────
client.on("qr", (qr: string) => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📱 SCANNER CE QR CODE AVEC WHATSAPP (Appareils liés)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  qrcode.generate(qr, { small: true });
  console.log("\n(Le QR code expire dans ~20 secondes. Re-scanner si nécessaire.)");
  updateState({ status: "qr_pending" });
});

// ── Authenticated ──────────────────────────────────────────────────────────
client.on("authenticated", () => {
  console.log("✅ WhatsApp authentifié — session sauvegardée.");
});

client.on("auth_failure", (msg: string) => {
  console.error("❌ Échec authentification:", msg);
  updateState({ status: "error", error_message: msg });
});

// ── Ready ──────────────────────────────────────────────────────────────────
client.on("ready", async () => {
  const info = client.info;
  const phone = info?.wid?.user ?? "unknown";
  console.log(`\n🟢 CORE COMMAND Bridge connecté — ${phone}`);
  console.log(`   Groupes surveillés: ${CONFIG.WATCH_GROUPS.length > 0 ? CONFIG.WATCH_GROUPS.join(", ") : "TOUS"}`);

  updateState({
    status:       "connected",
    phone,
    connected_at: new Date().toISOString(),
    error_message: null,
  });

  // Lister les groupes disponibles pour aide au débogage
  if (CONFIG.WATCH_GROUPS.length === 0) {
    const chats = await client.getChats();
    const groups = chats.filter((c) => c.isGroup) as GroupChat[];
    console.log("\n📋 Groupes disponibles:");
    groups.forEach((g) => console.log(`   · "${g.name}"`));
    console.log("\n💡 Ajouter les noms exacts dans WATCH_GROUPS dans .env\n");
  }
});

// ── Disconnected ───────────────────────────────────────────────────────────
client.on("disconnected", (reason: string) => {
  console.warn("🔴 Bridge déconnecté:", reason);
  updateState({ status: "disconnected", error_message: reason });
  // Tenter reconnexion automatique après 30s
  setTimeout(() => {
    console.log("🔄 Tentative de reconnexion...");
    void client.initialize();
  }, 30_000);
});

// ── Message handler ────────────────────────────────────────────────────────
client.on("message", async (msg: Message) => {
  try {
    // Filtrer : seulement les messages de groupe
    if (!msg.from.endsWith("@g.us")) return;

    const chat = await msg.getChat() as GroupChat;
    const groupName = chat.name ?? "";

    // Filtrer par groupe si configuré
    if (
      CONFIG.WATCH_GROUPS.length > 0 &&
      !CONFIG.WATCH_GROUPS.some((g) => groupName.toLowerCase().includes(g.toLowerCase()))
    ) {
      return;
    }

    // Ignorer les messages système et status
    if (msg.type === "e2e_notification" || msg.type === "notification_template") return;

    const contact = await msg.getContact();
    const senderName = contact.pushname ?? contact.name ?? msg.from.split("@")[0];
    const text = msg.body?.trim() ?? "";

    // Ignorer les messages vides
    if (!text && !msg.hasMedia) return;

    const mediaType = msg.hasMedia ? String(msg.type) : null;
    const mediaName = msg.hasMedia
      ? (await msg.downloadMedia().catch(() => null))?.filename ?? null
      : null;

    console.log(`\n📨 [${groupName}] ${senderName}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`);

    const result = await processMessage({
      wamid:       msg.id._serialized,
      sender:      msg.from,
      sender_name: senderName,
      group_name:  groupName,
      message_ts:  new Date(msg.timestamp * 1000),
      text,
      media_type:  mediaType,
      media_name:  mediaName,
    });

    if (result.skipped) {
      console.log(`   ↳ Doublon ignoré (${result.msg_id})`);
    } else {
      incrementMessages();
      if (result.cable_refs.length > 0) {
        console.log(`   ↳ ✓ Inséré | Câbles: ${result.cable_refs.join(", ")}${result.progress != null ? ` | ${result.progress}%` : ""}`);
      } else {
        console.log(`   ↳ ✓ Inséré | Pas de code câble détecté`);
      }
    }
  } catch (err) {
    console.error("❌ Erreur traitement message:", err);
  }
});

// ── Démarrage ──────────────────────────────────────────────────────────────
console.log("🚀 CORE COMMAND WhatsApp Bridge démarrage...");
console.log("   (Première fois : scanner le QR code avec WhatsApp → Appareils liés)\n");

client.initialize().catch((err: Error) => {
  console.error("❌ Initialisation échouée:", err.message);
  updateState({ status: "error", error_message: err.message });
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⏹  Arrêt du bridge...");
  await client.destroy();
  process.exit(0);
});

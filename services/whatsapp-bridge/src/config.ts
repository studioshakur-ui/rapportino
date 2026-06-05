// src/config.ts — CORE COMMAND WhatsApp Bridge
// Copier .env.example → .env et remplir les valeurs.

export const CONFIG = {
  // Supabase — utiliser la SERVICE ROLE KEY (jamais exposée côté client)
  SUPABASE_URL:          process.env.SUPABASE_URL          ?? "",
  SUPABASE_SERVICE_KEY:  process.env.SUPABASE_SERVICE_KEY  ?? "",

  // Noms exacts des groupes WhatsApp à écouter (sensible à la casse)
  // Laisser vide pour écouter TOUS les groupes (déconseillé en prod)
  WATCH_GROUPS: (process.env.WATCH_GROUPS ?? "").split(",").map((s) => s.trim()).filter(Boolean),

  // Numéro de téléphone du bot (optionnel, pour les logs)
  BOT_PHONE: process.env.BOT_PHONE ?? "",

  // Port du mini-serveur HTTP de statut
  STATUS_PORT: parseInt(process.env.STATUS_PORT ?? "3099", 10),

  // Chemin de stockage de la session WhatsApp
  SESSION_DIR: process.env.SESSION_DIR ?? "./.wwebjs_auth",
};

// Validation au démarrage
export function validateConfig() {
  const missing: string[] = [];
  if (!CONFIG.SUPABASE_URL)         missing.push("SUPABASE_URL");
  if (!CONFIG.SUPABASE_SERVICE_KEY) missing.push("SUPABASE_SERVICE_KEY");
  if (missing.length > 0) {
    console.error("❌ Variables manquantes dans .env :", missing.join(", "));
    process.exit(1);
  }
  if (CONFIG.WATCH_GROUPS.length === 0) {
    console.warn("⚠  WATCH_GROUPS non défini — tous les groupes seront écoutés.");
  } else {
    console.log("👀 Groupes surveillés :", CONFIG.WATCH_GROUPS);
  }
}

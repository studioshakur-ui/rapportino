// src/features/core-command/intake/parseWhatsApp.ts
// Pure parser for WhatsApp .txt export. No side effects, no DB calls.
//
// Formats reconnus :
//   [DD/MM/YYYY HH:MM:SS] Author: message      ← format réel (espace, sans virgule)
//   [DD/MM/YYYY, HH:MM:SS] Author: message     ← variante avec virgule
//   DD/MM/YYYY, HH:MM - Author: message        ← export Android/ancien
//   DD.MM.YYYY, HH:MM - Author: message

import type { ParsedWhatsAppMessage, WhatsAppParseResult } from "../types";

// ---------------------------------------------------------------------------
// Caractères invisibles WhatsApp (U+200E LTR mark, U+200F RTL mark, BOM, etc.)
// Présents en début de ligne ou embarqués dans le texte selon la version de l'app.
// ---------------------------------------------------------------------------
const INVISIBLE_CHARS = /[‎‏‪‬‭‮﻿]/g;

function stripInvisible(s: string): string {
  return s.replace(INVISIBLE_CHARS, "");
}

// ---------------------------------------------------------------------------
// Regex
// Clé : entre la date et l'heure, on accepte [,\s] (virgule OU espace).
// ---------------------------------------------------------------------------

// [DD/MM/YYYY HH:MM:SS] Author: message  (espace ou virgule après la date)
const FORMAT_BRACKET =
  /^\[(\d{1,2})[./](\d{1,2})[./](\d{4})[,\s]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*(.+?):\s([\s\S]*)$/;

// DD/MM/YYYY, HH:MM - Author: message
const FORMAT_DASH =
  /^(\d{1,2})[./](\d{1,2})[./](\d{4})[,\s]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*-\s(.+?):\s([\s\S]*)$/;

// ---------------------------------------------------------------------------
// Contenu à ignorer (médias absents, messages supprimés/modifiés)
// Multilingue : FR + IT + EN
// ---------------------------------------------------------------------------
const IGNORED_CONTENT_PATTERNS = [
  // French
  /^image absente$/i,
  /^audio omis$/i,
  /^vidéo absente$/i,
  /^<Ce message a été modifié>$/i,
  /^Ce message a été supprimé\.?$/i,
  /^<Ce message a été supprimé>$/i,
  // Italian
  /^<media omesso>$/i,
  /^immagine assente$/i,
  /^audio assente$/i,
  /^video assente$/i,
  /^<questo messaggio è stato eliminato>$/i,
  // English
  /^<media omitted>$/i,
  /^image omitted$/i,
  /^audio omitted$/i,
  /^video omitted$/i,
  /^this message was deleted\.?$/i,
  /^you deleted this message\.?$/i,
];

function isIgnoredContent(raw: string): boolean {
  const cleaned = stripInvisible(raw).trim();
  return IGNORED_CONTENT_PATTERNS.some((re) => re.test(cleaned));
}

// ---------------------------------------------------------------------------
// Messages système WhatsApp (pas des vrais messages utilisateur)
// FR + IT + EN — détection sur le contenu RAW (après strip invisible)
// ---------------------------------------------------------------------------
const SYSTEM_CONTENT_PATTERNS = [
  // French
  /a créé le groupe/i,
  /a ajouté .+/i,
  /vous a ajouté/i,
  /a remplacé le nom du groupe/i,
  /a changé l.icône de ce groupe/i,
  /a quitté le groupe/i,
  /a été ajouté/i,
  /Les messages et les appels sont chiffrés de bout en bout/i,
  /Appel vocal manqué/i,
  /Appel vidéo manqué/i,
  // Italian
  /ha creato il gruppo/i,
  /ha aggiunto .+/i,
  /ti ha aggiunto/i,
  /ha rimosso .+/i,
  /ha cambiato .+(icona|nome)/i,
  /I messaggi e le chiamate sono cifrati/i,
  /Chiamata persa/i,
  // English
  /created group/i,
  /added .+/i,
  /changed the (group|subject|icon)/i,
  /Messages and calls are end-to-end encrypted/i,
  /Missed voice call/i,
  /Missed video call/i,
];

function isSystemContent(raw: string): boolean {
  const cleaned = stripInvisible(raw).trim();
  return SYSTEM_CONTENT_PATTERNS.some((re) => re.test(cleaned));
}

// ---------------------------------------------------------------------------
// Détection médias inline (pièces jointes avec nom de fichier)
// ---------------------------------------------------------------------------
function detectMedia(raw: string): { media_type: string | null; media_filename: string | null } {
  const cleaned = stripInvisible(raw).trim();

  if (isIgnoredContent(cleaned)) {
    return { media_type: "omitted", media_filename: null };
  }

  const attach = cleaned.match(/^(.+\.(jpg|jpeg|png|gif|mp4|mov|avi|pdf|xlsx|docx|opus|aac|mp3))\s*(?:\(.*\))?$/i);
  if (attach) {
    const ext = attach[2].toLowerCase();
    const media_type =
      ["jpg","jpeg","png","gif"].includes(ext) ? "image" :
      ["mp4","mov","avi"].includes(ext)         ? "video" :
      ["opus","aac","mp3"].includes(ext)         ? "audio" :
      "document";
    return { media_type, media_filename: attach[1] };
  }

  return { media_type: null, media_filename: null };
}

// ---------------------------------------------------------------------------
// Parse une ligne en timestamp + auteur + message brut
// ---------------------------------------------------------------------------
function parseDate(d: string, m: string, y: string, h: string, min: string, s = "0"): Date {
  return new Date(
    parseInt(y, 10),
    parseInt(m, 10) - 1,
    parseInt(d, 10),
    parseInt(h, 10),
    parseInt(min, 10),
    parseInt(s, 10)
  );
}

function tryParseLine(rawLine: string): { author: string; ts: Date; raw: string } | null {
  // Strip leading invisible chars avant le match regex
  const line = rawLine.replace(/^[‎‏‪‬‭‮﻿]+/, "");

  let m = line.match(FORMAT_BRACKET);
  if (m) {
    return {
      ts:     parseDate(m[1], m[2], m[3], m[4], m[5], m[6]),
      author: m[7].trim(),
      raw:    m[8],
    };
  }

  m = line.match(FORMAT_DASH);
  if (m) {
    return {
      ts:     parseDate(m[1], m[2], m[3], m[4], m[5], m[6]),
      author: m[7].trim(),
      raw:    m[8],
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Export principal
// ---------------------------------------------------------------------------
export function parseWhatsAppExport(
  text: string,
  fileName = ""
): WhatsAppParseResult {
  const lines = text.split(/\r?\n/);
  const messages: ParsedWhatsAppMessage[] = [];
  const errors: string[] = [];

  // Nom du groupe depuis le nom de fichier
  let group_name: string | null = null;
  if (fileName) {
    const fn = fileName.replace(/\.(txt|zip)$/i, "");
    const gm = fn.match(/^(?:WhatsApp Chat with|Chat WhatsApp con)\s+(.+)$/i);
    group_name = gm ? gm[1].trim() : fn;
  }

  let current: { author: string; ts: Date; lines: string[] } | null = null;

  function flushCurrent() {
    if (!current) return;

    const raw = current.lines.join("\n").trim();
    const rawCleaned = stripInvisible(raw).trim();

    // Ignorer si contenu purement système ou vide
    if (!rawCleaned || isSystemContent(rawCleaned) || isIgnoredContent(rawCleaned)) {
      current = null;
      return;
    }

    const { media_type, media_filename } = detectMedia(rawCleaned);

    messages.push({
      message_ts:     current.ts,
      author:         current.author,
      raw_message:    rawCleaned,
      media_type,
      media_filename,
    });

    current = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = tryParseLine(line);

    if (parsed) {
      flushCurrent();
      current = { author: parsed.author, ts: parsed.ts, lines: [parsed.raw] };
    } else if (current && line.trim().length > 0) {
      // Continuation multi-ligne
      current.lines.push(line);
    }
  }

  // Flush dernier message
  flushCurrent();

  // Rapport de debug
  if (messages.length === 0) {
    errors.push("Aucun message trouvé. Vérifier le format du fichier (.txt export WhatsApp).");

    // Diagnostic automatique sur les 5 premières lignes
    const sample = lines.slice(0, 5).map((l, i) => {
      const stripped = l.replace(/^[‎‏‪‬‭‮﻿]+/, "");
      return `L${i + 1}: ${JSON.stringify(stripped.slice(0, 80))}`;
    });
    errors.push(`Lignes brutes (5 premières): ${sample.join(" | ")}`);
  }

  return { messages, group_name, errors };
}

// ---------------------------------------------------------------------------
// Résumé import (affiché dans WhatsAppIntakePage)
// ---------------------------------------------------------------------------
export interface ParseSummary {
  count: number;
  first: ParsedWhatsAppMessage | null;
  last: ParsedWhatsAppMessage | null;
  authors: string[];
}

export function summarizeParse(messages: ParsedWhatsAppMessage[]): ParseSummary {
  const authors = [...new Set(messages.map((m) => m.author))].sort();
  return {
    count:   messages.length,
    first:   messages[0]  ?? null,
    last:    messages[messages.length - 1] ?? null,
    authors,
  };
}

// ---------------------------------------------------------------------------
// Hash de déduplication (sans dep crypto)
// ---------------------------------------------------------------------------
export function messageHash(ts: Date, author: string, raw: string): string {
  const str = `${ts.toISOString()}|${author}|${raw.slice(0, 100)}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

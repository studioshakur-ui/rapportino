// src/features/core-command/agents/classifier.agent.ts
// Classificateur déterministe V1 — aucune IA.
// Analyse le texte brut d'un message WhatsApp et retourne un type d'événement + confidence.

export type EventKind =
  | "CABLE_POSATO"
  | "CABLE_SFILATO"
  | "CABLE_LASATO"
  | "CABLE_CORTO"
  | "CABLE_MANCANTE"
  | "CABLE_DA_CONTROLLARE"
  | "MATERIAL_REQUEST"
  | "ATTENDANCE_ABSENCE"
  | "PHOTO_EVENT"
  | "AUDIO_EVENT"
  | "DOCUMENT_EVENT"
  | "CABLE_MENTION"
  | "GENERAL_MESSAGE";

export interface Classification {
  kind: EventKind;
  confidence: number;
  matched_keywords: string[];
}

interface Rule {
  kind: EventKind;
  confidence: number;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  // Media events (basés sur media_type, à vérifier en amont)
  {
    kind: "PHOTO_EVENT",
    confidence: 0.95,
    patterns: [/\bimage absente\b/i, /\bimmagine assente\b/i, /\bimage omitted\b/i],
  },
  {
    kind: "AUDIO_EVENT",
    confidence: 0.95,
    patterns: [/\baudio omis\b/i, /\baudio assente\b/i, /\baudio omitted\b/i],
  },
  {
    kind: "DOCUMENT_EVENT",
    confidence: 0.95,
    patterns: [/\bvid[eé]o absente\b/i, /\bdocument manquant\b/i],
  },

  // Statuts câble — posato/fatto
  {
    kind: "CABLE_POSATO",
    confidence: 0.92,
    patterns: [
      /\bposato\b/i, /\bposati\b/i, /\bposata\b/i,
      /\b100\s*%/,
      /\bfatto\b/i, /\bfatta\b/i, /\bfatti\b/i,
      /\bfinito\b/i, /\bfinita\b/i, /\bfiniti\b/i,
      /\bcompletato\b/i, /\bgia fatto\b/i, /\bgià fatto\b/i,
      /\banche oggi fatto\b/i, /\bho fatto\b/i, /\bho fatto questa\b/i,
      /\btirato\b/i, /\btirata\b/i,
    ],
  },

  // Sfilato
  {
    kind: "CABLE_SFILATO",
    confidence: 0.92,
    patterns: [
      /\bsfilato\b/i, /\bsfilati\b/i, /\bsfilare\b/i,
      /\bispilato\b/i, /\bespilato\b/i,
      /\bsfilato\s+\d+\s+cavi\b/i,
    ],
  },

  // Lasato
  {
    kind: "CABLE_LASATO",
    confidence: 0.90,
    patterns: [
      /\blasato\b/i, /\blasciato\b/i, /\blasati\b/i,
      /\blasco\b/i, /\blasare\b/i,
    ],
  },

  // Corto / manca metri
  {
    kind: "CABLE_CORTO",
    confidence: 0.88,
    patterns: [
      /\bcorto\b/i, /\bcorta\b/i,
      /\bmanca\s+metr/i, /\bserve ancora\b/i,
      /\btroppo corto\b/i, /\btroppa corta\b/i,
      /\bnon arriva\b/i, /\bpoco\b/i,
    ],
  },

  // Mancante / non trovato
  {
    kind: "CABLE_MANCANTE",
    confidence: 0.88,
    patterns: [
      /\bmanc(a|ano|ava|hi)\b/i,
      /\bnon trovato\b/i, /\bnon esiste\b/i,
      /\bnon c['']è\b/i, /\bnon ci sono\b/i,
      /\bnon trova\b/i, /\bcercato\b/i,
      /\bmancha\b/i,   // typo frequente
      /\bmancha di piu\b/i,
    ],
  },

  // Da controllare
  {
    kind: "CABLE_DA_CONTROLLARE",
    confidence: 0.85,
    patterns: [
      /\bda controllare\b/i, /\bcontrollare\b/i, /\bcontrolla\b/i,
      /\bproblema\b/i, /\bsbagliato\b/i, /\bsbagliata\b/i,
      /\berrore\b/i, /\bverifica\b/i, /\bcheck\b/i,
      /\bnon va\b/i, /\bnon funziona\b/i,
    ],
  },

  // Materiale
  {
    kind: "MATERIAL_REQUEST",
    confidence: 0.85,
    patterns: [
      /\bguanti\b/i, /\bscarpe\b/i, /\bfascette\b/i,
      /\bnastro\b/i, /\bpenarola\b/i, /\bmateriale\b/i,
      /\bportare\b/i, /\bserve\b/i, /\bservi\b/i,
      /\bstrumenti\b/i, /\battrezzi\b/i, /\bcacciavite\b/i,
    ],
  },

  // Assenza / ritardo
  {
    kind: "ATTENDANCE_ABSENCE",
    confidence: 0.90,
    patterns: [
      /\bnon vengo\b/i, /\bnon viene\b/i,
      /\bmalato\b/i, /\bmalata\b/i,
      /\bin ritardo\b/i, /\britardo\b/i,
      /\bcorso\b/i,
      /\bassente\b/i, /\bnon arrivo\b/i,
      /\bperso il treno\b/i, /\bsarò in ritardo\b/i,
      /\bnon posso lavorare\b/i, /\bè ammalato\b/i,
    ],
  },
];

export function classifyMessage(
  text: string,
  mediaType?: string | null
): Classification {
  // Media explicite
  if (mediaType === "image" || mediaType === "omitted") {
    return { kind: "PHOTO_EVENT", confidence: 0.95, matched_keywords: ["media:image"] };
  }
  if (mediaType === "audio") {
    return { kind: "AUDIO_EVENT", confidence: 0.95, matched_keywords: ["media:audio"] };
  }
  if (mediaType === "video" || mediaType === "document") {
    return { kind: "DOCUMENT_EVENT", confidence: 0.95, matched_keywords: ["media:document"] };
  }

  const lower = text.toLowerCase();
  let best: Classification | null = null;

  for (const rule of RULES) {
    const matched: string[] = [];
    for (const p of rule.patterns) {
      if (p.test(lower)) {
        matched.push(p.source);
      }
    }
    if (matched.length > 0) {
      const score = rule.confidence + Math.min(matched.length - 1, 3) * 0.01;
      if (!best || score > best.confidence) {
        best = { kind: rule.kind, confidence: Math.min(score, 0.99), matched_keywords: matched };
      }
    }
  }

  return best ?? { kind: "GENERAL_MESSAGE", confidence: 0.2, matched_keywords: [] };
}

// Confidence câble — basée sur classification + match INCA.
// Ne pénalise PAS le format espacé/pointé (c'est le job du normalizer).
// inca_cavo_id null = confidence réduite, jamais bloquante.
export function cableConfidence(
  classifConf: number,
  incaMatched: boolean
): number {
  // Si code non trouvé dans INCA : on réduit mais on ne bloque pas
  const base = incaMatched ? classifConf : classifConf * 0.75;
  return Math.min(Math.max(Math.round(base * 100) / 100, 0.20), 0.99);
}

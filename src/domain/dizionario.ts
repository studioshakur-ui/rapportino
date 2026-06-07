// src/domain/dizionario.ts — Dizionario dominio italiano CORE COMMAND
// Unica fonte di verità per la terminologia di dominio.
// Nessun testo UI in francese. Nessun calcolo métier qui.

export const STATO_CAVO: Record<string, string> = {
  confirmed_field: "Confermato terreno",
  likely_laid:     "Posato probabile",
  to_verify:       "Da verificare",
  no_evidence:     "Senza evidenza",
  missing:         "Mancante",
  blocked:         "Bloccato",
  outside_inca:    "Fuori INCA",
};

export const LIVELLO_RISCHIO: Record<string, string> = {
  low:      "Basso",
  medium:   "Medio",
  high:     "Alto",
  critical: "Critico",
};

export const STATO_CHIUSURA = {
  CHIUSO:     "CHIUSO",
  NON_CHIUSO: "NON CHIUSO",
  IN_CORSO:   "IN CORSO",
  BLOCCATO:   "BLOCCATO",
} as const;
export type StatoChiusura = typeof STATO_CHIUSURA[keyof typeof STATO_CHIUSURA];

export const STATO_META_IT = {
  confirmed_field: {
    label:     "Confermato terreno",
    color:     "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    icon:      "✓",
  },
  likely_laid: {
    label:     "Posato probabile",
    color:     "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    icon:      "~",
  },
  to_verify: {
    label:     "Da verificare",
    color:     "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    icon:      "%",
  },
  no_evidence: {
    label:     "Senza evidenza",
    color:     "bg-zinc-100 dark:bg-zinc-800",
    textColor: "text-zinc-500 dark:text-zinc-400",
    icon:      "?",
  },
  missing: {
    label:     "Mancante",
    color:     "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    icon:      "✗",
  },
  blocked: {
    label:     "Bloccato",
    color:     "bg-red-200 dark:bg-red-900/40",
    textColor: "text-red-800 dark:text-red-300",
    icon:      "⊘",
  },
  outside_inca: {
    label:     "Fuori INCA",
    color:     "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-400",
    icon:      "∅",
  },
} as const;

export const AZIONI_RACCOMANDATE_IT: Record<string, string> = {
  outside_inca:      "Verificare il codice INCA prima di procedere sul terreno",
  blocked:           "Risolvere il blocco aperto prima della chiusura",
  short_issue:       "Controllare lunghezza e avviare correzione cavo corto",
  missing_issue:     "Localizzare cavo mancante e confermare su Telegram/WhatsApp",
  partial_progress:  "Richiedere percentuale finale ed evidenza di posa",
  no_evidence:       "Richiedere conferma Telegram/WhatsApp con foto o messaggio chiaro",
  to_verify:         "Validare il completamento prima della chiusura lista",
  default:           "Archiviare come utilizzabile in Cable Story",
};

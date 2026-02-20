// src/data/coreEvolution.js
/**
 * CORE Evolution (static, repo-managed)
 * - CORE 1.0: bloccato (solo fix / security / perf / polish UI).
 * - CORE 1.1: avviato (in corso).
 * - 1.2 → 1.6: roadmap PERCORSO + AI-LAYER progressiva.
 */

export const CORE_CURRENT_VERSION = "CORE 1.0.0";

/**
 * Status keys:
 * - FROZEN
 * - IN_PROGRESS
 * - PLANNED
 * - TO_FRAME
 *
 * Impact:
 * - LOW | MEDIUM | CRITICAL
 *
 * Type:
 * - FIX | FEATURE | UX | PERF | SECURITY | DB
 */

export const STATUS_I18N = {
  FROZEN: { it: "BLOCCATO", fr: "GELÉ", en: "FROZEN" },
  IN_PROGRESS: { it: "IN CORSO", fr: "EN COURS", en: "IN PROGRESS" },
  PLANNED: { it: "PIANIFICATO", fr: "PLANIFIÉ", en: "PLANNED" },
  TO_FRAME: { it: "DA DEFINIRE", fr: "À CADRER", en: "TO FRAME" },
};

export const CORE_VERSIONS = [
  {
    key: "CORE 1.0",
    status: "FROZEN",
    tone: "emerald",
    label: {
      it: "CORE 1.0 (bloccato)",
      fr: "CORE 1.0 (gelé)",
      en: "CORE 1.0 (frozen)",
    },
    summary: {
      it: [
        "Obiettivo: stabilità, demo, adozione sul campo.",
        "Regola: nessuna nuova feature — solo FIX / SECURITY / PERF / piccoli polish UI.",
      ],
      fr: [
        "Objectif : stabilité, démo, adoption terrain.",
        "Règle : aucune nouvelle feature — uniquement FIX / SECURITY / PERF / petits polish UI.",
      ],
      en: [
        "Goal: stability, demo readiness, field adoption.",
        "Rule: no new features — only FIX / SECURITY / PERF / minor UI polish.",
      ],
    },
  },
  {
    key: "CORE 1.1",
    status: "IN_PROGRESS",
    tone: "amber",
    label: {
      it: "CORE 1.1 (avviato)",
      fr: "CORE 1.1 (démarré)",
      en: "CORE 1.1 (started)",
    },
    summary: {
      it: [
        "Obiettivo: industrializzazione e potenziamento dei moduli Ufficio/Direzione.",
        "Regola: scope aperto ma prioritizzato — niente aggiunte fuori quadro.",
      ],
      fr: [
        "Objectif : industrialisation et montée en puissance des modules Ufficio/Direzione.",
        "Règle : scope ouvert mais priorisé — pas d’ajouts non cadrés.",
      ],
      en: [
        "Goal: industrialization and scaling of Ufficio/Direzione modules.",
        "Rule: scope is open but prioritized — no uncadenced additions.",
      ],
    },
  },
  {
    key: "CORE 1.2",
    status: "PLANNED",
    tone: "sky",
    label: {
      it: "CORE 1.2 (brique Percorso)",
      fr: "CORE 1.2 (brique Percorso)",
      en: "CORE 1.2 (Percorso brick)",
    },
    summary: {
      it: [
        "Obiettivo: integrare una prima brique PERCORSO nel CNCS.",
        "Regola: brique isolata, valore immediato, zero complessità AI.",
      ],
      fr: [
        "Objectif : intégrer une première brique PERCORSO dans le CNCS.",
        "Règle : brique isolée, valeur immédiate, pas de complexité AI.",
      ],
      en: [
        "Goal: integrate a first PERCORSO brick into CNCS.",
        "Rule: isolated brick, immediate value, no AI complexity.",
      ],
    },
  },
  {
    key: "CORE 1.3",
    status: "PLANNED",
    tone: "violet",
    label: {
      it: "CORE 1.3 (AI semplice)",
      fr: "CORE 1.3 (AI simple)",
      en: "CORE 1.3 (simple AI)",
    },
    summary: {
      it: [
        "Obiettivo: AI assistiva semplice (regole + suggerimenti base).",
        "Regola: nessuna azione distruttiva — solo raccomandazioni.",
      ],
      fr: [
        "Objectif : AI simple et assistive (règles + recommandations basiques).",
        "Règle : aucune action destructive, suggestions seulement.",
      ],
      en: [
        "Goal: simple assistive AI (rules + basic suggestions).",
        "Rule: no destructive actions — recommendations only.",
      ],
    },
  },
  {
    key: "CORE 1.4",
    status: "TO_FRAME",
    tone: "rose",
    label: {
      it: "CORE 1.4 (AI-LAYER)",
      fr: "CORE 1.4 (AI-LAYER)",
      en: "CORE 1.4 (AI-LAYER)",
    },
    summary: {
      it: [
        "Obiettivo: impostare AI-LAYER a triplo blocco (governance + sicurezza).",
        "Regola: prima architettura e audit, poi capacità.",
      ],
      fr: [
        "Objectif : mise en place AI-LAYER triple verrou (gouvernance + sécurité).",
        "Règle : architecture d’abord, capacités ensuite.",
      ],
      en: [
        "Goal: set up triple-locked AI-LAYER (governance + security).",
        "Rule: architecture & audit first, capabilities second.",
      ],
    },
  },
  {
    key: "CORE 1.5",
    status: "TO_FRAME",
    tone: "slate",
    label: {
      it: "CORE 1.5 (Percorso pronto)",
      fr: "CORE 1.5 (Percorso ready)",
      en: "CORE 1.5 (Percorso ready)",
    },
    summary: {
      it: [
        "Obiettivo: PERCORSO pronto produzione (UX robusta, affidabilità cantiere).",
        "Regola: qualità e conformità prima di tutto.",
      ],
      fr: [
        "Objectif : PERCORSO prêt production (UX robuste, fiabilité chantier).",
        "Règle : fiabilité et conformité avant tout.",
      ],
      en: [
        "Goal: production-ready PERCORSO (robust UX, yard reliability).",
        "Rule: reliability and compliance first.",
      ],
    },
  },
  {
    key: "CORE 1.6",
    status: "TO_FRAME",
    tone: "slate",
    label: {
      it: "CORE 1.6 (Percorso + AI-LAYER)",
      fr: "CORE 1.6 (Percorso + AI-LAYER)",
      en: "CORE 1.6 (Percorso + AI-LAYER)",
    },
    summary: {
      it: [
        "Obiettivo: PERCORSO potenziato da AI-LAYER (assistenti, controlli, prevenzione errori).",
        "Regola: zero tentativi alla cieca, audit totale, guard-rails rigidi.",
      ],
      fr: [
        "Objectif : PERCORSO boosté AI-LAYER (assistants, contrôles, prévention erreurs).",
        "Règle : zéro tâtonnement, audit total, garde-fous stricts.",
      ],
      en: [
        "Goal: PERCORSO enhanced by AI-LAYER (assistants, controls, error prevention).",
        "Rule: no blind attempts, full audit, strict guardrails.",
      ],
    },
  },
];

export const CORE_CHANGELOG = [
  {
    id: "2025-12-21-freeze-1.0",
    date: "2025-12-21",
    version: "CORE 1.0",
    type: "SECURITY",
    module: "Core",
    impact: "CRITICAL",
    title: {
      it: "Blocco funzionale CORE 1.0",
      fr: "Gel fonctionnel CORE 1.0",
      en: "CORE 1.0 functional freeze",
    },
    details: {
      it: [
        "Freeze scope: solo correttivi bloccanti, sicurezza/RLS, performance, piccoli polish UI.",
        "Tutte le nuove feature passano in CORE 1.1+ (backlog).",
      ],
      fr: [
        "Freeze scope : uniquement correctifs bloquants, sécurité/RLS, performance, petits polish UI.",
        "Tout le reste bascule en CORE 1.1+ (backlog).",
      ],
      en: [
        "Freeze scope: only blocking fixes, security/RLS, performance, minor UI polish.",
        "All new features move to CORE 1.1+ (backlog).",
      ],
    },
  },
  {
    id: "2025-12-21-inca-cockpits-parity",
    date: "2025-12-21",
    version: "CORE 1.0",
    type: "UX",
    module: "INCA",
    impact: "MEDIUM",
    title: {
      it: "Cockpit CAPO & UFFICIO allineati",
      fr: "Cockpits CAPO & UFFICIO alignés",
      en: "CAPO & UFFICIO cockpits aligned",
    },
    details: {
      it: [
        "Stessa struttura, stessi filtri, stesse metriche visibili.",
        "Caricamento a batch via .range() (nessun limite 1000).",
        "DA/A colorato secondo ratio P (verde=100%P, giallo=misto, rosso=0P).",
        "Codice cavo in pill (leggibilità in campo).",
      ],
      fr: [
        "Même structure, mêmes filtres, mêmes métriques visibles.",
        "Chargement batched via .range() (pas de plafond 1000).",
        "DA/A coloré selon ratio P (vert=100%P, jaune=mix, rouge=0P).",
        "Codice câble affiché en pill (lecture terrain).",
      ],
      en: [
        "Same structure, same filters, same visible metrics.",
        "Batched loading via .range() (no 1000 cap).",
        "DA/A colored by P ratio (green=100%P, yellow=mix, red=0P).",
        "Cable code displayed as a pill (field readability).",
      ],
    },
  },
  {
    id: "2025-12-21-inca-import-xlsx-only",
    date: "2025-12-21",
    version: "CORE 1.0",
    type: "DB",
    module: "Import INCA",
    impact: "CRITICAL",
    title: {
      it: "Import INCA XLSX: parsing solo server",
      fr: "Import INCA XLSX : parsing serveur uniquement",
      en: "INCA XLSX import: server-side parsing only",
    },
    details: {
      it: [
        "Parsing XLSX lato Edge Function, nessuna lettura XLSX lato front.",
        "Il cockpit legge solo la tabella inca_cavi.",
        "situazione NULL => NP.",
      ],
      fr: [
        "Parsing XLSX côté Edge Function, aucune lecture XLSX côté front.",
        "Cockpit lit uniquement la table inca_cavi.",
        "situazione NULL => NP.",
      ],
      en: [
        "XLSX parsing in Edge Function, no XLSX parsing on the front-end.",
        "Cockpit reads only the inca_cavi table.",
        "situazione NULL => NP.",
      ],
    },
  },
  {
    id: "2025-12-21-1.1-started",
    date: "2025-12-21",
    version: "CORE 1.1",
    type: "FEATURE",
    module: "Roadmap",
    impact: "MEDIUM",
    title: {
      it: "CORE 1.1 avviato (scope prioritizzato)",
      fr: "CORE 1.1 démarré (scope priorisé)",
      en: "CORE 1.1 started (prioritized scope)",
    },
    details: {
      it: [
        "Industrializzazione shell CNCS e coerenza UX inter-moduli.",
        "Migliorie Ufficio/Direzione prioritarie (senza toccare CORE 1.0).",
      ],
      fr: [
        "Industrialisation shell CNCS et cohérence UX inter-modules.",
        "Améliorations Ufficio/Direzione priorisées (sans casser CORE 1.0).",
      ],
      en: [
        "CNCS shell industrialization and cross-module UX consistency.",
        "Prioritized Ufficio/Direzione improvements (without touching CORE 1.0).",
      ],
    },
  },
];

type CoreVersion = (typeof CORE_VERSIONS)[number];
type CoreChangelogEntry = (typeof CORE_CHANGELOG)[number];

export function getVersionByKey(key: string): CoreVersion | null {
  return CORE_VERSIONS.find((v) => v.key === key) || null;
}

export function getEntriesForVersion(versionKey: string): CoreChangelogEntry[] {
  return CORE_CHANGELOG
    .filter((e) => e.version === versionKey)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function statusText(statusKey: string, lang: string): string {
  const m = (STATUS_I18N as Record<string, Record<string, string> | undefined>)[statusKey] || null;
  if (!m) return String(statusKey || "");
  return m[lang] || m.it || String(statusKey || "");
}

export function pickLang(obj: unknown, lang: string, fallbackLang = "it"): unknown {
  if (!obj || typeof obj !== "object") return "";
  const rec = obj as Record<string, unknown>;
  return rec[lang] || rec[fallbackLang] || "";
}

export function pickLangArray(obj: unknown, lang: string, fallbackLang = "it"): unknown[] {
  const v = pickLang(obj, lang, fallbackLang);
  return Array.isArray(v) ? v : [];
}

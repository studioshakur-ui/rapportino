import type { NavemasterNormalizedRow } from "./navemaster.types";

export type NavemasterLegendSeverity = "neutral" | "info" | "warn" | "danger";

export interface NavemasterLegendEntry {
  code: string;
  label: string;
  meaning: string;
  severity: NavemasterLegendSeverity;
}

export interface NavemasterLegendGroup {
  key: "srtp" | "situazione" | "statoTec" | "statoSta";
  title: string;
  subtitle: string;
  entries: NavemasterLegendEntry[];
}

export interface NavemasterLegendSignal {
  score: number;
  reasons: string[];
  tags: string[];
}

const NAVEMASTER_LEGEND_GROUPS: NavemasterLegendGroup[] = [
  {
    key: "srtp",
    title: "SAFE RETURN TO PORT",
    subtitle: "Référence sécurité / compatibilité SRTP.",
    entries: [
      { code: "FR", label: "Fire Resistant", meaning: "Cavo fire resistant", severity: "info" },
      { code: "SC", label: "Self Contained", meaning: "Câble autoporté", severity: "info" },
      { code: "RL", label: "Routing Inspection", meaning: "Contrôle de routage", severity: "info" },
      { code: "SL", label: "Lighting", meaning: "Self contained lighting", severity: "info" },
      { code: "SH", label: "HVAC", meaning: "Self contained HVAC", severity: "info" },
      { code: "NO", label: "Non SRTP", meaning: "Cavo non SRTP", severity: "warn" },
    ],
  },
  {
    key: "situazione",
    title: "Situazione cavo",
    subtitle: "État fonctionnel du câble dans le chantier.",
    entries: [
      { code: "$", label: "Functional change", meaning: "Modifica di tipo funzionale", severity: "warn" },
      { code: "K", label: "Metric variation", meaning: "Variazione metratura dovuta a modifica funzionale", severity: "warn" },
      { code: "!", label: "Zero-length routing", meaning: "Presente in instradamento con lunghezza 0", severity: "danger" },
      { code: "A", label: "Added", meaning: "Cavo aggiunto", severity: "info" },
      { code: "C", label: "Not treated in STA", meaning: "Cavo non trattato in STA", severity: "warn" },
      { code: "E", label: "Removed", meaning: "Cavo eliminato a livello funzionale", severity: "warn" },
      { code: "M", label: "Modified", meaning: "Cavo modificato, ex. T VU 0*1 → T VU 001", severity: "warn" },
      { code: "Z", label: "Starred", meaning: "Cavo asteriscato", severity: "info" },
    ],
  },
  {
    key: "statoTec",
    title: "Stato Tec",
    subtitle: "Statut technique de routage.",
    entries: [
      { code: "null", label: "Not treated", meaning: "non trattato", severity: "neutral" },
      { code: "I", label: "Incomplete", meaning: "Incompleto", severity: "warn" },
      { code: "V", label: "Local routing", meaning: "Instradamento Locale", severity: "info" },
      { code: "C", label: "Contains undefined", meaning: "Instradamento con tratte indefinite", severity: "warn" },
      { code: "M", label: "Routed", meaning: "Instradato", severity: "info" },
    ],
  },
  {
    key: "statoSta",
    title: "Stato Sta",
    subtitle: "Statut de pose / coupure / blocage.",
    entries: [
      { code: "null", label: "Not treated", meaning: "non trattato", severity: "neutral" },
      { code: "M", label: "Measured", meaning: "Misurato", severity: "info" },
      { code: "T", label: "Cut", meaning: "Tagliato", severity: "warn" },
      { code: "P", label: "Installed", meaning: "Posa", severity: "info" },
      { code: "C", label: "Connected", meaning: "Collegato a bordo in partenza/arrivo/entrambi", severity: "info" },
      { code: "1", label: "Connected 1", meaning: "Collegato a bordo in partenza/arrivo/entrambi", severity: "info" },
      { code: "2", label: "Connected 2", meaning: "Collegato a bordo in partenza/arrivo/entrambi", severity: "info" },
      { code: "B", label: "Blocked", meaning: "Bloccato", severity: "danger" },
    ],
  },
];

function normalizeCode(value: unknown): string {
  return String(value ?? "null").trim().toUpperCase() || "NULL";
}

function readPayloadCode(row: NavemasterNormalizedRow, key: string): string {
  const payloadValue = row.payload[key];
  return normalizeCode(payloadValue);
}

export function getNavemasterLegendGroups(): NavemasterLegendGroup[] {
  return NAVEMASTER_LEGEND_GROUPS;
}

export function getNavemasterLegendGroup(key: NavemasterLegendGroup["key"]): NavemasterLegendGroup {
  const group = NAVEMASTER_LEGEND_GROUPS.find((item) => item.key === key);
  if (!group) throw new Error(`Unknown Navemaster legend group: ${key}`);
  return group;
}

export function findNavemasterLegendEntry(groupKey: NavemasterLegendGroup["key"], code: unknown): NavemasterLegendEntry | null {
  const normalized = normalizeCode(code);
  const group = getNavemasterLegendGroup(groupKey);
  return group.entries.find((entry) => entry.code === normalized || (normalized === "NULL" && entry.code === "null")) ?? null;
}

export function summarizeNavemasterLegendSignals(row: NavemasterNormalizedRow): NavemasterLegendSignal {
  const reasons: string[] = [];
  const tags: string[] = [];
  let score = 0;

  const situazione = readPayloadCode(row, "SITUAZIONE CAVO");
  const statoTec = readPayloadCode(row, "stato_tec");
  const statoSta = readPayloadCode(row, "stato_sta");
  const srtp = readPayloadCode(row, "srtp");

  if (srtp === "NO") {
    score += 8;
    reasons.push("hors SRTP");
    tags.push("srtp-no");
  }

  if (situazione === "!") {
    score += 45;
    reasons.push("longueur 0 en instradamento");
    tags.push("situazione-zero");
  } else if (situazione === "C") {
    score += 18;
    reasons.push("non traité in STA");
    tags.push("situazione-sta");
  } else if (situazione === "E") {
    score += 20;
    reasons.push("câble éliminé fonctionnellement");
    tags.push("situazione-elimined");
  } else if (situazione === "K" || situazione === "$" || situazione === "M") {
    score += 12;
    reasons.push("variation ou modification métier");
    tags.push("situazione-change");
  }

  if (statoTec === "I") {
    score += 12;
    reasons.push("état technique incomplet");
    tags.push("tec-incomplete");
  } else if (statoTec === "C") {
    score += 10;
    reasons.push("instradamento avec traites indéfinies");
    tags.push("tec-indefinite");
  }

  if (statoSta === "B") {
    score += 35;
    reasons.push("câble bloqué");
    tags.push("sta-blocked");
  } else if (statoSta === "T") {
    score += 12;
    reasons.push("câble tagliato");
    tags.push("sta-cut");
  } else if (statoSta === "P") {
    score += 8;
    reasons.push("câble en posa");
    tags.push("sta-installed");
  }

  const exMarcaCavo = String(row.ex_marca_cavo ?? "").trim();
  if (exMarcaCavo) {
    const normalizedPrevious = exMarcaCavo.replace(/\s+/g, "").replace(/\*/g, "").toUpperCase();
    const normalizedCurrent = row.marcacavo.replace(/\s+/g, "").replace(/\*/g, "").toUpperCase();
    if (normalizedPrevious && normalizedPrevious !== normalizedCurrent) {
      score += 14;
      reasons.push(`ancien code ${exMarcaCavo} vers ${row.marcacavo}`);
      tags.push("modified-code");
    }
  }

  return { score, reasons, tags };
}

export function getNavemasterLegendTone(severity: NavemasterLegendSeverity): "neutral" | "emerald" | "amber" | "red" {
  if (severity === "danger") return "red";
  if (severity === "warn") return "amber";
  if (severity === "info") return "emerald";
  return "neutral";
}

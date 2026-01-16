// src/data/Evoluzione.tsx
import React, { useEffect, useMemo, useState } from "react";

import {
  CORE_CURRENT_VERSION,
  CORE_VERSIONS,
  getEntriesForVersion,
  statusText,
  pickLang,
  pickLangArray,
} from "../data/coreEvolution";

import {
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  getStoredLang,
  storeLang,
  t as tUI,
} from "../data/i18nEvoluzione";

/* =========================
   Theme helper (read localStorage)
   ========================= */
function getTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  try {
    const t = window.localStorage.getItem("core-theme");
    if (t === "dark" || t === "light") return t;
  } catch {}
  return "dark";
}

/* =========================
   UI utils
   ========================= */
function pillTone(tone: string, isDark: boolean): string {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]";
  const map: Record<string, string> = {
    emerald: isDark
      ? "border-emerald-500/40 bg-emerald-950/25 text-emerald-200"
      : "border-emerald-300 bg-emerald-50 text-emerald-800",
    amber: isDark
      ? "border-amber-500/35 bg-amber-950/20 text-amber-200"
      : "border-amber-300 bg-amber-50 text-amber-800",
    sky: isDark
      ? "border-sky-500/35 bg-sky-950/20 text-sky-200"
      : "border-sky-300 bg-sky-50 text-sky-800",
    violet: isDark
      ? "border-violet-500/35 bg-violet-950/20 text-violet-200"
      : "border-violet-300 bg-violet-50 text-violet-800",
    rose: isDark
      ? "border-rose-500/35 bg-rose-950/20 text-rose-200"
      : "border-rose-300 bg-rose-50 text-rose-800",
    slate: isDark
      ? "border-slate-800 bg-slate-950/25 text-slate-300"
      : "border-slate-200 bg-white text-slate-700",
  };
  return [base, map[tone] || map.slate].join(" ");
}

function typePill(type: unknown, isDark: boolean): string {
  const t = String(type || "").toUpperCase();
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]";
  const styles: Record<string, string> = {
    FIX: isDark
      ? "border-sky-500/35 bg-sky-950/25 text-sky-200"
      : "border-sky-300 bg-sky-50 text-sky-800",
    FEATURE: isDark
      ? "border-emerald-500/35 bg-emerald-950/25 text-emerald-200"
      : "border-emerald-300 bg-emerald-50 text-emerald-800",
    UX: isDark
      ? "border-violet-500/35 bg-violet-950/20 text-violet-200"
      : "border-violet-300 bg-violet-50 text-violet-800",
    PERF: isDark
      ? "border-amber-500/35 bg-amber-950/20 text-amber-200"
      : "border-amber-300 bg-amber-50 text-amber-800",
    SECURITY: isDark
      ? "border-rose-500/35 bg-rose-950/20 text-rose-200"
      : "border-rose-300 bg-rose-50 text-rose-800",
    DB: isDark
      ? "border-slate-700 bg-slate-950/35 text-slate-200"
      : "border-slate-300 bg-slate-50 text-slate-800",
    DOC: isDark
      ? "border-slate-700 bg-slate-950/35 text-slate-200"
      : "border-slate-300 bg-slate-50 text-slate-800",
  };
  return [base, styles[t] || styles.DB].join(" ");
}

function impactDot(impact: unknown): string {
  const i = String(impact || "").toUpperCase();
  if (i === "CRITICAL") return "bg-rose-400";
  if (i === "MEDIUM") return "bg-amber-400";
  return "bg-emerald-400";
}

function langButtonClass(on: boolean, isDark: boolean): string {
  const base =
    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition";
  if (on) {
    return isDark
      ? `${base} border-sky-500/60 bg-sky-950/20 text-sky-200 shadow-[0_10px_30px_rgba(56,189,248,0.14)]`
      : `${base} border-sky-300 bg-sky-50 text-sky-800`;
  }
  return isDark
    ? `${base} border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35`
    : `${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
}

/* =========================
   Mini charts (SVG sparklines)
   ========================= */
function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function sparkPath(values: number[], w: number, h: number, pad = 4): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  return values
    .map((v, idx) => {
      const x = pad + (innerW * idx) / (values.length - 1 || 1);
      const t = (v - min) / range;
      const y = pad + innerH * (1 - t);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function areaPath(values: number[], w: number, h: number, pad = 4): string {
  const line = sparkPath(values, w, h, pad);
  if (!line) return "";
  const lastX = w - pad;
  const baseY = h - pad;
  return `${line} L ${lastX.toFixed(2)} ${baseY.toFixed(2)} L ${pad.toFixed(
    2
  )} ${baseY.toFixed(2)} Z`;
}

type MiniSparklineProps = {
  title: string;
  subtitle: string;
  values: number[];
  isDark: boolean;
  valueLabel?: string;
};

function MiniSparkline({
  title,
  subtitle,
  values,
  isDark,
  valueLabel,
}: MiniSparklineProps): JSX.Element {
  const w = 168;
  const h = 52;

  // Visual normalize for ratio labels
  const last = values.length ? values[values.length - 1] : 0;
  const lastFmt = Number.isFinite(last) ? last.toFixed(2) : "—";

  const card = isDark
    ? "rounded-2xl border border-slate-800 bg-slate-950/25 p-3"
    : "rounded-2xl border border-slate-200 bg-white p-3";

  const titleCls = isDark ? "text-[11px] text-slate-300" : "text-[11px] text-slate-700";
  const subCls = isDark ? "text-[10px] text-slate-500" : "text-[10px] text-slate-500";

  const svgBg = isDark ? "bg-slate-950/30" : "bg-slate-50";
  const grid = isDark ? "stroke-slate-800" : "stroke-slate-200";
  const line = isDark ? "stroke-sky-300/90" : "stroke-sky-700/80";
  const fill = isDark ? "fill-sky-400/10" : "fill-sky-600/10";

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={titleCls}>{title}</div>
          <div className={subCls}>{subtitle}</div>
        </div>
        <div
          className={
            isDark
              ? "shrink-0 text-[11px] font-semibold text-slate-200"
              : "shrink-0 text-[11px] font-semibold text-slate-900"
          }
          title={valueLabel || "Last value"}
        >
          {valueLabel ? `${valueLabel} ` : ""}
          <span className="font-mono">{lastFmt}</span>
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-transparent">
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className={["w-full rounded-xl", svgBg].join(" ")}
          role="img"
          aria-label={`${title} sparkline`}
        >
          {/* grid */}
          <line x1="0" y1={h - 1} x2={w} y2={h - 1} className={grid} strokeWidth="1" />
          <line x1="0" y1={Math.round(h / 2)} x2={w} y2={Math.round(h / 2)} className={grid} strokeWidth="1" />
          {/* area */}
          <path d={areaPath(values, w, h, 5)} className={fill} />
          {/* line */}
          <path d={sparkPath(values, w, h, 5)} className={line} fill="none" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

/* =========================
   KPI Documentation (IT/FR/EN)
   ========================= */
type LangCode = "it" | "fr" | "en";

type KpiDocContent = {
  kicker: string;
  title: string;
  subtitle: React.ReactNode;
  badges: string[];
  sections: Array<{
    title: string;
    body: React.ReactNode;
  }>;
  formulaTitle: string;
  formulaRows: Array<{
    label: string;
    formula: string;
    note: React.ReactNode;
  }>;
  exampleTitle: string;
  exampleBody: React.ReactNode;
  rulesTitle: string;
  rules: React.ReactNode;
  curvesTitle: string;
  curvesSubtitle: React.ReactNode;
};

function kpiDoc(lang: LangCode, isDark: boolean): KpiDocContent {
  const em = (children: React.ReactNode) => (
    <em className={isDark ? "italic text-slate-200" : "italic text-slate-800"}>{children}</em>
  );

  const mono = (s: string) => (
    <span
      className={
        isDark
          ? "font-mono text-[12px] text-slate-200"
          : "font-mono text-[12px] text-slate-800"
      }
    >
      {s}
    </span>
  );

  const commonBadges = [
    "Audit-defensible",
    "Previsto (frozen)",
    "Tempo-weighted allocation",
    "Ratio-of-sums",
  ];

  if (lang === "fr") {
    return {
      kicker: "Documentation KPI",
      title: "Indice de productivité — Méthode de calcul canonique",
      subtitle: (
        <>
          Cette section décrit la méthode CORE de calcul de l’indice de productivité{" "}
          {em("de manière traçable et défendable en audit")}. L’objectif est d’obtenir un
          indicateur stable, comparables entre jours, équipes et activités, sans biais de
          répartition.
        </>
      ),
      badges: commonBadges,
      sections: [
        {
          title: "1) Intention et définition",
          body: (
            <div className="space-y-2">
              <div>
                L’indice mesure une productivité {em("quantitative")} comme un ratio :
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/20 p-3">
                <div className={isDark ? "text-slate-200" : "text-slate-800"}>
                  {mono("Indice = Réalisé / Attendu")}
                </div>
                <div className={isDark ? "mt-1 text-[12px] text-slate-400" : "mt-1 text-[12px] text-slate-600"}>
                  1.00 = conforme au prévu ; &gt; 1.00 = au-dessus ; &lt; 1.00 = en dessous.
                </div>
              </div>
            </div>
          ),
        },
        {
          title: "2) Sources de données (Rapportino)",
          body: (
            <div className="space-y-2">
              <div>
                Les KPI dérivent des lignes Rapportino et de la répartition du temps opérateur.
                Point clé : {em("previsto est figé sur la ligne au moment de la saisie")}.
              </div>
              <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
                <li>• Entête : date / ship / costr / commessa / status</li>
                <li>• Ligne : activité, unité (MT/PZ), previsto, prodotto</li>
                <li>• Détail : opérateurs + {mono("tempo_hours")} par opérateur</li>
              </ul>
            </div>
          ),
        },
        {
          title: "3) Répartition canonique du réalisé",
          body: (
            <div className="space-y-2">
              <div>
                Une ligne peut avoir plusieurs opérateurs. La production saisie est répartie
                {em("au prorata du temps")} pour éviter d’attribuer 100% à chacun.
              </div>
              <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
                {mono("prodotto_alloc(op) = prodotto_ligne × (tempo_hours(op) / Σ tempo_hours_ligne)")}
              </div>
            </div>
          ),
        },
        {
          title: "4) Attendu (previsto) mis à l’échelle sur le temps",
          body: (
            <div className="space-y-2">
              <div>
                {mono("previsto")} correspond à un objectif standard sur une journée de référence
                (8h). On calcule l’attendu effectif par opérateur :
              </div>
              <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
                {mono("previsto_eff(op) = previsto_ligne × (tempo_hours(op) / 8)")}
              </div>
            </div>
          ),
        },
        {
          title: "5) Agrégation (ratio des sommes, pas moyenne naïve)",
          body: (
            <div className="space-y-2">
              <div>
                L’indice jour/opérateur (ou jour/famille) est calculé comme un ratio des sommes :
              </div>
              <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
                {mono("Indice = (Σ prodotto_alloc) / (Σ previsto_eff)")}
              </div>
              <div className={isDark ? "text-[12px] text-slate-400" : "text-[12px] text-slate-600"}>
                Cette règle assure une pondération correcte quand volumes et temps diffèrent.
              </div>
            </div>
          ),
        },
      ],
      formulaTitle: "Formules récapitulatives (canon)",
      formulaRows: [
        {
          label: "Réalisé (allocation)",
          formula: "prodotto_alloc(op) = prodotto × (tempo_hours(op) / Σ tempo_hours_ligne)",
          note: <>Répartition temps-pondérée. Évite le double comptage.</>,
        },
        {
          label: "Attendu (time-scaled)",
          formula: "previsto_eff(op) = previsto × (tempo_hours(op) / 8)",
          note: <>8h = 100% ; 4h = 50% ; 2h = 25%.</>,
        },
        {
          label: "Indice ligne",
          formula: "indice_line(op) = prodotto_alloc(op) / previsto_eff(op)",
          note: <>Calculé uniquement si prévu &gt; 0 et temps &gt; 0.</>,
        },
        {
          label: "Indice agrégé",
          formula: "indice = (Σ prodotto_alloc) / (Σ previsto_eff)",
          note: <>Ratio des sommes (pas une moyenne simple des indices).</>,
        },
      ],
      exampleTitle: "Exemple chiffré (stable et “juste”)",
      exampleBody: (
        <div className="space-y-2">
          <div>
            Ligne : <strong>STESURA</strong> ; {mono("previsto = 160")} (sur 8h) ;{" "}
            {mono("prodotto = 120")} ; opérateur A 6h, opérateur B 2h.
          </div>
          <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
            {mono("Heures_ligne = 8h")}
          </div>
          <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
            <li>
              • Réalisé : A = 120 × 6/8 = 90 ; B = 120 × 2/8 = 30
            </li>
            <li>
              • Attendu : A = 160 × 6/8 = 120 ; B = 160 × 2/8 = 40
            </li>
            <li>
              • Indice : A = 90/120 = 0.75 ; B = 30/40 = 0.75
            </li>
          </ul>
          <div className={isDark ? "text-[12px] text-slate-400" : "text-[12px] text-slate-600"}>
            Résultat : la ligne est à <strong>0.75</strong>, cohérent et stable quelle que soit la
            composition de l’équipe.
          </div>
        </div>
      ),
      rulesTitle: "Règles d’inclusion / exclusion (KPI)",
      rules: (
        <div className="space-y-2">
          <div>
            L’indice est {em("strictement quantitatif")}. Les faits “heures” restent dans un KPI séparé.
          </div>
          <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
            <li>• Inclus : unités MT / PZ, temps &gt; 0, previsto &gt; 0, produit renseigné.</li>
            <li>• Exclu : activités non quantitatives, administratif, réunions, HSE, etc.</li>
            <li>• Sécurité : aucune division si previsto ≤ 0 ; aucune approximation.</li>
            <li>• Traçabilité : previsto figé sur la ligne au moment de la saisie.</li>
          </ul>
        </div>
      ),
      curvesTitle: "Illustrations (courbes miniatures)",
      curvesSubtitle: (
        <>
          Courbes <em>illustratives</em> (non issues de la DB) montrant l’évolution typique : heures,
          production, puis indice (ratio). L’objectif est pédagogique : comprendre le comportement
          du ratio quand le réalisé ou le temps change.
        </>
      ),
    };
  }

  if (lang === "en") {
    return {
      kicker: "KPI Documentation",
      title: "Productivity Index — Canonical calculation method",
      subtitle: (
        <>
          This section explains how CORE computes the Productivity Index in an{" "}
          {em("audit-defensible and traceable")} way. The goal is a stable indicator, comparable
          across days/teams/activities, without allocation bias.
        </>
      ),
      badges: commonBadges,
      sections: [
        {
          title: "1) Intent and definition",
          body: (
            <div className="space-y-2">
              <div>The index measures {em("quantitative")} productivity as a ratio:</div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/20 p-3">
                <div className={isDark ? "text-slate-200" : "text-slate-800"}>
                  {mono("Index = Actual / Expected")}
                </div>
                <div className={isDark ? "mt-1 text-[12px] text-slate-400" : "mt-1 text-[12px] text-slate-600"}>
                  1.00 = on target; &gt; 1.00 = above; &lt; 1.00 = below.
                </div>
              </div>
            </div>
          ),
        },
        {
          title: "2) Data sources (Rapportino)",
          body: (
            <div className="space-y-2">
              <div>
                KPI is derived from Rapportino rows and operator time split. Key point:{" "}
                {em("previsto is frozen on the row at input time")}.
              </div>
              <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
                <li>• Header: date / ship / costr / commessa / status</li>
                <li>• Row: activity, unit (MT/PZ), previsto, prodotto</li>
                <li>• Detail: operators + {mono("tempo_hours")} per operator</li>
              </ul>
            </div>
          ),
        },
        {
          title: "3) Canonical allocation of Actual",
          body: (
            <div className="space-y-2">
              <div>
                A single row can include multiple operators. Actual production is allocated{" "}
                {em("proportionally to time")} to avoid assigning 100% to each operator.
              </div>
              <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
                {mono("prodotto_alloc(op) = prodotto_row × (tempo_hours(op) / Σ tempo_hours_row)")}
              </div>
            </div>
          ),
        },
        {
          title: "4) Expected (previsto) time scaling",
          body: (
            <div className="space-y-2">
              <div>
                {mono("previsto")} is a standard target on a reference day (8h). Expected per operator:
              </div>
              <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
                {mono("previsto_eff(op) = previsto_row × (tempo_hours(op) / 8)")}
              </div>
            </div>
          ),
        },
        {
          title: "5) Aggregation (ratio-of-sums, not naive average)",
          body: (
            <div className="space-y-2">
              <div>Daily/operator (or daily/family) index uses ratio-of-sums:</div>
              <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
                {mono("Index = (Σ prodotto_alloc) / (Σ previsto_eff)")}
              </div>
              <div className={isDark ? "text-[12px] text-slate-400" : "text-[12px] text-slate-600"}>
                This ensures correct weighting when time/volume differ across rows.
              </div>
            </div>
          ),
        },
      ],
      formulaTitle: "Canonical formulas (summary)",
      formulaRows: [
        {
          label: "Actual (allocation)",
          formula: "prodotto_alloc(op) = prodotto × (tempo_hours(op) / Σ tempo_hours_row)",
          note: <>Time-weighted allocation. Prevents double counting.</>,
        },
        {
          label: "Expected (time-scaled)",
          formula: "previsto_eff(op) = previsto × (tempo_hours(op) / 8)",
          note: <>8h = 100%; 4h = 50%; 2h = 25%.</>,
        },
        {
          label: "Row index",
          formula: "indice_row(op) = prodotto_alloc(op) / previsto_eff(op)",
          note: <>Computed only if previsto &gt; 0 and time &gt; 0.</>,
        },
        {
          label: "Aggregated index",
          formula: "index = (Σ prodotto_alloc) / (Σ previsto_eff)",
          note: <>Ratio-of-sums (not a plain average of indices).</>,
        },
      ],
      exampleTitle: "Worked example (stable and fair)",
      exampleBody: (
        <div className="space-y-2">
          <div>
            Row: <strong>STESURA</strong>; {mono("previsto = 160")} (8h); {mono("prodotto = 120")};
            operator A 6h, operator B 2h.
          </div>
          <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
            {mono("Row_hours = 8h")}
          </div>
          <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
            <li>• Actual: A = 120 × 6/8 = 90; B = 120 × 2/8 = 30</li>
            <li>• Expected: A = 160 × 6/8 = 120; B = 160 × 2/8 = 40</li>
            <li>• Index: A = 90/120 = 0.75; B = 30/40 = 0.75</li>
          </ul>
          <div className={isDark ? "text-[12px] text-slate-400" : "text-[12px] text-slate-600"}>
            Result: the row index is <strong>0.75</strong>, stable regardless of team composition.
          </div>
        </div>
      ),
      rulesTitle: "Inclusion / exclusion rules (KPI)",
      rules: (
        <div className="space-y-2">
          <div>
            The index is {em("strictly quantitative")}. “Hours” are reported as a separate KPI.
          </div>
          <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
            <li>• Include: MT/PZ units, time &gt; 0, previsto &gt; 0, actual filled.</li>
            <li>• Exclude: non-quant activities, admin, meetings, HSE, etc.</li>
            <li>• Safety: no division if previsto ≤ 0; no approximations.</li>
            <li>• Traceability: previsto is frozen on row at input time.</li>
          </ul>
        </div>
      ),
      curvesTitle: "Illustrations (mini curves)",
      curvesSubtitle: (
        <>
          <em>Illustrative</em> curves (not DB-derived) showing typical evolution: hours, output,
          then the index (ratio). Pedagogical purpose: how the ratio behaves when actual/time changes.
        </>
      ),
    };
  }

  // it (default)
  return {
    kicker: "Documentazione KPI",
    title: "Indice di produttività — Metodo di calcolo canonico",
    subtitle: (
      <>
        Questa sezione descrive il calcolo dell’Indice di Produttività in CORE in modo{" "}
        {em("tracciabile e difendibile in audit")}. Obiettivo: un indicatore stabile e comparabile
        tra giorni, squadre e attività, senza bias di ripartizione.
      </>
    ),
    badges: commonBadges,
    sections: [
      {
        title: "1) Intento e definizione",
        body: (
          <div className="space-y-2">
            <div>L’indice misura la produttività {em("quantitativa")} come rapporto:</div>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-950/20 p-3">
              <div className={isDark ? "text-slate-200" : "text-slate-800"}>
                {mono("Indice = Realizzato / Atteso")}
              </div>
              <div className={isDark ? "mt-1 text-[12px] text-slate-400" : "mt-1 text-[12px] text-slate-600"}>
                1.00 = in linea; &gt; 1.00 = sopra; &lt; 1.00 = sotto.
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "2) Fonti dati (Rapportino)",
        body: (
          <div className="space-y-2">
            <div>
              I KPI derivano dalle righe del Rapportino e dalla ripartizione del tempo operatore.
              Punto chiave: {em("previsto è congelato sulla riga al momento della stesura")}.
            </div>
            <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
              <li>• Testata: data / ship / costr / commessa / status</li>
              <li>• Riga: attività, unità (MT/PZ), previsto, prodotto</li>
              <li>• Dettaglio: operatori + {mono("tempo_hours")} per operatore</li>
            </ul>
          </div>
        ),
      },
      {
        title: "3) Ripartizione canonica del realizzato",
        body: (
          <div className="space-y-2">
            <div>
              Una riga può avere più operatori. Il prodotto inserito viene ripartito{" "}
              {em("in proporzione al tempo")} per evitare che ciascuno “si prenda il 100%”.
            </div>
            <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
              {mono("prodotto_alloc(op) = prodotto_riga × (tempo_hours(op) / Σ tempo_hours_riga)")}
            </div>
          </div>
        ),
      },
      {
        title: "4) Atteso (previsto) scalato sul tempo",
        body: (
          <div className="space-y-2">
            <div>
              {mono("previsto")} è un target standard su una giornata di riferimento (8h).
              L’atteso effettivo per operatore è:
            </div>
            <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
              {mono("previsto_eff(op) = previsto_riga × (tempo_hours(op) / 8)")}
            </div>
          </div>
        ),
      },
      {
        title: "5) Aggregazione (rapporto delle somme)",
        body: (
          <div className="space-y-2">
            <div>
              L’indice giornaliero (o per famiglia) è calcolato come rapporto delle somme:
            </div>
            <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
              {mono("Indice = (Σ prodotto_alloc) / (Σ previsto_eff)")}
            </div>
            <div className={isDark ? "text-[12px] text-slate-400" : "text-[12px] text-slate-600"}>
              Questo garantisce pesi corretti quando tempi e volumi differiscono.
            </div>
          </div>
        ),
      },
    ],
    formulaTitle: "Formule riassuntive (canon)",
    formulaRows: [
      {
        label: "Realizzato (allocazione)",
        formula: "prodotto_alloc(op) = prodotto × (tempo_hours(op) / Σ tempo_hours_riga)",
        note: <>Allocazione time-weighted. Evita doppio conteggio.</>,
      },
      {
        label: "Atteso (time-scaled)",
        formula: "previsto_eff(op) = previsto × (tempo_hours(op) / 8)",
        note: <>8h = 100% ; 4h = 50% ; 2h = 25%.</>,
      },
      {
        label: "Indice riga",
        formula: "indice_riga(op) = prodotto_alloc(op) / previsto_eff(op)",
        note: <>Calcolato solo se previsto &gt; 0 e tempo &gt; 0.</>,
      },
      {
        label: "Indice aggregato",
        formula: "indice = (Σ prodotto_alloc) / (Σ previsto_eff)",
        note: <>Rapporto delle somme (non media semplice degli indici).</>,
      },
    ],
    exampleTitle: "Esempio numerico (stabile e “giusto”)",
    exampleBody: (
      <div className="space-y-2">
        <div>
          Riga: <strong>STESURA</strong>; {mono("previsto = 160")} (8h); {mono("prodotto = 120")};
          operatore A 6h, operatore B 2h.
        </div>
        <div className={isDark ? "text-[13px] text-slate-300" : "text-[13px] text-slate-700"}>
          {mono("Ore_riga = 8h")}
        </div>
        <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
          <li>• Realizzato: A = 120 × 6/8 = 90; B = 120 × 2/8 = 30</li>
          <li>• Atteso: A = 160 × 6/8 = 120; B = 160 × 2/8 = 40</li>
          <li>• Indice: A = 90/120 = 0.75; B = 30/40 = 0.75</li>
        </ul>
        <div className={isDark ? "text-[12px] text-slate-400" : "text-[12px] text-slate-600"}>
          Risultato: la riga è a <strong>0.75</strong>, coerente e stabile indipendentemente dagli operatori.
        </div>
      </div>
    ),
    rulesTitle: "Regole di inclusione / esclusione (KPI)",
    rules: (
      <div className="space-y-2">
        <div>
          L’indice è {em("strettamente quantitativo")}. Le ore lavoro sono un KPI separato (facts).
        </div>
        <ul className={isDark ? "text-[13px] text-slate-400 space-y-1" : "text-[13px] text-slate-600 space-y-1"}>
          <li>• Inclusi: unità MT / PZ, tempo &gt; 0, previsto &gt; 0, prodotto valorizzato.</li>
          <li>• Esclusi: attività non quantitative, amministrativo, riunioni, HSE, ecc.</li>
          <li>• Sicurezza: nessuna divisione se previsto ≤ 0; nessuna approssimazione.</li>
          <li>• Tracciabilità: previsto congelato sulla riga al momento della stesura.</li>
        </ul>
      </div>
    ),
    curvesTitle: "Illustrazioni (piccole curve)",
    curvesSubtitle: (
      <>
        Curve <em>illustrative</em> (non derivate dalla DB) che mostrano un andamento tipico:
        ore, prodotto, poi indice (rapporto). Scopo: capire il comportamento del ratio quando cambia
        il realizzato o il tempo.
      </>
    ),
  };
}

type EvolutionEntry = {
  id: string;
  date: string;
  version: string;
  type: string;
  module?: string;
  impact?: string;
  title?: Record<string, string>;
  details?: Record<string, string[]>;
};

export default function Evoluzione(): JSX.Element {
  const [theme, setTheme] = useState<"dark" | "light">(getTheme());
  const isDark = theme === "dark";

  // Language: IT default, persisted
  const [lang, setLang] = useState<LangCode>(() => (getStoredLang() as LangCode) || DEFAULT_LANG);
  const ui = useMemo(() => tUI(lang), [lang]);

  // Keep theme in sync if user toggles in shell
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = getTheme();
      setTheme((cur) => (cur === t ? cur : t));
    }, 600);
    return () => window.clearInterval(id);
  }, []);

  // Persist language
  useEffect(() => {
    storeLang(lang);
  }, [lang]);

  const [active, setActive] = useState<string>(CORE_VERSIONS[0]?.key || "CORE 1.0");

  const activeVersion = useMemo(() => {
    return CORE_VERSIONS.find((v: any) => v.key === active) || CORE_VERSIONS[0];
  }, [active]);

  const entries = useMemo(() => getEntriesForVersion(active) as EvolutionEntry[], [active]);

  const counts = useMemo(() => {
    const critical = entries.filter((e) => String(e.impact).toUpperCase() === "CRITICAL").length;
    const db = entries.filter((e) => String(e.type).toUpperCase() === "DB").length;
    return { entries: entries.length, critical, db };
  }, [entries]);

  const activeLabel = useMemo(() => {
    return pickLang(activeVersion?.label, lang) || active;
  }, [activeVersion, lang, active]);

  const activeStatusText = useMemo(() => {
    const k = activeVersion?.status || "";
    return statusText(k, lang);
  }, [activeVersion, lang]);

  const activeSummary = useMemo(() => {
    return pickLangArray(activeVersion?.summary, lang);
  }, [activeVersion, lang]);

  const doc = useMemo(() => kpiDoc(lang, isDark), [lang, isDark]);

  // illustrative curves (non DB)
  const curveHours = useMemo(() => [6.0, 6.5, 7.2, 7.8, 7.4, 8.0, 7.6], []);
  const curveOutput = useMemo(() => [0.68, 0.74, 0.81, 0.90, 0.86, 0.98, 0.92], []);
  const curveIndex = useMemo(() => [0.82, 0.88, 0.95, 1.02, 0.97, 1.08, 1.01], []);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
            {ui.pageKicker}
          </div>
          <div
            className={
              isDark
                ? "text-2xl font-semibold text-slate-50"
                : "text-2xl font-semibold text-slate-900"
            }
          >
            {ui.pageTitle}
          </div>
          <div
            className={
              isDark
                ? "text-[13px] text-slate-400 max-w-3xl leading-relaxed"
                : "text-[13px] text-slate-600 max-w-3xl leading-relaxed"
            }
          >
            {ui.pageSubtitle}
          </div>
          <div className={isDark ? "text-[12px] text-slate-500" : "text-[12px] text-slate-500"}>
            {ui.scopeFrozenRule}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Language switch */}
          <span className={pillTone("slate", isDark)}>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {ui.language}
          </span>

          <div className="flex items-center gap-2" aria-label={ui.language}>
            {SUPPORTED_LANGS.map((code: any) => (
              <button
                key={code}
                type="button"
                className={langButtonClass(lang === code, isDark)}
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                title={String(code).toUpperCase()}
              >
                {String(code).toUpperCase()}
              </button>
            ))}
          </div>

          {/* Current version */}
          <span className={pillTone("slate", isDark)}>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {ui.currentVersion}:&nbsp;
            <span className="font-semibold tracking-[0.18em]">{CORE_CURRENT_VERSION}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2" aria-label={ui.tabsAria}>
        {CORE_VERSIONS.map((v: any) => {
          const on = v.key === active;
          const base =
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition";
          const off = isDark
            ? "border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
          const onCls = isDark
            ? "border-sky-500/55 bg-sky-950/20 text-sky-200 shadow-[0_16px_60px_rgba(56,189,248,0.14)]"
            : "border-sky-300 bg-sky-50 text-sky-800";

          const label = pickLang(v.label, lang) || v.key;
          const status = statusText(v.status, lang);

          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setActive(v.key)}
              className={[base, on ? onCls : off].join(" ")}
              aria-current={on ? "page" : undefined}
            >
              <span className={pillTone(v.tone || "slate", isDark)} style={{ padding: "2px 8px" }}>
                {status}
              </span>
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Active version summary */}
      <div
        className={
          isDark
            ? "rounded-3xl border border-slate-800 bg-[#050910] p-4 sm:p-5"
            : "rounded-3xl border border-slate-200 bg-white p-4 sm:p-5"
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className={isDark ? "text-lg font-semibold text-slate-50" : "text-lg font-semibold text-slate-900"}>
              {activeLabel || ui.activeVersionTitleFallback}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={pillTone(activeVersion?.tone || "slate", isDark)}>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {ui.statusLabel}:&nbsp;
                <span className="font-semibold">{activeStatusText}</span>
              </span>
            </div>

            <ul
              className={
                isDark
                  ? "mt-2 text-[13px] text-slate-400 space-y-1"
                  : "mt-2 text-[13px] text-slate-600 space-y-1"
              }
            >
              {(activeSummary || []).map((s: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={
              isDark
                ? "rounded-2xl border border-slate-800 bg-slate-950/25 p-3"
                : "rounded-2xl border border-slate-200 bg-slate-50 p-3"
            }
          >
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{ui.counters}</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div
                className={
                  isDark
                    ? "rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2"
                }
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{ui.entries}</div>
                <div className={isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-900"}>
                  {counts.entries}
                </div>
              </div>

              <div
                className={
                  isDark
                    ? "rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2"
                }
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{ui.critical}</div>
                <div className={isDark ? "text-lg font-semibold text-rose-200" : "text-lg font-semibold text-rose-700"}>
                  {counts.critical}
                </div>
              </div>

              <div
                className={
                  isDark
                    ? "rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2"
                }
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{ui.db}</div>
                <div className={isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-900"}>
                  {counts.db}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
         KPI DOC SECTION (NEW)
         ========================= */}
      <div
        className={
          isDark
            ? "rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden"
            : "rounded-3xl border border-slate-200 bg-white overflow-hidden"
        }
      >
        <div className={isDark ? "px-4 py-3 border-b border-slate-800" : "px-4 py-3 border-b border-slate-200"}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{doc.kicker}</div>
              <div className={isDark ? "text-[16px] font-semibold text-slate-50" : "text-[16px] font-semibold text-slate-900"}>
                {doc.title}
              </div>
              <div className={isDark ? "text-[12px] text-slate-400 max-w-4xl leading-relaxed" : "text-[12px] text-slate-600 max-w-4xl leading-relaxed"}>
                {doc.subtitle}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={typePill("DOC", isDark)}>DOC</span>
              <span className={pillTone("sky", isDark)}>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                KPI
              </span>
              {doc.badges.slice(0, 2).map((b) => (
                <span key={b} className={pillTone("slate", isDark)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Narrative sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {doc.sections.map((s) => (
              <div
                key={s.title}
                className={
                  isDark
                    ? "rounded-2xl border border-slate-800 bg-slate-950/20 p-4"
                    : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
                }
              >
                <div className={isDark ? "text-[13px] font-semibold text-slate-100" : "text-[13px] font-semibold text-slate-900"}>
                  {s.title}
                </div>
                <div className={isDark ? "mt-2 text-[13px] text-slate-400 leading-relaxed" : "mt-2 text-[13px] text-slate-600 leading-relaxed"}>
                  {s.body}
                </div>
              </div>
            ))}
          </div>

          {/* Formula table */}
          <div
            className={
              isDark
                ? "rounded-2xl border border-slate-800 bg-slate-950/20 overflow-hidden"
                : "rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden"
            }
          >
            <div className={isDark ? "px-4 py-3 border-b border-slate-800" : "px-4 py-3 border-b border-slate-200"}>
              <div className={isDark ? "text-[12px] font-semibold text-slate-100" : "text-[12px] font-semibold text-slate-900"}>
                {doc.formulaTitle}
              </div>
              <div className={isDark ? "text-[11px] text-slate-500" : "text-[11px] text-slate-500"}>
                {doc.badges.join(" • ")}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {doc.formulaRows.map((r) => (
                <div
                  key={r.label}
                  className={
                    isDark
                      ? "rounded-2xl border border-slate-800 bg-slate-950/30 p-3"
                      : "rounded-2xl border border-slate-200 bg-white p-3"
                  }
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className={isDark ? "text-[11px] uppercase tracking-[0.18em] text-slate-500" : "text-[11px] uppercase tracking-[0.18em] text-slate-500"}>
                        {r.label}
                      </div>
                      <div className={isDark ? "mt-1 font-mono text-[12px] text-slate-200" : "mt-1 font-mono text-[12px] text-slate-800"}>
                        {r.formula}
                      </div>
                    </div>
                    <div className={isDark ? "text-[12px] text-slate-400 max-w-xl" : "text-[12px] text-slate-600 max-w-xl"}>
                      {r.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Example + rules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div
              className={
                isDark
                  ? "rounded-2xl border border-slate-800 bg-slate-950/20 p-4"
                  : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
              }
            >
              <div className={isDark ? "text-[13px] font-semibold text-slate-100" : "text-[13px] font-semibold text-slate-900"}>
                {doc.exampleTitle}
              </div>
              <div className={isDark ? "mt-2 text-[13px] text-slate-400 leading-relaxed" : "mt-2 text-[13px] text-slate-600 leading-relaxed"}>
                {doc.exampleBody}
              </div>
            </div>

            <div
              className={
                isDark
                  ? "rounded-2xl border border-slate-800 bg-slate-950/20 p-4"
                  : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
              }
            >
              <div className={isDark ? "text-[13px] font-semibold text-slate-100" : "text-[13px] font-semibold text-slate-900"}>
                {doc.rulesTitle}
              </div>
              <div className={isDark ? "mt-2 text-[13px] text-slate-400 leading-relaxed" : "mt-2 text-[13px] text-slate-600 leading-relaxed"}>
                {doc.rules}
              </div>
            </div>
          </div>

          {/* Curves */}
          <div
            className={
              isDark
                ? "rounded-2xl border border-slate-800 bg-slate-950/20 p-4"
                : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
            }
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className={isDark ? "text-[13px] font-semibold text-slate-100" : "text-[13px] font-semibold text-slate-900"}>
                  {doc.curvesTitle}
                </div>
                <div className={isDark ? "mt-1 text-[12px] text-slate-400 max-w-3xl" : "mt-1 text-[12px] text-slate-600 max-w-3xl"}>
                  {doc.curvesSubtitle}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={pillTone("slate", isDark)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  SVG
                </span>
                <span className={pillTone("slate", isDark)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Sparkline
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <MiniSparkline
                title={lang === "it" ? "Ore (trend)" : lang === "fr" ? "Heures (trend)" : "Hours (trend)"}
                subtitle={lang === "it" ? "Tempo giornaliero indicativo" : lang === "fr" ? "Temps journalier indicatif" : "Indicative daily time"}
                values={curveHours}
                isDark={isDark}
                valueLabel={lang === "it" ? "Ultimo" : lang === "fr" ? "Dernier" : "Last"}
              />
              <MiniSparkline
                title={lang === "it" ? "Produzione (norm.)" : lang === "fr" ? "Production (norm.)" : "Output (norm.)"}
                subtitle={lang === "it" ? "Realizzato normalizzato" : lang === "fr" ? "Réalisé normalisé" : "Normalized actual"}
                values={curveOutput}
                isDark={isDark}
                valueLabel={lang === "it" ? "Ultimo" : lang === "fr" ? "Dernier" : "Last"}
              />
              <MiniSparkline
                title={lang === "it" ? "Indice (ratio)" : lang === "fr" ? "Indice (ratio)" : "Index (ratio)"}
                subtitle={lang === "it" ? "Realizzato / Atteso" : lang === "fr" ? "Réalisé / Attendu" : "Actual / Expected"}
                values={curveIndex.map((v) => clamp(v, 0.6, 1.4))}
                isDark={isDark}
                valueLabel={lang === "it" ? "Ultimo" : lang === "fr" ? "Dernier" : "Last"}
              />
            </div>
          </div>

          {/* Extra badges */}
          <div className="flex flex-wrap items-center gap-2">
            {doc.badges.map((b) => (
              <span key={b} className={pillTone("slate", isDark)}>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Journal */}
      <div
        className={
          isDark
            ? "rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden"
            : "rounded-3xl border border-slate-200 bg-white overflow-hidden"
        }
      >
        <div className={isDark ? "px-4 py-3 border-b border-slate-800" : "px-4 py-3 border-b border-slate-200"}>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{ui.journal}</div>
          <div className={isDark ? "text-[12px] text-slate-400" : "text-[12px] text-slate-600"}>
            {ui.journalSubtitle}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {entries.length === 0 ? (
            <div className={isDark ? "text-[13px] text-slate-500" : "text-[13px] text-slate-600"}>
              {ui.empty}
            </div>
          ) : (
            entries.map((e) => {
              const title = pickLang(e.title, lang) || "";
              const details = pickLangArray(e.details, lang);

              return (
                <div
                  key={e.id}
                  className={
                    isDark
                      ? "rounded-2xl border border-slate-800 bg-slate-950/20 p-4"
                      : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  }
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={typePill(e.type, isDark)}>{String(e.type || "").toUpperCase()}</span>
                        <span className={isDark ? "text-[11px] text-slate-400" : "text-[11px] text-slate-600"}>
                          {e.module || "—"}
                        </span>
                        <span className="text-[11px] text-slate-500">• {e.date}</span>
                      </div>

                      <div className={isDark ? "text-[15px] font-semibold text-slate-100" : "text-[15px] font-semibold text-slate-900"}>
                        {title}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={
                          isDark
                            ? "inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/30 px-3 py-1 text-[11px] text-slate-400"
                            : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600"
                        }
                        title={`Impact: ${e.impact}`}
                      >
                        <span className={["h-1.5 w-1.5 rounded-full", impactDot(e.impact)].join(" ")} />
                        <span className="uppercase tracking-[0.18em]">{e.impact}</span>
                      </span>
                    </div>
                  </div>

                  {details.length > 0 ? (
                    <ul className={isDark ? "mt-3 text-[13px] text-slate-400 space-y-1" : "mt-3 text-[13px] text-slate-600 space-y-1"}>
                      {details.map((d: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-slate-500" />
                          <span className="min-w-0">{d}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={isDark ? "text-[11px] text-slate-600" : "text-[11px] text-slate-500"}>{ui.note}</div>
    </div>
  );
}
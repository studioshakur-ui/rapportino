// src/data/Evoluzione.tsx
import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, SUPPORTED_LANGS, getStoredLang, storeLang } from "./i18nEvoluzione";

type Lang = "it" | "fr" | "en";

type Copy = {
  kicker: string;
  title: string;
  subtitle: string;

  btnPrint: string;
  btnPdf: string;

  essentialTitle: string;
  essentialLead: string;

  formulaLabel: string;
  formulaValue: string;

  readLabel: string;
  read1: string;
  read2: string;
  read3: string;

  exampleTitle: string;
  exampleLead: string;

  exampleBlockTitle: string;
  exampleActivity: string;
  exampleUnit: string;
  examplePlanned8h: string;
  exampleReal: string;
  exampleHours: string;

  calcTitle: string;
  calcLine1: string;
  calcLine2: string;
  calcLine3: string;
  calcConclusion: string;

  detailsTitle: string;

  acc1Title: string;
  acc1Lead: string;
  acc1Rule1: string;
  acc1Rule2: string;
  acc1MiniTableTitle: string;

  acc2Title: string;
  acc2Lead: string;
  acc2Incl: string;
  acc2Excl: string;

  acc3Title: string;
  acc3Lead: string;
  acc3S1: string;
  acc3S2: string;
  acc3S3: string;

  footnote: string;
};

const COPY: Record<Lang, Copy> = {
  it: {
    kicker: "Evoluzione · KPI",
    title: "Indice di produttività (IP)",
    subtitle: "Metodo canonico basato su previsto. Spiegazione breve, leggibile e verificabile.",

    btnPrint: "Stampa",
    btnPdf: "Export PDF",

    essentialTitle: "L’essenziale",
    essentialLead: "L’IP confronta la produzione reale con la produzione prevista, a parità di ore.",

    formulaLabel: "Formula",
    formulaValue: "IP = Reale / Previsto",

    readLabel: "Come si legge",
    read1: "IP = 1.00 → conforme al previsto",
    read2: "IP < 1.00 → sotto il previsto",
    read3: "IP > 1.00 → sopra il previsto",

    exampleTitle: "Esempio concreto (unico, completo)",
    exampleLead: "Un solo esempio, senza rumore: è sufficiente per capire tutto.",

    exampleBlockTitle: "Dati (riga rapportino)",
    exampleActivity: "Attività",
    exampleUnit: "Unità",
    examplePlanned8h: "Previsto standard (8h)",
    exampleReal: "Reale (prodotto)",
    exampleHours: "Ore totali",

    calcTitle: "Calcolo",
    calcLine1: "Previsto su 8h = 160 m",
    calcLine2: "Reale = 120 m",
    calcLine3: "IP = 120 / 160 = 0.75",
    calcConclusion: "Conclusione: 0.75 significa 75% del previsto (sotto target).",

    detailsTitle: "Dettagli (solo se ti servono)",

    acc1Title: "Se ci sono più operatori sulla stessa riga",
    acc1Lead: "Il prodotto viene ripartito in modo equo, proporzionale alle ore.",
    acc1Rule1: "Reale allocato(op) = prodotto_riga × (ore_op / ore_totali_riga)",
    acc1Rule2: "Previsto effettivo(op) = previsto_8h × (ore_op / 8)",
    acc1MiniTableTitle: "Mini esempio (2 operatori)",

    acc2Title: "Cosa include / cosa esclude",
    acc2Lead: "L’IP è un indice quantitativo. Non mescola attività qualitative.",
    acc2Incl: "Include: attività quantitative (m, pz) con previsto > 0 e ore > 0.",
    acc2Excl: "Esclude: previsto mancante/0, ore = 0, attività non quantitative.",

    acc3Title: "Fonti dati (audit)",
    acc3Lead: "Da dove arrivano i numeri (tracciabilità).",
    acc3S1: "Rapportino: prodotto (reale).",
    acc3S2: "Catalogo: previsto (standard 8h) congelato sulla riga.",
    acc3S3: "Operatori: ore (tempo) per ripartizione e scaling.",

    footnote:
      "Nota: l’IP è un rapporto (senza unità). I KPI “ore” e altri KPI qualitativi sono separati.",
  },

  fr: {
    kicker: "Évolution · KPI",
    title: "Indice de productivité (IP)",
    subtitle: "Méthode canonique basée sur le “prévu”. Explication courte, lisible et vérifiable.",

    btnPrint: "Imprimer",
    btnPdf: "Exporter PDF",

    essentialTitle: "L’essentiel",
    essentialLead: "L’IP compare la production réelle à la production prévue, à heures égales.",

    formulaLabel: "Formule",
    formulaValue: "IP = Réel / Prévu",

    readLabel: "Interprétation",
    read1: "IP = 1.00 → conforme au prévu",
    read2: "IP < 1.00 → en dessous du prévu",
    read3: "IP > 1.00 → au-dessus du prévu",

    exampleTitle: "Exemple concret (unique, complet)",
    exampleLead: "Un seul exemple, zéro bruit : suffisant pour tout comprendre.",

    exampleBlockTitle: "Données (ligne rapportino)",
    exampleActivity: "Activité",
    exampleUnit: "Unité",
    examplePlanned8h: "Prévu standard (8h)",
    exampleReal: "Réel (produit)",
    exampleHours: "Heures totales",

    calcTitle: "Calcul",
    calcLine1: "Prévu sur 8h = 160 m",
    calcLine2: "Réel = 120 m",
    calcLine3: "IP = 120 / 160 = 0.75",
    calcConclusion: "Conclusion : 0.75 signifie 75% du prévu (sous la cible).",

    detailsTitle: "Détails (uniquement si nécessaire)",

    acc1Title: "Si plusieurs opérateurs sur la même ligne",
    acc1Lead: "La production est répartie équitablement, proportionnellement aux heures.",
    acc1Rule1: "Réel alloué(op) = produit_ligne × (heures_op / heures_totales_ligne)",
    acc1Rule2: "Prévu effectif(op) = prévu_8h × (heures_op / 8)",
    acc1MiniTableTitle: "Mini exemple (2 opérateurs)",

    acc2Title: "Ce qui est inclus / exclu",
    acc2Lead: "L’IP est un indice quantitatif. Il ne mélange pas le qualitatif.",
    acc2Incl: "Inclus : activités quantitatives (m, pz) avec prévu > 0 et heures > 0.",
    acc2Excl: "Exclus : prévu absent/0, heures = 0, activités non quantitatives.",

    acc3Title: "Sources (audit)",
    acc3Lead: "D’où viennent les chiffres (traçabilité).",
    acc3S1: "Rapportino : produit (réel).",
    acc3S2: "Catalogue : prévu (standard 8h) figé sur la ligne.",
    acc3S3: "Opérateurs : heures (temps) pour la répartition et la mise à l’échelle.",

    footnote:
      "Note : l’IP est un ratio (sans unité). Les KPI “heures” et les KPI qualitatifs sont séparés.",
  },

  en: {
    kicker: "Evolution · KPI",
    title: "Productivity Index (PI)",
    subtitle: "Canonical method based on “planned”. Short, readable, and verifiable explanation.",

    btnPrint: "Print",
    btnPdf: "Export PDF",

    essentialTitle: "The essentials",
    essentialLead: "PI compares actual output to planned output, normalized by hours.",

    formulaLabel: "Formula",
    formulaValue: "PI = Actual / Planned",

    readLabel: "How to read it",
    read1: "PI = 1.00 → on target",
    read2: "PI < 1.00 → below target",
    read3: "PI > 1.00 → above target",

    exampleTitle: "Concrete example (single, complete)",
    exampleLead: "One example, no noise: enough to understand the whole model.",

    exampleBlockTitle: "Inputs (rapportino row)",
    exampleActivity: "Activity",
    exampleUnit: "Unit",
    examplePlanned8h: "Planned standard (8h)",
    exampleReal: "Actual (output)",
    exampleHours: "Total hours",

    calcTitle: "Calculation",
    calcLine1: "Planned on 8h = 160 m",
    calcLine2: "Actual = 120 m",
    calcLine3: "PI = 120 / 160 = 0.75",
    calcConclusion: "Conclusion: 0.75 means 75% of planned (below target).",

    detailsTitle: "Details (only if you need them)",

    acc1Title: "If multiple operators share the same row",
    acc1Lead: "Output is allocated fairly, proportional to hours.",
    acc1Rule1: "Allocated actual(op) = row_output × (op_hours / row_total_hours)",
    acc1Rule2: "Effective planned(op) = planned_8h × (op_hours / 8)",
    acc1MiniTableTitle: "Mini example (2 operators)",

    acc2Title: "What is included / excluded",
    acc2Lead: "PI is a quantitative index. It does not mix qualitative work.",
    acc2Incl: "Included: quantitative activities (m, pcs) with planned > 0 and hours > 0.",
    acc2Excl: "Excluded: missing/0 planned, hours = 0, non-quantitative activities.",

    acc3Title: "Data sources (audit)",
    acc3Lead: "Where the numbers come from (traceability).",
    acc3S1: "Rapportino: output (actual).",
    acc3S2: "Catalog: planned (8h standard) frozen on the row.",
    acc3S3: "Operators: hours (time) for allocation and scaling.",

    footnote:
      "Note: PI is a unitless ratio. “Hours” KPIs and qualitative KPIs are separate.",
  },
};

function cn(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(" ");
}

function normalizeLang(x: unknown): Lang {
  const s = String(x || "").toLowerCase().trim();
  if (s === "it" || s === "fr" || s === "en") return s;
  return (DEFAULT_LANG as Lang) || "it";
}

function IconSpark(): JSX.Element {
  // Small “curve” illustration (minimal, premium)
  return (
    <svg width="84" height="24" viewBox="0 0 84 24" aria-hidden="true" className="opacity-90">
      <path d="M2 18 C 14 10, 26 14, 38 8 S 64 6, 82 4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M2 20 H82" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
    </svg>
  );
}

function LangSwitch({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}): JSX.Element {
  return (
    <div className="no-print inline-flex items-center gap-2">
      <div className="text-[12px] text-slate-400">Lang</div>
      <div className="inline-flex rounded-full border border-slate-800 bg-slate-950/40 p-1">
        {SUPPORTED_LANGS.map((l) => {
          const on = lang === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => onChange(normalizeLang(l))}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold transition",
                on ? "bg-slate-100 text-slate-900" : "text-slate-300 hover:bg-slate-900/40"
              )}
              aria-pressed={on}
            >
              {String(l).toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActionButtons({ t }: { t: Copy }): JSX.Element {
  const onPrint = () => window.print();

  const onExportPdf = () => {
    // Same browser flow: user chooses “Save to PDF”.
    // Print CSS ensures clean PDF output.
    window.print();
  };

  return (
    <div className="no-print inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onPrint}
        className="rounded-full border border-slate-800 bg-slate-950/50 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/40 transition"
      >
        {t.btnPrint}
      </button>
      <button
        type="button"
        onClick={onExportPdf}
        className="rounded-full border border-sky-500/40 bg-sky-950/20 px-4 py-2 text-[12px] font-semibold text-sky-200 hover:bg-sky-950/30 transition"
      >
        {t.btnPdf}
      </button>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-100">{title}</div>
        </div>
        {right ? <div className="shrink-0 text-slate-300">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Details({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <details className="rounded-2xl border border-slate-800 bg-slate-950/30 px-5 py-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-100">{title}</div>
            {lead ? <div className="mt-1 text-[13px] text-slate-400">{lead}</div> : null}
          </div>
          <div className="shrink-0 text-slate-500">▾</div>
        </div>
      </summary>
      <div className="mt-4 text-[14px] leading-7 text-slate-200">{children}</div>
    </details>
  );
}

export default function Evoluzione(): JSX.Element {
  const [lang, setLang] = useState<Lang>(() => normalizeLang(getStoredLang() || DEFAULT_LANG));
  const t = useMemo(() => COPY[lang] || COPY.it, [lang]);

  useEffect(() => {
    storeLang(lang);
  }, [lang]);

  return (
    <div className="evo-kpi-page p-4 sm:p-6">
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .evo-kpi-page { padding: 0 !important; }
          .evo-kpi-page * { color: #0b1220 !important; }
          .evo-kpi-page section,
          .evo-kpi-page details { background: #ffffff !important; border-color: #e5e7eb !important; }
          .evo-kpi-page code { background: #f3f4f6 !important; border-color: #e5e7eb !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <header className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="text-[12px] text-slate-400">{t.kicker}</div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50">
                  {t.title}
                </h1>
                <span className="text-slate-300">
                  <IconSpark />
                </span>
              </div>
              <p className="text-[14px] leading-7 text-slate-300 max-w-3xl">
                <em className="not-italic">{t.subtitle}</em>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              <LangSwitch lang={lang} onChange={setLang} />
              <ActionButtons t={t} />
            </div>
          </div>
        </header>

        {/* Essentials */}
        <Card title={t.essentialTitle}>
          <div className="text-[15px] leading-7 text-slate-200">
            {t.essentialLead}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-[12px] text-slate-400">{t.formulaLabel}</div>
              <div className="mt-2 text-[18px] font-semibold text-slate-100">
                {t.formulaValue}
              </div>
              <div className="mt-2 text-[13px] text-slate-400">
                <em>Indice senza unità</em>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-[12px] text-slate-400">{t.readLabel}</div>
              <ul className="mt-2 space-y-1 text-[14px] text-slate-200">
                <li>{t.read1}</li>
                <li>{t.read2}</li>
                <li>{t.read3}</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Example */}
        <Card title={t.exampleTitle} right={<span className="text-[12px] text-slate-400">{t.exampleLead}</span>}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-[12px] text-slate-400">{t.exampleBlockTitle}</div>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left text-[14px]">
                  <tbody>
                    <tr className="border-b border-slate-800">
                      <td className="px-4 py-3 text-slate-400">{t.exampleActivity}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">Stesura cavi</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="px-4 py-3 text-slate-400">{t.exampleUnit}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">m</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="px-4 py-3 text-slate-400">{t.examplePlanned8h}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">160 m</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="px-4 py-3 text-slate-400">{t.exampleReal}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">120 m</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-400">{t.exampleHours}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">8 h</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-[13px] text-slate-400">
                <em>Nota:</em> il previsto è uno standard su 8h e viene confrontato con il reale sulla stessa base.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-[12px] text-slate-400">{t.calcTitle}</div>

              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="text-[14px] text-slate-200">{t.calcLine1}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="text-[14px] text-slate-200">{t.calcLine2}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="text-[14px] text-slate-200">
                    <span className="font-semibold text-slate-100">{t.calcLine3}</span>
                  </div>
                </div>

                {/* Small “curve” illustration */}
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="text-[13px] text-slate-300">{t.calcConclusion}</div>
                  <div className="text-slate-300">
                    <IconSpark />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Details */}
        <div className="space-y-3">
          <div className="text-[13px] text-slate-400">{t.detailsTitle}</div>

          <Details title={t.acc1Title} lead={t.acc1Lead}>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <code className="block text-[13px] leading-6 text-slate-100">{t.acc1Rule1}</code>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <code className="block text-[13px] leading-6 text-slate-100">{t.acc1Rule2}</code>
              </div>

              <div className="mt-2 text-[12px] text-slate-400">{t.acc1MiniTableTitle}</div>
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-slate-950/40">
                    <tr>
                      <th className="px-4 py-2 text-slate-400 font-semibold">Op</th>
                      <th className="px-4 py-2 text-slate-400 font-semibold">Ore</th>
                      <th className="px-4 py-2 text-slate-400 font-semibold">Reale allocato</th>
                      <th className="px-4 py-2 text-slate-400 font-semibold">Previsto eff.</th>
                      <th className="px-4 py-2 text-slate-400 font-semibold">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-800">
                      <td className="px-4 py-2 text-slate-100 font-semibold">A</td>
                      <td className="px-4 py-2 text-slate-200">6h</td>
                      <td className="px-4 py-2 text-slate-200">90 m</td>
                      <td className="px-4 py-2 text-slate-200">120 m</td>
                      <td className="px-4 py-2 text-slate-100 font-semibold">0.75</td>
                    </tr>
                    <tr className="border-t border-slate-800">
                      <td className="px-4 py-2 text-slate-100 font-semibold">B</td>
                      <td className="px-4 py-2 text-slate-200">2h</td>
                      <td className="px-4 py-2 text-slate-200">30 m</td>
                      <td className="px-4 py-2 text-slate-200">40 m</td>
                      <td className="px-4 py-2 text-slate-100 font-semibold">0.75</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Details>

          <Details title={t.acc2Title} lead={t.acc2Lead}>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t.acc2Incl}</li>
              <li>{t.acc2Excl}</li>
            </ul>
          </Details>

          <Details title={t.acc3Title} lead={t.acc3Lead}>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t.acc3S1}</li>
              <li>{t.acc3S2}</li>
              <li>{t.acc3S3}</li>
            </ul>
          </Details>
        </div>

        <div className="text-[12px] text-slate-500">
          <em className="not-italic">{t.footnote}</em>
        </div>
      </div>
    </div>
  );
}
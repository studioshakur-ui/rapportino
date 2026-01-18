import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { headerPill, themeIconBg, buttonPrimary } from "../ui/designSystem";

import { CoreWordmark } from "../components/landing/CoreWordmark";
import { ElectricFlowPanel } from "../components/landing/ElectricFlowPanel";
import { ControlLayerSection } from "../components/landing/SectionControlLayer";
import { GlobalCursorLight } from "../components/landing/GlobalCursorLight";

type Lang = "it" | "fr" | "en";

const LANGS: Lang[] = ["it", "fr", "en"];

const COPY: Record<
  Lang,
  {
    eyebrow: string;
    title: string; // "CORE"
    subtitle: string;
    valueLines: string[];
    accessNote: string;
    ctaPrimary: string;
    ctaSecondary: string;

    spec: string;
    nodes: [string, string, string, string];
    nodeSubs: [string, string, string, string];

    closureTitle: string;
    closureSub: string;
    closureLine: string;

    footerLeft: string;
    footerRight: string;

    s2Title: string;
    s2Subtitle: string;
    s2Cards: {
      c1Title: string;
      c1Body: string;
      c1Example: string;
      c1Cta: string;

      c2Title: string;
      c2Body: string;
      c2Example: string;
      c2Cta: string;

      c3Title: string;
      c3Body: string;
      c3Example: string;
      c3Cta: string;
    };
  }
> = {
  it: {
    eyebrow: "Sistema operativo di cantiere",
    title: "CORE",
    subtitle: "controllo operativo del cantiere.",
    valueLines: ["Rapportini validati.", "Evidenze consultabili."],
    accessNote: "Accesso riservato · visibilità per ruoli autorizzati",
    ctaPrimary: "Accedi",
    ctaSecondary: "Richiedi accesso",

    spec: "Un solo flusso · Un solo dato · Nessuna ricostruzione",
    nodes: ["CAPO", "UFFICIO", "CORE DRIVE", "DIREZIONE"],
    nodeSubs: ["Inserisce", "Valida", "Archivia", "Legge"],

    closureTitle: "CORE non è un software.",
    closureSub: "È un organo operativo del cantiere.",
    closureLine: "Il sistema si ferma. La decisione inizia.",

    footerLeft: "Accesso riservato a personale e partner autorizzati.",
    footerRight: "CORE · Operazioni di cantiere",

    s2Title: "CORE · Control Layer",
    s2Subtitle: "Controlli automatici. Prove verificabili. Nessuna ricostruzione.",
    s2Cards: {
      c1Title: "Controlli",
      c1Body: "Incoerenze rilevate sulle righe operative.",
      c1Example: "Previsto = 0 · Prodotto > 0",
      c1Cta: "Vedi esempi",

      c2Title: "Indice",
      c2Body: "Scostamenti spiegati con ore e attività.",
      c2Example: "–2h · Attività posa",
      c2Cta: "Vedi prove",

      c3Title: "Evidenze",
      c3Body: "Ogni decisione ha una prova.",
      c3Example: "PDF · Versioning · Audit log",
      c3Cta: "Apri esempio",
    },
  },
  fr: {
    eyebrow: "Système opérationnel de chantier",
    title: "CORE",
    subtitle: "contrôle opérationnel du chantier.",
    valueLines: ["Rapportini validés.", "Preuves consultables."],
    accessNote: "Accès réservé · visibilité par rôles autorisés",
    ctaPrimary: "Accéder",
    ctaSecondary: "Demander l’accès",

    spec: "Un seul flux · Une seule donnée · Aucune reconstruction",
    nodes: ["CAPO", "UFFICIO", "CORE DRIVE", "DIREZIONE"],
    nodeSubs: ["Saisit", "Valide", "Archive", "Lit"],

    closureTitle: "CORE n’est pas un logiciel.",
    closureSub: "C’est un organe opérationnel du chantier.",
    closureLine: "Quand le système s’arrête, la décision commence.",

    footerLeft: "Accès réservé au personnel et partenaires autorisés.",
    footerRight: "CORE · Opérations de chantier",

    s2Title: "CORE · Control Layer",
    s2Subtitle: "Contrôles automatiques. Preuves vérifiables. Aucune reconstruction.",
    s2Cards: {
      c1Title: "Contrôles",
      c1Body: "Incohérences détectées sur les lignes.",
      c1Example: "Prévu = 0 · Produit > 0",
      c1Cta: "Voir exemples",

      c2Title: "Indice",
      c2Body: "Écarts expliqués par heures et activités.",
      c2Example: "–2h · Activité pose",
      c2Cta: "Voir preuves",

      c3Title: "Preuves",
      c3Body: "Chaque décision a une preuve.",
      c3Example: "PDF · Versioning · Journal d’audit",
      c3Cta: "Ouvrir exemple",
    },
  },
  en: {
    eyebrow: "Operational shipyard system",
    title: "CORE",
    subtitle: "operational control of the shipyard.",
    valueLines: ["Validated reports.", "Consultable evidence."],
    accessNote: "Restricted access · authorized roles",
    ctaPrimary: "Login",
    ctaSecondary: "Request access",

    spec: "One flow · One data · No reconstruction",
    nodes: ["CAPO", "UFFICIO", "CORE DRIVE", "DIREZIONE"],
    nodeSubs: ["Inputs", "Validates", "Archives", "Reads"],

    closureTitle: "CORE is not software.",
    closureSub: "It is an operational organ of the shipyard.",
    closureLine: "When the system stops, the decision begins.",

    footerLeft: "Restricted access to staff and authorized partners.",
    footerRight: "CORE · Shipyard operations",

    s2Title: "CORE · Control Layer",
    s2Subtitle: "Automatic controls. Verifiable evidence. No reconstruction.",
    s2Cards: {
      c1Title: "Controls",
      c1Body: "Inconsistencies detected on operational lines.",
      c1Example: "Planned = 0 · Produced > 0",
      c1Cta: "View examples",

      c2Title: "Index",
      c2Body: "Deviations explained with hours and activities.",
      c2Example: "–2h · Laying activity",
      c2Cta: "View evidence",

      c3Title: "Evidence",
      c3Body: "Every decision has a proof.",
      c3Example: "PDF · Versioning · Audit log",
      c3Cta: "Open example",
    },
  },
};

function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function safeGetInitialLang(): Lang {
  if (typeof window === "undefined") return "it";
  try {
    const v = window.localStorage.getItem("core-lang");
    if (v === "it" || v === "fr" || v === "en") return v;
  } catch {
    // ignore
  }
  return "it";
}

export default function Landing(): JSX.Element {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const [lang, setLang] = useState<Lang>(() => safeGetInitialLang());
  const t = COPY[lang];

  useEffect(() => {
    try {
      window.localStorage.setItem("core-lang", lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const accessHref = useMemo(() => {
    const subject = encodeURIComponent("Richiesta accesso CORE");
    const body = encodeURIComponent(
      "Buongiorno,\n\nVorrei richiedere l’accesso a CORE.\n\nNome:\nRuolo:\nCantiere/Sito:\nTelefono:\n\nGrazie."
    );
    return `mailto:info@core.local?subject=${subject}&body=${body}`;
  }, []);

  return (
    <div ref={rootRef} className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* BACKDROP (clean, no seasonal modes) */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(1200px 620px at 14% 18%, rgba(56,189,248,0.08), transparent 62%),
            radial-gradient(900px 520px at 78% 22%, rgba(16,185,129,0.05), transparent 64%),
            radial-gradient(900px 520px at 48% 86%, rgba(139,92,246,0.035), transparent 66%),
            linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.48))
          `,
        }}
      />

      {/* GLOBAL CURSOR LIGHT (subtle, site-wide on the landing) */}
      <GlobalCursorLight target={rootRef} />

      {/* GRAIN (very subtle) */}
      <div
        className="pointer-events-none fixed inset-0 z-[12] opacity-[0.045]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.20) 0px,
              rgba(255,255,255,0.20) 1px,
              rgba(0,0,0,0.20) 2px,
              rgba(0,0,0,0.20) 3px
            )
          `,
          mixBlendMode: "overlay",
        }}
      />

      {/* HEADER */}
      <header className="relative z-20 px-3 pt-3">
        <div className="mx-auto max-w-7xl">
          <div className="no-print sticky top-0 z-30 rounded-2xl border border-slate-800 bg-[#050910]/70 backdrop-blur px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className={cx(headerPill(true), "border-slate-700 text-slate-200 bg-slate-900/40")}>
                  <span className={themeIconBg(true, "sky")}>●</span>
                  <span>CORE</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">{t.eyebrow}</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/45 px-2 py-1">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className={cx(
                        "px-2.5 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.18em] transition",
                        l === lang ? "text-sky-200" : "text-slate-500 hover:text-slate-300"
                      )}
                      aria-label={`Language ${l}`}
                      title={l.toUpperCase()}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <Link
                  to="/login"
                  className={cx(
                    buttonPrimary(true),
                    "h-9 px-4 rounded-xl shadow-[0_18px_45px_rgba(56,189,248,0.14)]"
                  )}
                >
                  {t.ctaPrimary}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          {/* HERO */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-14 items-start">
            <div className="lg:col-span-5 space-y-9">
              <div className="space-y-4">
                <div className="text-[12px] uppercase tracking-[0.30em] text-slate-500">{t.eyebrow}</div>

                <CoreWordmark title={t.title} />

                <div className="text-2xl text-slate-300 tracking-tight">{t.subtitle}</div>
              </div>

              <div className="space-y-2 text-[22px] leading-relaxed">
                {t.valueLines.map((line) => (
                  <div key={line} className="text-slate-100">
                    {line}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className={cx(buttonPrimary(true), "px-7 py-3 rounded-xl shadow-[0_18px_50px_rgba(56,189,248,0.14)]")}
                >
                  {t.ctaPrimary}
                </Link>

                <a
                  href={accessHref}
                  className={cx(
                    "inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/45 px-7 py-3 text-slate-200 hover:bg-slate-950/70 transition"
                  )}
                >
                  {t.ctaSecondary}
                </a>

                <span className="text-sm text-slate-500">{t.accessNote}</span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <ElectricFlowPanel t={t} />
            </div>
          </section>

          {/* SECTION 2 (under hero) */}
          <div className="pt-14 md:pt-16">
            <ControlLayerSection t={t} />
          </div>

          {/* CLOSURE */}
          <section className="pt-16 mt-16 border-t border-slate-800/70">
            <div className="text-5xl font-semibold tracking-tight leading-[1.05]">
              {t.closureTitle}
              <br />
              {t.closureSub}
            </div>
            <div className="mt-4 text-base text-slate-400 max-w-3xl leading-relaxed">{t.closureLine}</div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-800/70">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between text-[11px] text-slate-500">
          <span>{t.footerLeft}</span>
          <span>{t.footerRight}</span>
        </div>
      </footer>
    </div>
  );
}

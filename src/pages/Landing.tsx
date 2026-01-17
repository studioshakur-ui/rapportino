import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { headerPill, themeIconBg, buttonPrimary } from "../ui/designSystem";

type Lang = "it" | "fr" | "en";
const LANGS: Lang[] = ["it", "fr", "en"];

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  valueLines: string[];
  accessNote: string;
  ctaPrimary: string;
  ctaSecondary: string;

  spec: string;
  nodes: string[];
  nodeSubs: string[];

  closureTitle: string;
  closureSub: string;
  closureLine: string;

  footerLeft: string;
  footerRight: string;

  s2Eyebrow: string;
  s2Title: string;
  s2Sub: string;

  card1Title: string;
  card1Line: string;
  card1Example: string;
  card1Badge: string;
  card1Cta: string;

  card2Title: string;
  card2Line: string;
  card2Example: string;
  card2Badge: string;
  card2Cta: string;

  card3Title: string;
  card3Line: string;
  card3Example: string;
  card3Badge: string;
  card3Cta: string;
};

const COPY: Record<Lang, Copy> = {
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

    s2Eyebrow: "CORE · Control Layer",
    s2Title: "Controlli e prove.",
    s2Sub: "Controlli automatici. Prove verificabili. Nessuna ricostruzione.",

    card1Title: "Controlli",
    card1Line: "Incoerenze rilevate sulle righe operative.",
    card1Example: "Previsto = 0 · Prodotto > 0",
    card1Badge: "CORE checked",
    card1Cta: "Vedi esempi",

    card2Title: "Indice",
    card2Line: "Scostamenti spiegati con ore e attività.",
    card2Example: "–2h · Attività posa",
    card2Badge: "Line-proven",
    card2Cta: "Vedi prove",

    card3Title: "Evidenze",
    card3Line: "Ogni decisione ha una prova.",
    card3Example: "PDF · Versioning · Audit log",
    card3Badge: "Audit-ready",
    card3Cta: "Apri esempio",
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

    s2Eyebrow: "CORE · Control Layer",
    s2Title: "Contrôles et preuves.",
    s2Sub: "Contrôles automatiques. Preuves vérifiables. Aucune reconstruction.",

    card1Title: "Contrôles",
    card1Line: "Incohérences détectées sur les lignes.",
    card1Example: "Prévu = 0 · Produit > 0",
    card1Badge: "CORE checked",
    card1Cta: "Voir exemples",

    card2Title: "Indice",
    card2Line: "Écarts expliqués avec heures et activités.",
    card2Example: "–2h · Activité pose",
    card2Badge: "Line-proven",
    card2Cta: "Voir preuves",

    card3Title: "Preuves",
    card3Line: "Chaque décision a une preuve.",
    card3Example: "PDF · Versioning · Audit log",
    card3Badge: "Audit-ready",
    card3Cta: "Ouvrir exemple",
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

    s2Eyebrow: "CORE · Control Layer",
    s2Title: "Controls and evidence.",
    s2Sub: "Automatic controls. Verifiable evidence. No reconstruction.",

    card1Title: "Controls",
    card1Line: "Inconsistencies detected at row level.",
    card1Example: "Planned = 0 · Output > 0",
    card1Badge: "CORE checked",
    card1Cta: "View examples",

    card2Title: "Index",
    card2Line: "Deviations explained with hours and activities.",
    card2Example: "–2h · Cable laying",
    card2Badge: "Line-proven",
    card2Cta: "View evidence",

    card3Title: "Evidence",
    card3Line: "Every decision has proof.",
    card3Example: "PDF · Versioning · Audit log",
    card3Badge: "Audit-ready",
    card3Cta: "Open sample",
  },
};

function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function safeGetInitialLang(): Lang {
  if (typeof window === "undefined") return "it";
  try {
    const l = window.localStorage.getItem("core-lang");
    if (l === "it" || l === "fr" || l === "en") return l;
  } catch {}
  return "it";
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let m: MediaQueryList | null = null;
    try {
      m = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    } catch {
      m = null;
    }
    if (!m) return;

    const onChange = () => setReduced(!!m?.matches);
    try {
      m.addEventListener("change", onChange);
      return () => m?.removeEventListener("change", onChange);
    } catch {
      // @ts-expect-error legacy
      m.addListener(onChange);
      return () => {
        // @ts-expect-error legacy
        m.removeListener(onChange);
      };
    }
  }, []);

  return reduced;
}

/* =========================================================
   Electric Flow (SVG)
   ========================================================= */
function ElectricFlow({ t }: { t: Copy }) {
  const W = 760;
  const H = 200;

  const leftPad = 58;
  const rightPad = 58;
  const y = 104;

  const x0 = leftPad;
  const x3 = W - rightPad;
  const x1 = x0 + (x3 - x0) * 0.33;
  const x2 = x0 + (x3 - x0) * 0.66;

  const d = useMemo(() => {
    const c1y = y - 16;
    const c2y = y + 12;
    return `
      M ${x0} ${y}
      C ${x0 + 84} ${c1y}, ${x1 - 84} ${c1y}, ${x1} ${y}
      S ${x2 - 84} ${c2y}, ${x2} ${y}
      S ${x3 - 84} ${c1y}, ${x3} ${y}
    `
      .replace(/\s+/g, " ")
      .trim();
  }, [x0, x1, x2, x3, y]);

  return (
    <div className="relative">
      <style>{`
        .coreMetalPanel {
          position: relative;
          border-radius: 20px;
          background:
            radial-gradient(900px 320px at 18% 18%, rgba(56,189,248,0.08), transparent 58%),
            radial-gradient(720px 260px at 84% 24%, rgba(16,185,129,0.04), transparent 64%),
            linear-gradient(to bottom, rgba(2,6,23,0.52), rgba(2,6,23,0.26));
          border: 1px solid rgba(148,163,184,0.18);
          box-shadow:
            0 28px 90px rgba(2,6,23,0.72),
            inset 0 1px 0 rgba(226,232,240,0.06),
            inset 0 -1px 0 rgba(2,6,23,0.55);
          overflow: hidden;
        }
        .coreMetalPanel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 20px;
          background:
            linear-gradient(to bottom, rgba(226,232,240,0.06), transparent 18%),
            linear-gradient(to top, rgba(2,6,23,0.55), transparent 22%);
          opacity: 1;
        }

        .coreFlowCurrent {
          stroke-dasharray: 36 56;
          animation: coreFlowDash 10.5s linear infinite;
        }
        .coreFlowSpark {
          stroke-dasharray: 3 190;
          animation: coreFlowSpark 8.6s linear infinite;
          opacity: 0.72;
        }

        @keyframes coreFlowDash {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -320; }
        }
        @keyframes coreFlowSpark {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -680; }
        }

        @media (prefers-reduced-motion: reduce) {
          .coreFlowCurrent, .coreFlowSpark { animation: none !important; }
        }
      `}</style>

      <div className="coreMetalPanel p-6 md:p-7">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="min-w-0 text-[11px] uppercase tracking-[0.28em] text-slate-500">{t.spec}</div>

          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-[0.20em] text-slate-400">CORE 1.0</span>
            <span className="text-[11px] uppercase tracking-[0.20em] text-sky-200">LIVE</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[190px] md:h-[210px]" aria-hidden="true">
          <defs>
            <linearGradient id="railGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(148,163,184,0.18)" />
              <stop offset="50%" stopColor="rgba(148,163,184,0.28)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0.18)" />
            </linearGradient>

            <linearGradient id="currentGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
              <stop offset="55%" stopColor="rgba(56,189,248,0.95)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.18)" />
            </linearGradient>
          </defs>

          <path d={d} fill="none" stroke="url(#railGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
          <path d={d} fill="none" stroke="rgba(56,189,248,0.06)" strokeWidth="12" strokeLinecap="round" opacity="0.62" />

          <path
            className="coreFlowCurrent"
            d={d}
            fill="none"
            stroke="url(#currentGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDashoffset={0}
            opacity="0.95"
          />

          <path
            className="coreFlowSpark"
            d={d}
            fill="none"
            stroke="rgba(226,232,240,0.88)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDashoffset={0}
          />

          <Node x={x0} y={y} label={t.nodes[0]} sub={t.nodeSubs[0]} />
          <Node x={x1} y={y} label={t.nodes[1]} sub={t.nodeSubs[1]} />
          <Node x={x2} y={y} label={t.nodes[2]} sub={t.nodeSubs[2]} />
          <Node x={x3} y={y} label={t.nodes[3]} sub={t.nodeSubs[3]} />
        </svg>
      </div>
    </div>
  );
}

function Node({ x, y, label, sub }: { x: number; y: number; label: string; sub: string }) {
  return (
    <>
      <circle cx={x} cy={y} r="9.5" fill="rgba(2,6,23,0.92)" stroke="rgba(56,189,248,0.72)" strokeWidth="2" />
      <circle cx={x} cy={y} r="5" fill="rgba(2,6,23,0.98)" stroke="rgba(226,232,240,0.22)" strokeWidth="1" />
      <circle cx={x} cy={y} r="2.6" fill="rgba(226,232,240,0.92)" />
      <circle cx={x} cy={y} r="6.5" fill="rgba(56,189,248,0.06)" />

      <text
        x={x}
        y={y + 30}
        textAnchor="middle"
        fontSize="12"
        fill="rgba(226,232,240,0.95)"
        style={{ fontWeight: 700, letterSpacing: "0.10em" }}
      >
        {label}
      </text>
      <text x={x} y={y + 48} textAnchor="middle" fontSize="11" fill="rgba(148,163,184,0.92)">
        {sub}
      </text>
    </>
  );
}

/* =========================================================
   Wordmark CORE + ai (electric + visible)
   ========================================================= */
function CoreWordmark({ core, reduced }: { core: string; reduced: boolean }) {
  return (
    <>
      <style>{`
        .coreWordmarkWrap { position: relative; display: inline-flex; align-items: baseline; gap: 10px; }

        /* Make ai actually visible relative to huge CORE */
        .coreAiMark {
          position: relative;
          display: inline-block;
          top: 14px;                 /* slightly lower */
          font-size: 0.48em;         /* bigger than previous 0.40em */
          line-height: 1;
          letter-spacing: 0.02em;
          text-transform: lowercase;

          /* electric cyan */
          color: rgba(56,189,248,0.96);

          /* visible glow */
          text-shadow:
            0 0 22px rgba(56,189,248,0.26),
            0 0 40px rgba(56,189,248,0.10);
        }

        /* Glow bed */
        .coreAiMark::before {
          content: "";
          position: absolute;
          inset: -10px -12px;
          border-radius: 999px;
          background:
            radial-gradient(26px 14px at 50% 55%, rgba(56,189,248,0.26), transparent 70%),
            radial-gradient(70px 28px at 50% 55%, rgba(56,189,248,0.10), transparent 70%);
          opacity: 0.75;
          pointer-events: none;
        }

        /* Electric underline */
        .coreAiUnderline {
          position: absolute;
          left: -2px;
          right: -2px;
          bottom: -6px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg,
            rgba(56,189,248,0.00),
            rgba(226,232,240,0.85),
            rgba(56,189,248,0.95),
            rgba(226,232,240,0.70),
            rgba(56,189,248,0.00)
          );
          opacity: 0.55;
          filter: blur(0.2px);
        }

        /* Traveling spark */
        .coreAiSpark {
          position: absolute;
          top: 55%;
          left: -14px;
          width: 12px;
          height: 2px;
          border-radius: 999px;
          background: rgba(226,232,240,0.92);
          box-shadow:
            0 0 16px rgba(56,189,248,0.28),
            0 0 28px rgba(56,189,248,0.12);
          opacity: 0;
          transform: translateY(-50%);
          pointer-events: none;
        }

        /* Animations (slow, premium) */
        @keyframes coreAiPulse {
          0%, 100% {
            filter: brightness(1);
            text-shadow:
              0 0 22px rgba(56,189,248,0.22),
              0 0 40px rgba(56,189,248,0.08);
          }
          50% {
            filter: brightness(1.06);
            text-shadow:
              0 0 30px rgba(56,189,248,0.34),
              0 0 56px rgba(56,189,248,0.12);
          }
        }

        @keyframes coreAiSparkTravel {
          0%   { opacity: 0; transform: translate(-10px, -50%); }
          10%  { opacity: 0.9; }
          28%  { opacity: 0; transform: translate(40px, -50%); }
          100% { opacity: 0; transform: translate(40px, -50%); }
        }

        @keyframes coreAiUnderlineShift {
          0%   { opacity: 0.40; transform: translateX(-4px); }
          50%  { opacity: 0.62; transform: translateX(4px); }
          100% { opacity: 0.40; transform: translateX(-4px); }
        }

        .coreAiAnimated { animation: coreAiPulse 8.6s ease-in-out infinite; }
        .coreAiAnimated .coreAiSpark { animation: coreAiSparkTravel 7.2s ease-in-out infinite; }
        .coreAiAnimated .coreAiUnderline { animation: coreAiUnderlineShift 6.8s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .coreAiAnimated,
          .coreAiAnimated .coreAiSpark,
          .coreAiAnimated .coreAiUnderline {
            animation: none !important;
          }
        }
      `}</style>

      <span className="coreWordmarkWrap">
        <span>{core}</span>
        <span className={cx("coreAiMark", !reduced && "coreAiAnimated")}>
          ai
          <span className="coreAiUnderline" aria-hidden="true" />
          <span className="coreAiSpark" aria-hidden="true" />
        </span>
      </span>
    </>
  );
}

/* =========================================================
   Cards
   ========================================================= */
function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/45 px-3 py-1 text-[10px] uppercase tracking-[0.20em] text-slate-300">
      {text}
    </span>
  );
}

function Card({
  title,
  line,
  example,
  badge,
  cta,
}: {
  title: string;
  line: string;
  example: string;
  badge: string;
  cta: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-slate-800 bg-slate-950/35 p-6",
        "shadow-[0_28px_90px_rgba(2,6,23,0.55)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[12px] uppercase tracking-[0.22em] text-slate-500">{title}</div>
          <div className="mt-3 text-[15px] text-slate-200 leading-relaxed">{line}</div>
        </div>
        <div className="shrink-0">
          <Badge text={badge} />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Esempio</div>
        <div className="mt-2 text-[14px] text-slate-100">{example}</div>
      </div>

      <button
        type="button"
        className="mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-sky-200 hover:text-sky-100 transition"
      >
        {cta} <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

/* =========================================================
   LANDING
   ========================================================= */
export default function Landing(): JSX.Element {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const reducedMotion = usePrefersReducedMotion();

  const [lang, setLang] = useState<Lang>(() => safeGetInitialLang());
  const t = COPY[lang] || COPY.it;

  useEffect(() => {
    try {
      window.localStorage.setItem("core-lang", lang);
    } catch {}
  }, [lang]);

  const accessHref = useMemo(() => {
    const subject = encodeURIComponent("Richiesta accesso CORE");
    const body = encodeURIComponent(
      "Buongiorno,\n\nVorrei richiedere l’accesso a CORE.\n\nNome:\nRuolo:\nCantiere/Sito:\nTelefono:\n\nGrazie."
    );
    return `mailto:info@core.local?subject=${subject}&body=${body}`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* BACKDROP */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1200px 620px at 14% 18%, rgba(56,189,248,0.08), transparent 62%),
            radial-gradient(900px 520px at 78% 22%, rgba(16,185,129,0.05), transparent 64%),
            radial-gradient(900px 520px at 48% 86%, rgba(139,92,246,0.032), transparent 66%),
            linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.52))
          `,
        }}
        aria-hidden="true"
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
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-6 space-y-9">
              <div className="space-y-3">
                <div className="text-[12px] uppercase tracking-[0.30em] text-slate-500">{t.eyebrow}</div>

                <h1 className="text-7xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
                  <CoreWordmark core={t.title} reduced={reducedMotion} />
                </h1>

                <div className="text-2xl text-slate-300 tracking-tight">{t.subtitle}</div>
              </div>

              <div className="space-y-2 text-[22px] leading-relaxed">
                {t.valueLines.map((line, idx) => (
                  <div key={idx} className="text-slate-100">
                    {line}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className={cx(
                    buttonPrimary(true),
                    "px-7 py-3 rounded-xl shadow-[0_18px_50px_rgba(56,189,248,0.14)]"
                  )}
                >
                  {t.ctaPrimary}
                </Link>

                <a
                  href={accessHref}
                  className={cx(
                    "inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/45 px-7 py-3",
                    "text-slate-200 hover:bg-slate-950/70 transition"
                  )}
                >
                  {t.ctaSecondary}
                </a>

                <span className="text-sm text-slate-500">{t.accessNote}</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <ElectricFlow t={t} />
            </div>
          </section>

          {/* SECTION 2 — CORE Control Layer */}
          <section className="pt-16 mt-16 border-t border-slate-800/70">
            <div className="flex flex-col gap-4">
              <div className="text-[12px] uppercase tracking-[0.30em] text-slate-500">{t.s2Eyebrow}</div>

              <div className="flex flex-col gap-3">
                <div className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">{t.s2Title}</div>
                <div className="text-base text-slate-400 max-w-3xl leading-relaxed">{t.s2Sub}</div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                  title={t.card1Title}
                  line={t.card1Line}
                  example={t.card1Example}
                  badge={t.card1Badge}
                  cta={t.card1Cta}
                />
                <Card
                  title={t.card2Title}
                  line={t.card2Line}
                  example={t.card2Example}
                  badge={t.card2Badge}
                  cta={t.card2Cta}
                />
                <Card
                  title={t.card3Title}
                  line={t.card3Line}
                  example={t.card3Example}
                  badge={t.card3Badge}
                  cta={t.card3Cta}
                />
              </div>
            </div>
          </section>

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

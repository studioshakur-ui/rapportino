// src/pages/Landing.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { headerPill, themeIconBg, buttonPrimary } from "../ui/designSystem";

/* =========================================================
   LANG
   ========================================================= */
const LANGS = ["it", "fr", "en"];

const COPY = {
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
  },
};

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeGetInitialLang() {
  if (typeof window === "undefined") return "it";
  try {
    const l = window.localStorage.getItem("core-lang");
    if (l && LANGS.includes(l)) return l;
  } catch {}
  return "it";
}

/* =========================================================
   Electric Flow (SVG + WAAPI) — slow, industrial
   ========================================================= */
function ElectricFlow({ t }) {
  const dashRef = useRef(null);
  const sparkRef = useRef(null);

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

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    const dashEl = dashRef.current;
    const sparkEl = sparkRef.current;
    if (!dashEl || !sparkEl) return;

    const dashAnim = dashEl.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -320 }],
      { duration: 6800, iterations: Infinity, easing: "linear" }
    );

    const sparkAnim = sparkEl.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -680 }],
      { duration: 5200, iterations: Infinity, easing: "linear" }
    );

    const onVis = () => {
      const visible = document.visibilityState === "visible";
      if (visible) {
        dashAnim.play();
        sparkAnim.play();
      } else {
        dashAnim.pause();
        sparkAnim.pause();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      dashAnim.cancel();
      sparkAnim.cancel();
    };
  }, []);

  return (
    <div className="relative">
      <style>{`
        .metalPanel {
          position: relative;
          border-radius: 20px;
          background:
            radial-gradient(900px 320px at 18% 18%, rgba(56,189,248,0.08), transparent 58%),
            radial-gradient(720px 260px at 84% 24%, rgba(16,185,129,0.05), transparent 64%),
            linear-gradient(to bottom, rgba(2,6,23,0.52), rgba(2,6,23,0.26));
          border: 1px solid rgba(148,163,184,0.18);
          box-shadow:
            0 28px 90px rgba(2,6,23,0.72),
            inset 0 1px 0 rgba(226,232,240,0.06),
            inset 0 -1px 0 rgba(2,6,23,0.55);
          overflow: hidden;
        }
        .metalPanel::before {
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
        .metalPanel::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 20px;
          background-image:
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.018) 0px,
              rgba(255,255,255,0.018) 1px,
              rgba(0,0,0,0.018) 2px,
              rgba(0,0,0,0.018) 3px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.012) 0px,
              rgba(255,255,255,0.012) 1px,
              rgba(0,0,0,0.012) 2px,
              rgba(0,0,0,0.012) 3px
            );
          opacity: 0.35;
        }
        .softGlow {
          filter: drop-shadow(0 0 10px rgba(56,189,248,0.14))
                  drop-shadow(0 0 22px rgba(56,189,248,0.08));
        }
      `}</style>

      <div className="metalPanel p-6 md:p-7">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="min-w-0 text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {t.spec}
          </div>

          {/* Badge “système” (démo-grade, discret) */}
          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-[0.20em] text-slate-400">
              CORE 1.0
            </span>
            <span className="text-[11px] uppercase tracking-[0.20em] text-sky-200">
              LIVE
            </span>
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
              <stop offset="0%" stopColor="rgba(56,189,248,0.22)" />
              <stop offset="55%" stopColor="rgba(56,189,248,0.92)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.22)" />
            </linearGradient>
          </defs>

          <path d={d} fill="none" stroke="url(#railGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
          <path
            d={d}
            fill="none"
            stroke="rgba(56,189,248,0.10)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.55"
            className="softGlow"
          />
          <path
            ref={dashRef}
            d={d}
            fill="none"
            stroke="url(#currentGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="34 52"
            strokeDashoffset="0"
            opacity="0.95"
            className="softGlow"
          />
          <path
            ref={sparkRef}
            d={d}
            fill="none"
            stroke="rgba(226,232,240,0.92)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="3 180"
            strokeDashoffset="0"
            opacity="0.78"
            className="softGlow"
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

function Node({ x, y, label, sub }) {
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r="9.5"
        fill="rgba(2,6,23,0.92)"
        stroke="rgba(56,189,248,0.72)"
        strokeWidth="2"
      />
      <circle
        cx={x}
        cy={y}
        r="5"
        fill="rgba(2,6,23,0.98)"
        stroke="rgba(226,232,240,0.22)"
        strokeWidth="1"
      />
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
   LANDING — Démo-grade (header CNCS + CTA accesso)
   ========================================================= */
export default function Landing() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const [lang, setLang] = useState(() => safeGetInitialLang());
  const t = COPY[lang] || COPY.it;

  useEffect(() => {
    try {
      window.localStorage.setItem("core-lang", lang);
    } catch {}
  }, [lang]);

  // “Richiedi accesso” = posture institutionnelle (pas “demo”)
  const accessHref = useMemo(() => {
    const subject = encodeURIComponent("Richiesta accesso CORE");
    const body = encodeURIComponent(
      "Buongiorno,\n\nVorrei richiedere l’accesso a CORE.\n\nNome:\nRuolo:\nCantiere/Sito:\nTelefono:\n\nGrazie."
    );
    return `mailto:info@core.local?subject=${subject}&body=${body}`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* BACKDROP: profondeur + grain global (stable, non flashy) */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1200px 620px at 14% 18%, rgba(56,189,248,0.08), transparent 62%),
            radial-gradient(900px 520px at 78% 22%, rgba(16,185,129,0.05), transparent 64%),
            radial-gradient(900px 520px at 48% 86%, rgba(139,92,246,0.035), transparent 66%),
            linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.40))
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
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

      {/* HEADER — aligné CNCSTopbar (rounded + blur + border) */}
      <header className="relative z-20 px-3 pt-3">
        <div className="mx-auto max-w-7xl">
          <div className="no-print sticky top-0 z-30 rounded-2xl border border-slate-800 bg-[#050910]/70 backdrop-blur px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className={cx(headerPill(true), "border-slate-700 text-slate-200 bg-slate-900/40")}>
                  <span className={themeIconBg(true, "sky")}>●</span>
                  <span>CORE</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">
                  {t.eyebrow}
                </div>
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
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-6 space-y-9">
              <div className="space-y-3">
                <div className="text-[12px] uppercase tracking-[0.30em] text-slate-500">{t.eyebrow}</div>

                <h1 className="text-7xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
                  {t.title}
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
                    "text-sm text-slate-200 hover:bg-slate-950/70 transition"
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

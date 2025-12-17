import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* =========================================================
   LANGUAGE
   ========================================================= */
const LANGS = ["it", "fr", "en"];

const COPY = {
  it: {
    eyebrow: "Sistema operativo di cantiere",
    title: "CORE",
    subtitle: "controllo operativo nativo",
    lines: ["Un solo dato.", "Dal cantiere alla direzione.", "Senza ricostruzione."],
    access: "Accesso riservato · ruoli autorizzati",
    flow: "Flusso operativo",
    capo: "Origine",
    ufficio: "Controllo",
    drive: "Certificazione",
    direzione: "Sintesi",
    modules: "Moduli CORE",
    closureTitle: "CORE non è un software.",
    closureSub: "È un organo operativo del cantiere.",
    closureText:
      "Non sostituisce le persone. Stabilizza il dato. Rende la decisione leggibile e auditabile.",
    login: "Accedi",
    loginFull: "Accedi al sistema",
    footer:
      "Accesso riservato a personale interno e partner autorizzati.",
  },
  fr: {
    eyebrow: "Système opérationnel de chantier",
    title: "CORE",
    subtitle: "contrôle opérationnel natif",
    lines: ["Une seule donnée.", "Du chantier à la direction.", "Sans reconstruction."],
    access: "Accès réservé · rôles autorisés",
    flow: "Flux opérationnel",
    capo: "Origine",
    ufficio: "Contrôle",
    drive: "Certification",
    direzione: "Synthèse",
    modules: "Modules CORE",
    closureTitle: "CORE n’est pas un logiciel.",
    closureSub: "C’est un organe opérationnel du chantier.",
    closureText:
      "Il ne remplace pas les personnes. Il stabilise la donnée. Il rend la décision lisible et traçable.",
    login: "Accéder",
    loginFull: "Accéder au système",
    footer:
      "Accès réservé au personnel interne et aux partenaires autorisés.",
  },
  en: {
    eyebrow: "Operational shipyard system",
    title: "CORE",
    subtitle: "native operational control",
    lines: ["One single data.", "From shipyard to direction.", "No reconstruction."],
    access: "Restricted access · authorized roles",
    flow: "Operational flow",
    capo: "Origin",
    ufficio: "Control",
    drive: "Certification",
    direzione: "Synthesis",
    modules: "CORE modules",
    closureTitle: "CORE is not software.",
    closureSub: "It is an operational organ of the shipyard.",
    closureText:
      "It does not replace people. It stabilizes data. It makes decisions readable and auditable.",
    login: "Login",
    loginFull: "Access the system",
    footer:
      "Restricted access to internal staff and authorized partners.",
  },
};

/* =========================================================
   HELPERS
   ========================================================= */
function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem("core-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return "dark";
}

function getInitialLang() {
  try {
    const l = window.localStorage.getItem("core-lang");
    if (LANGS.includes(l)) return l;
  } catch {}
  return "it";
}

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* =========================================================
   LANDING
   ========================================================= */
export default function Landing() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [lang, setLang] = useState(getInitialLang);
  const isDark = theme === "dark";
  const t = COPY[lang];

  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
      window.localStorage.setItem("core-lang", lang);
    } catch {}
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme, isDark, lang]);

  const toggleTheme = () =>
    setTheme((p) => (p === "dark" ? "light" : "dark"));

  return (
    <div
      className={cx(
        "min-h-screen flex flex-col transition-colors duration-300",
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* =====================================================
         HEADER
         ===================================================== */}
      <header
        className={cx(
          "border-b px-4 md:px-8 py-3",
          isDark ? "border-slate-800" : "border-slate-200"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] tracking-[0.22em] uppercase text-emerald-400">
              CNCS · CORE
            </span>
            <span className="hidden md:inline text-[10px] text-slate-500">
              {t.eyebrow}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language */}
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em]">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cx(
                    "px-2 py-1 rounded",
                    l === lang
                      ? "text-sky-400"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className={cx(
                "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]",
                isDark
                  ? "border-slate-700 bg-slate-900 text-slate-300"
                  : "border-slate-300 bg-white text-slate-600"
              )}
            >
              {isDark ? "Dark" : "Light"}
            </button>

            {/* Login */}
            <Link
              to="/login"
              className="rounded-full bg-sky-500 hover:bg-sky-400 text-white px-4 py-1.5 text-[11px] font-medium shadow-[0_10px_30px_rgba(56,189,248,0.35)]"
            >
              {t.login}
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
         MAIN
         ===================================================== */}
      <main className="flex-1 px-4 md:px-8 py-16">
        <div className="max-w-6xl mx-auto space-y-24">
          {/* HERO */}
          <section className="space-y-6">
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                {t.eyebrow}
              </div>
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
                {t.title}
              </h1>
              <div className="text-xl md:text-2xl text-slate-400">
                {t.subtitle}
              </div>
            </div>

            <div className="space-y-1 text-lg md:text-xl">
              {t.lines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>

            <div className="pt-4 flex items-center gap-4">
              <Link
                to="/login"
                className="rounded-lg bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 text-sm font-medium shadow-[0_18px_45px_rgba(56,189,248,0.35)]"
              >
                {t.loginFull}
              </Link>
              <span className="text-[11px] text-slate-500">{t.access}</span>
            </div>
          </section>

          {/* FLOW */}
          <section className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              {t.flow}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="border rounded-xl p-4">{`CAPO — ${t.capo}`}</div>
              <div className="border rounded-xl p-4">{`UFFICIO — ${t.ufficio}`}</div>
              <div className="border rounded-xl p-4">{`CORE DRIVE — ${t.drive}`}</div>
              <div className="border rounded-xl p-4">{`DIREZIONE — ${t.direzione}`}</div>
            </div>
          </section>

          {/* CLOSURE */}
          <section className="pt-12 border-t border-slate-800/70 space-y-4">
            <div className="text-3xl md:text-4xl font-semibold">
              {t.closureTitle}
              <br />
              {t.closureSub}
            </div>
            <div className="text-sm text-slate-400 max-w-2xl">
              {t.closureText}
            </div>
          </section>
        </div>
      </main>

      {/* =====================================================
         FOOTER
         ===================================================== */}
      <footer className="px-4 md:px-8 py-6 text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex justify-between">
          <span>{t.footer}</span>
          <span>CORE · CNCS</span>
        </div>
      </footer>
    </div>
  );
}

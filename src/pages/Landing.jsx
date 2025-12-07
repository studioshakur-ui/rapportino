// src/pages/Landing.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Charge le thème initial en lisant localStorage ou la préférence système.
 */
function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem("core-theme");
    if (stored === "dark" || stored === "light") return stored;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    // ignore
  }
  return "dark";
}

/**
 * Contenu détaillé des modules pour le panneau “détail”.
 */
function getModuleDetail(openModule) {
  if (!openModule) {
    return {
      accentBorder: "border-sky-500",
      accentPill:
        "bg-sky-500/10 text-sky-300 border-sky-500/60 shadow-[0_0_18px_rgba(56,189,248,0.25)]",
      accentTag: "text-sky-300",
      title: "CORE — il cervello digitale del tuo cantiere.",
      subtitle:
        "Un unico sistema che collega squadre, ufficio e direzione: rapportini, INCA, archivio certificato e KPI.",
      sections: [
        {
          heading: "Cosa risolve",
          points: [
            "Spariscono i fogli sparsi e i report non allineati.",
            "Capo, Ufficio e Direzione vedono gli stessi dati.",
            "Storico sempre coerente, pronto per audit e consuntivi.",
          ],
        },
        {
          heading: "Perché è diverso",
          points: [
            "Progettato direttamente sul campo (Fincantieri, cantieri complessi).",
            "Pensato per il ruolo: Capo, Ufficio, Direzione.",
            "Pronto a integrare moduli avanzati come Percorso · Cavi.",
          ],
        },
      ],
    };
  }

  if (openModule === "RAPPORTINO") {
    return {
      accentBorder: "border-emerald-500",
      accentPill:
        "bg-emerald-500/10 text-emerald-300 border-emerald-500/60 shadow-[0_0_18px_rgba(16,185,129,0.25)]",
      accentTag: "text-emerald-300",
      title: "Rapportino · Capo — velocità, precisione, niente errori.",
      subtitle:
        "Compilazione guidata per il Capo: squadre, attività, ore e note tecniche in pochi click.",
      sections: [
        {
          heading: "Cosa vede il Capo",
          points: [
            "Squadre già configurate per nave e ruolo.",
            "Categorie, commessa e costr già impostati.",
            "Note tecniche e anomalie subito evidenziate.",
          ],
        },
        {
          heading: "Cosa arriva all'Ufficio",
          points: [
            "Dati puliti, firmati e già strutturati.",
            "Niente trascrizioni manuali da carta a Excel.",
            "Storico giornaliero pronto per consuntivi e audit.",
          ],
        },
      ],
    };
  }

  if (openModule === "UFFICO") {
    return {
      accentBorder: "border-sky-500",
      accentPill:
        "bg-sky-500/10 text-sky-300 border-sky-500/60 shadow-[0_0_18px_rgba(56,189,248,0.25)]",
      accentTag: "text-sky-300",
      title: "Ufficio · Controllo — validazione, note di ritorno, archivio.",
      subtitle:
        "Un pannello unico per controllare i rapportini, gestire le note di ritorno e chiudere le giornate.",
      sections: [
        {
          heading: "Perché è potente",
          points: [
            "Lista completa dei rapportini per data, nave, Capo.",
            "Stato immediato: bozza, validato, archiviato.",
            "Note di ritorno tracciate per audit e formazione.",
          ],
        },
        {
          heading: "Impatto sul lavoro",
          points: [
            "Riduce i tempi di quadratura fine mese.",
            "Semplifica verifiche con Direzione e clienti.",
            "Crea automaticamente uno storico certificato.",
          ],
        },
      ],
    };
  }

  if (openModule === "ARCHIVIO") {
    return {
      accentBorder: "border-fuchsia-500",
      accentPill:
        "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/60 shadow-[0_0_18px_rgba(217,70,239,0.25)]",
      accentTag: "text-fuchsia-300",
      title: "Archivio · Registro — la memoria lunga del cantiere.",
      subtitle:
        "Storico certificato dei rapportini: solo lettura, pronto per audit, contabilità e analisi.",
      sections: [
        {
          heading: "Cosa contiene",
          points: [
            "Tutte le giornate validate, con dati immutabili.",
            "Filtri per nave, periodo, costr, commessa.",
            "Timeline per rivedere periodi critici di lavoro.",
          ],
        },
        {
          heading: "Per chi è",
          points: [
            "Direzione, HSE, ufficio personale e controllo di gestione.",
            "Clienti che chiedono evidenze di avanzamento.",
            "Audit interni ed esterni.",
          ],
        },
      ],
    };
  }

  if (openModule === "PERCORSO") {
    return {
      accentBorder: "border-amber-500",
      accentPill:
        "bg-amber-500/10 text-amber-300 border-amber-500/60 shadow-[0_0_18px_rgba(245,158,11,0.25)]",
      accentTag: "text-amber-300",
      title: "Percorso · Cavi — dal disegno al metro posato.",
      subtitle:
        "Modulo avanzato (coming soon) per collegare INCA, percorsi e metri posati: visione tempo reale dell’avanzamento cavi.",
      sections: [
        {
          heading: "Cosa porterà",
          points: [
            "Vista per nave, zona e tratta con percentuali di completamento.",
            "Confronto teorico / posato, metri mancanti per zona.",
            "Supporto decisionale per squadre e priorità giornaliere.",
          ],
        },
        {
          heading: "Visione CNCS",
          points: [
            "Passo verso un sistema cognitivo di controllo navale.",
            "Dati pronti per KPI di produttività e analisi avanzate.",
            "Integrazione naturale con Archivio e Direzione.",
          ],
        },
      ],
    };
  }

  return getModuleDetail(null);
}

export default function Landing() {
  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";
  const [openModule, setOpenModule] = useState("RAPPORTINO");

  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, [theme, isDark]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const moduleDetail = getModuleDetail(openModule);

  const containerBg = isDark ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900";
  const panelBg = isDark ? "bg-slate-900/80" : "bg-slate-100";
  const borderColor = isDark ? "border-slate-800" : "border-slate-200";
  const subtleText = isDark ? "text-slate-400" : "text-slate-600";

  return (
    <div
      className={[
        "min-h-screen",
        "flex flex-col",
        "transition-colors duration-300",
        containerBg,
      ].join(" ")}
    >
      {/* HEADER TOP BAR */}
      <header className="border-b border-slate-800/70 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand + CNCS */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[11px] tracking-[0.19em] uppercase text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
            Sistema centrale di cantiere
          </div>
          <div className="hidden md:flex flex-col text-[11px] leading-snug text-slate-500">
            <span>SHAKUR Engineering Labs · CNCS · CORE</span>
          </div>
        </div>

        {/* Right side: clock + theme + login */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="hidden sm:flex flex-col items-end text-slate-500">
            <span>0258 · ora di sistema</span>
            <span className="text-[10px]">
              Cantieri complessi · nave, bordo, linea
            </span>
          </div>

          {/* Dark / Light toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={[
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
              isDark
                ? "border-slate-700 bg-slate-900 text-slate-200"
                : "border-slate-300 bg-white text-slate-700",
            ].join(" ")}
          >
            <span
              className={[
                "inline-flex h-3 w-3 items-center justify-center rounded-full text-[9px]",
                isDark ? "bg-slate-800" : "bg-amber-200",
              ].join(" ")}
            >
              {isDark ? "🌑" : "☀️"}
            </span>
            <span className="uppercase tracking-[0.16em]">
              {isDark ? "Dark" : "Light"}
            </span>
          </button>

          <Link
            to="/login"
            className="rounded-full bg-sky-500 hover:bg-sky-400 text-white px-4 py-1.5 text-[11px] font-medium shadow-[0_8px_24px_rgba(56,189,248,0.35)]"
          >
            Accedi
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 px-4 md:px-8 py-8 md:py-10">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* HERO + MINI KPI */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-8 items-start">
            {/* Left hero */}
            <div className="space-y-5">
              <div>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  CORE — controllo totale, precisione navale.
                </h1>
                <p className={["mt-2 text-sm", subtleText].join(" ")}>
                  Progettato per cantieri complessi. Una sola piattaforma per
                  rapportini, squadre, cavi, avanzamento e audit — collegando
                  Capo, Ufficio e Direzione in tempo quasi reale.
                </p>
              </div>

              {/* Flow Capo → Ufficio → Archivio → Direzione */}
              <div
                className={[
                  "rounded-2xl border",
                  borderColor,
                  panelBg,
                  "px-4 py-3 md:px-5 md:py-4",
                  "flex flex-col gap-3",
                ].join(" ")}
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Flusso dati · dal campo alla direzione
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/60 px-3 py-1 text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Capo · Rapportino
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/60 px-3 py-1 text-sky-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    Ufficio · Controllo
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/60 px-3 py-1 text-fuchsia-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                    Archivio · Registro
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/60 px-3 py-1 text-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Direzione · KPI & Presenze
                  </span>
                </div>
              </div>

              {/* CTA principale */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className="rounded-md bg-sky-500 hover:bg-sky-400 text-white px-5 py-2 text-[14px] font-medium shadow-[0_14px_40px_rgba(56,189,248,0.45)]"
                >
                  Accedi con credenziali interne
                </Link>
                <p className={["text-[11px]", subtleText].join(" ")}>
                  Accesso riservato · CORE è in uso reale su cantiere.
                </p>
              </div>
            </div>

            {/* Right mini KPI panel */}
            <div
              className={[
                "rounded-2xl border",
                borderColor,
                panelBg,
                "px-4 py-4 md:px-5 md:py-5",
                "space-y-4",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Panoramica sintetica oggi
                  </div>
                  <div className="text-xs text-slate-400">
                    Dati di esempio forniti da ARCHIVIO · modulo CNCS.
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-sky-500/60 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-200 uppercase tracking-[0.18em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                  Sync live
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Presenze oggi
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-semibold">310</span>
                    <span className="text-[11px] text-slate-500">
                      / 330 previsti
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div className="h-full w-[94%] bg-emerald-400" />
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    94% copertura su 3 cantieri.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Rapportini validati
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-semibold">28</span>
                    <span className="text-[11px] text-slate-500">
                      / 32 attesi
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div className="h-full w-[87%] bg-sky-400" />
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    4 giornate ancora da chiudere in Ufficio.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 col-span-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Stato INCA / Percorso (mock)
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-semibold">72%</span>
                    <span className="text-[11px] text-slate-500">
                      metri posati vs teorici
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div className="h-full w-[72%] bg-amber-400" />
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    Dati INCA pronti per il modulo Percorso · Cavi.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* MODULES GRID + DETAIL PANEL */}
          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 items-start">
            {/* Cartes modules */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold tracking-[0.16em] uppercase text-slate-500">
                Moduli principali
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RAPPORTINO */}
                <button
                  type="button"
                  onClick={() => setOpenModule("RAPPORTINO")}
                  className={[
                    "text-left rounded-2xl border px-4 py-4 space-y-2 transition",
                    panelBg,
                    openModule === "RAPPORTINO"
                      ? "border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.8),0_20px_60px_rgba(15,23,42,0.9)]"
                      : borderColor +
                        " hover:border-emerald-500/50 hover:bg-slate-900/60",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold">RAPPORTINO · CAPO</div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 uppercase tracking-[0.16em]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Attivo
                    </span>
                  </div>
                  <p className={["text-xs", subtleText].join(" ")}>
                    Compilazione veloce delle giornate: squadre, attività, ore e
                    note tecniche, già allineate con le esigenze dell&apos;Ufficio.
                  </p>
                  <span className="text-[11px] text-emerald-300">
                    Clicca per dettagli →
                  </span>
                </button>

                {/* UFFICIO */}
                <button
                  type="button"
                  onClick={() => setOpenModule("UFFICO")}
                  className={[
                    "text-left rounded-2xl border px-4 py-4 space-y-2 transition",
                    panelBg,
                    openModule === "UFFICO"
                      ? "border-sky-500/70 shadow-[0_0_0_1px_rgba(56,189,248,0.8),0_20px_60px_rgba(15,23,42,0.9)]"
                      : borderColor +
                        " hover:border-sky-500/50 hover:bg-slate-900/60",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold">UFFICIO · CONTROLLO</div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300 uppercase tracking-[0.16em]">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      Attivo
                    </span>
                  </div>
                  <p className={["text-xs", subtleText].join(" ")}>
                    Verifica, approvazioni e note di ritorno su un’unica vista:
                    niente più report sparsi tra mail e fogli Excel.
                  </p>
                  <span className="text-[11px] text-sky-300">
                    Clicca per dettagli →
                  </span>
                </button>

                {/* ARCHIVIO */}
                <button
                  type="button"
                  onClick={() => setOpenModule("ARCHIVIO")}
                  className={[
                    "text-left rounded-2xl border px-4 py-4 space-y-2 transition",
                    panelBg,
                    openModule === "ARCHIVIO"
                      ? "border-fuchsia-500/70 shadow-[0_0_0_1px_rgba(217,70,239,0.8),0_20px_60px_rgba(15,23,42,0.9)]"
                      : borderColor +
                        " hover:border-fuchsia-500/50 hover:bg-slate-900/60",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold">ARCHIVIO · REGISTRO</div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/70 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] text-fuchsia-300 uppercase tracking-[0.16em]">
                      <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                      Cuore dati
                    </span>
                  </div>
                  <p className={["text-xs", subtleText].join(" ")}>
                    Storico completo del cantiere: giornate, squadre e note,
                    sempre disponibili per controlli, audit e consuntivi.
                  </p>
                  <span className="text-[11px] text-fuchsia-300">
                    Clicca per dettagli →
                  </span>
                </button>

                {/* PERCORSO */}
                <button
                  type="button"
                  onClick={() => setOpenModule("PERCORSO")}
                  className={[
                    "text-left rounded-2xl border px-4 py-4 space-y-2 transition",
                    panelBg,
                    openModule === "PERCORSO"
                      ? "border-amber-500/70 shadow-[0_0_0_1px_rgba(245,158,11,0.8),0_20px_60px_rgba(15,23,42,0.9)]"
                      : borderColor +
                        " hover:border-amber-500/50 hover:bg-slate-900/60",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold">PERCORSO · CAVI</div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/70 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 uppercase tracking-[0.16em]">
                      Coming soon
                    </span>
                  </div>
                  <p className={["text-xs", subtleText].join(" ")}>
                    Dal disegno al metro posato: modulo avanzato basato sui dati
                    INCA per seguire l’avanzamento cavi per nave e zona.
                  </p>
                  <span className="text-[11px] text-amber-300">
                    Clicca per dettagli →
                  </span>
                </button>
              </div>
            </div>

            {/* Panneau de détail */}
            <aside
              className={[
                "rounded-2xl border px-4 py-4 md:px-5 md:py-5 space-y-3",
                panelBg,
                moduleDetail.accentBorder,
              ].join(" ")}
            >
              <div className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] mb-1">
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    moduleDetail.accentTag === "text-emerald-300"
                      ? "bg-emerald-400"
                      : moduleDetail.accentTag === "text-sky-300"
                      ? "bg-sky-400"
                      : moduleDetail.accentTag === "text-fuchsia-300"
                      ? "bg-fuchsia-400"
                      : "bg-amber-400",
                  ].join(" ")}
                />
                <span className={moduleDetail.accentTag}>
                  Dettaglio modulo
                </span>
              </div>

              <h3 className="text-lg font-semibold">{moduleDetail.title}</h3>
              <p className={["text-xs", subtleText].join(" ")}>
                {moduleDetail.subtitle}
              </p>

              <div className="mt-2 space-y-3 text-xs">
                {moduleDetail.sections.map((section, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="font-semibold text-slate-200">
                      {section.heading}
                    </div>
                    <ul className="space-y-1 list-disc list-inside text-slate-400">
                      {section.points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          {/* FOOTER / INFO */}
          <footer className="pt-4 border-t border-slate-800/70 mt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] text-slate-500">
              <div>
                CORE è in uso reale su cantiere. Accesso riservato a personale
                interno e partner autorizzati.
              </div>
              <div className="text-slate-600">
                Trieste · Riva Trigoso · La Spezia · Dakar — SHAKUR Engineering.
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

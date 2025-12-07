// src/pages/Landing.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getInitialTheme,
  pageBg,
  headerPill,
  buttonPrimary,
} from "../ui/designSystem";

export default function Landing() {
  const [openModule, setOpenModule] = useState(null);
  const [now, setNow] = useState(new Date());
  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    console.log(
      "%cCORE — a SHAKUR Engineering System",
      "color:#22d3ee;font-weight:bold;font-size:14px;"
    );
    console.log(
      "%cPrecision. Discipline. Zero error.",
      "color:#64748b;font-size:12px;"
    );
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const timeLabel = now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  //───────────────────────── MODALE MODULES ─────────────────────────
  const Modal = () => {
    if (!openModule) return null;

    let title = "";
    let subtitle = "";
    let sections = [];
    let accent = {
      border: "border-emerald-500",
      pill: "bg-emerald-500/10 text-emerald-300 border-emerald-500/50",
      tag: "text-emerald-300",
    };

    if (openModule === "RAPPORTINO") {
      accent = {
        border: "border-emerald-500",
        pill: "bg-emerald-500/10 text-emerald-300 border-emerald-500/50",
        tag: "text-emerald-300",
      };
      title = "Rapportino · Capo — Giornata digitale, zero carta.";
      subtitle =
        "Dal ponte di lavoro al PDF ufficiale in meno di 2 minuti. Pensato per chi chiude davvero la giornata a bordo.";
      sections = [
        {
          heading: "Cosa puoi fare",
          points: [
            "Compilare il rapportino con attività, ore, squadre, note e prodotto totale.",
            "Usare modelli preimpostati per nave, zona, commessa e ruolo.",
            "Segnalare extra, fermate o interferenze.",
            "Generare un PDF pulito e ufficiale.",
          ],
        },
        {
          heading: "Per chi è pensato",
          points: ["Capo squadra", "Responsabili di zona"],
        },
        {
          heading: "Perché ti aiuta",
          points: [
            "Zero foto WhatsApp.",
            "Meno errori.",
            "Allineamento immediato con Ufficio e Direzione.",
          ],
        },
      ];
    } else if (openModule === "UFFICIO") {
      accent = {
        border: "border-sky-500",
        pill: "bg-sky-500/10 text-sky-300 border-sky-500/50",
        tag: "text-sky-300",
      };
      title = "Ufficio · Controllo — Stato reale, niente Excel volanti.";
      subtitle =
        "Validazione, note di ritorno e archivio digitale allineato al cantiere. Pensato per chi deve dare risposte veloci.";
      sections = [
        {
          heading: "Cosa puoi fare",
          points: [
            "Vedere tutti i rapportini giornalieri del cantiere.",
            "Gestire stati, note di ritorno, correzioni.",
            "Filtrare per nave, commessa, capo, data.",
            "Archiviare in modo strutturato e certificato.",
          ],
        },
        {
          heading: "Per chi è pensato",
          points: ["Ufficio produzione", "Responsabili di area"],
        },
        {
          heading: "Perché ti aiuta",
          points: [
            "Meno mail e PDF sparsi.",
            "Storico unico per audit.",
            "Allineamento continuo con Capo e Direzione.",
          ],
        },
      ];
    } else if (openModule === "ARCHIVIO") {
      accent = {
        border: "border-fuchsia-500",
        pill: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/50",
        tag: "text-fuchsia-300",
      };
      title = "Archivio · Registro — Memoria lunga del cantiere.";
      subtitle =
        "Uno spazio unico dove restano i dati certificati delle giornate di lavoro. Pensato per audit, confronti e analisi.";
      sections = [
        {
          heading: "Cosa puoi fare",
          points: [
            "Consultare lo storico dei rapportini v1.",
            "Filtrare per nave, commessa, costruttore, capo, periodo.",
            "Esportare CSV o PDF per analisi esterne.",
            "Confrontare commesse e periodi diversi.",
          ],
        },
        {
          heading: "Per chi è pensato",
          points: ["Direzione", "Qualità", "HSE", "Responsabili di commessa"],
        },
        {
          heading: "Perché ti aiuta",
          points: [
            "Hai una memoria certificata nel tempo.",
            "Riduci il rischio di errori o dati mancanti.",
            "Puoi rispondere velocemente a richieste interne o di cantiere.",
          ],
        },
      ];
    } else if (openModule === "PERCORSO") {
      accent = {
        border: "border-amber-500",
        pill: "bg-amber-500/10 text-amber-300 border-amber-500/50",
        tag: "text-amber-300",
      };
      title = "Percorso · Cavi — Dal disegno al metro posato.";
      subtitle =
        "Modulo pensato per collegare INCA, IPC e avanzamento reale cavi. Visuale nave, tratte, metri e tempi.";
      sections = [
        {
          heading: "Cosa potrà fare",
          points: [
            "Leggere INCA e IPC come base dati cavi.",
            "Mostrare percorsi cavo su layout nave.",
            "Calcolare metri previsti vs posati.",
            "Stimare tempi di posa per squadra.",
          ],
        },
        {
          heading: "Per chi è pensato",
          points: ["Ufficio tecnico", "Capo cantiere", "Direzione tecnica"],
        },
        {
          heading: "Visione",
          points: [
            "Ridurre differenze fra teoria (INCA) e realtà (posa).",
            "Dare una vista visiva sullo stato cavi.",
            "Integrare con CORE per avanzamento e costi.",
          ],
        },
      ];
    }

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div
          className={[
            "max-w-2xl w-full rounded-2xl border shadow-2xl p-6",
            isDark
              ? "bg-slate-950 border-slate-800"
              : "bg-white border-slate-200",
            accent.border,
          ].join(" ")}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div
                className={[
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] uppercase tracking-[0.18em]",
                  accent.pill,
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Modulo {openModule}
              </div>
              <h2 className="mt-3 text-xl font-semibold">{title}</h2>
              <p className="text-[13px] text-slate-400 mt-1">{subtitle}</p>
            </div>
            <button
              onClick={() => setOpenModule(null)}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              Chiudi ✕
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-4 text-[13px]">
            {sections.map(({ heading, points }) => (
              <div key={heading}>
                <h3 className={`font-semibold mb-1 ${accent.tag}`}>
                  {heading}
                </h3>
                <ul className="space-y-1 text-slate-300">
                  {points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500 mt-1" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 mt-4">
            Questa è una descrizione progettuale. Le funzionalità attive
            dipendono dal cantiere.
          </p>
        </div>
      </div>
    );
  };

  //───────────────────────── PAGE ─────────────────────────
  return (
    <div className={`${pageBg(isDark)} min-h-screen`}>
      {/* HEADER */}
      <header
        className={
          isDark
            ? "border-b border-slate-900 bg-slate-950/90 backdrop-blur"
            : "border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur"
        }
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* Left */}
          <div>
            <div className={headerPill(isDark)}>
              <span
                className={
                  isDark
                    ? "w-2 h-2 rounded-full bg-emerald-400"
                    : "w-2 h-2 rounded-full bg-emerald-600"
                }
              />
              <span>Sistema Centrale di Cantiere</span>
            </div>

            <div className="text-[11px] text-slate-500 font-mono mt-1">
              SHAKUR Engineering Labs • CNCS · CORE
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Heure + cantiere */}
            <div className="hidden sm:flex flex-col items-end text-[11px] text-slate-500">
              <span>{timeLabel} · ora di sistema</span>
              <span>Cantieri complessi · nave, bordo, linea</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={
                isDark
                  ? "rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-[11px]"
                  : "rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px]"
              }
            >
              {isDark ? "🌑 Dark" : "☀️ Light"}
            </button>

            {/* Login */}
            <Link
              to="/login"
              className={buttonPrimary(isDark, "text-[13px] px-4 py-2")}
            >
              Accedi
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-14">
        {/* HERO */}
        <section>
          <h1 className="text-4xl font-semibold mb-2">
            CORE
            <span className="ml-2 text-slate-400 text-2xl">
              — controllo totale, precisione navale.
            </span>
          </h1>
          <p className="text-[15px] text-slate-500 max-w-xl">
            Progettato per cantieri complessi. Una sola piattaforma per
            rapportini, squadre, cavi, avanzamento e audit.
          </p>
        </section>

        {/* MODULE LIST */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Moduli principali</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rapportino */}
            <button
              onClick={() => setOpenModule("RAPPORTINO")}
              className="rounded-xl p-4 bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-900 text-left"
            >
              <div className="flex justify-between mb-2">
                <span className="text-slate-200 font-semibold">
                  RAPPORTINO · CAPO
                </span>
                <span className="text-xs px-2 py-1 rounded-full border border-emerald-400 text-emerald-300">
                  Attivo
                </span>
              </div>
              <p className="text-slate-400 mb-1">
                Compilazione veloce. Squadre, attività, ore.
              </p>
              <p className="text-emerald-300 text-xs">
                Clicca per dettagli →
              </p>
            </button>

            {/* Ufficio */}
            <button
              onClick={() => setOpenModule("UFFICIO")}
              className="rounded-xl p-4 bg-slate-900 border border-slate-800 hover:border-sky-500 hover:bg-slate-900 text-left"
            >
              <div className="flex justify-between mb-2">
                <span className="text-slate-200 font-semibold">
                  UFFICIO · CONTROLLO
                </span>
                <span className="text-xs px-2 py-1 rounded-full border border-sky-400 text-sky-300">
                  Attivo
                </span>
              </div>
              <p className="text-slate-400 mb-1">
                Verifica, approvazioni, note di ritorno.
              </p>
              <p className="text-sky-300 text-xs">Clicca per dettagli →</p>
            </button>

            {/* Archivio */}
            <button
              onClick={() => setOpenModule("ARCHIVIO")}
              className="rounded-xl p-4 bg-slate-900 border border-slate-800 hover:border-fuchsia-500 hover:bg-slate-900 text-left shadow-[0_0_22px_rgba(15,23,42,0.4)]"
            >
              <div className="flex justify-between mb-2">
                <span className="text-slate-200 font-semibold">
                  ARCHIVIO · REGISTRO
                </span>
                <span className="text-xs px-2 py-1 rounded-full border border-fuchsia-500 text-fuchsia-300">
                  Cuore dati
                </span>
              </div>
              <p className="text-slate-300 mb-1">
                Storico completo del cantiere.
              </p>
              <p className="text-fuchsia-300 text-xs">
                Clicca per dettagli →
              </p>
            </button>

            {/* Percorso */}
            <button
              onClick={() => setOpenModule("PERCORSO")}
              className="rounded-xl p-4 bg-slate-900 border border-dashed border-slate-700 hover:border-amber-500 hover:bg-slate-900 text-left"
            >
              <div className="flex justify-between mb-2">
                <span className="text-slate-200 font-semibold">
                  PERCORSO · CAVI
                </span>
                <span className="text-xs px-2 py-1 rounded-full border border-amber-400 text-amber-300">
                  Coming Soon
                </span>
              </div>
              <p className="text-slate-400 mb-1">
                Dal disegno al metro posato.
              </p>
              <p className="text-amber-300 text-xs">Spec progettuale →</p>
            </button>
          </div>
        </section>

        {/* CTA BAS */}
        <section className="flex justify-between items-center flex-wrap gap-4">
          <p className="text-[14px] text-slate-500 max-w-lg">
            CORE è in uso reale su cantiere. Accesso riservato.
          </p>
          <Link
            to="/login"
            className={buttonPrimary(isDark, "text-[14px] px-5 py-2")}
          >
            Accedi con credenziali interne
          </Link>
        </section>
      </main>

      <Modal />
    </div>
  );
}

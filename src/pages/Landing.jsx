// src/pages/Landing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * THEME — initial value from localStorage or system preference.
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatLocalTime(d) {
  try {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}

function formatLocalDate(d) {
  try {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

/**
 * Module detail panel content (Direction-grade, no marketing).
 * IMPORTANT: No references to any external company or legacy naming.
 */
function getModuleDetail(openModule) {
  const common = {
    hint: "Accesso riservato · visibilità per ruoli autorizzati.",
  };

  if (!openModule || openModule === "CORE") {
    return {
      accentBorder: "border-sky-500/70",
      accentTag: "text-sky-300",
      title: "CORE — controllo operativo nativo.",
      subtitle:
        "Un solo dato attraversa i ruoli: origine (Capo), controllo (Ufficio), certificazione (CORE Drive), sintesi (Direzione).",
      sections: [
        {
          heading: "Cosa dimostra la landing",
          points: [
            "Stato sistema e coerenza del flusso.",
            "Segnali operativi (eventi, coperture, chiusure).",
            "Accesso e governance per ruoli.",
          ],
        },
        {
          heading: "Perché è un impianto",
          points: [
            "Dato nativo, non ricostruito a posteriori.",
            "Storico certificato e consultabile.",
            "Tracciabilità: chi ha fatto cosa, quando, su quale nave.",
          ],
        },
      ],
      ...common,
    };
  }

  if (openModule === "RAPPORTINO") {
    return {
      accentBorder: "border-emerald-500/70",
      accentTag: "text-emerald-300",
      title: "Rapportino · Capo — origine del dato operativo.",
      subtitle:
        "Il campo genera il dato: squadre, attività, ore, note tecniche. Se è pulito qui, è affidabile ovunque.",
      sections: [
        {
          heading: "Output operativo",
          points: [
            "Registrazione unica (no doppi inserimenti).",
            "Struttura coerente: nave, costr, commessa, ruolo.",
            "Note tecniche tracciate e riutilizzabili in audit.",
          ],
        },
        {
          heading: "Controlli impliciti",
          points: [
            "Segnali soft su valori anomali.",
            "Coerenza di compilazione per ruolo e giorno.",
            "Stati chiari (bozza → validato → certificato).",
          ],
        },
      ],
      ...common,
    };
  }

  if (openModule === "UFFICIO") {
    return {
      accentBorder: "border-sky-500/70",
      accentTag: "text-sky-300",
      title: "Ufficio · Controllo — validazione e ritorni.",
      subtitle:
        "Un pannello unico per controllare i rapportini e gestire note di ritorno sullo stesso dato nativo.",
      sections: [
        {
          heading: "Controllo",
          points: [
            "Lista per data, nave, capo, stato.",
            "Ritorni tracciati (audit & formazione).",
            "Chiusura giornata con evidenze, non interpretazioni.",
          ],
        },
        {
          heading: "Effetto sul sistema",
          points: [
            "Riduce ricostruzioni manuali.",
            "Accorcia tempi di quadratura.",
            "Prepara la base per sintesi Direzione coerenti.",
          ],
        },
      ],
      ...common,
    };
  }

  if (openModule === "INCA") {
    return {
      accentBorder: "border-emerald-500/70",
      accentTag: "text-emerald-300",
      title: "INCA — coerenza tecnica tra teorico e reale.",
      subtitle:
        "Allineamento tra liste cavi e stato operativo: visibilità su avanzamento e incoerenze da risolvere.",
      sections: [
        {
          heading: "Cosa porta",
          points: [
            "Vista tecnica strutturata (nave, commessa, costr).",
            "Stato e progress su dati importati (PDF/XLSX).",
            "Base solida per KPI tecnici e controllo qualità.",
          ],
        },
        {
          heading: "Perché conta",
          points: [
            "Riduce sorprese a fine fase.",
            "Rende misurabile l’avanzamento reale.",
            "Abilita decisioni operative basate su evidenze.",
          ],
        },
      ],
      ...common,
    };
  }

  if (openModule === "DRIVE") {
    return {
      accentBorder: "border-fuchsia-500/70",
      accentTag: "text-fuchsia-300",
      title: "CORE Drive — archivio certificato del cantiere.",
      subtitle:
        "Memoria lunga: documenti e rapportini storici consultabili senza toccare l’operativo corrente.",
      sections: [
        {
          heading: "Garanzie",
          points: [
            "Immutabilità post-validazione (solo lettura).",
            "Filtri e ricerca per nave/periodo/costr/commessa.",
            "Evidenze pronte per audit e consuntivi.",
          ],
        },
        {
          heading: "Per la Direzione",
          points: [
            "Riduce il rumore informativo.",
            "Permette analisi e decisione su un dato stabile.",
            "Storicizza processi e responsabilità.",
          ],
        },
      ],
      ...common,
    };
  }

  return getModuleDetail("CORE");
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Pill({ tone = "neutral", children }) {
  const map = {
    neutral: "border-slate-700/70 bg-slate-900/50 text-slate-200",
    ok: "border-emerald-500/60 bg-emerald-500/10 text-emerald-200",
    warn: "border-amber-500/60 bg-amber-500/10 text-amber-200",
    info: "border-sky-500/60 bg-sky-500/10 text-sky-200",
    mag: "border-fuchsia-500/60 bg-fuchsia-500/10 text-fuchsia-200",
  };
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] tracking-[0.16em] uppercase",
        map[tone] || map.neutral
      )}
    >
      {children}
    </span>
  );
}

function Dot({ tone = "ok" }) {
  const map = {
    ok: "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]",
    warn: "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]",
    info: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.85)]",
    mag: "bg-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.85)]",
    neutral: "bg-slate-300/70 shadow-[0_0_10px_rgba(148,163,184,0.35)]",
  };
  return <span className={classNames("h-1.5 w-1.5 rounded-full", map[tone] || map.neutral)} />;
}

export default function Landing() {
  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";
  const [openModule, setOpenModule] = useState("CORE");

  // A small "heartbeat" clock that looks like a real system (without being noisy).
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

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

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const moduleDetail = useMemo(() => getModuleDetail(openModule), [openModule]);

  // Visual tokens
  const containerBg = isDark ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900";
  const panelBg = isDark ? "bg-slate-900/60" : "bg-white";
  const panelBgStrong = isDark ? "bg-slate-950/70" : "bg-white";
  const borderColor = isDark ? "border-slate-800/80" : "border-slate-200";
  const subtleText = isDark ? "text-slate-400" : "text-slate-600";
  const subtleText2 = isDark ? "text-slate-500" : "text-slate-500";
  const hardText = isDark ? "text-slate-100" : "text-slate-900";
  const glow = isDark
    ? "shadow-[0_30px_120px_rgba(2,6,23,0.85)]"
    : "shadow-[0_30px_120px_rgba(2,6,23,0.12)]";

  // Mock signals (designed to look like a cockpit, not marketing)
  const signals = useMemo(() => {
    const seed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const presenze = 330;
    const presenti = clamp(300 + (seed % 18), 0, presenze);
    const copertura = Math.round((presenti / presenze) * 100);

    const attesi = 32;
    const validati = clamp(26 + (seed % 7), 0, attesi);
    const chiudere = clamp(attesi - validati, 0, attesi);

    const inca = clamp(68 + (seed % 9), 0, 100);

    // Very small deterministic event feed
    const events = [
      { t: "SYNC", label: "Heartbeat · sync attiva", tone: "info" },
      { t: "RPT", label: "Rapportino validato · evidenza registrata", tone: "ok" },
      { t: "UFC", label: "Ufficio · chiusura giornata in corso", tone: "warn" },
      { t: "ARC", label: "CORE Drive · storico aggiornato", tone: "mag" },
    ];
    const e = events[seed % events.length];

    return {
      presenti,
      presenze,
      copertura,
      validati,
      attesi,
      chiudere,
      inca,
      event: e,
      build: `CNCS-${String((seed % 9999) + 1).padStart(4, "0")}`,
      clock: formatLocalTime(now),
      date: formatLocalDate(now),
    };
  }, [now]);

  return (
    <div className={classNames("min-h-screen flex flex-col transition-colors duration-300", containerBg)}>
      {/* TOP BAR */}
      <header className={classNames("border-b px-4 md:px-8 py-3", borderColor)}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1">
              <Dot tone="ok" />
              <span className="text-[11px] tracking-[0.19em] uppercase text-emerald-200">
                CNCS · CORE
              </span>
            </div>

            <div className="hidden md:flex flex-col min-w-0">
              <div className={classNames("text-[11px] leading-snug truncate", subtleText2)}>
                Sistema centrale di controllo cantiere
              </div>
              <div className={classNames("text-[10px] leading-snug truncate", subtleText2)}>
                Build {signals.build} · {signals.date} · {signals.clock}
              </div>
            </div>
          </div>

          {/* Right: status + theme + login */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2">
              <Pill tone="info">
                <Dot tone="info" />
                <span>SYNC</span>
                <span className="tracking-normal text-[11px] text-sky-200/80">ATTIVA</span>
              </Pill>
              <Pill tone="neutral">
                <Dot tone="neutral" />
                <span>STATO</span>
                <span className="tracking-normal text-[11px] text-slate-200/80">STABILE</span>
              </Pill>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className={classNames(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]",
                isDark ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-300 bg-white text-slate-700"
              )}
              aria-label="Toggle theme"
            >
              <span
                className={classNames(
                  "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  isDark ? "bg-slate-800" : "bg-amber-200"
                )}
              >
                {isDark ? "🌑" : "☀️"}
              </span>
              {isDark ? "Dark" : "Light"}
            </button>

            <Link
              to="/login"
              className="rounded-full bg-sky-500 hover:bg-sky-400 text-white px-4 py-1.5 text-[11px] font-medium shadow-[0_10px_30px_rgba(56,189,248,0.35)] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Accedi
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 px-4 md:px-8 py-10">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* HERO + COCKPIT STRIP */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-8 items-start">
            {/* Hero */}
            <div className="space-y-5">
              <div className="space-y-3">
                <div className={classNames("text-[11px] uppercase tracking-[0.28em]", subtleText2)}>
                  Controllo operativo · dato nativo · auditabilità
                </div>
                <h1 className={classNames("text-4xl md:text-5xl font-semibold tracking-tight", hardText)}>
                  CORE — controllo operativo nativo.
                </h1>
                <p className={classNames("max-w-2xl text-sm leading-relaxed", subtleText)}>
                  Un sistema centrale che rende continuo il flusso tra Capo, Ufficio, CORE Drive e Direzione:
                  un solo dato, nessuna ricostruzione, evidenze consultabili.
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-4 flex-wrap">
                <Link
                  to="/login"
                  className="rounded-lg bg-sky-500 hover:bg-sky-400 text-white px-5 py-2 text-[13px] font-medium shadow-[0_18px_45px_rgba(56,189,248,0.35)] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Accedi al sistema
                </Link>
                <div className={classNames("text-[11px]", subtleText)}>
                  Accesso riservato · visibilità per ruoli autorizzati
                </div>
              </div>

              {/* Live flow (direction-grade, minimal words, strong signals) */}
              <div
                className={classNames(
                  "rounded-2xl border p-4 md:p-5",
                  borderColor,
                  panelBg,
                  glow
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={classNames("text-[11px] uppercase tracking-[0.22em]", subtleText2)}>
                    Flusso operativo
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={classNames("text-[10px] uppercase tracking-[0.18em]", subtleText2)}>
                      Heartbeat
                    </span>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/50 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className={classNames("rounded-xl border p-3", borderColor, panelBgStrong)}>
                    <div className="flex items-center justify-between">
                      <span className={classNames("text-[10px] uppercase tracking-[0.16em]", subtleText2)}>
                        CAPO
                      </span>
                      <Pill tone="ok">
                        <Dot tone="ok" />
                        DATO
                      </Pill>
                    </div>
                    <div className={classNames("mt-2 text-[12px] font-semibold", hardText)}>
                      Origine
                    </div>
                    <div className={classNames("mt-1 text-[11px]", subtleText)}>
                      Rapportino · ore · note tecniche
                    </div>
                  </div>

                  <div className={classNames("rounded-xl border p-3", borderColor, panelBgStrong)}>
                    <div className="flex items-center justify-between">
                      <span className={classNames("text-[10px] uppercase tracking-[0.16em]", subtleText2)}>
                        UFFICIO
                      </span>
                      <Pill tone="info">
                        <Dot tone="info" />
                        CONTROLLO
                      </Pill>
                    </div>
                    <div className={classNames("mt-2 text-[12px] font-semibold", hardText)}>
                      Validazione
                    </div>
                    <div className={classNames("mt-1 text-[11px]", subtleText)}>
                      Ritorni · chiusure · evidenze
                    </div>
                  </div>

                  <div className={classNames("rounded-xl border p-3", borderColor, panelBgStrong)}>
                    <div className="flex items-center justify-between">
                      <span className={classNames("text-[10px] uppercase tracking-[0.16em]", subtleText2)}>
                        CORE DRIVE
                      </span>
                      <Pill tone="mag">
                        <Dot tone="mag" />
                        CERTIFICA
                      </Pill>
                    </div>
                    <div className={classNames("mt-2 text-[12px] font-semibold", hardText)}>
                      Storico
                    </div>
                    <div className={classNames("mt-1 text-[11px]", subtleText)}>
                      Consultazione · audit · consuntivi
                    </div>
                  </div>

                  <div className={classNames("rounded-xl border p-3", borderColor, panelBgStrong)}>
                    <div className="flex items-center justify-between">
                      <span className={classNames("text-[10px] uppercase tracking-[0.16em]", subtleText2)}>
                        DIREZIONE
                      </span>
                      <Pill tone="warn">
                        <Dot tone="warn" />
                        DECIDE
                      </Pill>
                    </div>
                    <div className={classNames("mt-2 text-[12px] font-semibold", hardText)}>
                      Sintesi
                    </div>
                    <div className={classNames("mt-1 text-[11px]", subtleText)}>
                      KPI · rischi · priorità operative
                    </div>
                  </div>
                </div>

                <div className={classNames("mt-4 text-[11px]", subtleText2)}>
                  Un solo dato attraversa i ruoli. La decisione non interpreta: legge.
                </div>
              </div>
            </div>

            {/* Right: cockpit signals */}
            <div
              className={classNames(
                "rounded-2xl border p-4 md:p-5 space-y-4",
                borderColor,
                panelBg,
                glow
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={classNames("text-[11px] uppercase tracking-[0.18em]", subtleText2)}>
                    Segnali operativi
                  </div>
                  <div className={classNames("text-xs", subtleText)}>
                    Telemetria sintetica · aggiornamento continuo.
                  </div>
                </div>
                <Pill tone="info">
                  <Dot tone="info" />
                  LIVE
                </Pill>
              </div>

              {/* KPI tiles */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={classNames("rounded-xl border p-3", borderColor, panelBgStrong)}>
                  <div className={classNames("text-[10px] uppercase tracking-[0.16em]", subtleText2)}>
                    Presenze oggi
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{signals.presenti}</span>
                    <span className={classNames("text-[11px]", subtleText2)}>
                      / {signals.presenze}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-900/70 overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${signals.copertura}%` }} />
                  </div>
                  <div className={classNames("mt-1 text-[10px]", subtleText2)}>
                    Copertura {signals.copertura}%
                  </div>
                </div>

                <div className={classNames("rounded-xl border p-3", borderColor, panelBgStrong)}>
                  <div className={classNames("text-[10px] uppercase tracking-[0.16em]", subtleText2)}>
                    Rapportini chiusi
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{signals.validati}</span>
                    <span className={classNames("text-[11px]", subtleText2)}>
                      / {signals.attesi}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-900/70 overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${Math.round((signals.validati / signals.attesi) * 100)}%` }}
                    />
                  </div>
                  <div className={classNames("mt-1 text-[10px]", subtleText2)}>
                    Da chiudere: {signals.chiudere}
                  </div>
                </div>

                <div className={classNames("rounded-xl border p-3 col-span-2", borderColor, panelBgStrong)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className={classNames("text-[10px] uppercase tracking-[0.16em]", subtleText2)}>
                      INCA · allineamento tecnico
                    </div>
                    <Pill tone="ok">
                      <Dot tone="ok" />
                      COERENZA
                    </Pill>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{signals.inca}%</span>
                    <span className={classNames("text-[11px]", subtleText2)}>
                      stato su dato importato
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-900/70 overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${signals.inca}%` }} />
                  </div>
                  <div className={classNames("mt-1 text-[10px]", subtleText2)}>
                    Segnale sintetico (non KPI finale) · utile per controllo priorità
                  </div>
                </div>
              </div>

              {/* Event feed (1-liner, direction-grade) */}
              <div className={classNames("rounded-xl border p-3", borderColor, panelBgStrong)}>
                <div className="flex items-center justify-between gap-3">
                  <div className={classNames("text-[10px] uppercase tracking-[0.16em]", subtleText2)}>
                    Ultimo evento
                  </div>
                  <span className={classNames("text-[10px]", subtleText2)}>{signals.clock}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Dot tone={signals.event.tone} />
                  <div className={classNames("text-[12px]", hardText)}>{signals.event.label}</div>
                </div>
                <div className={classNames("mt-1 text-[11px]", subtleText)}>
                  Tracciabilità attiva · evidenze consultabili in CORE Drive
                </div>
              </div>
            </div>
          </section>

          {/* MODULES — organs, not equal cards */}
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className={classNames("text-[11px] uppercase tracking-[0.28em]", subtleText2)}>
                  Organigramma funzionale
                </div>
                <h2 className="text-xl md:text-2xl font-semibold">Moduli CORE (sullo stesso dato)</h2>
              </div>
              <Pill tone="neutral">
                <Dot tone="neutral" />
                <span>Accesso</span>
                <span className="tracking-normal text-[11px] text-slate-200/80">RISERVATO</span>
              </Pill>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 items-start">
              {/* Left: modules grid with hierarchy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CORE (root) */}
                <button
                  type="button"
                  onClick={() => setOpenModule("CORE")}
                  className={classNames(
                    "text-left rounded-2xl border p-4 md:p-5 transition focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                    panelBg,
                    openModule === "CORE"
                      ? "border-sky-500/70 shadow-[0_0_0_1px_rgba(56,189,248,0.6),0_30px_90px_rgba(2,6,23,0.8)]"
                      : classNames(borderColor, "hover:border-sky-500/40")
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">CORE · Sistema</div>
                    <Pill tone="info">
                      <Dot tone="info" />
                      Centrale
                    </Pill>
                  </div>
                  <p className={classNames("mt-2 text-xs leading-relaxed", subtleText)}>
                    Normalizza il flusso e rende unico il dato. La piattaforma non “mostra”: collega, traccia, certifica.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-sky-300">
                    <span>Apri dettaglio</span>
                    <span aria-hidden>→</span>
                  </div>
                </button>

                {/* Rapportino */}
                <button
                  type="button"
                  onClick={() => setOpenModule("RAPPORTINO")}
                  className={classNames(
                    "text-left rounded-2xl border p-4 md:p-5 transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                    panelBg,
                    openModule === "RAPPORTINO"
                      ? "border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.55),0_30px_90px_rgba(2,6,23,0.8)]"
                      : classNames(borderColor, "hover:border-emerald-500/40")
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Rapportino · Capo</div>
                    <Pill tone="ok">
                      <Dot tone="ok" />
                      Origine
                    </Pill>
                  </div>
                  <p className={classNames("mt-2 text-xs leading-relaxed", subtleText)}>
                    Dato operativo: attività, ore, squadre, note tecniche. Un inserimento, evidenza immediata.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300">
                    <span>Apri dettaglio</span>
                    <span aria-hidden>→</span>
                  </div>
                </button>

                {/* Ufficio */}
                <button
                  type="button"
                  onClick={() => setOpenModule("UFFICIO")}
                  className={classNames(
                    "text-left rounded-2xl border p-4 md:p-5 transition focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                    panelBg,
                    openModule === "UFFICIO"
                      ? "border-sky-500/70 shadow-[0_0_0_1px_rgba(56,189,248,0.55),0_30px_90px_rgba(2,6,23,0.8)]"
                      : classNames(borderColor, "hover:border-sky-500/40")
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Ufficio · Controllo</div>
                    <Pill tone="info">
                      <Dot tone="info" />
                      Valida
                    </Pill>
                  </div>
                  <p className={classNames("mt-2 text-xs leading-relaxed", subtleText)}>
                    Verifica e chiusure sullo stesso dato: note di ritorno tracciate, stati chiari, evidenze.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-sky-300">
                    <span>Apri dettaglio</span>
                    <span aria-hidden>→</span>
                  </div>
                </button>

                {/* INCA */}
                <button
                  type="button"
                  onClick={() => setOpenModule("INCA")}
                  className={classNames(
                    "text-left rounded-2xl border p-4 md:p-5 transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                    panelBg,
                    openModule === "INCA"
                      ? "border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.55),0_30px_90px_rgba(2,6,23,0.8)]"
                      : classNames(borderColor, "hover:border-emerald-500/40")
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">INCA</div>
                    <Pill tone="ok">
                      <Dot tone="ok" />
                      Tecnico
                    </Pill>
                  </div>
                  <p className={classNames("mt-2 text-xs leading-relaxed", subtleText)}>
                    Allineamento tra lista teorica e stato reale. Evidenzia incoerenze e progress tecnici.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300">
                    <span>Apri dettaglio</span>
                    <span aria-hidden>→</span>
                  </div>
                </button>

                {/* CORE Drive — bigger (full row) */}
                <button
                  type="button"
                  onClick={() => setOpenModule("DRIVE")}
                  className={classNames(
                    "md:col-span-2 text-left rounded-2xl border p-4 md:p-5 transition focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                    panelBg,
                    openModule === "DRIVE"
                      ? "border-fuchsia-500/70 shadow-[0_0_0_1px_rgba(217,70,239,0.55),0_30px_90px_rgba(2,6,23,0.8)]"
                      : classNames(borderColor, "hover:border-fuchsia-500/40")
                  )}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm font-semibold">CORE Drive · Archivio certificato</div>
                    <div className="flex items-center gap-2">
                      <Pill tone="mag">
                        <Dot tone="mag" />
                        Storico
                      </Pill>
                      <Pill tone="neutral">
                        <Dot tone="neutral" />
                        Read-only
                      </Pill>
                    </div>
                  </div>
                  <p className={classNames("mt-2 text-xs leading-relaxed", subtleText)}>
                    Memoria lunga del cantiere: consultazione rapida, filtri, evidenze. Non disturba l’operativo corrente.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-fuchsia-300">
                    <span>Apri dettaglio</span>
                    <span aria-hidden>→</span>
                  </div>
                </button>
              </div>

              {/* Right: detail panel */}
              <aside
                className={classNames(
                  "rounded-2xl border p-4 md:p-5 space-y-4",
                  panelBg,
                  borderColor,
                  moduleDetail.accentBorder,
                  glow
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Dot
                      tone={
                        moduleDetail.accentTag === "text-emerald-300"
                          ? "ok"
                          : moduleDetail.accentTag === "text-sky-300"
                          ? "info"
                          : moduleDetail.accentTag === "text-fuchsia-300"
                          ? "mag"
                          : "neutral"
                      }
                    />
                    <div className={classNames("text-[11px] uppercase tracking-[0.22em]", moduleDetail.accentTag)}>
                      Dettaglio modulo
                    </div>
                  </div>
                  <span className={classNames("text-[10px] uppercase tracking-[0.18em]", subtleText2)}>
                    Direction-grade
                  </span>
                </div>

                <div>
                  <div className="text-lg font-semibold">{moduleDetail.title}</div>
                  <div className={classNames("mt-2 text-xs leading-relaxed", subtleText)}>
                    {moduleDetail.subtitle}
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {moduleDetail.sections.map((section, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className={classNames("font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
                        {section.heading}
                      </div>
                      <ul className={classNames("space-y-1 list-disc list-inside", subtleText)}>
                        {section.points.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className={classNames("pt-3 border-t text-[11px]", borderColor, subtleText2)}>
                  {moduleDetail.hint}
                </div>
              </aside>
            </div>
          </section>

          {/* CLOSURE */}
          <section className="pt-8 border-t border-slate-800/70">
            <div className="max-w-3xl">
              <div className={classNames("text-[11px] uppercase tracking-[0.28em]", subtleText2)}>
                Chiusura
              </div>
              <div className="mt-3 text-2xl md:text-3xl font-semibold leading-tight">
                CORE non è un software.
                <br />
                È un organo operativo del cantiere.
              </div>
              <div className={classNames("mt-3 text-[11px] leading-relaxed", subtleText)}>
                Non sostituisce le persone. Stabilizza il dato. Rende la decisione leggibile e auditabile.
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className={classNames("pt-6 pb-2 text-[11px]", subtleText2)}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>Accesso riservato a personale interno e partner autorizzati.</div>
              <div className={classNames(isDark ? "text-slate-600" : "text-slate-500")}>
                CORE · CNCS — precisione e responsabilità operativa
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Minimal inline motion helpers (no external libs) */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

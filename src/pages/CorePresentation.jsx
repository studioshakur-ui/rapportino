// src/pages/CorePresentation.jsx
import React, { useMemo, useState } from "react";

/**
 * CORE Presentation (Direzione-only)
 * Obiettivo: narrativa direzionale, non “grafici”.
 * - Confronto ATTUALE vs CORE (continuità del dato)
 * - Control points + frizioni (solo in ATTUALE)
 * - Proposta Pilot (CTA chiara)
 * Lingua: ITA 100%
 */

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate", className = "" }) {
  const tones = {
    slate: "border-slate-700 bg-slate-950/30 text-slate-200",
    emerald: "border-emerald-500/50 bg-emerald-950/20 text-emerald-200",
    sky: "border-sky-500/50 bg-sky-950/20 text-sky-200",
    violet: "border-violet-500/50 bg-violet-950/20 text-violet-200",
    amber: "border-amber-500/50 bg-amber-950/20 text-amber-200",
    rose: "border-rose-500/50 bg-rose-950/20 text-rose-200",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
        tones[tone] || tones.slate,
        className
      )}
    >
      {children}
    </span>
  );
}

function KeyPoint({ title, lines, tone = "slate" }) {
  const toneMap = {
    slate: "border-slate-800 bg-[#0b111b] text-slate-200",
    emerald: "border-emerald-700/50 bg-emerald-950/20 text-slate-200",
    sky: "border-sky-700/50 bg-sky-950/20 text-slate-200",
    violet: "border-violet-700/50 bg-violet-950/20 text-slate-200",
    amber: "border-amber-700/50 bg-amber-950/20 text-slate-200",
  };
  return (
    <div className={cx("rounded-2xl border p-4 sm:p-5", toneMap[tone] || toneMap.slate)}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</div>
      <ul className="mt-2 space-y-1.5 text-[13px] text-slate-200">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-slate-400/70 shrink-0" />
            <span className="leading-relaxed">{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniTile({ label, value, hint, tone = "slate" }) {
  const tones = {
    slate: "border-slate-800 bg-[#0b111b]",
    emerald: "border-emerald-700/50 bg-emerald-950/20",
    sky: "border-sky-700/50 bg-sky-950/20",
    violet: "border-violet-700/50 bg-violet-950/20",
    amber: "border-amber-700/50 bg-amber-950/20",
  };
  return (
    <div className={cx("rounded-2xl border p-4", tones[tone] || tones.slate)}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-50">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-slate-400">{hint}</div> : null}
    </div>
  );
}

function TooltipCard({ title, lines }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#070d16] px-3 py-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-1 space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="text-[12px] text-slate-200">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionFlow({ mode, showFriction }) {
  // SVG coordinates are fixed; layout is responsive via viewBox
  const nodes = useMemo(() => {
    if (mode === "ATTUALE") {
      return [
        { id: "capo", label: "CAPO", x: 90, y: 130, tone: "emerald" },
        { id: "messaggi", label: "Messaggi / Foto", x: 250, y: 70, tone: "slate" },
        { id: "ufficio", label: "Ufficio tecnico", x: 410, y: 130, tone: "sky" },
        { id: "file", label: "File / Excel / Consolidamenti", x: 570, y: 70, tone: "slate" },
        { id: "decisione", label: "Direzione", x: 730, y: 130, tone: "amber" },
      ];
    }
    return [
      { id: "capo", label: "CAPO", x: 80, y: 130, tone: "emerald" },
      { id: "core", label: "CORE (dato nativo)", x: 260, y: 130, tone: "sky" },
      { id: "ufficio", label: "Ufficio (controllo)", x: 440, y: 130, tone: "sky" },
      { id: "drive", label: "CORE Drive (stato + audit)", x: 620, y: 130, tone: "violet" },
      { id: "decisione", label: "Direzione (sintesi)", x: 780, y: 130, tone: "amber" },
    ];
  }, [mode]);

  const edges = useMemo(() => {
    if (mode === "ATTUALE") {
      return [
        { from: "capo", to: "messaggi", weight: 6, tone: "slate", label: "dato destrutturato" },
        { from: "messaggi", to: "ufficio", weight: 5, tone: "slate", label: "interpretazioni" },
        { from: "ufficio", to: "file", weight: 5, tone: "slate", label: "reinserimenti" },
        { from: "file", to: "decisione", weight: 4, tone: "slate", label: "latenza" },
      ];
    }
    return [
      { from: "capo", to: "core", weight: 7, tone: "emerald", label: "input unico" },
      { from: "core", to: "ufficio", weight: 6, tone: "sky", label: "validazione" },
      { from: "ufficio", to: "drive", weight: 6, tone: "violet", label: "stato doc. + audit" },
      { from: "drive", to: "decisione", weight: 5, tone: "amber", label: "sintesi derivata" },
    ];
  }, [mode]);

  const frictionPoints = useMemo(() => {
    if (mode !== "ATTUALE") return [];
    return [
      {
        id: "f1",
        x: 330,
        y: 95,
        title: "Frizione · Re-inserimento",
        lines: ["Doppia digitazione", "Versioni discordanti", "Tempo perso"],
      },
      {
        id: "f2",
        x: 505,
        y: 95,
        title: "Frizione · Perdita contesto",
        lines: ["Dato senza struttura", "Note non standard", "Audit difficile"],
      },
      {
        id: "f3",
        x: 650,
        y: 95,
        title: "Frizione · Latenza decisione",
        lines: ["Consolidamenti lenti", "Allineamenti manuali", "Ritardo KPI"],
      },
    ];
  }, [mode]);

  const toneStyles = {
    slate: {
      node: "rgba(148,163,184,0.16)",
      nodeBorder: "rgba(148,163,184,0.45)",
      glow: "rgba(148,163,184,0.25)",
      text: "#e2e8f0",
      edge: "rgba(148,163,184,0.55)",
    },
    sky: {
      node: "rgba(56,189,248,0.12)",
      nodeBorder: "rgba(56,189,248,0.55)",
      glow: "rgba(56,189,248,0.28)",
      text: "#e2e8f0",
      edge: "rgba(56,189,248,0.70)",
    },
    emerald: {
      node: "rgba(16,185,129,0.12)",
      nodeBorder: "rgba(16,185,129,0.55)",
      glow: "rgba(16,185,129,0.30)",
      text: "#e2e8f0",
      edge: "rgba(16,185,129,0.70)",
    },
    violet: {
      node: "rgba(139,92,246,0.12)",
      nodeBorder: "rgba(139,92,246,0.55)",
      glow: "rgba(139,92,246,0.28)",
      text: "#e2e8f0",
      edge: "rgba(139,92,246,0.70)",
    },
    amber: {
      node: "rgba(245,158,11,0.12)",
      nodeBorder: "rgba(245,158,11,0.55)",
      glow: "rgba(245,158,11,0.28)",
      text: "#e2e8f0",
      edge: "rgba(245,158,11,0.70)",
    },
  };

  const nodeById = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const [hover, setHover] = useState(null);

  const bgGrid = (
    <svg className="absolute inset-0 h-full w-full opacity-[0.22]" viewBox="0 0 900 260" preserveAspectRatio="none">
      <defs>
        <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
        </pattern>
        <radialGradient id="vignette" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="rgba(2,6,23,0)" />
          <stop offset="100%" stopColor="rgba(2,6,23,0.75)" />
        </radialGradient>
      </defs>
      <rect width="900" height="260" fill="url(#grid)" />
      <rect width="900" height="260" fill="url(#vignette)" />
    </svg>
  );

  return (
    <div className="relative rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden">
      {bgGrid}

      <style>{`
        @keyframes dash { from { stroke-dashoffset: 420; } to { stroke-dashoffset: 0; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
        @keyframes glow { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }
      `}</style>

      <div className="relative px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
              Flusso · Punti di controllo
            </div>
            <div className="mt-1 text-sm sm:text-base font-semibold text-slate-100">
              {mode === "ATTUALE"
                ? "Operatività attuale (dato non continuo)"
                : "Scenario CORE (dato nativo continuo + audit)"}
            </div>
            <div className="mt-1 text-[12px] text-slate-400 max-w-2xl">
              {mode === "ATTUALE"
                ? "La stessa informazione viene trasformata più volte prima di arrivare alla Direzione."
                : "Un solo dato attraversa ruoli e stati: controllo Ufficio, memoria certificata, sintesi Direzione."}
            </div>
          </div>

          <Pill tone={mode === "ATTUALE" ? "amber" : "emerald"}>
            <span
              className="h-1.5 w-1.5 rounded-full bg-slate-100/70"
              style={{ animation: "glow 2.2s ease-in-out infinite" }}
            />
            {mode === "ATTUALE" ? "ATTUALE · frizioni" : "CORE · continuità"}
          </Pill>
        </div>

        <div className="mt-4 relative">
          <svg viewBox="0 0 900 260" className="w-full h-[280px] sm:h-[320px]">
            <defs>
              <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="edgeGradCore" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(16,185,129,0.25)" />
                <stop offset="50%" stopColor="rgba(56,189,248,0.70)" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.35)" />
              </linearGradient>
            </defs>

            {edges.map((e) => {
              const a = nodeById.get(e.from);
              const b = nodeById.get(e.to);
              if (!a || !b) return null;

              const midX = (a.x + b.x) / 2;
              const curve = mode === "ATTUALE" ? -40 : 0;
              const d = `M ${a.x} ${a.y} Q ${midX} ${a.y + curve} ${b.x} ${b.y}`;

              const tone = toneStyles[e.tone] || toneStyles.slate;
              const stroke = mode === "CORE" ? "url(#edgeGradCore)" : tone.edge;

              return (
                <g key={`${e.from}-${e.to}`}>
                  <path d={d} fill="none" stroke={stroke} strokeWidth={e.weight + 2} opacity="0.18" filter="url(#softGlow)" />
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={e.weight}
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 420,
                      strokeDashoffset: 420,
                      animation: "dash 1.05s ease-out forwards",
                    }}
                  />
                  <g
                    transform={`translate(${midX - 58}, ${a.y + curve - 26})`}
                    onMouseEnter={() => setHover({ x: midX, y: a.y + curve - 18, title: "Collegamento", lines: [e.label] })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "default" }}
                  >
                    <rect width="116" height="18" rx="9" fill="rgba(2,6,23,0.75)" stroke="rgba(148,163,184,0.22)" />
                    <text
                      x="58"
                      y="12.5"
                      textAnchor="middle"
                      fontSize="10"
                      fill="#cbd5e1"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      {e.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {nodes.map((n) => {
              const t = toneStyles[n.tone] || toneStyles.slate;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onMouseEnter={() => setHover({ x: n.x, y: n.y, title: "Punto di controllo", lines: [n.label] })}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "default" }}
                >
                  <circle r="18" fill={t.glow} opacity="0.35" filter="url(#softGlow)" />
                  <circle
                    r="15"
                    fill="transparent"
                    stroke={t.nodeBorder}
                    strokeWidth="2"
                    style={{ animation: "glow 2.2s ease-in-out infinite" }}
                  />
                  <circle r="12" fill={t.node} stroke={t.nodeBorder} strokeWidth="1.5" />

                  <g transform="translate(0, 34)">
                    <rect x="-88" y="-12" width="176" height="22" rx="11" fill="rgba(2,6,23,0.72)" stroke="rgba(148,163,184,0.18)" />
                    <text x="0" y="3.5" textAnchor="middle" fontSize="11" fill={t.text} style={{ fontWeight: 600 }}>
                      {n.label}
                    </text>
                  </g>

                  <g transform="translate(14,-14)" style={{ animation: "pulse 1.8s ease-in-out infinite" }}>
                    <circle r="4.2" fill={t.nodeBorder} opacity="0.8" />
                    <circle r="2.3" fill="#e2e8f0" opacity="0.9" />
                  </g>
                </g>
              );
            })}

            {mode === "ATTUALE" && showFriction
              ? frictionPoints.map((f) => (
                  <g
                    key={f.id}
                    transform={`translate(${f.x}, ${f.y})`}
                    onMouseEnter={() => setHover({ x: f.x, y: f.y, title: f.title, lines: f.lines })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "default" }}
                  >
                    <circle r="10" fill="rgba(244,63,94,0.15)" stroke="rgba(244,63,94,0.65)" strokeWidth="1.6" />
                    <circle r="4" fill="rgba(244,63,94,0.85)" />
                  </g>
                ))
              : null}
          </svg>

          {hover ? (
            <div
              className="absolute"
              style={{
                left: `${(hover.x / 900) * 100}%`,
                top: `${(hover.y / 260) * 100}%`,
                transform: "translate(-50%, -120%)",
                pointerEvents: "none",
                zIndex: 20,
              }}
            >
              <TooltipCard title={hover.title} lines={hover.lines} />
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] text-slate-500">Suggerimento: passa il mouse su nodi e collegamenti.</div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Origine dato
            </Pill>
            <Pill tone="sky">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Controllo / validazione
            </Pill>
            <Pill tone="violet">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Stato documento + audit
            </Pill>
            <Pill tone="amber">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Sintesi Direzione
            </Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CorePresentation() {
  const [mode, setMode] = useState("CORE"); // "ATTUALE" | "CORE"
  const [showFriction, setShowFriction] = useState(true);

  const hero =
    mode === "ATTUALE"
      ? {
          pill: "ATTUALE · dato non continuo",
          tone: "amber",
          title: "Radiografia: dove il dato si rompe prima della Direzione",
          subtitle:
            "Il problema non è “mancanza di strumenti”: è la discontinuità del dato e l’assenza di stato documento verificabile.",
        }
      : {
          pill: "CORE · dato nativo + audit",
          tone: "emerald",
          title: "Radiografia: continuità del dato lungo la filiera operativa",
          subtitle:
            "Un solo dato attraversa ruoli e stati: input dal campo, controllo Ufficio, memoria certificata (CORE Drive), sintesi Direzione.",
        };

  const keyPoints =
    mode === "ATTUALE"
      ? [
          {
            title: "Effetto pratico",
            tone: "amber",
            lines: [
              "La stessa informazione viene riscritta o reinterpretata più volte.",
              "Le versioni divergono (file, messaggi, note, consolidi).",
              "La Direzione riceve una sintesi con latenza e contesto ridotto.",
            ],
          },
          {
            title: "Perché è rischioso",
            tone: "slate",
            lines: [
              "Audit difficile: chi ha cambiato cosa e quando non è tracciato in modo lineare.",
              "Dipendenza dall’esperienza locale: controlli non standardizzati.",
              "Costi invisibili: tempo perso in allineamenti e riconciliazioni.",
            ],
          },
        ]
      : [
          {
            title: "Cosa cambia (senza “marketing”)",
            tone: "emerald",
            lines: [
              "Input unico del dato operativo (strutturato per ruolo).",
              "Validazione e ritorni Ufficio tracciati sullo stesso oggetto.",
              "CORE Drive certifica stato documento + audit: se non è lì, non è verificabile.",
            ],
          },
          {
            title: "Cosa ottiene la Direzione",
            tone: "amber",
            lines: [
              "Sintesi derivata dallo stesso dato (non ricostruita a posteriori).",
              "Riduzione delle frizioni: meno copie, meno interpretazioni, meno latenza.",
              "Base pulita per KPI affidabili e confrontabili nel tempo.",
            ],
          },
        ];

  return (
    <div className="min-h-screen bg-[#050910] text-slate-100 px-4 sm:px-6 py-10 sm:py-14">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        {/* HERO */}
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                CORE · Direzione (accesso riservato)
              </div>

              <Pill tone={hero.tone}>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-100/70" style={{ animation: "glow 2.2s ease-in-out infinite" }} />
                {hero.pill}
              </Pill>

              <h1 className="text-3xl sm:text-5xl font-bold leading-tight">{hero.title}</h1>
              <p className="max-w-3xl text-slate-400 text-sm sm:text-[13px] leading-relaxed">{hero.subtitle}</p>
            </div>

            {/* CONTROLLI */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("ATTUALE")}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition",
                  mode === "ATTUALE"
                    ? "border-amber-500/60 bg-amber-950/20 text-amber-200 shadow-[0_16px_60px_rgba(245,158,11,0.18)]"
                    : "border-slate-700 bg-slate-950/30 text-slate-300 hover:bg-slate-900/40"
                )}
              >
                Attuale
              </button>

              <button
                type="button"
                onClick={() => setMode("CORE")}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition",
                  mode === "CORE"
                    ? "border-emerald-500/60 bg-emerald-950/20 text-emerald-200 shadow-[0_16px_60px_rgba(16,185,129,0.18)]"
                    : "border-slate-700 bg-slate-950/30 text-slate-300 hover:bg-slate-900/40"
                )}
              >
                CORE
              </button>

              <button
                type="button"
                onClick={() => setShowFriction((v) => !v)}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition",
                  mode !== "ATTUALE"
                    ? "border-slate-800 text-slate-600 bg-slate-950/20 cursor-not-allowed"
                    : showFriction
                    ? "border-rose-500/60 bg-rose-950/20 text-rose-200"
                    : "border-slate-700 bg-slate-950/30 text-slate-300 hover:bg-slate-900/40"
                )}
                disabled={mode !== "ATTUALE"}
                title={mode !== "ATTUALE" ? "Disponibile solo in modalità Attuale" : ""}
              >
                {showFriction ? "Frizioni: ON" : "Frizioni: OFF"}
              </button>
            </div>
          </div>
        </section>

        {/* MINI QUADRO (NON “NUMERI”, SOLO QUALITÀ DI SISTEMA) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniTile
            label="Dato"
            value={mode === "ATTUALE" ? "Replica" : "Nativo"}
            hint={mode === "ATTUALE" ? "Trasformazioni multiple" : "Single source of truth"}
            tone={mode === "ATTUALE" ? "amber" : "emerald"}
          />
          <MiniTile
            label="Stato documento"
            value={mode === "ATTUALE" ? "Opaco" : "Tracciato"}
            hint={mode === "ATTUALE" ? "Audit complesso" : "Stati + log verificabili"}
            tone={mode === "ATTUALE" ? "slate" : "violet"}
          />
          <MiniTile
            label="Controllo"
            value={mode === "ATTUALE" ? "Locale" : "Per ruolo"}
            hint={mode === "ATTUALE" ? "Dipende dall’esperienza" : "Regole + validazioni"}
            tone={mode === "ATTUALE" ? "slate" : "sky"}
          />
          <MiniTile
            label="Direzione"
            value={mode === "ATTUALE" ? "Ritardata" : "Derivata"}
            hint={mode === "ATTUALE" ? "Attende consolidi" : "Sintesi dal dato reale"}
            tone="amber"
          />
        </section>

        {/* FLOW MAP */}
        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl sm:text-2xl font-semibold">Continuità del dato e punti di controllo</h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-4xl">
              Questa pagina non “mostra grafici”: mostra dove il dato nasce, come viene controllato, dove viene
              certificato e come arriva alla Direzione in modo verificabile.
            </p>
          </div>

          <MissionFlow mode={mode} showFriction={showFriction} />
        </section>

        {/* 2 BLOCCHI DI ARGOMENTO (MAX 3 PUNTI PER BLOCCO) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {keyPoints.map((kp, i) => (
            <KeyPoint key={i} title={kp.title} lines={kp.lines} tone={kp.tone} />
          ))}
        </section>

        {/* PROPOSTA PILOT / CTA */}
        <section className="rounded-3xl border border-slate-800 bg-[#0b111b] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
                Proposta operativa (pilot ristretto)
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-50">
                Test controllato, misurabile, senza cambiare l’organizzazione
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
                Obiettivo del pilot: verificare sul campo la riduzione di reinserimenti e frizioni, e dimostrare che lo
                stesso dato può diventare continuo, auditabile e riusabile per sintesi Direzione.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="emerald">Durata: 14 giorni</Pill>
              <Pill tone="sky">Perimetro: 1 nave / 1 area</Pill>
              <Pill tone="violet">Output: stato doc. + audit</Pill>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <KeyPoint
              tone="sky"
              title="Cosa si misura"
              lines={[
                "Tempo di chiusura giornaliero (Capo → Ufficio).",
                "Numero di reinserimenti / riconciliazioni.",
                "Divergenze tra versioni (prima vs dopo).",
              ]}
            />
            <KeyPoint
              tone="violet"
              title="Cosa deve esistere"
              lines={[
                "Stati documento chiari (bozza → validato → archiviato).",
                "Log minimale: chi / quando / cosa è cambiato.",
                "CORE Drive come punto di verità dell’evidenza.",
              ]}
            />
            <KeyPoint
              tone="amber"
              title="Cosa ottiene la Direzione"
              lines={[
                "Sintesi affidabile senza consolidamenti manuali.",
                "Audit pronto: evidenza consultabile e tracciata.",
                "Base pulita per KPI (in fase successiva).",
              ]}
            />
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[11px] text-slate-500">
              Nota: il valore qui non è “un nuovo tool”. Il valore è la continuità del dato e lo stato documento.
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-emerald-500/60 bg-emerald-950/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-[0_18px_70px_rgba(16,185,129,0.14)] hover:bg-emerald-950/30 transition"
              >
                Avvia pilot (14 giorni)
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-950/30 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40 transition"
              >
                Definisci perimetro (nave / area)
              </button>
            </div>
          </div>
        </section>

        {/* CHIUSURA (BREVE) */}
        <section className="text-center pt-2 pb-2">
          <p className="text-2xl sm:text-4xl font-bold text-slate-100 mb-3">
            CORE non è un software.
            <br className="hidden sm:block" />
            È controllo operativo sul dato reale.
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 max-w-2xl mx-auto">
            L’obiettivo non è aggiungere complessità: è eliminare frizioni e rendere il dato continuo, verificabile e
            auditabile lungo ruoli e stati.
          </p>
        </section>
      </div>
    </div>
  );
}

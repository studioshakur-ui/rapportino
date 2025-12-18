// src/pages/CorePresentation.jsx
import React, { useMemo, useRef, useState } from "react";

/**
 * CORE Presentation (Direzione-only)
 *
 * UX upgrades:
 * - Default mode: ATTUALE
 * - Bottom transformation bar sticky (only when ATTUALE) to force click to CORE
 * - Bigger typography for executive readability
 * - CNCS definition (one-shot) + disciplined wink to Percorso
 */

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, className }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] uppercase tracking-[0.18em]",
        className
      )}
    >
      {children}
    </span>
  );
}

function StatTile({ label, value, hint, accent = "slate" }) {
  const accentMap = {
    sky: "border-sky-500/50 bg-sky-950/20 text-sky-200",
    emerald: "border-emerald-500/50 bg-emerald-950/20 text-emerald-200",
    violet: "border-violet-500/50 bg-violet-950/20 text-violet-200",
    amber: "border-amber-500/50 bg-amber-950/20 text-amber-200",
    slate: "border-slate-700 bg-slate-950/40 text-slate-200",
  };

  return (
    <div className={cx("rounded-2xl border p-4 sm:p-5", accentMap[accent] || accentMap.slate)}>
      <div className="text-[12px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-[28px] sm:text-3xl font-semibold text-slate-50 leading-none">{value}</div>
      {hint ? <div className="mt-2 text-[12px] sm:text-[13px] text-slate-400 leading-relaxed">{hint}</div> : null}
    </div>
  );
}

function TooltipCard({ title, lines }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#070d16] px-3 py-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
      <div className="text-[12px] uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-1 space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="text-[13px] text-slate-200">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionFlow({ mode, showFriction }) {
  const nodes = useMemo(() => {
    if (mode === "ATTUALE") {
      return [
        { id: "capo", label: "CAPO", x: 90, y: 130, tone: "emerald" },
        { id: "messaggi", label: "Messaggi / Foto", x: 250, y: 70, tone: "slate" },
        { id: "ufficio", label: "Ufficio tecnico", x: 410, y: 130, tone: "sky" },
        { id: "file", label: "File / Excel / Consolidamenti", x: 570, y: 70, tone: "slate" },
        { id: "decisione", label: "Decisione", x: 730, y: 130, tone: "amber" },
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
      { from: "ufficio", to: "drive", weight: 6, tone: "violet", label: "audit + stato doc." },
      { from: "drive", to: "decisione", weight: 5, tone: "amber", label: "sintesi direzione" },
    ];
  }, [mode]);

  const frictionPoints = useMemo(() => {
    if (mode !== "ATTUALE") return [];
    return [
      {
        id: "f1",
        x: 330,
        y: 95,
        title: "Friczione · Reinserimento",
        lines: ["Doppia digitazione", "Versioni discordanti", "Tempo perso"],
      },
      {
        id: "f2",
        x: 505,
        y: 95,
        title: "Friczione · Perdita contesto",
        lines: ["Dato senza struttura", "Note non standard", "Audit difficile"],
      },
      {
        id: "f3",
        x: 650,
        y: 95,
        title: "Friczione · Latenza decisione",
        lines: ["Consolidamenti lenti", "Allineamenti manuali", "Ritardi prima della sintesi"],
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

  return (
    <div className="relative rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden">
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

      <style>{`
        @keyframes dash { from { stroke-dashoffset: 420; } to { stroke-dashoffset: 0; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
        @keyframes glow { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }
      `}</style>

      <div className="relative px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-[0.26em] text-slate-500">Mission Flow · Control Points</div>
            <div className="mt-1 text-[15px] sm:text-[16px] font-semibold text-slate-100">
              {mode === "ATTUALE"
                ? "Architettura operativa attuale (dato non continuo)"
                : "Scenario con CORE (dato nativo continuo + audit)"}
            </div>
            <div className="mt-2 text-[13px] sm:text-[14px] text-slate-400 max-w-2xl leading-relaxed">
              {mode === "ATTUALE"
                ? "La stessa informazione viene trasformata più volte prima di arrivare alla decisione."
                : "Un solo dato attraversa ruoli e stati: validazione, memoria certificata, sintesi Direzione."}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill className="border-slate-700 bg-slate-950/30 text-slate-200">
              <span className="h-2 w-2 rounded-full bg-slate-300" style={{ animation: "glow 2.2s ease-in-out infinite" }} />
              Stato: {mode === "ATTUALE" ? "FRIZIONI" : "CONTINUITÀ"}
            </Pill>
          </div>
        </div>

        <div className="mt-4 relative">
          <svg viewBox="0 0 900 260" className="w-full h-[300px] sm:h-[340px]">
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
                    <rect width="116" height="18" rx="9" fill="rgba(2,6,23,0.78)" stroke="rgba(148,163,184,0.22)" />
                    <text x="58" y="12.5" textAnchor="middle" fontSize="10" fill="#cbd5e1" style={{ letterSpacing: "0.08em" }}>
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
                  onMouseEnter={() => setHover({ x: n.x, y: n.y, title: "Control point", lines: [n.label] })}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "default" }}
                >
                  <circle r="18" fill={t.glow} opacity="0.35" filter="url(#softGlow)" />
                  <circle r="15" fill="transparent" stroke={t.nodeBorder} strokeWidth="2" style={{ animation: "glow 2.2s ease-in-out infinite" }} />
                  <circle r="12" fill={t.node} stroke={t.nodeBorder} strokeWidth="1.5" />

                  <g transform={`translate(0, 34)`}>
                    <rect x="-78" y="-12" width="156" height="22" rx="11" fill="rgba(2,6,23,0.74)" stroke="rgba(148,163,184,0.18)" />
                    <text x="0" y="3.5" textAnchor="middle" fontSize="11" fill={t.text} style={{ fontWeight: 700 }}>
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
          <div className="text-[12px] sm:text-[13px] text-slate-500">
            Suggerimento: passa il mouse sui nodi per leggere i control points.
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill className="border-emerald-500/40 bg-emerald-950/20 text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Origine dato
            </Pill>
            <Pill className="border-sky-500/40 bg-sky-950/20 text-sky-200">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Controllo / validazione
            </Pill>
            <Pill className="border-violet-500/40 bg-violet-950/20 text-violet-200">
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              Memoria + audit
            </Pill>
            <Pill className="border-amber-500/40 bg-amber-950/20 text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Direzione
            </Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

function PilotPanel({ onClose, onSeeFlow }) {
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-x-0 top-10 sm:top-12 mx-auto w-[92%] max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#050910] shadow-[0_40px_140px_rgba(0,0,0,0.65)]">
          <div className="absolute inset-0 opacity-[0.22] pointer-events-none">
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.12),transparent_55%)]" />
          </div>

          <div className="relative p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="text-[12px] uppercase tracking-[0.26em] text-slate-500">
                  Avvio controllato · Osservazione operativa
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className="border-emerald-500/50 bg-emerald-950/20 text-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Durata: fase breve
                  </Pill>
                  <Pill className="border-violet-500/50 bg-violet-950/20 text-violet-200">
                    <span className="h-2 w-2 rounded-full bg-violet-300" />
                    Output: stato doc. + audit
                  </Pill>
                </div>

                <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-50">
                  Fase iniziale: cosa osserviamo (senza cambiare l’organizzazione)
                </h3>
                <p className="text-slate-400 text-[13px] sm:text-sm leading-relaxed max-w-3xl">
                  Nessuna configurazione in UI. Il perimetro si definisce a voce. Qui si mostra solo la logica:
                  stesso lavoro, stesso flusso, un solo dato tracciato meglio.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-2 text-[12px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
                aria-label="Chiudi"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#070d16] p-4">
                <div className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Cosa succede</div>
                <ul className="mt-2 space-y-2 text-[13px] text-slate-200">
                  <li>• I capi lavorano come oggi</li>
                  <li>• Inserimento unico del dato operativo</li>
                  <li>• Ufficio controlla sullo stesso dato</li>
                  <li>• CORE Drive registra stato e storico</li>
                  <li>• Direzione legge sintesi</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#070d16] p-4">
                <div className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Cosa si misura</div>
                <ul className="mt-2 space-y-2 text-[13px] text-slate-200">
                  <li>• Tempo medio chiusura giornaliera (Capo → Ufficio)</li>
                  <li>• Numero reinserimenti / richieste chiarimenti</li>
                  <li>• Divergenze tra versioni (prima vs dopo)</li>
                  <li>• Stato documento + tracciabilità minima</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#070d16] p-4">
                <div className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Cosa ottiene la Direzione</div>
                <ul className="mt-2 space-y-2 text-[13px] text-slate-200">
                  <li>• Fotografia “prima / dopo”</li>
                  <li>• Evidenza consultabile (CORE Drive)</li>
                  <li>• Stato documento chiaro</li>
                  <li>• Base KPI (se richiesto)</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[12px] text-slate-600">
                Perimetro (nave/area/capi) definito a voce. Nessuna configurazione in UI.
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSeeFlow}
                  className="rounded-full border border-emerald-500/60 bg-emerald-950/20 px-4 py-2 text-[12px] uppercase tracking-[0.18em] text-emerald-200 shadow-[0_18px_70px_rgba(16,185,129,0.16)] hover:bg-emerald-950/30"
                >
                  Vedi il flusso (fase iniziale)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-700 bg-slate-950/30 px-4 py-2 text-[12px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
                >
                  Torna alla presentazione
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomTransformBar({ mode, onSwitchToCore }) {
  if (mode !== "ATTUALE") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70]">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-[#050910] to-transparent" />
      <div className="border-t border-slate-800 bg-[#050910]/92 backdrop-blur">
        <style>{`
          @keyframes glow { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }
          @keyframes ctaPulse { 0%, 100% { transform: scale(1); opacity: 0.95; } 50% { transform: scale(1.06); opacity: 0.72; } }
          @keyframes ctaNudge { 0%, 100% { transform: translateX(0); opacity: 0.75; } 50% { transform: translateX(4px); opacity: 1; } }
        `}</style>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-amber-300" style={{ animation: "glow 2.2s ease-in-out infinite" }} />
              ATTUALE
            </span>

            <span className="text-slate-500">→</span>

            <span className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-300" style={{ animation: "glow 2.2s ease-in-out infinite" }} />
              CORE
            </span>

            <span className="hidden sm:inline text-[12px] text-slate-500">
              Vedi lo stesso flusso con dato nativo + audit.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToCore}
              className={cx(
                "relative rounded-full border px-5 py-2.5 text-[12px] uppercase tracking-[0.22em] font-semibold",
                "border-emerald-500/75 bg-emerald-950/22 text-emerald-200",
                "shadow-[0_22px_90px_rgba(16,185,129,0.20)] hover:bg-emerald-950/30",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050910]"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-300" style={{ animation: "glow 2.2s ease-in-out infinite" }} />
                PASSA A CORE
              </span>

              <span
                className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_1px_rgba(16,185,129,0.22),0_0_70px_rgba(16,185,129,0.16)]"
                style={{ animation: "ctaPulse 2.2s ease-in-out infinite" }}
                aria-hidden="true"
              />

              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200/85"
                style={{ animation: "ctaNudge 1.8s ease-in-out infinite" }}
                aria-hidden="true"
              >
                ›
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CorePresentation() {
  const [mode, setMode] = useState("ATTUALE"); // default ATTUALE
  const [showFriction, setShowFriction] = useState(true);
  const [pilotOpen, setPilotOpen] = useState(false);

  const flowRef = useRef(null);

  const topMessage =
    mode === "ATTUALE"
      ? {
          pill: "ATTUALE · dato non continuo",
          pillClass: "border-amber-500/50 bg-amber-950/20 text-amber-200",
          title: "Radiografia: dove il dato si rompe prima della decisione",
          subtitle:
            "Oggi lo stesso lavoro produce più versioni della verità: trasformazioni, reinserimenti, latenza e responsabilità diffusa.",
        }
      : {
          pill: "CORE · dato nativo + audit",
          pillClass: "border-emerald-500/50 bg-emerald-950/20 text-emerald-200",
          title: "Radiografia: continuità del dato lungo la filiera",
          subtitle:
            "Un solo dato attraversa ruoli e stati: controllo, memoria certificata, audit e sintesi Direzione.",
        };

  function handleSeeFlow() {
    setPilotOpen(false);
    setTimeout(() => {
      flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <div className="min-h-screen bg-[#050910] text-slate-100 px-4 sm:px-6 py-10 sm:py-14 pb-24">
      {/* pb-24: espace pour la bottom bar */}
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        {/* HERO */}
        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="text-[12px] uppercase tracking-[0.3em] text-slate-500">
                CORE · Direzione (accesso riservato)
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Pill className="border-slate-700 bg-slate-950/35 text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-slate-200/70" style={{ animation: "glow 2.4s ease-in-out infinite" }} />
                  CNCS — Cognitive Naval Control System
                </Pill>
                
              </div>

              <div className="text-[13px] sm:text-[14px] text-slate-400 max-w-3xl leading-relaxed">
                Sistema di controllo cognitivo per ambienti industriali critici, dove l’errore non è un’opzione.
              </div>

              <Pill className={topMessage.pillClass}>
                <span className="h-2 w-2 rounded-full bg-slate-100/70" style={{ animation: "glow 2.2s ease-in-out infinite" }} />
                {topMessage.pill}
              </Pill>

              <h1 className="text-4xl sm:text-6xl font-bold leading-[1.03]">{topMessage.title}</h1>
              <p className="max-w-3xl text-slate-400 text-[14px] sm:text-[16px] leading-relaxed">
                {topMessage.subtitle}
              </p>
            </div>

            {/* Small controls remain, but the primary “pass to CORE” is guaranteed by bottom bar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("ATTUALE")}
                className={cx(
                  "rounded-full border px-4 py-2 text-[12px] uppercase tracking-[0.20em] transition",
                  mode === "ATTUALE"
                    ? "border-amber-500/70 bg-amber-950/18 text-amber-200 shadow-[0_16px_60px_rgba(245,158,11,0.12)]"
                    : "border-slate-700 bg-slate-950/30 text-slate-200/85 hover:bg-slate-900/45 hover:text-slate-100"
                )}
              >
                Attuale
              </button>

              <button
                type="button"
                onClick={() => setMode("CORE")}
                className={cx(
                  "rounded-full border px-4 py-2 text-[12px] uppercase tracking-[0.20em] transition",
                  mode === "CORE"
                    ? "border-emerald-500/75 bg-emerald-950/22 text-emerald-200 shadow-[0_18px_70px_rgba(16,185,129,0.16)]"
                    : "border-slate-700 bg-slate-950/30 text-slate-200/85 hover:bg-slate-900/45 hover:text-slate-100"
                )}
              >
                CORE
              </button>

              <button
                type="button"
                onClick={() => setShowFriction((v) => !v)}
                className={cx(
                  "rounded-full border px-4 py-2 text-[12px] uppercase tracking-[0.20em] transition",
                  mode !== "ATTUALE"
                    ? "border-slate-800 text-slate-600 bg-slate-950/20 cursor-not-allowed"
                    : showFriction
                    ? "border-rose-500/70 bg-rose-950/20 text-rose-200"
                    : "border-slate-700 bg-slate-950/30 text-slate-200/85 hover:bg-slate-900/45 hover:text-slate-100"
                )}
                disabled={mode !== "ATTUALE"}
                title={mode !== "ATTUALE" ? "Disponibile solo in modalità Attuale" : ""}
              >
                {showFriction ? "Frizioni: ON" : "Frizioni: OFF"}
              </button>
            </div>
          </div>
        </section>

        {/* MINI KPI */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Dato"
            value={mode === "ATTUALE" ? "Replica" : "Nativo"}
            hint={mode === "ATTUALE" ? "Più trasformazioni" : "Un solo punto di verità"}
            accent={mode === "ATTUALE" ? "amber" : "emerald"}
          />
          <StatTile
            label="Stato documento"
            value={mode === "ATTUALE" ? "Opaco" : "Tracciato"}
            hint={mode === "ATTUALE" ? "Audit difficile" : "Audit + log + stati"}
            accent={mode === "ATTUALE" ? "slate" : "violet"}
          />
          <StatTile
            label="Controllo"
            value={mode === "ATTUALE" ? "Locale" : "Per ruolo"}
            hint={mode === "ATTUALE" ? "Dipende dall’esperienza" : "Regole + validazioni"}
            accent={mode === "ATTUALE" ? "slate" : "sky"}
          />
          <StatTile
            label="Decisione"
            value={mode === "ATTUALE" ? "Ritardata" : "Derivata"}
            hint={mode === "ATTUALE" ? "Attende consolidamenti" : "Sintesi dal dato reale"}
            accent="amber"
          />
        </section>

        {/* FLOW MAP */}
        <section className="space-y-4" ref={flowRef}>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl sm:text-3xl font-semibold">Control points e continuità del dato</h2>
            <p className="text-slate-400 text-[13px] sm:text-[15px] max-w-4xl leading-relaxed">
              Qui non stiamo “mostrando numeri”: stiamo mostrando dove il dato nasce, come viene controllato,
              dove viene certificato e come arriva alla sintesi Direzione.
            </p>
          </div>

          <MissionFlow mode={mode} showFriction={showFriction} />
        </section>

        {/* Avvio controllato */}
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="text-[12px] uppercase tracking-[0.26em] text-slate-500">
                    Proposta operativa (fase iniziale)
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-50">
                    Test controllato, misurabile, senza cambiare l’organizzazione
                  </h2>
                  <p className="text-slate-400 text-[13px] sm:text-[15px] leading-relaxed max-w-3xl">
                    Obiettivo: verificare sul campo la riduzione di reinserimenti e frizioni, e dimostrare
                    che lo stesso dato può diventare continuo, auditabile e riusabile per sintesi Direzione.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Pill className="border-emerald-500/50 bg-emerald-950/20 text-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />
                      Durata: fase breve
                    </Pill>
                    <Pill className="border-sky-500/50 bg-sky-950/20 text-sky-200">
                      <span className="h-2 w-2 rounded-full bg-sky-300" />
                      Perimetro: definito a voce
                    </Pill>
                    <Pill className="border-violet-500/50 bg-violet-950/20 text-violet-200">
                      <span className="h-2 w-2 rounded-full bg-violet-300" />
                      Output: stato doc. + audit
                    </Pill>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPilotOpen(true)}
                    className="rounded-full border border-emerald-500/60 bg-emerald-950/20 px-5 py-2.5 text-[12px] uppercase tracking-[0.20em] text-emerald-200 shadow-[0_22px_90px_rgba(16,185,129,0.18)] hover:bg-emerald-950/30"
                  >
                    AVVIA (FASE INIZIALE)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CHIUSURA */}
        <section className="text-center pt-6 pb-2">
          <p className="text-2xl sm:text-5xl font-bold text-slate-100 mb-3 leading-tight">
            CORE non è un software.
            <br className="hidden sm:block" />
            È un sistema di controllo operativo sul dato reale.
          </p>
          <p className="text-[12px] sm:text-[13px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Obiettivo: rendere continuo, verificabile e auditabile lo stesso dato lungo ruoli e stati:
            campo → controllo → memoria certificata → sintesi Direzione.
          </p>
        </section>
      </div>

      {pilotOpen ? <PilotPanel onClose={() => setPilotOpen(false)} onSeeFlow={handleSeeFlow} /> : null}

      <BottomTransformBar
        mode={mode}
        onSwitchToCore={() => {
          setMode("CORE");
          // optional: scroll back slightly for narrative continuity
          // window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

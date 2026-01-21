import React, { useEffect, useMemo, useRef, useState } from "react";

type T = {
  spec: string;
  nodes: [string, string, string, string];
  nodeSubs: [string, string, string, string];
};

type Props = {
  t?: Partial<T>;
};

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

const FALLBACK_T: T = {
  spec: "Un solo flusso · Un solo dato · Nessuna ricostruzione",
  nodes: ["CAPO", "UFFICIO", "CORE DRIVE", "DIREZIONE"],
  nodeSubs: ["Inserisce", "Valida", "Archivia", "Legge"],
};

export function ElectricFlowPanel({ t }: Props): JSX.Element {
  const safeT: T = {
    spec: t?.spec ?? FALLBACK_T.spec,
    nodes: (t?.nodes as T["nodes"]) ?? FALLBACK_T.nodes,
    nodeSubs: (t?.nodeSubs as T["nodeSubs"]) ?? FALLBACK_T.nodeSubs,
  };

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Pointer variables for parallax + edge light
  const [p, setP] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.35 });

  const reduceMotion = useMemo(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width, 0, 1);
      const y = clamp((e.clientY - r.top) / r.height, 0, 1);
      setP({ x, y });
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

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
        @keyframes coreDash { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -320; } }
        @keyframes coreSpark { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -680; } }
        @keyframes coreSurge { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -980; } }

        .corePanel {
          position: relative;
          border-radius: 20px;
          background:
            radial-gradient(900px 320px at var(--mx, 18%) var(--my, 18%), rgba(56,189,248,0.085), transparent 58%),
            radial-gradient(720px 260px at calc(var(--mx, 84%) + 6%) calc(var(--my, 24%) + 4%), rgba(16,185,129,0.05), transparent 64%),
            linear-gradient(to bottom, rgba(2,6,23,0.52), rgba(2,6,23,0.26));
          border: 1px solid rgba(148,163,184,0.18);
          box-shadow:
            0 28px 90px rgba(2,6,23,0.72),
            inset 0 1px 0 rgba(226,232,240,0.06),
            inset 0 -1px 0 rgba(2,6,23,0.55);
          overflow: hidden;
          transform: translateZ(0);
        }

        .corePanel::before {
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

        .corePanel::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 20px;
          background-image:
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.016) 0px,
              rgba(255,255,255,0.016) 1px,
              rgba(0,0,0,0.016) 2px,
              rgba(0,0,0,0.016) 3px
            );
          opacity: 0.28;
          mix-blend-mode: overlay;
        }

        .coreEdgeLight {
          position: absolute;
          inset: -1px;
          pointer-events: none;
          border-radius: 22px;
          background:
            radial-gradient(220px 180px at var(--mx, 50%) var(--my, 35%),
              rgba(56,189,248,0.22),
              rgba(56,189,248,0.10) 38%,
              transparent 72%);
          opacity: 0.75;
          mix-blend-mode: screen;
          filter: blur(10px);
        }

        .coreEdgeRing {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.22);
          opacity: 0.7;
        }
      `}</style>

      <div
        ref={panelRef}
        className="corePanel"
        style={
          {
            ["--mx" as unknown as string]: `${Math.round(p.x * 100)}%`,
            ["--my" as unknown as string]: `${Math.round(p.y * 100)}%`,
          } as React.CSSProperties
        }
      >
        <div aria-hidden="true" className="coreEdgeLight" />
        <div aria-hidden="true" className="coreEdgeRing" />

        <div className="relative z-10 px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
              {safeT.spec}
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-950/45 px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">CORE 1.0 LIVE</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 px-6 pb-6 pt-4">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <path d={d} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="6" strokeLinecap="round" />
            <path
              d={d}
              fill="none"
              stroke="rgba(56,189,248,0.55)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="16 22"
              style={{
                animation: reduceMotion ? "none" : "coreDash 11.5s linear infinite",
              }}
            />
            <path
              d={d}
              fill="none"
              stroke="rgba(56,189,248,0.92)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeDasharray="4 62"
              style={{
                opacity: reduceMotion ? 0 : 0.35,
                animation: reduceMotion ? "none" : "coreSpark 18s linear infinite",
              }}
            />
            <path
              d={d}
              fill="none"
              stroke="rgba(226,232,240,0.78)"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray="10 120"
              style={{
                opacity: reduceMotion ? 0 : 0.18,
                animation: reduceMotion ? "none" : "coreSurge 26s linear infinite",
              }}
            />

            {safeT.nodes.map((label, i) => {
              const xs = [x0, x1, x2, x3];
              const xi = xs[i] ?? x0;
              return (
                <g key={label} transform={`translate(${xi}, ${y})`}>
                  <circle r="10" fill="rgba(2,6,23,0.85)" stroke="rgba(56,189,248,0.55)" strokeWidth="2" />
                  <circle r="3.5" fill="rgba(56,189,248,0.95)" />
                  <text x="0" y="30" textAnchor="middle" fontSize="14" fill="rgba(226,232,240,0.92)" fontWeight="700">
                    {label}
                  </text>
                  <text x="0" y="48" textAnchor="middle" fontSize="12" fill="rgba(148,163,184,0.85)">
                    {safeT.nodeSubs[i] ?? ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
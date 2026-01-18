import React, { useEffect, useMemo, useRef, useState } from "react";

type T = {
  spec: string;
  nodes: [string, string, string, string];
  nodeSubs: [string, string, string, string];
};

type Props = {
  t: T;
};

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

export function ElectricFlowPanel({ t }: Props): JSX.Element {
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
        @keyframes coreDash {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -320; }
        }
        @keyframes coreSpark {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -680; }
        }
        /* Current surge: slower, thicker wave-like pass */
        @keyframes coreSurge {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -980; }
        }

        /* Palantir-grade reveal of the panel background layers via pointer vars */
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

        /* subtle scan texture (static, not animated) */
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

        /* Edge light (cursor-follow) */
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
          border: 1px solid rgba(56,189,248,0.10);
          opacity: 0.9;
        }
      `}</style>

      <div
        ref={panelRef}
        className="corePanel p-6 md:p-7"
        style={{
          // pointer to percent for gradients
          ["--mx" as never]: `${Math.round(p.x * 100)}%`,
          ["--my" as never]: `${Math.round(p.y * 100)}%`,
        }}
      >
        {/* Edge light (A2) */}
        <div className="coreEdgeLight" aria-hidden="true" />
        <div className="coreEdgeRing" aria-hidden="true" />

        <div className="flex items-center justify-between gap-4 mb-5 relative z-10">
          <div className="min-w-0 text-[11px] uppercase tracking-[0.28em] text-slate-500">{t.spec}</div>

          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-[0.20em] text-slate-400">CORE 1.0</span>
            <span className="text-[11px] uppercase tracking-[0.20em] text-sky-200">LIVE</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[190px] md:h-[210px] relative z-10" aria-hidden="true">
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

            <linearGradient id="surgeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(56,189,248,0.00)" />
              <stop offset="45%" stopColor="rgba(56,189,248,0.55)" />
              <stop offset="55%" stopColor="rgba(226,232,240,0.82)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.00)" />
            </linearGradient>
          </defs>

          {/* Rail */}
          <path d={d} fill="none" stroke="url(#railGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
          <path d={d} fill="none" stroke="rgba(56,189,248,0.06)" strokeWidth="12" strokeLinecap="round" opacity="0.62" />

          {/* Current dash (C1 base) */}
          <path
            d={d}
            fill="none"
            stroke="url(#currentGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="34 52"
            strokeDashoffset="0"
            opacity="0.95"
            style={{
              animation: reduceMotion ? "none" : "coreDash 9.2s linear infinite",
            }}
          />

          {/* Spark micro (existing style, slow) */}
          <path
            d={d}
            fill="none"
            stroke="rgba(226,232,240,0.88)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="3 180"
            strokeDashoffset="0"
            opacity="0.70"
            style={{
              animation: reduceMotion ? "none" : "coreSpark 8.6s linear infinite",
            }}
          />

          {/* Current surge (C1) */}
          <path
            d={d}
            fill="none"
            stroke="url(#surgeGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="120 860"
            strokeDashoffset="0"
            opacity="0.55"
            style={{
              animation: reduceMotion ? "none" : "coreSurge 12.4s linear infinite",
            }}
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

function Node({ x, y, label, sub }: { x: number; y: number; label: string; sub: string }): JSX.Element {
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

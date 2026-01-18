import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  title: string; // "CORE"
};

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function CoreWordmark({ title }: Props): JSX.Element {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width, 0, 1);
      const y = clamp((e.clientY - r.top) / r.height, 0, 1);
      setPos({ x, y });
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  const reduceMotion = useMemo(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    } catch {
      return false;
    }
  }, []);

  return (
    <div ref={wrapRef} className="relative inline-flex items-end gap-3 select-none">
      <h1 className="text-7xl md:text-7xl font-semibold tracking-tight leading-[0.95]">{title}</h1>

      {/* AI badge: smaller, circle brighter, electric slow */}
      <span
        className="relative inline-flex items-center justify-center"
        style={{ transform: "translateY(10px)" }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        data-core-prox-target="ai"
        aria-label="AI"
        title="AI"
      >
        <style>{`
          @keyframes coreAiDash {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -240; }
          }
          @keyframes coreAiPulse {
            0%, 100% { opacity: 0.55; filter: blur(0px); }
            50% { opacity: 0.95; filter: blur(0.2px); }
          }
          @keyframes coreAiOrbitArc {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -420; }
          }
        `}</style>

        <span
          className="relative inline-flex items-center justify-center rounded-full"
          style={{
            width: 30,
            height: 30,
            background: "rgba(2,6,23,0.55)",
            border: "1px solid rgba(148,163,184,0.22)",
            boxShadow: hover
              ? "0 22px 64px rgba(56,189,248,0.20), inset 0 1px 0 rgba(255,255,255,0.06)"
              : "0 18px 56px rgba(2,6,23,0.65), inset 0 1px 0 rgba(255,255,255,0.05)",
            overflow: "hidden",
          }}
        >
          {/* proximity glow: reacts even before hover (driven by --core-ai-prox) */}
          <span
            aria-hidden="true"
            className="absolute"
            style={{
              inset: -18,
              backgroundImage:
                "radial-gradient(90px 90px at 50% 50%, rgba(56,189,248, calc(0.06 + var(--core-ai-prox, 0) * 0.18)), transparent 62%)",
              opacity: hover ? 0.95 : 1,
              mixBlendMode: "screen",
              filter: "blur(10px)",
            }}
          />
          {/* small spotlight follows pointer (kept tight, premium) */}
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(54px 54px at ${Math.round(pos.x * 100)}% ${Math.round(
                pos.y * 100
              )}%, rgba(56,189,248,${hover ? 0.22 : 0.10}), transparent 56%)`,
              opacity: 1,
              mixBlendMode: "screen",
            }}
          />

          <span
            className="relative z-10 text-[11px] font-semibold tracking-[0.22em]"
            style={{ color: "rgba(56,189,248,0.92)" }}
          >
            AI
          </span>

          {/* Circle + electric dash */}
          <svg className="absolute inset-0" viewBox="0 0 36 36" width="30" height="30" aria-hidden="true">
            <defs>
              <linearGradient id="coreAiGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(56,189,248,0.22)" />
                <stop offset="55%" stopColor="rgba(56,189,248,0.98)" />
                <stop offset="100%" stopColor="rgba(56,189,248,0.22)" />
              </linearGradient>
              <linearGradient id="coreAiArcGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(226,232,240,0.20)" />
                <stop offset="50%" stopColor="rgba(226,232,240,0.85)" />
                <stop offset="100%" stopColor="rgba(226,232,240,0.20)" />
              </linearGradient>
            </defs>

            {/* base ring */}
            <circle cx="18" cy="18" r="14.5" fill="none" stroke="rgba(148,163,184,0.20)" strokeWidth="1.6" />

            {/* glow ring */}
            <circle
              cx="18"
              cy="18"
              r="14.5"
              fill="none"
              stroke="rgba(56,189,248,0.12)"
              strokeWidth="5.8"
              style={{
                opacity: hover ? 0.9 : "calc(0.50 + var(--core-ai-prox, 0) * 0.32)",
                animation: reduceMotion ? "none" : "coreAiPulse 8.5s ease-in-out infinite",
              }}
            />

            {/* electric dash ring */}
            <circle
              cx="18"
              cy="18"
              r="14.5"
              fill="none"
              stroke="url(#coreAiGrad)"
              strokeWidth="2.2"
              strokeDasharray="18 26"
              strokeDashoffset="0"
              style={{
                animation: reduceMotion ? "none" : "coreAiDash 9.5s linear infinite",
                opacity: hover ? 1 : "calc(0.80 + var(--core-ai-prox, 0) * 0.18)",
              }}
            />

            {/* second animation: orbiting arc (rare, classy) */}
            <circle
              cx="18"
              cy="18"
              r="12.2"
              fill="none"
              stroke="url(#coreAiArcGrad)"
              strokeWidth="1.6"
              strokeDasharray="6 56"
              strokeDashoffset="0"
              style={{
                animation: reduceMotion ? "none" : "coreAiOrbitArc 12.5s linear infinite",
                opacity: hover ? 0.9 : "calc(0.42 + var(--core-ai-prox, 0) * 0.30)",
              }}
            />
          </svg>
        </span>
      </span>
    </div>
  );
}

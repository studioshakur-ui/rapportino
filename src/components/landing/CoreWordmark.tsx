import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  title: string; // "CORE"
};

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function CoreWordmark({ title }: Props): JSX.Element {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const badgeWrapRef = useRef<HTMLSpanElement | null>(null);
  const badgeCoreRef = useRef<HTMLSpanElement | null>(null);

  // Proximity + spotlight without re-render: listens to the Landing event bus.
  useEffect(() => {
    const badge = badgeCoreRef.current;
    const wrap = badgeWrapRef.current;
    if (!badge || !wrap) return;

    let rafId = 0;
    let lastX = window.innerWidth * 0.5;
    let lastY = window.innerHeight * 0.35;
    let hover = false;

    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const r = badge.getBoundingClientRect();
        const cx = r.left + r.width * 0.5;
        const cy = r.top + r.height * 0.5;
        const dx = lastX - cx;
        const dy = lastY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Approach response: starts reacting well before hover.
        const reach = 180; // px
        const prox = 1 - clamp(dist / reach, 0, 1);
        const active = Math.max(hover ? 1 : 0, Math.pow(prox, 1.35));

        // Spotlight stays small and calm.
        const nx = clamp((lastX - r.left) / Math.max(1, r.width), 0, 1);
        const ny = clamp((lastY - r.top) / Math.max(1, r.height), 0, 1);

        badge.style.setProperty("--ai-spot-x", `${Math.round(nx * 100)}%`);
        badge.style.setProperty("--ai-spot-y", `${Math.round(ny * 100)}%`);
        badge.style.setProperty("--ai-spot-a", `${(0.08 + active * 0.18).toFixed(3)}`);
        badge.style.setProperty("--ai-glow-a", `${(0.42 + active * 0.48).toFixed(3)}`);
        badge.style.setProperty("--ai-dash-a", `${(0.70 + active * 0.28).toFixed(3)}`);
        badge.style.setProperty("--ai-shadow-a", `${(0.10 + active * 0.22).toFixed(3)}`);
      });
    };

    const onPointer = (e: Event) => {
      const ce = e as CustomEvent<{ x: number; y: number }>;
      if (!ce?.detail) return;
      lastX = ce.detail.x;
      lastY = ce.detail.y;
      schedule();
    };

    const onEnter = () => {
      hover = true;
      schedule();
    };
    const onLeave = () => {
      hover = false;
      schedule();
    };

    window.addEventListener("core:pointer", onPointer as EventListener);
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    // Initial paint
    schedule();

    return () => {
      window.removeEventListener("core:pointer", onPointer as EventListener);
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointerleave", onLeave);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
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
        ref={badgeWrapRef}
        className="relative inline-flex items-center justify-center"
        style={{ transform: "translateY(10px)" }}
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
          ref={badgeCoreRef}
          className="relative inline-flex items-center justify-center rounded-full"
          style={{
            width: 26,
            height: 26,
            background: "rgba(2,6,23,0.55)",
            border: "1px solid rgba(148,163,184,0.22)",
            boxShadow: `0 22px 64px rgba(56,189,248,var(--ai-shadow-a,0.12)), inset 0 1px 0 rgba(255,255,255,0.06)`,
            overflow: "hidden",
            transform: "translateZ(0)",
          }}
        >
          {/* small spotlight follows pointer */}
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(44px 44px at var(--ai-spot-x, 50%) var(--ai-spot-y, 50%), rgba(56,189,248,var(--ai-spot-a,0.12)), transparent 62%)`,
              opacity: 1,
              mixBlendMode: "screen",
            }}
          />

          <span className="relative z-10 text-[10px] font-semibold tracking-[0.24em]" style={{ color: "rgba(56,189,248,0.92)" }}>
            AI
          </span>

          {/* Circle + electric dash */}
          <svg className="absolute inset-0" viewBox="0 0 36 36" width="26" height="26" aria-hidden="true">
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
            <circle cx="18" cy="18" r="14.5" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1.6" />

            {/* glow ring */}
            <circle
              cx="18"
              cy="18"
              r="14.5"
              fill="none"
              stroke="rgba(56,189,248,0.14)"
              strokeWidth="6.2"
              style={{
                opacity: "var(--ai-glow-a, 0.55)",
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
                opacity: "var(--ai-dash-a, 0.85)",
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
                opacity: 0.55,
              }}
            />
          </svg>
        </span>
      </span>
    </div>
  );
}

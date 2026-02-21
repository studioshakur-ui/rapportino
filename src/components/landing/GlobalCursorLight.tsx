import React, { useEffect } from "react";

/**
 * Landing-only cursor-follow light.
 *
 * Goals:
 * - One subtle light that follows the cursor across the entire landing.
 * - No React re-renders on pointermove (RAF + CSS vars).
 * - Emits a small event bus so other components can react by proximity.
 */

export type CorePointerEventDetail = {
  x: number; // viewport px
  y: number; // viewport px
};

type Props = {
  /** Root element that receives the CSS variables (scoped to Landing only). */
  target: React.RefObject<HTMLElement | null>;
};

export function GlobalCursorLight({ target }: Props): JSX.Element {
  useEffect(() => {
    const root = target.current;
    if (!root) return;

    const prefersReducedMotion = (() => {
      try {
        return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      } catch {
        return false;
      }
    })();

    // If reduced motion is requested, keep light centered and do not track.
    if (prefersReducedMotion) {
      root.style.setProperty("--core-mx", "50%");
      root.style.setProperty("--core-my", "35%");
      root.style.setProperty("--core-active", "0");
      window.dispatchEvent(
        new CustomEvent<CorePointerEventDetail>("core:pointer", {
          detail: { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 },
        })
      );
      return;
    }

    let raf = 0;
    let lastX = window.innerWidth * 0.5;
    let lastY = window.innerHeight * 0.35;
    let active = 0;

    const commit = () => {
      raf = 0;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const xp = Math.max(0, Math.min(1, lastX / w));
      const yp = Math.max(0, Math.min(1, lastY / h));

      root.style.setProperty("--core-mx", `${Math.round(xp * 100)}%`);
      root.style.setProperty("--core-my", `${Math.round(yp * 100)}%`);
      root.style.setProperty("--core-active", String(active));

      window.dispatchEvent(
        new CustomEvent<CorePointerEventDetail>("core:pointer", {
          detail: { x: lastX, y: lastY },
        })
      );
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(commit);
    };

    const onMove = (e: PointerEvent) => {
      active = 1;
      lastX = e.clientX;
      lastY = e.clientY;
      schedule();
    };

    const onLeave = () => {
      active = 0;
      schedule();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("blur", onLeave);

    // Initial paint
    schedule();

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [target]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        backgroundImage: `
          radial-gradient(850px 560px at var(--core-mx, 50%) var(--core-my, 35%), rgba(56,189,248, calc(0.08 + 0.10 * var(--core-active, 1))), transparent 66%),
          radial-gradient(720px 520px at calc(var(--core-mx, 50%) + 8%) calc(var(--core-my, 35%) + 12%), rgba(139,92,246, calc(0.03 + 0.05 * var(--core-active, 1))), transparent 68%),
          radial-gradient(420px 320px at var(--core-mx, 50%) var(--core-my, 35%), rgba(226,232,240, calc(0.02 + 0.04 * var(--core-active, 1))), transparent 72%)
        `,
        mixBlendMode: "screen",
        filter: "blur(2px)",
        opacity: 1,
      }}
    />
  );
}

// src/components/routing/KeepAliveOutlet.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

type Props = {
  /**
   * Optional namespace to avoid collisions across shells.
   * Example: "app", "ufficio", "admin", "manager".
   */
  scopeKey?: string;

  /**
   * Optional override for the cache key (default: location.pathname).
   * Do NOT pass a value that changes on every render.
   */
  cacheKey?: string;

  /**
   * Max cached pages.
   */
  max?: number;

  /**
   * Outlet context passthrough.
   */
  context?: unknown;

  className?: string;
};

export default function KeepAliveOutlet({
  scopeKey,
  cacheKey,
  max = 8,
  context,
  className,
}: Props): JSX.Element {
  const location = useLocation();
  const outlet = useOutlet(context as any);

  const baseKey = cacheKey ?? location.pathname;
  const activeKey = `${scopeKey ?? "default"}::${baseKey}`;

  // Cache stores the first ReactNode we see for a key (to keep component instance alive).
  const cacheRef = useRef<Map<string, React.ReactNode>>(new Map());

  // Keys order: stable state, never mutated during render
  const [keys, setKeys] = useState<string[]>(() => [activeKey]);

  // Track active key changes (add + evict) WITHOUT doing anything during render
  useEffect(() => {
    setKeys((prev) => {
      if (prev.includes(activeKey)) {
        // Still evict if needed (rare)
        if (prev.length <= max) return prev;

        const next = [...prev];
        while (next.length > max) {
          const victim = next[0];
          if (victim === activeKey) break;
          next.shift();
          cacheRef.current.delete(victim);
        }
        return next;
      }

      const next = [...prev, activeKey];

      // Evict oldest non-active if too many
      while (next.length > max) {
        const victim = next[0];
        if (victim === activeKey) break;
        next.shift();
        cacheRef.current.delete(victim);
      }

      return next;
    });
  }, [activeKey, max]);

  // Cache the outlet ONLY ONCE per key (no comparisons by reference => no loops)
  useEffect(() => {
    if (!outlet) return;
    if (cacheRef.current.has(activeKey)) return;
    cacheRef.current.set(activeKey, outlet);
  }, [activeKey, outlet]);

  const panes = useMemo(() => {
    return keys.map((k) => {
      const isActive = k === activeKey;
      const cached = cacheRef.current.get(k) ?? null;

      // If active and cached is still missing (first paint), render live outlet.
      const node = isActive ? cached ?? outlet : cached;

      return { key: k, isActive, node };
    });
  }, [activeKey, keys, outlet]);

  return (
    <>
      {panes.map((p) => (
        <div
          key={p.key}
          className={className ?? "min-h-0"}
          style={{ display: p.isActive ? "block" : "none" }}
        >
          {p.node}
        </div>
      ))}
    </>
  );
}

// src/utils/KeepAliveOutlet.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

type ShouldCacheFn = (args: {
  scopeKey: string;
  baseKey: string;
  activeKey: string;
  pathname: string;
  search: string;
  hash: string;
}) => boolean;

type KeepAliveOutletProps = {
  scopeKey: string;
  max?: number;
  /**
   * If provided, it replaces location.pathname as the base cache key.
   * Useful when you want a stable key not coupled to the URL path.
   */
  cacheKey?: string;
  /**
   * Optional predicate to disable caching for some routes/views.
   * When it returns false, the outlet is rendered normally (no keep-alive).
   */
  shouldCache?: ShouldCacheFn;
};

function isRenderable(node: React.ReactNode): boolean {
  // We consider "null/undefined/false" as non-renderable.
  // Note: 0 and "" are valid renderables in React.
  return !(node === null || node === undefined || node === false);
}

export function KeepAliveOutlet(props: KeepAliveOutletProps) {
  const { scopeKey, max = 8, cacheKey, shouldCache } = props;

  const location = useLocation();
  const outlet = useOutlet();

  const pathname = location.pathname ?? "";
  const search = location.search ?? "";
  const hash = location.hash ?? "";

  // Default behavior: cache by pathname only.
  const baseKey = useMemo(() => cacheKey ?? pathname, [cacheKey, pathname]);
  const activeKey = useMemo(() => `${scopeKey}::${baseKey}`, [scopeKey, baseKey]);

  const cacheAllowed = useMemo(() => {
    if (!shouldCache) return true;
    return shouldCache({ scopeKey, baseKey, activeKey, pathname, search, hash });
  }, [shouldCache, scopeKey, baseKey, activeKey, pathname, search, hash]);

  // Cache: key -> ReactNode
  const cacheRef = useRef<Map<string, React.ReactNode>>(new Map());

  // LRU list of keys (oldest at index 0, newest at end)
  const [keys, setKeys] = useState<string[]>([]);

  // Track the last activeKey we processed so we only update LRU when route key changes.
  const lastActiveKeyRef = useRef<string | null>(null);

  /**
   * 1) LRU update happens ONLY when activeKey changes (route key change).
   *    This avoids "setState on every render" loops.
   */
  useEffect(() => {
    if (!cacheAllowed) return;

    if (lastActiveKeyRef.current === activeKey) return;
    lastActiveKeyRef.current = activeKey;

    // Ensure cache entry exists (may be null at first render; we allow it).
    if (!cacheRef.current.has(activeKey)) {
      cacheRef.current.set(activeKey, outlet);
    }

    setKeys((prev) => {
      const idx = prev.indexOf(activeKey);
      let next: string[];

      if (idx >= 0) {
        // Move to end (most recently used)
        if (idx === prev.length - 1 && prev.length <= max) return prev;
        next = prev.filter((k) => k !== activeKey);
        next.push(activeKey);
      } else {
        next = [...prev, activeKey];
      }

      // Evict LRU if overflow
      if (next.length > max) {
        const overflow = next.length - max;
        for (let i = 0; i < overflow; i += 1) {
          const evicted = next[i];
          if (evicted) cacheRef.current.delete(evicted);
        }
        next = next.slice(overflow);
      }

      // Keep referential stability if no effective change
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) return prev;

      return next;
    });
    // NOTE: intentionally exclude `outlet` to prevent identity-churn loops.
  }, [activeKey, max, cacheAllowed]);

  /**
   * 2) Cache hydration/update:
   *    Fixes the "blank panel" problem by replacing cached null/undefined/false
   *    with the first renderable outlet we see for that key.
   *
   *    This does NOT touch state -> no render loops.
   */
  useEffect(() => {
    if (!cacheAllowed) return;

    const prevNode = cacheRef.current.get(activeKey);

    const prevRenderable = isRenderable(prevNode);
    const nowRenderable = isRenderable(outlet);

    // Only upgrade cache when we previously cached nothing renderable.
    if (!prevRenderable && nowRenderable) {
      cacheRef.current.set(activeKey, outlet);
    }
  }, [activeKey, outlet, cacheAllowed]);

  // If caching is disabled for this view, render outlet normally.
  if (!cacheAllowed) return <>{outlet}</>;

  // Render all cached nodes; hide inactive ones.
  return (
    <>
      {keys.map((k) => {
        const node = cacheRef.current.get(k);

        // If we have no node, render nothing for that key.
        if (node === undefined) return null;

        const isActive = k === activeKey;

        return (
          <div
            key={k}
            style={{
              display: isActive ? "block" : "none",
              width: "100%",
              height: "100%",
            }}
          >
            {node}
          </div>
        );
      })}
    </>
  );
}

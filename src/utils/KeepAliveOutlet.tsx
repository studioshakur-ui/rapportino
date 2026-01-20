import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

type KeepAliveEntry = {
  key: string;
  element: React.ReactNode;
  lastSeen: number;
};

type Props = {
  /**
   * Optional context passed to nested routes (equivalent to <Outlet context={...} />)
   */
  context?: unknown;

  /**
   * Distinguish caches between shells (ex: "ufficio", "app", "manager").
   * Prevents collisions if two shells share same pathname patterns.
   */
  scopeKey: string;

  /**
   * Maximum cached pages per shell to avoid unbounded memory.
   */
  maxEntries?: number;

  /**
   * Include URL search in cache key (default true).
   * Keeping it true preserves state even for query-driven pages.
   */
  includeSearch?: boolean;

  /**
   * Include URL hash in cache key (default false).
   */
  includeHash?: boolean;

  className?: string;
};

function nowTs(): number {
  return Date.now();
}

export default function KeepAliveOutlet({
  context,
  scopeKey,
  maxEntries = 12,
  includeSearch = true,
  includeHash = false,
  className,
}: Props): JSX.Element {
  const location = useLocation();

  // NOTE: react-router useOutlet supports passing context (like <Outlet context={...} />)
  // If the type complains in your TS config, keep this `as any`.
  const outlet = (useOutlet as any)(context) as React.ReactNode;

  const activeKey = useMemo(() => {
    const search = includeSearch ? location.search || "" : "";
    const hash = includeHash ? location.hash || "" : "";
    return `${scopeKey}::${location.pathname}${search}${hash}`;
  }, [includeHash, includeSearch, location.hash, location.pathname, location.search, scopeKey]);

  const [entries, setEntries] = useState<KeepAliveEntry[]>([]);

  // Add page to cache when first visited
  useEffect(() => {
    setEntries((prev) => {
      const ts = nowTs();
      const idx = prev.findIndex((e) => e.key === activeKey);

      if (idx >= 0) {
        const updated = prev.slice();
        updated[idx] = { ...updated[idx], lastSeen: ts };
        return updated;
      }

      // New entry: cache the outlet element as-is to keep it mounted later.
      const next: KeepAliveEntry[] = prev.concat([{ key: activeKey, element: outlet, lastSeen: ts }]);

      // Enforce max entries (LRU eviction)
      if (next.length <= maxEntries) return next;

      const sorted = next
        .slice()
        .sort((a, b) => b.lastSeen - a.lastSeen); // most recent first

      return sorted.slice(0, maxEntries);
    });
    // We intentionally depend on `outlet` so the initial cached element is the one rendered for this route.
  }, [activeKey, maxEntries, outlet]);

  return (
    <div className={className}>
      {entries.map((e) => {
        const isActive = e.key === activeKey;
        return (
          <div
            key={e.key}
            style={{
              display: isActive ? "block" : "none",
              width: "100%",
              height: "100%",
            }}
          >
            {e.element}
          </div>
        );
      })}
    </div>
  );
}

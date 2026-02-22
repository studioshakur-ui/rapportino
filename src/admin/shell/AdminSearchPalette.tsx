// src/admin/shell/AdminSearchPalette.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./adminUtils";
import type { AdminSearchItem } from "../AdminConsoleContext";

export default function AdminSearchPalette({
  open,
  onClose,
  onSelect,
  items,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: AdminSearchItem) => void;
  items: AdminSearchItem[];
}): JSX.Element | null {
  const [q, setQ] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items.slice(0, 60);
    return items
      .filter((item) => {
        const hay = [item.title, item.subtitle, item.tokens, item.entity].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(qq);
      })
      .slice(0, 60);
  }, [items, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] theme-overlay flex items-start justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl theme-panel theme-shadow-2">
        <div className="p-4 border-b theme-border">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca in Admin…"
            className="w-full rounded-xl theme-input px-3 py-2 text-[13px] outline-none"
          />
        </div>

        <div className="max-h-[60vh] overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-[12px] theme-text-muted">Nessun risultato.</div>
          ) : (
            <div className="divide-y theme-border">
              {filtered.map((item) => (
                <button
                  key={`${item.entity}-${item.id}`}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--accent-soft)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold theme-text truncate">{item.title}</div>
                      <div className="mt-1 text-[11px] theme-text-muted truncate">
                        {item.entity}
                        {item.subtitle ? ` · ${item.subtitle}` : ""}
                      </div>
                    </div>
                    {item.badge ? (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold",
                          item.badgeTone === "emerald"
                            ? "badge-success"
                            : item.badgeTone === "amber"
                              ? "badge-warning"
                              : item.badgeTone === "rose"
                                ? "badge-danger"
                                : item.badgeTone === "sky"
                                  ? "badge-info"
                                  : "badge-neutral"
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t theme-border flex items-center justify-between text-[11px] theme-text-muted">
          <span>Cmd/Ctrl+K per aprire · Esc per chiudere</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border theme-border bg-[var(--panel2)] px-3 py-1 text-[11px] theme-text hover:bg-[var(--panel)]"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

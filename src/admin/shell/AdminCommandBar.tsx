// src/admin/shell/AdminCommandBar.tsx

import React from "react";
import { Link } from "react-router-dom";
import type { Crumb } from "./adminUtils";
import { cn } from "./adminUtils";

export default function AdminCommandBar({
  kicker,
  title,
  breadcrumbs,
  searchPlaceholder,
  filters,
  actions,
  onOpenSearch,
}: {
  kicker?: string;
  title?: string;
  breadcrumbs?: Crumb[];
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onOpenSearch: () => void;
}): JSX.Element {
  return (
    <div className="rounded-2xl theme-panel">
      <div className="p-4 border-b theme-border">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="kicker">{kicker || "ADMIN"}</div>
            <div className="mt-1 text-[16px] font-semibold theme-text truncate">{title || "Console Admin"}</div>

            {breadcrumbs && breadcrumbs.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] theme-text-muted">
                {breadcrumbs.map((b, i) => (
                  <span key={`${b.label}-${i}`} className="flex items-center gap-2">
                    {b.to ? (
                      <Link to={b.to} className="theme-text hover:opacity-90">
                        {b.label}
                      </Link>
                    ) : (
                      <span className="theme-text">{b.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 ? <span className="theme-text-muted">/</span> : null}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <button
              type="button"
              onClick={onOpenSearch}
              className={cn(
                "w-full lg:w-[320px] rounded-xl border px-3 py-2 text-left",
                "theme-border bg-[var(--panel2)] text-[12px] theme-text-muted",
                "hover:opacity-90"
              )}
            >
              {searchPlaceholder || "Cerca in Admin (⌘K / Ctrl+K)"}
            </button>

            {actions ? <div className="flex items-center gap-2 flex-wrap justify-end">{actions}</div> : null}
          </div>
        </div>
      </div>

      {filters ? <div className="px-4 py-3 border-b theme-border">{filters}</div> : null}
    </div>
  );
}
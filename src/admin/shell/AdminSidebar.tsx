// src/admin/shell/AdminSidebar.tsx

import React from "react";
import { Link } from "react-router-dom";
import type { AdminMenuItem } from "./adminNav";
import { cn } from "./adminUtils";

function itemClass(active: boolean): string {
  return cn(
    "group flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors",
    active ? "theme-nav-item-active" : "theme-nav-item"
  );
}

function pill(): string {
  return cn("chip chip-status", "text-[10px]");
}

export default function AdminSidebar({
  items,
  displayEmail,
}: {
  items: AdminMenuItem[];
  displayEmail: string;
}): JSX.Element {
  return (
    <aside className="w-[280px] shrink-0 hidden lg:block">
      <div className="sticky top-6 h-[calc(100vh-48px)] px-4">
        <div className="rounded-2xl theme-panel h-full flex flex-col">
          <div className="p-4 border-b theme-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="kicker">CNCS</div>
                <div className="mt-1 text-[16px] font-semibold theme-text">ADMIN</div>
              </div>
              <span className={pill()}>Console Admin</span>
            </div>

            <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel2)] px-3 py-2">
              <div className="kicker">Profilo</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-[13px] font-semibold theme-text truncate">{displayEmail}</div>
                <div className="h-2 w-2 rounded-full bg-emerald-400" title="Online" />
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-2 overflow-auto">
            {items.map((it) => (
              <Link key={it.to} to={it.to} className={itemClass(it.active)}>
                <span className="h-2 w-2 rounded-full bg-[var(--borderStrong)]" />
                <span className="truncate">{it.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
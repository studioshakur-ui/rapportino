// src/admin/AdminShell.tsx
import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

type Lang = "it" | "fr" | "en";

type OutletCtx = {
  lang: Lang;
  setLang: React.Dispatch<React.SetStateAction<Lang>>;
};

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function itemClass(active: boolean): string {
  return cn(
    "group flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px]",
    active
      ? "border-sky-400/45 bg-slate-50/10 text-slate-50"
      : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/35",
    "transition-colors"
  );
}

function pill(): string {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-1",
    "text-[11px] font-extrabold tracking-[0.16em]",
    "border-slate-700 bg-slate-950/70 text-slate-200"
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }): JSX.Element {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">{kicker}</div>
      <div className="mt-1 text-[14px] font-semibold text-slate-50 truncate">{title}</div>
    </div>
  );
}

function menuItems(pathname: string) {
  const is = (p: string) => pathname.startsWith(p);
  return [
    { to: "/admin/users", label: "Utenti", active: is("/admin/users") },
    { to: "/admin/operators", label: "Operatori", active: is("/admin/operators") },
    // ✅ Perimetri (ship_managers + ship_operators)
    { to: "/admin/perimetri", label: "Perimetri", active: is("/admin/perimetri") },
    { to: "/admin/catalogo", label: "Catalogo", active: is("/admin/catalogo") },
    { to: "/admin/planning", label: "Planning (overview)", active: is("/admin/planning") },
    { to: "/admin/assignments", label: "Manager ↔ Capo", active: is("/admin/assignments") },
    { to: "/admin/audit", label: "Audit planning", active: is("/admin/audit") },
    { to: "/admin/core-drive", label: "CORE Drive", active: is("/admin/core-drive") || is("/admin/archive") },
  ];
}

export default function AdminShell(): JSX.Element {
  const location = useLocation();
  const [lang, setLang] = useState<Lang>("it");

  const items = useMemo(() => menuItems(location.pathname), [location.pathname]);

  const outletCtx: OutletCtx = useMemo(
    () => ({ lang, setLang }),
    [lang]
  );

  return (
    <div className="min-h-screen bg-[#050910] text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">CNCS</div>
                    <div className="mt-1 text-[16px] font-semibold text-slate-50">ADMIN</div>
                  </div>
                  <span className={pill()}>Console Admin</span>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Profilo</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-slate-50 truncate">admin@core.com</div>
                    <div className="h-2 w-2 rounded-full bg-emerald-400" title="Online" />
                  </div>
                </div>
              </div>

              <nav className="p-3 space-y-2">
                {items.map((it) => (
                  <Link key={it.to} to={it.to} className={itemClass(it.active)}>
                    <span className="h-2 w-2 rounded-full bg-slate-700 group-hover:bg-slate-600" />
                    <span className="truncate">{it.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-9">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <SectionTitle kicker="ADMIN · CNCS / CORE" title="Console Admin" />

                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/60 px-3 py-2">
                      <div className="text-[12px] text-slate-200">ADMIN@CORE.COM</div>
                    </div>

                    <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/60 p-1">
                      {(["it", "fr", "en"] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLang(l)}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[12px] font-semibold",
                            l === lang
                              ? "bg-slate-50/10 text-slate-50 border border-slate-700"
                              : "text-slate-300 hover:bg-slate-900/35"
                          )}
                        >
                          {l.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-2",
                        "text-[12px] font-semibold",
                        "border-rose-400/45 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                      )}
                      title="Logout"
                    >
                      LOGOUT
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Outlet context={outletCtx} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

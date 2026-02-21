// src/admin/AdminShell.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KeepAliveOutlet } from "../utils/KeepAliveOutlet";

import { useAuth } from "../auth/AuthProvider";
import ThemeSwitcher from "../components/ThemeSwitcher";
import {
  AdminConsoleContext,
  type AdminConsoleConfig,
  type AdminRecentItem,
  type AdminSearchItem,
} from "./AdminConsoleContext";

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

function menuItems(pathname: string) {
  const is = (p: string) => pathname.startsWith(p);
  return [
    { to: "/admin/users", label: "Utenti", active: is("/admin/users") },
    { to: "/admin/operators", label: "Operatori", active: is("/admin/operators") },
    { to: "/admin/perimetri", label: "Perimetri", active: is("/admin/perimetri") },
    { to: "/admin/catalogo", label: "Catalogo", active: is("/admin/catalogo") },
    { to: "/admin/planning", label: "Planning (overview)", active: is("/admin/planning") },
    { to: "/admin/assignments", label: "Manager ↔ Capo", active: is("/admin/assignments") },
    { to: "/admin/audit", label: "Audit planning", active: is("/admin/audit") },
    { to: "/admin/core-drive", label: "CORE Drive", active: is("/admin/core-drive") || is("/admin/archive") },
  ];
}

type Crumb = { label: string; to?: string };

function defaultConsoleConfig(pathname: string): AdminConsoleConfig {
  const base: AdminConsoleConfig = {
    kicker: "ADMIN · CNCS / CORE",
    title: "Console Admin",
    breadcrumbs: [{ label: "Admin", to: "/admin/users" }],
    searchPlaceholder: "Cerca in Admin (⌘K / Ctrl+K)",
  };

  if (pathname.startsWith("/admin/users")) {
    return {
      ...base,
      title: "Utenti",
      breadcrumbs: [{ label: "Admin", to: "/admin/users" }, { label: "Utenti" }],
      searchPlaceholder: "Cerca utenti, email, ruolo…",
    };
  }
  if (pathname.startsWith("/admin/operators")) {
    return {
      ...base,
      title: "Operatori",
      breadcrumbs: [{ label: "Admin", to: "/admin/users" }, { label: "Operatori" }],
      searchPlaceholder: "Cerca operatori, codici, ruoli…",
    };
  }
  if (pathname.startsWith("/admin/perimetri")) {
    return {
      ...base,
      title: "Perimetri",
      breadcrumbs: [{ label: "Admin", to: "/admin/users" }, { label: "Perimetri" }],
      searchPlaceholder: "Cerca navi, operatori, perimetri…",
    };
  }
  if (pathname.startsWith("/admin/catalogo")) {
    return {
      ...base,
      title: "Catalogo",
      breadcrumbs: [{ label: "Admin", to: "/admin/users" }, { label: "Catalogo" }],
      searchPlaceholder: "Cerca attività, categorie, sinonimi…",
    };
  }
  if (pathname.startsWith("/admin/planning")) {
    return {
      ...base,
      title: "Planning",
      breadcrumbs: [{ label: "Admin", to: "/admin/users" }, { label: "Planning" }],
      searchPlaceholder: "Cerca piani, capi, manager, operatori…",
    };
  }
  if (pathname.startsWith("/admin/assignments")) {
    return {
      ...base,
      title: "Manager ↔ Capo",
      breadcrumbs: [{ label: "Admin", to: "/admin/users" }, { label: "Manager ↔ Capo" }],
      searchPlaceholder: "Cerca capi o manager…",
    };
  }
  if (pathname.startsWith("/admin/audit")) {
    return {
      ...base,
      title: "Audit planning",
      breadcrumbs: [{ label: "Admin", to: "/admin/users" }, { label: "Audit planning" }],
      searchPlaceholder: "Cerca azioni, attori, plan_id…",
    };
  }
  if (pathname.startsWith("/admin/core-drive") || pathname.startsWith("/admin/archive")) {
    return {
      ...base,
      title: "CORE Drive",
      breadcrumbs: [{ label: "Admin", to: "/admin/users" }, { label: "CORE Drive" }],
      searchPlaceholder: "Cerca in CORE Drive…",
    };
  }
  return base;
}

function CommandBar({
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
      <div className="p-4 border-b border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">{kicker || "ADMIN"}</div>
            <div className="mt-1 text-[16px] font-semibold text-slate-50 truncate">{title || "Console Admin"}</div>
            {breadcrumbs && breadcrumbs.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                {breadcrumbs.map((b, i) => (
                  <span key={`${b.label}-${i}`} className="flex items-center gap-2">
                    {b.to ? (
                      <Link to={b.to} className="text-slate-300 hover:text-slate-100">
                        {b.label}
                      </Link>
                    ) : (
                      <span className="text-slate-300">{b.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 ? <span className="text-slate-700">/</span> : null}
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
                "hover:bg-slate-900/35"
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

function SearchPalette({
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
            <div className="px-4 py-6 text-[12px] text-slate-500">Nessun risultato.</div>
          ) : (
            <div className="divide-y theme-border">
              {filtered.map((item) => (
                <button
                  key={`${item.entity}-${item.id}`}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-900/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-100 truncate">{item.title}</div>
                      <div className="mt-1 text-[11px] text-slate-500 truncate">
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

function RecentPanel({ items }: { items: AdminRecentItem[] }): JSX.Element | null {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl theme-panel">
      <div className="px-4 py-3 border-b theme-border">
        <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Recent changes</div>
        <div className="mt-1 text-[12px] text-slate-300">Ultimi aggiornamenti disponibili</div>
      </div>
      <div className="divide-y theme-border">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="text-[12px] text-slate-100 font-semibold truncate">{item.title}</div>
            {item.subtitle ? <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div> : null}
            {item.timeLabel ? <div className="mt-1 text-[11px] text-slate-500">{item.timeLabel}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminShell(): JSX.Element {
  const location = useLocation();
  const [lang, setLang] = useState<Lang>("it");

  const nav = useNavigate();
  const { profile, signOut, uid } = useAuth();

  const displayEmail = useMemo(() => {
    const e = (profile as any)?.email;
    return typeof e === "string" && e.trim() ? e.trim() : "—";
  }, [profile]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut({ reason: "admin_logout" });
    } finally {
      nav("/login", { replace: true });
    }
  }, [nav, signOut]);

  const items = useMemo(() => menuItems(location.pathname), [location.pathname]);

  const outletCtx: OutletCtx = useMemo(() => ({ lang, setLang }), [lang]);

  // ✅ CRITICAL: invalidate keep-alive cache on uid/role change
  const keepAliveInvalidateKey = useMemo(() => {
    const role = (profile as any)?.app_role;
    return `${uid || "_"}::${typeof role === "string" ? role : "_"}`;
  }, [uid, profile]);

  /**
   * ✅ ADMIN KEEP-ALIVE MUST BE SELECTIVE
   * KeepAlive hides inactive views via display:none. Some pages (planning/audit/charts)
   * can become unstable when cached.
   */
  const adminShouldCache = useMemo(() => {
    return ({ pathname }: { pathname: string }) => {
      if (!pathname.startsWith("/admin")) return true;

      // Exclude heavy/graph-like or scroll-complex pages
      if (pathname.startsWith("/admin/planning")) return false;
      if (pathname.startsWith("/admin/audit")) return false;
      if (pathname.startsWith("/admin/core-drive")) return false;
      if (pathname.startsWith("/admin/archive")) return false;

      // Stable consoles
      if (pathname.startsWith("/admin/users")) return true;
      if (pathname.startsWith("/admin/operators")) return true;
      if (pathname.startsWith("/admin/perimetri")) return true;
      if (pathname.startsWith("/admin/catalogo")) return true;
      if (pathname.startsWith("/admin/assignments")) return true;

      // Default: no keep-alive (predictable)
      return false;
    };
  }, []);

  // iOS/trackpad “ghost tap” mitigation window.
  const TAP_HARDLOCK_MS = 900;
  const [tapHardlock, setTapHardlock] = useState<boolean>(false);

  useEffect(() => {
    const pathname = location.pathname || "";
    if (!pathname.startsWith("/admin")) return;

    setTapHardlock(true);

    const root = document.documentElement;
    const prevPointerEvents = root.style.pointerEvents;
    root.style.pointerEvents = "none";

    const tmr = window.setTimeout(() => {
      root.style.pointerEvents = prevPointerEvents;
      setTapHardlock(false);
    }, TAP_HARDLOCK_MS);

    return () => {
      window.clearTimeout(tmr);
      root.style.pointerEvents = prevPointerEvents;
      setTapHardlock(false);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!tapHardlock) return;

    const stop = (e: Event) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).stopImmediatePropagation?.();
      } catch {
        // ignore
      }
    };

    window.addEventListener("touchstart", stop, true);
    window.addEventListener("touchend", stop, true);
    window.addEventListener("pointerdown", stop, true);
    window.addEventListener("pointerup", stop, true);
    window.addEventListener("mousedown", stop, true);
    window.addEventListener("mouseup", stop, true);
    window.addEventListener("click", stop, true);

    return () => {
      window.removeEventListener("touchstart", stop, true);
      window.removeEventListener("touchend", stop, true);
      window.removeEventListener("pointerdown", stop, true);
      window.removeEventListener("pointerup", stop, true);
      window.removeEventListener("mousedown", stop, true);
      window.removeEventListener("mouseup", stop, true);
      window.removeEventListener("click", stop, true);
    };
  }, [tapHardlock]);

  const defaultConfig = useMemo(() => defaultConsoleConfig(location.pathname || ""), [location.pathname]);
  const [overrideConfig, setOverrideConfig] = useState<AdminConsoleConfig | null>(null);
  const [searchIndex, setSearchIndex] = useState<Record<string, AdminSearchItem[]>>({});
  const [recentItems, setRecentItems] = useState<AdminRecentItem[]>([]);

  useEffect(() => {
    setOverrideConfig(null);
    setRecentItems([]);
  }, [location.pathname]);

  const config = overrideConfig ?? defaultConfig;

  const setConfig = useCallback(
    (patch: Partial<AdminConsoleConfig>) => {
      setOverrideConfig((prev) => ({ ...(prev ?? defaultConfig), ...patch }));
    },
    [defaultConfig]
  );

  const resetConfig = useCallback(() => setOverrideConfig(null), []);

  const registerSearchItems = useCallback((entity: string, itemsToRegister: AdminSearchItem[]) => {
    setSearchIndex((prev) => ({ ...prev, [entity]: itemsToRegister }));
  }, []);

  const clearSearchItems = useCallback((entity: string) => {
    setSearchIndex((prev) => {
      const next = { ...prev };
      delete next[entity];
      return next;
    });
  }, []);

  const searchItems = useMemo(() => {
    const all = Object.values(searchIndex).flat();
    return all.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }, [searchIndex]);

  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSelectSearchItem = useCallback(
    (item: AdminSearchItem) => {
      setSearchOpen(false);
      if (item.route) nav(item.route);
    },
    [nav]
  );

  const outletValue = useMemo(
    () => ({
      config,
      setConfig,
      resetConfig,
      registerSearchItems,
      clearSearchItems,
      searchItems,
      recentItems,
      setRecentItems,
    }),
    [config, setConfig, resetConfig, registerSearchItems, clearSearchItems, searchItems, recentItems]
  );

  const actions = (
    <>
      <div className="inline-flex items-center rounded-full border theme-border bg-[var(--panel2)] px-3 py-2">
        <div className="text-[12px] theme-text">{displayEmail.toUpperCase()}</div>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full border theme-border bg-[var(--panel2)] p-1">
        {(["it", "fr", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] font-semibold",
              l === lang
                ? "accent-soft"
                : "theme-text-muted hover:bg-[var(--panel)]"
            )}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          "inline-flex items-center rounded-full border px-3 py-2",
          "text-[12px] font-semibold",
          "border-rose-400/45 bg-[var(--panel2)] text-rose-100 hover:bg-rose-500/15"
        )}
        title="Logout"
      >
        LOGOUT
      </button>
    </>
  );

  return (
    <AdminConsoleContext.Provider value={outletValue}>
      <div className="min-h-screen theme-bg theme-scope admin-scope">
        <div className="flex min-h-screen">
          <aside className="w-[280px] shrink-0 hidden lg:block">
            <div className="sticky top-6 h-[calc(100vh-48px)] px-4">
              <div className="rounded-2xl theme-panel h-full flex flex-col">
                <div className="p-4 border-b theme-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">CNCS</div>
                      <div className="mt-1 text-[16px] font-semibold text-slate-50">ADMIN</div>
                    </div>
                    <span className={pill()}>Console Admin</span>
                  </div>

                  <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel2)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Profilo</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-[13px] font-semibold text-slate-50 truncate">{displayEmail}</div>
                      <div className="h-2 w-2 rounded-full bg-emerald-400" title="Online" />
                    </div>
                  </div>
                </div>

                <nav className="p-3 space-y-2 overflow-auto">
                  {items.map((it) => (
                    <Link key={it.to} to={it.to} className={itemClass(it.active)}>
                      <span className="h-2 w-2 rounded-full bg-slate-700 group-hover:bg-slate-600" />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="px-6 lg:px-8 py-6 min-h-screen flex flex-col gap-4 w-full max-w-none">
              <CommandBar
                kicker={config.kicker}
                title={config.title}
                breadcrumbs={config.breadcrumbs as Crumb[] | undefined}
                searchPlaceholder={config.searchPlaceholder}
                filters={config.filters}
                actions={
                  <>
                    {config.actions ? <div className="mr-2">{config.actions}</div> : null}
                    <ThemeSwitcher />
                    {actions}
                  </>
                }
                onOpenSearch={() => setSearchOpen(true)}
              />

              <div
                className={cn(
                  "grid grid-cols-1 gap-4 min-h-0",
                  config.rightDrawer || recentItems.length ? "xl:grid-cols-[minmax(0,1fr)_320px]" : ""
                )}
              >
                <div className="min-h-0 min-w-0">
                  <div className="rounded-2xl theme-panel min-h-0">
                    <div className="p-4 min-h-0" style={{ touchAction: "manipulation" }}>
                      <KeepAliveOutlet
                        scopeKey="admin"
                        context={outletCtx}
                        invalidateKey={keepAliveInvalidateKey}
                        shouldCache={adminShouldCache as any}
                      />
                    </div>
                  </div>
                </div>

                {config.rightDrawer ? (
                  <aside className="min-h-0">{config.rightDrawer}</aside>
                ) : recentItems.length ? (
                  <aside className="min-h-0">
                    <RecentPanel items={recentItems} />
                  </aside>
                ) : null}
              </div>
            </div>
          </main>
        </div>
      </div>

      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={onSelectSearchItem}
        items={searchItems}
      />
    </AdminConsoleContext.Provider>
  );
}

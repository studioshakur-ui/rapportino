// src/admin/AdminShell.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { KeepAliveOutlet } from "../utils/KeepAliveOutlet";

import { useAuth } from "../auth/AuthProvider";
import ThemeSwitcher from "../components/ThemeSwitcher";

import {
  AdminConsoleContext,
  type AdminConsoleConfig,
  type AdminRecentItem,
  type AdminSearchItem,
} from "./AdminConsoleContext";

import AdminSidebar from "./shell/AdminSidebar";
import AdminCommandBar from "./shell/AdminCommandBar";
import AdminSearchPalette from "./shell/AdminSearchPalette";
import AdminRecentPanel from "./shell/AdminRecentPanel";
import { cn, type Lang } from "./shell/adminUtils";
import { buildAdminMenu, defaultConsoleConfig } from "./shell/adminNav";

type OutletCtx = {
  lang: Lang;
  setLang: React.Dispatch<React.SetStateAction<Lang>>;
};

export default function AdminShell(): JSX.Element {
  const location = useLocation();
  const nav = useNavigate();
  const { profile, signOut, uid } = useAuth();

  const [lang, setLang] = useState<Lang>("it");

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

  const items = useMemo(() => buildAdminMenu(location.pathname), [location.pathname]);
  const outletCtx: OutletCtx = useMemo(() => ({ lang, setLang }), [lang]);

  // ✅ keep-alive cache invalidation on uid/role change
  const keepAliveInvalidateKey = useMemo(() => {
    const role = (profile as any)?.app_role;
    return `${uid || "_"}::${typeof role === "string" ? role : "_"}`;
  }, [uid, profile]);

  // ✅ selective caching (predictable)
  const adminShouldCache = useMemo(() => {
    return ({ pathname }: { pathname: string }) => {
      if (!pathname.startsWith("/admin")) return true;
      if (pathname.startsWith("/admin/planning")) return false;
      if (pathname.startsWith("/admin/audit")) return false;
      if (pathname.startsWith("/admin/core-drive")) return false;
      if (pathname.startsWith("/admin/archive")) return false;

      if (pathname.startsWith("/admin/users")) return true;
      if (pathname.startsWith("/admin/operators")) return true;
      if (pathname.startsWith("/admin/perimetri")) return true;
      if (pathname.startsWith("/admin/catalogo")) return true;
      if (pathname.startsWith("/admin/assignments")) return true;

      return false;
    };
  }, []);

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
              l === lang ? "accent-soft" : "theme-text-muted hover:bg-[var(--panel)]"
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
          "inline-flex items-center rounded-full px-3 py-2",
          "text-[12px] font-semibold badge-danger"
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
          <AdminSidebar items={items} displayEmail={displayEmail} />

          <main className="flex-1 min-w-0">
            <div className="cncs-workspace min-h-screen flex flex-col gap-4">
              <AdminCommandBar
                kicker={config.kicker}
                title={config.title}
                breadcrumbs={config.breadcrumbs as any}
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
                  "cncs-container grid grid-cols-1 gap-4 min-h-0",
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
                    <AdminRecentPanel items={recentItems} />
                  </aside>
                ) : null}
              </div>
            </div>
          </main>
        </div>
      </div>

      <AdminSearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={onSelectSearchItem}
        items={searchItems}
      />
    </AdminConsoleContext.Provider>
  );
}

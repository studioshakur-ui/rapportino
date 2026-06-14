// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppRoutes from "./routes";
import ErrorBoundary from "./components/ErrorBoundary";
import { supabaseConfigured } from "./lib/supabaseClient";
import { useRealtimeSync } from "./lib/useRealtimeSync";
import { AuthProvider } from "./auth/AuthProvider";
import { I18nProvider } from "./i18n/I18nProvider";
import { dictionaries } from "./i18n/dictionaries";
import { initThemeFromStorage } from "./hooks/useTheme";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./styles/core-colors.css";
import "./theme/tokens.css";
import "./styles/core-ui.css";
import "./index.css";

// Écran de config dédié : évite l'écran blanc quand les creds Supabase
// ne sont pas injectées dans le build (cause #1 de page blanche en prod).
function SupabaseConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md w-full rounded-2xl border border-zinc-200 bg-white p-6 space-y-3 text-center">
        <p className="text-3xl" aria-hidden>🔌</p>
        <h1 className="text-lg font-bold">Configuration Supabase manquante</h1>
        <p className="text-sm text-zinc-500">
          Les variables <code className="font-mono">VITE_SUPABASE_URL</code> et{" "}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> doivent être définies
          dans les variables d'environnement du déploiement, puis redéployer.
        </p>
      </div>
    </div>
  );
}

/**
 * AppShell recovery for Vite chunk / dynamic-import failures.
 *
 * Symptôme typique (iOS Safari surtout):
 * - clic sur un module → "revient" / UI semble reset
 * - hard refresh → OK
 *
 * Cause fréquente:
 * - index.html en cache (stale) référence une graph de chunks qui ne matche plus
 * - dynamic import échoue (ChunkLoadError / failed to fetch module)
 *
 * Remède:
 * - 1 reload automatique max par minute quand on détecte ces erreurs
 */
function installChunkLoadRecovery(): void {
  const KEY = "__core_chunk_recovery_last_reload__";
  const now = Date.now();

  const last = Number(sessionStorage.getItem(KEY) ?? "0");
  const recentlyReloaded = Number.isFinite(last) && now - last < 60_000;

  const shouldReloadForMessage = (message: string): boolean => {
    const m = message.toLowerCase();
    return (
      m.includes("failed to fetch dynamically imported module") ||
      m.includes("importing a module script failed") ||
      m.includes("chunkloaderror") ||
      m.includes("loading chunk")
    );
  };

  const triggerReload = (): void => {
    if (recentlyReloaded) return;
    sessionStorage.setItem(KEY, String(now));
    window.location.reload();
  };

  window.addEventListener("error", (event) => {
    const msg = String((event as ErrorEvent).message ?? "");
    if (msg && shouldReloadForMessage(msg)) triggerReload();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const msg = String((reason && (reason.message ?? reason)) ?? "");
    if (msg && shouldReloadForMessage(msg)) triggerReload();
  });
}

// Mounts the live Realtime → React Query bridge inside the provider tree.
function RealtimeSync(): null {
  useRealtimeSync();
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

initThemeFromStorage();
installChunkLoadRecovery();

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      {supabaseConfigured ? (
        <QueryClientProvider client={queryClient}>
          <RealtimeSync />
          <ThemeProvider>
            <AuthProvider>
              <I18nProvider dictionaries={dictionaries}>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </I18nProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ) : (
        <SupabaseConfigError />
      )}
    </ErrorBoundary>
  </React.StrictMode>
);

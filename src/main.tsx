// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppRoutes from "./routes";
import { AuthProvider } from "./auth/AuthProvider";
import { ShipProvider } from "./context/ShipContext";
import { I18nProvider } from "./i18n/I18nProvider";

import "./index.css";
import "./styles/inca-percorso-search.css";

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

installChunkLoadRecovery();

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <ShipProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ShipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
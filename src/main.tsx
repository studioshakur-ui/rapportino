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

/**
 * Robust print isolation for Rapportino.
 *
 * Objectif:
 * - Éliminer totalement les backgrounds du shell (AppShell, page wrappers, overlays)
 * - Éviter les pages blanches / cadres noirs
 * - Imprimer UNIQUEMENT #rapportino-document, quel que soit le layout courant
 *
 * Stratégie:
 * - beforeprint / matchMedia('print'): déplacer temporairement #rapportino-document sous <body>
 * - ajouter une classe html.core-printing
 * - afterprint: restaurer le DOM à l'identique
 */
function installRapportinoPrintIsolation(): void {
  const HTML_CLASS = "core-printing";
  const PLACEHOLDER_ID = "__core_print_placeholder__";

  let movedEl: HTMLElement | null = null;
  let placeholderEl: HTMLElement | null = null;

  const cleanup = (): void => {
    document.documentElement.classList.remove(HTML_CLASS);

    // Restore DOM if we moved it
    if (movedEl && placeholderEl && placeholderEl.parentNode) {
      placeholderEl.parentNode.insertBefore(movedEl, placeholderEl);
      placeholderEl.remove();
    } else {
      // if placeholder exists but missing movedEl, remove it anyway
      const ph = document.getElementById(PLACEHOLDER_ID);
      if (ph) ph.remove();
    }

    movedEl = null;
    placeholderEl = null;
  };

  const prepare = (): void => {
    // Only apply when the Rapportino document exists in DOM
    const docEl = document.getElementById("rapportino-document") as HTMLElement | null;
    if (!docEl) {
      cleanup();
      return;
    }

    // Avoid double-move
    if (movedEl === docEl && placeholderEl) {
      document.documentElement.classList.add(HTML_CLASS);
      return;
    }

    // Cleanup any stale state
    cleanup();

    // Insert placeholder at original position
    const ph = document.createElement("div");
    ph.id = PLACEHOLDER_ID;

    const parent = docEl.parentNode;
    if (!parent) return;

    parent.insertBefore(ph, docEl);

    // Move the document under <body> (top-level), so print CSS can hide everything else safely
    document.body.appendChild(docEl);

    movedEl = docEl;
    placeholderEl = ph;

    document.documentElement.classList.add(HTML_CLASS);
  };

  // Chrome / most browsers
  window.addEventListener("beforeprint", prepare);
  window.addEventListener("afterprint", cleanup);

  // Safari/iOS: matchMedia('print') is often more reliable
  const mql = window.matchMedia?.("print");
  if (mql) {
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      // Some browsers call with MediaQueryList, some with event
      const matches = "matches" in e ? e.matches : false;
      if (matches) prepare();
      else cleanup();
    };

    // Modern
    if ("addEventListener" in mql) {
      mql.addEventListener("change", onChange);
    } else if ("addListener" in mql) {
      // Legacy Safari
      // @ts-expect-error legacy API
      mql.addListener(onChange);
    }
  }
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
installRapportinoPrintIsolation();

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

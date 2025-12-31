// src/main.jsx
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

// React Query — Global QueryClient
// Notes:
// - Cockpit/preview patterns benefit from explicit caching policies.
// - Keep defaults conservative (reliability > aggressiveness).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s: avoids refetch storms while keeping cockpit data reasonably fresh.
      staleTime: 30_000,
      // 5 min: keep cache warm for drawers/panels without hoarding memory.
      gcTime: 5 * 60_000,
      // Avoid endless retries masking real backend/auth issues.
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
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
);

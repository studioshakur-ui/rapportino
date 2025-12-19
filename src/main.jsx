// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRoutes from "./routes";
import { AuthProvider } from "./auth/AuthProvider";
import { ShipProvider } from "./context/ShipContext";
import { I18nProvider } from "./i18n/I18nProvider";

import "./index.css";
import "./styles/inca-percorso-search.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <I18nProvider>
      <ShipProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ShipProvider>
    </I18nProvider>
  </AuthProvider>
);

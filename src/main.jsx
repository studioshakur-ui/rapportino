import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRoutes from "./routes";
import { AuthProvider } from "./auth/AuthProvider";
import { ShipProvider } from "./context/ShipContext";
import { I18nProvider } from "./i18n/I18nProvider";

import "./index.css";
import "./styles/core-colors.css";
import "./styles/core-ui.css";
import "./styles/inca-popover-polish.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <ShipProvider>
            <AppRoutes />
          </ShipProvider>
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

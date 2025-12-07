// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import { ShipProvider } from "./context/ShipContext";
import App from "./App";

import "./index.css";

const container = document.getElementById("root");

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <ShipProvider>
          <App />
        </ShipProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

// src/routes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import RequireRole from "./auth/RequireRole";

import Landing from "./pages/Landing";
import Login from "./pages/Login";

import AppShell from "./AppShell";
import UfficioShell from "./UfficioShell";
import DirectionShell from "./DirectionShell";
import ManagerShell from "./ManagerShell";

// CAPO – contenu
import RapportinoPage from "./components/RapportinoPage";
import ShipSelector from "./pages/ShipSelector";
import CapoModuleSelector from "./pages/CapoModuleSelector";
import CapoRoleSelector from "./pages/CapoRoleSelector";
import IncaCapoCockpit from "./capo/IncaCapoCockpit";

// UFFICIO – contenu
import UfficioRapportiniList from "./ufficio/UfficioRapportiniList";
import UfficioRapportinoDetail from "./ufficio/UfficioRapportinoDetail";
import IncaFilesPanel from "./inca/IncaFilesPanel";

// ARCHIVE central (CORE Drive v1)
import ArchivePage from "./pages/Archive";

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* ===== CAPO ===== */}
      <Route
        path="/app/*"
        element={
          <RequireRole allow={["CAPO"]}>
            <AppShell />
          </RequireRole>
        }
      >
        {/* 1️⃣ Choix bateau */}
        <Route index element={<ShipSelector />} />

        {/* 2️⃣ Choix module */}
        <Route path="ship/:shipId" element={<CapoModuleSelector />} />

        {/* 3️⃣ Choix rôle pour le rapportino */}
        <Route
          path="ship/:shipId/rapportino/role"
          element={<CapoRoleSelector />}
        />

        {/* 4️⃣ RAPPORTINO */}
        <Route
          path="ship/:shipId/rapportino"
          element={<RapportinoPage />}
        />

        {/* 5️⃣ INCA CAPO */}
        <Route
          path="ship/:shipId/inca"
          element={<IncaCapoCockpit />}
        />

        {/* ARCHIVE CAPO – CORE Drive, filtré par capo */}
        <Route path="archive" element={<ArchivePage />} />
      </Route>

      {/* ===== UFFICIO ===== */}
      <Route
        path="/ufficio/*"
        element={
          <RequireRole allow={["UFFICIO", "DIREZIONE", "MANAGER"]}>
            <UfficioShell />
          </RequireRole>
        }
      >
        {/* Liste rapportini par défaut */}
        <Route index element={<UfficioRapportiniList />} />

        {/* Détail rapportino */}
        <Route
          path="rapportini/:id"
          element={<UfficioRapportinoDetail />}
        />

        {/* INCA UFFICIO */}
        <Route path="inca" element={<IncaFilesPanel />} />

        {/* ARCHIVE UFFICIO – CORE Drive v1 */}
        <Route path="archive" element={<ArchivePage />} />
      </Route>

      {/* ===== MANAGER ===== */}
      <Route
        path="/manager/*"
        element={
          <RequireRole allow={["MANAGER"]}>
            <ManagerShell />
          </RequireRole>
        }
      />

      {/* ===== DIREZIONE ===== */}
      <Route
        path="/direction/*"
        element={
          <RequireRole allow={["DIREZIONE", "MANAGER"]}>
            <DirectionShell />
          </RequireRole>
        }
      />

      {/* Fallback */}
      <Route path="/*" element={<Landing />} />
    </Routes>
  );
}

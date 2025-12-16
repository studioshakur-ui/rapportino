// src/routes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import RequireRole from "./auth/RequireRole";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ForcePasswordChange from "./pages/ForcePasswordChange";

import AppShell from "./AppShell";
import UfficioShell from "./UfficioShell";
import DirectionShell from "./DirectionShell";
import ManagerShell from "./ManagerShell";

// ADMIN
import AdminShell from "./admin/AdminShell";
import AdminUsersPage from "./admin/AdminUsersPage";

// CAPO
import RapportinoPage from "./components/RapportinoPage";
import RapportinoSheet from "./components/RapportinoSheet";
import ShipSelector from "./pages/ShipSelector";
import CapoModuleSelector from "./pages/CapoModuleSelector";
import CapoRoleSelector from "./pages/CapoRoleSelector";
import IncaCapoCockpit from "./capo/IncaCapoCockpit";

// UFFICIO
import UfficioRapportiniList from "./ufficio/UfficioRapportiniList";
import UfficioRapportinoDetail from "./ufficio/UfficioRapportinoDetail";
import IncaFilesPanel from "./inca/IncaFilesPanel";

// ARCHIVE
import ArchivePage from "./pages/Archive";

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/force-password-change" element={<ForcePasswordChange />} />

      {/* ===== CAPO PRINT (Sheet) — DANS /app POUR GARDER LA SESSION ===== */}
      <Route
        path="/app/rapportino/sheet"
        element={
          <RequireRole allow={["CAPO"]}>
            <RapportinoSheet />
          </RequireRole>
        }
      />

      {/* ===== ADMIN ===== */}
      <Route
        path="/admin/*"
        element={
          <RequireRole allow={["ADMIN"]}>
            <AdminShell />
          </RequireRole>
        }
      >
        <Route index element={<AdminUsersPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      {/* ===== CAPO ===== */}
      <Route
        path="/app/*"
        element={
          <RequireRole allow={["CAPO"]}>
            <AppShell />
          </RequireRole>
        }
      >
        <Route index element={<ShipSelector />} />
        <Route path="ship/:shipId" element={<CapoModuleSelector />} />
        <Route path="ship/:shipId/rapportino/role" element={<CapoRoleSelector />} />
        <Route path="ship/:shipId/rapportino" element={<RapportinoPage />} />
        <Route path="ship/:shipId/inca" element={<IncaCapoCockpit />} />
        <Route path="archive" element={<ArchivePage />} />
      </Route>

      {/* ===== UFFICIO ===== */}
      <Route
        path="/ufficio/*"
        element={
          <RequireRole allow={["UFFICIO", "DIREZIONE", "MANAGER", "ADMIN"]}>
            <UfficioShell />
          </RequireRole>
        }
      >
        <Route index element={<UfficioRapportiniList />} />
        <Route path="rapportini/:id" element={<UfficioRapportinoDetail />} />
        <Route path="inca" element={<IncaFilesPanel />} />
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

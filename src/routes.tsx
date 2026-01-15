// src/routes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ForcePasswordChange from "./pages/ForcePasswordChange";

// SHELLS
import AppShell from "./shells/AppShell";
import UfficioShell from "./shells/UfficioShell";
import DirectionShell from "./shells/DirectionShell";
import ManagerShell from "./shells/ManagerShell";
import AdminShell from "./admin/AdminShell";

// CAPO
import RapportinoPage from "./components/RapportinoPage";
import ShipSelector from "./pages/ShipSelector";
import CapoOperatorKpi from "./features/kpi/pages/CapoOperatorKpi";
import CapoMegaKpiStesura from "./features/kpi/pages/CapoMegaKpiStesura";
import CapoModuleSelector from "./pages/CapoModuleSelector";
import CapoRoleSelector from "./pages/CapoRoleSelector";
import IncaCapoCockpit from "./capo/IncaCapoCockpit";

// CAPO SIMPLE (new)
import CapoEntryRouter from "./capo/simple/CapoEntryRouter";
import CapoPresencePage from "./capo/simple/CapoPresencePage";

// ADMIN
import AdminUsersPage from "./admin/AdminUsersPage";
import AdminOperatorsPage from "./admin/AdminOperatorsPage";
import AdminCatalogoPage from "./admin/AdminCatalogoPage";
import AdminPlanningPage from "./admin/AdminPlanningPage";
import AdminAssignmentsPage from "./admin/AdminAssignmentsPage";
import AdminAuditPage from "./admin/AdminAuditPage";

// UFFICIO
import UfficioRapportiniList from "./ufficio/UfficioRapportiniList";
import UfficioRapportinoDetail from "./ufficio/UfficioRapportinoDetail";
import UfficioIncaHub from "./ufficio/UfficioIncaHub";

// DIRECTION
import DirectionDashboard from "./components/DirectionDashboard";

// MANAGER
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerCapoShipPlanning from "./pages/ManagerCapoShipPlanning";

// CORE DRIVE
import ArchivePage from "./pages/Archive";

// EVOLUZIONE
import Evoluzione from "./data/Evoluzione";

export default function AppRoutes(): JSX.Element {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Force password change */}
      <Route
        path="/force-password-change"
        element={
          <RequireAuth>
            <ForcePasswordChange />
          </RequireAuth>
        }
      />

      {/* ===== ADMIN ===== */}
      <Route
        path="/admin/*"
        element={
          <RequireAuth>
            <RequireRole allowed={["ADMIN"]}>
              <AdminShell />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="operators" element={<AdminOperatorsPage />} />
        <Route path="catalogo" element={<AdminCatalogoPage />} />
        <Route path="planning" element={<AdminPlanningPage />} />
        <Route path="assignments" element={<AdminAssignmentsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
      </Route>

      {/* ===== CAPO ===== */}
      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <RequireRole allowed={["CAPO"]}>
              <AppShell />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<CapoEntryRouter />} />
        <Route path="ship/:shipId/presence" element={<CapoPresencePage />} />

        <Route path="ship-selector" element={<ShipSelector />} />
        <Route path="kpi-operatori" element={<CapoOperatorKpi isDark={true} />} />
        <Route path="ship/:shipId/kpi-stesura" element={<CapoMegaKpiStesura isDark={true} />} />
        <Route path="ship/:shipId" element={<CapoModuleSelector />} />

        <Route path="ship/:shipId/rapportino/role" element={<CapoRoleSelector />} />
        <Route path="ship/:shipId/rapportino" element={<RapportinoPage />} />

        <Route path="ship/:shipId/inca" element={<IncaCapoCockpit />} />
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
      </Route>

      {/* ===== UFFICIO ===== */}
      <Route
        path="/ufficio/*"
        element={
          <RequireAuth>
            <RequireRole allowed={["UFFICIO", "DIREZIONE", "MANAGER", "ADMIN"]}>
              <UfficioShell />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<UfficioRapportiniList />} />
        <Route path="rapportino/:rapportinoId" element={<UfficioRapportinoDetail />} />
        <Route path="inca" element={<UfficioIncaHub />} />
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
      </Route>

      {/* ===== DIREZIONE ===== */}
      <Route
        path="/direzione/*"
        element={
          <RequireAuth>
            <RequireRole allowed={["DIREZIONE", "ADMIN"]}>
              <DirectionShell />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<DirectionDashboard />} />
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
      </Route>

      {/* ===== MANAGER ===== */}
      <Route
        path="/manager/*"
        element={
          <RequireAuth>
            <RequireRole allowed={["MANAGER", "ADMIN"]}>
              <ManagerShell />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<ManagerDashboard />} />
        <Route path="capi-cantieri" element={<ManagerCapoShipPlanning isDark={true} />} />
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
      </Route>

      {/* ===== MISC ===== */}
      <Route path="/evoluzione" element={<Evoluzione />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
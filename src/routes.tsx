// src/routes.tsx
import { Routes, Route, Navigate } from "react-router-dom";

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

// ADMIN
import AdminShell from "./admin/AdminShell";
import AdminUsersPage from "./admin/AdminUsersPage";
import AdminPlanningPage from "./admin/AdminPlanningPage";
import AdminAssignmentsPage from "./admin/AdminAssignmentsPage";
import AdminAuditPage from "./admin/AdminAuditPage";
import AdminOperatorsPage from "./admin/AdminOperatorsPage";
import AdminCatalogoPage from "./admin/AdminCatalogoPage";

// CAPO
import RapportinoPage from "./components/RapportinoPage";
import RapportinoSheet from "./components/RapportinoSheet";
import ShipSelector from "./pages/ShipSelector";
import CapoOperatorKpi from "./features/kpi/pages/CapoOperatorKpi";
import CapoModuleSelector from "./pages/CapoModuleSelector";
import CapoRoleSelector from "./pages/CapoRoleSelector";
import IncaCapoCockpit from "./capo/IncaCapoCockpit";

// CAPO SIMPLE (new)
import CapoEntryRouter from "./capo/simple/CapoEntryRouter";
import CapoPresencePage from "./capo/simple/CapoPresencePage";
import CapoPresenceGate from "./capo/simple/CapoPresenceGate";

// UFFICIO
import UfficioRapportiniList from "./ufficio/UfficioRapportiniList";
import UfficioRapportinoDetail from "./ufficio/UfficioRapportinoDetail";
import UfficioIncaHub from "./ufficio/UfficioIncaHub";
import NavemasterHub from "./navemaster/NavemasterHub";

// MANAGER
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerAssignments from "./pages/ManagerAssignments";
import ManagerCoreDrive from "./pages/ManagerCoreDrive";
import ManagerAnalytics from "./pages/ManagerAnalytics";
import ManagerOperatorKpi from "./features/kpi/pages/ManagerOperatorKpi";
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
      <Route path="/force-password-change" element={<ForcePasswordChange />} />

      {/* CAPO PRINT */}
      <Route
        path="/app/rapportino/sheet"
        element={
          <RequireRole allowed={[ "CAPO"]}>
            <RapportinoSheet />
          </RequireRole>
        }
      />

      {/* ===== ADMIN ===== */}
      <Route
        path="/admin/*"
        element={
          <RequireRole allowed={[ "ADMIN"]}>
            <AdminShell />
          </RequireRole>
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
          <RequireRole allowed={[ "CAPO"]}>
            <AppShell />
          </RequireRole>
        }
      >
        {/* ENTRY ROUTER (ADMIN decides simple vs rich) */}
        <Route index element={<CapoEntryRouter />} />

        {/* CAPO SIMPLE */}
        <Route path="ship/:shipId/presence" element={<CapoPresencePage />} />

        {/* CAPO RICH (legacy) */}
        <Route path="ship-selector" element={<ShipSelector />} />
        <Route path="kpi-operatori" element={<CapoOperatorKpi isDark={true} />} />
        <Route path="ship/:shipId" element={<CapoModuleSelector />} />

        {/* Rapportino routes gated by presence (for CAPO Simple) */}
        <Route
          path="ship/:shipId/rapportino/role"
          element={
            <CapoPresenceGate>
              <CapoRoleSelector />
            </CapoPresenceGate>
          }
        />
        <Route
          path="ship/:shipId/rapportino"
          element={
            <CapoPresenceGate>
              <RapportinoPage />
            </CapoPresenceGate>
          }
        />

        <Route path="ship/:shipId/inca" element={<IncaCapoCockpit />} />
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
      </Route>

      {/* ===== UFFICIO ===== */}
      <Route
        path="/ufficio/*"
        element={
          <RequireRole allowed={[ "UFFICIO", "DIREZIONE", "MANAGER", "ADMIN"]}>
            <UfficioShell />
          </RequireRole>
        }
      >
        <Route index element={<UfficioRapportiniList />} />
        <Route path="rapportini/:id" element={<UfficioRapportinoDetail />} />
        <Route path="navemaster" element={<NavemasterHub />} />
        <Route path="inca-hub" element={<UfficioIncaHub />} />
        <Route path="evoluzione" element={<Evoluzione />} />
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="core-drive" replace />} />
      </Route>

      {/* ===== MANAGER ===== */}
      <Route
        path="/manager/*"
        element={
          <RequireRole allowed={[ "MANAGER", "ADMIN"]}>
            <ManagerShell />
          </RequireRole>
        }
      >
        <Route index element={<ManagerDashboard isDark={true} />} />
        <Route path="assegnazioni" element={<ManagerAssignments isDark={true} />} />
        <Route path="drive" element={<ManagerCoreDrive isDark={true} />} />
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
        <Route path="analytics" element={<ManagerAnalytics isDark={true} />} />
        <Route path="kpi-operatori" element={<ManagerOperatorKpi isDark={true} />} />
        <Route path="capi-cantieri" element={<ManagerCapoShipPlanning isDark={true} />} />

      </Route>

      {/* ===== DIREZIONE ===== */}
      <Route
        path="/direction/*"
        element={
          <RequireRole allowed={[ "DIREZIONE", "MANAGER"]}>
            <DirectionShell />
          </RequireRole>
        }
      />

      <Route path="/*" element={<Landing />} />
    </Routes>
  );
}

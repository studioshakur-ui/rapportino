// src/routes.tsx
import { Routes, Route, Navigate, useLocation, useOutletContext } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import AuthConfirmPage from "./pages/AuthConfirmPage";

// SHELLS
import AppShell from "./shells/AppShell";
import UfficioShell from "./shells/UfficioShell";
import DirezioneShell, { type DirezioneOutletContext, UfficioView } from "./shells/DirezioneShell";
import ManagerShell from "./shells/ManagerShell";
import AdminShell from "./admin/AdminShell";

// CAPO
import RapportinoPage from "./components/RapportinoPage";
import ShipSelector from "./pages/ShipSelector";
import CapoOperatorKpi from "./features/kpi/pages/CapoOperatorKpi";
import CapoMegaKpiStesura from "./features/kpi/pages/CapoMegaKpiStesura";
import CapoModuleSelector from "./pages/CapoModuleSelector";
import CapoTeamOrganizerPage from "./pages/CapoTeamOrganizerPage";
import CapoRoleSelector from "./capo/CapoRoleSelector";
import IncaCapoCockpit from "./capo/IncaCapoCockpit";


// PRINT (1 page)
import RapportinoSheet from "./components/RapportinoSheet";

// ADMIN
import AdminUsersPage from "./admin/users/AdminUsersPage";
import AdminOperatorsPage from "./admin/AdminOperatorsPage";
import AdminCatalogoPage from "./admin/AdminCatalogoPage";
import AdminPlanningPage from "./admin/AdminPlanningPage";
import AdminAssignmentsPage from "./admin/AdminAssignmentsPage";
import AdminAuditPage from "./admin/AdminAuditPage";
import AdminPerimetersPage from "./admin/AdminPerimetersPage";

// UFFICIO
import UfficioRapportiniList from "./ufficio/UfficioRapportiniList";
import UfficioRapportinoDetail from "./ufficio/UfficioRapportinoDetail";
import UfficioIncaHub from "./ufficio/UfficioIncaHub";
import UfficioIncaDiffPage from "./ufficio/UfficioIncaDiffPage";
import UfficioIncaAuditPage from "./ufficio/UfficioIncaAuditPage";

// NAVEMASTER (ABD)
import NavemasterHub from "./navemaster/NavemasterHub";

// DIREZIONE
import DirezioneDashboard from "./components/DirezioneDashboard";
import DirezioneOperatorKPI from "./features/kpi/pages/DirezioneOperatorKPI";
import ManagerOperatorKPI from "./features/kpi/pages/ManagerOperatorKPI";
import CorePresentation from "./pages/CorePresentation";
import CapoPresentation from "./pages/CapoPresentation";

// MANAGER
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerAssignments from "./pages/ManagerAssignments";
import ManagerCapoShipPlanning from "./pages/ManagerCapoShipPlanning";
import ManagerAnalyticsPage from "./pages/ManagerAnalyticsPage";

// CORE DRIVE
import ArchivePage from "./pages/Archive";
import CoreDrivePage from "./pages/CoreDrivePage";

// EVOLUZIONE
import Evoluzione from "./data/Evoluzione";

function LegacyDirezioneRedirect(): JSX.Element {
  const loc = useLocation();

  // Preserve the rest of the path + query/hash.
  const nextPath = (loc.pathname || "").replace(/^\/Direzione(\/|$)/, "/direzione$1");
  const next = `${nextPath}${loc.search || ""}${loc.hash || ""}`;

  return <Navigate to={next} replace />;
}

function DirezioneDashboardRoute(): JSX.Element {
  const { isDark } = useOutletContext<DirezioneOutletContext>();
  return <DirezioneDashboard isDark={isDark} />;
}

function DirezioneOperatorKpiRoute(): JSX.Element {
  const { isDark } = useOutletContext<DirezioneOutletContext>();
  return <DirezioneOperatorKPI isDark={isDark} />;
}

export default function AppRoutes(): JSX.Element {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/auth/confirm" element={<AuthConfirmPage />} />

      {/* Force password change */}
      <Route
        path="/force-password-change"
        element={
          <RequireAuth>
            <ForcePasswordChange />
          </RequireAuth>
        }
      />

      {/* ===== PRINT (1 page) ===== */}
      <Route
        path="/print/rapportino"
        element={
          <RequireAuth>
            <RapportinoSheet />
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
        <Route index element={<AdminUsersPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="operators" element={<AdminOperatorsPage />} />
        <Route path="catalogo" element={<AdminCatalogoPage />} />
        <Route path="planning" element={<AdminPlanningPage />} />
        <Route path="assignments" element={<AdminAssignmentsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="perimetri" element={<AdminPerimetersPage />} />
        <Route path="perimeters" element={<Navigate to="../perimetri" replace />} />
        <Route path="core-drive" element={<CoreDrivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
      </Route>

      {/* ===== APP SHELL (CAPO RICH) ===== */}
      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="ship-selector" replace />} />
        <Route path="ship" element={<Navigate to="../ship-selector" replace />} />
        <Route path="ship-selector" element={<ShipSelector />} />
        <Route path="ship/:shipId" element={<CapoModuleSelector />} />
        <Route path="ship/:shipId/rapportino/role" element={<CapoRoleSelector />} />
        <Route path="ship/:shipId/rapportino" element={<RapportinoPage />} />
        <Route path="ship/:shipId/teams" element={<CapoTeamOrganizerPage />} />
        <Route path="ship/:shipId/inca" element={<IncaCapoCockpit />} />
        <Route path="ship/:shipId/kpi-stesura" element={<CapoMegaKpiStesura />} />
        <Route path="kpi-operatori" element={<CapoOperatorKpi />} />
        <Route path="navemaster" element={<NavemasterHub />} />
        <Route path="core-drive" element={<CoreDrivePage />} />
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

        {/* Canonique: detail via /ufficio/rapportini/:id */}
        <Route path="rapportini/:id" element={<UfficioRapportinoDetail />} />

        {/* Alias legacy: singulier */}
        <Route path="rapportino/:id" element={<UfficioRapportinoDetail />} />

        {/* INCA (canon + alias) */}
        <Route path="inca" element={<UfficioIncaHub />} />
        <Route path="inca-hub" element={<UfficioIncaHub />} />

        <Route path="inca-diff" element={<UfficioIncaDiffPage />} />
        <Route path="inca-audit" element={<UfficioIncaAuditPage />} />

        {/* NAVEMASTER (ABD) */}
        <Route path="navemaster" element={<NavemasterHub />} />

        {/* CORE DRIVE */}
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../core-drive" replace />} />
      </Route>

      {/* ===== LEGACY ALIAS: /Direzione -> /direzione ===== */}
      <Route path="/Direzione/*" element={<LegacyDirezioneRedirect />} />

      {/* ===== DIREZIONE ===== */}
      <Route
        path="/direzione/*"
        element={
          <RequireAuth>
            <RequireRole allowed={["DIREZIONE", "ADMIN"]}>
              <DirezioneShell />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<DirezioneDashboardRoute />} />
        <Route path="dashboard" element={<DirezioneDashboardRoute />} />
        <Route path="kpi-operatori" element={<DirezioneOperatorKpiRoute />} />
        <Route path="presentation" element={<CorePresentation />} />
        <Route path="capo-presentation" element={<CapoPresentation />} />
        <Route path="presentazione" element={<CorePresentation />} />
        <Route path="presentazione/capo" element={<CapoPresentation />} />
        <Route path="evoluzione" element={<Evoluzione />} />

        {/* Direzione Ufficio view (legacy) */}
        <Route path="ufficio" element={<Navigate to="../direzione/ufficio-view" replace />} />
        <Route path="ufficio-view" element={<UfficioView />}>
          <Route index element={<UfficioRapportiniList />} />
          <Route path="inca" element={<UfficioIncaHub />} />
          <Route path="core-drive" element={<ArchivePage />} />
        </Route>

        {/* Direzione CORE DRIVE */}
        <Route path="core-drive" element={<ArchivePage />} />
        <Route path="archive" element={<Navigate to="../direzione/core-drive" replace />} />
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
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="assignments" element={<ManagerAssignments />} />
        <Route path="assegnazioni" element={<ManagerAssignments />} />
        <Route path="capo-ship-planning" element={<ManagerCapoShipPlanning />} />
        <Route path="capi-cantieri" element={<ManagerCapoShipPlanning />} />
        <Route path="drive" element={<CoreDrivePage />} />
        <Route path="core-drive" element={<Navigate to="../drive" replace />} />
        <Route path="archive" element={<Navigate to="../drive" replace />} />
        <Route path="analytics" element={<ManagerAnalyticsPage />} />
        <Route path="kpi-operatori" element={<ManagerOperatorKPI />} />
      </Route>

      {/* ===== EVOLUZIONE ===== */}
      <Route
        path="/evoluzione"
        element={
          <RequireAuth>
            <Evoluzione />
          </RequireAuth>
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

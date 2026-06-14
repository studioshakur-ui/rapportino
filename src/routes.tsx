// src/routes.tsx — CORE COMMAND
import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import CommandShell from "./shells/CommandShell";

import AssistentePage     from "./features/core-command/assistente/AssistentePage";
import CableDetailPage    from "./features/core-command/cable/CableDetailPage";
import CampoPage          from "./features/core-command/campo/CampoPage";
import GraficiPage        from "./features/core-command/grafici/GraficiPage";
import GiroOggiPage       from "./features/core-command/giro/GiroOggiPage";
import OggiPage           from "./features/core-command/oggi/OggiPage";
import SituazionePage     from "./features/core-command/situazione/SituazionePage";
import DailyListsPage     from "./modules/daily-lists/DailyListsPage";
import DailyListDetailPage from "./modules/daily-lists/DailyListDetailPage";
import ImportIncaPage      from "./modules/inca/ImportIncaPage";
import ApparatiPage        from "./modules/apparati/ApparatiPage";
import EquipmentStoryPage  from "./modules/equipment/EquipmentStoryPage";
import NavemasterPage      from "./modules/navemaster/NavemasterPage";

function RouteRedirect({ to }: { to: string }): JSX.Element {
  return <Navigate to={to} replace />;
}

export default function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<RouteRedirect to="/oggi" />} />
      <Route path="/analytics" element={<RouteRedirect to="/grafici" />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <CommandShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/oggi" replace />} />
        <Route path="oggi" element={<OggiPage />} />
        <Route path="lista" element={<GiroOggiPage />} />
        <Route path="apparati" element={<ApparatiPage />} />
        <Route path="navemaster" element={<NavemasterPage />} />
        <Route path="import-inca" element={<ImportIncaPage />} />
        <Route path="campo" element={<CampoPage />} />
        <Route path="situazione" element={<SituazionePage />} />
        <Route path="assistente" element={<AssistentePage />} />
        <Route path="grafici" element={<GraficiPage />} />
        <Route path="import" element={<DailyListsPage />} />
        <Route path="import/:importId" element={<DailyListDetailPage />} />
        <Route path="cable/:code" element={<CableDetailPage />} />
        <Route path="equipment/:code" element={<EquipmentStoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/oggi" replace />} />
    </Routes>
  );
}

// src/routes.tsx — CORE COMMAND
import { Routes, Route, Navigate } from "react-router-dom";
import { useParams } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import CommandShell from "./shells/CommandShell";

import CableDetailPage    from "./features/core-command/cable/CableDetailPage";
import CampoPage          from "./features/core-command/campo/CampoPage";
import GraficiPage        from "./features/core-command/grafici/GraficiPage";
import OggiPage           from "./features/core-command/oggi/OggiPage";
import SituazionePage     from "./features/core-command/situazione/SituazionePage";
import DailyListsPage     from "./modules/daily-lists/DailyListsPage";
import DailyListDetailPage from "./modules/daily-lists/DailyListDetailPage";
import ApparatiPage        from "./modules/apparati/ApparatiPage";
import EquipmentStoryPage  from "./modules/equipment/EquipmentStoryPage";

function RouteRedirect({ to }: { to: string }): JSX.Element {
  return <Navigate to={to} replace />;
}

function ParamRedirect({ to }: { to: (params: Record<string, string | undefined>) => string }): JSX.Element {
  const params = useParams();
  return <Navigate to={to(params)} replace />;
}

export default function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cable-story/:code" element={<ParamRedirect to={(params) => `/cable/${params.code ?? ""}`} />} />
      <Route path="/equipment-story/:code" element={<ParamRedirect to={(params) => `/equipment/${params.code ?? ""}`} />} />
      <Route path="/dashboard" element={<RouteRedirect to="/oggi" />} />
      <Route path="/navemaster" element={<RouteRedirect to="/oggi" />} />
      <Route path="/commander" element={<RouteRedirect to="/campo" />} />
      <Route path="/images-terreno" element={<RouteRedirect to="/campo" />} />
      <Route path="/ia-cockpit" element={<RouteRedirect to="/oggi" />} />
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
        <Route path="apparati" element={<ApparatiPage />} />
        <Route path="campo" element={<CampoPage />} />
        <Route path="situazione" element={<SituazionePage />} />
        <Route path="grafici" element={<GraficiPage />} />
        <Route path="import" element={<DailyListsPage />} />
        <Route path="import/:importId" element={<DailyListDetailPage />} />
        <Route path="cable/:code" element={<CableDetailPage />} />
        <Route path="equipment/:code" element={<EquipmentStoryPage />} />
        <Route path="command" element={<Navigate to="/oggi" replace />} />
        <Route path="command/oggi" element={<Navigate to="/oggi" replace />} />
        <Route path="command/apparati" element={<Navigate to="/apparati" replace />} />
        <Route path="command/campo" element={<Navigate to="/campo" replace />} />
        <Route path="command/situazione" element={<Navigate to="/situazione" replace />} />
        <Route path="command/grafici" element={<Navigate to="/grafici" replace />} />
        <Route path="command/import" element={<Navigate to="/import" replace />} />
        <Route path="command/import/:importId" element={<ParamRedirect to={(params) => `/import/${params.importId ?? ""}`} />} />
        <Route path="command/cable/:code" element={<ParamRedirect to={(params) => `/cable/${params.code ?? ""}`} />} />
        <Route path="command/equipment/:code" element={<ParamRedirect to={(params) => `/equipment/${params.code ?? ""}`} />} />
        <Route path="command/daily-lists" element={<Navigate to="/import" replace />} />
        <Route path="command/daily-lists/:importId" element={<ParamRedirect to={(params) => `/import/${params.importId ?? ""}`} />} />
        <Route path="command/center" element={<Navigate to="/oggi" replace />} />
        <Route path="command/cables" element={<Navigate to="/oggi" replace />} />
        <Route path="command/navemaster" element={<Navigate to="/oggi" replace />} />
        <Route path="command/commander" element={<Navigate to="/campo" replace />} />
        <Route path="command/problems" element={<Navigate to="/campo" replace />} />
        <Route path="command/timeline" element={<Navigate to="/campo" replace />} />
        <Route path="command/inca" element={<Navigate to="/import" replace />} />
        <Route path="command/intake" element={<Navigate to="/campo" replace />} />
        <Route path="command/ai" element={<Navigate to="/oggi" replace />} />
        <Route path="command/ai-intake" element={<Navigate to="/oggi" replace />} />
        <Route path="command/terrain-images" element={<Navigate to="/campo" replace />} />
        <Route path="command/ai-cockpit" element={<Navigate to="/oggi" replace />} />
        <Route path="command/priorities" element={<Navigate to="/campo" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/oggi" replace />} />
    </Routes>
  );
}

// src/routes.tsx
// CORE COMMAND — routing plat, mono-utilisateur. Aucun RequireRole.
import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import CommandShell from "./shells/CommandShell";

import CommandCenterPage from "./features/core-command/command-center/CommandCenterPage";
import TimelinePage from "./features/core-command/timeline/TimelinePage";
import PrioritiesPage from "./features/core-command/priorities/PrioritiesPage";
import WhatsAppIntakePage from "./features/core-command/intake/WhatsAppIntakePage";
import IncaImportPage from "./features/core-command/inca/IncaImportPage";
import CableDetailPage from "./features/core-command/cable/CableDetailPage";

export default function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/command"
        element={
          <RequireAuth>
            <CommandShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="center" replace />} />
        <Route path="center" element={<CommandCenterPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="priorities" element={<PrioritiesPage />} />
        <Route path="intake" element={<WhatsAppIntakePage />} />
        <Route path="inca" element={<IncaImportPage />} />
        <Route path="cable/:code" element={<CableDetailPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/command/center" replace />} />
      <Route path="*" element={<Navigate to="/command/center" replace />} />
    </Routes>
  );
}

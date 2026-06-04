// src/routes.tsx
// CORE COMMAND — routing plat, mono-utilisateur. Aucun RequireRole.
import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import CommandShell from "./shell/CommandShell";

import CommandCenterPage from "./modules/command-center/CommandCenterPage";
import PrioritiesPage from "./modules/priorities/PrioritiesPage";
import IncaCenterPage from "./modules/inca/IncaCenterPage";
import WhatsAppIntakePage from "./modules/whatsapp/WhatsAppIntakePage";
import TimelinePage from "./modules/timeline/TimelinePage";
import AgentConsolePage from "./modules/agents/AgentConsolePage";

export default function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <CommandShell />
          </RequireAuth>
        }
      >
        <Route index element={<CommandCenterPage />} />
        <Route path="priorities" element={<PrioritiesPage />} />
        <Route path="inca" element={<IncaCenterPage />} />
        <Route path="whatsapp" element={<WhatsAppIntakePage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="agents" element={<AgentConsolePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

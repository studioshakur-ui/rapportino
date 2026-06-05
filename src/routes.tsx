// src/routes.tsx — CORE COMMAND
import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth      from "./auth/RequireAuth";
import Login            from "./pages/Login";
import CommandShell     from "./shells/CommandShell";

import CommandCenterPage  from "./features/core-command/command-center/CommandCenterPage";
import TimelinePage       from "./features/core-command/timeline/TimelinePage";
import PrioritiesPage     from "./features/core-command/priorities/PrioritiesPage";
import WhatsAppIntakePage from "./features/core-command/intake/WhatsAppIntakePage";
import IncaImportPage     from "./features/core-command/inca/IncaImportPage";
import CableDetailPage    from "./features/core-command/cable/CableDetailPage";
import DailyListsPage     from "./modules/daily-lists/DailyListsPage";
import DailyListDetailPage from "./modules/daily-lists/DailyListDetailPage";
import CommanderHarnessPage from "./features/commander/CommanderHarnessPage";

function CablesHint(): JSX.Element {
  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
      <p className="text-zinc-400 text-sm">Utiliser la barre de recherche en haut pour trouver un câble.</p>
      <p className="text-zinc-600 text-xs">Exemple : <code className="bg-zinc-800 px-2 py-0.5 rounded">N AH 173</code></p>
    </div>
  );
}

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
        <Route path="center"       element={<CommandCenterPage />} />
        <Route path="cables"       element={<CablesHint />} />
        <Route path="commander"    element={<CommanderHarnessPage />} />
        <Route path="daily-lists"  element={<DailyListsPage />} />
        <Route path="daily-lists/:importId" element={<DailyListDetailPage />} />
        <Route path="cable/:code"  element={<CableDetailPage />} />
        {/* Admin / ⚙ */}
        <Route path="problems"     element={<PrioritiesPage />} />
        <Route path="timeline"     element={<TimelinePage />} />
        <Route path="inca"         element={<IncaImportPage />} />
        <Route path="intake"       element={<WhatsAppIntakePage />} />
        {/* Compat ancien routing */}
        <Route path="priorities"   element={<Navigate to="/command/problems" replace />} />
      </Route>

      <Route path="/" element={<Navigate to="/command/center" replace />} />
      <Route path="*" element={<Navigate to="/command/center" replace />} />
    </Routes>
  );
}

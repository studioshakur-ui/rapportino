// src/routes.tsx — CORE COMMAND
import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import CommandShell from "./shells/CommandShell";

import CommandCenterPage from "./features/core-command/command-center/CommandCenterPage";
import NavemasterPage from "./features/core-command/navemaster/NavemasterPage";
import TimelinePage from "./features/core-command/timeline/TimelinePage";
import PrioritiesPage from "./features/core-command/priorities/PrioritiesPage";
import WhatsAppIntakePage from "./features/core-command/intake/WhatsAppIntakePage";
import TelegramAIPage     from "./features/core-command/intake/TelegramAIPage";
import AICockpitPage      from "./features/core-command/ai/AICockpitPage";
import IncaImportPage     from "./features/core-command/inca/IncaImportPage";
import CableDetailPage    from "./features/core-command/cable/CableDetailPage";
import DailyListsPage     from "./modules/daily-lists/DailyListsPage";
import DailyListDetailPage from "./modules/daily-lists/DailyListDetailPage";
import CommanderHarnessPage from "./features/commander/CommanderHarnessPage";
import EquipmentStoryPage  from "./modules/equipment/EquipmentStoryPage";
import ApparatiPage        from "./modules/apparati/ApparatiPage";
import TerrainImagesPage   from "./features/core-command/terrain-images/TerrainImagesPage";

function CablesHint(): JSX.Element {
  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
      <p className="text-stone-600 text-sm">Utiliser la barre de recherche en haut pour trouver un câble.</p>
      <p className="text-stone-500 text-xs">Exemple : <code className="rounded bg-stone-100 px-2 py-0.5 text-stone-900">N AH 173</code></p>
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
        <Route path="navemaster"   element={<NavemasterPage />} />
        <Route path="cables"       element={<CablesHint />} />
        <Route path="commander"    element={<CommanderHarnessPage />} />
        <Route path="daily-lists"  element={<DailyListsPage />} />
        <Route path="daily-lists/:importId" element={<DailyListDetailPage />} />
        <Route path="cable/:code"  element={<CableDetailPage />} />
        <Route path="apparati"     element={<ApparatiPage />} />
        <Route path="equipment/:code" element={<EquipmentStoryPage />} />
        <Route path="terrain-images"  element={<TerrainImagesPage />} />
        {/* Admin / ⚙ */}
        <Route path="problems"     element={<PrioritiesPage />} />
        <Route path="timeline"     element={<TimelinePage />} />
        <Route path="inca"         element={<IncaImportPage />} />
        <Route path="intake"       element={<WhatsAppIntakePage />} />
        <Route path="ai"           element={<AICockpitPage />} />
        <Route path="ai-intake"    element={<TelegramAIPage />} />
        {/* Compat redirects — old paths now live in navemaster */}
        <Route path="ai-cockpit"   element={<Navigate to="/command/navemaster?tab=worklist" replace />} />
        <Route path="priorities"   element={<Navigate to="/command/problems" replace />} />
      </Route>

      <Route path="/" element={<Navigate to="/command/center" replace />} />
      <Route path="*" element={<Navigate to="/command/center" replace />} />
    </Routes>
  );
}

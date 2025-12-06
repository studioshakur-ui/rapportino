// src/routes.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import RequireRole from './auth/RequireRole';

import Landing from './pages/Landing';
import Login from './pages/Login';

import AppShell from './AppShell';
import UfficioShell from './UfficioShell';
import DirectionShell from './DirectionShell';

// CAPO – contenu
import RapportinoPage from './components/RapportinoPage';

// UFFICIO – contenu
import UfficioRapportiniList from './ufficio/UfficioRapportiniList';
import UfficioRapportinoDetail from './ufficio/UfficioRapportinoDetail';
import IncaRoot from './inca/IncaRoot';

// ARCHIVE central (même composant partout)
import ArchivePage from './pages/Archive';

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC – Landing marketing */}
      <Route path="/" element={<Landing />} />

      {/* PUBLIC – Login */}
      <Route path="/login" element={<Login />} />

      {/* CAPO – Rapportino + Archivio */}
      <Route
        path="/app/*"
        element={
          <RequireRole allow={['CAPO']}>
            <AppShell />
          </RequireRole>
        }
      >
        {/* /app → rapportino capo */}
        <Route index element={<RapportinoPage />} />
        {/* /app/archive → archive v1 (même module que ufficio/direzione) */}
        <Route path="archive" element={<ArchivePage />} />
      </Route>

      {/* UFFICIO – Contrôle rapportini + INCA + ARCHIVE */}
      <Route
        path="/ufficio/*"
        element={
          <RequireRole allow={['UFFICIO', 'DIREZIONE']}>
            <UfficioShell />
          </RequireRole>
        }
      >
        <Route index element={<UfficioRapportiniList />} />
        <Route
          path="rapportini/:id"
          element={<UfficioRapportinoDetail />}
        />
        <Route path="inca/*" element={<IncaRoot />} />
        <Route path="archive" element={<ArchivePage />} />
      </Route>

      {/* DIREZIONE – zone direction */}
      <Route
        path="/direction/*"
        element={
          <RequireRole allow={['DIREZIONE']}>
            <DirectionShell />
          </RequireRole>
        }
      />

      {/* Fallback : toute autre route renvoie vers la landing */}
      <Route path="/*" element={<Landing />} />
    </Routes>
  );
}

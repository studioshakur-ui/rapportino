// src/routes.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import RequireRole from './auth/RequireRole';
import Login from './pages/Login';

import AppShell from './AppShell';
import UfficioShell from './UfficioShell';
import DirectionShell from './DirectionShell';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* CAPO – Rapportino / Archivio côté Capo */}
      <Route
        path="/*"
        element={
          <RequireRole allow={['CAPO']}>
            <AppShell />
          </RequireRole>
        }
      />

      {/* UFFICIO – Contrôle rapportini */}
      <Route
        path="/ufficio/*"
        element={
          <RequireRole allow={['UFFICIO', 'DIREZIONE']}>
            <UfficioShell />
          </RequireRole>
        }
      />

      {/* DIREZIONE – future zone direction */}
      <Route
        path="/direction/*"
        element={
          <RequireRole allow={['DIREZIONE']}>
            <DirectionShell />
          </RequireRole>
        }
      />
    </Routes>
  );
}

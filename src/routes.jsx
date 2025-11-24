import React from 'react'
import { Routes, Route } from 'react-router-dom'
import RequireRole from './auth/RequireRole'
import Login from './pages/Login'
import AppShell from './AppShell'
import UfficioShell from './UfficioShell'
import DirectionShell from './DirectionShell'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* CAPO */}
      <Route
        path="/*"
        element={
          <RequireRole allow={['CAPO']}>
            <AppShell />
          </RequireRole>
        }
      />

      {/* UFFICIO */}
      <Route
        path="/ufficio/*"
        element={
          <RequireRole allow={['UFFICIO']}>
            <UfficioShell />
          </RequireRole>
        }
      />

      {/* DIREZIONE */}
      <Route
        path="/direction/*"
        element={
          <RequireRole allow={['DIREZIONE']}>
            <DirectionShell />
          </RequireRole>
        }
      />
    </Routes>
  )
}

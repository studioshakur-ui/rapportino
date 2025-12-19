// src/routes/index.jsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

import AppShell from "../layouts/AppShell";

// Pages (adapte si tes chemins diffèrent)
import Login from "../pages/Login";
import Home from "../pages/Home";

// Exemple: si tu as déjà ces pages, décommente et ajuste les imports
// import RapportinoPage from "../components/RapportinoPage";
// import Archive from "../pages/Archive";
// import Direzione from "../pages/Direzione";
// import Ufficio from "../pages/Ufficio";

function RequireAuth({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-300">Loading…</div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />

      {/* PROTECTED — AppShell applique la top bar fine */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />

        {/* Mets ici tes routes réelles */}
        {/* <Route path="/rapportino/:rapportinoId" element={<RapportinoPage />} /> */}
        {/* <Route path="/archive" element={<Archive />} /> */}
        {/* <Route path="/direzione" element={<Direzione />} /> */}
        {/* <Route path="/ufficio" element={<Ufficio />} /> */}
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// src/auth/RequireAuth.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }) {
  const { status } = useAuth();

  if (status === "BOOTSTRAP" || status === "AUTHENTICATED_LOADING") {
    return (
      <div className="w-full h-screen flex items-center justify-center text-slate-400">
        Inizializzazione CORE…
      </div>
    );
  }

  if (status === "UNAUTHENTICATED") {
    return <Navigate to="/" replace />;
  }

  if (status === "AUTH_ERROR") {
    return (
      <div className="w-full h-screen flex items-center justify-center text-red-400">
        Errore di sicurezza. Contattare supporto.
      </div>
    );
  }

  return children;
}

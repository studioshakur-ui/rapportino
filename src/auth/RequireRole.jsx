// src/auth/RequireRole.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import LoadingScreen from "../components/LoadingScreen";

/**
 * Compatible:
 *  - <RequireRole allow={["CAPO"]} />
 *  - <RequireRole allowed={["CAPO"]} />
 */
export default function RequireRole({ allow, allowed, children }) {
  const { session, profile, loading, authReady, isReady } = useAuth();

  // Support ancien flag (isReady) + nouveau (authReady)
  const ready = typeof authReady === "boolean" ? authReady : !!isReady;

  if (!ready || loading) {
    return <LoadingScreen message="Inizializzazione sicurezza CORE…" />;
  }

  // Si pas de session, on va login (sinon /unauthorized est trompeur)
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const roles = Array.isArray(allowed)
    ? allowed
    : Array.isArray(allow)
    ? allow
    : [];

  if (!profile?.app_role || roles.length === 0) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!roles.includes(profile.app_role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

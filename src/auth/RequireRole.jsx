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

  const ready = typeof authReady === "boolean" ? authReady : !!isReady;

  if (!ready || loading) {
    return <LoadingScreen message="Inizializzazione sicurezza CORE…" />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // ✅ AJOUT IMPORTANT
  if (profile?.must_change_password) {
    return <Navigate to="/force-password-change" replace />;
  }

  const roles = Array.isArray(allowed)
    ? allowed
    : Array.isArray(allow)
    ? allow
    : [];

  // Si aucune contrainte de rôle => autoriser
  if (roles.length === 0) {
    return <>{children}</>;
  }

  if (!profile?.app_role) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!roles.includes(profile.app_role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

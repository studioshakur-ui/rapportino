import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import LoadingScreen from "../components/LoadingScreen";

/**
 * Compatible:
 *  - <RequireRole allow={["CAPO"]} />
 *  - <RequireRole allowed={["CAPO"]} />
 */
export default function RequireRole({ allow, allowed, children }) {
  const { session, profile, loading, authReady, isReady } = useAuth();
  const location = useLocation();

  const ready = typeof authReady === "boolean" ? authReady : !!isReady;

  if (!ready || loading) {
    return <LoadingScreen message="Inizializzazione sicurezza CORE…" />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Enforce password change globally, but avoid redirect loop
  const isForcePwdRoute = location.pathname.startsWith("/force-password-change");
  if (profile?.must_change_password === true && !isForcePwdRoute) {
    return <Navigate to="/force-password-change" replace state={{ from: location.pathname }} />;
  }

  const roles = Array.isArray(allowed)
    ? allowed
    : Array.isArray(allow)
    ? allow
    : [];

  // If no role constraint => allow
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

// src/auth/RequireRole.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import LoadingScreen from "../components/LoadingScreen";

type RequireRoleProps = {
  /**
   * Canonique: utiliser "allowed".
   * On garde "allow" pour rétro-compatibilité.
   */
  allowed?: string[];
  allow?: string[];
  children: ReactNode;
};

/**
 * Compatible:
 *  - <RequireRole allowed={["CAPO"]}>...</RequireRole>
 *  - <RequireRole allow={["CAPO"]}>...</RequireRole> (legacy)
 */
export default function RequireRole({ allow, allowed, children }: RequireRoleProps) {
  const { session, profile, loading, authReady, isReady, rehydrating } = useAuth();
  const location = useLocation();

  const ready = typeof authReady === "boolean" ? authReady : Boolean(isReady);

  if (!ready || loading) {
    return <LoadingScreen message="Inizializzazione sicurezza CORE…" />;
  }

  // ✅ Grace UX: on tab return, avoid unauthorized while rehydrating
  if (rehydrating) {
    return <LoadingScreen message="Riconnessione…" />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Enforce password change globally, but avoid redirect loop
  const isForcePwdRoute = location.pathname.startsWith("/force-password-change");
  if ((profile as any)?.must_change_password === true && !isForcePwdRoute) {
    return <Navigate to="/force-password-change" replace state={{ from: location.pathname }} />;
  }

  const roles: string[] = Array.isArray(allowed)
    ? allowed
    : Array.isArray(allow)
      ? allow
      : [];

  // If no role constraint => allow
  if (roles.length === 0) {
    return <>{children}</>;
  }

  // ✅ KEY FIX: if profile isn't loaded yet, do NOT redirect to unauthorized
  if (!profile) {
    return <LoadingScreen message="Caricamento profilo…" />;
  }

  const appRole = (profile as any)?.app_role as string | undefined;

  // Now profile exists. If app_role missing => true unauthorized (data issue)
  if (!appRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!roles.includes(appRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
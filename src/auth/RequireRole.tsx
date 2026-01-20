// src/auth/RequireRole.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import LoadingScreen from "../components/LoadingScreen";

type RequireRoleProps = {
  allowed?: string[];
  allow?: string[];
  children: ReactNode;
};

type ProfileLike = {
  app_role?: string | null;
  must_change_password?: boolean | null;
};

export default function RequireRole({ allow, allowed, children }: RequireRoleProps) {
  const { session, profile, loading, authReady, isReady, rehydrating } = useAuth();
  const location = useLocation();

  const ready = typeof authReady === "boolean" ? authReady : Boolean(isReady);

  // Boot initial uniquement
  if (!ready || loading) {
    return <LoadingScreen message="Inizializzazione sicurezza CORE…" />;
  }

  // ✅ IMPORTANT: Sur tab-switch/focus, on ne casse jamais l’UI.
  // Rehydrate doit être invisible.
  if (rehydrating) {
    return <>{children}</>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const isForcePwdRoute = location.pathname.startsWith("/force-password-change");
  const p = profile as unknown as ProfileLike | null;

  if (p?.must_change_password === true && !isForcePwdRoute) {
    return <Navigate to="/force-password-change" replace state={{ from: location.pathname }} />;
  }

  const roles: string[] = Array.isArray(allowed) ? allowed : Array.isArray(allow) ? allow : [];

  if (roles.length === 0) {
    return <>{children}</>;
  }

  // Ici on garde le loader uniquement sur premier chargement “vrai”
  if (!p) {
    return <LoadingScreen message="Caricamento profilo…" />;
  }

  const appRole = p.app_role ?? null;

  if (!appRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!roles.includes(appRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

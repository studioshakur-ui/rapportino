// src/auth/RequireRole.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  const { session, uid, profile, loading, authReady, isReady, rehydrating, refreshProfile, signOut } = useAuth();
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

  const isAdminRoute = useMemo(() => {
    const p = location.pathname || "";
    return p.startsWith("/admin");
  }, [location.pathname]);

  const retryKey = useMemo(() => {
    const r = roles.join(",") || "_";
    const u = uid || "_";
    // IMPORTANT: admin routes change often; do NOT key the retry by pathname.
    // Also bump version to avoid old poisoned values.
    if (isAdminRoute) return `core:role-guard-retry:v2:${u}:${r}:admin`;
    const path = location.pathname || "/";
    return `core:role-guard-retry:v1:${u}:${r}:${path}`;
  }, [roles, uid, location.pathname, isAdminRoute]);

  const [retryAttempted, setRetryAttempted] = useState<boolean>(() => {
    try {
      const v = sessionStorage.getItem(retryKey);
      if (!v) return false;

      // Admin retry has a short TTL to avoid "hard reset" poisoning.
      if (isAdminRoute) {
        const triedAt = Number(v);
        if (!Number.isFinite(triedAt)) return false;
        const ttlMs = 15_000;
        const now = Date.now();
        const ok = now - triedAt < ttlMs;
        if (!ok) sessionStorage.removeItem(retryKey);
        return ok;
      }

      return v === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(retryKey);
      if (!v) {
        setRetryAttempted(false);
        return;
      }

      if (isAdminRoute) {
        const triedAt = Number(v);
        if (!Number.isFinite(triedAt)) {
          setRetryAttempted(false);
          return;
        }
        const ttlMs = 15_000;
        const now = Date.now();
        const ok = now - triedAt < ttlMs;
        if (!ok) {
          sessionStorage.removeItem(retryKey);
          setRetryAttempted(false);
          return;
        }
        setRetryAttempted(true);
        return;
      }

      setRetryAttempted(v === "1");
    } catch {
      setRetryAttempted(false);
    }
  }, [retryKey, isAdminRoute]);

  const markRetryAttempted = useCallback(() => {
    try {
      if (isAdminRoute) {
        // Store timestamp; short TTL is enforced on read.
        sessionStorage.setItem(retryKey, String(Date.now()));
      } else {
        sessionStorage.setItem(retryKey, "1");
      }
    } catch {
      // ignore
    }
    setRetryAttempted(true);
  }, [retryKey, isAdminRoute]);

  // Best-effort recovery: if profile is missing or role mismatches, retry ONE time.
  useEffect(() => {
    if (!ready || loading) return;
    if (!session) return;
    if (roles.length === 0) return;
    if (rehydrating) return;
    if (retryAttempted) return;

    const p = profile as unknown as ProfileLike | null;
    const appRole = p?.app_role ?? null;

    if (!p || !appRole || !roles.includes(appRole)) {
      markRetryAttempted();
      void refreshProfile();
    }
  }, [ready, loading, session, roles, rehydrating, retryAttempted, profile, refreshProfile, markRetryAttempted]);

  if (roles.length === 0) {
    return <>{children}</>;
  }

  // If profile is missing, NEVER infinite-load. Provide a recovery UI.
  if (!p) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#050910] text-slate-100 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <div className="text-xs tracking-[0.24em] uppercase text-slate-500">CNCS · Security Guard</div>
          <div className="mt-2 text-xl font-semibold">Profil introuvable / non accessible</div>
          <div className="mt-3 text-sm text-slate-300 leading-relaxed">
            La session est valide, mais le profil n’a pas pu être chargé. Cela arrive typiquement si la ligne{" "}
            <span className="font-semibold">profiles</span> n’existe pas encore pour cet utilisateur, ou si une policy
            RLS empêche la lecture.
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => void refreshProfile()}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900/40"
            >
              Riprova
            </button>

            <button
              type="button"
              onClick={() => void signOut({ reason: "profile_missing_recovery" })}
              className="inline-flex items-center justify-center rounded-xl border border-rose-900/50 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/15"
            >
              Esci
            </button>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Route: <span className="text-slate-400">{location.pathname}</span>
          </div>
        </div>
      </div>
    );
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
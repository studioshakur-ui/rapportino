// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export type AuthSignOutArgs = { reason: string };

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;

  /** Forces a controlled refresh of the current session (if allowed). */
  refresh: (opts?: { reason?: string }) => Promise<void>;

  /** Hard sign-out: clears session + redirects to /login */
  signOut: (args: AuthSignOutArgs) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Detects Supabase auth failures where the refresh token stored locally is no longer valid server-side.
 * Those cases must be treated as a hard logout (no "retry loop").
 */
function isInvalidRefreshTokenError(err: unknown): boolean {
  const raw = (err as any)?.message ?? (err as any)?.error_description ?? "";
  const msg = String(raw || "");
  return (
    msg.includes("Invalid Refresh Token") ||
    msg.includes("Refresh Token Not Found") ||
    msg.toLowerCase().includes("invalid refresh token") ||
    msg.toLowerCase().includes("refresh token not found") ||
    msg.toLowerCase().includes("refresh_token_not_found")
  );
}

/**
 * Optional but useful for preventing refresh storms during route transitions / heavy mounts.
 * We allow refresh only once the initial bootstrap succeeded.
 */
function shouldAllowRefresh(allowRef: React.MutableRefObject<boolean>): boolean {
  return allowRef.current === true;
}

function hardRedirectToLogin(reason: string) {
  const r = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  window.location.assign(`/login${r}`);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);

  // Prevent concurrent hard-logout / multiple redirects.
  const hardLogoutInFlightRef = useRef<boolean>(false);

  // Refresh is allowed only after the initial bootstrap succeeded.
  const allowRefreshRef = useRef<boolean>(false);

  // Used to avoid applying async state updates after unmount.
  const aliveRef = useRef<boolean>(true);

  const hardLogout = async (reason: string): Promise<void> => {
    if (hardLogoutInFlightRef.current) return;
    hardLogoutInFlightRef.current = true;

    try {
      // Try to sign out locally (won't fix invalid refresh by itself, but it clears runtime state).
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      // Defensive: clear local state to stop any UI that depends on it.
      if (aliveRef.current) {
        setSession(null);
        setProfile(null);
      }
      allowRefreshRef.current = false;
      setIsBootstrapping(false);

      // Hard redirect to guarantee a clean app state (kills stale React/KeepAlive state).
      hardRedirectToLogin(reason || "logout");
    }
  };

  const bootstrap = async (): Promise<void> => {
    setIsBootstrapping(true);

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error && isInvalidRefreshTokenError(error)) {
        await hardLogout("invalid_refresh");
        return;
      }

      const s = data?.session ?? null;

      if (!aliveRef.current) return;

      setSession(s);
      // Profile hydration can be added here if you already have it elsewhere.
      // Keep it simple and non-blocking:
      setProfile(null);

      // Allow refresh ONLY after a successful bootstrap.
      allowRefreshRef.current = true;
    } finally {
      if (aliveRef.current) setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    aliveRef.current = true;
    void bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Supabase emits this when refresh fails. Never loop: hard logout.
      if (event === "TOKEN_REFRESH_FAILED") {
        await hardLogout("refresh_failed");
        return;
      }

      // Defensive: some environments surface invalid refresh through errors elsewhere,
      // but if we receive session=null unexpectedly while we were authenticated,
      // we prefer a clean login rather than a loop.
      if (!newSession && session) {
        // If we had a session and suddenly it's null, treat as session loss.
        // This prevents “open then return” loops.
        await hardLogout("session_lost");
        return;
      }

      if (!aliveRef.current) return;

      setSession(newSession ?? null);
      // Do not force profile reload here unless you have a stable, cached fetch.
      // Avoid triggering extra network calls in auth event loops.
    });

    return () => {
      aliveRef.current = false;
      sub.subscription.unsubscribe();
    };
    // Intentionally not including `session` in deps to avoid resubscribing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async (opts?: { reason?: string }): Promise<void> => {
    if (!shouldAllowRefresh(allowRefreshRef)) return;
    if (hardLogoutInFlightRef.current) return;

    try {
      // Controlled refresh. If you configured supabaseClient with autoRefreshToken:false,
      // this is the only place refresh should occur (except explicit sign-in).
      const { data, error } = await supabase.auth.refreshSession();

      if (error && isInvalidRefreshTokenError(error)) {
        await hardLogout("refresh_invalid");
        return;
      }

      const s = data?.session ?? null;
      if (!aliveRef.current) return;
      setSession(s);
    } catch (err) {
      if (isInvalidRefreshTokenError(err)) {
        await hardLogout("refresh_invalid");
        return;
      }
      // Non-auth failures: do not hard logout.
      // You can add logging here if you want.
    }
  };

  const signOut = async ({ reason }: AuthSignOutArgs): Promise<void> => {
    await hardLogout(reason || "logout");
  };

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;

    return {
      session,
      user,
      profile,
      isBootstrapping,
      isAuthenticated: Boolean(session?.user),

      refresh,
      signOut,
    };
  }, [session, profile, isBootstrapping]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

// src/auth/AuthProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, resetSupabaseAuthStorage } from "../lib/supabaseClient";

export type AuthStatus = "BOOTSTRAP" | "AUTHENTICATED" | "UNAUTHENTICATED" | "AUTH_ERROR";

export type Profile = {
  id: string;
  app_role?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  must_change_password?: boolean | null;
  [k: string]: unknown;
};

export type SignOutOptions = { reason?: string };

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  uid: string | null;
  profile: Profile | null;
  error: unknown;

  loading: boolean;

  // canon
  authReady: boolean;

  // legacy alias used in RequireRole.tsx
  isReady: boolean;

  // kept for backward-compat but MUST remain non-intrusive on laptop
  rehydrating: boolean;

  signOut: (opts?: SignOutOptions) => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * Best-effort profile re-hydration.
   * IMPORTANT: does not flip UI into BOOTSTRAP and does not sign out.
   */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isRefreshTokenError(err: unknown): boolean {
  const e = err as any;
  const msg = String(e?.message || e?.error_description || e?.error || "").toLowerCase();
  return (
    msg.includes("refresh token") ||
    msg.includes("invalid refresh") ||
    msg.includes("token not found") ||
    msg.includes("refresh_token")
  );
}

async function loadProfile(session: Session): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  /**
   * LAPTOP-FIRST STABILITY RULE
   * - No “rehydrate overlay”
   * - No BOOTSTRAP after initial boot
   * - Never null profile during token refresh
   * - If network hiccups: keep UI stable; only hard logout on refresh-token errors
   */
  const [status, setStatus] = useState<AuthStatus>("BOOTSTRAP");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<unknown>(null);

  // Must exist for old RequireAuth logic, but we keep it always non-intrusive
  const [rehydrating] = useState<boolean>(false);

  // Avoid stale closure in onAuthStateChange
  const profileRef = useRef<Profile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const uid = session?.user?.id ?? null;

  const setUnauthed = useCallback(() => {
    setStatus("UNAUTHENTICATED");
    setSession(null);
    setProfile(null);
    setError(null);
  }, []);

  const hardResetToUnauthed = useCallback(() => {
    resetSupabaseAuthStorage({ force: true });
    setUnauthed();
  }, [setUnauthed]);

  const hydrateProfile = useCallback(
    async (s: Session) => {
      try {
        const p = await loadProfile(s);
        if (!aliveRef.current) return;

        setProfile(p);
        setError(null);

        // Keep the user AUTHENTICATED (profile fetch is not auth)
        setStatus((prev) => (prev === "BOOTSTRAP" ? "AUTHENTICATED" : prev));
      } catch (e) {
        if (!aliveRef.current) return;

        if (isRefreshTokenError(e)) {
          hardResetToUnauthed();
          return;
        }

        // Non-fatal: keep UI stable; do NOT flip to AUTH_ERROR if already authenticated.
        setError(e);

        setStatus((prev) => {
          if (prev === "BOOTSTRAP") return "AUTH_ERROR";
          return prev;
        });
      }
    },
    [hardResetToUnauthed]
  );

  const setAuthedStable = useCallback((s: Session) => {
    setSession(s);
    setStatus("AUTHENTICATED");
    setError(null);

    // IMPORTANT: do NOT null the existing profile if it's the same user.
    setProfile((prev) => {
      if (!prev) return prev;
      if (prev.id === s.user.id) return prev;
      return null;
    });
  }, []);

  const bootstrapAuth = useCallback(async () => {
    try {
      setStatus("BOOTSTRAP");
      setError(null);

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isRefreshTokenError(sessionError)) {
          hardResetToUnauthed();
          return;
        }
        setStatus("AUTH_ERROR");
        setSession(null);
        setProfile(null);
        setError(sessionError);
        return;
      }

      const s = data?.session ?? null;
      if (!s) {
        setUnauthed();
        return;
      }

      // READY IMMEDIATELY: do not block on profile
      setAuthedStable(s);

      // hydrate async
      void hydrateProfile(s);
    } catch (e) {
      if (isRefreshTokenError(e)) {
        hardResetToUnauthed();
        return;
      }
      setStatus("AUTH_ERROR");
      setSession(null);
      setProfile(null);
      setError(e);
    }
  }, [hardResetToUnauthed, hydrateProfile, setAuthedStable, setUnauthed]);

  useEffect(() => {
    void bootstrapAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      try {
        if (!s) {
          setUnauthed();
          return;
        }

        // On token refresh / visibility quirks: keep profile stable
        setAuthedStable(s);

        const current = profileRef.current;
        if (!current || current.id !== s.user.id) {
          void hydrateProfile(s);
        }
      } catch (e) {
        if (isRefreshTokenError(e)) {
          hardResetToUnauthed();
          return;
        }

        // Non-fatal once authenticated
        setError(e);
        setStatus((prev) => (prev === "BOOTSTRAP" ? "AUTH_ERROR" : prev));
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapAuth, hydrateProfile, hardResetToUnauthed, setUnauthed, setAuthedStable]);

  const signOut = useCallback(
    async (opts: SignOutOptions = {}) => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("[AuthProvider] signOut warning:", e, opts);
      } finally {
        hardResetToUnauthed();
      }
    },
    [hardResetToUnauthed]
  );

  /**
   * Laptop rule: refresh MUST be silent (no BOOTSTRAP, no profile reset)
   * - It’s a best-effort “keep alive” call, not a UI state transition.
   */
  const refresh = useCallback(async () => {
    try {
      const { data, error: e1 } = await supabase.auth.getSession();
      if (e1) {
        if (isRefreshTokenError(e1)) hardResetToUnauthed();
        return;
      }

      const s = data?.session ?? null;
      if (s) {
        setAuthedStable(s);
        const current = profileRef.current;
        if (!current || current.id !== s.user.id) void hydrateProfile(s);
        return;
      }

      // no session -> try refreshSession once, still silent
      const { data: r, error: e2 } = await supabase.auth.refreshSession();
      if (e2) {
        if (isRefreshTokenError(e2)) hardResetToUnauthed();
        return;
      }
      const rs = r?.session ?? null;
      if (rs) {
        setAuthedStable(rs);
        const current = profileRef.current;
        if (!current || current.id !== rs.user.id) void hydrateProfile(rs);
      }
    } catch (e) {
      if (isRefreshTokenError(e)) hardResetToUnauthed();
    }
  }, [hardResetToUnauthed, hydrateProfile, setAuthedStable]);

  /**
   * Force a profile re-hydration without affecting authenticated UI state.
   * Used by role guards to recover from a missing/blocked profiles row.
   */
  const refreshProfile = useCallback(async () => {
    try {
      const s = session;
      if (!s) return;
      await hydrateProfile(s);
    } catch (e) {
      // hydrateProfile handles refresh-token errors; keep this silent.
      console.warn("[AuthProvider] refreshProfile warning:", e);
    }
  }, [hydrateProfile, session]);

  const authReady = status !== "BOOTSTRAP";
  const loading = status === "BOOTSTRAP";

  const value = useMemo<AuthContextValue>(() => {
    return {
      status,
      session,
      uid,
      profile,
      error,

      loading,
      authReady,
      isReady: authReady,

      rehydrating,

      signOut,
      refresh,
      refreshProfile,
    };
  }, [status, session, uid, profile, error, loading, authReady, rehydrating, signOut, refresh, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
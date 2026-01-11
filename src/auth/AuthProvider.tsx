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

  signOut: (opts?: SignOutOptions) => Promise<void>;
  refresh: () => Promise<void>;
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

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: number | undefined;

  const timeout = new Promise<T>((_, reject) => {
    t = window.setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms);
  });

  return Promise.race([p, timeout]).finally(() => {
    if (t !== undefined) window.clearTimeout(t);
  });
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
  const [status, setStatus] = useState<AuthStatus>("BOOTSTRAP");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<unknown>(null);

  const uid = session?.user?.id ?? null;

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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
        // IMPORTANT: prevent infinite pending
        const p = await withTimeout(loadProfile(s), 4000, "loadProfile");
        if (!aliveRef.current) return;

        setProfile(p);
        setError(null);
        // Keep AUTHENTICATED (we already are)
      } catch (e) {
        if (!aliveRef.current) return;

        if (isRefreshTokenError(e)) {
          hardResetToUnauthed();
          return;
        }

        // Profile missing / RLS / network: we mark AUTH_ERROR but keep session in state for diagnostics
        setProfile(null);
        setError(e);
        setStatus("AUTH_ERROR");
      }
    },
    [hardResetToUnauthed]
  );

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

      // ✅ READY IMMEDIATELY: we do NOT wait for profile
      setSession(s);
      setStatus("AUTHENTICATED");
      setProfile(null);
      setError(null);

      // hydrate profile async (with timeout)
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
  }, [setUnauthed, hardResetToUnauthed, hydrateProfile]);

  useEffect(() => {
    void bootstrapAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      try {
        if (!s) {
          setUnauthed();
          return;
        }

        // ✅ READY IMMEDIATELY on any auth change
        setSession(s);
        setStatus("AUTHENTICATED");
        setProfile(null);
        setError(null);

        void hydrateProfile(s);
      } catch (e) {
        if (isRefreshTokenError(e)) {
          hardResetToUnauthed();
          return;
        }
        setStatus("AUTH_ERROR");
        setSession(s ?? null);
        setProfile(null);
        setError(e);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, [bootstrapAuth, hydrateProfile, hardResetToUnauthed, setUnauthed]);

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

  const refresh = useCallback(async () => {
    await bootstrapAuth();
  }, [bootstrapAuth]);

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

      signOut,
      refresh,
    };
  }, [status, session, uid, profile, error, loading, authReady, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

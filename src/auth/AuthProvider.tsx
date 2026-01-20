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

  // NEW: for fluid UX on tab-switch / mobile wake
  rehydrating: boolean;

  signOut: (opts?: SignOutOptions) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const GRACE_MS = 5 * 60 * 1000; // ✅ 5 minutes

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
  const [rehydrating, setRehydrating] = useState<boolean>(false);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // UX: prevent UI flicker on short tab switches (do not show "rehydrating" instantly)
  const rehydrateFlagTimerRef = useRef<number | null>(null);
  const beginRehydrateFlag = useCallback((delayMs: number = 150) => {
    if (rehydrateFlagTimerRef.current !== null) {
      window.clearTimeout(rehydrateFlagTimerRef.current);
      rehydrateFlagTimerRef.current = null;
    }
    rehydrateFlagTimerRef.current = window.setTimeout(() => {
      rehydrateFlagTimerRef.current = null;
      if (aliveRef.current) setRehydrating(true);
    }, delayMs);
  }, []);

  const endRehydrateFlag = useCallback(() => {
    if (rehydrateFlagTimerRef.current !== null) {
      window.clearTimeout(rehydrateFlagTimerRef.current);
      rehydrateFlagTimerRef.current = null;
    }
    if (aliveRef.current) setRehydrating(false);
  }, []);

  const uid = session?.user?.id ?? null;

  // ✅ Used to keep UI stable for a few minutes on tab switch
  const lastGoodAuthAtRef = useRef<number>(0);
  const markGoodAuthNow = useCallback(() => {
    lastGoodAuthAtRef.current = Date.now();
  }, []);
  const withinGraceWindow = useCallback(() => {
    const t = lastGoodAuthAtRef.current || 0;
    return t > 0 && Date.now() - t < GRACE_MS;
  }, []);

  const setUnauthed = useCallback(() => {
    setStatus("UNAUTHENTICATED");
    setSession(null);
    setProfile(null);
    setError(null);
    setRehydrating(false);
  }, []);

  const hardResetToUnauthed = useCallback(() => {
    resetSupabaseAuthStorage({ force: true });
    setUnauthed();
  }, [setUnauthed]);

  const hydrateProfile = useCallback(
    async (s: Session) => {
      try {
        beginRehydrateFlag();

        // IMPORTANT: prevent infinite pending
        const p = await withTimeout(loadProfile(s), 5000, "loadProfile");
        if (!aliveRef.current) return;

        setProfile(p);
        setError(null);
        // Keep AUTHENTICATED (we already are)
        markGoodAuthNow();
      } catch (e) {
        if (!aliveRef.current) return;

        if (isRefreshTokenError(e)) {
          hardResetToUnauthed();
          return;
        }

        // Profile missing / RLS / network: mark AUTH_ERROR
        setProfile(null);
        setError(e);
        setStatus("AUTH_ERROR");
      } finally {
        endRehydrateFlag();
      }
    },
    [beginRehydrateFlag, endRehydrateFlag, hardResetToUnauthed, markGoodAuthNow]
  );

  const setAuthedFast = useCallback(
    (s: Session) => {
      setSession(s);
      setStatus("AUTHENTICATED");
      setProfile(null); // hydrate async
      setError(null);
      markGoodAuthNow();
    },
    [markGoodAuthNow]
  );

  /**
   * ✅ Soft rehydrate used on tab focus / visibility
   * - Attempts getSession
   * - If missing, tries refreshSession within grace window
   * - Does NOT immediately nuke the app UX
   */
  const softRehydrate = useCallback(async () => {
    if (!aliveRef.current) return;

    beginRehydrateFlag();

    try {
      const { data, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        4000,
        "getSession"
      );

      if (sessionError) {
        if (isRefreshTokenError(sessionError)) {
          hardResetToUnauthed();
          return;
        }
        // If within grace, don't hard-fail the user experience
        if (withinGraceWindow()) {
          return;
        }
        setStatus("AUTH_ERROR");
        setError(sessionError);
        return;
      }

      const s = data?.session ?? null;

      if (s) {
        setAuthedFast(s);
        void hydrateProfile(s);
        return;
      }

      // No session returned.
      // If we were recently authed, try refreshSession before declaring unauth.
      if (withinGraceWindow()) {
        try {
          const { data: rData, error: rErr } = await withTimeout(
            supabase.auth.refreshSession(),
            5000,
            "refreshSession"
          );

          if (rErr) {
            if (isRefreshTokenError(rErr)) {
              hardResetToUnauthed();
              return;
            }
            return; // keep UX stable within grace
          }

          const rs = rData?.session ?? null;
          if (rs) {
            setAuthedFast(rs);
            void hydrateProfile(rs);
            return;
          }

          // still no session -> let it stay stable in grace window
          return;
        } catch (e) {
          if (isRefreshTokenError(e)) {
            hardResetToUnauthed();
            return;
          }
          return;
        }
      }

      // Not within grace => unauth
      setUnauthed();
    } catch (e) {
      if (isRefreshTokenError(e)) {
        hardResetToUnauthed();
        return;
      }
      if (withinGraceWindow()) {
        return; // keep UX stable
      }
      setStatus("AUTH_ERROR");
      setSession(null);
      setProfile(null);
      setError(e);
    } finally {
      endRehydrateFlag();
    }
  }, [hardResetToUnauthed, hydrateProfile, setAuthedFast, setUnauthed, withinGraceWindow]);

  const bootstrapAuth = useCallback(async () => {
    try {
      setStatus("BOOTSTRAP");
      setError(null);
      setRehydrating(true);

      const { data, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        4000,
        "getSession"
      );

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
      setAuthedFast(s);

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
    } finally {
      if (aliveRef.current) setRehydrating(false);
    }
  }, [setUnauthed, hardResetToUnauthed, hydrateProfile, setAuthedFast]);

  useEffect(() => {
    void bootstrapAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      try {
        if (!s) {
          // If user just came back from background, allow grace rehydrate
          if (withinGraceWindow()) {
            void softRehydrate();
            return;
          }
          setUnauthed();
          return;
        }

        // ✅ READY IMMEDIATELY on any auth change
        setAuthedFast(s);
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
  }, [
    bootstrapAuth,
    hydrateProfile,
    hardResetToUnauthed,
    setUnauthed,
    setAuthedFast,
    softRehydrate,
    withinGraceWindow,
  ]);

  // ✅ Tab switch / wake: attempt silent rehydrate
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void softRehydrate();
      }
    };
    const onFocus = () => {
      void softRehydrate();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [softRehydrate]);

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

      rehydrating,

      signOut,
      refresh,
    };
  }, [status, session, uid, profile, error, loading, authReady, rehydrating, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
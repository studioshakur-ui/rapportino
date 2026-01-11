// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase, resetSupabaseAuthStorage } from "../lib/supabaseClient";

const AuthContext = createContext(null);

function inferRole(profile) {
  if (!profile) return null;
  const raw = String(profile.app_role || "").toUpperCase();
  if (["ADMIN", "MANAGER", "CAPO", "UFFICIO", "DIREZIONE"].includes(raw)) return raw;
  return null;
}

function isRefreshTokenError(err) {
  const msg = String(err?.message || err?.error_description || err?.error || "").toLowerCase();
  return msg.includes("refresh token") || msg.includes("invalid refresh") || msg.includes("token not found");
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: "BOOTSTRAP", // BOOTSTRAP | AUTHENTICATED | UNAUTHENTICATED | AUTH_ERROR
    session: null,
    profile: null,
    error: null,
  });

  const uid = state.session?.user?.id || null;

  const setUnauthed = () => {
    setState({ status: "UNAUTHENTICATED", session: null, profile: null, error: null });
  };

  const bootstrapAuth = async () => {
    try {
      setState((s) => ({ ...s, status: "BOOTSTRAP", error: null }));

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isRefreshTokenError(sessionError)) {
          resetSupabaseAuthStorage({ force: true });
          setUnauthed();
          return;
        }
        setState({ status: "AUTH_ERROR", session: null, profile: null, error: sessionError });
        return;
      }

      const session = sessionData?.session || null;
      if (!session) {
        setUnauthed();
        return;
      }

      const { data: p, error: pErr } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (pErr) {
        setState({ status: "AUTH_ERROR", session, profile: null, error: pErr });
        return;
      }

      setState({ status: "AUTHENTICATED", session, profile: p || null, error: null });
    } catch (e) {
      if (isRefreshTokenError(e)) {
        resetSupabaseAuthStorage({ force: true });
        setUnauthed();
        return;
      }
      setState({ status: "AUTH_ERROR", session: null, profile: null, error: e });
    }
  };

  useEffect(() => {
    bootstrapAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESH_FAILED") {
        resetSupabaseAuthStorage({ force: true });
        setUnauthed();
        return;
      }

      if (!session) {
        setUnauthed();
        return;
      }

      const { data: p, error: pErr } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (pErr) {
        if (isRefreshTokenError(pErr)) {
          resetSupabaseAuthStorage({ force: true });
          setUnauthed();
          return;
        }
        setState({ status: "AUTH_ERROR", session, profile: null, error: pErr });
        return;
      }

      setState({ status: "AUTHENTICATED", session, profile: p || null, error: null });
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * signOut(opts?)
   * - compatible avec AppShell: signOut({ reason })
   * - hard clear storage pour éliminer les refresh tokens cassés
   */
  const signOut = async (opts = {}) => {
    try {
      // tu peux logguer opts.reason côté audit si tu veux plus tard
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[AuthProvider] signOut warning:", e, opts);
    } finally {
      resetSupabaseAuthStorage({ force: true });
      setUnauthed();
    }
  };

  const refresh = bootstrapAuth;

  const authReady = state.status !== "BOOTSTRAP";
  const loading = state.status === "BOOTSTRAP";

  const value = useMemo(() => {
    return {
      status: state.status,
      session: state.session,
      uid,
      profile: state.profile,
      app_role: inferRole(state.profile),
      error: state.error,

      authReady,
      loading,

      signOut,
      refresh,
    };
  }, [state, uid, authReady, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: "BOOTSTRAP", // BOOTSTRAP | UNAUTHENTICATED | AUTHENTICATED_LOADING | AUTHENTICATED_READY | AUTH_ERROR
    session: null,
    profile: null,
    error: null,
  });

  const bootstrapAuth = async () => {
    try {
      setState((s) => ({ ...s, status: "BOOTSTRAP", error: null }));

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData?.session) {
        setState({
          status: "UNAUTHENTICATED",
          session: null,
          profile: null,
          error: null,
        });
        return;
      }

      setState((s) => ({
        ...s,
        status: "AUTHENTICATED_LOADING",
        session: sessionData.session,
        error: null,
      }));

      const userId = sessionData.session.user.id;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        setState({
          status: "AUTH_ERROR",
          session: sessionData.session,
          profile: null,
          error: profileError || new Error("Profile not found"),
        });
        return;
      }

      setState({
        status: "AUTHENTICATED_READY",
        session: sessionData.session,
        profile,
        error: null,
      });
    } catch (err) {
      setState({
        status: "AUTH_ERROR",
        session: null,
        profile: null,
        error: err,
      });
    }
  };

  useEffect(() => {
    bootstrapAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      bootstrapAuth();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setState({
      status: "UNAUTHENTICATED",
      session: null,
      profile: null,
      error: null,
    });
  };

  // ✅ Compat Login.jsx actuel + usages futurs
  const authReady = state.status !== "BOOTSTRAP";
  const loading =
    state.status === "BOOTSTRAP" || state.status === "AUTHENTICATED_LOADING";

  const value = {
    ...state,
    authReady,
    loading,
    isReady: state.status === "AUTHENTICATED_READY",
    isAuthenticated:
      state.status === "AUTHENTICATED_READY" ||
      state.status === "AUTHENTICATED_LOADING",
    logout,
    // Alias compat avec AppShell
    signOut: logout,
    refresh: bootstrapAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

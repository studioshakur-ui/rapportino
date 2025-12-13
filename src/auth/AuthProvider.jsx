// src/auth/AuthProvider.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase, resetSupabaseAuthStorage } from "../lib/supabaseClient";

const AuthContext = createContext(null);

/**
 * Objectif (stabilité "Percorso-level"):
 * - Session robuste (retour d'onglet, wake/sleep, auto-refresh token)
 * - Plus de "page blanche" / état fantôme: on attend authReady
 * - Reset auth storage uniquement si nécessaire (manuel ou corruption détectée)
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const inflightProfileRef = useRef(0);
  const sessionRef = useRef(null);
  const userRef = useRef(null);

  const applySession = useCallback((nextSession) => {
    if (!mountedRef.current) return;
    sessionRef.current = nextSession || null;
    userRef.current = nextSession?.user ?? null;

    setSession(nextSession || null);
    setUser(nextSession?.user ?? null);
  }, []);

  const hardResetAuth = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    resetSupabaseAuthStorage();
    applySession(null);
    setProfile(null);
  }, [applySession]);

  const fetchProfile = useCallback(async (userId) => {
    const reqId = ++inflightProfileRef.current;
    try {
      const { data, error: qErr, status } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (reqId !== inflightProfileRef.current) return;

      if (qErr && status !== 406) throw qErr;

      if (!data) {
        // Profil manquant: crée un profil minimal (CAPO par défaut)
        const { data: userData, error: getUserError } =
          await supabase.auth.getUser();
        if (getUserError) throw getUserError;

        const authUser = userData.user;
        const email = authUser?.email ?? "";
        const displayName =
          authUser?.user_metadata?.full_name ||
          authUser?.user_metadata?.name ||
          email;

        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email,
            full_name: displayName || "CORE User",
            display_name: displayName || "CORE User",
            app_role: "CAPO",
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        if (!mountedRef.current) return;
        setProfile(inserted);
        return;
      }

      if (!mountedRef.current) return;
      setProfile(data);
    } catch (err) {
      console.error("[AuthProvider] fetchProfile error:", err);

      if (!mountedRef.current) return;
      setError(
        "Impossible de charger votre profil. Merci de vous reconnecter."
      );

      // Sécurité: on sort proprement
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      applySession(null);
      setProfile(null);
    }
  }, [applySession]);

  // INIT + LISTENERS
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      setLoading(true);
      setError(null);

      // 1) init session
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const currentSession = data.session || null;
        applySession(currentSession);

        // 2) profile
        if (currentSession?.user?.id) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("[AuthProvider] init error:", err);

        // Tentative de récupération si storage corrompu
        try {
          resetSupabaseAuthStorage();
          const { data } = await supabase.auth.getSession();
          const recovered = data.session || null;
          applySession(recovered);
          if (recovered?.user?.id) await fetchProfile(recovered.user.id);
        } catch (err2) {
          console.error("[AuthProvider] init recovery failed:", err2);
          applySession(null);
          setProfile(null);
          setError("Erreur de connexion. Merci de vous reconnecter.");
        }
      } finally {
        if (!mountedRef.current) return;
        setAuthReady(true);
        setLoading(false);
      }
    }

    init();

    // Auth state changes (login/logout/refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        applySession(newSession || null);

        const uid = newSession?.user?.id;
        if (uid) {
          await fetchProfile(uid);
        } else {
          setProfile(null);
        }

        if (!mountedRef.current) return;
        setAuthReady(true);
        setLoading(false);
      }
    );

    // Retour onglet / focus: resync session (corrige le "je dois refresh")
    const onVisibilityOrFocus = async () => {
      if (!mountedRef.current) return;
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        const current = data.session || null;

        const prevUserId =
          userRef.current?.id ?? sessionRef.current?.user?.id ?? null;
        const nextUserId = current?.user?.id ?? null;

        // Si l'état change, on resync proprement
        if (prevUserId !== nextUserId) {
          applySession(current);
          if (nextUserId) {
            await fetchProfile(nextUserId);
          } else {
            setProfile(null);
          }
        }

        // Cas où session est null mais tokens existent: tenter refresh
        if (!current) {
          try {
            const { data: refreshed } = await supabase.auth.refreshSession();
            const s2 = refreshed?.session || null;
            if (s2?.user?.id) {
              applySession(s2);
              await fetchProfile(s2.user.id);
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn("[AuthProvider] visibility/focus resync failed:", e);
      }
    };

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    return () => {
      mountedRef.current = false;
      authListener?.subscription?.unsubscribe();
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
  }, [applySession, fetchProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.signOut();
    } finally {
      applySession(null);
      setProfile(null);
      setLoading(false);
    }
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    const uid = userRef.current?.id;
    if (!uid) return;
    await fetchProfile(uid);
  }, [fetchProfile]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      authReady,
      error,
      signOut,
      hardResetAuth,
      refreshProfile,
    }),
    [session, user, profile, loading, authReady, error, signOut, hardResetAuth, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider (wrap your app).");
  }
  return ctx;
}

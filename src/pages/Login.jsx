// src/pages/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, resetSupabaseAuthStorage } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { pageBg, headerPill, cardSurface, buttonPrimary } from "../ui/designSystem";

function normalizeError(err) {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || String(err);

  // Supabase/PostgREST style: { message, code, details, hint }
  if (typeof err === "object") {
    const msg = err.message || err.error_description || err.error || null;
    if (msg) return String(msg);

    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return String(err);
}

export default function Login() {
  const navigate = useNavigate();

  // Champs exposés par AuthProvider
  const { session, profile, loading, authReady, error: authError } = useAuth();

  // Dark-only
  const isDark = true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Home selon le rôle
  const roleHome = useMemo(() => {
    const r = profile?.app_role;
    if (r === "ADMIN") return "/admin";
    if (r === "UFFICIO") return "/ufficio";
    if (r === "DIREZIONE") return "/direction";
    if (r === "MANAGER") return "/manager";
    return "/app";
  }, [profile]);

  // Logs DEV uniquement (aucun bruit en prod / démo)
  const DEV = import.meta?.env?.DEV;
  const logDev = (...args) => {
    if (DEV) console.log(...args);
  };
  const errorDev = (...args) => {
    if (DEV) console.error(...args);
  };

  useEffect(() => {
    logDev("[Login] mounted");
  }, []);

  // Si déjà connecté + profil prêt => redirection immédiate
  useEffect(() => {
    if (!authReady) return;
    if (!session) return;
    if (!profile) return;
    navigate(roleHome, { replace: true });
  }, [authReady, session, profile, roleHome, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        errorDev("[Login] signIn error:", signInError);
        setError(`Login fallito: ${signInError.message}`);
        return;
      }

      const user = data?.user;
      if (!user) {
        setError("Login OK ma nessun user restituito.");
        return;
      }

      // AuthProvider hydraterà il profilo via onAuthStateChange
    } catch (err) {
      errorDev("[Login] unexpected error:", err);
      setError(`Errore inatteso: ${normalizeError(err) || "Errore."}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Erreur globale (AuthProvider) + erreur locale (Login)
  const bannerError = useMemo(() => {
    return normalizeError(error) || normalizeError(authError);
  }, [error, authError]);

  return (
    <div className={["min-h-screen flex items-center justify-center px-4", pageBg(isDark)].join(" ")}>
      <div className="w-full max-w-md">
        <div className="text-left mb-4">
          <div className={`${headerPill(isDark)} mb-2`}>SISTEMA CENTRALE DI CANTIERE</div>
          <h1 className="text-3xl font-semibold mb-2">Entra in CORE</h1>
          <p className="text-[14px] text-slate-500 leading-relaxed">
            Usa credenziali interne. Ogni accesso viene registrato.
          </p>
        </div>

        <div className={cardSurface(isDark, "p-6")}>
          {!authReady && (
            <div className="text-[13px] rounded-md px-3 py-2 mb-4 border text-slate-200 bg-slate-900/40 border-slate-700">
              Inizializzazione sicurezza CORE…
            </div>
          )}

          {bannerError && (
            <div
              className={[
                "text-[14px] rounded-md px-3 py-2 mb-4 border",
                "text-amber-200 bg-amber-900/40 border-amber-700",
              ].join(" ")}
            >
              {bannerError}
            </div>
          )}

          {authReady && session && !profile && (
            <div className="text-[13px] rounded-md px-3 py-2 mb-4 border text-slate-200 bg-slate-900/40 border-slate-700">
              Sessione attiva… Caricamento profilo…
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] mb-1">Email aziendale</label>
              <input
                type="email"
                required
                autoComplete="username"
                className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting || loading}
              />
            </div>

            <div>
              <label className="block text-[13px] mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || loading}
              />
            </div>

            <button
              type="submit"
              disabled={!authReady || submitting || loading}
              className={buttonPrimary(isDark, "w-full gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed")}
            >
              {submitting || loading ? "Accesso in corso…" : "Accedi"}
            </button>
          </form>

          <div className="mt-4 text-[12px] text-slate-500 flex justify-between items-center">
            <span>CORE · Sistema centrale di cantiere</span>
            <Link to="/" className="underline underline-offset-2 hover:text-sky-400">
              Torna alla panoramica
            </Link>
          </div>

          <div className="mt-3 text-[12px] text-slate-500 flex justify-between items-center">
            <span className="opacity-80">Problemi di accesso?</span>
            <button
              type="button"
              onClick={() => {
                resetSupabaseAuthStorage();
                setError("Sessione ripulita. Riprova ad accedere.");
              }}
              className="underline underline-offset-2 hover:text-sky-400"
            >
              Ripulisci sessione
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

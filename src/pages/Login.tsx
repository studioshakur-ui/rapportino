// src/pages/Login.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { AuthError } from "@supabase/supabase-js";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { pageBg, headerPill, cardSurface, buttonPrimary } from "../ui/designSystem";

function normalizeError(err: unknown): string | null {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || String(err);

  if (typeof err === "object") {
    const e = err as any;
    const msg = e?.message || e?.error_description || e?.error || null;
    if (msg) return String(msg);
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

export default function Login(): JSX.Element {
  const navigate = useNavigate();

  const { session, profile, authReady, error: authError, signOut, status } = useAuth();
  const isDark = true;

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [bootstrapStuck, setBootstrapStuck] = useState<boolean>(false);

  const roleHome = useMemo(() => {
    const r = String(profile?.app_role || "").toUpperCase();
    if (r === "ADMIN") return "/admin";
    if (r === "UFFICIO") return "/ufficio";
    if (r === "DIREZIONE") return "/direzione";
    if (r === "MANAGER") return "/manager";
    return "/app";
  }, [profile]);

  useEffect(() => {
    // Safety: if bootstrap takes too long, allow user to proceed and/or reset.
    if (authReady) return;

    const t = window.setTimeout(() => setBootstrapStuck(true), 3500);
    return () => window.clearTimeout(t);
  }, [authReady]);

  useEffect(() => {
    // If already authenticated and profile loaded, redirect
    if (!authReady) return;
    if (!session) return;
    if (!profile) return;

    navigate(roleHome, { replace: true });
  }, [authReady, session, profile, roleHome, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setLocalError(`Accesso negato: ${(signInError as AuthError).message}`);
        return;
      }

      const user = data?.user;
      if (!user) {
        setLocalError("Accesso OK ma nessun utente restituito.");
        return;
      }

      // Profile hydration handled by AuthProvider (onAuthStateChange)
    } catch (err) {
      setLocalError(`Errore inatteso: ${normalizeError(err) || "Errore."}`);
    } finally {
      setSubmitting(false);
    }
  };

  const bannerError = useMemo(() => {
    return normalizeError(localError) || normalizeError(authError);
  }, [localError, authError]);

  const inputClass =
    "w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none " +
    "bg-slate-950/40 border-slate-700 text-slate-100 placeholder:text-slate-600 " +
    "focus:ring-sky-500";

  // ✅ IMPORTANT: do not block login because of bootstrap.
  // Only block while submitting.
  const disableForm = submitting;

  return (
    <div className={["min-h-screen flex items-center justify-center px-4", pageBg(isDark)].join(" ")}>
      <div className="w-full max-w-md">
        <div className="text-left mb-4">
          <div className={`${headerPill(isDark)} mb-2`}>SISTEMA CENTRALE DI CANTIERE</div>
          <h1 className="text-3xl font-semibold mb-1">Entra in CORE</h1>
          <p className="text-[13px] text-slate-500 leading-relaxed">Accesso interno. Ogni operazione è tracciata.</p>
        </div>

        <div className={cardSurface(isDark, "p-6")}>
          {!authReady && (
            <div className="text-[12px] rounded-md px-3 py-2 mb-4 border text-slate-200 bg-slate-900/40 border-slate-700">
              {bootstrapStuck
                ? "Inizializzazione lenta. Puoi comunque provare ad accedere o ripulire la sessione."
                : "Inizializzazione sicurezza…"}
            </div>
          )}

          {status === "AUTH_ERROR" && (
            <div className="text-[12px] rounded-md px-3 py-2 mb-4 border text-rose-200 bg-rose-900/30 border-rose-700">
              Errore di sicurezza/sessione. Usa “Ripulisci sessione” e riprova.
            </div>
          )}

          {bannerError && (
            <div className="text-[13px] rounded-md px-3 py-2 mb-4 border text-amber-200 bg-amber-900/40 border-amber-700">
              {bannerError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Email</label>
              <input
                className={inputClass}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                disabled={disableForm}
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Password</label>
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={disableForm}
              />
            </div>

            <button
              type="submit"
              className={buttonPrimary(isDark, "w-full")}
              disabled={disableForm}
              aria-busy={submitting}
            >
              {submitting ? "Accesso…" : "Accedi"}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signOut({ reason: "manual_reset" });
                  } catch {}
                  // IMPORTANT: hard reset storages
                  try {
                    // eslint-disable-next-line no-restricted-globals
                    localStorage.clear();
                    // eslint-disable-next-line no-restricted-globals
                    sessionStorage.clear();
                  } catch {}
                  // NOTE: we do not call resetSupabaseAuthStorage here anymore; AuthProvider does hard reset when needed.
                  navigate("/login", { replace: true });
                }}
                className="text-[12px] text-slate-400 hover:text-slate-200"
              >
                Ripulisci sessione
              </button>

              <Link to="/" className="text-[12px] text-slate-400 hover:text-slate-200">
                Torna al sito
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

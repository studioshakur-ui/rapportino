// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, resetSupabaseAuthStorage } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import {
  getInitialTheme,
  pageBg,
  headerPill,
  cardSurface,
  buttonPrimary,
} from "../ui/designSystem";

export default function Login() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    console.log(
      "%cCORE AUTH — SHAKUR Engineering",
      "color:#22c55e;font-weight:bold;font-size:14px;"
    );
    console.log("[Login] Supabase client:", supabase);
  }, []);

  // Persistance du thème
  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Si déjà connecté → redirect selon app_role (CAPO / UFFICIO / MANAGER / DIREZIONE)
  useEffect(() => {
    if (!session || !profile) return;

    console.log(
      "[Login] Session già attiva, redirect con app_role:",
      profile.app_role
    );

    if (profile.app_role === "UFFICIO") {
      navigate("/ufficio", { replace: true });
    } else if (profile.app_role === "DIREZIONE") {
      navigate("/direction", { replace: true });
    } else if (profile.app_role === "MANAGER") {
      navigate("/manager", { replace: true });
    } else {
      // CAPO o ruolo non riconosciuto → default CAPO
      navigate("/app", { replace: true });
    }
  }, [session, profile, navigate]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    console.log("[Login] Submit start per", email);
    console.log("[Login] Verifica supabase.auth:", supabase && supabase.auth);

    if (!supabase || !supabase.auth || !supabase.auth.signInWithPassword) {
      console.error(
        "[Login] supabase.auth.signInWithPassword è undefined!"
      );
      setError("Configurazione autenticazione non valida (supabase).");
      setSubmitting(false);
      return;
    }

    // 🧹 Avant chaque login, on nettoie les sessions Supabase du navigateur
    resetSupabaseAuthStorage();

    // Timeout SOFT : message après 10s, mais on ne coupe PAS la requête
    const softTimeoutId = setTimeout(() => {
      console.warn("[Login] Soft timeout 10s: UI warning only");
      setError(
        "La richiesta di accesso sta impiegando troppo tempo. Verifica la connessione o riprova."
      );
    }, 10000);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      clearTimeout(softTimeoutId);

      console.log("[Login] Risultato signInWithPassword:", {
        data,
        signInError,
      });

      if (signInError) {
        console.error("[Login] Errore login Supabase:", signInError);
        if (signInError.message?.includes("Failed to fetch")) {
          setError(
            "Impossibile contattare il server di autenticazione (rete)."
          );
        } else {
          setError("Credenziali non valide o account non autorizzato.");
        }
        return;
      }

      const user = data?.user;
      if (!user) {
        console.error("[Login] Nessun user restituito da Supabase");
        setError("Errore imprevisto durante il login.");
        return;
      }

      console.log("[Login] Login OK, user.id =", user.id);

      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      console.log("[Login] Risultato query profilo:", { prof, profileError });

      const ruolo = prof?.app_role;

      if (ruolo === "UFFICIO") {
        console.log("[Login] Redirect → /ufficio");
        navigate("/ufficio", { replace: true });
      } else if (ruolo === "DIREZIONE") {
        console.log("[Login] Redirect → /direction");
        navigate("/direction", { replace: true });
      } else if (ruolo === "MANAGER") {
        console.log("[Login] Redirect → /manager");
        navigate("/manager", { replace: true });
      } else {
        console.log("[Login] Redirect → /app (CAPO o profilo mancante)");
        navigate("/app", { replace: true });
      }
    } catch (err) {
      clearTimeout(softTimeoutId);
      console.error("[Login] Errore in handleSubmit:", err);
      setError("Errore di rete o configurazione. Contatta l’Ufficio.");
    } finally {
      console.log("[Login] finally → setSubmitting(false)");
      setSubmitting(false);
    }
  };

  return (
    <div
      className={[
        "min-h-screen flex items-center justify-center px-4",
        pageBg(isDark),
      ].join(" ")}
    >
      <div className="w-full max-w-md">
        {/* En-tête */}
        <div className="flex items-start justify-between mb-4">
          <div className="text-left">
            <div className={`${headerPill(isDark)} mb-2`}>
              SISTEMA CENTRALE DI CANTIERE
            </div>

            <div className="text-[12px] text-slate-500 font-mono mb-2">
              Auth Module · SHAKUR Engineering
            </div>

            <h1 className="text-3xl font-semibold mb-2">Entra in CORE</h1>

            <p className="text-[14px] text-slate-500 leading-relaxed">
              Usa credenziali interne. Ogni accesso viene registrato.
            </p>
          </div>

          {/* Switch Dark / Light */}
          <button
            type="button"
            onClick={toggleTheme}
            className={[
              "ml-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
              isDark
                ? "border-slate-600 bg-slate-900/70 text-slate-200"
                : "border-slate-300 bg-slate-50 text-slate-700",
            ].join(" ")}
          >
            <span
              className={[
                "inline-flex h-3 w-3 items-center justify-center rounded-full text-[9px]",
                isDark ? "bg-slate-800" : "bg-amber-200",
              ].join(" ")}
            >
              {isDark ? "🌑" : "☀️"}
            </span>
            <span className="uppercase tracking-[0.16em]">
              {isDark ? "Dark" : "Light"}
            </span>
          </button>
        </div>

        {/* Carte login */}
        <div className={cardSurface(isDark, "p-6")}>
          {error && (
            <div
              className={[
                "text-[14px] rounded-md px-3 py-2 mb-4 border",
                isDark
                  ? "text-amber-200 bg-amber-900/40 border-amber-700"
                  : "text-amber-800 bg-amber-50 border-amber-300",
              ].join(" ")}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] mb-1">
                Email aziendale
              </label>
              <input
                type="email"
                required
                className={[
                  "w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none",
                  isDark
                    ? "bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                    : "bg-white border-slate-300 text-slate-900 focus:ring-sky-500",
                ].join(" ")}
                placeholder="nome.cognome@core.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] mb-1">Password</label>
              <input
                type="password"
                required
                className={[
                  "w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none",
                  isDark
                    ? "bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                    : "bg-white border-slate-300 text-slate-900 focus:ring-sky-500",
                ].join(" ")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={buttonPrimary(
                isDark,
                "w-full gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {submitting ? "Accesso in corso…" : "Accedi"}
            </button>
          </form>

          {/* Lien retour landing */}
          <div className="mt-4 text-[12px] text-slate-500 flex justify-between items-center">
            <span>CORE · Sistema centrale di cantiere</span>
            <Link
              to="/"
              className="underline underline-offset-2 hover:text-sky-400"
            >
              Torna alla panoramica
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import LoadingScreen from "../components/LoadingScreen";

export default function ForcePasswordChange() {
  const { session, profile, loading, authReady, isReady, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const ready = typeof authReady === "boolean" ? authReady : !!isReady;

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const canShow = useMemo(() => ready && !loading, [ready, loading]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!p1 || p1.length < 8) {
      setMsg({ ok: false, text: "La password deve avere almeno 8 caratteri." });
      return;
    }
    if (p1 !== p2) {
      setMsg({ ok: false, text: "Le password non coincidono." });
      return;
    }

    setBusy(true);
    try {
      // 1) Update auth password
      const { error: e1 } = await supabase.auth.updateUser({ password: p1 });
      if (e1) throw e1;

      // 2) Clear flag in profiles
      const { error: e2 } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", profile.id);

      if (e2) throw e2;

      // 3) Refresh profile
      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }

      setMsg({ ok: true, text: "Password aggiornata." });
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[ForcePasswordChange] error:", err);
      setMsg({ ok: false, text: err?.message || "Errore." });
    } finally {
      setBusy(false);
      setP1("");
      setP2("");
    }
  };

  if (!canShow) {
    return <LoadingScreen message="Inizializzazione sicurezza CORE…" />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile?.must_change_password) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-slate-800 rounded-2xl bg-slate-950/60 p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Sicurezza
        </div>
        <h1 className="text-xl font-semibold mt-1">
          Cambio password obbligatorio
        </h1>
        <p className="text-xs text-slate-400 mt-2">
          Primo accesso: imposta una nuova password personale.
        </p>

        {msg && (
          <div
            className={[
              "mt-4 text-[13px] rounded-md px-3 py-2 border",
              msg.ok
                ? "text-emerald-200 bg-emerald-900/20 border-emerald-800"
                : "text-amber-200 bg-amber-900/30 border-amber-800",
            ].join(" ")}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-[12px] mb-1 text-slate-300">
              Nuova password
            </label>
            <input
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              type="password"
              minLength={8}
              required
              className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">
              Conferma password
            </label>
            <input
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              type="password"
              minLength={8}
              required
              className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 px-4 py-2 rounded-xl border border-emerald-600 text-emerald-100 hover:bg-emerald-600/15 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Salvataggio…" : "Conferma"}
          </button>
        </form>
      </div>
    </div>
  );
}

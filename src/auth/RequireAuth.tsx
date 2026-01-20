// src/auth/RequireAuth.tsx
import React, { useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }): JSX.Element {
  const nav = useNavigate();
  const { status, signOut, authReady, rehydrating } = useAuth();

  const handleHardReset = useCallback(async () => {
    try {
      await signOut({ reason: "auth_error_hard_reset" });
    } finally {
      nav("/login", { replace: true });
    }
  }, [nav, signOut]);

  if (!authReady || status === "BOOTSTRAP") {
    return (
      <div className="w-full h-screen flex items-center justify-center text-slate-400">
        Inizializzazione CORE…
      </div>
    );
  }

  // ✅ Zéro perturbation sur tab-switch/focus
  if (rehydrating) {
    return <>{children}</>;
  }

  if (status === "UNAUTHENTICATED") {
    return <Navigate to="/login" replace />;
  }

  if (status === "AUTH_ERROR") {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="max-w-md w-full mx-auto rounded-2xl border border-rose-400/40 bg-rose-500/10 p-5 text-rose-100 space-y-3">
          <div className="text-[12px] uppercase tracking-[0.22em] text-rose-200">SECURITY ERROR</div>
          <div className="text-[14px] font-semibold">Errore di sessione o sicurezza.</div>
          <div className="text-[12px] text-rose-100/90">
            Per ripristinare l’accesso, ripulisci la sessione e fai login di nuovo.
          </div>
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleHardReset}
              className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-100 hover:bg-rose-500/15"
            >
              Ripulisci sessione
            </button>
            <button
              type="button"
              onClick={() => nav("/login", { replace: true })}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900"
            >
              Vai al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

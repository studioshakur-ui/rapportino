// src/capo/simple/CapoEntryRouter.tsx
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Profile = {
  id: string;
  role?: string;
  capo_ui_mode?: "simple" | "rich" | string;
};

const CapoSimpleEntry = lazy(() => import("./CapoSimpleEntry"));

export default function CapoEntryRouter(): JSX.Element {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"simple" | "rich">("simple");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const { data, error: rpcErr } = await supabase.rpc("core_current_profile");
        if (rpcErr) throw rpcErr;

        const p = (data || null) as Profile | null;
        const m = String(p?.capo_ui_mode || "simple").toLowerCase();
        const finalMode = (m === "rich" ? "rich" : "simple") as "simple" | "rich";

        if (!mounted) return;

        setMode(finalMode);

        if (finalMode === "rich") {
          nav("/app/ship-selector", { replace: true });
        }
      } catch (e) {
        console.error("[CapoEntryRouter] load error:", e);
        if (!mounted) return;
        setError("Impossibile caricare il profilo (core_current_profile).");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [nav]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">Caricamento…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-100">{error}</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-[12px] font-semibold text-slate-100"
          >
            Riprova
          </button>
          <button
            type="button"
            onClick={() => nav("/app/ship-selector")}
            className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-[12px] font-semibold text-slate-100"
          >
            Apri selettore cantieri
          </button>
        </div>
      </div>
    );
  }

  if (mode === "rich") {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">Reindirizzamento…</div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="p-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">Caricamento…</div>
        </div>
      }
    >
      <CapoSimpleEntry />
    </Suspense>
  );
}

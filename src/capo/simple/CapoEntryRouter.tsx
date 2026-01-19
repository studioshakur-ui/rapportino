// src/capo/simple/CapoEntryRouter.tsx
// CAPO entry router (patched):
// - Source of truth for capo_ui_mode is AuthProvider.profile (already hydrated in UI)
// - Fallback to RPC core_current_profile ONLY if profile isn't available yet
// - In RICH: auto-open today's ship (if exactly one assignment), otherwise ship selector
// - In SIMPLE: render CapoSimpleEntry (legacy simplified flow)

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthProvider";

type ProfileLite = {
  id: string;
  role?: string;
  capo_ui_mode?: "simple" | "rich" | string;
};

type ShipAssignment = {
  plan_date: string; // YYYY-MM-DD
  ship_id: string;
  ship_code: string | null;
  ship_name: string | null;
  costr: string | null;
  commessa: string | null;
  position: number | null;
};

function localIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeMode(v: unknown): "simple" | "rich" {
  const m = String(v || "simple").toLowerCase();
  return m === "rich" ? "rich" : "simple";
}

const CapoSimpleEntry = lazy(() => import("./CapoSimpleEntry"));

export default function CapoEntryRouter(): JSX.Element {
  const nav = useNavigate();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"simple" | "rich">("simple");
  const [error, setError] = useState<string>("");
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const today = useMemo(() => localIsoDate(), []);

  useEffect(() => {
    let mounted = true;

    async function resolveMode(): Promise<"simple" | "rich"> {
      // ✅ Source of truth: AuthProvider.profile (already used by UI)
      const fromAuth = (profile as ProfileLite | null | undefined) || null;
      if (fromAuth?.capo_ui_mode) return normalizeMode(fromAuth.capo_ui_mode);

      // Fallback: RPC (can be empty in some contexts → do not trust blindly)
      try {
        const { data, error: rpcErr } = await supabase.rpc("core_current_profile");
        if (rpcErr) throw rpcErr;
        const p = (data || null) as ProfileLite | null;
        if (p?.capo_ui_mode) return normalizeMode(p.capo_ui_mode);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[CapoEntryRouter] core_current_profile fallback failed:", e);
      }

      // Default: simple
      return "simple";
    }

    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError("");

        const finalMode = await resolveMode();
        if (!mounted) return;

        setMode(finalMode);

        // ✅ RICH: first page = ship (auto if unique) -> module selector, never rapportino directly
        if (finalMode === "rich") {
          try {
            const { data: rows, error: shipErr } = await supabase
              .from("capo_today_ship_assignments_v1")
              .select("plan_date, ship_id, ship_code, ship_name, costr, commessa, position")
              .eq("plan_date", today)
              .order("position", { ascending: true });

            if (shipErr) throw shipErr;

            const list = (Array.isArray(rows) ? rows : []) as ShipAssignment[];
            if (!mounted) return;

            if (list.length === 1 && list[0]?.ship_id) {
              nav(`/app/ship/${list[0].ship_id}`, { replace: true });
              return;
            }

            nav("/app/ship-selector", { replace: true });
            return;
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("[CapoEntryRouter] rich ship auto-open failed:", e);
            if (!mounted) return;
            nav("/app/ship-selector", { replace: true });
            return;
          }
        }

        // SIMPLE: render legacy flow below (no navigation here)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[CapoEntryRouter] load error:", e);
        if (!mounted) return;
        setError("Impossibile caricare il profilo CAPO.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [nav, today, profile, retryNonce]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">
          Caricamento…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-100">
          {error}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              // No hard refresh: just re-run the loader.
              setLoading(true);
              setError("");
              setRetryNonce((n) => n + 1);
            }}
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

  // Rich mode navigates away inside the effect
  if (mode === "rich") {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">
          Reindirizzamento…
        </div>
      </div>
    );
  }

  // Simple mode: legacy simplified flow
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">
            Caricamento…
          </div>
        </div>
      }
    >
      <CapoSimpleEntry />
    </Suspense>
  );
}

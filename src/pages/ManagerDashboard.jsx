// /src/pages/ManagerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatPct(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(v) + "%";
}

export default function ManagerDashboard({ isDark = true }) {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ships in manager perimeter (via RPC): { id, code, name, is_active }
  const [ships, setShips] = useState([]);

  const [kpi, setKpi] = useState({
    ships: 0,
    capi: 0,
    operators: 0,
    rapportini7d: 0,
    toReview: 0,
    productivity7dPct: null,
  });

  const [latestRapportini, setLatestRapportini] = useState([]);

  const shipIds = useMemo(
    () => ships.map((s) => s.id).filter(Boolean),
    [ships]
  );

  const shipCodes = useMemo(
    () => ships.map((s) => String(s?.code || "").trim()).filter(Boolean),
    [ships]
  );

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (!profile?.id) {
          setShips([]);
          setKpi({
            ships: 0,
            capi: 0,
            operators: 0,
            rapportini7d: 0,
            toReview: 0,
            productivity7dPct: null,
          });
          setLatestRapportini([]);
          return;
        }

        // 0) capi assigned to this manager (canonical)
        let capiCount = 0;
        try {
          const { data: capi, error: capiErr } = await supabase.rpc("manager_my_capi_v1");
          if (capiErr) throw capiErr;
          capiCount = Array.isArray(capi) ? capi.length : 0;
        } catch (e) {
          console.warn("[ManagerDashboard] capi rpc warning:", e);
          capiCount = 0;
        }

        // 1) ships in perimeter (CANONICAL: RPC security definer)
        const { data: perim, error: perimErr } = await supabase
          .rpc("manager_my_ships_v1")
          .abortSignal(ac.signal);

        if (perimErr) throw perimErr;

        const mappedShips = (perim || [])
          .map((r) => ({
            id: r.ship_id,
            code: r.ship_code,
            name: r.ship_name,
            is_active: r.is_active,
            assigned_at: r.assigned_at,
          }))
          .filter((s) => s.id);

        const activeFirst = [...mappedShips].sort((a, b) => {
          const aa = a?.is_active ? 0 : 1;
          const bb = b?.is_active ? 0 : 1;
          return aa - bb;
        });

        if (!alive) return;
        setShips(activeFirst);

        const ids = activeFirst.map((s) => s.id).filter(Boolean);
        const codes = activeFirst.map((s) => String(s?.code || "").trim()).filter(Boolean);

        if (ids.length === 0) {
          setKpi({
            ships: 0,
            capi: capiCount,
            operators: 0,
            rapportini7d: 0,
            toReview: 0,
            productivity7dPct: null,
          });
          setLatestRapportini([]);
          return;
        }

        // 2) operators linked to perimeter (count distinct operators)
        const { data: shipOps, error: shipOpsErr } = await supabase
          .from("ship_operators")
          .select("operator_id")
          .in("ship_id", ids)
          .abortSignal(ac.signal);

        if (shipOpsErr) throw shipOpsErr;

        const uniqOps = new Set((shipOps || []).map((r) => r.operator_id).filter(Boolean));

        // 3) rapportini last 7d in perimeter
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const sinceISO = since.toISOString().slice(0, 10);

        const { count: rapCount, error: rapCountErr } = await supabase
          .from("rapportini")
          .select("id", { count: "exact", head: true })
          .in("costr", codes)
          .gte("report_date", sinceISO)
          .abortSignal(ac.signal);

        if (rapCountErr) throw rapCountErr;

        // 4) to-review (VALIDATED_CAPO)
        const { count: toReview, error: toReviewErr } = await supabase
          .from("rapportini")
          .select("id", { count: "exact", head: true })
          .in("costr", codes)
          .eq("status", "VALIDATED_CAPO")
          .abortSignal(ac.signal);

        if (toReviewErr) throw toReviewErr;

        // 5) latest rapportini
        const { data: latest, error: latestErr } = await supabase
          .from("rapportini")
          .select("id, report_date, costr, commessa, status, capo_id, crew_role, updated_at")
          .in("costr", codes)
          .order("report_date", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(8)
          .abortSignal(ac.signal);

        if (latestErr) throw latestErr;

        // 6) KPI Produttività 7 giorni (percentuale pesata = Σ(realizzato_alloc)/Σ(previsto_eff) *100)
        // Nota: previsto_eff = previsto*(ore/8). Rollup in JS to avoid dynamic SQL.
        // Try v3 first (includes capo_id), fallback to v2.
        let productivity7dPct = null;
        try {
          const viewCandidates = ["kpi_operator_global_day_v3", "kpi_operator_global_day_v2"];
          let prodRows = null;

          for (const viewName of viewCandidates) {
            const { data, error } = await supabase
              .from(viewName)
              .select("total_previsto_eff, total_prodotto_alloc")
              .eq("manager_id", profile.id)
              .gte("report_date", sinceISO)
              .abortSignal(ac.signal);

            if (!error) {
              prodRows = Array.isArray(data) ? data : [];
              break;
            }

            // 42P01 = undefined_table (view doesn't exist)
            if (String(error?.code || "") !== "42P01") throw error;
          }

          const sumPrev = (prodRows || []).reduce((a, r) => a + toNumber(r.total_previsto_eff), 0);
          const sumProd = (prodRows || []).reduce((a, r) => a + toNumber(r.total_prodotto_alloc), 0);
          productivity7dPct = sumPrev > 0 ? (sumProd / sumPrev) * 100 : null;
        } catch (e) {
          console.warn("[ManagerDashboard] productivity KPI warning:", e);
          productivity7dPct = null;
        }

        if (!alive) return;

        setKpi({
          ships: ids.length,
          capi: capiCount,
          operators: uniqOps.size,
          rapportini7d: Number(rapCount || 0),
          toReview: Number(toReview || 0),
          productivity7dPct,
        });

        setLatestRapportini(Array.isArray(latest) ? latest : []);
      } catch (e) {
        console.error("[ManagerDashboard] load error:", e);
        if (!alive) return;
        setError(e?.message || "Errore caricamento dashboard Manager.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [profile?.id]);

  const cardBase = cn(
    "rounded-2xl border p-3 sm:p-4",
    isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"
  );

  return (
    <div className="space-y-4">
      <header className="px-3 sm:px-4 pt-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          Supervisione cantieri
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-100">Dashboard Manager</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          KPI reali letti da Supabase (perimetro manager, capi, rapportini, squadre). Nessun dato demo.
        </p>
      </header>

      {error ? (
        <div className="px-3 sm:px-4">
          <div className="rounded-2xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        </div>
      ) : null}

      <section className="px-3 sm:px-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className={cn(cardBase, "border-emerald-500/30")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">Cantieri</div>
          <div className="text-2xl font-semibold text-slate-50 mt-1">{loading ? "—" : kpi.ships}</div>
          <div className="text-[10px] text-slate-400 mt-1">Nel perimetro Manager</div>
        </div>

        <div className={cn(cardBase, "border-sky-500/30")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-sky-300">Capi</div>
          <div className="text-2xl font-semibold text-slate-50 mt-1">{loading ? "—" : kpi.capi}</div>
          <div className="text-[10px] text-slate-400 mt-1">Assegnati al Manager (RPC)</div>
        </div>

        <div className={cn(cardBase, "border-violet-500/30")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-violet-300">Operai</div>
          <div className="text-2xl font-semibold text-slate-50 mt-1">{loading ? "—" : kpi.operators}</div>
          <div className="text-[10px] text-slate-400 mt-1">Distinct (ship_operators)</div>
        </div>

        <div className={cn(cardBase, "border-amber-500/30")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-amber-300">Rapportini (7g)</div>
          <div className="text-2xl font-semibold text-slate-50 mt-1">{loading ? "—" : kpi.rapportini7d}</div>
          <div className="text-[10px] text-slate-400 mt-1">Ultimi 7 giorni</div>
        </div>

        <div className={cn(cardBase, "border-rose-500/30")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-rose-300">Da verificare</div>
          <div className="text-2xl font-semibold text-slate-50 mt-1">{loading ? "—" : kpi.toReview}</div>
          <div className="text-[10px] text-slate-400 mt-1">Status: VALIDATED_CAPO</div>
        </div>

        <div className={cn(cardBase, "border-fuchsia-500/30")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-fuchsia-300">Produttività (7g)</div>
          <div className="text-2xl font-semibold text-slate-50 mt-1">
            {loading ? "—" : formatPct(kpi.productivity7dPct)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Indice = prodotto/previsto</div>
        </div>
      </section>

      <section className="px-3 sm:px-4">
        <div className={cardBase}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Perimetro</div>
              <div className="text-sm font-medium text-slate-100">Cantieri assegnati</div>
              <div className="text-xs text-slate-400 mt-1">
                Lista dei cantieri assegnati al Manager corrente (source: RPC manager_my_ships_v1).
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {(ships || []).slice(0, 8).map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                <div className="text-sm font-medium text-slate-100">
                  {s.code || "—"} <span className="text-slate-500">·</span> {s.name || "Cantiere"}
                </div>
                <div className="text-[11px] text-slate-500">Ship ID: {s.id}</div>
              </div>
            ))}

            {!loading && ships.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3">
                <div className="text-sm font-medium text-slate-100">Nessun perimetro</div>
                <div className="text-xs text-slate-400 mt-1">Serve assegnazione in ship_managers (ADMIN).</div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-3 sm:px-4 pb-4">
        <div className={cardBase}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Ultimi rapportini</div>
          <div className="text-sm font-medium text-slate-100">Controllo rapido</div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <th className="text-left py-2 pr-3">Data</th>
                  <th className="text-left py-2 pr-3">Cantiere</th>
                  <th className="text-left py-2 pr-3">Commessa</th>
                  <th className="text-left py-2 pr-3">Crew</th>
                  <th className="text-left py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(latestRapportini || []).map((r) => (
                  <tr key={r.id} className="border-t border-slate-800/70">
                    <td className="py-2 pr-3 text-slate-100">{formatDate(r.report_date)}</td>
                    <td className="py-2 pr-3 text-slate-200">{r.costr || "—"}</td>
                    <td className="py-2 pr-3 text-slate-400">{r.commessa || "—"}</td>
                    <td className="py-2 pr-3 text-slate-400">{r.crew_role || "—"}</td>
                    <td className="py-2 pr-3 text-slate-200">{r.status || "—"}</td>
                  </tr>
                ))}

                {!loading && latestRapportini.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-xs text-slate-500">
                      Nessun rapportino nel perimetro (oppure RLS/filtri non consentono la lettura).
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

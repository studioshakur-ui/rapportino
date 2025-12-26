// src/pages/ManagerAnalytics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
}

export default function ManagerAnalytics({ isDark = true }) {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ships, setShips] = useState([]); // {id, code, name}
  const [opsByShip, setOpsByShip] = useState(new Map());
  const [rapportiniSample, setRapportiniSample] = useState([]); // last N

  const shipIds = useMemo(() => ships.map((s) => s.id).filter(Boolean), [ships]);
  const shipCodes = useMemo(() => ships.map((s) => String(s.code || "").trim()).filter(Boolean), [ships]);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (!profile?.id) {
          setShips([]);
          setOpsByShip(new Map());
          setRapportiniSample([]);
          return;
        }

        // 1) Ships in perimeter
        const { data: smRows, error: smErr } = await supabase
          .from("ship_managers")
          .select("ship_id, ships:ships(id, code, name)")
          .eq("manager_id", profile.id)
          .abortSignal(ac.signal);
        if (smErr) throw smErr;

        const shipList = (smRows || []).map((r) => r.ships).filter(Boolean);
        setShips(shipList);

        const ids = shipList.map((s) => s.id).filter(Boolean);
        const codes = shipList.map((s) => String(s.code || "").trim()).filter(Boolean);

        // 2) Operators per ship (ship_operators -> operators)
        const opsMap = new Map();
        if (ids.length > 0) {
          const { data: soRows, error: soErr } = await supabase
            .from("ship_operators")
            .select("ship_id, active, operators:operators(id,name,roles)")
            .in("ship_id", ids)
            .abortSignal(ac.signal);

          if (soErr) throw soErr;

          for (const r of soRows || []) {
            const sid = r.ship_id;
            const op = r.operators;
            if (!sid || !op?.id) continue;
            const bucket = opsMap.get(sid) || [];
            bucket.push({
              id: op.id,
              name: op.name,
              roles: Array.isArray(op.roles) ? op.roles : [],
              active: !!r.active,
            });
            opsMap.set(sid, bucket);
          }
        }
        setOpsByShip(opsMap);

        // 3) Rapportini sample (best-effort). Note: rapportini uses costr/commessa, not ship_id.
        // We match by costr IN shipCodes.
        if (codes.length > 0) {
          const { data: rapRows, error: rapErr } = await supabase
            .from("rapportini")
            .select("id, report_date, costr, commessa, crew_role, status")
            .in("costr", codes)
            .order("report_date", { ascending: false })
            .limit(200)
            .abortSignal(ac.signal);

          if (rapErr) throw rapErr;
          setRapportiniSample(rapRows || []);
        } else {
          setRapportiniSample([]);
        }
      } catch (err) {
        console.error("[ManagerAnalytics] load error:", err);
        setError(err?.message || "Errore caricamento analytics.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
      ac.abort();
    };
  }, [profile?.id]);

  const perShipStats = useMemo(() => {
    const rows = [];
    const rapByCantiere = new Map();

    for (const r of rapportiniSample || []) {
      const code = String(r.costr || "").trim();
      if (!code) continue;
      const bucket = rapByCantiere.get(code) || [];
      bucket.push(r);
      rapByCantiere.set(code, bucket);
    }

    for (const s of ships || []) {
      const code = String(s.code || "").trim();
      const ops = opsByShip.get(s.id) || [];
      const rap = rapByCantiere.get(code) || [];

      const statusCounts = { DRAFT: 0, VALIDATED_CAPO: 0, RETURNED: 0, APPROVED_UFFICIO: 0, OTHER: 0 };
      let lastDate = null;

      for (const r of rap) {
        const st = String(r.status || "").trim();
        if (st && statusCounts[st] !== undefined) statusCounts[st] += 1;
        else statusCounts.OTHER += 1;
        if (!lastDate && r.report_date) lastDate = r.report_date;
      }

      rows.push({
        ship_id: s.id,
        code: code || "—",
        name: s.name || "",
        operators_total: ops.length,
        operators_active: ops.filter((o) => o.active).length,
        rapportini_sample: rap.length,
        last_report_date: lastDate,
        statusCounts,
      });
    }

    rows.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    return rows;
  }, [ships, opsByShip, rapportiniSample]);

  const panel = "rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4";

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          Analytics operativo
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-100">Perimetro Manager</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Dati reali (best-effort) nel perimetro del Manager: cantieri assegnati, operai collegati, ultimi rapportini.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      <section className={panel}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Cantieri</div>
            <div className="text-sm font-medium text-slate-100">Stato sintetico</div>
            <div className="text-xs text-slate-400 mt-1">
              Nota: per i rapportini, l'associazione al cantiere avviene tramite <span className="text-slate-200">costr</span>.
            </div>
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            <div className="uppercase tracking-[0.18em] text-slate-600">Totale</div>
            <div className="text-slate-200">{ships.length}</div>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                <th className="text-left py-2 pr-3">Cantiere</th>
                <th className="text-left py-2 pr-3">Operai</th>
                <th className="text-left py-2 pr-3">Rapportini</th>
                <th className="text-left py-2 pr-3">Ultimo</th>
                <th className="text-left py-2 pr-3">Da verificare</th>
              </tr>
            </thead>
            <tbody>
              {perShipStats.map((r) => (
                <tr key={r.ship_id} className="border-t border-slate-800/70">
                  <td className="py-2 pr-3 text-slate-100">
                    {r.code}
                    {r.name ? <span className="text-slate-500"> · {r.name}</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-slate-200">
                    {r.operators_active}/{r.operators_total}
                    <span className="text-slate-500"> attivi</span>
                  </td>
                  <td className="py-2 pr-3 text-slate-400">{r.rapportini_sample}</td>
                  <td className="py-2 pr-3 text-slate-400">{fmtDate(r.last_report_date)}</td>
                  <td className="py-2 pr-3 text-slate-200">
                    {r.statusCounts.VALIDATED_CAPO + r.statusCounts.RETURNED}
                    <span className="text-slate-500"> (VALIDATED + RETURNED)</span>
                  </td>
                </tr>
              ))}

              {!loading && perShipStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3 text-xs text-slate-500">
                    Nessun dato nel perimetro (oppure RLS non consente la lettura).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cn(panel, "text-xs text-slate-400")}> 
        <div className="text-slate-200 font-medium mb-1">Nota su CAPO</div>
        <div>
          In questo ZIP, il modulo Manager gestisce solo: <span className="text-slate-200">perimetro cantieri</span> e <span className="text-slate-200">squadre (operai)</span>.
          La creazione account/ruoli e l'abilitazione di nuovi CAPO resta responsabilità di <span className="text-slate-200">ADMIN</span>.
        </div>
      </section>
    </div>
  );
}

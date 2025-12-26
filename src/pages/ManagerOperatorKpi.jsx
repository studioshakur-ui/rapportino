// src/pages/ManagerOperatorKpi.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ManagerOperatorKpi({ isDark = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("kpi_operatori_day_v1")
        .select("*")
        .order("productivity_index", {
          ascending: false,
          nullsFirst: false,
        });

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows(data || []);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Manager
        </div>
        <h2 className="text-lg font-semibold">
          KPI Operatori · Produttività Giornaliera
        </h2>
      </div>

      {loading ? (
        <div className="text-slate-400">Caricamento…</div>
      ) : error ? (
        <div className="text-rose-400">{error}</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2">Operatore</th>
                <th className="text-right">Ore</th>
                <th className="text-right">Prodotto alloc.</th>
                <th className="text-right">Indice</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-slate-500"
                  >
                    Nessun dato disponibile
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={`${r.report_date}-${r.operator_id}`}
                    className="border-b border-slate-900"
                  >
                    <td className="py-2">
                      <div className="font-medium">
                        {r.operator_id}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {r.ship_name || "—"}
                      </div>
                    </td>
                    <td className="text-right">
                      {r.total_hours?.toFixed(2) ?? "—"}
                    </td>
                    <td className="text-right">
                      {r.total_prodotto_alloc?.toFixed(2) ?? "—"}
                    </td>
                    <td className="text-right font-semibold">
                      {r.productivity_index != null
                        ? r.productivity_index.toFixed(2)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

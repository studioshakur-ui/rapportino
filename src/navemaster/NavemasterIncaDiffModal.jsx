import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { cardSurface, corePills } from "../ui/designSystem";

export default function NavemasterIncaDiffModal({ open, onClose, shipId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !shipId) return;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("navemaster_inca_diff")
        .select("*")
        .eq("ship_id", shipId)
        .order("created_at", { ascending: false });

      setRows(data || []);
      setLoading(false);
    }

    load();
  }, [open, shipId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full max-w-5xl rounded-2xl border border-slate-800 bg-[#050910] ${cardSurface}`}>
        <div className="p-4 border-b border-slate-800 flex justify-between">
          <div>
            <div className={corePills.kicker}>INCA · IMPACT</div>
            <h2 className="text-lg font-semibold text-slate-100">
              Modifications du dernier import INCA
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            Fermer
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[70vh]">
          {loading ? (
            <div className="text-slate-400">Chargement…</div>
          ) : rows.length === 0 ? (
            <div className="text-slate-400">Aucune modification détectée.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="text-left py-2">Câble</th>
                  <th>NAV</th>
                  <th>INCA avant</th>
                  <th>INCA après</th>
                  <th>Gravité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-medium text-slate-100">{r.marcacavo}</td>
                    <td>{r.nav_status ?? "—"}</td>
                    <td>{r.inca_status_prev ?? "—"}</td>
                    <td>{r.inca_status_new ?? "—"}</td>
                    <td>
                      <span
                        className={
                          r.severity === "CRITICAL"
                            ? "text-rose-400"
                            : r.severity === "MAJOR"
                            ? "text-amber-400"
                            : "text-slate-300"
                        }
                      >
                        {r.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

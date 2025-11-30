
// src/inca/IncaCaviTable.jsx
// Tableau des câbles INCA pour un fichier donné.
import React, { useEffect, useState } from "react";
import { listIncaCavi } from "./incaApi";

export default function IncaCaviTable({
  fileId,
  costr,
  commessa,
  onSelectCavo,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!fileId && !costr && !commessa) {
        setRows([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await listIncaCavi({
          fileId,
          costr,
          commessa,
          search,
        });
        if (!active) return;
        setRows(data);
      } catch (err) {
        console.error("Errore caricamento cavi INCA:", err);
        if (!active) return;
        setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [fileId, costr, commessa, search]);

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white text-xs">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div>
          <div className="text-[11px] font-semibold text-slate-700">
            Cavi INCA
          </div>
          <div className="text-[10px] text-slate-500">
            Seleziona un cavo per collegarlo ad un rapportino o per vedere il percorso.
          </div>
        </div>
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Cerca per codice / descrizione…"
          />
        </div>
      </div>

      {loading && (
        <div className="text-[11px] text-slate-500">Caricamento…</div>
      )}

      {error && (
        <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
          Errore: {error.message || String(error)}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="text-[11px] text-slate-500">
          Nessun cavo trovato con questi filtri.
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="mt-2 max-h-72 overflow-y-auto border border-slate-200 rounded">
          <table className="w-full border-collapse text-[11px]">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-2 py-1 text-left">Codice</th>
                <th className="px-2 py-1 text-left">Descrizione</th>
                <th className="px-2 py-1 text-left">Impianto</th>
                <th className="px-2 py-1 text-right">Mt. TEO</th>
                <th className="px-2 py-1 text-right">Mt. DIS</th>
                <th className="px-2 py-1 text-right">Mt. SIT</th>
                <th className="px-2 py-1 text-left">Zona</th>
                <th className="px-2 py-1 text-left">Azione</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-2 py-1 align-top font-mono">
                    {r.codice}
                  </td>
                  <td className="px-2 py-1 align-top">
                    {r.descrizione || "-"}
                  </td>
                  <td className="px-2 py-1 align-top">
                    {r.impianto || "-"}
                  </td>
                  <td className="px-2 py-1 align-top text-right">
                    {formatNum(r.metri_teo)}
                  </td>
                  <td className="px-2 py-1 align-top text-right">
                    {formatNum(r.metri_dis)}
                  </td>
                  <td className="px-2 py-1 align-top text-right">
                    {formatNum(r.metri_sit_cavo ?? r.metri_sit_tec)}
                  </td>
                  <td className="px-2 py-1 align-top">
                    {r.zona_da || "-"} → {r.zona_a || "-"}
                  </td>
                  <td className="px-2 py-1 align-top">
                    <button
                      type="button"
                      onClick={() => onSelectCavo && onSelectCavo(r)}
                      className="px-2 py-0.5 rounded border border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                    >
                      Usa cavo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatNum(v) {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return n.toFixed(2);
}

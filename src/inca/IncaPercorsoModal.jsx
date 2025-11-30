
// src/inca/IncaPercorsoModal.jsx
// Modale pour visualiser le Percorso d'un câble INCA.
import React, { useEffect, useState } from "react";
import { getIncaCavoWithPath } from "./incaApi";

export default function IncaPercorsoModal({ open, cavoId, onClose }) {
  const [cavo, setCavo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!open || !cavoId) {
        setCavo(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getIncaCavoWithPath(cavoId);
        if (!active) return;
        setCavo(data);
      } catch (err) {
        console.error("Errore caricamento percorso INCA:", err);
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
  }, [open, cavoId]);

  if (!open) return null;

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Percorso INCA
            </h2>
            {cavo && (
              <div className="text-xs text-slate-600 mt-0.5">
                Cavo{" "}
                <span className="font-mono font-semibold">
                  {cavo.codice}
                </span>{" "}
                · {cavo.descrizione || "—"}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-800 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-sm text-slate-500">Caricamento…</div>
          )}

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
              Errore: {error.message || String(error)}
            </div>
          )}

          {!loading && !error && cavo && (
            <div className="space-y-3 text-xs">
              <div className="border border-slate-200 rounded p-2 bg-slate-50">
                <div>
                  <span className="font-semibold">Nave:</span>{" "}
                  {cavo.costr || "-"}
                </div>
                <div>
                  <span className="font-semibold">Commessa:</span>{" "}
                  {cavo.commessa || "-"}
                </div>
                <div>
                  <span className="font-semibold">Impianto:</span>{" "}
                  {cavo.impianto || "-"}
                </div>
                <div>
                  <span className="font-semibold">Tipo:</span>{" "}
                  {cavo.tipo || "-"}
                </div>
                <div>
                  <span className="font-semibold">Sezione:</span>{" "}
                  {cavo.sezione || "-"}
                </div>
                <div>
                  <span className="font-semibold">Lunghezze:</span>{" "}
                  TEO {formatNum(cavo.metri_teo)} · DIS {formatNum(cavo.metri_dis)} ·
                  SIT {formatNum(cavo.metri_sit_cavo ?? cavo.metri_sit_tec)}
                </div>
                <div>
                  <span className="font-semibold">Zona:</span>{" "}
                  {cavo.zona_da || "-"} → {cavo.zona_a || "-"}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-700 mb-1">
                  Supporti del percorso
                </div>
                {Array.isArray(cavo.percorso_supports) &&
                cavo.percorso_supports.length > 0 ? (
                  <div className="border border-slate-200 rounded max-h-52 overflow-y-auto">
                    <table className="w-full text-[11px] border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="px-2 py-1 text-left w-14">Ord.</th>
                          <th className="px-2 py-1 text-left">Codice supporto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cavo.percorso_supports.map((code, idx) => (
                          <tr
                            key={`${code}-${idx}`}
                            className="border-t border-slate-100"
                          >
                            <td className="px-2 py-1 align-top">
                              {idx + 1}
                            </td>
                            <td className="px-2 py-1 align-top font-mono">
                              {code}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">
                    Nessun percorso registrato per questo cavo (nessun dato in inca_percorsi).
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && !cavo && (
            <div className="text-sm text-slate-500">
              Nessun dato percorso disponibile.
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

function formatNum(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

// src/components/coreDrive/CoreDriveEventsPanel.jsx
import React, { useEffect, useState } from "react";
import { listCoreDriveEvents } from "../../services/coreDrive.api";

function fmt(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("it-IT");
}

export default function CoreDriveEventsPanel({ fileId }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!fileId) {
        setRows([]);
        return;
      }
      setLoading(true);
      setErr(null);
      try {
        const data = await listCoreDriveEvents(fileId, 200);
        if (!mounted) return;
        setRows(data);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Errore caricamento eventi");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [fileId]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/30 overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Eventi (append-only)
        </div>
        <div className="text-xs text-slate-400">
          Registro canonico CORE Drive
        </div>
      </div>

      <div className="p-3 space-y-2 max-h-[360px] overflow-auto">
        {loading && <div className="text-xs text-slate-500">Caricamento…</div>}
        {err && (
          <div className="text-xs text-rose-200 bg-rose-950/30 border border-rose-700/40 rounded-lg p-2">
            {err}
          </div>
        )}
        {!loading && !err && rows.length === 0 && (
          <div className="text-xs text-slate-500">Nessun evento.</div>
        )}

        {!loading && !err && rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-slate-800 bg-slate-950/40 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-200">
                    {ev.event_type}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {fmt(ev.created_at)}
                  </div>
                </div>

                {ev.note ? (
                  <div className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">
                    {ev.note}
                  </div>
                ) : null}

                {ev.payload && Object.keys(ev.payload).length > 0 ? (
                  <details className="mt-2">
                    <summary className="text-[11px] text-slate-500 cursor-pointer select-none">
                      payload
                    </summary>
                    <pre className="mt-2 text-[11px] leading-snug text-slate-200 bg-black/30 rounded-lg p-2 overflow-auto">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

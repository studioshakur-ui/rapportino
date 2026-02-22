// src/navemaster/NavemasterIncaDiffModal.tsx
import { useEffect, useMemo, useState } from "react";

type IconProps = { className?: string };

function IconClock({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconX({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

import { supabase } from "../lib/supabaseClient";

type ShipLite = {
  id: string;
  code: string | null;
  name: string | null;
  costr: string | null;
  commessa: string | null;
};

type DiffRow = {
  id: string;
  ship_id: string;
  costr: string;
  commessa: string;
  codice: string;
  diff_type: string;
  inca_value: any;
  core_value: any;
  created_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  ship: ShipLite | null;
};

export function NavemasterIncaDiffModal(props: Props): JSX.Element | null {
  const { open, onClose, ship } = props;
  const shipId = ship?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DiffRow[]>([]);

  useEffect(() => {
    if (!open || !shipId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from("navemaster_inca_diff")
          .select("id, ship_id, costr, commessa, codice, diff_type, inca_value, core_value, created_at")
          .eq("ship_id", shipId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (qErr) throw qErr;
        if (!mounted) return;
        setRows((data as DiffRow[]) ?? []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Unable to load diff");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, shipId]);

  const title = useMemo(() => {
    const c = ship?.code ?? "—";
    const n = ship?.name ?? "Nave";
    return `${c} · ${n}`;
  }, [ship?.code, ship?.name]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-6">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">NAVEMASTER · Diff INCA</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{title}</div>
            <div className="mt-1 text-sm text-slate-400">
              Differenze rilevate tra baseline INCA e prove CORE.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            <IconX /> Chiudi
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-300">
              <IconClock /> Caricamento…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-sm text-slate-300">
              Nessuna riga diff.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/40 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Creato</th>
                    <th className="px-3 py-2 text-left">Codice</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">INCA</th>
                    <th className="px-3 py-2 text-left">CORE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((r) => (
                    <tr key={r.id} className="bg-slate-950/40 text-slate-200">
                      <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-mono">{r.codice}</td>
                      <td className="px-3 py-2">{r.diff_type}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{JSON.stringify(r.inca_value)}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{JSON.stringify(r.core_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

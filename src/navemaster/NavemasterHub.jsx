import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import NavemasterImportModal from "./NavemasterImportModal";
import { corePills } from "../ui/designSystem";

function Tile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <div className={corePills.kicker}>{label}</div>
      <div className="text-2xl font-semibold mt-1 text-slate-100">{value ?? "—"}</div>
      {hint ? <div className="text-xs text-slate-400 mt-1">{hint}</div> : null}
    </div>
  );
}

export default function NavemasterHub() {
  const [ships, setShips] = useState([]);
  const [shipId, setShipId] = useState("");
  const [loadingShips, setLoadingShips] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [importMeta, setImportMeta] = useState(null);
  const [error, setError] = useState(null);

  const [importOpen, setImportOpen] = useState(false);

  const currentShip = useMemo(() => ships.find((s) => s.id === shipId) || null, [ships, shipId]);

  async function loadShips() {
    setLoadingShips(true);
    try {
      const { data, error } = await supabase
        .from("ships")
        .select("id, code, name, costr, commessa")
        .order("code", { ascending: true });

      if (error) throw error;
      setShips(data || []);
      if (!shipId && data?.[0]?.id) setShipId(data[0].id);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoadingShips(false);
    }
  }

  async function loadNavemaster() {
    if (!shipId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: imp, error: impErr } = await supabase
        .from("navemaster_latest_import_v1")
        .select("id, ship_id, costr, commessa, file_name, imported_at")
        .eq("ship_id", shipId)
        .maybeSingle();

      if (impErr) throw impErr;
      setImportMeta(imp || null);

      const { data: rowsData, error: rowsErr } = await supabase
        .from("navemaster_live_v1")
        .select("navemaster_row_id, marcacavo, descrizione, stato_cavo, situazione_cavo_conit, livello, sezione, tipologia, zona_da, zona_a, impianto, inca_cavo_id, situazione_inca")
        .eq("ship_id", shipId)
        .order("marcacavo", { ascending: true })
        .limit(5000);

      if (rowsErr) throw rowsErr;
      setRows(rowsData || []);
    } catch (e) {
      setError(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadShips(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadNavemaster(); }, [shipId]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = useMemo(() => {
    const total = rows.length;
    const withInca = rows.filter((r) => !!r.inca_cavo_id).length;
    const npInca = total - withInca;

    const topBy = (key) => {
      const m = new Map();
      for (const r of rows) {
        const v = String(r?.[key] ?? "").trim() || "—";
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      const top = Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0];
      return top ? `${top[0]} (${top[1]})` : "—";
    };

    return {
      total,
      withInca,
      npInca,
      topStato: topBy("stato_cavo"),
      topSit: topBy("situazione_cavo_conit"),
    };
  }, [rows]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <div className={corePills.kicker}>UFFICIO/DIREZIONE · NAVEMASTER</div>
          <div className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">NAVEMASTER Cockpit</div>
          <div className="text-xs text-slate-400 mt-1">Snapshot NAVEMASTER actif par navire, comparaison INCA (NP/OK).</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadNavemaster()}
            className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-full border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200 hover:bg-emerald-900/20"
            disabled={!shipId}
          >
            Import
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block sm:col-span-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">Navire</div>
            <select
              value={shipId}
              onChange={(e) => setShipId(e.target.value)}
              disabled={loadingShips}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {ships.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Snapshot actif</div>
            <div className="mt-1 text-sm text-slate-200">
              {importMeta?.imported_at ? new Date(importMeta.imported_at).toLocaleString("it-IT") : "Aucun"}
            </div>
            <div className="text-xs text-slate-500 mt-1">{importMeta?.file_name || "—"}</div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-200">
          <div className="text-xs uppercase tracking-[0.18em]">Erreur</div>
          <div className="mt-1 text-sm">{error}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <Tile label="Cavi NAVEMASTER" value={kpi.total} />
        <Tile label="INCA match" value={kpi.withInca} hint="inca_cavi.codice = marcacavo" />
        <Tile label="INCA NP" value={kpi.npInca} hint="sans correspondance INCA" />
        <Tile label="Top STATO" value={kpi.topStato} />
        <Tile label="Top SITUAZIONE" value={kpi.topSit} />
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-800">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-slate-950/50 text-slate-300">
            <tr className="text-[11px] uppercase tracking-[0.18em]">
              <th className="px-3 py-2 text-left">MARCACAVO</th>
              <th className="px-3 py-2 text-left">DESCRIZIONE</th>
              <th className="px-3 py-2 text-left">STATO</th>
              <th className="px-3 py-2 text-left">SIT. CONIT</th>
              <th className="px-3 py-2 text-left">LIVELLO</th>
              <th className="px-3 py-2 text-left">SEZIONE</th>
              <th className="px-3 py-2 text-left">INCA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(rows || []).slice(0, 500).map((r) => (
              <tr key={r.navemaster_row_id} className="hover:bg-slate-950/30">
                <td className="px-3 py-2 font-medium text-slate-100">{r.marcacavo || "—"}</td>
                <td className="px-3 py-2 text-slate-200">{r.descrizione || "—"}</td>
                <td className="px-3 py-2 text-slate-200">{r.stato_cavo || "—"}</td>
                <td className="px-3 py-2 text-slate-200">{r.situazione_cavo_conit || "—"}</td>
                <td className="px-3 py-2 text-slate-200">{r.livello || "—"}</td>
                <td className="px-3 py-2 text-slate-200">{r.sezione || "—"}</td>
                <td className="px-3 py-2 text-slate-300">
                  {r.inca_cavo_id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-[12px]">{r.situazione_inca || "OK"}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-600" />
                      <span className="text-[12px]">NP</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length > 500 ? (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-xs text-slate-400">
                  Limite UI: 500 lignes affichées. On ajoutera virtualisation ensuite.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <NavemasterImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        ship={currentShip}
        onImported={() => {
          setImportOpen(false);
          loadNavemaster();
        }}
      />
    </div>
  );
}

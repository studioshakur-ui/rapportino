// /src/navemaster/NavemasterHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import NavemasterImportModal from "./NavemasterImportModal";
import NavemasterCockpitModal from "../components/NavemasterCockpitModal";
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

function RoleDenied({ role }) {
  return (
    <div className="p-4 sm:p-6">
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 text-rose-200">
        <div className="text-xs uppercase tracking-[0.18em]">Accès refusé</div>
        <div className="mt-1 text-sm">
          Ce cockpit NAVEMASTER est réservé à <span className="text-rose-100">UFFICIO</span> et{" "}
          <span className="text-rose-100">DIREZIONE</span> (et ADMIN).
        </div>
        <div className="mt-2 text-xs text-rose-200/80">
          Rôle actuel: <span className="font-medium">{role || "—"}</span>
        </div>
      </div>
    </div>
  );
}

export default function NavemasterHub() {
  const [searchParams] = useSearchParams();
  const qpShipId = String(searchParams.get("shipId") || "").trim();
  const qpOpenCockpit = String(searchParams.get("openCockpit") || "").trim() === "1";
  const qpIncaFileId = String(searchParams.get("incaFileId") || "").trim();

  const didAutoOpenRef = useRef(false);
  const loadAbortRef = useRef(null);
  const loadInfo = useMemo(() => ({ pageSize: 1000, maxPages: 300 }), []);

  const [launchInca, setLaunchInca] = useState(null);
  const [launchIncaError, setLaunchIncaError] = useState(null);

  // Role guard
  const [roleLoading, setRoleLoading] = useState(true);
  const [role, setRole] = useState(null);
  const allowed = role === "UFFICIO" || role === "DIREZIONE" || role === "ADMIN";

  const [ships, setShips] = useState([]);
  const [shipId, setShipId] = useState("");
  const [loadingShips, setLoadingShips] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [importMeta, setImportMeta] = useState(null);
  const [error, setError] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [cockpitOpen, setCockpitOpen] = useState(false);
  const [reopenCockpitAfterImport, setReopenCockpitAfterImport] = useState(false);

  const currentShip = useMemo(
    () => ships.find((s) => s.id === shipId) || null,
    [ships, shipId]
  );

  async function loadRole() {
    setRoleLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) {
        setRole(null);
        return;
      }
      const res = await supabase
        .from("profiles")
        .select("app_role")
        .eq("id", userId)
        .maybeSingle();

      if (res.error) throw res.error;
      setRole(res.data?.app_role || null);
    } catch (e) {
      setRole(null);
      setError(e?.message || String(e));
    } finally {
      setRoleLoading(false);
    }
  }

  async function loadShips() {
    setLoadingShips(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from("ships")
        .select("id, code, name, costr, commessa, is_active")
        .order("code", { ascending: true });

      if (qErr) throw qErr;

      const list = (data || []).filter((s) => s?.is_active !== false);
      setShips(list);

      // URL deep-link: /ufficio/navemaster?shipId=... (prefer it if visible)
      if (qpShipId && list.some((s) => s.id === qpShipId)) {
        setShipId(qpShipId);
      } else if (!shipId && list?.[0]?.id) {
        setShipId(list[0].id);
      }
    } catch (e) {
      setError(e?.message || String(e));
      setShips([]);
      setShipId("");
    } finally {
      setLoadingShips(false);
    }
  }

  async function loadNavemaster(activeShipId) {
    const sid = activeShipId || shipId;
    if (!sid) return;

    // Cancel any in-flight load (naval-grade: no races, no stale state)
    try {
      if (loadAbortRef.current) loadAbortRef.current.abort();
    } catch {
      // ignore
    }
    const ac = new AbortController();
    loadAbortRef.current = ac;

    setLoading(true);
    setError(null);

    try {
      const { data: imp, error: impErr } = await supabase
        .from("navemaster_latest_import_v1")
        .select("id, ship_id, costr, commessa, file_name, imported_at")
        .eq("ship_id", sid)
        .maybeSingle()
        .abortSignal(ac.signal);

      if (impErr) throw impErr;
      setImportMeta(imp || null);

      // Batched loading with .range() (no 1000 ceiling)
      const all = [];
      let page = 0;

      while (page < loadInfo.maxPages) {
        const from = page * loadInfo.pageSize;
        const to = from + loadInfo.pageSize - 1;

        const { data, error: rowsErr } = await supabase
          .from("navemaster_live_v1")
          .select(
            [
              "navemaster_row_id",
              "marcacavo",
              "descrizione",
              "stato_cavo",
              "situazione_cavo_conit",
              "livello",
              "sezione",
              "tipologia",
              "zona_da",
              "zona_a",
              "impianto",
              "inca_cavo_id",
              "situazione_inca",
            ].join(",")
          )
          .eq("ship_id", sid)
          .order("marcacavo", { ascending: true })
          .range(from, to)
          .abortSignal(ac.signal);

        if (rowsErr) throw rowsErr;

        const chunk = Array.isArray(data) ? data : [];
        all.push(...chunk);

        if (chunk.length == 0) break;
        if (chunk.length < loadInfo.pageSize) break;

        page++;
      }

      setRows(all);
    } catch (e) {
      // Ignore aborts as a normal control flow
      if (String(e?.name || "") === "AbortError") return;

      setError(e?.message || String(e));
      setRows([]);
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    }
  }

  useEffect(() => {
    loadRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional deep-link context: show which INCA file triggered the NAVEMASTER cockpit.
  useEffect(() => {
    let alive = true;

    async function loadLaunchInca() {
      setLaunchIncaError(null);
      setLaunchInca(null);

      if (!qpIncaFileId) return;

      try {
        const { data, error: e } = await supabase
          .from("inca_files")
          .select("id, file_name, uploaded_at, costr, commessa")
          .eq("id", qpIncaFileId)
          .maybeSingle();

        if (e) throw e;
        if (!alive) return;
        setLaunchInca(data || null);
      } catch (err) {
        if (!alive) return;
        setLaunchIncaError(err?.message || String(err));
      }
    }

    loadLaunchInca();
    return () => {
      alive = false;
    };
  }, [qpIncaFileId]);

  useEffect(() => {
    if (!roleLoading && allowed) loadShips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading, allowed]);

  useEffect(() => {
    if (!roleLoading && allowed) loadNavemaster(shipId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, roleLoading, allowed]);

  // URL deep-link behavior: auto-open the giant cockpit modal.
  useEffect(() => {
    if (!qpOpenCockpit) return;
    if (roleLoading || !allowed) return;
    if (!shipId) return;
    if (!hasLoadedOnce) return;
    if (didAutoOpenRef.current) return;

    didAutoOpenRef.current = true;
    setCockpitOpen(true);
  }, [qpOpenCockpit, roleLoading, allowed, shipId, hasLoadedOnce]);

  const kpi = useMemo(() => {
    const total = rows.length;
    const withInca = rows.reduce((acc, r) => acc + (r?.inca_cavo_id ? 1 : 0), 0);
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

  if (roleLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-5">
          <div className={corePills.kicker}>UFFICIO/DIREZIONE · NAVEMASTER</div>
          <div className="mt-2 text-sm text-slate-300">Chargement du profil…</div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return <RoleDenied role={role} />;
  }

  const noShips = !loadingShips && ships.length === 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <div className={corePills.kicker}>UFFICIO/DIREZIONE · NAVEMASTER</div>
          <div className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            NAVEMASTER Cockpit
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Snapshot NAVEMASTER actif par navire, comparaison INCA (NP/OK).
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toujours présent: bouton cockpit -> popup géant */}
          <button
            type="button"
            onClick={() => setCockpitOpen(true)}
            className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950/20 disabled:text-slate-600"
            disabled={!shipId || noShips}
            title={noShips ? "Aucun navire visible. Vérifiez RLS/policies ships." : ""}
          >
            Cockpit
          </button>

          <button
            type="button"
            onClick={() => loadNavemaster()}
            className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950/20 disabled:text-slate-600"
            disabled={!shipId}
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setReopenCockpitAfterImport(false);
              setImportOpen(true);
            }}
            className="rounded-full border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200 hover:bg-emerald-900/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950/20 disabled:text-slate-600"
            disabled={!shipId || noShips}
            title={noShips ? "Aucun navire visible. Vérifiez RLS/policies ships." : ""}
          >
            Import
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-200">
          <div className="text-xs uppercase tracking-[0.18em]">Erreur</div>
          <div className="mt-1 text-sm">{error}</div>
        </div>
      ) : null}

      {launchInca ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-4 text-emerald-100">
          <div className="text-xs uppercase tracking-[0.18em]">Deep-link INCA</div>
          <div className="mt-1 text-sm">
            Ouvert depuis un fichier INCA: <span className="text-emerald-50 font-semibold">{launchInca.file_name || "—"}</span>
          </div>
          <div className="mt-1 text-xs text-emerald-200/80">
            {launchInca.costr ? `COSTR ${launchInca.costr}` : "COSTR —"}
            {" · "}
            {launchInca.commessa ? `Commessa ${launchInca.commessa}` : "Commessa —"}
            {" · "}
            {launchInca.uploaded_at
              ? `Importato ${new Date(launchInca.uploaded_at).toLocaleString("it-IT")}`
              : "Importato —"}
          </div>
        </div>
      ) : launchIncaError ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 p-4 text-amber-100">
          <div className="text-xs uppercase tracking-[0.18em]">Deep-link INCA</div>
          <div className="mt-1 text-sm">Impossible de lire le fichier INCA demandé (incaFileId).</div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        {noShips ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">NAVIRE</div>
            <div className="mt-1 text-sm text-slate-200">Aucun navire visible pour ce compte.</div>
            <div className="mt-1 text-xs text-slate-500">
              Cause typique: RLS/policies sur <span className="text-slate-300">ships</span> trop
              restrictives.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                Navire
              </div>
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
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Snapshot actif
              </div>
              <div className="mt-1 text-sm text-slate-200">
                {importMeta?.imported_at
                  ? new Date(importMeta.imported_at).toLocaleString("it-IT")
                  : "Aucun"}
              </div>
              <div className="text-xs text-slate-500 mt-1">{importMeta?.file_name || "—"}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <Tile label="Cavi NAVEMASTER" value={kpi.total} />
        <Tile label="INCA match" value={kpi.withInca} hint="inca_cavi.codice = marcacavo" />
        <Tile label="INCA NP" value={kpi.npInca} hint="sans correspondance INCA" />
        <Tile label="Top STATO" value={kpi.topStato} />
        <Tile label="Top SITUAZIONE" value={kpi.topSit} />
      </div>

      {/* Mini table (page) — le vrai travail se fait dans le cockpit modal */}
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
            {(rows || []).slice(0, 30).map((r) => (
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

            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-xs text-slate-400">
                  Aucune ligne NAVEMASTER pour ce navire. Lancez un import.
                </td>
              </tr>
            ) : null}

            {rows.length > 30 ? (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-xs text-slate-400">
                  Vue page: 30 lignes. Ouvrez le <span className="text-slate-200">Cockpit</span>{" "}
                  pour 20k+ lignes (virtualisation).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Import modal */}
      <NavemasterImportModal
        open={importOpen}
        role={role}
        onClose={() => {
          setImportOpen(false);
          if (reopenCockpitAfterImport) {
            setCockpitOpen(true);
            setReopenCockpitAfterImport(false);
          }
        }}
        ship={currentShip}
        onImported={() => {
          setImportOpen(false);
          loadNavemaster();
          if (reopenCockpitAfterImport) setCockpitOpen(true);
          setReopenCockpitAfterImport(false);
        }}
      />

      {/* Cockpit popup géant */}
      <NavemasterCockpitModal
        open={cockpitOpen}
        onClose={() => setCockpitOpen(false)}
        ship={currentShip}
        importMeta={importMeta}
        rows={rows}
        loading={loading}
        error={error}
        onRefresh={() => loadNavemaster()}
        onOpenImport={() => {
            // If we open import from cockpit, we close the cockpit to avoid z-index hiding.
            setReopenCockpitAfterImport(true);
            setCockpitOpen(false);
            setImportOpen(true);
          }}
      />
    </div>
  );
}

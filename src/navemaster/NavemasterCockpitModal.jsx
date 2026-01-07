// /src/navemaster/components/NavemasterCockpitModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { corePills, cardSurface } from "../ui/designSystem";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeLower(v) {
  return String(v || "").toLowerCase();
}

function safeUpper(v) {
  return String(v || "").trim().toUpperCase();
}

function formatIt(dt) {
  try {
    return new Date(dt).toLocaleString("it-IT");
  } catch {
    return "—";
  }
}

function formatValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim() ? v : "—";
  try {
    if (v instanceof Date) return formatIt(v);
    return String(v);
  } catch {
    return "—";
  }
}

/**
 * NAVEMASTER Cockpit (popup géant)
 * - Fullscreen modal
 * - Search + filters
 * - Virtualization (no lib)
 * - Row details panel (shows *all* columns for the selected row)
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - ship: {id, code, name, costr, commessa} | null
 * - importMeta: {imported_at, file_name} | null
 * - rows: array of navemaster_live_v1 rows (may be large 20k+)
 * - loading: boolean
 * - error: string | null
 * - onRefresh: () => void
 * - onOpenImport: () => void
 */
export default function NavemasterCockpitModal({
  open,
  onClose,
  ship,
  importMeta,
  rows,
  loading,
  error,
  onRefresh,
  onOpenImport,
}) {
  const [q, setQ] = useState("");
  const [incaFilter, setIncaFilter] = useState("ALL"); // ALL | NP | OK
  const [statoFilter, setStatoFilter] = useState("ALL"); // ALL or value
  const [sitFilter, setSitFilter] = useState("ALL"); // ALL or value

  // Virtualization state
  const scrollerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  // Details
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const detailsAbortRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // reset minimal on open
    setQ("");
    setIncaFilter("ALL");
    setStatoFilter("ALL");
    setSitFilter("ALL");

    setDetailsOpen(false);
    setSelectedKey(null);
    setDetails(null);
    setDetailsLoading(false);
    setDetailsError(null);

    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => setScrollTop(el.scrollTop || 0);
    el.addEventListener("scroll", onScroll);

    const ro = new ResizeObserver(() => {
      setViewportH(el.clientHeight || 600);
    });
    ro.observe(el);

    // init
    setScrollTop(el.scrollTop || 0);
    setViewportH(el.clientHeight || 600);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();

      try {
        if (detailsAbortRef.current) detailsAbortRef.current.abort();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const distinct = useMemo(() => {
    const st = new Map();
    const si = new Map();

    for (const r of rows || []) {
      const a = String(r?.stato_cavo ?? "").trim();
      const b = String(r?.situazione_cavo_conit ?? "").trim();
      if (a) st.set(a, (st.get(a) || 0) + 1);
      if (b) si.set(b, (si.get(b) || 0) + 1);
    }

    const topSort = (m) =>
      Array.from(m.entries())
        .sort((x, y) => y[1] - x[1] || String(x[0]).localeCompare(String(y[0])))
        .map(([k, count]) => ({ k, count }));

    return {
      stato: topSort(st),
      sit: topSort(si),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = safeLower(q).trim();

    const matchesQuery = (r) => {
      if (!query) return true;
      const fields = [
        r?.marcacavo,
        r?.descrizione,
        r?.stato_cavo,
        r?.situazione_cavo_conit,
        r?.livello,
        r?.sezione,
        r?.impianto,
        r?.tipologia,
        r?.zona_da,
        r?.zona_a,
      ].map(safeLower);

      return fields.some((x) => x.includes(query));
    };

    const matchesInca = (r) => {
      if (incaFilter === "ALL") return true;
      const ok = !!r?.inca_cavo_id;
      return incaFilter === "OK" ? ok : !ok;
    };

    const matchesStato = (r) => {
      if (statoFilter === "ALL") return true;
      return String(r?.stato_cavo ?? "").trim() === statoFilter;
    };

    const matchesSit = (r) => {
      if (sitFilter === "ALL") return true;
      return String(r?.situazione_cavo_conit ?? "").trim() === sitFilter;
    };

    return (rows || []).filter(
      (r) => matchesQuery(r) && matchesInca(r) && matchesStato(r) && matchesSit(r)
    );
  }, [rows, q, incaFilter, statoFilter, sitFilter]);

  const kpi = useMemo(() => {
    const total = filtered.length;
    const ok = filtered.reduce((acc, r) => acc + (r?.inca_cavo_id ? 1 : 0), 0);
    return { total, ok, np: total - ok };
  }, [filtered]);

  // Virtualization math
  const rowH = 44;
  const overscan = 12;

  const totalRows = filtered.length;
  const maxVisible = Math.max(1, Math.ceil(viewportH / rowH));
  const startIndex = Math.max(0, Math.floor(scrollTop / rowH) - overscan);
  const endIndex = Math.min(totalRows, startIndex + maxVisible + overscan * 2);
  const slice = filtered.slice(startIndex, endIndex);

  const padTop = startIndex * rowH;
  const padBottom = Math.max(0, (totalRows - endIndex) * rowH);

  const shipLabel = ship?.code ? `${ship.code}${ship?.name ? ` — ${ship.name}` : ""}` : "—";
  const snapshot = importMeta?.imported_at ? formatIt(importMeta.imported_at) : "Aucun";
  const fileName = importMeta?.file_name || "—";

  async function openDetails(row) {
    if (!row) return;

    const key = String(row.navemaster_row_id || row.marcacavo || "");
    setSelectedKey(key);
    setDetailsOpen(true);

    // optimistic: show what we already have
    setDetails(row);
    setDetailsError(null);

    // Abort previous details fetch
    try {
      if (detailsAbortRef.current) detailsAbortRef.current.abort();
    } catch {
      // ignore
    }

    // If we can't identify the row, we stop here.
    if (!row?.navemaster_row_id) return;

    const ac = new AbortController();
    detailsAbortRef.current = ac;

    setDetailsLoading(true);
    try {
      const { data, error: e } = await supabase
        .from("navemaster_live_v1")
        .select("*")
        .eq("navemaster_row_id", row.navemaster_row_id)
        .maybeSingle()
        .abortSignal(ac.signal);

      if (e) throw e;
      if (!ac.signal.aborted) setDetails(data || row);
    } catch (err) {
      if (String(err?.name || "") === "AbortError") return;
      setDetailsError(err?.message || String(err));
    } finally {
      if (!ac.signal.aborted) setDetailsLoading(false);
    }
  }

  const detailsPairs = useMemo(() => {
    const obj = details || null;
    if (!obj) return [];

    const entries = Object.entries(obj)
      .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .map(([k, v]) => [k, v]);

    // Put a curated set of fields first, then the rest alphabetically.
    const prefer = [
      "marcacavo",
      "descrizione",
      "stato_cavo",
      "situazione_cavo_conit",
      "situazione_inca",
      "inca_cavo_id",
      "impianto",
      "tipologia",
      "zona_da",
      "zona_a",
      "livello",
      "sezione",
      "ship_id",
      "navemaster_row_id",
    ];

    const pref = [];
    const rest = [];

    for (const [k, v] of entries) {
      if (prefer.includes(k)) pref.push([k, v]);
      else rest.push([k, v]);
    }

    pref.sort((a, b) => prefer.indexOf(a[0]) - prefer.indexOf(b[0]));
    rest.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    return [...pref, ...rest];
  }, [details]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70">
      <div className="absolute inset-0 p-3 sm:p-5">
        <div
          className={cx(
            "h-full w-full rounded-2xl border border-slate-800 bg-[#050910] shadow-2xl overflow-hidden",
            cardSurface
          )}
        >
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={corePills.kicker}>UFFICIO/DIREZIONE · NAVEMASTER · COCKPIT</div>
                <div className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-slate-100 truncate">
                  {shipLabel}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Snapshot actif: <span className="text-slate-200">{snapshot}</span> ·{" "}
                  <span className="text-slate-500">{fileName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
                >
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={onOpenImport}
                  className="rounded-full border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200 hover:bg-emerald-900/20"
                >
                  Import
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <label className="block lg:col-span-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                  Recherche
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="MARCACAVO, descrizione, impianto, zona…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>

              <label className="block lg:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                  INCA
                </div>
                <select
                  value={incaFilter}
                  onChange={(e) => setIncaFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="ALL">Tous</option>
                  <option value="OK">OK (match)</option>
                  <option value="NP">NP (sans match)</option>
                </select>
              </label>

              <label className="block lg:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                  STATO
                </div>
                <select
                  value={statoFilter}
                  onChange={(e) => setStatoFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="ALL">Tous</option>
                  {distinct.stato.slice(0, 60).map((x) => (
                    <option key={x.k} value={x.k}>
                      {x.k} ({x.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block lg:col-span-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                  SITUAZIONE CONIT
                </div>
                <select
                  value={sitFilter}
                  onChange={(e) => setSitFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="ALL">Tous</option>
                  {distinct.sit.slice(0, 60).map((x) => (
                    <option key={x.k} value={x.k}>
                      {x.k} ({x.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className={corePills.kicker}>Lignes (filtrées)</div>
                <div className="text-2xl font-semibold mt-1 text-slate-100">{kpi.total}</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className={corePills.kicker}>INCA match</div>
                <div className="text-2xl font-semibold mt-1 text-slate-100">{kpi.ok}</div>
                <div className="text-xs text-slate-400 mt-1">inca_cavi.codice = marcacavo</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className={corePills.kicker}>INCA NP</div>
                <div className="text-2xl font-semibold mt-1 text-slate-100">{kpi.np}</div>
                <div className="text-xs text-slate-400 mt-1">sans correspondance INCA</div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-200">
                <div className="text-xs uppercase tracking-[0.18em]">Erreur</div>
                <div className="mt-1 text-sm">{error}</div>
              </div>
            ) : null}
          </div>

          {/* Table + Details area */}
          <div className="h-[calc(100%-260px)] sm:h-[calc(100%-300px)]">
            <div className="h-full flex">
              {/* Left: table */}
              <div className="h-full flex-1 overflow-auto" ref={scrollerRef}>
                <div className="min-w-[1700px]">
                  {/* Table header (sticky) */}
                  <div className="sticky top-0 z-10 bg-[#050910] border-b border-slate-800">
                    <div className="grid grid-cols-[220px_1fr_120px_170px_160px_140px_220px_120px_120px_90px] text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      <div className="px-3 py-3">MARCACAVO</div>
                      <div className="px-3 py-3">DESCRIZIONE</div>
                      <div className="px-3 py-3">STATO</div>
                      <div className="px-3 py-3">SIT. CONIT</div>
                      <div className="px-3 py-3">IMPIANTO</div>
                      <div className="px-3 py-3">TIPO</div>
                      <div className="px-3 py-3">ZONA</div>
                      <div className="px-3 py-3">LIVELLO</div>
                      <div className="px-3 py-3">SEZIONE</div>
                      <div className="px-3 py-3">INCA</div>
                    </div>
                  </div>

                  {/* Virtualized body */}
                  <div style={{ paddingTop: padTop, paddingBottom: padBottom }}>
                    {loading ? (
                      <div className="px-3 py-8 text-sm text-slate-300">Chargement…</div>
                    ) : totalRows === 0 ? (
                      <div className="px-3 py-8 text-sm text-slate-400">
                        Aucune ligne (après filtres). Ajustez les filtres ou lancez un import.
                      </div>
                    ) : (
                      slice.map((r, idx) => {
                        const key = r.navemaster_row_id || `${r.marcacavo || "x"}_${startIndex + idx}`;
                        const isOk = !!r.inca_cavo_id;
                        const zone =
                          (String(r?.zona_da || "").trim() || "—") +
                          " → " +
                          (String(r?.zona_a || "").trim() || "—");
                        const isSelected = selectedKey && String(key) === String(selectedKey);

                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => openDetails(r)}
                            className={cx(
                              "w-full text-left grid grid-cols-[220px_1fr_120px_170px_160px_140px_220px_120px_120px_90px] border-b border-slate-800 hover:bg-slate-950/30",
                              isSelected ? "bg-slate-950/35" : null
                            )}
                            style={{ height: rowH }}
                            title="Ouvrir détails (toutes colonnes)"
                          >
                            <div className="px-3 py-2 font-medium text-slate-100 truncate">
                              {r.marcacavo || "—"}
                            </div>
                            <div className="px-3 py-2 text-slate-200 truncate">
                              {r.descrizione || "—"}
                            </div>
                            <div className="px-3 py-2 text-slate-200 truncate">{r.stato_cavo || "—"}</div>
                            <div className="px-3 py-2 text-slate-200 truncate">
                              {r.situazione_cavo_conit || "—"}
                            </div>
                            <div className="px-3 py-2 text-slate-200 truncate">{r.impianto || "—"}</div>
                            <div className="px-3 py-2 text-slate-200 truncate">{r.tipologia || "—"}</div>
                            <div className="px-3 py-2 text-slate-200 truncate">{zone}</div>
                            <div className="px-3 py-2 text-slate-200 truncate">{r.livello || "—"}</div>
                            <div className="px-3 py-2 text-slate-200 truncate">{r.sezione || "—"}</div>
                            <div className="px-3 py-2 text-slate-300">
                              {isOk ? (
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
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="px-3 py-3 text-xs text-slate-500">
                    Virtualisation active. Lignes filtrées: <span className="text-slate-300">{totalRows}</span>.
                    <span className="ml-2">Cliquez une ligne pour voir toutes les colonnes.</span>
                  </div>
                </div>
              </div>

              {/* Right: details (desktop) */}
              <div className="hidden lg:flex h-full w-[420px] shrink-0 border-l border-slate-800 bg-slate-950/30">
                <div className="flex h-full w-full flex-col">
                  <div className="border-b border-slate-800 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Détails</div>
                        <div className="mt-1 text-sm font-semibold text-slate-100 truncate">
                          {details?.marcacavo || "Sélectionnez une ligne"}
                        </div>
                        {details?.stato_cavo || details?.situazione_cavo_conit ? (
                          <div className="mt-1 text-xs text-slate-400">
                            <span className="text-slate-200">{details?.stato_cavo || "—"}</span>
                            <span className="text-slate-500"> · </span>
                            <span className="text-slate-200">{details?.situazione_cavo_conit || "—"}</span>
                          </div>
                        ) : null}
                      </div>

                      {detailsOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsOpen(false);
                            setSelectedKey(null);
                            setDetails(null);
                            setDetailsError(null);
                            setDetailsLoading(false);
                          }}
                          className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
                        >
                          Fermer
                        </button>
                      ) : null}
                    </div>

                    {detailsLoading ? (
                      <div className="mt-2 text-sm text-slate-400">Chargement détails…</div>
                    ) : detailsError ? (
                      <div className="mt-2 text-sm text-rose-200">{detailsError}</div>
                    ) : null}

                    {details?.inca_cavo_id ? (
                      <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3 text-emerald-100">
                        <div className="text-[11px] uppercase tracking-[0.18em]">INCA match</div>
                        <div className="mt-1 text-sm">{details?.situazione_inca || "OK"}</div>
                        <div className="mt-1 text-xs text-emerald-200/80 truncate">{details?.inca_cavo_id}</div>
                      </div>
                    ) : details ? (
                      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-slate-200">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">INCA</div>
                        <div className="mt-1 text-sm">NP (aucune correspondance)</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex-1 overflow-auto p-4">
                    {!details ? (
                      <div className="text-sm text-slate-500">
                        Sélectionnez une ligne à gauche pour afficher toutes les colonnes (mode audit).
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detailsPairs.map(([k, v]) => {
                          const label = safeUpper(k).replace(/_/g, " ");
                          return (
                            <div
                              key={k}
                              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                            >
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
                              <div className="mt-1 text-sm text-slate-100 break-words">{formatValue(v)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-800 p-3 sm:p-4 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-400">
              Navire: <span className="text-slate-200">{ship?.code || "—"}</span> · Snapshot:{" "}
              <span className="text-slate-200">{snapshot}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-700 bg-slate-950/40 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay details */}
      {detailsOpen && details ? (
        <div className="lg:hidden fixed inset-0 z-[75] bg-black/70">
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] rounded-t-2xl border-t border-slate-800 bg-[#050910]">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 p-4">
              <div className="min-w-0">
                <div className={corePills.kicker}>DÉTAILS · NAVEMASTER</div>
                <div className="mt-1 text-base font-semibold text-slate-100 truncate">
                  {details?.marcacavo || "—"}
                </div>
                <div className="mt-1 text-xs text-slate-400 truncate">
                  {details?.stato_cavo || "—"} · {details?.situazione_cavo_conit || "—"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDetailsOpen(false);
                  setSelectedKey(null);
                  setDetails(null);
                  setDetailsError(null);
                  setDetailsLoading(false);
                }}
                className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
              >
                Fermer
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-4 text-sm text-slate-400">Chargement détails…</div>
            ) : detailsError ? (
              <div className="p-4 text-sm text-rose-200">{detailsError}</div>
            ) : (
              <div className="max-h-[72vh] overflow-auto p-4">
                <div className="space-y-2">
                  {detailsPairs.map(([k, v]) => {
                    const label = safeUpper(k).replace(/_/g, " ");
                    return (
                      <div
                        key={k}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                      >
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
                        <div className="mt-1 text-sm text-slate-100 break-words">{formatValue(v)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

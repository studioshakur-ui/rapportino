// /src/navemaster/components/NavemasterCockpitModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { corePills, cardSurface } from "../ui/designSystem";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeLower(v) {
  return String(v || "").toLowerCase();
}

function formatIt(dt) {
  try {
    return new Date(dt).toLocaleString("it-IT");
  } catch {
    return "—";
  }
}

/**
 * NAVEMASTER Cockpit (popup géant)
 * - Fullscreen modal
 * - Search + filters
 * - Virtualization (no lib)
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

  useEffect(() => {
    if (!open) return;

    // reset minimal on open
    setQ("");
    setIncaFilter("ALL");
    setStatoFilter("ALL");
    setSitFilter("ALL");

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
    };
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
      const a = safeLower(r?.marcacavo);
      const b = safeLower(r?.descrizione);
      const c = safeLower(r?.stato_cavo);
      const d = safeLower(r?.situazione_cavo_conit);
      const e = safeLower(r?.livello);
      const f = safeLower(r?.sezione);
      return (
        a.includes(query) ||
        b.includes(query) ||
        c.includes(query) ||
        d.includes(query) ||
        e.includes(query) ||
        f.includes(query)
      );
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

  if (!open) return null;

  const shipLabel = ship?.code ? `${ship.code}${ship?.name ? ` — ${ship.name}` : ""}` : "—";
  const snapshot = importMeta?.imported_at ? formatIt(importMeta.imported_at) : "Aucun";
  const fileName = importMeta?.file_name || "—";

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
                  placeholder="MARCACAVO, descrizione, stato, livello…"
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

          {/* Table area */}
          <div className="h-[calc(100%-260px)] sm:h-[calc(100%-300px)]">
            <div className="h-full overflow-auto" ref={scrollerRef}>
              <div className="min-w-[1250px]">
                {/* Table header (sticky) */}
                <div className="sticky top-0 z-10 bg-[#050910] border-b border-slate-800">
                  <div className="grid grid-cols-[240px_1fr_140px_170px_120px_140px_90px] text-[11px] uppercase tracking-[0.18em] text-slate-300">
                    <div className="px-3 py-3">MARCACAVO</div>
                    <div className="px-3 py-3">DESCRIZIONE</div>
                    <div className="px-3 py-3">STATO</div>
                    <div className="px-3 py-3">SIT. CONIT</div>
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

                      return (
                        <div
                          key={key}
                          className="grid grid-cols-[240px_1fr_140px_170px_120px_140px_90px] border-b border-slate-800 hover:bg-slate-950/30"
                          style={{ height: rowH }}
                        >
                          <div className="px-3 py-2 font-medium text-slate-100 truncate">
                            {r.marcacavo || "—"}
                          </div>
                          <div className="px-3 py-2 text-slate-200 truncate">
                            {r.descrizione || "—"}
                          </div>
                          <div className="px-3 py-2 text-slate-200 truncate">
                            {r.stato_cavo || "—"}
                          </div>
                          <div className="px-3 py-2 text-slate-200 truncate">
                            {r.situazione_cavo_conit || "—"}
                          </div>
                          <div className="px-3 py-2 text-slate-200 truncate">
                            {r.livello || "—"}
                          </div>
                          <div className="px-3 py-2 text-slate-200 truncate">
                            {r.sezione || "—"}
                          </div>
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
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer hint */}
                <div className="px-3 py-3 text-xs text-slate-500">
                  Virtualisation active. Lignes filtrées:{" "}
                  <span className="text-slate-300">{totalRows}</span>.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-800 p-3 sm:p-4 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-400">
              Navire: <span className="text-slate-200">{ship?.code || "—"}</span> ·{" "}
              Snapshot: <span className="text-slate-200">{snapshot}</span>
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
    </div>
  );
}

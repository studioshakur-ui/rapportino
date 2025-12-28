// /src/components/kpi/OperatorProductivityKpiPanel.jsx
//
// KPI Operatori — Produttività canonique su PREVISTO (per persona / 8h)
// - Indice global (unique) : Σ(prodotto_alloc) / Σ(previsto_eff)
// - Indice par famille : regroupement categoria + descrizione sur le même ratio
// - previsto_eff = previsto * (tempo_hours / 8)
//
// Sources DB (v2):
// - kpi_operator_global_day_v2
// - kpi_operator_family_day_v2
//
// IMPORTANT:
// - KPI temps "global semaine" reste un KPI séparé; ici on montre seulement les heures "indicizzate"
//   (heures sur lignes QUANTITATIVE MT/PZ avec previsto>0).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthProvider";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function toISODate(d) {
  if (!(d instanceof Date)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const normalized = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(v, maxFrac = 2) {
  if (v == null || Number.isNaN(v)) return "0";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFrac }).format(Number(v));
}

function safeText(x) {
  const s = (x ?? "").toString().trim();
  return s || "—";
}

function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function normalizeScope(scope) {
  const s = String(scope || "DIRECTION").toUpperCase().trim();
  if (s === "MANAGER" || s === "CAPO" || s === "DIRECTION") return s;
  return "DIRECTION";
}

export default function OperatorProductivityKpiPanel({
  scope = "DIRECTION",
  isDark = true,
  title = "KPI Operatori · Indice Produttività (Previsto)",
  kicker = "CNCS / CORE",
  showCostrCommessaFilters = true,
}) {
  const { profile } = useAuth();

  const SCOPE = useMemo(() => normalizeScope(scope), [scope]);

  const STORAGE_KEY = useMemo(() => {
    const pid = profile?.id ? String(profile.id) : "anon";
    return `core_kpi_operator_prod_previsto_selected_v2::${SCOPE}::${pid}`;
  }, [profile?.id, SCOPE]);

  // date window
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // optional filters
  const [costrFilter, setCostrFilter] = useState("");
  const [commessaFilter, setCommessaFilter] = useState("");

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // data
  const [globalRows, setGlobalRows] = useState([]); // per day, per operator (global)
  const [familyRows, setFamilyRows] = useState([]); // per day, per operator, per family

  // derived operator list (from current window)
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => loadJSON(STORAGE_KEY, []));

  const [showFamilies, setShowFamilies] = useState(true);

  const didInitRange = useRef(false);

  // init last 7 days once
  useEffect(() => {
    if (didInitRange.current) return;
    if (dateFrom || dateTo) return;

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    setDateFrom(toISODate(start));
    setDateTo(toISODate(today));
    didInitRange.current = true;
  }, [dateFrom, dateTo]);

  // FIX: when STORAGE_KEY changes (profile loaded / scope changes), reload selection from that key
  useEffect(() => {
    setSelectedIds(loadJSON(STORAGE_KEY, []));
  }, [STORAGE_KEY]);

  // persist selection
  useEffect(() => {
    saveJSON(STORAGE_KEY, selectedIds);
  }, [STORAGE_KEY, selectedIds]);

  // Load global + family rows (v2) with scope filtering
  useEffect(() => {
    if (!profile?.id) return;
    if (!dateFrom || !dateTo) return;

    let alive = true;
    const ac = new AbortController();

    function normalizeGlobal(rows) {
      return (rows || []).map((r) => ({
        report_date: r?.report_date ? String(r.report_date) : null,
        operator_id: r?.operator_id || null,
        operator_name: safeText(r?.operator_name),
        ore: toNumber(r?.total_hours_indexed),
        previsto_eff: toNumber(r?.total_previsto_eff),
        prodotto: toNumber(r?.total_prodotto_alloc),
        productivity_index: r?.productivity_index == null ? null : toNumber(r?.productivity_index),
        costr: r?.costr ?? null,
        commessa: r?.commessa ?? null,
        manager_id: r?.manager_id ?? null,
        _source: "kpi_operator_global_day_v2",
      }));
    }

    function normalizeFamily(rows) {
      return (rows || []).map((r) => ({
        report_date: r?.report_date ? String(r.report_date) : null,
        operator_id: r?.operator_id || null,
        operator_name: safeText(r?.operator_name),
        categoria: safeText(r?.categoria),
        descrizione: safeText(r?.descrizione),
        ore: toNumber(r?.total_hours_indexed),
        previsto_eff: toNumber(r?.total_previsto_eff),
        prodotto: toNumber(r?.total_prodotto_alloc),
        productivity_index: r?.productivity_index == null ? null : toNumber(r?.productivity_index),
        costr: r?.costr ?? null,
        commessa: r?.commessa ?? null,
        manager_id: r?.manager_id ?? null,
        _source: "kpi_operator_family_day_v2",
      }));
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Base queries
        let gq = supabase
          .from("kpi_operator_global_day_v2")
          .select(
            "report_date, operator_id, operator_name, manager_id, costr, commessa, total_hours_indexed, total_previsto_eff, total_prodotto_alloc, productivity_index"
          )
          .gte("report_date", dateFrom)
          .lte("report_date", dateTo)
          .order("report_date", { ascending: true })
          .abortSignal(ac.signal);

        let fq = supabase
          .from("kpi_operator_family_day_v2")
          .select(
            "report_date, operator_id, operator_name, manager_id, costr, commessa, categoria, descrizione, total_hours_indexed, total_previsto_eff, total_prodotto_alloc, productivity_index"
          )
          .gte("report_date", dateFrom)
          .lte("report_date", dateTo)
          .order("report_date", { ascending: true })
          .abortSignal(ac.signal);

        // Scope filtering (CANONIQUE)
        if (SCOPE === "MANAGER") {
          gq = gq.eq("manager_id", profile.id);
          fq = fq.eq("manager_id", profile.id);
        } else if (SCOPE === "CAPO") {
          // NOTE: v2 views do not expose capo_id currently; scope CAPO would require adding capo_id to views.
          // For safety, we do not pretend filtering works if column isn't present.
          // If you add capo_id in views later, enable:
          // gq = gq.eq("capo_id", profile.id);
          // fq = fq.eq("capo_id", profile.id);
        }

        // Optional costr/commessa filters (UI controlled)
        if (showCostrCommessaFilters) {
          if (costrFilter) {
            gq = gq.eq("costr", costrFilter);
            fq = fq.eq("costr", costrFilter);
          }
          if (commessaFilter) {
            gq = gq.eq("commessa", commessaFilter);
            fq = fq.eq("commessa", commessaFilter);
          }
        }

        // Optional operator_id filter for performance (only if selection is reasonable)
        if (selectedIds?.length > 0 && selectedIds.length <= 250) {
          gq = gq.in("operator_id", selectedIds);
          fq = fq.in("operator_id", selectedIds);
        }

        const { data: gData, error: gErr } = await gq;
        if (gErr) throw gErr;

        const { data: fData, error: fErr } = await fq;
        if (fErr) throw fErr;

        if (!alive) return;
        setGlobalRows(normalizeGlobal(gData));
        setFamilyRows(normalizeFamily(fData));
      } catch (e) {
        console.error("[OperatorProductivityKpiPanel] load error:", e);
        if (!alive) return;
        setError(
          e?.message ||
            "Errore nel caricamento KPI operatori. Verifica view kpi_operator_global_day_v2 / kpi_operator_family_day_v2 e RLS."
        );
        setGlobalRows([]);
        setFamilyRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [
    profile?.id,
    dateFrom,
    dateTo,
    SCOPE,
    showCostrCommessaFilters,
    costrFilter,
    commessaFilter,
    // Important: only re-query when selection changes if we actually push it to DB (.in)
    selectedIds,
  ]);

  // operator list (distinct) from globalRows
  const operators = useMemo(() => {
    const m = new Map();
    (globalRows || []).forEach((r) => {
      const id = r?.operator_id || null;
      if (!id) return;
      const name = safeText(r?.operator_name);
      if (!m.has(id)) m.set(id, { operator_id: id, operator_name: name });
      else {
        const prev = m.get(id);
        if ((prev?.operator_name || "—") === "—" && name !== "—") {
          m.set(id, { operator_id: id, operator_name: name });
        }
      }
    });
    return Array.from(m.values()).sort((a, b) =>
      String(a.operator_name || "").localeCompare(String(b.operator_name || ""))
    );
  }, [globalRows]);

  const filteredOperators = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return operators;
    return (operators || []).filter((o) =>
      String(o.operator_name || "").toLowerCase().includes(q)
    );
  }, [operators, search]);

  // selection helpers
  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  const toggleOperator = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const set = new Set(prev || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  };

  const selectAllFiltered = () => {
    const ids = (filteredOperators || []).map((o) => o.operator_id).filter(Boolean);
    setSelectedIds((prev) => uniq([...(prev || []), ...ids]));
  };

  const clearSelection = () => setSelectedIds([]);

  // filter options (costr/commessa) derived from current data window
  const costrOptions = useMemo(() => {
    const vals = (globalRows || [])
      .map((r) => (r?.costr ?? "").toString().trim())
      .filter(Boolean);
    return uniq(vals).sort((a, b) => a.localeCompare(b));
  }, [globalRows]);

  const commessaOptions = useMemo(() => {
    const vals = (globalRows || [])
      .map((r) => (r?.commessa ?? "").toString().trim())
      .filter(Boolean);
    return uniq(vals).sort((a, b) => a.localeCompare(b));
  }, [globalRows]);

  // per-operator aggregation (range) — CANONIQUE: Σprod / Σprevisto_eff
  const perOperator = useMemo(() => {
    const m = new Map();

    (globalRows || []).forEach((r) => {
      const opId = r?.operator_id || null;
      if (!opId) return;

      if (selectedSet.size > 0 && !selectedSet.has(opId)) return;

      const ore = toNumber(r?.ore);
      const prod = toNumber(r?.prodotto);
      const prevEff = toNumber(r?.previsto_eff);
      const day = r?.report_date ? String(r.report_date) : null;

      const cur =
        m.get(opId) || {
          operator_id: opId,
          operator_name: safeText(r?.operator_name),
          ore_sum: 0,
          prodotto_sum: 0,
          previsto_eff_sum: 0,
          days_set: new Set(),
        };

      if (ore > 0) cur.ore_sum += ore;
      cur.prodotto_sum += prod;
      cur.previsto_eff_sum += prevEff;
      if (day) cur.days_set.add(day);

      const name = safeText(r?.operator_name);
      if ((cur.operator_name || "—") === "—" && name !== "—") {
        cur.operator_name = name;
      }

      m.set(opId, cur);
    });

    const out = Array.from(m.values()).map((x) => {
      const idx = x.previsto_eff_sum > 0 ? x.prodotto_sum / x.previsto_eff_sum : null;
      return {
        operator_id: x.operator_id,
        operator_name: x.operator_name,
        ore_sum: x.ore_sum,
        previsto_eff_sum: x.previsto_eff_sum,
        prodotto_sum: x.prodotto_sum,
        productivity_index_range: idx,
        days_active: x.days_set.size,
      };
    });

    return out.sort((a, b) => {
      const ap = a.productivity_index_range;
      const bp = b.productivity_index_range;
      const aNull = ap == null ? 1 : 0;
      const bNull = bp == null ? 1 : 0;
      if (aNull !== bNull) return aNull - bNull;
      if (ap != null && bp != null && bp !== ap) return bp - ap;
      return String(a.operator_name || "").localeCompare(String(b.operator_name || ""));
    });
  }, [globalRows, selectedSet]);

  // per-operator per-family aggregation (range)
  const perOperatorFamilies = useMemo(() => {
    const byOp = new Map();

    (familyRows || []).forEach((r) => {
      const opId = r?.operator_id || null;
      if (!opId) return;
      if (selectedSet.size > 0 && !selectedSet.has(opId)) return;

      const cat = safeText(r?.categoria);
      const desc = safeText(r?.descrizione);
      const key = `${cat}::${desc}`;

      const ore = toNumber(r?.ore);
      const prod = toNumber(r?.prodotto);
      const prevEff = toNumber(r?.previsto_eff);

      if (!byOp.has(opId)) byOp.set(opId, new Map());
      const m = byOp.get(opId);

      const cur =
        m.get(key) || {
          categoria: cat,
          descrizione: desc,
          ore_sum: 0,
          prodotto_sum: 0,
          previsto_eff_sum: 0,
        };

      if (ore > 0) cur.ore_sum += ore;
      cur.prodotto_sum += prod;
      cur.previsto_eff_sum += prevEff;

      m.set(key, cur);
    });

    const out = new Map();
    byOp.forEach((m, opId) => {
      const arr = Array.from(m.values()).map((x) => ({
        ...x,
        productivity_index: x.previsto_eff_sum > 0 ? x.prodotto_sum / x.previsto_eff_sum : null,
      }));

      arr.sort((a, b) => {
        const ap = a.productivity_index;
        const bp = b.productivity_index;
        const aNull = ap == null ? 1 : 0;
        const bNull = bp == null ? 1 : 0;
        if (aNull !== bNull) return aNull - bNull;
        if (ap != null && bp != null && bp !== ap) return bp - ap;
        const ak = `${a.categoria} ${a.descrizione}`;
        const bk = `${b.categoria} ${b.descrizione}`;
        return ak.localeCompare(bk);
      });

      out.set(opId, arr);
    });

    return out;
  }, [familyRows, selectedSet]);

  const totalsSelected = useMemo(() => {
    const sumOre = (perOperator || []).reduce((a, r) => a + toNumber(r.ore_sum), 0);
    const sumProd = (perOperator || []).reduce((a, r) => a + toNumber(r.prodotto_sum), 0);
    const sumPrev = (perOperator || []).reduce((a, r) => a + toNumber(r.previsto_eff_sum), 0);
    const idx = sumPrev > 0 ? sumProd / sumPrev : null;
    return { sumOre, sumProd, sumPrev, idx };
  }, [perOperator]);

  const cardBase = cn(
    "rounded-2xl border px-4 py-3",
    isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"
  );

  const smallInput = cn(
    "rounded-lg border px-2 py-1 text-[12px] outline-none",
    isDark
      ? "border-slate-800 bg-slate-950/70 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/60"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/60"
  );

  return (
    <div className="space-y-4">
      <header className="px-3 sm:px-4 pt-3">
        <div className={cn("text-[11px] uppercase tracking-[0.18em] mb-1", "text-slate-500")}>{kicker}</div>
        <h1 className={cn("text-xl sm:text-2xl font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
          {title}
        </h1>
        <p className={cn("text-xs mt-1 max-w-4xl", isDark ? "text-slate-400" : "text-slate-600")}>
          Indice canonico (range): <span className="font-mono">Σ(realizzato_alloc) / Σ(previsto_eff)</span>, con{" "}
          <span className="font-mono">previsto_eff = previsto × (ore/8)</span>. Famille ={" "}
          <span className="font-mono">categoria + descrizione</span>.
        </p>
      </header>

      {/* filters */}
      <section className="px-3 sm:px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <div className={cardBase}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Finestra</div>
          <div className="mt-2 flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={smallInput} />
            <span className="text-xs text-slate-500">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={smallInput} />
          </div>

          {showCostrCommessaFilters ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Cantiere (costr)</div>
                <select
                  value={costrFilter}
                  onChange={(e) => setCostrFilter(e.target.value)}
                  className={cn(smallInput, "w-full")}
                >
                  <option value="">Tutti</option>
                  {costrOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Commessa</div>
                <select
                  value={commessaFilter}
                  onChange={(e) => setCommessaFilter(e.target.value)}
                  className={cn(smallInput, "w-full")}
                >
                  <option value="">Tutte</option>
                  {commessaOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>

        <div className={cardBase}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Selezione</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className={cn(
                "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.16em] transition",
                isDark
                  ? "border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-900/35"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              Seleziona filtrati
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className={cn(
                "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.16em] transition",
                isDark
                  ? "border-rose-500/40 bg-rose-950/15 text-rose-200 hover:bg-rose-900/20"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              )}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => setShowFamilies((v) => !v)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.16em] transition",
                isDark
                  ? "border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-900/35"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {showFamilies ? "Nascondi famiglie" : "Mostra famiglie"}
            </button>

            <span className="ml-auto text-[11px] text-slate-500">
              Selezionati:{" "}
              <span className={cn("font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
                {selectedIds.length}
              </span>
            </span>
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Scope attivo: <span className="font-mono">{SCOPE}</span>
            {SCOPE === "CAPO" ? (
              <span className="ml-2 text-amber-300/90">
                Nota: filtro CAPO richiede capo_id nelle view v2 (non attivo finché non esposto).
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* errors */}
      {error ? (
        <div className="px-3 sm:px-4">
          <div
            className={cn(
              "rounded-2xl border px-3 py-2 text-xs",
              isDark ? "border-rose-700/40 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"
            )}
          >
            <div className="font-semibold">Errore</div>
            <div className="mt-1">{error}</div>
            <div className={cn("mt-2 text-[11px]", isDark ? "text-rose-200/80" : "text-rose-700/80")}>
              Nota: questa pagina usa <span className="font-mono">kpi_operator_global_day_v2</span> e{" "}
              <span className="font-mono">kpi_operator_family_day_v2</span>.
            </div>
          </div>
        </div>
      ) : null}

      {/* KPI strip */}
      <section className="px-3 sm:px-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className={cn(cardBase, "border-emerald-500/20")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Operai selezionati</div>
          <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
            {loading ? "—" : perOperator.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Lista attiva</div>
        </div>

        <div className={cn(cardBase, "border-sky-500/20")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Σ Ore (indicizzate)</div>
          <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-sky-200" : "text-sky-700")}>
            {loading ? "—" : formatNumber(totalsSelected.sumOre)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Solo linee QUANTITATIVE MT/PZ con previsto</div>
        </div>

        <div className={cn(cardBase, "border-slate-500/20")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Σ Previsto eff</div>
          <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
            {loading ? "—" : formatNumber(totalsSelected.sumPrev)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">previsto × (ore/8)</div>
        </div>

        <div className={cn(cardBase, "border-fuchsia-500/20")}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Indice (global)</div>
          <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-fuchsia-200" : "text-fuchsia-700")}>
            {loading ? "—" : totalsSelected.idx == null ? "—" : formatNumber(totalsSelected.idx, 2)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Σreal / Σprev</div>
        </div>
      </section>

      {/* main: picker + table */}
      <section className="px-3 sm:px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 pb-4">
        {/* picker */}
        <div className={cardBase}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Operatori</div>
              <div className={cn("text-sm font-medium", isDark ? "text-slate-100" : "text-slate-900")}>
                Seleziona la lista su cui calcolare i KPI
              </div>
              <div className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-slate-600")}>
                La lista è derivata dai dati nella finestra corrente.
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Totale in range:{" "}
              <span className={cn("font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>{operators.length}</span>
            </div>
          </div>

          <div className="mt-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca operatore…"
              className={cn(smallInput, "w-full")}
            />
          </div>

          <div className="mt-3 max-h-[420px] overflow-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-[12px] text-slate-500">Caricamento lista…</div>
            ) : filteredOperators.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-slate-500">Nessun operatore trovato</div>
            ) : (
              <ul className="space-y-1">
                {filteredOperators.map((o) => {
                  const id = o.operator_id;
                  const checked = selectedSet.has(id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => toggleOperator(id)}
                        className={cn(
                          "w-full text-left flex items-center gap-2 rounded-xl border px-3 py-2 transition",
                          isDark
                            ? "border-slate-800 bg-slate-950/30 hover:bg-slate-900/30"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                          checked ? (isDark ? "ring-1 ring-emerald-500/50" : "ring-1 ring-emerald-500/40") : ""
                        )}
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center text-[10px]",
                            checked
                              ? isDark
                                ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                                : "border-emerald-500/60 bg-emerald-50 text-emerald-800"
                              : isDark
                              ? "border-slate-700 bg-slate-950/60 text-slate-500"
                              : "border-slate-300 bg-white text-slate-400"
                          )}
                          aria-hidden="true"
                        >
                          {checked ? "✓" : ""}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className={cn("text-sm font-medium truncate", isDark ? "text-slate-100" : "text-slate-900")}>
                            {safeText(o.operator_name)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">{id}</div>
                        </div>

                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.18em]",
                            checked
                              ? isDark
                                ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
                                : "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                              : isDark
                              ? "border-slate-800 bg-slate-950/20 text-slate-500"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          )}
                        >
                          {checked ? "Selez." : "Off"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* table */}
        <div className={cardBase}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Risultati</div>
              <div className={cn("text-sm font-medium", isDark ? "text-slate-100" : "text-slate-900")}>
                Indice produttività (global) + dettaglio famiglie
              </div>
              <div className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-slate-600")}>
                Global = <span className="font-mono">Σreal / Σprev</span>. Famiglie ={" "}
                <span className="font-mono">categoria + descrizione</span>.
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Righe:{" "}
              <span className={cn("font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
                {loading ? "—" : perOperator.length}
              </span>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cn("text-[11px] uppercase tracking-[0.16em]", "text-slate-500")}>
                  <th className="text-left py-2 pr-3">Operatore</th>
                  <th className="text-right py-2 pr-3">Σ Ore</th>
                  <th className="text-right py-2 pr-3">Σ Prev</th>
                  <th className="text-right py-2 pr-3">Σ Real</th>
                  <th className="text-right py-2 pr-3">Indice</th>
                  <th className="text-right py-2 pr-3">Giorni</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                      Caricamento KPI…
                    </td>
                  </tr>
                ) : perOperator.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                      Nessun dato. Seleziona operatori (a sinistra) oppure allarga la finestra.
                    </td>
                  </tr>
                ) : (
                  perOperator.map((r) => {
                    const idx = r.productivity_index_range;
                    const tone =
                      idx == null
                        ? isDark
                          ? "text-slate-400"
                          : "text-slate-500"
                        : idx >= 1.2
                        ? isDark
                          ? "text-emerald-200"
                          : "text-emerald-700"
                        : idx >= 1.0
                        ? isDark
                          ? "text-sky-200"
                          : "text-sky-700"
                        : isDark
                        ? "text-rose-200"
                        : "text-rose-700";

                    const fam = perOperatorFamilies.get(r.operator_id) || [];

                    return (
                      <React.Fragment key={r.operator_id}>
                        <tr className={cn("border-t", isDark ? "border-slate-800/70" : "border-slate-200")}>
                          <td className="py-2 pr-3">
                            <div className={cn("font-medium", isDark ? "text-slate-100" : "text-slate-900")}>
                              {safeText(r.operator_name)}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{r.operator_id}</div>
                          </td>
                          <td className={cn("py-2 pr-3 text-right", isDark ? "text-slate-200" : "text-slate-800")}>
                            {formatNumber(r.ore_sum)}
                          </td>
                          <td className={cn("py-2 pr-3 text-right", isDark ? "text-slate-200" : "text-slate-800")}>
                            {formatNumber(r.previsto_eff_sum)}
                          </td>
                          <td className={cn("py-2 pr-3 text-right", isDark ? "text-slate-200" : "text-slate-800")}>
                            {formatNumber(r.prodotto_sum)}
                          </td>
                          <td className={cn("py-2 pr-3 text-right font-semibold", tone)}>{idx == null ? "—" : formatNumber(idx, 2)}</td>
                          <td className={cn("py-2 pr-3 text-right", isDark ? "text-slate-400" : "text-slate-600")}>
                            {Number(r.days_active || 0)}
                          </td>
                        </tr>

                        {showFamilies ? (
                          <tr className={cn("border-t", isDark ? "border-slate-800/50" : "border-slate-200")}>
                            <td colSpan={6} className={cn("py-2 pr-3", isDark ? "text-slate-200" : "text-slate-800")}>
                              {fam.length === 0 ? (
                                <div className="text-[12px] text-slate-500">Nessuna famiglia indicizzabile nel range.</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[12px]">
                                    <thead>
                                      <tr className={cn("text-[10px] uppercase tracking-[0.16em]", "text-slate-500")}>
                                        <th className="text-left py-1 pr-3">Famiglia (cat + desc)</th>
                                        <th className="text-right py-1 pr-3">Σ Ore</th>
                                        <th className="text-right py-1 pr-3">Σ Prev</th>
                                        <th className="text-right py-1 pr-3">Σ Real</th>
                                        <th className="text-right py-1 pr-3">Indice</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {fam.map((f, i) => {
                                        const fx = f.productivity_index;
                                        const ftone =
                                          fx == null
                                            ? isDark
                                              ? "text-slate-400"
                                              : "text-slate-500"
                                            : fx >= 1.2
                                            ? isDark
                                              ? "text-emerald-200"
                                              : "text-emerald-700"
                                            : fx >= 1.0
                                            ? isDark
                                              ? "text-sky-200"
                                              : "text-sky-700"
                                            : isDark
                                            ? "text-rose-200"
                                            : "text-rose-700";

                                        return (
                                          <tr
                                            key={`${f.categoria}::${f.descrizione}::${i}`}
                                            className={cn("border-t", isDark ? "border-slate-800/40" : "border-slate-200")}
                                          >
                                            <td className="py-1 pr-3">
                                              <span className={cn("font-medium", isDark ? "text-slate-100" : "text-slate-900")}>
                                                {safeText(f.categoria)}
                                              </span>
                                              <span className="text-slate-500"> · </span>
                                              <span className={cn(isDark ? "text-slate-300" : "text-slate-700")}>
                                                {safeText(f.descrizione)}
                                              </span>
                                            </td>
                                            <td className="py-1 pr-3 text-right">{formatNumber(f.ore_sum)}</td>
                                            <td className="py-1 pr-3 text-right">{formatNumber(f.previsto_eff_sum)}</td>
                                            <td className="py-1 pr-3 text-right">{formatNumber(f.prodotto_sum)}</td>
                                            <td className={cn("py-1 pr-3 text-right font-semibold", ftone)}>
                                              {fx == null ? "—" : formatNumber(fx, 2)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {!loading && perOperator.length > 0 ? (
                <tfoot>
                  <tr className={cn("border-t", isDark ? "border-slate-800/70" : "border-slate-200")}>
                    <td className="py-2 pr-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">Totale selezione</td>
                    <td className={cn("py-2 pr-3 text-right font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
                      {formatNumber(totalsSelected.sumOre)}
                    </td>
                    <td className={cn("py-2 pr-3 text-right font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
                      {formatNumber(totalsSelected.sumPrev)}
                    </td>
                    <td className={cn("py-2 pr-3 text-right font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
                      {formatNumber(totalsSelected.sumProd)}
                    </td>
                    <td className={cn("py-2 pr-3 text-right font-semibold", isDark ? "text-fuchsia-200" : "text-fuchsia-700")}>
                      {totalsSelected.idx == null ? "—" : formatNumber(totalsSelected.idx, 2)}
                    </td>
                    <td className="py-2 pr-3" />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Prossimo step: trend settimanale (rolling), dispersione (varianza), ranking per squadra (capo/manager).
          </div>
        </div>
      </section>
    </div>
  );
}

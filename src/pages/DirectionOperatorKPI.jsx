// /src/pages/DirectionOperatorKPI.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeLower(s) {
  return String(s || "").toLowerCase();
}

function formatNum(v, digits = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function formatInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function formatDateISO(d) {
  if (!d) return "";
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return String(d);
    return x.toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}

function toISODate(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const da = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function startOfWeekISO(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeekISO(date) {
  const s = startOfWeekISO(date);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

function monthStart(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthEnd(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function yearStart(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), 0, 1);
}

function yearEnd(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), 11, 31);
}

const PERIODS = [
  { id: "day", label: "Giornaliero", view: "direzione_operator_kpi_day_v1" },
  { id: "week", label: "Settimanale (ISO)", view: "direzione_operator_kpi_week_v1" },
  { id: "month", label: "Mensile", view: "direzione_operator_kpi_month_v1" },
  { id: "year", label: "Annuale", view: "direzione_operator_kpi_year_v1" },
];

const UNITS = ["MT", "PZ"];

export default function DirectionOperatorKPI({ isDark = true }) {
  const [period, setPeriod] = useState("week");
  const periodDef = useMemo(() => PERIODS.find((p) => p.id === period) || PERIODS[1], [period]);

  const [anchorDate, setAnchorDate] = useState(() => toISODate(new Date()));
  const [unit, setUnit] = useState("MT");

  // Filters (nullable)
  const [managerId, setManagerId] = useState("");
  const [shipId, setShipId] = useState("");
  const [capoId, setCapoId] = useState("");
  const [commessa, setCommessa] = useState("");
  const [costr, setCostr] = useState("");

  // UI lists
  const [loadingDims, setLoadingDims] = useState(true);
  const [dimError, setDimError] = useState("");

  const [managers, setManagers] = useState([]);
  const [ships, setShips] = useState([]);
  const [capi, setCapi] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("productivity_index");
  const [sortDir, setSortDir] = useState("desc");

  // operator labels cache (join client-side via operators_display_v1)
  const [opMap, setOpMap] = useState(new Map());
  const opMapRef = useRef(opMap);
  useEffect(() => {
    opMapRef.current = opMap;
  }, [opMap]);

  const range = useMemo(() => {
    const d = new Date(`${anchorDate}T00:00:00`);
    if (period === "day") {
      const s = new Date(d);
      const e = new Date(d);
      return { start: toISODate(s), end: toISODate(e) };
    }
    if (period === "week") {
      const s = startOfWeekISO(d);
      const e = endOfWeekISO(d);
      return { start: toISODate(s), end: toISODate(e), week_start: toISODate(s), week_end: toISODate(e) };
    }
    if (period === "month") {
      const s = monthStart(d);
      const e = monthEnd(d);
      return { start: toISODate(s), end: toISODate(e), month_start: toISODate(s), month_end: toISODate(e) };
    }
    const s = yearStart(d);
    const e = yearEnd(d);
    return { start: toISODate(s), end: toISODate(e), year: String(new Date(d).getFullYear()) };
  }, [anchorDate, period]);

  // -----------------------
  // Load dimensions
  // -----------------------
  useEffect(() => {
    let active = true;

    async function loadDims() {
      setLoadingDims(true);
      setDimError("");

      try {
        // MANAGERS: profiles where app_role='MANAGER'
        const { data: mData, error: mErr } = await supabase
          .from("profiles")
          .select("id, display_name, email, app_role, is_active")
          .eq("app_role", "MANAGER")
          .order("display_name", { ascending: true });

        if (mErr) throw mErr;

        // CAPI: profiles where app_role='CAPO'
        const { data: cData, error: cErr } = await supabase
          .from("profiles")
          .select("id, display_name, email, app_role, is_active")
          .eq("app_role", "CAPO")
          .order("display_name", { ascending: true });

        if (cErr) throw cErr;

        // SHIPS: ships table
        const { data: sData, error: sErr } = await supabase
          .from("ships")
          .select("id, code, name, costr, commessa, is_active")
          .order("code", { ascending: true });

        if (sErr) throw sErr;

        if (!active) return;

        setManagers(Array.isArray(mData) ? mData : []);
        setCapi(Array.isArray(cData) ? cData : []);
        setShips(Array.isArray(sData) ? sData : []);
      } catch (e) {
        if (!active) return;
        console.error("[DirectionOperatorKPI] loadDims error:", e);
        setDimError(e?.message || String(e));
        setManagers([]);
        setCapi([]);
        setShips([]);
      } finally {
        if (!active) return;
        setLoadingDims(false);
      }
    }

    loadDims();
    return () => {
      active = false;
    };
  }, []);

  // -----------------------
  // Load operator labels for a set of operator_id
  // -----------------------
  async function hydrateOperators(operatorIds) {
    const ids = (operatorIds || []).filter(Boolean);
    if (ids.length === 0) return;

    const missing = ids.filter((id) => !opMapRef.current.has(String(id)));
    if (missing.length === 0) return;

    // Chunk to avoid query limits
    const CHUNK = 200;
    const nextMap = new Map(opMapRef.current);

    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);

      const { data, error } = await supabase
        .from("operators_display_v1")
        .select("id, display_name, cognome, nome, operator_code, birth_date")
        .in("id", chunk);

      if (error) {
        console.warn("[DirectionOperatorKPI] hydrateOperators error:", error);
        continue;
      }

      for (const r of data || []) {
        const label = r?.display_name || "—";
        nextMap.set(String(r.id), {
          id: r.id,
          label,
          operator_code: r.operator_code || "",
          cognome: r.cognome || "",
          nome: r.nome || "",
          birth_date: r.birth_date || null,
        });
      }
    }

    setOpMap(nextMap);
  }

  // -----------------------
  // Load KPI rows
  // -----------------------
  useEffect(() => {
    let active = true;

    async function loadKpi() {
      setLoading(true);
      setErr("");

      try {
        const view = periodDef.view;

        let q = supabase.from(view).select("*");

        // Unit fixed as decided (MT/PZ)
        if (unit) q = q.eq("unit", unit);

        // Per-period selection
        if (period === "day") {
          q = q.eq("report_date", range.start);
        } else if (period === "week") {
          // view has week_start/week_end
          q = q.eq("week_start", range.week_start);
        } else if (period === "month") {
          q = q.eq("month_start", range.month_start);
        } else {
          // year view has "year"
          q = q.eq("year", Number(range.year));
        }

        // Filters
        if (managerId) q = q.eq("manager_id", managerId);
        if (shipId) q = q.eq("ship_id", shipId);
        if (capoId) q = q.eq("capo_id", capoId);
        if (commessa.trim()) q = q.eq("commessa", commessa.trim());
        if (costr.trim()) q = q.eq("costr", costr.trim());

        // Order server-side (cheap)
        q = q.order("productivity_index", { ascending: false, nullsFirst: false });

        const { data, error } = await q;
        if (error) throw error;

        if (!active) return;

        const list = Array.isArray(data) ? data : [];
        setRows(list);

        const opIds = [...new Set(list.map((r) => r.operator_id).filter(Boolean).map(String))];
        await hydrateOperators(opIds);
      } catch (e) {
        if (!active) return;
        console.error("[DirectionOperatorKPI] loadKpi error:", e);
        setErr(e?.message || String(e));
        setRows([]);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    loadKpi();
    return () => {
      active = false;
    };
  }, [period, periodDef.view, anchorDate, unit, managerId, shipId, capoId, commessa, costr, range]);

  // -----------------------
  // Derived: filtered + sorted
  // -----------------------
  const filtered = useMemo(() => {
    const qq = safeLower(query.trim());
    if (!qq) return rows;

    return rows.filter((r) => {
      const op = opMap.get(String(r.operator_id));
      const name = safeLower(op?.label || "");
      const code = safeLower(op?.operator_code || "");
      const comm = safeLower(r.commessa || "");
      const co = safeLower(r.costr || "");
      return name.includes(qq) || code.includes(qq) || comm.includes(qq) || co.includes(qq);
    });
  }, [rows, query, opMap]);

  const sorted = useMemo(() => {
    const copy = filtered.slice();

    const getV = (r) => {
      const v = r?.[sortKey];
      if (v === null || v === undefined) return null;
      const n = Number(v);
      if (Number.isFinite(n)) return n;
      return v;
    };

    copy.sort((a, b) => {
      const av = getV(a);
      const bv = getV(b);

      if (av === null && bv === null) return 0;
      if (av === null) return sortDir === "asc" ? 1 : -1;
      if (bv === null) return sortDir === "asc" ? -1 : 1;

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }

      const as = safeLower(String(av));
      const bs = safeLower(String(bv));
      if (as < bs) return sortDir === "asc" ? -1 : 1;
      if (as > bs) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return copy;
  }, [filtered, sortKey, sortDir]);

  // -----------------------
  // UI helpers
  // -----------------------
  const panelClass = isDark
    ? "rounded-3xl border border-slate-800 bg-slate-950/20"
    : "rounded-3xl border border-slate-200 bg-white";

  const pill = (active) =>
    cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition",
      isDark
        ? active
          ? "border-emerald-500/60 bg-emerald-950/20 text-emerald-200 shadow-[0_16px_60px_rgba(16,185,129,0.14)]"
          : "border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35"
        : active
        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    );

  const headerKicker = isDark ? "text-slate-500" : "text-slate-500";
  const titleColor = isDark ? "text-slate-100" : "text-slate-900";
  const subColor = isDark ? "text-slate-400" : "text-slate-600";

  const rangeLabel = useMemo(() => {
    if (period === "day") return range.start;
    if (period === "week") return `${range.week_start} → ${range.week_end}`;
    if (period === "month") return `${range.month_start} → ${range.month_end}`;
    return `Anno ${range.year}`;
  }, [period, range]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className={cn("text-[11px] uppercase tracking-[0.26em]", headerKicker)}>
            Direzione · KPI Operatori (Produttività)
          </div>
          <div className={cn("text-xl sm:text-2xl font-semibold", titleColor)}>
            Indice produttività per operatore — {unit}
          </div>
          <div className={cn("text-[12px] sm:text-[13px] max-w-3xl leading-relaxed", subColor)}>
            Valore + qualità + perimetro. Nessun KPI “nudo”. Filtri: Manager / Ship / Capo / Commessa / Costr.
          </div>
        </div>

        <div className={cn(panelClass, "px-3 py-2")}>
          <div className={cn("text-[11px] uppercase tracking-[0.22em]", subColor)}>Periodo</div>
          <div className={cn("mt-1 text-[12px] font-semibold", titleColor)}>{rangeLabel}</div>
        </div>
      </div>

      <div className={cn(panelClass, "p-4 sm:p-5 space-y-4")}>
        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPeriod(p.id)} className={pill(p.id === period)}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {p.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <label className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Data ancora</label>
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className={cn(
                "rounded-full border px-3 py-2 text-[12px] outline-none",
                isDark
                  ? "border-slate-800 bg-slate-950/40 text-slate-100 focus:ring-2 focus:ring-sky-500/35"
                  : "border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/25"
              )}
            />
          </div>
        </div>

        {/* Unit selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Unità</div>
          {UNITS.map((u) => (
            <button key={u} type="button" onClick={() => setUnit(u)} className={pill(u === unit)}>
              {u}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Ricerca (operatore/commessa)</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca… (nome / operator_code / commessa / costr)"
              className={cn(
                "mt-1 w-full rounded-2xl border px-3 py-3 text-[13px] outline-none",
                isDark
                  ? "border-slate-800 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500/35"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/25"
              )}
            />
          </div>

          <div>
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Manager</div>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className={cn(
                "mt-1 w-full rounded-2xl border px-3 py-3 text-[13px] outline-none",
                isDark
                  ? "border-slate-800 bg-slate-950/50 text-slate-100 focus:ring-2 focus:ring-sky-500/35"
                  : "border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/25"
              )}
            >
              <option value="">Tutti</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {(m.display_name || m.email || "—").toString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Ship</div>
            <select
              value={shipId}
              onChange={(e) => setShipId(e.target.value)}
              className={cn(
                "mt-1 w-full rounded-2xl border px-3 py-3 text-[13px] outline-none",
                isDark
                  ? "border-slate-800 bg-slate-950/50 text-slate-100 focus:ring-2 focus:ring-sky-500/35"
                  : "border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/25"
              )}
            >
              <option value="">Tutti</option>
              {ships.map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.code || "—"}${s.name ? ` · ${s.name}` : ""}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Capo</div>
            <select
              value={capoId}
              onChange={(e) => setCapoId(e.target.value)}
              className={cn(
                "mt-1 w-full rounded-2xl border px-3 py-3 text-[13px] outline-none",
                isDark
                  ? "border-slate-800 bg-slate-950/50 text-slate-100 focus:ring-2 focus:ring-sky-500/35"
                  : "border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/25"
              )}
            >
              <option value="">Tutti</option>
              {capi.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.display_name || c.email || "—").toString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Commessa</div>
            <input
              value={commessa}
              onChange={(e) => setCommessa(e.target.value)}
              placeholder="es: SDC"
              className={cn(
                "mt-1 w-full rounded-2xl border px-3 py-3 text-[13px] outline-none",
                isDark
                  ? "border-slate-800 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500/35"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/25"
              )}
            />
          </div>

          <div>
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Costr</div>
            <input
              value={costr}
              onChange={(e) => setCostr(e.target.value)}
              placeholder="es: 6368"
              className={cn(
                "mt-1 w-full rounded-2xl border px-3 py-3 text-[13px] outline-none",
                isDark
                  ? "border-slate-800 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500/35"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/25"
              )}
            />
          </div>
        </div>

        {/* Diagnostics */}
        {loadingDims ? (
          <div className={cn("rounded-2xl border px-3 py-2 text-[12px]", isDark ? "border-slate-800 bg-slate-950/30 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600")}>
            Caricamento dimensioni…
          </div>
        ) : dimError ? (
          <div className={cn("rounded-2xl border px-3 py-2 text-[12px]", isDark ? "border-rose-500/30 bg-rose-950/20 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-800")}>
            Errore dimensioni: {dimError}
          </div>
        ) : null}

        {/* Sort */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Ordina</div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className={cn(
              "rounded-full border px-3 py-2 text-[12px] outline-none",
              isDark
                ? "border-slate-800 bg-slate-950/40 text-slate-100 focus:ring-2 focus:ring-sky-500/35"
                : "border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-sky-500/25"
            )}
          >
            <option value="productivity_index">Indice produttività</option>
            <option value="hours_valid">Ore valide</option>
            <option value="prodotto_alloc_sum">Prodotto allocato</option>
            <option value="tempo_invalid_tokens">Tempo invalid tokens</option>
            <option value="tempo_total_tokens">Tempo total tokens</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className={cn(
              "rounded-full border px-3 py-2 text-[12px] font-semibold",
              isDark ? "border-slate-800 bg-slate-950/40 text-slate-100 hover:bg-slate-900/35" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
            )}
          >
            {sortDir === "asc" ? "Asc" : "Desc"}
          </button>

          <div className="ml-auto">
            <span className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>
              Righe: {sorted.length}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className={cn("overflow-hidden rounded-3xl border", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("px-4 py-3 text-[11px] uppercase tracking-[0.22em]", isDark ? "bg-slate-950/40 text-slate-400" : "bg-slate-50 text-slate-500")}>
            KPI · {periodDef.label} · Unit {unit}
          </div>

          {loading ? (
            <div className={cn("px-4 py-6 text-[12px]", isDark ? "bg-slate-950/20 text-slate-400" : "bg-white text-slate-600")}>
              Caricamento KPI…
            </div>
          ) : err ? (
            <div className={cn("px-4 py-6 text-[12px]", isDark ? "bg-rose-950/20 text-rose-200" : "bg-rose-50 text-rose-800")}>
              Errore KPI: {err}
            </div>
          ) : sorted.length === 0 ? (
            <div className={cn("px-4 py-6 text-[12px]", isDark ? "bg-slate-950/20 text-slate-400" : "bg-white text-slate-600")}>
              Nessun dato per il perimetro selezionato.
            </div>
          ) : (
            <div className={cn(isDark ? "bg-slate-950/15" : "bg-white")}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className={cn(isDark ? "text-slate-400" : "text-slate-500")}>
                    <th className="text-left px-4 py-3">Operatore</th>
                    <th className="text-left px-4 py-3">Operator code</th>
                    <th className="text-right px-4 py-3">Ore</th>
                    <th className="text-right px-4 py-3">Prodotto</th>
                    <th className="text-right px-4 py-3">Indice</th>
                    <th className="text-right px-4 py-3">Qualità tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, idx) => {
                    const op = opMap.get(String(r.operator_id));
                    const label = op?.label || "—";
                    const code = op?.operator_code || "—";

                    const hv = Number(r.hours_valid || 0);
                    const prod = Number(r.prodotto_alloc_sum || 0);
                    const ind = r.productivity_index;

                    const invalid = Number(r.tempo_invalid_tokens || 0);
                    const total = Number(r.tempo_total_tokens || 0);
                    const zero = Number(r.tempo_zero_tokens || 0);

                    const qRatio = total > 0 ? invalid / total : 0;
                    const qClass =
                      total === 0
                        ? isDark
                          ? "border-slate-800 bg-slate-950/40 text-slate-400"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                        : qRatio === 0
                        ? isDark
                          ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : qRatio <= 0.05
                        ? isDark
                          ? "border-amber-500/30 bg-amber-950/20 text-amber-200"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                        : isDark
                        ? "border-rose-500/30 bg-rose-950/20 text-rose-200"
                        : "border-rose-200 bg-rose-50 text-rose-800";

                    return (
                      <tr
                        key={`${r.operator_id}-${idx}`}
                        className={cn("border-t", isDark ? "border-slate-800" : "border-slate-200")}
                      >
                        <td className="px-4 py-3">
                          <div className={cn("font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                            {label}
                          </div>
                          <div className={cn("text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>
                            {r.commessa ? `Commessa: ${r.commessa}` : "Commessa: —"}
                            {r.costr ? ` · COSTR ${r.costr}` : ""}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", isDark ? "border-slate-800 bg-slate-950/30 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-800")}>
                            {code}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">{formatNum(hv, 2)}</td>
                        <td className="px-4 py-3 text-right">{formatNum(prod, 2)}</td>

                        <td className="px-4 py-3 text-right">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", isDark ? "border-sky-500/30 bg-sky-950/20 text-sky-200" : "border-sky-200 bg-sky-50 text-sky-800")}>
                            {ind === null || ind === undefined ? "—" : formatNum(ind, 3)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold", qClass)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", total === 0 ? "bg-slate-400" : qRatio === 0 ? "bg-emerald-400" : qRatio <= 0.05 ? "bg-amber-400" : "bg-rose-400")} />
                            {total === 0
                              ? "No tokens"
                              : `${formatInt(invalid)}/${formatInt(total)} invalid · ${formatInt(zero)} zero`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footnote */}
        <div className={cn("text-[11px] leading-relaxed", subColor)}>
          Regola: <span className={cn(isDark ? "text-slate-200 font-semibold" : "text-slate-900 font-semibold")}>indice = prodotto_alloc / ore_valide</span>.
          Prodotto allocato = quota del prodotto riga ripartita per ore (tempo_hours) tra operatori della stessa riga.
        </div>
      </div>
    </div>
  );
}

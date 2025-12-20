// /src/inca/IncaCockpit.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

import LoadingScreen from "../components/LoadingScreen";
import PercorsoSearchBar from "../components/PercorsoSearchBar";
import ApparatoCaviPopover from "./ApparatoCaviPopover";

// =====================================================
// INCA COCKPIT (UFFICIO) — Percorso-level UI
// =====================================================

// src/inca/incaSituazioni.js
// Source de vérité unique pour les situazioni INCA (labels + ordre)

export const SITUAZIONI_ORDER = ["NP", "T", "P", "R", "B", "E"];

export const SITUAZIONI_LABEL = {
  NP: "Non posato",
  T: "Teorico",
  P: "Posato",
  R: "Rimosso",
  B: "Bloccato",
  E: "Eliminato", // ✅ IMPORTANT: E = ELIMINATO (pas Eseguito)
};


function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMeters(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(n);
}

function colorForSituazione(code) {
  switch (code) {
    case "P":
      return "#34d399";
    case "T":
      return "#38bdf8";
    case "R":
      return "#fbbf24";
    case "B":
      return "#e879f9";
    case "E":
      return "#fb7185";
    case "NP":
    default:
      return "#a855f7";
  }
}

// -----------------------------
// Apparato chip (NO ANIMATION)
// Couleurs = statut (GREEN/YELLOW/RED)
// -----------------------------
function ApparatoChip({ side, value, status, onClick, disabled }) {
  const base =
    "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 " +
    "text-[11px] leading-none select-none focus:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-emerald-300/40";

  const disabledTone = "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed";

  const tone =
    status === "GREEN"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
      : status === "YELLOW"
        ? "border-amber-300/25 bg-amber-400/10 text-amber-200"
        : status === "RED"
          ? "border-rose-300/25 bg-rose-400/10 text-rose-200"
          : "border-white/10 bg-white/5 text-slate-300";

  const dot =
    status === "GREEN"
      ? "bg-emerald-400"
      : status === "YELLOW"
        ? "bg-amber-400"
        : status === "RED"
          ? "bg-rose-400"
          : "bg-slate-400";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[base, disabled ? disabledTone : tone].join(" ")}
      aria-label={
        disabled ? `Apparato ${side} non disponibile` : `Apri apparato ${side}: ${value || ""}`
      }
      title={
        disabled
          ? "Non disponibile"
          : status === "GREEN"
            ? "Tutti i cavi presenti"
            : status === "YELLOW"
              ? "Mancano alcuni cavi (filtri/research)"
              : status === "RED"
                ? "0 cavi (filtri/research)"
                : "Stato"
      }
    >
      <span className={["h-1.5 w-1.5 rounded-full", dot].join(" ")} />
      <span className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-1.5 py-[2px] font-semibold tracking-[0.14em] text-[10px] text-slate-200">
        {side}
      </span>
      <span className="max-w-[210px] truncate font-semibold">{value || "—"}</span>
      <span className="ml-0.5 text-[12px] opacity-70" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

export default function IncaCockpit({ defaultCostr = "", defaultCommessa = "" }) {
  // Filters
  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("");
  const [fileId, setFileId] = useState("");

  const [query, setQuery] = useState("");
  const [onlyP, setOnlyP] = useState(false);
  const [onlyNP, setOnlyNP] = useState(false);

  // Percorso Search (Option A) — preview (CORE 1.0)
  const [percorsoNodes, setPercorsoNodes] = useState([]);
  const [percorsoMatchIds, setPercorsoMatchIds] = useState(null); // Set<string> | null
  const [percorsoLoading, setPercorsoLoading] = useState(false);
  const [percorsoError, setPercorsoError] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState(null);

  // Data
  const [files, setFiles] = useState([]);
  const [cavi, setCavi] = useState([]);

  // Selection
  const [selectedCable, setSelectedCable] = useState(null);

  // UI — modal (zoom) pour le graphe de distribution
  const [isDistribModalOpen, setIsDistribModalOpen] = useState(false);

  // UI — popover apparato (DA/A)
  const [apparatoPopoverOpen, setApparatoPopoverOpen] = useState(false);
  const [apparatoPopoverSide, setApparatoPopoverSide] = useState("DA"); // "DA" | "A"
  const [apparatoPopoverName, setApparatoPopoverName] = useState("");
  const [apparatoAnchorRect, setApparatoAnchorRect] = useState(null);

  // KPI / computed
  const totalMetri = useMemo(() => {
    return (cavi || []).reduce((acc, r) => {
      const m = safeNum(r.metri_totali) || safeNum(r.metri_teo) || safeNum(r.metri_dis) || 0;
      return acc + m;
    }, 0);
  }, [cavi]);

  const totalMetriPosati = useMemo(() => {
    return (cavi || []).reduce((acc, r) => {
      const s = (r.situazione || "").trim();
      if (s !== "P") return acc;
      const m = safeNum(r.metri_totali) || safeNum(r.metri_dis) || safeNum(r.metri_teo) || 0;
      return acc + m;
    }, 0);
  }, [cavi]);

  const loadInfo = useMemo(() => {
    return { pageSize: 1000, maxPages: 50 };
  }, []);

  // Load files
  useEffect(() => {
    let alive = true;

    async function loadFiles() {
      setLoadingFiles(true);
      setError(null);

      try {
        const { data, error: e } = await supabase
          .from("inca_files")
          .select("id,costr,commessa,file_name,uploaded_at")
          .order("uploaded_at", { ascending: false })
          .limit(100);

        if (e) throw e;
        if (!alive) return;

        const list = Array.isArray(data) ? data : [];
        setFiles(list);

        const initialCostr = defaultCostr || list[0]?.costr || "";
        const initialCommessa = defaultCommessa || list[0]?.commessa || "";

        setCostr(initialCostr);
        setCommessa(initialCommessa);

        const firstMatching = list.find(
          (f) => (f.costr || "") === initialCostr && (f.commessa || "") === initialCommessa
        );

        const chosen = firstMatching || list[0];
        if (chosen?.id) setFileId(chosen.id);
      } catch (err) {
        console.error("[IncaCockpit] loadFiles error:", err);
        if (!alive) return;
        setFiles([]);
        setError("Impossibile caricare la lista file INCA.");
      } finally {
        if (!alive) return;
        setLoadingFiles(false);
      }
    }

    loadFiles();

    return () => {
      alive = false;
    };
  }, [defaultCostr, defaultCommessa]);

  // Load cavi (batched)
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function loadCavi() {
      if (!fileId) return;

      setLoading(true);
      setError(null);
      setSelectedCable(null);

      try {
        const all = [];
        let page = 0;

        while (page < loadInfo.maxPages) {
          const from = page * loadInfo.pageSize;
          const to = from + loadInfo.pageSize - 1;

          const { data, error: e } = await supabase
            .from("inca_cavi")
            .select(
              "id,inca_file_id,costr,commessa,codice,rev_inca,descrizione,impianto,tipo,sezione,zona_da,zona_a,apparato_da,apparato_a,descrizione_da,descrizione_a,metri_teo,metri_dis,metri_totali,marca_cavo,livello,wbs,situazione"
            )
            .eq("inca_file_id", fileId)
            .order("codice", { ascending: true })
            .range(from, to)
            .abortSignal(ac.signal);

          if (e) throw e;

          const chunk = Array.isArray(data) ? data : [];
          all.push(...chunk);

          if (chunk.length === 0) break;
          if (chunk.length < loadInfo.pageSize) break;

          page++;
        }

        if (!alive) return;
        setCavi(all);
      } catch (err) {
        console.error("[IncaCockpit] loadCavi error:", err);
        if (!alive) return;
        setCavi([]);
        setError("Impossibile caricare i cavi INCA.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadCavi();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [fileId, loadInfo.maxPages, loadInfo.pageSize]);

  // Percorso Search
  useEffect(() => {
    let alive = true;

    async function run() {
      const nodes = Array.isArray(percorsoNodes)
        ? percorsoNodes.map((x) => String(x || "").trim().toUpperCase()).filter(Boolean)
        : [];

      if (!fileId || nodes.length === 0) {
        setPercorsoLoading(false);
        setPercorsoError(null);
        setPercorsoMatchIds(null);
        return;
      }

      setPercorsoLoading(true);
      setPercorsoError(null);
      setPercorsoMatchIds(null);

      try {
        const { data, error: e } = await supabase.rpc("inca_search_cavi_by_nodes", {
          p_inca_file_id: fileId,
          p_nodes: nodes,
        });

        if (e) throw e;
        if (!alive) return;

        const list = Array.isArray(data) ? data : [];
        const ids = new Set(list.map((r) => r?.id).filter(Boolean));
        setPercorsoMatchIds(ids);
      } catch (err) {
        console.error("[IncaCockpit] percorso search error:", err);
        if (!alive) return;
        setPercorsoError("Errore ricerca percorso.");
        setPercorsoMatchIds(new Set());
      } finally {
        if (!alive) return;
        setPercorsoLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [fileId, percorsoNodes]);

  // Derived: filter + KPI
  const filteredCavi = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    const nodesActive = Array.isArray(percorsoNodes) && percorsoNodes.length > 0;

    return (cavi || []).filter((r) => {
      if (nodesActive) {
        if (!percorsoMatchIds) return false;
        if (!percorsoMatchIds.has(r.id)) return false;
      }

      const situ = (r.situazione || "").trim();
      const isP = situ === "P";
      const isNP = !situ || situ === "NP";

      if (onlyP && !isP) return false;
      if (onlyNP && !isNP) return false;

      if (!q) return true;

      const hay = [
        r.codice,
        r.rev_inca,
        r.descrizione,
        r.impianto,
        r.tipo,
        r.sezione,
        r.zona_da,
        r.zona_a,
        r.apparato_da,
        r.apparato_a,
        r.descrizione_da,
        r.descrizione_a,
        r.marca_cavo,
        r.livello,
        r.wbs,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [cavi, query, onlyP, onlyNP, percorsoNodes, percorsoMatchIds]);

  const totalCavi = filteredCavi.length;

  const distrib = useMemo(() => {
    const map = new Map();
    for (const code of SITUAZIONI_ORDER) map.set(code, 0);

    for (const r of filteredCavi) {
      const s = (r.situazione || "").trim();
      const key = s && SITUAZIONI_ORDER.includes(s) ? s : "NP";
      map.set(key, (map.get(key) || 0) + 1);
    }

    return SITUAZIONI_ORDER.map((k) => ({
      code: k,
      label: SITUAZIONI_LABEL[k] || k,
      count: map.get(k) || 0,
    }));
  }, [filteredCavi]);

  const distribTotal = useMemo(() => distrib.reduce((acc, d) => acc + (d.count || 0), 0), [distrib]);

  const done = useMemo(() => {
    return filteredCavi.reduce((acc, r) => {
      const s = (r.situazione || "").trim();
      return acc + (s === "P" ? 1 : 0);
    }, 0);
  }, [filteredCavi]);

  const nonPosati = useMemo(() => totalCavi - done, [totalCavi, done]);

  const prodPercent = useMemo(() => {
    if (!distribTotal) return 0;
    return (done / distribTotal) * 100;
  }, [done, distribTotal]);

  // ---------------------------------------------------
  // Apparato status maps (3 couleurs) — NO ANIMATION
  // visible = count dans filteredCavi
  // total   = count dans cavi
  // ---------------------------------------------------
  const apparatoStats = useMemo(() => {
    const all = Array.isArray(cavi) ? cavi : [];
    const vis = Array.isArray(filteredCavi) ? filteredCavi : [];

    const totalsDA = new Map();
    const totalsA = new Map();
    const visibleDA = new Map();
    const visibleA = new Map();

    for (const r of all) {
      const da = String(r.apparato_da || "").trim();
      const a = String(r.apparato_a || "").trim();
      if (da) totalsDA.set(da, (totalsDA.get(da) || 0) + 1);
      if (a) totalsA.set(a, (totalsA.get(a) || 0) + 1);
    }

    for (const r of vis) {
      const da = String(r.apparato_da || "").trim();
      const a = String(r.apparato_a || "").trim();
      if (da) visibleDA.set(da, (visibleDA.get(da) || 0) + 1);
      if (a) visibleA.set(a, (visibleA.get(a) || 0) + 1);
    }

    function statusFor(side, name) {
      const key = String(name || "").trim();
      if (!key) return { total: 0, visible: 0, status: "RED" };

      const total = side === "DA" ? (totalsDA.get(key) || 0) : (totalsA.get(key) || 0);
      const visible = side === "DA" ? (visibleDA.get(key) || 0) : (visibleA.get(key) || 0);

      if (visible === 0) return { total, visible, status: "RED" };
      if (total > 0 && visible < total) return { total, visible, status: "YELLOW" };
      return { total, visible, status: "GREEN" };
    }

    return { statusFor };
  }, [cavi, filteredCavi]);

  // Open popover (DA/A) — STOP BUBBLING
  function openApparatoPopover(e, side, apparatoName) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const name = String(apparatoName || "").trim();
    if (!name) return;

    const rect = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;

    setApparatoAnchorRect(rect);
    setApparatoPopoverSide(side);
    setApparatoPopoverName(name);
    setApparatoPopoverOpen(true);
  }

  return (
    <div className="p-3">
      {/* Title + meta */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">INCA Cockpit</div>
            <div className="text-2xl font-semibold text-slate-50 leading-tight">Percorso-level overview</div>
            <div className="text-[12px] text-slate-400 mt-1">KPI + filtraggio rapido. (CORE 1.0)</div>
          </div>

          <div className="text-right text-[11px]">
            {loadingFiles ? (
              <span className="text-slate-400">Caricamento file…</span>
            ) : (
              <span className="text-slate-400">
                File: <span className="text-slate-200 font-semibold">{files?.length || 0}</span>
              </span>
            )}
            <div className="mt-1">
              {loading ? (
                <span className="text-slate-400">Caricamento cavi (batch {loadInfo.pageSize})…</span>
              ) : (
                <span className="text-slate-400">
                  Cavi caricati: <span className="text-slate-200 font-semibold">{cavi?.length || 0}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3">
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Filtri</div>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-slate-400 block mb-1">File INCA</label>
              <select
                value={fileId}
                onChange={(e) => {
                  const v = e.target.value;
                  setFileId(v);
                  const f = (files || []).find((x) => x.id === v);
                  if (f) {
                    setCostr(f.costr || "");
                    setCommessa(f.commessa || "");
                  }
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
              >
                {(files || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {(f.costr || "—") + " · " + (f.commessa || "—") + " · " + (f.file_name || "file")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] text-slate-400 block mb-1">COSTR</label>
                <input
                  value={costr}
                  onChange={(e) => setCostr(e.target.value)}
                  placeholder="es: 6368"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                />
              </div>
              <div>
                <label className="text-[12px] text-slate-400 block mb-1">COMMESSA</label>
                <input
                  value={commessa}
                  onChange={(e) => setCommessa(e.target.value)}
                  placeholder="es: SDC"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] text-slate-400 block mb-1">
                Ricerca (codice / zona / apparato / descrizione)
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Es: CAV-..., QUADRO, PONTE, ..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
              />
            </div>

            <PercorsoSearchBar
              incaFileId={fileId}
              value={percorsoNodes}
              onChange={setPercorsoNodes}
              disabled={loading || !fileId}
              loading={percorsoLoading}
              matchCount={percorsoMatchIds ? percorsoMatchIds.size : 0}
              error={percorsoError}
            />

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-[12px] text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyP}
                  onChange={(e) => {
                    setOnlyP(e.target.checked);
                    if (e.target.checked) setOnlyNP(false);
                  }}
                />
                Solo P
              </label>
              <label className="inline-flex items-center gap-2 text-[12px] text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyNP}
                  onChange={(e) => {
                    setOnlyNP(e.target.checked);
                    if (e.target.checked) setOnlyP(false);
                  }}
                />
                Solo NP
              </label>

              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOnlyP(false);
                  setOnlyNP(false);
                  setPercorsoNodes([]);
                }}
                className="ml-auto rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
              >
                Reset
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-[12px] text-amber-200">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* KPIs + Chart */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Panorama INCA</div>
              <div className="text-[11px] text-slate-400">
                Distribuzione T / P / R / B / E / NP (clic per ingrandire).
              </div>
            </div>
            <div className="text-right text-[11px]">
              <div className="text-slate-400">
                Cavi totali: <span className="text-slate-100 font-semibold">{totalCavi}</span>
              </div>
              <div className="text-slate-400">
                Posati (P): <span className="text-emerald-300 font-semibold">{done}</span>
              </div>
              <div className="text-slate-400">
                Non posati (NP): <span className="text-purple-300 font-semibold">{nonPosati}</span>
              </div>
              <div className="text-slate-400">
                Tot. metri dis.: <span className="text-slate-100 font-semibold">{formatMeters(totalMetri)}</span>
              </div>
              <div className="text-slate-400">
                Metri posati: <span className="text-emerald-200 font-semibold">{formatMeters(totalMetriPosati)}</span>
              </div>
            </div>
          </div>

          {/* Baromètre (pas d’animation, juste width change instantané) */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>Produzione globale (P / tutti)</span>
                <span className="text-sky-300 font-semibold">{prodPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, prodPercent)}%`, backgroundColor: colorForSituazione("P") }}
                />
              </div>
            </div>
          </div>

          {distrib.length > 0 && (
            <div
              className="h-28 mt-3 rounded-xl border border-slate-800 bg-slate-950/40 cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => setIsDistribModalOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setIsDistribModalOpen(true);
              }}
              title="Apri il grafico in grande"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distrib}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="code" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(2,6,23,0.92)",
                      border: "1px solid rgba(51,65,85,0.8)",
                      borderRadius: 12,
                      color: "#e2e8f0",
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value}`, "Cavi"]}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {distrib.map((d) => (
                      <Cell key={d.code} fill={colorForSituazione(d.code)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {distrib.map((d) => (
              <span
                key={d.code}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-2 py-1 text-[11px]"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForSituazione(d.code) }} />
                <span className="text-slate-300 font-semibold">{d.code}</span>
                <span className="text-slate-400">{d.label}</span>
                <span className="text-sky-300 font-semibold">{d.count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">Cavi ({filteredCavi.length})</div>
            {Array.isArray(percorsoNodes) && percorsoNodes.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                <span className="text-slate-200 font-semibold">Percorso</span>
                <span className="text-slate-400">
                  {percorsoLoading ? "ricerca…" : `${percorsoMatchIds ? percorsoMatchIds.size : 0} match`}
                </span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500">Click riga → dettagli</div>
        </div>

        {loading ? (
          <div className="p-4">
            <LoadingScreen message="Caricamento cavi…" />
          </div>
        ) : (
          <div className="max-h-[62vh] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-950/90 backdrop-blur border-b border-slate-800">
                <tr className="text-left text-[11px] text-slate-500">
                  <th className="px-3 py-2">Codice</th>
                  <th className="px-3 py-2">Rev</th>
                  <th className="px-3 py-2">Zona</th>
                  <th className="px-3 py-2">Da → A</th>
                  <th className="px-3 py-2">Marca</th>
                  <th className="px-3 py-2">Situaz.</th>
                  <th className="px-3 py-2 text-right">m teo</th>
                </tr>
              </thead>

              <tbody>
                {filteredCavi.map((r) => {
                  const s = (r.situazione || "").trim();
                  const situ = s && SITUAZIONI_ORDER.includes(s) ? s : "NP";

                  const appDA = String(r.apparato_da || "").trim();
                  const appA = String(r.apparato_a || "").trim();

                  const statDA = apparatoStats.statusFor("DA", appDA);
                  const statA = apparatoStats.statusFor("A", appA);

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-900/80 cursor-pointer"
                      onClick={() => setSelectedCable(r)}
                    >
                      <td className="px-3 py-2 text-[12px] text-slate-100 font-semibold">{r.codice}</td>
                      <td className="px-3 py-2 text-[12px] text-slate-300">{r.rev_inca || "—"}</td>
                      <td className="px-3 py-2 text-[12px] text-slate-300">{r.zona_da || r.zona_a || "—"}</td>

                      <td className="px-3 py-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <ApparatoChip
                            side="DA"
                            value={appDA || "—"}
                            status={appDA ? statDA.status : "RED"}
                            disabled={!appDA}
                            onClick={(e) => openApparatoPopover(e, "DA", appDA)}
                          />
                          <span className="hidden md:inline text-slate-600" aria-hidden="true">
                            →
                          </span>
                          <ApparatoChip
                            side="A"
                            value={appA || "—"}
                            status={appA ? statA.status : "RED"}
                            disabled={!appA}
                            onClick={(e) => openApparatoPopover(e, "A", appA)}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-300">{r.marca_cavo || "—"}</td>

                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[11px]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForSituazione(situ) }} />
                          <span className="text-slate-200 font-semibold">{situ}</span>
                        </span>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-200 text-right">
                        {formatMeters(r.metri_teo || r.metri_dis)}
                      </td>
                    </tr>
                  );
                })}

                {filteredCavi.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-[12px] text-slate-500">
                      Nessun cavo trovato con i filtri correnti.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details panel */}
      {selectedCable && (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wide">Dettaglio cavo</div>
              <div className="text-lg font-semibold text-slate-50">{selectedCable.codice}</div>
              <div className="text-[12px] text-slate-400">{selectedCable.descrizione || "—"}</div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCable(null)}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
            >
              Chiudi
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Situazione</div>
              <div className="text-[13px] text-slate-100 font-semibold">{(selectedCable.situazione || "NP").trim() || "NP"}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Metri teo</div>
              <div className="text-[13px] text-slate-100 font-semibold">
                {formatMeters(selectedCable.metri_teo || selectedCable.metri_dis)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Marca / Tipo</div>
              <div className="text-[13px] text-slate-100 font-semibold">
                {(selectedCable.marca_cavo || "—") + " · " + (selectedCable.tipo || "—")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — zoom graphe distribuzione */}
      {isDistribModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 backdrop-blur-md p-2"
          role="dialog"
          aria-modal="true"
          aria-label="Dettaglio distribuzione INCA"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsDistribModalOpen(false);
          }}
        >
          <div className="w-[min(98vw,1400px)] h-[92vh] overflow-auto rounded-2xl border border-slate-700 bg-slate-950/80 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-950/75 px-4 py-3 backdrop-blur">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Panorama INCA — Distribuzione</div>
                <div className="text-lg font-semibold text-slate-50 leading-tight">Situazioni T / P / R / B / E / NP</div>
                <div className="text-[12px] text-slate-400 mt-1">
                  Totale: <span className="text-slate-100 font-semibold">{totalCavi}</span> · Posati (P):{" "}
                  <span className="text-emerald-300 font-semibold">{done}</span> · Non posati (NP):{" "}
                  <span className="text-purple-300 font-semibold">{nonPosati}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDistribModalOpen(false)}
                className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-[12px] text-slate-200"
              >
                Chiudi
              </button>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3">
                <div className="h-[520px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distrib}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="code" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(2,6,23,0.92)",
                          border: "1px solid rgba(51,65,85,0.8)",
                          borderRadius: 12,
                          color: "#e2e8f0",
                          fontSize: 12,
                        }}
                        formatter={(value) => [`${value}`, "Cavi"]}
                      />
                      <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                        {distrib.map((d) => (
                          <Cell key={d.code} fill={colorForSituazione(d.code)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {distrib.map((d) => (
                    <span
                      key={d.code}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-2 py-1 text-[11px]"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForSituazione(d.code) }} />
                      <span className="text-slate-300 font-semibold">{d.code}</span>
                      <span className="text-slate-400">{d.label}</span>
                      <span className="text-sky-300 font-semibold">{d.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 px-1">
                Nota: i filtri (Ricerca / Solo P / Solo NP / Percorso Search) influenzano il grafico.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPARATO POPOVER (DA/A) */}
      <ApparatoCaviPopover
        open={apparatoPopoverOpen}
        anchorRect={apparatoAnchorRect}
        incaFileId={fileId}
        side={apparatoPopoverSide}
        apparato={apparatoPopoverName}
        onClose={() => setApparatoPopoverOpen(false)}
      />
    </div>
  );
}

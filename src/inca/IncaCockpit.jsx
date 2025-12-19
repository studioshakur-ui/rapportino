// src/inca/IncaCockpit.jsx
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
import IncaCaviTable from "./IncaCaviTable";

// =====================================================
// INCA COCKPIT (UFFICIO) — Percorso-level UI
// =====================================================

const SITUAZIONI_ORDER = ["T", "P", "R", "B", "E", "NP"];

const SITUAZIONI_LABEL = {
  T: "Teorico",
  P: "Posato",
  R: "Rimosso",
  B: "Bloccato",
  E: "Eseguito",
  NP: "Non posato",
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMeters(v) {
  const n = safeNum(v);
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(2)} km`;
  return `${n.toFixed(0)} m`;
}

// (gardé car tu l’avais, utile plus tard pour KPI semaine)
function isoWeek(dateLike) {
  try {
    const d = new Date(dateLike);
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return { year: date.getUTCFullYear(), week: weekNo };
  } catch {
    return null;
  }
}

/**
 * Fetch paginé "ALL ROWS" pour éviter la fenêtre implicite (≈1000) de PostgREST.
 * - range() est obligatoire
 * - order stable (codice + id) pour éviter pages qui bougent
 * - on boucle jusqu'à batch < pageSize
 */
async function fetchAllIncaCavi({
  fileId,
  costr,
  commessa,
  pageSize = 1000,
  signal,
}) {
  const rows = [];
  let from = 0;

  // Colonnes réellement utilisées par l'UI (table + recherche + détails)
  // Réduire le payload évite de saturer le réseau sur gros fichiers.
  const SELECT_COLS = [
    "id",
    "inca_file_id",
    "costr",
    "commessa",
    "codice",
    "rev_inca",
    "descrizione",
    "impianto",
    "tipo",
    "sezione",
    "zona_da",
    "zona_a",
    "apparato_da",
    "apparato_a",
    "descrizione_da",
    "descrizione_a",
    "marca_cavo",
    "livello",
    "wbs",
    "situazione",
    "metri_totali",
    "metri_teo",
    "metri_dis",
    "metri_posati_teorici",
    "metri_sta",
    "metri_sit_cavo",
    "metri_sit_tec",
    "pagina_pdf",
  ].join(",");

  while (true) {
    let q = supabase
      .from("inca_cavi")
      .select(SELECT_COLS)
      .order("codice", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (fileId) q = q.eq("inca_file_id", fileId);
    if (costr) q = q.eq("costr", costr);
    if (commessa) q = q.eq("commessa", commessa);

    const { data, error } = await q;
    if (error) throw error;

    const batch = data || [];
    rows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;

    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
  }

  return rows;
}

export default function IncaCockpit({
  mode, // "modal" | undefined
  fileId: fileIdProp, // pilotage externe
  onRequestClose,
}) {
  // Filters
  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("");
  const [fileId, setFileId] = useState("");

  const [query, setQuery] = useState("");
  const [onlyP, setOnlyP] = useState(false);
  const [onlyNP, setOnlyNP] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState(null);

  // Data
  const [files, setFiles] = useState([]);
  const [cavi, setCavi] = useState([]);

  // UI — modal (zoom) pour le graphe de distribution
  const [isDistribModalOpen, setIsDistribModalOpen] = useState(false);

  // KPI / computed
  const [lunghezzaMax, setLunghezzaMax] = useState(0); // 0 = no limit

  // UX: progress (utile sur gros fichiers)
  const [loadInfo, setLoadInfo] = useState({
    loaded: 0,
    pageSize: 1000,
    running: false,
  });

  const isModal = mode === "modal";

  // ---------------------------
  // Helpers (colors)
  // ---------------------------
  const colorForSituazione = (s) => {
    switch (s) {
      case "P":
        return "#10b981"; // emerald
      case "T":
        return "#38bdf8"; // sky
      case "R":
        return "#f97316"; // orange
      case "B":
        return "#ef4444"; // red
      case "E":
        return "#facc15"; // yellow
      case "NP":
      default:
        return "#a855f7"; // purple
    }
  };

  // ---------------------------
  // Sync fileId from prop (external control)
  // ---------------------------
  useEffect(() => {
    if (!fileIdProp) return;
    setFileId((current) => (current === fileIdProp ? current : fileIdProp));
  }, [fileIdProp]);

  // ---------------------------
  // UX: fermeture modal (ESC) + lock scroll (for distrib zoom)
  // ---------------------------
  useEffect(() => {
    if (!isDistribModalOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsDistribModalOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isDistribModalOpen]);

  // ---------------------------
  // Load files (inca_files)
  // ---------------------------
  useEffect(() => {
    let alive = true;

    async function loadFiles() {
      setLoadingFiles(true);
      try {
        const { data, error: e } = await supabase
          .from("inca_files")
          .select("*")
          .order("uploaded_at", { ascending: false });

        if (e) throw e;

        if (!alive) return;
        const list = data || [];
        setFiles(list);

        const prefer = fileIdProp || fileId;
        if (prefer) {
          const exists = list.find((x) => x.id === prefer);
          if (exists) {
            setFileId(exists.id);
            setCostr(exists.costr || "");
            setCommessa(exists.commessa || "");
            return;
          }
        }

        if (!fileId && list.length > 0) {
          const first = list[0];
          setFileId(first.id);
          setCostr(first.costr || "");
          setCommessa(first.commessa || "");
        }
      } catch (err) {
        console.error("[IncaCockpit] loadFiles error:", err);
        if (!alive) return;
        setError("Impossible de charger la liste des fichiers INCA.");
      } finally {
        if (alive) setLoadingFiles(false);
      }
    }

    loadFiles();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // Load cavi (inca_cavi) for selected file/costr/commessa
  // FIX: paginated fetch to avoid implicit ~1000 window
  // ---------------------------
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function loadCavi() {
      if (!fileId && !costr && !commessa) return;

      setLoading(true);
      setError(null);
      setLoadInfo({ loaded: 0, pageSize: 1000, running: true });

      try {
        const rows = await fetchAllIncaCavi({
          fileId,
          costr,
          commessa,
          pageSize: 1000,
          signal: ac.signal,
        });

        if (!alive) return;

        setCavi(rows);
        setLoadInfo({ loaded: rows.length, pageSize: 1000, running: false });

        const maxM = rows.reduce((acc, r) => {
          const m = safeNum(r.metri_teo) || safeNum(r.metri_dis) || 0;
          return Math.max(acc, m);
        }, 0);
        setLunghezzaMax(maxM);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("[IncaCockpit] loadCavi error:", err);
        if (!alive) return;
        setError("Impossible de charger les câbles INCA.");
        setCavi([]);
        setLoadInfo({ loaded: 0, pageSize: 1000, running: false });
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadCavi();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [fileId, costr, commessa]);

  // ---------------------------
  // Derived: filter + KPI
  // ---------------------------
  const filteredCavi = useMemo(() => {
    const q = (query || "").trim().toLowerCase();

    return (cavi || []).filter((r) => {
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
  }, [cavi, query, onlyP, onlyNP]);

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

  const distribTotal = useMemo(
    () => distrib.reduce((acc, d) => acc + (d.count || 0), 0),
    [distrib]
  );

  const done = useMemo(() => {
    return filteredCavi.reduce((acc, r) => {
      const s = (r.situazione || "").trim();
      return acc + (s === "P" ? 1 : 0);
    }, 0);
  }, [filteredCavi]);

  const nonPosati = useMemo(() => totalCavi - done, [totalCavi, done]);

  const totalMetri = useMemo(() => {
    return filteredCavi.reduce((acc, r) => {
      const m =
        safeNum(r.metri_totali) ||
        safeNum(r.metri_teo) ||
        safeNum(r.metri_dis) ||
        0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const totalMetriPosati = useMemo(() => {
    return filteredCavi.reduce((acc, r) => {
      const s = (r.situazione || "").trim();
      if (s !== "P") return acc;
      const m =
        safeNum(r.metri_posati_teorici) ||
        safeNum(r.metri_sta) ||
        safeNum(r.metri_sit_cavo) ||
        safeNum(r.metri_sit_tec) ||
        0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const prodPercent = useMemo(() => {
    if (!totalCavi) return 0;
    return (done / totalCavi) * 100;
  }, [done, totalCavi]);

  const selectedFile = useMemo(() => {
    return (files || []).find((f) => f.id === fileId) || null;
  }, [files, fileId]);

  // ---------------------------
  // UI
  // ---------------------------
  if (loadingFiles) {
    return <LoadingScreen message="Caricamento file INCA…" />;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4">
      {/* Optional modal header */}
      {isModal && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
              Ufficio · INCA Cockpit (fullscreen)
            </div>
            <div className="text-[12px] text-slate-300">
              {selectedFile?.costr || "—"} · {selectedFile?.commessa || "—"} ·{" "}
              <span className="text-slate-400">
                {selectedFile?.file_name || "—"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRequestClose?.()}
            className="shrink-0 rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/70"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            Ufficio · INCA Cockpit
          </div>
          <div className="text-2xl font-semibold text-slate-50">
            Panorama INCA
          </div>
          <div className="text-[12px] text-slate-400 mt-1">
            Seleziona file, filtra, e analizza la situazione reale.
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-slate-500">Ship</div>
          <div className="text-[13px] text-slate-200 font-semibold">
            {selectedFile?.costr || costr || "—"} ·{" "}
            {selectedFile?.commessa || commessa || "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            File:{" "}
            <span className="text-slate-300">
              {selectedFile?.file_name || "—"}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 mt-1">
            {loading ? (
              <span className="text-slate-400">
                Caricamento cavi (batch {loadInfo.pageSize})…
              </span>
            ) : (
              <span className="text-slate-400">
                Cavi caricati:{" "}
                <span className="text-slate-200 font-semibold">
                  {cavi?.length || 0}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">
            Filtri
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-slate-400 block mb-1">
                File INCA
              </label>
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
                    {(f.costr || "—") +
                      " · " +
                      (f.commessa || "—") +
                      " · " +
                      (f.file_name || "file")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] text-slate-400 block mb-1">
                  COSTR
                </label>
                <input
                  value={costr}
                  onChange={(e) => setCostr(e.target.value)}
                  placeholder="es: 6368"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                />
              </div>
              <div>
                <label className="text-[12px] text-slate-400 block mb-1">
                  COMMESSA
                </label>
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
                }}
                className="ml-auto rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-950/80"
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
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Panorama INCA
              </div>
              <div className="text-[11px] text-slate-400">
                Distribuzione T / P / R / B / E / NP (clic per ingrandire).
              </div>
            </div>
            <div className="text-right text-[11px]">
              <div className="text-slate-400">
                Cavi totali:{" "}
                <span className="text-slate-100 font-semibold">{totalCavi}</span>
              </div>
              <div className="text-slate-400">
                Posati (P):{" "}
                <span className="text-emerald-300 font-semibold">{done}</span>
              </div>
              <div className="text-slate-400">
                Non posati (NP):{" "}
                <span className="text-purple-300 font-semibold">{nonPosati}</span>
              </div>
              <div className="text-slate-400">
                Tot. metri dis.:{" "}
                <span className="text-slate-100 font-semibold">
                  {formatMeters(totalMetri)}
                </span>
              </div>
              <div className="text-slate-400">
                Metri posati:{" "}
                <span className="text-emerald-200 font-semibold">
                  {formatMeters(totalMetriPosati)}
                </span>
              </div>
            </div>
          </div>

          {/* Baromètre de production */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>Produzione globale (P / tutti)</span>
                <span className="text-sky-300 font-semibold">
                  {prodPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, prodPercent)}%`,
                    backgroundColor: colorForSituazione("P"),
                  }}
                />
              </div>
            </div>
          </div>

          {/* Graphe barres */}
          {distrib.length > 0 && (
            <div
              className="h-28 mt-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 transition cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => setIsDistribModalOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  setIsDistribModalOpen(true);
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

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2">
            {distrib.map((d) => (
              <span
                key={d.code}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-2 py-1 text-[11px]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorForSituazione(d.code) }}
                />
                <span className="text-slate-300 font-semibold">{d.code}</span>
                <span className="text-slate-400">{d.label}</span>
                <span className="text-sky-300 font-semibold">{d.count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ NEW TABLE (clic APP → popup) */}
      <div className="mt-3">
        <IncaCaviTable cavi={filteredCavi} loading={loading} incaFileId={fileId} />
      </div>

      {/* ===================================================== */}
      {/* MODAL — zoom graphe distribuzione (giant glass) */}
      {/* ===================================================== */}
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
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">
                  Panorama INCA — Distribuzione
                </div>
                <div className="text-lg font-semibold text-slate-50 leading-tight">
                  Situazioni T / P / R / B / E / NP
                </div>
                <div className="text-[12px] text-slate-400 mt-1">
                  Totale:{" "}
                  <span className="text-slate-100 font-semibold">{totalCavi}</span>{" "}
                  · Posati (P):{" "}
                  <span className="text-emerald-300 font-semibold">{done}</span>{" "}
                  · Non posati (NP):{" "}
                  <span className="text-purple-300 font-semibold">{nonPosati}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDistribModalOpen(false)}
                className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/70"
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
                        formatter={(value) => {
                          const count = Number(value || 0);
                          const pct = distribTotal > 0 ? (count / distribTotal) * 100 : 0;
                          return [`${count} (${pct.toFixed(1)}%)`, "Cavi"];
                        }}
                      />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                        {distrib.map((d) => (
                          <Cell key={d.code} fill={colorForSituazione(d.code)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {distrib.map((d) => {
                    const pct = distribTotal > 0 ? (d.count / distribTotal) * 100 : 0;
                    return (
                      <div
                        key={d.code}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: colorForSituazione(d.code) }}
                          />
                          <span className="text-[12px] text-slate-200">
                            <span className="font-semibold">{d.code}</span>{" "}
                            <span className="text-slate-500">{d.label ? `· ${d.label}` : ""}</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[12px] font-semibold text-slate-100">{d.count}</div>
                          <div className="text-[11px] text-slate-500">{pct.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 mt-3">
                  Astuce: ESC pour fermer, ou clic fuori dal pannello.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

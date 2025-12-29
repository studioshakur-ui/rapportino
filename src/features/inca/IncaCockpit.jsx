import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

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

import LoadingScreen from "../../components/LoadingScreen";
import ApparatoCaviPopover from "./ApparatoCaviPopover";
import { ApparatoPill, CodicePill, computeApparatoPMaps } from "../inca/IncaPills";

// =====================================================
// INCA COCKPIT (UFFICIO) — SIMPLIFIED (Option 2)
// - Same architecture as CAPO: single batched load, no meta enrichment
// - Source is VIEW: inca_cavi_with_last_posa_and_capo_v1
//   (adds data_posa + capo_label)
// =====================================================

export const SITUAZIONI_ORDER = ["NP", "T", "P", "R", "B", "E"];

export const SITUAZIONI_LABEL = {
  NP: "Non posato",
  T: "Terminato",
  P: "Posato",
  R: "Rimosso",
  B: "Bloccato",
  E: "Eliminato",
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

function formatDateIT(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
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

function norm(v) {
  return String(v ?? "").trim();
}

function tipoCavoLabel(r) {
  const t = norm(r?.tipo);
  if (t) return t;
  const m = norm(r?.marca_cavo);
  if (m) return m;
  return "—";
}

export default function IncaCockpit() {
  const navigate = useNavigate();

  // Filters
  const [fileId, setFileId] = useState("");
  const [files, setFiles] = useState([]);

  const [query, setQuery] = useState("");
  const [onlyP, setOnlyP] = useState(false);
  const [onlyNP, setOnlyNP] = useState(false);

  // Data
  const [cavi, setCavi] = useState([]);

  // Loading / errors
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection
  const [selectedCable, setSelectedCable] = useState(null);

  // UI — chart modal
  const [isDistribModalOpen, setIsDistribModalOpen] = useState(false);

  // UI — apparato popover
  const [apparatoPopoverOpen, setApparatoPopoverOpen] = useState(false);
  const [apparatoPopoverSide, setApparatoPopoverSide] = useState("DA");
  const [apparatoPopoverName, setApparatoPopoverName] = useState("");
  const [apparatoAnchorRect, setApparatoAnchorRect] = useState(null);

  // Batched loading rules (pageSize <= 1000 to defeat PostgREST caps)
  const loadInfo = useMemo(() => ({ pageSize: 1000, maxPages: 200 }), []);

  // 1) load files
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
          .limit(200);

        if (e) throw e;
        if (!alive) return;

        const list = Array.isArray(data) ? data : [];
        setFiles(list);

        if (!fileId && list[0]?.id) setFileId(list[0].id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) load cavi by fileId (batched, no 1000 ceiling)
  // IMPORTANT: source is VIEW inca_cavi_with_last_posa_and_capo_v1
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
            .from("inca_cavi_with_last_posa_and_capo_v1")
            .select(
              [
                "id",
                "inca_file_id",
                "costr",
                "commessa",
                "codice",
                "descrizione",
                "impianto",
                "tipo",
                "marca_cavo",
                "sezione",
                "zona_da",
                "zona_a",
                "apparato_da",
                "apparato_a",
                "descrizione_da",
                "descrizione_a",
                "metri_teo",
                "metri_dis",
                "metri_totali",
                "situazione",
                "livello",
                "wbs",
                "data_posa",
                "capo_label",
              ].join(",")
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

  const filteredCavi = useMemo(() => {
    const q = (query || "").trim().toLowerCase();

    return (cavi || []).filter((r) => {
      const situ = norm(r?.situazione);
      const isP = situ === "P";
      const isNP = !situ || situ === "NP";

      if (onlyP && !isP) return false;
      if (onlyNP && !isNP) return false;

      if (!q) return true;

      const hay = [
        r.codice,
        r.descrizione,
        r.impianto,
        r.tipo,
        r.marca_cavo,
        r.sezione,
        r.zona_da,
        r.zona_a,
        r.apparato_da,
        r.apparato_a,
        r.descrizione_da,
        r.descrizione_a,
        r.livello,
        r.wbs,
        r.data_posa,
        r.capo_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [cavi, query, onlyP, onlyNP]);

  // Apparato maps MUST be computed on FILE SCOPE (not filtered scope)
  const apparatoPMaps = useMemo(() => computeApparatoPMaps(cavi), [cavi]);

  // KPIs / metrics (computed from visible scope)
  const totalMetri = useMemo(() => {
    return (filteredCavi || []).reduce((acc, r) => {
      const m = safeNum(r.metri_totali) || safeNum(r.metri_teo) || safeNum(r.metri_dis) || 0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const totalMetriPosati = useMemo(() => {
    return (filteredCavi || []).reduce((acc, r) => {
      const s = norm(r?.situazione);
      if (s !== "P") return acc;
      const m = safeNum(r.metri_totali) || safeNum(r.metri_dis) || safeNum(r.metri_teo) || 0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const distrib = useMemo(() => {
    const map = new Map();
    for (const code of SITUAZIONI_ORDER) map.set(code, 0);

    for (const r of filteredCavi) {
      const s = norm(r?.situazione);
      const key = s && SITUAZIONI_ORDER.includes(s) ? s : "NP";
      map.set(key, (map.get(key) || 0) + 1);
    }

    return SITUAZIONI_ORDER.map((k) => ({
      code: k,
      label: SITUAZIONI_LABEL[k] || k,
      count: map.get(k) || 0,
    }));
  }, [filteredCavi]);

  const totalCavi = filteredCavi.length;

  const doneCount = useMemo(() => {
    return filteredCavi.reduce((acc, r) => acc + (norm(r?.situazione) === "P" ? 1 : 0), 0);
  }, [filteredCavi]);

  const prodPercent = useMemo(() => {
    if (!totalCavi) return 0;
    return (doneCount / totalCavi) * 100;
  }, [doneCount, totalCavi]);

  function openApparatoPopover(e, side, apparatoName) {
    const name = String(apparatoName || "").trim();
    if (!name) return;

    const rect = e?.currentTarget?.getBoundingClientRect
      ? e.currentTarget.getBoundingClientRect()
      : null;

    setApparatoAnchorRect(rect);
    setApparatoPopoverSide(side);
    setApparatoPopoverName(name);
    setApparatoPopoverOpen(true);
  }

  const chosenFile = useMemo(
    () => (files || []).find((x) => x.id === fileId) || null,
    [files, fileId]
  );

  return (
    <div className="p-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">INCA · Cockpit</div>
            <div className="text-2xl font-semibold text-slate-50 leading-tight truncate">
              {chosenFile
                ? `COSTR ${chosenFile.costr || "—"} · COMMESSA ${chosenFile.commessa || "—"}`
                : "Seleziona un file"}
            </div>
            <div className="text-[12px] text-slate-400 mt-1 truncate">
              {chosenFile ? chosenFile.file_name || "—" : "—"}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="shrink-0 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
            >
              Indietro
            </button>

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
                    Cavi visibili: <span className="text-slate-200 font-semibold">{totalCavi}</span>
                  </span>
                )}
              </div>
              <div className="mt-1">
                <span className="text-slate-500">Posa/Capo: via VIEW</span>
              </div>
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
                onChange={(e) => setFileId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
              >
                {(files || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {(f.costr || "—") + " · " + (f.commessa || "—") + " · " + (f.file_name || "file")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] text-slate-400 block mb-1">
                Ricerca (codice / zona / apparato / descrizione / data posa / capo)
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Es: CAV-..., QUADRO, 22/12/2025, Mario..."
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

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-400">
              Nota: Percorso è disattivato (fase successiva).
            </div>
          </div>
        </div>

        {/* KPIs + Chart */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Panorama INCA</div>
              <div className="text-[11px] text-slate-400">Distribuzione (clic per ingrandire).</div>
            </div>
            <div className="text-right text-[11px]">
              <div className="text-slate-400">
                Cavi: <span className="text-slate-100 font-semibold">{totalCavi}</span>
              </div>
              <div className="text-slate-400">
                Metri teorici: <span className="text-slate-100 font-semibold">{formatMeters(totalMetri)}</span>
              </div>
              <div className="text-slate-400">
                Metri posati (P):{" "}
                <span className="text-emerald-200 font-semibold">{formatMeters(totalMetriPosati)}</span>
              </div>
            </div>
          </div>

          {/* Barometer */}
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
        </div>
      </div>

      {/* Table */}
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-800">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">Cavi ({filteredCavi.length})</div>
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
                  <th className="px-3 py-2">Da → A</th>
                  <th className="px-3 py-2">Tipo cavo</th>
                  <th className="px-3 py-2">Situaz.</th>
                  <th className="px-3 py-2">Data posa</th>
                  <th className="px-3 py-2">Capo</th>
                  <th className="px-3 py-2 text-right">m teo</th>
                </tr>
              </thead>

              <tbody>
                {filteredCavi.map((r) => {
                  const sRaw = norm(r?.situazione);
                  const situ = sRaw && SITUAZIONI_ORDER.includes(sRaw) ? sRaw : "NP";

                  const appDA = norm(r?.apparato_da);
                  const appA = norm(r?.apparato_a);

                  const statDA = appDA ? apparatoPMaps.da.get(appDA) || { total: 0, pCount: 0, status: "RED" } : null;
                  const statA = appA ? apparatoPMaps.a.get(appA) || { total: 0, pCount: 0, status: "RED" } : null;

                  const posa = r?.data_posa ? formatDateIT(r.data_posa) : "—";
                  const capo = norm(r?.capo_label) || "—";

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-900/80 cursor-pointer"
                      onClick={() => setSelectedCable(r)}
                    >
                      <td className="px-3 py-2">
                        <CodicePill value={r.codice} dotColor={colorForSituazione(situ)} />
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <ApparatoPill
                            side="DA"
                            value={appDA || "—"}
                            stats={statDA}
                            disabled={!appDA}
                            onClick={(e) => openApparatoPopover(e, "DA", appDA)}
                          />
                          <span className="hidden md:inline text-slate-600" aria-hidden="true">
                            →
                          </span>
                          <ApparatoPill
                            side="A"
                            value={appA || "—"}
                            stats={statA}
                            disabled={!appA}
                            onClick={(e) => openApparatoPopover(e, "A", appA)}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-300">
                        {tipoCavoLabel(r)}
                      </td>

                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[11px]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForSituazione(situ) }} />
                          <span className="text-slate-200 font-semibold">{situ}</span>
                        </span>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-300 tabular-nums">
                        {posa}
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-300">
                        {capo}
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

      {/* Details panel (optional, keeps parity with CAPO UX) */}
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

          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Data posa (ultimo)</div>
              <div className="text-[13px] text-slate-100 font-semibold">
                {selectedCable.data_posa ? formatDateIT(selectedCable.data_posa) : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Capo</div>
              <div className="text-[13px] text-slate-100 font-semibold">
                {norm(selectedCable.capo_label) || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Metri teo</div>
              <div className="text-[13px] text-slate-100 font-semibold">
                {formatMeters(selectedCable.metri_teo || selectedCable.metri_dis)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Tipo cavo</div>
              <div className="text-[13px] text-slate-100 font-semibold">{tipoCavoLabel(selectedCable)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Chart modal */}
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
                <div className="text-lg font-semibold text-slate-50 leading-tight">Situazioni</div>
                <div className="text-[12px] text-slate-400 mt-1">
                  Totale: <span className="text-slate-100 font-semibold">{totalCavi}</span>
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
              </div>

              <div className="mt-3 text-[11px] text-slate-500 px-1">
                Nota: i filtri influenzano il grafico.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apparato popover */}
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

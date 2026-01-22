import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LoadingScreen from "../../components/LoadingScreen";
import { supabase } from "../../lib/supabaseClient";

import ApparatoCaviPopover from "./ApparatoCaviPopover";
import { ApparatoPill, CodicePill, computeApparatoPMaps } from "../inca/IncaPills";

// =====================================================
// INCA COCKPIT (UFFICIO) — CLEAN (UI-first)
// Source is VIEW: inca_cavi_with_last_posa_and_capo_v1
// (adds data_posa + capo_label)
// =====================================================

export type IncaCockpitMode = "page" | "modal";

export type IncaCockpitProps = {
  mode?: IncaCockpitMode;
  fileId?: string | null;
  onRequestClose?: (() => void) | null;
};

type IncaFileRow = {
  id: string;
  costr: string | null;
  commessa: string | null;
  file_name: string | null;
  uploaded_at: string | null;
};

type IncaCavoRow = {
  id: string;
  inca_file_id: string;

  costr: string | null;
  commessa: string | null;

  codice: string | null;
  descrizione: string | null;
  impianto: string | null;
  tipo: string | null;
  marca_cavo: string | null;
  sezione: string | null;

  zona_da: string | null;
  zona_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
  descrizione_da: string | null;
  descrizione_a: string | null;

  metri_teo: number | null;
  metri_dis: number | null;
  metri_totali: number | null;

  situazione: string | null;
  livello: string | null;
  wbs: string | null;

  data_posa: string | null;
  capo_label: string | null;
};

export const SITUAZIONI_ORDER = ["NP", "T", "P", "R", "B", "E"] as const;
export type SituazioneCode = (typeof SITUAZIONI_ORDER)[number];

export const SITUAZIONI_LABEL: Record<SituazioneCode, string> = {
  NP: "Non posato",
  T: "Terminato",
  P: "Posato",
  R: "Rimosso",
  B: "Bloccato",
  E: "Eliminato",
};

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMeters(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(n);
}

function formatDateIT(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
}

function colorForSituazione(code: SituazioneCode): string {
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

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function toSituazione(v: unknown): SituazioneCode {
  const s = norm(v);
  if (s && (SITUAZIONI_ORDER as readonly string[]).includes(s)) return s as SituazioneCode;
  return "NP";
}

function tipoCavoLabel(r: IncaCavoRow): string {
  const t = norm(r?.tipo);
  if (t) return t;
  const m = norm(r?.marca_cavo);
  if (m) return m;
  return "—";
}

export default function IncaCockpit(props: IncaCockpitProps) {
  const navigate = useNavigate();

  const mode: IncaCockpitMode = props.mode ?? "page";

  // Filters
  const [fileId, setFileId] = useState<string>(props.fileId ?? "");
  const [files, setFiles] = useState<IncaFileRow[]>([]);

  const [query, setQuery] = useState<string>("");
  const [situazioni, setSituazioni] = useState<SituazioneCode[]>([]);
  const [apparatoDa, setApparatoDa] = useState<string>("");
  const [apparatoA, setApparatoA] = useState<string>("");

  // Data
  const [cavi, setCavi] = useState<IncaCavoRow[]>([]);

  // Loading / errors
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedCable, setSelectedCable] = useState<IncaCavoRow | null>(null);

  // UI — apparato popover
  const [apparatoPopoverOpen, setApparatoPopoverOpen] = useState<boolean>(false);
  const [apparatoPopoverSide, setApparatoPopoverSide] = useState<"DA" | "A">("DA");
  const [apparatoPopoverName, setApparatoPopoverName] = useState<string>("");
  const [apparatoAnchorRect, setApparatoAnchorRect] = useState<DOMRect | null>(null);

  // Batched loading rules (pageSize <= 1000 to defeat PostgREST caps)
  const loadInfo = useMemo(() => ({ pageSize: 1000, maxPages: 200 }), []);

  // Keep state aligned if modal passes a fileId
  useEffect(() => {
    const v = (props.fileId ?? "").trim();
    if (!v) return;
    setFileId(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fileId]);

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

        const list: IncaFileRow[] = Array.isArray(data) ? (data as IncaFileRow[]) : [];
        setFiles(list);

        // Only auto-pick if no external fileId is provided
        if (!fileId && !props.fileId && list[0]?.id) setFileId(list[0].id);
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
        const all: IncaCavoRow[] = [];
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

          const chunk: IncaCavoRow[] = Array.isArray(data) ? (data as IncaCavoRow[]) : [];
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

  // Apparato maps MUST be computed on FILE SCOPE (not filtered scope)
  const apparatoPMaps = useMemo(() => computeApparatoPMaps(cavi), [cavi]);

  // Base filter scope for pills: file scope + query + apparato exact filters
  const baseByQuery = useMemo(() => {
    const q = (query || "").trim().toLowerCase();

    const da = norm(apparatoDa).toLowerCase();
    const a = norm(apparatoA).toLowerCase();

    return (cavi || []).filter((r) => {
      const appDA = norm(r?.apparato_da).toLowerCase();
      const appA = norm(r?.apparato_a).toLowerCase();

      if (da && appDA !== da) return false;
      if (a && appA !== a) return false;

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
  }, [cavi, query, apparatoDa, apparatoA]);

  // Pills distribution computed on base scope (so pills remain informative)
  const distribBase = useMemo(() => {
    const map = new Map<SituazioneCode, number>();
    for (const code of SITUAZIONI_ORDER) map.set(code, 0);

    for (const r of baseByQuery) {
      const key = toSituazione(r?.situazione);
      map.set(key, (map.get(key) || 0) + 1);
    }

    return SITUAZIONI_ORDER.map((code) => ({
      code,
      label: SITUAZIONI_LABEL[code],
      count: map.get(code) || 0,
    }));
  }, [baseByQuery]);

  const filteredCavi = useMemo(() => {
    if (!situazioni.length) return baseByQuery;
    const allow = new Set(situazioni);
    return baseByQuery.filter((r) => allow.has(toSituazione(r?.situazione)));
  }, [baseByQuery, situazioni]);

  // KPIs / metrics (computed from visible scope)
  const totalCavi = filteredCavi.length;
  const pCount = useMemo(
    () => filteredCavi.reduce((acc, r) => acc + (toSituazione(r?.situazione) === "P" ? 1 : 0), 0),
    [filteredCavi]
  );
  const npCount = useMemo(
    () => filteredCavi.reduce((acc, r) => acc + (toSituazione(r?.situazione) === "NP" ? 1 : 0), 0),
    [filteredCavi]
  );

  const prodPercent = useMemo(() => {
    if (!totalCavi) return 0;
    return (pCount / totalCavi) * 100;
  }, [pCount, totalCavi]);

  const totalMetri = useMemo(() => {
    return (filteredCavi || []).reduce((acc, r) => {
      const m = safeNum(r.metri_totali) || safeNum(r.metri_teo) || safeNum(r.metri_dis) || 0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const totalMetriPosati = useMemo(() => {
    return (filteredCavi || []).reduce((acc, r) => {
      if (toSituazione(r?.situazione) !== "P") return acc;
      const m = safeNum(r.metri_totali) || safeNum(r.metri_dis) || safeNum(r.metri_teo) || 0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const chosenFile = useMemo(
    () => (files || []).find((x) => x.id === fileId) || null,
    [files, fileId]
  );

  function toggleSituazione(code: SituazioneCode) {
    setSituazioni((prev) => {
      if (!prev.length) return [code];
      const has = prev.includes(code);
      const next = has ? prev.filter((x) => x !== code) : [...prev, code];
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setSituazioni([]);
    setApparatoDa("");
    setApparatoA("");
  }

  function openApparatoPopover(e: React.MouseEvent, side: "DA" | "A", apparatoName: string) {
    const name = String(apparatoName || "").trim();
    if (!name) return;

    const rect = (e?.currentTarget as HTMLElement | null)?.getBoundingClientRect
      ? (e.currentTarget as HTMLElement).getBoundingClientRect()
      : null;

    setApparatoAnchorRect(rect);
    setApparatoPopoverSide(side);
    setApparatoPopoverName(name);
    setApparatoPopoverOpen(true);
  }

  const topAppDa = useMemo(() => {
    const items = Array.from(apparatoPMaps.da.entries()).map(([name, st]) => ({ name, ...st }));
    items.sort((a, b) => (b.total || 0) - (a.total || 0));
    return items.slice(0, 8);
  }, [apparatoPMaps.da]);

  const topAppA = useMemo(() => {
    const items = Array.from(apparatoPMaps.a.entries()).map(([name, st]) => ({ name, ...st }));
    items.sort((a, b) => (b.total || 0) - (a.total || 0));
    return items.slice(0, 8);
  }, [apparatoPMaps.a]);

  const headerTitle = useMemo(() => {
    if (!chosenFile) return "Seleziona un file";
    return `COSTR ${chosenFile.costr || "—"} · COMMESSA ${chosenFile.commessa || "—"}`;
  }, [chosenFile]);

  return (
    <div className="p-3">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">INCA · Cockpit</div>
            <div className="text-2xl font-semibold text-slate-50 leading-tight truncate">{headerTitle}</div>
            <div className="text-[12px] text-slate-400 mt-1 truncate">{chosenFile ? chosenFile.file_name || "—" : "—"}</div>
          </div>

          <div className="flex items-start gap-2">
            {mode === "modal" ? (
              <button
                type="button"
                onClick={() => props.onRequestClose?.()}
                className="shrink-0 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
              >
                Chiudi
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="shrink-0 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
              >
                Indietro
              </button>
            )}

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
                  <span className="text-slate-400">Caricamento cavi…</span>
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

        {/* Signals (max 6) */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Cavi</div>
            <div className="text-[14px] text-slate-100 font-semibold tabular-nums">{totalCavi}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">P</div>
            <div className="text-[14px] text-emerald-200 font-semibold tabular-nums">{pCount}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">NP</div>
            <div className="text-[14px] text-fuchsia-200 font-semibold tabular-nums">{npCount}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Prod.</div>
            <div className="text-[14px] text-sky-200 font-semibold tabular-nums">{prodPercent.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Metri</div>
            <div className="text-[14px] text-slate-100 font-semibold tabular-nums">{formatMeters(totalMetri)}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Metri P</div>
            <div className="text-[14px] text-emerald-200 font-semibold tabular-nums">{formatMeters(totalMetriPosati)}</div>
          </div>
        </div>
      </div>

      {/* Controls + Pills */}
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Controls */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Controlli</div>

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
              <label className="text-[12px] text-slate-400 block mb-1">Ricerca globale</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Codice, zona, apparato, descrizione, data posa, capo..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] text-slate-400 block mb-1">Apparato DA (exact)</label>
                <input
                  value={apparatoDa}
                  onChange={(e) => setApparatoDa(e.target.value)}
                  placeholder="Es: QUADRO..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                />
              </div>
              <div>
                <label className="text-[12px] text-slate-400 block mb-1">Apparato A (exact)</label>
                <input
                  value={apparatoA}
                  onChange={(e) => setApparatoA(e.target.value)}
                  placeholder="Es: MOTORE..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-[12px] text-amber-200">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
              >
                Reset
              </button>

              <div className="ml-auto text-[11px] text-slate-500">
                Filtri attivi:{" "}
                <span className="text-slate-200 font-semibold">
                  {(situazioni.length ? 1 : 0) + (query ? 1 : 0) + (apparatoDa ? 1 : 0) + (apparatoA ? 1 : 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pills */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Pills (quick filters)</div>

          {/* Situazioni pills */}
          <div className="flex flex-wrap gap-2">
            {distribBase.map((d) => {
              const active = situazioni.includes(d.code);
              return (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => toggleSituazione(d.code)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px]",
                    active ? "border-slate-600 bg-slate-900/60 text-slate-100" : "border-slate-800 bg-slate-950/60 text-slate-300",
                  ].join(" ")}
                  title={d.label}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForSituazione(d.code) }} />
                  <span className="font-semibold">{d.code}</span>
                  <span className="text-slate-400 tabular-nums">{d.count}</span>
                </button>
              );
            })}
          </div>

          {/* Apparato pills (2 rows max) */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Top Apparato DA</div>
              <div className="flex flex-wrap gap-2">
                {topAppDa.map((it) => (
                  <ApparatoPill
                    key={`da-${it.name}`}
                    side="DA"
                    value={it.name}
                    stats={it}
                    disabled={false}
                    onClick={() => setApparatoDa(it.name)}
                  />
                ))}
                {topAppDa.length === 0 && <div className="text-[12px] text-slate-500">—</div>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Top Apparato A</div>
              <div className="flex flex-wrap gap-2">
                {topAppA.map((it) => (
                  <ApparatoPill
                    key={`a-${it.name}`}
                    side="A"
                    value={it.name}
                    stats={it}
                    disabled={false}
                    onClick={() => setApparatoA(it.name)}
                  />
                ))}
                {topAppA.length === 0 && <div className="text-[12px] text-slate-500">—</div>}
              </div>
            </div>
          </div>
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
                  const situ = toSituazione(r?.situazione);

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
                        <CodicePill value={r.codice ?? "—"} dotColor={colorForSituazione(situ)} />
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

                      <td className="px-3 py-2 text-[12px] text-slate-300">{tipoCavoLabel(r)}</td>

                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[11px]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForSituazione(situ) }} />
                          <span className="text-slate-200 font-semibold">{situ}</span>
                        </span>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-300 tabular-nums">{posa}</td>

                      <td className="px-3 py-2 text-[12px] text-slate-300">{capo}</td>

                      <td className="px-3 py-2 text-[12px] text-slate-200 text-right">
                        {formatMeters(r.metri_teo ?? r.metri_dis)}
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

      {/* Details panel (kept; no noise unless a row is selected) */}
      {selectedCable && (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wide">Dettaglio cavo</div>
              <div className="text-lg font-semibold text-slate-50">{selectedCable.codice ?? "—"}</div>
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
              <div className="text-[13px] text-slate-100 font-semibold">{selectedCable.data_posa ? formatDateIT(selectedCable.data_posa) : "—"}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Capo</div>
              <div className="text-[13px] text-slate-100 font-semibold">{norm(selectedCable.capo_label) || "—"}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Metri teo</div>
              <div className="text-[13px] text-slate-100 font-semibold">{formatMeters(selectedCable.metri_teo ?? selectedCable.metri_dis)}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Tipo cavo</div>
              <div className="text-[13px] text-slate-100 font-semibold">{tipoCavoLabel(selectedCable)}</div>
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

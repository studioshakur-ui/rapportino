import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LoadingScreen from "../../components/LoadingScreen";
import { supabase } from "../../lib/supabaseClient";

import { CodicePill } from "../inca/IncaPills";
import IncaCaviTable, { type IncaCavoRow, type IncaTableViewMode } from "./IncaCaviTable";

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
  project_code?: string | null;
  group_key?: string | null;
  previous_inca_file_id?: string | null;

  file_name: string | null;
  uploaded_at: string | null;
};

type IncaHeadRow = {
  id: string; // HEAD id
  costr: string | null;
  commessa: string | null;
  project_code: string | null;
  group_key: string;

  head_file_name: string | null;
  head_uploaded_at: string | null;

  // UX: latest upload timestamp in the group
  last_uploaded_at: string | null;
  uploads_count: number;

  // archive list (including head as well, but we keep a separate section anyway)
  uploads: IncaFileRow[];
};

function safeLower(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function parseIsoDateOrNull(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function deriveGroupKey(r: IncaFileRow): string {
  const g = (r.group_key ?? "").trim();
  if (g) return g.toLowerCase();
  // Fallback for legacy rows where group_key might be NULL.
  return `${safeLower(r.costr)}|${safeLower(r.commessa)}|${safeLower(r.project_code ?? "")}`;
}

function pickLatest(list: IncaFileRow[]): IncaFileRow {
  let best = list[0];
  let bestT = parseIsoDateOrNull(best.uploaded_at) ?? Number.NEGATIVE_INFINITY;
  for (const r of list) {
    const t = parseIsoDateOrNull(r.uploaded_at) ?? Number.NEGATIVE_INFINITY;
    if (t > bestT) {
      best = r;
      bestT = t;
    }
  }
  return best;
}

function computeHeads(raw: IncaFileRow[]): {
  heads: IncaHeadRow[];
  uploadToHeadId: Record<string, string>;
  byId: Record<string, IncaFileRow>;
} {
  const byId: Record<string, IncaFileRow> = {};
  for (const r of raw) byId[r.id] = r;

  const byGroup = new Map<string, IncaFileRow[]>();
  for (const r of raw) {
    const g = deriveGroupKey(r);
    const arr = byGroup.get(g);
    if (arr) arr.push(r);
    else byGroup.set(g, [r]);
  }

  const uploadToHeadId: Record<string, string> = {};
  const heads: IncaHeadRow[] = [];

  for (const [groupKey, rows] of byGroup) {
    // HEAD semantics (CORE): the dataset "HEAD" is the *latest* upload in the group.
    // `previous_inca_file_id` is lineage for diffing only; it must NOT drive head selection.
    const headRow = pickLatest(rows);

    const headId = headRow.id;
    for (const r of rows) uploadToHeadId[r.id] = headId;

    // keep uploads sorted desc for archive view
    const uploadsSorted = [...rows].sort((a, b) => {
      const ta = parseIsoDateOrNull(a.uploaded_at) ?? 0;
      const tb = parseIsoDateOrNull(b.uploaded_at) ?? 0;
      return tb - ta;
    });

    heads.push({
      id: headId,
      costr: headRow.costr,
      commessa: headRow.commessa,
      project_code: (headRow.project_code ?? null) as any,
      group_key: groupKey,

      head_file_name: headRow.file_name,
      head_uploaded_at: headRow.uploaded_at,

      // "last" == head, by definition
      last_uploaded_at: headRow.uploaded_at ?? null,
      uploads_count: rows.length,
      uploads: uploadsSorted,
    });
  }

  // sort heads by last upload desc
  heads.sort((a, b) => {
    const ta = parseIsoDateOrNull(a.last_uploaded_at) ?? 0;
    const tb = parseIsoDateOrNull(b.last_uploaded_at) ?? 0;
    return tb - ta;
  });

  return { heads, uploadToHeadId, byId };
}

// =============================
// SITUAZIONE semantics (CANON)
// =============================
// P = posato
// T = tagliato
// R = rifare
// B = bloccato
// E = eliminato
// L = null (missing)
// NP = macro = T + R + B + L

const SITUAZIONI_ATOM_ORDER = ["P", "T", "R", "B", "L", "E"] as const;
type SituazioneAtom = (typeof SITUAZIONI_ATOM_ORDER)[number];

type SituazioneFilterCode = "NP" | SituazioneAtom;

const SITUAZIONI_FILTER_ORDER: readonly SituazioneFilterCode[] = ["NP", "T", "P", "R", "B", "L", "E"] as const;

const SITUAZIONI_LABEL: Record<SituazioneFilterCode, string> = {
  NP: "Non posato (T+R+B+L)",
  P: "Posato",
  T: "Tagliato",
  R: "Rifare",
  B: "Bloccato",
  L: "Non definito",
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

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function isIncaCavoRow(x: unknown): x is IncaCavoRow {
  return typeof x === "object" && x !== null && "id" in x && "codice" in x && "situazione" in x;
}

function toAtom(v: unknown): SituazioneAtom {
  const s = norm(v).toUpperCase();
  if (!s) return "L";
  if ((SITUAZIONI_ATOM_ORDER as readonly string[]).includes(s)) return s as SituazioneAtom;
  return "L";
}

function isNonPosatoAtom(a: SituazioneAtom): boolean {
  return a === "T" || a === "R" || a === "B" || a === "L";
}

export default function IncaCockpit(props: IncaCockpitProps) {
  const navigate = useNavigate();
  const mode: IncaCockpitMode = props.mode ?? "page";

  // User selection = may be HEAD or ARCHIVE upload
  const [selectedUploadId, setSelectedUploadId] = useState<string>(props.fileId ?? "");

  // HEAD resolution
  const [heads, setHeads] = useState<IncaHeadRow[]>([]);
  const [uploadToHeadId, setUploadToHeadId] = useState<Record<string, string>>({});
  const [byId, setById] = useState<Record<string, IncaFileRow>>({});

  // Filters
  const [query, setQuery] = useState<string>("");
  const [situazioni, setSituazioni] = useState<SituazioneFilterCode[]>([]);
  const [apparatoDa, setApparatoDa] = useState<string>("");
  const [apparatoA, setApparatoA] = useState<string>("");

  // Table view
  const [viewMode, setViewMode] = useState<IncaTableViewMode>("standard");

  // Data
  const [cavi, setCavi] = useState<IncaCavoRow[]>([]);

  // Loading / errors
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedCable, setSelectedCable] = useState<IncaCavoRow | null>(null);

  const loadInfo = useMemo(() => ({ pageSize: 1000, maxPages: 200 }), []);

  useEffect(() => {
    const v = (props.fileId ?? "").trim();
    if (!v) return;
    setSelectedUploadId(v);
  }, [props.fileId]);

  const effectiveHeadId = useMemo(() => {
    const id = (selectedUploadId || "").trim();
    if (!id) return "";
    return uploadToHeadId[id] || id;
  }, [selectedUploadId, uploadToHeadId]);

  const chosenUpload = useMemo(() => {
    const id = (selectedUploadId || "").trim();
    if (!id) return null;
    return byId[id] || null;
  }, [byId, selectedUploadId]);

  const chosenHead = useMemo(() => {
    const id = (effectiveHeadId || "").trim();
    if (!id) return null;
    return heads.find((h) => h.id === id) || null;
  }, [heads, effectiveHeadId]);

  const isArchiveSelection = useMemo(() => {
    const sid = (selectedUploadId || "").trim();
    const hid = (effectiveHeadId || "").trim();
    if (!sid || !hid) return false;
    return sid !== hid;
  }, [selectedUploadId, effectiveHeadId]);

  // 1) load files (raw) -> compute heads + archive mapping
  useEffect(() => {
    let alive = true;

    async function loadFiles() {
      setLoadingFiles(true);
      setError(null);

      try {
        const { data, error: e } = await supabase
          .from("inca_files")
          .select("id,costr,commessa,project_code,group_key,previous_inca_file_id,file_name,uploaded_at")
          .order("uploaded_at", { ascending: false })
          .limit(500);

        if (e) throw e;
        if (!alive) return;

        const raw: IncaFileRow[] = Array.isArray(data) ? (data as IncaFileRow[]) : [];
        const computed = computeHeads(raw);

        setHeads(computed.heads);
        setUploadToHeadId(computed.uploadToHeadId);
        setById(computed.byId);

        // IMPORTANT (CNCS): never silently fall back to "latest".
        // If selectedUploadId is empty, keep "no selection".
        // If selectedUploadId exists but does not exist anymore, clear it.
        const cur = (selectedUploadId || "").trim();
        if (cur && !computed.byId[cur] && !computed.heads.some((h) => h.id === cur)) {
          setSelectedUploadId("");
        }
      } catch (err) {
        console.error("[IncaCockpit] loadFiles error:", err);
        if (!alive) return;
        setHeads([]);
        setUploadToHeadId({});
        setById({});
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

  // 2) load cavi by effective HEAD id (batched) — source VIEW: inca_cavi_with_last_posa_and_capo_v2
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function loadCavi() {
      if (!effectiveHeadId) {
        setLoading(false);
        setError(null);
        setSelectedCable(null);
        setCavi([]);
        return;
      }

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
            .from("inca_cavi_with_last_posa_and_capo_v2")
            .select(
              [
                "id",
                "inca_file_id",
                "codice",
                "marca_cavo",
                "tipo",
                "sezione",
                "livello_disturbo",
                "impianto",
                "situazione",
                "progress_percent",
                "stato_cantiere",
                "stato_tec",
                "zona_da",
                "zona_a",
                "apparato_da",
                "apparato_a",
                "descrizione_da",
                "descrizione_a",
                "metri_teo",
                "metri_dis",
                "metri_totali",
                "livello",
                "wbs",
                "pagina_pdf",
                "raw",
                "data_posa",
                "capo_label",
              ].join(",")
            )
            .eq("inca_file_id", effectiveHeadId)
            .order("codice", { ascending: true })
            .range(from, to)
            .abortSignal(ac.signal);

          if (e) throw e;

          const chunk: IncaCavoRow[] = Array.isArray(data) ? (data as unknown[]).filter(isIncaCavoRow) : [];
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
  }, [effectiveHeadId, loadInfo.maxPages, loadInfo.pageSize]);

  // Base scope for pills: file scope + query + apparato exact
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
        (r as any).descrizione,
        r.impianto,
        r.tipo,
        (r as any).marca_cavo,
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

  const distribBase = useMemo(() => {
    const atomCounts = new Map<SituazioneAtom, number>();
    for (const a of SITUAZIONI_ATOM_ORDER) atomCounts.set(a, 0);

    for (const r of baseByQuery) {
      const a = toAtom((r as any)?.situazione);
      atomCounts.set(a, (atomCounts.get(a) || 0) + 1);
    }

    const np =
      (atomCounts.get("T") || 0) +
      (atomCounts.get("R") || 0) +
      (atomCounts.get("B") || 0) +
      (atomCounts.get("L") || 0);

    return SITUAZIONI_FILTER_ORDER.map((code) => {
      if (code === "NP") {
        return { code, label: SITUAZIONI_LABEL[code], count: np };
      }
      return {
        code,
        label: SITUAZIONI_LABEL[code],
        count: atomCounts.get(code) || 0,
      };
    });
  }, [baseByQuery]);

  const filteredCavi = useMemo(() => {
    if (!situazioni.length) return baseByQuery;

    const allowAtoms = new Set<SituazioneAtom>();
    for (const c of situazioni) {
      if (c === "NP") {
        allowAtoms.add("T");
        allowAtoms.add("R");
        allowAtoms.add("B");
        allowAtoms.add("L");
      } else {
        allowAtoms.add(c);
      }
    }

    return baseByQuery.filter((r) => allowAtoms.has(toAtom((r as any)?.situazione)));
  }, [baseByQuery, situazioni]);

  // KPIs computed from visible scope
  const totalCavi = filteredCavi.length;
  const pCount = useMemo(
    () => filteredCavi.reduce((acc, r) => acc + (toAtom((r as any)?.situazione) === "P" ? 1 : 0), 0),
    [filteredCavi]
  );
  const npCount = useMemo(
    () => filteredCavi.reduce((acc, r) => acc + (isNonPosatoAtom(toAtom((r as any)?.situazione)) ? 1 : 0), 0),
    [filteredCavi]
  );
  const prodPercent = useMemo(() => (totalCavi ? (pCount / totalCavi) * 100 : 0), [pCount, totalCavi]);

  const totalMetri = useMemo(() => {
    return (filteredCavi || []).reduce((acc, r) => {
      const m = Math.max(safeNum(r.metri_totali) || 0, safeNum(r.metri_teo) || 0, safeNum(r.metri_dis) || 0);
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const totalMetriPosati = useMemo(() => {
    return (filteredCavi || []).reduce((acc, r) => {
      if (toAtom((r as any)?.situazione) !== "P") return acc;
      const m = safeNum(r.metri_totali) || safeNum(r.metri_dis) || safeNum(r.metri_teo) || 0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  function clearFilters() {
    setQuery("");
    setSituazioni([]);
    setApparatoDa("");
    setApparatoA("");
  }

  const headerTitle = useMemo(() => {
    if (!chosenHead) return "Seleziona un file";
    return `COSTR ${chosenHead.costr || "—"} · COMMESSA ${chosenHead.commessa || "—"}`;
  }, [chosenHead]);

  if (loadingFiles) {
    return <LoadingScreen message="Caricamento cockpit INCA…" />;
  }

  return (
    <div className="p-3">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">INCA · Cockpit</div>
            <div className="text-2xl font-semibold text-slate-50 leading-tight truncate">{headerTitle}</div>

            <div className="text-[12px] text-slate-400 mt-1 truncate">
              {chosenUpload ? (chosenUpload.file_name || "—") : "—"}
            </div>

            {chosenHead && (
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Dataset attivo (HEAD): <span className="text-slate-300">{chosenHead.head_file_name || "—"}</span>
                {chosenHead.last_uploaded_at ? (
                  <span className="text-slate-600"> · ultimo upload {new Date(chosenHead.last_uploaded_at).toLocaleString()}</span>
                ) : null}
              </div>
            )}
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
              {loading ? (
                <span className="text-slate-400">Caricamento cavi…</span>
              ) : (
                <span className="text-slate-400">
                  Cavi visibili: <span className="text-slate-200 font-semibold">{totalCavi}</span>
                </span>
              )}
</div>
          </div>
        </div>

        {/* Archive banner */}
        {isArchiveSelection && chosenUpload && chosenHead && (
          <div className="mt-3 rounded-xl border border-amber-700/50 bg-amber-950/25 px-3 py-2 text-[12px] text-amber-200">
            Stai auditando un <b>upload storico</b> ({chosenUpload.file_name || chosenUpload.id}).
            Il cockpit mostra il <b>dataset attivo (HEAD)</b> per evitare incoerenze.
          </div>
        )}

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
                value={selectedUploadId}
                onChange={(e) => setSelectedUploadId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
              >
                <option value="" disabled>
                  {(heads || []).length ? "Seleziona un dataset / upload…" : "Nessun file disponibile"}
                </option>

                <optgroup label="Dataset attivi (HEAD)">
                  {(heads || []).map((h) => (
                    <option key={h.id} value={h.id}>
                      {(h.costr || "—") + " · " + (h.commessa || "—") + " · " + (h.head_file_name || "HEAD")}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Archivio upload (audit)">
                  {(heads || []).flatMap((h) =>
                    (h.uploads || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {(u.costr || "—") +
                          " · " +
                          (u.commessa || "—") +
                          " · " +
                          (u.file_name || "upload") +
                          "  [audit]"}
                      </option>
                    ))
                  )}
                </optgroup>
              </select>

              {chosenHead && (
                <div className="mt-2 text-[11px] text-slate-500">
                  Dataset attivo usato dal cockpit:{" "}
                  <span className="text-slate-300 font-semibold">{chosenHead.head_file_name || chosenHead.id}</span>
                </div>
              )}
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

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
              >
                Reset
              </button>

              <div className="text-[11px] text-slate-500">Filtri attivi: {situazioni.length}</div>
            </div>
          </div>
        </div>

        {/* Pills + Table */}
        <div className="lg:col-span-8 space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Pills (Quick filters)</div>
            <div className="flex flex-wrap gap-2">
              {distribBase.map((it) => (
                <CodicePill
                  key={it.code}
                  value={`${it.code} (${it.count})`}
                  title={it.label}
                  className={situazioni.includes(it.code) ? "border-sky-500/40 bg-sky-500/10 text-sky-100" : ""}
                  onClick={() => {
                    setSituazioni((prev) => {
                      const has = prev.includes(it.code);
                      if (has) return prev.filter((x) => x !== it.code);
                      return [...prev, it.code];
                    });
                  }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
            {loading ? (
              <div className="p-6 text-[12px] text-slate-400">Caricamento…</div>
            ) : error ? (
              <div className="p-6 text-[12px] text-amber-200">{error}</div>
            ) : (
              <IncaCaviTable
                rows={filteredCavi}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                selectedRowId={selectedCable?.id || null}
                onRowClick={(r) => setSelectedCable(r)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

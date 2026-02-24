import { useCallback, useEffect, useMemo, useRef, useState  } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";

import LoadingScreen from "../components/LoadingScreen";
import IncaCockpitModal from "../features/inca/IncaCockpitModal";
// IMPORTANT: explicit extension to avoid resolving legacy IncaImportModal.jsx
import IncaImportModal from "../features/inca/IncaImportModal";
import { clearIncaImportDraft, readIncaImportDraft } from "../features/inca/incaImportDraft";
import { usePersistedSearchParam } from "../utils/usePersistedSearchParam";

type IncaFileRow = {
  id: string;
  costr: string | null;
  commessa: string | null;
  project_code: string | null;
  file_name: string | null;
  file_type: string | null;
  uploaded_at: string | null;
  group_key?: string | null;
  previous_inca_file_id?: string | null;
  import_run_id?: string | null;
  content_hash?: string | null;
};

type IncaHeadRow = {
  /** HEAD id: this is the only selectable id for cockpit */
  id: string;
  costr: string | null;
  commessa: string | null;
  project_code: string | null;
  /** Head file name (kept stable by design) */
  file_name: string | null;
  file_type: string | null;
  /** Head uploaded_at (historical) */
  uploaded_at: string | null;
  /** Latest upload timestamp inside the group (what the user actually cares about) */
  last_uploaded_at: string | null;
  /** Number of uploads in the group */
  uploads_count: number;
};

function safeLower(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function deriveGroupKey(r: IncaFileRow): string {
  const g = (r.group_key ?? "").trim();
  if (g) return g.toLowerCase();
  // Fallback for legacy rows where group_key might be NULL.
  return `${safeLower(r.costr)}|${safeLower(r.commessa)}|${safeLower(r.project_code)}`;
}

function parseIsoDateOrNull(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function computeHeads(raw: IncaFileRow[]): {
  heads: IncaHeadRow[];
  uploadToHeadId: Record<string, string>;
} {
  const byGroup = new Map<string, IncaFileRow[]>();
  const uploadToHeadId: Record<string, string> = {};

  for (const r of raw) {
    const g = deriveGroupKey(r);
    const arr = byGroup.get(g);
    if (arr) arr.push(r);
    else byGroup.set(g, [r]);
  }

  const heads: IncaHeadRow[] = [];

  for (const [, rows] of byGroup) {
    // HEAD semantics (CORE): the dataset "HEAD" is the *latest* upload in the group.
    // `previous_inca_file_id` is lineage for diffing only; it must NOT drive head selection.
    const pickLatest = (list: IncaFileRow[]): IncaFileRow => {
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
    };

    const headRow = pickLatest(rows);

    const headId = headRow.id;
    for (const r of rows) uploadToHeadId[r.id] = headId;

    heads.push({
      id: headId,
      costr: headRow.costr,
      commessa: headRow.commessa,
      project_code: headRow.project_code,
      file_name: headRow.file_name,
      file_type: headRow.file_type,
      uploaded_at: headRow.uploaded_at,
      // "last" == head, by definition
      last_uploaded_at: headRow.uploaded_at ?? null,
      uploads_count: rows.length,
    });
  }

  // Sort by last upload desc (what users expect)
  heads.sort((a, b) => {
    const ta = parseIsoDateOrNull(a.last_uploaded_at) ?? 0;
    const tb = parseIsoDateOrNull(b.last_uploaded_at) ?? 0;
    return tb - ta;
  });

  return { heads, uploadToHeadId };
}

export default function UfficioIncaHub(): JSX.Element {
  const [files, setFiles] = useState<IncaHeadRow[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  // Map any uploaded inca_file_id -> HEAD id (stable dataset id)
  const uploadToHeadIdRef = useRef<Record<string, string>>({});

  // Persist selection across module navigation + refresh, and keep URL stable.
  const [selectedFileId, setSelectedFileId] = usePersistedSearchParam(
    "incaFileId",
    "core.ufficio.inca.selectedFileId",
    { defaultValue: "", replace: true }
  );

  const [cockpitOpen, setCockpitOpen] = useState<boolean>(false);
  const [importOpen, setImportOpen] = useState<boolean>(false);

  // iOS/Safari can kill the webview when opening the native file picker.
  // We resume the import modal from a sessionStorage draft if it was open.
  const didResumeImportRef = useRef<boolean>(false);

  useEffect(() => {
    if (didResumeImportRef.current) return;
    didResumeImportRef.current = true;

    const d = readIncaImportDraft();
    if (d?.open) {
      setImportOpen(true);
    }
  }, []);

  const handleImportClose = useCallback(() => {
    clearIncaImportDraft();
    setImportOpen(false);
  }, []);

  const loadFiles = useCallback(async (): Promise<IncaFileRow[]> => {
    const { data, error: e } = await supabase
      .from("inca_files")
      .select("id,costr,commessa,project_code,file_name,file_type,uploaded_at,group_key,previous_inca_file_id,import_run_id,content_hash")
      .order("uploaded_at", { ascending: false });

    if (e) throw e;
    return (data || []) as IncaFileRow[];
  }, []);

  const ensureValidSelection = useCallback(
    (list: IncaHeadRow[], preferredId: string): string => {
      const pid = (preferredId || "").trim();
      if (pid && list.some((f) => f.id === pid)) return pid;
      return list.length > 0 ? list[0].id : "";
    },
    []
  );

  const refreshFiles = useCallback(
    async (opts?: { forceSelectId?: string }): Promise<void> => {
      setRefreshing(true);
      setError(null);

      try {
        const raw = await loadFiles();
        const { heads, uploadToHeadId } = computeHeads(raw);
        uploadToHeadIdRef.current = uploadToHeadId;
        setFiles(heads);

        const forced = (opts?.forceSelectId ?? "").trim();
        const forcedHead = forced ? uploadToHeadIdRef.current[forced] || forced : "";
        const nextId = ensureValidSelection(heads, forcedHead || selectedFileId);
        if (nextId !== selectedFileId) setSelectedFileId(nextId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[UfficioIncaHub] refreshFiles error:", err);
        setError("Impossibile caricare i file INCA.");
        setFiles([]);
      } finally {
        setRefreshing(false);
      }
    },
    [ensureValidSelection, loadFiles, selectedFileId, setSelectedFileId]
  );

  // Initial load: mount-only (NO selectedFileId dependency)
  useEffect(() => {
    let alive = true;

    async function boot(): Promise<void> {
      setLoadingFiles(true);
      setError(null);

      try {
        const raw = await loadFiles();
        if (!alive) return;

        const { heads, uploadToHeadId } = computeHeads(raw);
        uploadToHeadIdRef.current = uploadToHeadId;
        setFiles(heads);

        // If URL/storage contains a non-head id, remap it to the proper HEAD.
        const preferred = (selectedFileId || "").trim();
        const preferredHead = preferred ? uploadToHeadIdRef.current[preferred] || preferred : "";
        const nextId = ensureValidSelection(heads, preferredHead);
        if (nextId !== selectedFileId) setSelectedFileId(nextId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[UfficioIncaHub] boot error:", err);
        if (!alive) return;
        setError("Impossibile caricare i file INCA.");
        setFiles([]);
      } finally {
        if (alive) setLoadingFiles(false);
      }
    }

    boot();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFiles, ensureValidSelection, setSelectedFileId]);

  const selectedFile = useMemo<IncaHeadRow | null>(() => {
    return files.find((f) => f.id === selectedFileId) || null;
  }, [files, selectedFileId]);

  const headerCostr = (selectedFile?.costr || "").trim();
  const headerCommessa = (selectedFile?.commessa || "").trim();

  const handleExportInca = useCallback(async (): Promise<void> => {
    if (!selectedFileId || exporting) return;
    setExporting(true);
    setExportError(null);

    const exportColumns = [
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
      "inca_data_taglio",
      "inca_data_posa",
      "inca_data_collegamento",
      "inca_data_richiesta_taglio",
      "inca_dataela_ts",
      "inca_data_instradamento_ts",
      "inca_data_creazione_instradamento_ts",
      "raw",
      "data_posa",
      "capo_label",
    ];

    const normalizeCell = (value: unknown) => {
      if (value == null) return "";
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    };

    const downloadXlsx = (rows: unknown[][], filename: string) => {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "INCA");
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    try {
      const pageSize = 1000;
      const maxPages = 200;
      const allRows: Array<Record<string, unknown>> = [];

      for (let page = 0; page < maxPages; page += 1) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error: e } = await supabase
          .from("inca_cavi_with_last_posa_and_capo_v2")
          .select(exportColumns.join(","))
          .eq("inca_file_id", selectedFileId)
          .order("codice", { ascending: true })
          .range(from, to);

        if (e) throw e;
        const chunk: Array<Record<string, unknown>> = Array.isArray(data)
          ? ((data as unknown) as Array<Record<string, unknown>>)
          : [];
        allRows.push(...chunk);

        if (chunk.length === 0) break;
        if (chunk.length < pageSize) break;
      }

      if (!allRows.length) {
        setExportError("Nessun dato INCA da esportare per il dataset selezionato.");
        return;
      }

      const rows = [
        exportColumns,
        ...allRows.map((row) => exportColumns.map((col) => normalizeCell(row[col]))),
      ];

      const stamp = new Date().toISOString().slice(0, 10);
      const safeCostr = headerCostr ? headerCostr.replace(/[^a-z0-9]+/gi, "_") : "costr";
      const safeCommessa = headerCommessa ? headerCommessa.replace(/[^a-z0-9]+/gi, "_") : "commessa";
      const filename = `inca_export_${safeCostr}_${safeCommessa}_${stamp}.xlsx`;
      downloadXlsx(rows, filename);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[UfficioIncaHub] export error:", err);
      setExportError("Errore durante l'esportazione INCA. Riprova.");
    } finally {
      setExporting(false);
    }
  }, [selectedFileId, exporting, headerCostr, headerCommessa]);

  if (loadingFiles) {
    return <LoadingScreen message="Caricamento modulo INCA…" />;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Tracciamento INCA
          </div>
          <div className="text-2xl font-semibold text-slate-50">
            INCA · avanzamento cavi
          </div>
          <div className="text-[12px] text-slate-400 mt-1">
            Import XLSX · file · cockpit. (CORE 1.0: PDF disattivato)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-[13px] font-semibold text-slate-200 hover:bg-slate-900/60"
            title="Importa un file INCA (XLSX)"
          >
            Importa INCA
          </button>

          <button
            type="button"
            onClick={handleExportInca}
            disabled={!selectedFileId || exporting}
            className={[
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition",
              selectedFileId && !exporting
                ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20"
                : "border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed",
            ].join(" ")}
            title={selectedFileId ? "Esporta dataset INCA (CSV)" : "Seleziona un file INCA"}
          >
            {exporting ? "Esportazione…" : "Esporta INCA"}
          </button>

          <button
            type="button"
            onClick={() => setCockpitOpen(true)}
            disabled={!selectedFileId}
            className={[
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition",
              selectedFileId
                ? "border-sky-500/70 bg-sky-500/15 text-sky-100 hover:bg-sky-500/20"
                : "border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed",
            ].join(" ")}
            title={selectedFileId ? "Apri cockpit INCA" : "Seleziona un file INCA"}
          >
            <span className="text-lg leading-none">+</span>
            Apri cockpit
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-[12px] text-amber-200">
          {error}
        </div>
      )}
      {exportError && (
        <div className="mb-3 rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-[12px] text-amber-200">
          {exportError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Import INCA
              </div>
              <div className="text-[13px] text-slate-200 font-semibold">
                XLSX (CORE 1.0)
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/60"
              onClick={() => setImportOpen(true)}
            >
              Importa file INCA
            </button>
          </div>

          <div className="mt-3 text-[12px] text-slate-500">
            Regola: il cockpit lavora su file INCA già importati (inca_cavi).
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Cantieri / Navi
              </div>
              <div className="text-[13px] text-slate-200 font-semibold">
                Vista sintetica
              </div>
            </div>
            <div className="text-[11px] text-slate-500">{files.length} dataset</div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-3">
            {files.length === 0 ? (
              <div className="text-[12px] text-slate-500">
                Nessun progetto attivo. Importa un file INCA (XLSX).
              </div>
            ) : (
              <div className="text-[12px] text-slate-400">
                Seleziona un file e apri il cockpit.{" "}
                {selectedFile ? (
                  <span className="text-slate-500">
                    (Selezionato: {headerCostr || "—"} · {headerCommessa || "—"})
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              File INCA caricati
            </div>
            <div className="text-[12px] text-slate-400">
              Vista canonica (HEAD only): 1 dataset attivo per progetto.
            </div>
          </div>

          <button
            type="button"
            onClick={() => refreshFiles()}
            disabled={refreshing}
            className={[
              "rounded-xl border px-3 py-2 text-[12px]",
              refreshing
                ? "border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed"
                : "border-slate-700 bg-slate-900/40 text-slate-200 hover:bg-slate-900/60",
            ].join(" ")}
          >
            {refreshing ? "Aggiornamento…" : "Aggiorna"}
          </button>
        </div>

        <div className="max-h-[52vh] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur border-b border-slate-800">
              <tr className="text-left text-[11px] text-slate-500">
                <th className="px-4 py-2">COSTR</th>
                <th className="px-4 py-2">Commessa</th>
                <th className="px-4 py-2">Progetto</th>
                <th className="px-4 py-2">Nome file</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Ultimo upload</th>
              </tr>
            </thead>

            <tbody>
              {files.map((f) => {
                const active = f.id === selectedFileId;

                return (
                  <tr
                    key={f.id}
                    className={[
                      "border-b border-slate-900/80 cursor-pointer",
                      active ? "bg-sky-500/10" : "hover:bg-slate-900/40",
                    ].join(" ")}
                    onClick={() => setSelectedFileId(f.id)}
                    title="Seleziona file"
                  >
                    <td className="px-4 py-2 text-[12px] text-slate-100 font-semibold">
                      {f.costr || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-300">
                      {f.commessa || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-400">
                      {f.project_code || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-200">
                      {f.file_name || "—"}
                      {f.uploads_count > 1 ? (
                        <span className="ml-2 text-[11px] text-slate-500">
                          · {f.uploads_count} uploads
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-400">
                      {f.file_type || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-500">
                      {f.last_uploaded_at ? new Date(f.last_uploaded_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}

              {files.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-slate-500">
                    Nessun file INCA trovato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedFile && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[12px] text-slate-400">
              Selezionato:{" "}
              <span className="text-slate-100 font-semibold">
                {selectedFile.costr || "—"} · {selectedFile.commessa || "—"}
              </span>{" "}
              <span className="text-slate-500">· {selectedFile.file_name || "—"}</span>
              {selectedFile.last_uploaded_at ? (
                <span className="ml-2 text-slate-600">
                  · ultimo upload {new Date(selectedFile.last_uploaded_at).toLocaleString()}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/ufficio/inca-audit?headId=${encodeURIComponent(selectedFileId || "")}`}
                className="rounded-xl border border-slate-700/70 bg-white/5 px-3 py-2 text-[12px] font-semibold text-slate-200 hover:bg-white/10"
              >
                Audit archives
              </Link>

              <button
                type="button"
                onClick={() => setCockpitOpen(true)}
                className="rounded-xl border border-sky-500/70 bg-sky-500/15 px-3 py-2 text-[12px] text-sky-100 hover:bg-sky-500/20"
              >
                Apri cockpit (HEAD)
              </button>
            </div>
          </div>
        )}
      </div>

      <IncaImportModal
        open={importOpen}
        onClose={handleImportClose}
        defaultCostr={headerCostr || ""}
        defaultCommessa={headerCommessa || ""}
        onImported={async (data: any) => {
          const newId: string | null = data?.inca_file_id || data?.inca_file?.id || null;
          clearIncaImportDraft();
          setImportOpen(false);

          // No hard reload. Refresh data and force-select the proper HEAD dataset.
          // If the import returned a non-head upload id, we remap it to its HEAD.
          await refreshFiles({ forceSelectId: newId || undefined });
        }}
      />

      <IncaCockpitModal
        open={cockpitOpen}
        incaFileId={selectedFileId}
        onClose={() => setCockpitOpen(false)}
      />
    </div>
  );
}


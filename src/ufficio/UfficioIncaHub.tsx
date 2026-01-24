import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

import LoadingScreen from "../components/LoadingScreen";
import IncaCockpitModal from "../features/inca/IncaCockpitModal";
// IMPORTANT: explicit extension to avoid resolving legacy IncaImportModal.jsx
import IncaImportModal from "../features/inca/IncaImportModal.tsx";
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
};

export default function UfficioIncaHub(): JSX.Element {
  const [files, setFiles] = useState<IncaFileRow[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    (list: IncaFileRow[], preferredId: string): string => {
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
        const list = await loadFiles();
        setFiles(list);

        const nextId = ensureValidSelection(list, opts?.forceSelectId ?? selectedFileId);
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
        const list = await loadFiles();
        if (!alive) return;

        setFiles(list);

        const nextId = ensureValidSelection(list, selectedFileId);
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

  const selectedFile = useMemo<IncaFileRow | null>(() => {
    return files.find((f) => f.id === selectedFileId) || null;
  }, [files, selectedFileId]);

  const headerCostr = (selectedFile?.costr || "").trim();
  const headerCommessa = (selectedFile?.commessa || "").trim();

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
            <div className="text-[11px] text-slate-500">{files.length} file</div>
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
              Seleziona un file → Apri cockpit.
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
                <th className="px-4 py-2">Importato</th>
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
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-400">
                      {f.file_type || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-500">
                      {f.uploaded_at ? new Date(f.uploaded_at).toLocaleString() : "—"}
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
            </div>

            <button
              type="button"
              onClick={() => setCockpitOpen(true)}
              className="rounded-xl border border-sky-500/70 bg-sky-500/15 px-3 py-2 text-[12px] text-sky-100 hover:bg-sky-500/20"
            >
              Apri cockpit
            </button>
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

          // No hard reload. Refresh data and keep the new selection.
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

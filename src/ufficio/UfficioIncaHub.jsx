// src/ufficio/UfficioIncaHub.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

import LoadingScreen from "../components/LoadingScreen";
import IncaCockpitModal from "../inca/IncaCockpitModal";
import IncaImportModal from "../inca/IncaImportModal";

function fmtTs(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("it-IT");
  } catch {
    return String(v);
  }
}

export default function UfficioIncaHub() {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedFileId, setSelectedFileId] = useState("");
  const [cockpitOpen, setCockpitOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const DEV = import.meta?.env?.DEV;
  const logDev = (...args) => DEV && console.log(...args);
  const errDev = (...args) => DEV && console.error(...args);

  const loadFiles = useCallback(async ({ keepSelection = true } = {}) => {
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from("inca_files")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (e) throw e;

      const list = data || [];
      setFiles(list);

      // Selection logic
      if (!keepSelection) {
        // Force select first if present
        if (list.length > 0) setSelectedFileId(list[0].id);
        else setSelectedFileId("");
        return;
      }

      // Keep current selection if still exists; else select first
      if (selectedFileId) {
        const exists = list.some((f) => f.id === selectedFileId);
        if (!exists) {
          setSelectedFileId(list.length > 0 ? list[0].id : "");
        }
      } else {
        if (list.length > 0) setSelectedFileId(list[0].id);
      }
    } catch (err) {
      errDev("[UfficioIncaHub] loadFiles error:", err);
      setError("Impossibile caricare i file INCA.");
      setFiles([]);
      setSelectedFileId("");
    } finally {
      setLoadingFiles(false);
    }
  }, [selectedFileId]);

  useEffect(() => {
    // Initial load only
    loadFiles({ keepSelection: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedFile = useMemo(() => {
    return (files || []).find((f) => f.id === selectedFileId) || null;
  }, [files, selectedFileId]);

  const projectsCount = useMemo(() => {
    const set = new Set();
    for (const f of files || []) {
      const k = `${(f.costr || "—").trim()}·${(f.commessa || "—").trim()}`;
      set.add(k);
    }
    return set.size;
  }, [files]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFiles({ keepSelection: true });
    setRefreshing(false);
  };

  const handleImported = async (result) => {
    // Defensive extraction: commit() may return different shapes depending on your Edge Function
    // We try common fields:
    // - result.inca_file_id
    // - result.fileId
    // - result.file.id
    // - result.data.inca_file_id (sometimes wrapped)
    const pickId =
      result?.inca_file_id ||
      result?.fileId ||
      result?.file_id ||
      result?.file?.id ||
      result?.data?.inca_file_id ||
      result?.data?.fileId ||
      result?.data?.file?.id ||
      null;

    logDev("[UfficioIncaHub] imported result:", result, "pickedId:", pickId);

    setImportOpen(false);

    // Refresh list then auto-select imported file if found
    setRefreshing(true);
    await loadFiles({ keepSelection: true });
    setRefreshing(false);

    if (pickId) {
      setSelectedFileId(pickId);
    }
  };

  if (loadingFiles) {
    return <LoadingScreen message="Caricamento modulo INCA…" />;
  }

  return (
    <div className="p-4">
      {/* TOP: header compact (no bla-bla) */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Tracciamento INCA
          </div>
          <div className="text-2xl font-semibold text-slate-50">
            INCA · avanzamento cavi
          </div>
          <div className="text-[12px] text-slate-400 mt-1">
            Import · file · cockpit.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-[13px] font-semibold text-slate-200 hover:bg-slate-900/60"
          >
            Importa file INCA
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
            Apri cockpit INCA
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className={[
              "rounded-xl border px-4 py-2 text-[13px] font-semibold transition",
              refreshing
                ? "border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed"
                : "border-slate-700 bg-slate-900/40 text-slate-200 hover:bg-slate-900/60",
            ].join(" ")}
            title="Aggiorna lista file"
          >
            {refreshing ? "Aggiorno…" : "Aggiorna"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-[12px] text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* IMPORT CARD (minimal text) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Import INCA
              </div>
              <div className="text-[13px] text-slate-200 font-semibold">
                XLSX / PDF → Analisi → Commit
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-sky-500/70 bg-sky-500/15 px-3 py-2 text-[12px] text-sky-100 hover:bg-sky-500/20"
              onClick={() => setImportOpen(true)}
            >
              Apri Import (modal)
            </button>
          </div>

          <div className="mt-3 text-[12px] text-slate-500">
            Regola: il cockpit lavora su file INCA già importati.
          </div>
        </div>

        {/* RIGHT: Projects / active ships (clean empty) */}
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
            <div className="text-[11px] text-slate-500">
              {files.length} file · {projectsCount} progetti
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-3">
            {files.length === 0 ? (
              <div className="text-[12px] text-slate-500">
                Nessun progetto attivo. Importa un file INCA.
              </div>
            ) : (
              <div className="text-[12px] text-slate-400">
                Seleziona un file e apri il cockpit.
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Selezionato
              </div>
              <div className="mt-1 text-[13px] text-slate-100 font-semibold">
                {(selectedFile.costr || "—").trim()} · {(selectedFile.commessa || "—").trim()}
              </div>
              <div className="mt-1 text-[12px] text-slate-400">
                {selectedFile.file_name || "—"} · {selectedFile.file_type || "—"}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Importato: {fmtTs(selectedFile.uploaded_at)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILES TABLE */}
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

          <div className="text-[11px] text-slate-500">
            {files.length} file
          </div>
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
              {(files || []).map((f) => {
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
                      {fmtTs(f.uploaded_at)}
                    </td>
                  </tr>
                );
              })}

              {files.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[12px] text-slate-500"
                  >
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
              <span className="text-slate-500">
                · {selectedFile.file_name || "—"}
              </span>
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

      {/* IMPORT MODAL */}
      <IncaImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultCostr={(selectedFile?.costr || "").trim()}
        defaultCommessa={(selectedFile?.commessa || "").trim()}
        onImported={handleImported}
      />

      {/* FULLSCREEN COCKPIT MODAL */}
      <IncaCockpitModal
        open={cockpitOpen}
        fileId={selectedFileId}
        onClose={() => setCockpitOpen(false)}
      />
    </div>
  );
}

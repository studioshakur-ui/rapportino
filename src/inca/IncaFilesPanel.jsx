// src/inca/IncaFilesPanel.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";

import IncaUploadPanel from "./IncaUploadPanel";
import IncaFilesTable from "./IncaFilesTable";
import IncaCockpit from "./IncaCockpit";

export default function IncaFilesPanel() {
  console.log("[INCA FilesPanel] MONTATO");

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [error, setError] = useState(null);

  // cockpit fullscreen
  const [cockpitFile, setCockpitFile] = useState(null);

  // ───────────────── load files INCA ─────────────────
  const loadFiles = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: dbError } = await supabase
        .from("inca_files")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (dbError) throw dbError;

      setFiles(data || []);

      if (data && data.length > 0 && !selectedFileId) {
        setSelectedFileId(data[0].id);
      }
    } catch (e) {
      console.error("[INCA] Errore caricamento inca_files:", e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFileId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
  };

  const handleImported = async () => {
    await handleRefresh();
  };

  const handleSelectFile = (fileId) => {
    setSelectedFileId(fileId);
  };

  const handleOpenCockpit = (file) => {
    if (!file) return;
    setCockpitFile(file);
  };

  const handleCloseCockpit = () => {
    setCockpitFile(null);
  };

  // ───────────────── map cantieri / navi ─────────────────
  const projectSummary = useMemo(() => {
    const byKey = new Map(); // COSTR+COMMESSA

    for (const f of files || []) {
      const costr = (f.costr || "—").trim();
      const commessa = (f.commessa || "—").trim();
      const key = `${costr}::${commessa}`;

      if (!byKey.has(key)) {
        byKey.set(key, {
          costr,
          commessa,
          files: 0,
        });
      }
      byKey.get(key).files += 1;
    }

    return Array.from(byKey.values()).sort((a, b) => {
      if (a.costr === b.costr) {
        return a.commessa.localeCompare(b.commessa, "it-IT");
      }
      return a.costr.localeCompare(b.costr, "it-IT");
    });
  }, [files]);

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) || null,
    [files, selectedFileId]
  );

  // ───────────────── RENDER ─────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* HEADER BLOC INCA */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-5 py-4">
        <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
          Tracciamento INCA
        </div>
        <div className="mt-1 text-sm text-slate-100">
          Confronto INCA · percorsi · avanzamento cavi
        </div>
        <div className="mt-1 text-[11px] text-slate-400 max-w-2xl">
          Importazione PDF INCA e foglio dati XLSX, analisi dei cavi e
          collegamento con i rapportini giornalieri.
        </div>
      </div>

      {/* IMPORT PDF / XLSX */}
      <IncaUploadPanel onImported={handleImported} />

      {/* TABLE FILE + MAP COCKPIT LATERALE */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)] gap-4">
        {/* LISTE DES FICHIERS INCA */}
        <IncaFilesTable
          files={files}
          loading={loading}
          refreshing={refreshing}
          selectedFileId={selectedFileId}
          onSelectFile={handleSelectFile}
          onRefresh={handleRefresh}
          onOpenCockpit={handleOpenCockpit}
        />

        {/* RECTANGLE DROITE = MAP DES CHANTIERS */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold text-slate-100">
                Cantieri / Navi attive
              </div>
              <div className="text-[11px] text-slate-500">
                Vista globale dei progetti coperti dai file INCA caricati.
              </div>
            </div>

            {selectedFile && (
              <div className="hidden md:flex flex-col items-end text-[11px] text-slate-400">
                <span>File selezionato</span>
                <span className="text-slate-200 font-medium truncate max-w-[240px]">
                  {selectedFile.file_name}
                </span>
                <span className="text-slate-500">
                  {selectedFile.costr || "COSTR ?"} ·{" "}
                  {selectedFile.commessa || "COMMESSA ?"}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3">
            {/* “Slide de map” pour l’instant en mode liste intelligente */}
            <div className="flex-1 rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Mappa sintetica cantieri</span>
                <span className="text-sky-400">
                  {projectSummary.length} progetti attivi
                </span>
              </div>

              <div className="flex-1 overflow-auto">
                {projectSummary.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-500">
                    Carica almeno un file INCA per vedere la distribuzione
                    dei cantieri / navi.
                  </div>
                )}

                {projectSummary.length > 0 && (
                  <ul className="space-y-2 text-[11px]">
                    {projectSummary.map((p, idx) => (
                      <li
                        key={`${p.costr}::${p.commessa}::${idx}`}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-slate-100 font-medium">
                            {p.costr}
                            <span className="text-slate-500"> · </span>
                            {p.commessa}
                          </span>
                          <span className="text-slate-500">
                            {p.files} file INCA collegati
                          </span>
                        </div>
                        <div className="text-right text-[10px] text-slate-400">
                          {/* futur mini radar / heatmap */}
                          <span>Radar percorso · soon</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500">
              Questa area diventerà il{" "}
              <span className="text-sky-400">cockpit mappa nave</span>{" "}
              sincronizzato con INCA e Rapportini (zoom per cantiere, ponte,
              zona…).
            </div>
          </div>
        </div>
      </div>

      {/* POPUP FULLSCREEN COCKPIT INCA */}
      {cockpitFile && (
        <IncaCockpit
          file={cockpitFile}
          onClose={handleCloseCockpit}
          initialRole="UFFICO"
        />
      )}

      {error && (
        <div className="text-[11px] text-rose-400">
          Errore caricamento INCA: {error}
        </div>
      )}
    </div>
  );
}

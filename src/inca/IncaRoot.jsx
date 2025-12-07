// src/pages/IncaRoot.jsx
import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

import IncaUploadPanel from "../inca/IncaUploadPanel";
import IncaFilesTable from "../inca/IncaFilesTable";
import IncaCockpit from "../inca/IncaCockpit";

/**
 * Page principale UFFICIO · Percorso cavi · INCA
 * - Import PDF / XLSX
 * - Liste des fichiers INCA
 * - Ouverture Cockpit INCA en popup fullscreen
 */
export default function IncaRoot() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [error, setError] = useState(null);

  // fichier actuellement ouvert dans le cockpit (popup)
  const [cockpitFile, setCockpitFile] = useState(null);

  // ───────────────── chargement fichiers INCA ─────────────────

  const loadFiles = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);

      const { data, error: dbError } = await supabase
        .from("inca_files")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (dbError) throw dbError;

      const list = data || [];
      setFiles(list);

      // sélection par défaut : premier fichier
      if (list.length > 0 && !selectedFileId) {
        setSelectedFileId(list[0].id);
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

  const handleImported = () => {
    // après import, on relit la liste
    loadFiles();
  };

  const handleSelectFile = (fileId) => {
    setSelectedFileId(fileId);
  };

  const handleOpenCockpit = (file) => {
    if (!file) return;
    console.log("[INCA] ouverture cockpit pour file:", file);
    setCockpitFile(file);
  };

  const handleCloseCockpit = () => {
    setCockpitFile(null);
  };

  const selectedFile = files.find((f) => f.id === selectedFileId) || null;

  return (
    <div className="flex flex-col gap-4">
      {/* Bandeau titre / description */}
      <header className="flex flex-col gap-1">
        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
          Tracciamento INCA
        </div>
        <div className="text-sm text-slate-100">
          Confronto INCA · percorsi · avanzamento cavi
        </div>
      </header>

      {/* Bandeau import INCA */}
      <IncaUploadPanel onImported={handleImported} />

      {/* Tableau des fichiers INCA */}
      <IncaFilesTable
        files={files}
        loading={loading}
        refreshing={refreshing}
        error={error}
        selectedFileId={selectedFileId}
        onSelectFile={handleSelectFile}
        onOpenCockpit={handleOpenCockpit}
      />

      {/* Popup fullscreen Cockpit INCA */}
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

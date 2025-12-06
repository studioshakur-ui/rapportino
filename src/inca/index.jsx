// src/inca/index.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import IncaUploadPanel from './IncaUploadPanel';
import IncaFilesTable from './IncaFilesTable';
import IncaFileViewer from './IncaFileViewer';

export default function IncaRoot() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState(null);

  const loadFiles = useCallback(async () => {
    try {
      setError(null);
      const { data, error: qError } = await supabase
        .from('inca_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (qError) throw qError;
      const list = data || [];
      setFiles(list);

      // Si aucun file sélectionné, on prend le premier
      if (list.length > 0 && !selectedFileId) {
        setSelectedFileId(list[0].id);
      }
    } catch (err) {
      console.error('Errore caricamento inca_files:', err);
      setError('Errore durante il caricamento dei file INCA.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFileId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleAfterImport = async () => {
    setRefreshing(true);
    await loadFiles();
  };

  const handleSelectFile = (fileId) => {
    setSelectedFileId(fileId);
  };

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) || null,
    [files, selectedFileId]
  );

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Header INCA */}
      <section className="mb-2">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
            Modulo INCA · Percorso cavi
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
            <p className="text-xs text-slate-300 max-w-2xl">
              Importa i file INCA (PDF / Excel / immagine) per avere una base
              teorica dei cavi: metri totali, copertura teorica, confronto con i
              rapportini.
            </p>
            <div className="text-[11px] px-2 py-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-200">
              Fase 1 · Archivio & struttura pronta
            </div>
          </div>
        </div>
      </section>

      {/* Panneau d'upload */}
      <section>
        <IncaUploadPanel onImported={handleAfterImport} />
      </section>

      {/* Layout 2 colonnes : archive + detail */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)] gap-4">
        {/* Colonne gauche : archivio file INCA */}
        <div className="min-h-[260px]">
          <IncaFilesTable
            files={files}
            loading={loading}
            refreshing={refreshing}
            error={error}
            selectedFileId={selectedFileId}
            onSelectFile={handleSelectFile}
          />
        </div>

        {/* Colonne droite : dettaglio file + cavi */}
        <div className="min-h-[260px] rounded-xl border border-slate-800 bg-slate-950/70 backdrop-blur-sm shadow-sm">
          <IncaFileViewer file={selectedFile} />
        </div>
      </section>
    </div>
  );
}

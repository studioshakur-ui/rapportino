// src/inca/index.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import IncaUploadPanel from './IncaUploadPanel';
import IncaFilesTable from './IncaFilesTable';

export default function IncaRoot() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadFiles = useCallback(async () => {
    try {
      setError(null);
      const { data, error: qError } = await supabase
        .from('inca_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (qError) throw qError;
      setFiles(data || []);
    } catch (err) {
      console.error('Errore caricamento inca_files:', err);
      setError('Errore durante il caricamento dei file INCA.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleAfterImport = async () => {
    setRefreshing(true);
    await loadFiles();
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Header INCA */}
      <section className="mb-2">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
            Modulo INCA · Percorso cavi
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
            <p className="text-xs text-slate-300">
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

      {/* Liste des fichiers INCA */}
      <section>
        <IncaFilesTable
          files={files}
          loading={loading}
          refreshing={refreshing}
          error={error}
        />
      </section>
    </div>
  );
}

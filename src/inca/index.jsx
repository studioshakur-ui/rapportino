// src/inca/index.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import IncaUploadPanel from './IncaUploadPanel';
import IncaFilesTable from './IncaFilesTable';
import IncaFileViewer from './IncaFileViewer';

export default function IncaRoot() {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ───────────────────────── FETCH FILES ─────────────────────────
  const fetchFiles = useCallback(async () => {
    try {
      setError(null);
      const { data, error: dbError } = await supabase
        .from('inca_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (dbError) throw dbError;

      setFiles(data || []);

      // Si aucun fichier sélectionné, on prend le premier
      if (!selectedFileId && data && data.length > 0) {
        setSelectedFileId(data[0].id);
      }
    } catch (err) {
      console.error('[INCA] Errore caricamento files:', err);
      setError('Impossibile caricare i file INCA. Riprova o contatta l’Ufficio.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFileId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFiles();
  };

  const handleAfterUpload = () => {
    setRefreshing(true);
    fetchFiles();
  };

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) || null,
    [files, selectedFileId]
  );

  const stats = useMemo(() => {
    if (!files || files.length === 0) {
      return {
        totalFiles: 0,
        distinctCostr: 0,
        lastUpload: null,
      };
    }

    const totalFiles = files.length;
    const costrSet = new Set(
      files
        .map((f) => (f.costr || '').trim())
        .filter((v) => v && v !== '-')
    );
    const distinctCostr = costrSet.size;

    const lastUpload = files[0]?.uploaded_at || null;

    return { totalFiles, distinctCostr, lastUpload };
  }, [files]);

  // Helper pour afficher la date “pulita”
  const formatDateTime = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* HEADER COCKPIT */}
      <header className="border-b border-slate-900 bg-slate-950/95 backdrop-blur-sm px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-900/90 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
              Modulo INCA · Lista Cavi
            </div>
            <div className="text-[12px] text-slate-400 font-mono">
              CNCS · CORE / ARCHIVIO · INCA
            </div>
            <div className="text-[13px] text-slate-300 max-w-xl">
              Import, normalizzazione e analisi dei file INCA (XLSX / PDF). Ogni cavo entra
              nell’Archivio con metri, stato e tracciabilità completa.
            </div>
          </div>

          {/* PETIT STRIP KPI */}
          <div className="grid grid-cols-3 gap-2 text-[11px] md:w-[320px]">
            <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
              <div className="text-slate-500 uppercase tracking-[0.16em] mb-1">
                File INCA
              </div>
              <div className="text-lg font-semibold text-slate-50">
                {stats.totalFiles}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
              <div className="text-slate-500 uppercase tracking-[0.16em] mb-1">
                Costr distinti
              </div>
              <div className="text-lg font-semibold text-slate-50">
                {stats.distinctCostr}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
              <div className="text-slate-500 uppercase tracking-[0.16em] mb-1">
                Ultimo import
              </div>
              <div className="text-[11px] text-slate-200">
                {formatDateTime(stats.lastUpload)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-4">
          {/* Ligne topo : Import + message d’erreur éventuel */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <IncaUploadPanel onImported={handleAfterUpload} />

            {error && (
              <div className="rounded-lg border border-amber-600 bg-amber-900/40 px-3 py-2 text-[12px] text-amber-100 lg:max-w-sm">
                <div className="font-semibold mb-1">Attenzione</div>
                <div>{error}</div>
              </div>
            )}
          </div>

          {/* Layout 2 colonnes : Liste fichiers + Viewer */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] gap-4">
            <div className="flex flex-col gap-3">
              <IncaFilesTable
                files={files}
                loading={loading}
                refreshing={refreshing}
                selectedFileId={selectedFileId}
                onSelectFile={setSelectedFileId}
                onRefresh={handleRefresh}
              />
            </div>

            <div className="flex flex-col">
              <IncaFileViewer file={selectedFile} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

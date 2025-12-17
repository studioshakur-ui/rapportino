// src/inca/IncaFilesPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

import IncaUploadPanel from './IncaUploadPanel';
import IncaFilesTable from './IncaFilesTable';
import IncaCockpit from './IncaCockpit';

/**
 * Dashboard INCA côté UFFICIO
 * - Upload PDF/XLSX
 * - Liste des fichiers INCA
 * - Map synthétique des chantiers
 * - Cockpit INCA fullscreen (popup) pour un fichier
 */
export default function IncaFilesPanel() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedFileId, setSelectedFileId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Fichier actuellement ouvert dans le cockpit fullscreen
  const [cockpitFile, setCockpitFile] = useState(null);

  // Logs DEV uniquement (aucun bruit en prod / démo)
  const DEV = import.meta?.env?.DEV;
  const errorDev = (...args) => {
    if (DEV) console.error(...args);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      setError(null);

      // On charge les fichiers INCA
      const { data, error: dbError } = await supabase
        .from('inca_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (dbError) throw dbError;

      setFiles(data || []);

      // Si aucun fichier sélectionné, on prend le premier
      if (data && data.length > 0 && !selectedFileId) {
        setSelectedFileId(data[0].id);
        setSelectedFile(data[0]);
      }
    } catch (e) {
      errorDev('[INCA FilesPanel] Errore loadFiles:', e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }

  function handleImported() {
    // callback depuis IncaUploadPanel
    handleRefresh();
  }

  function handleSelectFile(fileId) {
    setSelectedFileId(fileId);
    const f = files.find((x) => x.id === fileId) || null;
    setSelectedFile(f);
  }

  function handleOpenCockpit(file) {
    if (!file) return;
    setCockpitFile(file);
  }

  const projects = useMemo(() => {
    // regroupe par (costr + commessa) pour la "map"
    const map = new Map();
    for (const f of files) {
      const key = `${(f.costr || '—').trim()} · ${(f.commessa || '—').trim()}`;
      if (!map.has(key)) {
        map.set(key, {
          label: key,
          costr: (f.costr || '—').trim(),
          commessa: (f.commessa || '—').trim(),
          fileCount: 0,
        });
      }
      map.get(key).fileCount += 1;
    }
    return Array.from(map.values());
  }, [files]);

  const selectedProject = useMemo(() => {
    if (!selectedFile) return null;
    return {
      label: `${(selectedFile.costr || '—').trim()} · ${(selectedFile.commessa || '—').trim()}`,
      costr: (selectedFile.costr || '—').trim(),
      commessa: (selectedFile.commessa || '—').trim(),
    };
  }, [selectedFile]);

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER global INCA */}
      <header className="flex flex-col gap-1">
        <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
          Tracciamento INCA
        </div>
        <div className="text-sm font-semibold text-slate-50">
          Confronto INCA · percorsi · avanzamento cavi
        </div>
        <div className="text-[11px] text-slate-400 max-w-2xl">
          Importazione PDF INCA e foglio dati XLSX, analisi dei cavi e
          collegamento con i rapportini giornalieri.
        </div>
      </header>

      {/* Upload */}
      <IncaUploadPanel onImported={handleImported} />

      {/* Contenu 2 colonnes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Colonne gauche : files */}
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold text-slate-200">
            File INCA caricati
          </div>

          <IncaFilesTable
            files={files}
            loading={loading}
            refreshing={refreshing}
            selectedFileId={selectedFileId}
            onSelectFile={handleSelectFile}
            onRefresh={handleRefresh}
            onOpenCockpit={(file) => handleOpenCockpit(file)}
          />

          {error && (
            <div className="mt-1 text-[11px] text-rose-400">
              Errore caricamento file INCA: {error}
            </div>
          )}
        </div>

        {/* Colonne droite : "map / cockpit navire" */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="text-[12px] font-semibold text-slate-100">
                Cantieri / Navi attive
              </div>
              <div className="text-[11px] text-slate-400">
                Vista globale dei progetti coperti dai file INCA caricati.
              </div>
            </div>

            {selectedFile && (
              <div className="text-right text-[11px] text-slate-400">
                <div>File selezionato</div>
                <div className="text-slate-100">
                  {selectedFile.file_name}
                </div>
                <div className="text-slate-500">
                  {(selectedFile.costr || '—').trim()} ·{' '}
                  {(selectedFile.commessa || '—').trim()}
                </div>
              </div>
            )}
          </div>

          {/* "Map" synthétique */}
          <div className="flex-1 px-4 py-3 flex flex-col gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-slate-300">
                  Mappa sintetica cantieri
                </div>
                <div className="text-[11px] text-slate-500">
                  {projects.length} progetti attivi
                </div>
              </div>

              <div className="flex flex-col gap-1 max-h-40 overflow-auto text-[11px]">
                {projects.map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-900/70 border border-slate-800"
                  >
                    <div className="text-slate-100">{p.label}</div>
                    <div className="text-slate-500">
                      {p.fileCount} file INCA collegati
                    </div>
                  </div>
                ))}

                {projects.length === 0 && (
                  <div className="text-slate-500">
                    Nessun progetto ancora collegato. Importa almeno un file
                    INCA per vedere la mappa.
                  </div>
                )}
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                Questa area diventerà il{' '}
                <span className="text-sky-300 font-medium">
                  cockpit mappa nave
                </span>{' '}
                sincronizzato con INCA e Rapportini (zoom per cantiere, ponte,
                zona…).
              </div>
            </div>

            {/* Cockpit INCA inline (synthèse) */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-slate-300">
                  Cockpit INCA (sintesi)
                </div>
                <div className="text-[11px] text-slate-500">
                  {selectedProject ? selectedProject.label : "—"}
                </div>
              </div>

              <IncaCockpit
                fileId={selectedFileId}
                file={selectedFile}
                project={selectedProject}
                onOpenFull={(file) => handleOpenCockpit(file)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cockpit fullscreen */}
      {cockpitFile && (
        <IncaCockpit
          fileId={cockpitFile.id}
          file={cockpitFile}
          project={{
            label: `${(cockpitFile.costr || "—").trim()} · ${(cockpitFile.commessa || "—").trim()}`,
            costr: (cockpitFile.costr || "—").trim(),
            commessa: (cockpitFile.commessa || "—").trim(),
          }}
          fullscreen
          onClose={() => setCockpitFile(null)}
        />
      )}
    </div>
  );
}

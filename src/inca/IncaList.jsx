// src/inca/IncaList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function getSelectedFileIdFromLocation(location) {
  // Exemples d'URL :
  // - /ufficio/inca
  // - /ufficio/inca/file/UUID
  const match = location.pathname.match(/\/inca\/file\/([^/]+)/);
  return match ? match[1] : null;
}

export default function IncaList({ reloadKey }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const selectedFileId = getSelectedFileIdFromLocation(location);

  useEffect(() => {
    let active = true;

    async function loadFiles() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: dbError } = await supabase
          .from('inca_files')
          .select('*')
          .order('uploaded_at', { ascending: false });

        if (dbError) throw dbError;
        if (!active) return;

        setFiles(data || []);
      } catch (err) {
        console.error('[INCA] Errore caricamento inca_files:', err);
        if (active) {
          setError('Errore durante il caricamento dei file INCA.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFiles();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleSelect = (fileId) => {
    navigate(`file/${fileId}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header liste */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            File INCA importati
          </div>
          <div className="text-[11px] text-slate-500">
            PDF archiviati e collegati alla base dati
          </div>
        </div>
        {files.length > 0 && (
          <div className="text-[11px] text-slate-400">
            <span className="font-mono text-slate-2 00">{files.length}</span>{' '}
            file
          </div>
        )}
      </div>

      {/* Contenu liste */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading && (
          <div className="p-4 text-[12px] text-slate-400">
            Caricamento file INCA…
          </div>
        )}

        {error && !loading && (
          <div className="p-4 text-[12px] text-amber-300 bg-amber-900/30 border-t border-amber-800">
            {error}
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="p-4 text-[12px] text-slate-400">
            Nessun PDF INCA importato al momento.
            <br />
            Usa il pulsante{' '}
            <span className="text-emerald-300">
              “Importa file INCA (PDF)”
            </span>{' '}
            per caricare il primo file.
          </div>
        )}

        {!loading && !error && files.length > 0 && (
          <ul className="divide-y divide-slate-800 text-[12px]">
            {files.map((f) => {
              const isActive = f.id === selectedFileId;

              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(f.id)}
                    className={[
                      'w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors',
                      isActive
                        ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                        : 'hover:bg-slate-900/80 border-l-2 border-transparent',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[12px] text-slate-100 font-medium">
                        {f.file_name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {f.costr && (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-200">
                            {f.costr}
                          </span>
                        )}
                        {f.commessa && (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-200">
                            {f.commessa}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        Progetto:{' '}
                        <span className="text-slate-300">
                          {f.project_code || '—'}
                        </span>
                      </span>
                      <span>
                        Caricato il:{' '}
                        <span className="text-slate-300">
                          {f.uploaded_at
                            ? new Date(f.uploaded_at).toLocaleString()
                            : '—'}
                        </span>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

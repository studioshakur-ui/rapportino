// src/inca/IncaRoot.jsx
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import IncaUploadPanel from './IncaUploadPanel';
import IncaList from './IncaList';
import IncaFileDetail from './IncaFileDetail';

export default function IncaRoot() {
  const [reloadKey, setReloadKey] = useState(0);

  const handleImported = () => {
    // Force un refresh de la liste des fichiers
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête INCA */}
      <div className="flex flex-col gap-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
          Modulo INCA · Percorso cavi teorico
        </div>
        <div className="text-xs text-slate-300">
          Importazione PDF INCA, analisi dei cavi e collegamento con i
          rapportini giornalieri.
        </div>
      </div>

      {/* Panneau d'import PDF */}
      <IncaUploadPanel onImported={handleImported} />

      {/* Layout 2 colonnes : liste + détail */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] gap-4 mt-2">
        {/* Colonne gauche : liste des fichiers INCA */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm shadow-sm min-h-[260px]">
          <IncaList reloadKey={reloadKey} />
        </div>

        {/* Colonne droite : détail du fichier sélectionné */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 backdrop-blur-sm shadow-sm min-h-[260px]">
          <Routes>
            <Route
              path="/"
              element={
                <div className="h-full flex items-center justify-center p-6 text-[13px] text-slate-400">
                  <div className="text-center max-w-md">
                    <div className="mb-2 text-slate-200 font-medium">
                      Nessun file INCA selezionato
                    </div>
                    <p>
                      Importa un PDF INCA oppure seleziona un file dalla lista
                      a sinistra per vedere i cavi teorici, le lunghezze e lo
                      stato (T, P, R, B).
                    </p>
                  </div>
                </div>
              }
            />
            <Route path="file/:fileId" element={<IncaFileDetail />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

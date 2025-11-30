// src/inca/index.js
import React, { useState } from 'react';
import IncaFilesPanel from './IncaFilesPanel.jsx';
import IncaCaviTable from './IncaCaviTable.jsx';
import IncaPercorsoModal from './IncaPercorsoModal.jsx';
import IncaImportModal from './IncaImportModal.jsx';

/**
 * IncaRoot
 *
 * Vue principale du module INCA côté Ufficio :
 *  - panneau des fichiers INCA importés
 *  - tableau des cavi
 *  - modale "Percorso" pour voir le chemin du cavo
 *  - modale d'import (PDF / Excel / image) si tu l'utilises
 */
export default function IncaRoot() {
  const [selectedCavo, setSelectedCavo] = useState(null);
  const [showPercorso, setShowPercorso] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleOpenPercorso = (cavo) => {
    setSelectedCavo(cavo || null);
    setShowPercorso(true);
  };

  const handleClosePercorso = () => {
    setShowPercorso(false);
    setSelectedCavo(null);
  };

  const handleOpenImport = () => {
    setShowImport(true);
  };

  const handleCloseImport = () => {
    setShowImport(false);
  };

  return (
    <div className="space-y-4">
      {/* Header INCA */}
      <header className="mb-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
          Modulo INCA · Percorso cavi
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
          <p className="text-xs text-slate-300">
            Visualizza i cavi importati da INCA, i percorsi sui supporti e lo
            stato di avanzamento collegato ai rapportini giornalieri.
          </p>
          <button
            type="button"
            onClick={handleOpenImport}
            className="no-print inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-500/70 bg-emerald-500/10 text-[11px] text-emerald-100 hover:bg-emerald-500/20"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Importa da INCA</span>
          </button>
        </div>
      </header>

      {/* 1) Fichiers INCA importés */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/80">
        <IncaFilesPanel onOpenImport={handleOpenImport} />
      </section>

      {/* 2) Tableau des cavi */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/80">
        <IncaCaviTable onOpenPercorso={handleOpenPercorso} />
      </section>

      {/* 3) Modale Percorso (chemin du cavo) */}
      <IncaPercorsoModal
        open={showPercorso}
        cavo={selectedCavo}
        onClose={handleClosePercorso}
      />

      {/* 4) Modale d'import INCA */}
      <IncaImportModal open={showImport} onClose={handleCloseImport} />
    </div>
  );
}

// Exports nommés optionnels si tu veux les utiliser ailleurs
export {
  IncaFilesPanel,
  IncaCaviTable,
  IncaPercorsoModal,
  IncaImportModal,
};

// src/inca/IncaFileViewer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import IncaFileDetail from './IncaFileDetail';
import IncaCaviTable from './IncaCaviTable';

export default function IncaFileViewer({ file }) {
  const [cavi, setCavi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Chargement des cavi pour ce file.id
  useEffect(() => {
    let active = true;

    async function loadCavi() {
      if (!file?.id) {
        setCavi([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: dbError } = await supabase
          .from('inca_cavi')
          .select('*')
          .eq('inca_file_id', file.id)
          .order('codice', { ascending: true });

        if (dbError) throw dbError;
        if (!active) return;

        setCavi(data || []);
      } catch (err) {
        console.error('[INCA] Errore caricamento cavi:', err);
        if (active) {
          setError(
            'Impossibile caricare i cavi INCA per questo file. Riprova o contatta l’Ufficio.'
          );
          setCavi([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCavi();

    return () => {
      active = false;
    };
  }, [file?.id]);

  const metrics = useMemo(() => {
    const list = Array.isArray(cavi) ? cavi : [];
    let metriTeo = 0;
    let metriPrev = 0;
    let metriPosati = 0;
    let metriTot = 0;
    const byStatoCantiere = {};

    for (const c of list) {
      if (c.metri_teo != null) metriTeo += Number(c.metri_teo) || 0;
      if (c.metri_previsti != null) metriPrev += Number(c.metri_previsti) || 0;
      if (c.metri_posati_teorici != null)
        metriPosati += Number(c.metri_posati_teorici) || 0;
      if (c.metri_totali != null) metriTot += Number(c.metri_totali) || 0;

      const stato = (c.stato_cantiere || '').trim() || 'SENZA STATO';
      byStatoCantiere[stato] = (byStatoCantiere[stato] || 0) + 1;
    }

    return {
      totalCavi: list.length,
      metriTeo,
      metriPrev,
      metriPosati,
      metriTot,
      byStatoCantiere,
    };
  }, [cavi]);

  if (!file) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-[13px] text-slate-300">
        <div className="text-[12px] text-slate-400 uppercase tracking-[0.18em] mb-1">
          Modulo INCA · Nessun file selezionato
        </div>
        <div className="text-[15px] font-semibold text-slate-50 mb-1">
          Seleziona un file INCA dalla lista
        </div>
        <p className="text-[13px] text-slate-300 max-w-xl">
          A sinistra trovi tutti i file INCA importati (XLSX / PDF). Seleziona un file
          per vedere la lista cavi normalizzata con metri, stati e note. Ogni cavo
          è collegato all’Archivio CORE.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4">
      <IncaFileDetail file={file} metrics={metrics} />

      {error && (
        <div className="mb-3 rounded-md border border-amber-600 bg-amber-900/40 px-3 py-2 text-[12px] text-amber-100">
          {error}
        </div>
      )}

      <IncaCaviTable cavi={cavi} loading={loading} />
    </div>
  );
}

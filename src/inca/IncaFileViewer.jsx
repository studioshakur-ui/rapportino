// src/inca/IncaFileViewer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function formatNumber(value) {
  if (value == null) return '0';
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function badgeForSituazione(situazione) {
  const s = (situazione || '').toUpperCase();

  if (s === 'P') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-200 border border-emerald-500/60">
        P · POSATO
      </span>
    );
  }

  if (s === 'T') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-sky-500/15 text-sky-200 border border-sky-500/60">
        T · TEORICO
      </span>
    );
  }

  if (s === 'R') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-200 border border-amber-500/60">
        R · RISERVATO
      </span>
    );
  }

  if (s === 'B') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-rose-500/15 text-rose-200 border border-rose-500/60">
        B · BLOCCATO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-800/80 text-slate-200 border border-slate-600">
      —
    </span>
  );
}

export default function IncaFileViewer({ file }) {
  const [cables, setCables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadCavi() {
      if (!file || !file.id) {
        setCables([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1er essai : schema "nuovo" → from_file_id
        let { data, error: qError } = await supabase
          .from('inca_cavi')
          .select('*')
          .eq('from_file_id', file.id)
          .order('codice', { ascending: true });

        if (qError) throw qError;

        // Si aucun cavo trouvé avec from_file_id, on tente l'ancien schema inca_file_id
        if (!data || data.length === 0) {
          const { data: dataAlt, error: qErrorAlt } = await supabase
            .from('inca_cavi')
            .select('*')
            .eq('inca_file_id', file.id)
            .order('codice', { ascending: true });

          if (qErrorAlt) throw qErrorAlt;
          data = dataAlt || [];
        }

        if (!active) return;
        setCables(data || []);
      } catch (err) {
        console.error('[INCA] Errore caricamento cavi file INCA:', err);
        if (active) {
          setError('Errore durante il caricamento dei cavi teorici per questo file.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCavi();

    return () => {
      active = false;
    };
  }, [file?.id]);

  const stats = useMemo(() => {
    let previsti = 0;
    let posati = 0;

    for (const c of cables) {
      // On gère PDF (metri_previsti / metri_posati_teorici) + Excel (metri_teo / metri_sit_cavo)
      const mPrev =
        Number(
          c.metri_previsti ??
            c.metri_teo ??
            c.metri_dis ??
            0
        ) || 0;

      const mPos =
        Number(
          c.metri_posati_teorici ??
            c.metri_sit_cavo ??
            0
        ) || 0;

      if (Number.isFinite(mPrev)) previsti += mPrev;
      if (Number.isFinite(mPos)) posati += mPos;
    }

    const coverage = previsti > 0 ? (100 * posati) / previsti : 0;

    return {
      previsti,
      posati,
      coverage,
    };
  }, [cables]);

  if (!file || !file.id) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-[13px] text-slate-400">
        Seleziona un file INCA nella colonna a sinistra per vedere i cavi
        teorici, le lunghezze e la situazione.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-[13px] text-slate-400">
        Caricamento dettaglio INCA…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-[13px] text-amber-200">
        <div className="mb-2 font-medium text-amber-300">Attenzione</div>
        <div className="text-center max-w-md">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header detail */}
      <div className="px-4 py-3 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="text-[12px] text-slate-200 font-medium truncate">
              {file.file_name}
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap gap-2">
              {file.costr && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-100">
                  Nave: {file.costr}
                </span>
              )}
              {file.commessa && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-100">
                  Commessa: {file.commessa}
                </span>
              )}
              {file.project_code && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-100">
                  Progetto: {file.project_code}
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 text-right">
            Caricato il:{' '}
            <span className="text-slate-200">
              {file.uploaded_at
                ? new Date(file.uploaded_at).toLocaleString()
                : '—'}
            </span>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
            <div className="text-slate-400">Cavi teorici</div>
            <div className="text-slate-50 font-mono text-sm">
              {cables.length}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
            <div className="text-slate-400">Metri teorici</div>
            <div className="text-slate-50 font-mono text-sm">
              {formatNumber(stats.previsti)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
            <div className="text-slate-400">Copertura teorica</div>
            <div className="text-slate-50 font-mono text-sm">
              {stats.coverage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des cavi */}
      <div className="flex-1 min-h-0 overflow-auto">
        {cables.length === 0 ? (
          <div className="p-4 text-[12px] text-slate-400">
            Nessun cavo teorico registrato per questo file INCA.
            <br />
            Il parsing PDF/Excel può essere raffinato in una fase successiva.
          </div>
        ) : (
          <div className="p-3">
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full border-collapse text-[11px]">
                <thead className="bg-slate-900/90 border-b border-slate-800">
                  <tr>
                    <th className="px-2 py-1.5 text-left border-r border-slate-800">
                      CODICE
                    </th>
                    <th className="px-2 py-1.5 text-left border-r border-slate-800">
                      DESCRIZIONE
                    </th>
                    <th className="px-2 py-1.5 text-right border-r border-slate-800">
                      METRI TEORICI
                    </th>
                    <th className="px-2 py-1.5 text-right border-r border-slate-800">
                      METRI POSATI (teorici)
                    </th>
                    <th className="px-2 py-1.5 text-left">
                      SITUAZIONE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cables.map((c) => {
                    const metriPrev =
                      c.metri_previsti ??
                      c.metri_teo ??
                      c.metri_dis ??
                      0;
                    const metriPos =
                      c.metri_posati_teorici ??
                      c.metri_sit_cavo ??
                      0;

                    return (
                      <tr
                        key={c.id}
                        className="border-t border-slate-800/80 hover:bg-slate-900/70"
                      >
                        <td className="px-2 py-1.5 font-mono text-[11px] text-slate-100 border-r border-slate-800">
                          {c.codice}
                        </td>
                        <td className="px-2 py-1.5 text-slate-200 border-r border-slate-800">
                          {c.descrizione || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-100 border-r border-slate-800">
                          {formatNumber(metriPrev)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-100 border-r border-slate-800">
                          {formatNumber(metriPos)}
                        </td>
                        <td className="px-2 py-1.5">
                          {badgeForSituazione(c.situazione || c.stato_inca)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// src/components/RapportinoSheet.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeEmptyRow(index = 0) {
  return {
    id: null,
    row_index: index,
    categoria: '',
    descrizione: '',
    operatori: '',
    tempo: '',
    previsto: '',
    prodotto: '',
    note: '',
  };
}

export default function RapportinoSheet({ crewRole }) {
  const { user, profile } = useAuth();

  const [date, setDate] = useState(todayISO());
  const [capoName, setCapoName] = useState(
    profile?.display_name || profile?.email || ''
  );
  const [status, setStatus] = useState('DRAFT');
  const [rapportinoId, setRapportinoId] = useState(null);

  // Nouveau : Costr. (bateau) et Commessa
  const [costr, setCostr] = useState('');
  const [commessa, setCommessa] = useState('SDC');

  const [rows, setRows] = useState([makeEmptyRow(0)]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);

  // Met à jour le nom de capo dès que le profil arrive
  useEffect(() => {
    if (!capoName && profile) {
      setCapoName(profile.display_name || profile.email || '');
    }
  }, [profile, capoName]);

  // Chargement du rapportino du jour (si existe)
  useEffect(() => {
    if (!user || !date) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setSaveMessage(null);

      try {
        const { data: header, error: headerError } = await supabase
          .from('rapportini')
          .select('*')
          // on reste sur user_id pour coller à ton schéma actuel
          .eq('user_id', user.id)
          // on utilise report_date si tu l'as, sinon data (on garde report_date pour compatibilité)
          .eq('report_date', date)
          .maybeSingle();

        if (headerError) throw headerError;
        if (cancelled) return;

        if (header) {
          setRapportinoId(header.id);
          setCapoName(
            header.capo_name ||
              profile?.display_name ||
              profile?.email ||
              ''
          );
          setStatus(header.status || 'DRAFT');
          setCostr(header.costr || '');
          setCommessa(header.commessa || 'SDC');

          const { data: rowData, error: rowsError } = await supabase
            .from('rapportino_rows')
            .select('*')
            .eq('rapportino_id', header.id)
            .order('row_index', { ascending: true });

          if (rowsError) throw rowsError;
          if (cancelled) return;

          if (rowData && rowData.length > 0) {
            setRows(
              rowData.map((r, idx) => ({
                id: r.id,
                row_index: r.row_index ?? idx,
                categoria: r.categoria || '',
                descrizione: r.descrizione || '',
                operatori: r.operatori || '',
                tempo: r.tempo || '',
                previsto: r.previsto ?? '',
                prodotto: r.prodotto ?? '',
                note: r.note || '',
              }))
            );
          } else {
            setRows([makeEmptyRow(0)]);
          }
        } else {
          // aucun rapportino pour ce jour → nouvelle feuille
          setRapportinoId(null);
          setStatus('DRAFT');
          setCapoName(profile?.display_name || profile?.email || '');
          setCostr('');
          setCommessa('SDC');
          setRows([makeEmptyRow(0)]);
        }
      } catch (err) {
        console.error('Errore caricamento rapportino:', err);
        if (!cancelled) {
          setLoadError(
            'Impossibile caricare il rapportino: ' +
              (err?.message || err?.details || '')
          );
          setRapportinoId(null);
          setRows([makeEmptyRow(0)]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, date, profile]);

  function handleRowChange(index, field, value) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function handleAddRow() {
    setRows((prev) => [...prev, makeEmptyRow(prev.length)]);
  }

  function handleRemoveRow(index) {
    setRows((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length === 0) return [makeEmptyRow(0)];
      return filtered.map((row, i) => ({ ...row, row_index: i }));
    });
  }

  function computeProdottoTot(rowsToUse) {
    return rowsToUse.reduce((sum, row) => {
      const v =
        row.prodotto === '' || row.prodotto == null ? 0 : Number(row.prodotto);
      if (Number.isNaN(v)) return sum;
      return sum + v;
    }, 0);
  }

  async function handleSave() {
    if (!user || !date) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const cleanedRows = rows.map((row, index) => ({
        ...row,
        row_index: index,
      }));
      const prodottoTot = computeProdottoTot(cleanedRows);

      const headerPayload = {
        user_id: user.id, // ton schéma actuel
        capo_id: null, // sera copié depuis user_id par le trigger DB
        crew_role: crewRole || null,
        // pour compatibilité avec ton schéma existant :
        report_date: date,
        data: date,
        capo_name: capoName || null,
        costr: costr || null,
        commessa: commessa || 'SDC',
        status: status || 'DRAFT',
        prodotto_tot: prodottoTot,
      };

      let headerData;

      if (rapportinoId) {
        const { data, error } = await supabase
          .from('rapportini')
          .update(headerPayload)
          .eq('id', rapportinoId)
          .select('*')
          .single();
        if (error) throw error;
        headerData = data;
      } else {
        const { data, error } = await supabase
          .from('rapportini')
          .insert(headerPayload)
          .select('*')
          .single();
        if (error) throw error;
        headerData = data;
      }

      const newRapportinoId = headerData.id;
      setRapportinoId(newRapportinoId);
      setStatus(headerData.status || 'DRAFT');
      setCostr(headerData.costr || costr);
      setCommessa(headerData.commessa || commessa);

      const { error: delError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', newRapportinoId);
      if (delError) throw delError;

      const rowsToInsert = cleanedRows
        .filter((row) => {
          const hasText =
            row.categoria ||
            row.descrizione ||
            row.operatori ||
            row.tempo ||
            row.note;
          const hasNumbers =
            (row.previsto !== '' && row.previsto != null) ||
            (row.prodotto !== '' && row.prodotto != null);
          return hasText || hasNumbers;
        })
        .map((row) => ({
          rapportino_id: newRapportinoId,
          row_index: row.row_index,
          categoria: row.categoria || null,
          descrizione: row.descrizione || null,
          operatori: row.operatori || null,
          tempo: row.tempo || null,
          previsto:
            row.previsto === '' || row.previsto == null
              ? null
              : Number(row.previsto),
          prodotto:
            row.prodotto === '' || row.prodotto == null
              ? null
              : Number(row.prodotto),
          note: row.note || null,
        }));

      if (rowsToInsert.length > 0) {
        const { error: insError } = await supabase
          .from('rapportino_rows')
          .insert(rowsToInsert);
        if (insError) throw insError;
      }

      setSaveMessage('Rapportino salvato in CORE ✅');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.error('Errore salvataggio rapportino:', err);
      const msg =
        err?.message ||
        err?.details ||
        err?.hint ||
        'Errore durante il salvataggio del rapportino.';
      setSaveMessage('Errore: ' + msg);
      setTimeout(() => setSaveMessage(null), 8000);
    } finally {
      setSaving(false);
    }
  }

  function handleNewDay() {
    setDate(todayISO());
    setRapportinoId(null);
    setStatus('DRAFT');
    setRows([makeEmptyRow(0)]);
    setSaveMessage(null);
    setLoadError(null);
    // On ne change pas costr/commessa → le capo garde son bateau/commessa
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      {/* Intestazione */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Rapportino Giornaliero {crewRole ? `– ${crewRole}` : ''}
          </h2>

          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-medium">Capo squadra:</span>
              <input
                type="text"
                value={capoName || ''}
                onChange={(e) => setCapoName(e.target.value)}
                className="border border-slate-300 rounded px-2 py-0.5 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Costr.
                </span>
                <input
                  type="text"
                  value={costr}
                  onChange={(e) => setCostr(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-0.5 text-sm w-24"
                  placeholder="6368"
                />
              </label>

              <label className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Commessa
                </span>
                <input
                  type="text"
                  value={commessa}
                  onChange={(e) => setCommessa(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-0.5 text-sm w-24"
                  placeholder="SDC"
                />
              </label>

              <label className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Data
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-0.5 text-sm"
                />
              </label>
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="uppercase tracking-wide">Stato:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${
                  status === 'DRAFT'
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                    : status === 'VALIDATED_CAPO'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : status === 'APPROVED_UFFICIO'
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : status === 'RETURNED'
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-2 mt-2 md:mt-6 justify-end">
            <button
              type="button"
              onClick={handleNewDay}
              className="px-3 py-1.5 text-xs rounded border border-slate-400 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              disabled={loading || saving}
            >
              Nuova giornata
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={loading || saving}
            >
              {saving ? 'Salvataggio…' : 'Salva rapportino'}
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {loadError}
        </div>
      )}

      {/* Tabella principale */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="border border-slate-200 px-2 py-1 text-left w-24">
                CATEGORIA
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left w-48">
                DESCRIZIONE ATTIVITÀ
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left w-40">
                OPERATORE
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left w-40">
                TEMPO IMPIEGATO
              </th>
              <th className="border border-slate-200 px-2 py-1 text-right w-20">
                PREVISTO
              </th>
              <th className="border border-slate-200 px-2 py-1 text-right w-20">
                PRODOTTO
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left w-40">
                NOTE
              </th>
              <th className="border border-slate-200 px-2 py-1 text-center w-12">
                -
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="border border-slate-200 px-1 py-1 align-top">
                  <input
                    type="text"
                    value={row.categoria}
                    onChange={(e) =>
                      handleRowChange(index, 'categoria', e.target.value)
                    }
                    className="w-full border border-slate-200 rounded px-1 py-0.5"
                    disabled={loading}
                  />
                </td>
                <td className="border border-slate-200 px-1 py-1 align-top">
                  <textarea
                    value={row.descrizione}
                    onChange={(e) =>
                      handleRowChange(index, 'descrizione', e.target.value)
                    }
                    rows={3}
                    className="w-full border border-slate-200 rounded px-1 py-0.5"
                    disabled={loading}
                  />
                </td>
                <td className="border border-slate-200 px-1 py-1 align-top">
                  <textarea
                    value={row.operatori}
                    onChange={(e) =>
                      handleRowChange(index, 'operatori', e.target.value)
                    }
                    rows={3}
                    className="w-full border border-slate-200 rounded px-1 py-0.5"
                    placeholder="Una riga per operatore"
                    disabled={loading}
                  />
                </td>
                <td className="border border-slate-200 px-1 py-1 align-top">
                  <textarea
                    value={row.tempo}
                    onChange={(e) =>
                      handleRowChange(index, 'tempo', e.target.value)
                    }
                    rows={3}
                    className="w-full border border-slate-200 rounded px-1 py-0.5"
                    placeholder="Stesse righe degli operatori"
                    disabled={loading}
                  />
                </td>
                <td className="border border-slate-200 px-1 py-1 align-top">
                  <input
                    type="number"
                    step="0.5"
                    value={row.previsto}
                    onChange={(e) =>
                      handleRowChange(index, 'previsto', e.target.value)
                    }
                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-right"
                    disabled={loading}
                  />
                </td>
                <td className="border border-slate-200 px-1 py-1 align-top">
                  <input
                    type="number"
                    step="0.5"
                    value={row.prodotto}
                    onChange={(e) =>
                      handleRowChange(index, 'prodotto', e.target.value)
                    }
                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-right"
                    disabled={loading}
                  />
                </td>
                <td className="border border-slate-200 px-1 py-1 align-top">
                  <textarea
                    value={row.note}
                    onChange={(e) =>
                      handleRowChange(index, 'note', e.target.value)
                    }
                    rows={3}
                    className="w-full border border-slate-200 rounded px-1 py-0.5"
                    disabled={loading}
                  />
                </td>
                <td className="border border-slate-200 px-1 py-1 align-top text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-40"
                    disabled={loading || rows.length === 1}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 flex justify-between items-center">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-1.5 text-xs rounded border border-slate-400 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            disabled={loading}
          >
            + Aggiungi riga
          </button>

          <div className="text-xs text-slate-600">
            Prodotto totale:{' '}
            <span className="font-semibold">
              {computeProdottoTot(rows).toString()}
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <p className="text-xs text-slate-500">Caricamento del rapportino…</p>
      )}

      {saveMessage && (
        <p className="text-xs text-slate-600 mt-1">{saveMessage}</p>
      )}
    </div>
  );
}

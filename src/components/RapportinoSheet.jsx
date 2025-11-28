import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';

// Modèles de lignes par défaut selon la squadra
const BASE_ROWS_BY_CREW = {
  ELETTRICISTA: [
    { categoria: 'STESURA', descrizione: 'STESURA', previsto: 150 },
    { categoria: 'STESURA', descrizione: 'FASCETTATURA CAVI', previsto: 600 },
    { categoria: 'STESURA', descrizione: 'RIPRESA CAVI', previsto: 150 },
    { categoria: 'STESURA', descrizione: 'VARI STESURA CAVI', previsto: 0.2 }
  ],
  CARPENTERIA: [
    // tu pourras affiner plus tard, ici juste un exemple de base
    { categoria: 'CARPENTERIA', descrizione: 'LAVORI CARPENTERIA', previsto: 0 },
    { categoria: 'CARPENTERIA', descrizione: 'LAVORI CARPENTERIA', previsto: 0 },
    { categoria: 'CARPENTERIA', descrizione: 'LAVORI CARPENTERIA', previsto: 0 },
    { categoria: 'CARPENTERIA', descrizione: 'VARIE CARPENTERIA', previsto: 0.2 }
  ],
  MONTAGGIO: [
    { categoria: 'IMBARCHI', descrizione: 'VARI IMBARCHI (LOGISTICA E TRASPORTO)', previsto: 0.2 },
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA MINORE DI 50 KG', previsto: 12 },
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG', previsto: 1 },
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA DA 151 KG A 400 KG', previsto: 1 },
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA DA 401 KG A 1400 KG', previsto: 0.1 }
  ]
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function RapportinoSheet({ crewRole }) {
  const { profile } = useAuth();

  const [data, setData] = useState(todayISO());
  const [rows, setRows] = useState([]);
  const [rapportinoId, setRapportinoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const capoName =
    (profile?.display_name || profile?.email || '').toUpperCase();

  const stato = 'DRAFT';
  const commessa = 'SDC';
  const costr = '';

  // Initialisation des lignes de base
  useEffect(() => {
    const baseRows = BASE_ROWS_BY_CREW[crewRole] || [];
    setRows(
      baseRows.map((r, idx) => ({
        id: `local-${idx}`,
        categoria: r.categoria,
        descrizione: r.descrizione,
        operatori: '',
        tempo: '',
        previsto: r.previsto ?? null,
        prodotto: null,
        note: ''
      }))
    );
    setLoading(false);
  }, [crewRole]);

  const handleChangeCell = (rowIndex, field, value) => {
    setRows((current) =>
      current.map((row, idx) =>
        idx === rowIndex
          ? {
              ...row,
              [field]:
                field === 'previsto' || field === 'prodotto'
                  ? value === '' ? null : Number(value.replace(',', '.'))
                  : value
            }
          : row
      )
    );
  };

  const handleAddRow = () => {
    setRows((current) => [
      ...current,
      {
        id: `local-${current.length}`,
        categoria: '',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: null,
        prodotto: null,
        note: ''
      }
    ]);
  };

  const handleNewDay = () => {
    setData(todayISO());
    const baseRows = BASE_ROWS_BY_CREW[crewRole] || [];
    setRows(
      baseRows.map((r, idx) => ({
        id: `local-${idx}`,
        categoria: r.categoria,
        descrizione: r.descrizione,
        operatori: '',
        tempo: '',
        previsto: r.previsto ?? null,
        prodotto: null,
        note: ''
      }))
    );
    setRapportinoId(null);
    setSaveError(null);
  };

  const prodottoTotale = rows.reduce(
    (sum, r) => sum + (typeof r.prodotto === 'number' ? r.prodotto : 0),
    0
  );

  // Sauvegarde en base
  const handleSave = useCallback(async () => {
    if (!profile?.id) return;

    setSaving(true);
    setSaveError(null);

    try {
      let currentId = rapportinoId;

      if (!currentId) {
        const { data: insertData, error: insertError } = await supabase
          .from('rapportini')
          .insert({
            user_id: profile.id,
            capo_id: profile.id,
            crew_role: crewRole,
            data,
            stato,
            commessa,
            costr,
            prodotto_totale: prodottoTotale
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        currentId = insertData.id;
        setRapportinoId(currentId);
      } else {
        const { error: updateError } = await supabase
          .from('rapportini')
          .update({
            crew_role: crewRole,
            data,
            stato,
            commessa,
            costr,
            prodotto_totale: prodottoTotale
          })
          .eq('id', currentId);

        if (updateError) throw updateError;
      }

      // Sauvegarde des lignes
      const rowsPayload = rows.map((row, index) => ({
        rapportino_id: currentId,
        row_index: index,
        categoria: row.categoria || null,
        descrizione: row.descrizione || null,
        operatori: row.operatori || null,
        tempo: row.tempo || null,
        previsto: row.previsto,
        prodotto: row.prodotto,
        note: row.note || null
      }));

      // On efface d'abord les anciennes lignes
      const { error: deleteError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', currentId);

      if (deleteError) throw deleteError;

      const { error: rowsError } = await supabase
        .from('rapportino_rows')
        .insert(rowsPayload);

      if (rowsError) throw rowsError;

      setSaveError(null);
    } catch (err) {
      console.error('Erreur sauvegarde rapportino:', err);
      setSaveError(
        'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.'
      );
    } finally {
      setSaving(false);
    }
  }, [profile, rapportinoId, crewRole, data, stato, commessa, costr, prodottoTotale, rows]);

  // Export PDF = ouvrir la boîte de dialogue d'impression
  const handleExportPdf = () => {
    window.print();
  };

  if (loading) {
    return <div>Caricamento del rapportino...</div>;
  }

  return (
    <div className="rapportino-table text-sm">
      {/* En-tête */}
      <div className="mb-4 text-center">
        <div className="flex justify-between mb-2 text-xs">
          <div>
            <div>
              <span className="font-semibold">COSTR.:</span>{' '}
              <span className="inline-block min-w-[80px] border-b border-slate-700">
                {costr}
              </span>
            </div>
            <div>
              <span className="font-semibold">Capo Squadra:</span>{' '}
              <span className="inline-block min-w-[120px] border-b border-slate-700">
                {capoName}
              </span>
            </div>
          </div>
          <div>
            <div>
              <span className="font-semibold">COMMESSA:</span>{' '}
              <span className="inline-block min-w-[80px] border-b border-slate-700">
                {commessa}
              </span>
            </div>
            <div>
              <span className="font-semibold">DATA:</span>{' '}
              <input
                type="date"
                className="border-b border-slate-700 focus:outline-none text-xs"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>
          <div className="text-right">
            <div>
              <span className="font-semibold">Stato:</span>{' '}
              <span className="inline-block border border-slate-700 px-2 py-0.5 text-[11px] rounded-full">
                {stato}
              </span>
            </div>
          </div>
        </div>

        <h1 className="text-base font-semibold mt-1">
          Rapportino Giornaliero – {crewRole}
        </h1>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse rapportino-header-border border-slate-800">
          <thead>
            <tr className="text-xs text-center">
              <th className="rapportino-border border-slate-800 px-2 py-1 w-[12%]">
                CATEGORIA
              </th>
              <th className="rapportino-border border-slate-800 px-2 py-1 w-[24%]">
                DESCRIZIONE ATTIVITA'
              </th>
              <th className="rapportino-border border-slate-800 px-2 py-1 w-[20%]">
                OPERATORE
              </th>
              <th className="rapportino-border border-slate-800 px-2 py-1 w-[14%]">
                Tempo impiegato
              </th>
              <th className="rapportino-border border-slate-800 px-2 py-1 w-[10%]">
                PREVISTO
              </th>
              <th className="rapportino-border border-slate-800 px-2 py-1 w-[10%]">
                PRODOTTO
              </th>
              <th className="rapportino-border border-slate-800 px-2 py-1 w-[10%]">
                NOTE
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="align-top">
                <td className="rapportino-border border-slate-800 px-2 py-1">
                  <textarea
                    rows={3}
                    className="w-full resize-none border-none focus:outline-none text-xs"
                    value={row.categoria}
                    onChange={(e) =>
                      handleChangeCell(idx, 'categoria', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border-slate-800 px-2 py-1">
                  <textarea
                    rows={3}
                    className="w-full resize-none border-none focus:outline-none text-xs"
                    value={row.descrizione}
                    onChange={(e) =>
                      handleChangeCell(idx, 'descrizione', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border-slate-800 px-2 py-1">
                  <textarea
                    rows={3}
                    className="w-full resize-none border-none focus:outline-none text-xs"
                    placeholder="Una riga per operatore"
                    value={row.operatori}
                    onChange={(e) =>
                      handleChangeCell(idx, 'operatori', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border-slate-800 px-2 py-1">
                  <textarea
                    rows={3}
                    className="w-full resize-none border-none focus:outline-none text-xs"
                    placeholder="Stesse righe degli operatori"
                    value={row.tempo}
                    onChange={(e) =>
                      handleChangeCell(idx, 'tempo', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border-slate-800 px-2 py-1 text-center">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border-none focus:outline-none text-xs text-center"
                    value={row.previsto ?? ''}
                    onChange={(e) =>
                      handleChangeCell(idx, 'previsto', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border-slate-800 px-2 py-1 text-center">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border-none focus:outline-none text-xs text-center"
                    value={row.prodotto ?? ''}
                    onChange={(e) =>
                      handleChangeCell(idx, 'prodotto', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border-slate-800 px-2 py-1">
                  <textarea
                    rows={3}
                    className="w-full resize-none border-none focus:outline-none text-xs"
                    value={row.note}
                    onChange={(e) =>
                      handleChangeCell(idx, 'note', e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Boutons (non imprimés) */}
      <div className="no-print mt-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleNewDay}
            className="px-3 py-1.5 text-sm rounded border border-slate-400 hover:bg-slate-100"
          >
            Nuova giornata
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-1.5 text-sm rounded border border-slate-400 hover:bg-slate-100"
          >
            + Aggiungi riga
          </button>
        </div>
        <div className="flex gap-2">
          <div className="text-sm text-slate-700 mr-4">
            Prodotto totale:{' '}
            <span className="font-semibold">{prodottoTotale}</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
          >
            {saving ? 'Salvataggio...' : 'Salva rapportino'}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-4 py-1.5 text-sm rounded border border-slate-500 hover:bg-slate-100"
          >
            Esporta PDF
          </button>
        </div>
      </div>

      {/* Alerte d'erreur de sauvegarde (non imprimée) */}
      {saveError && (
        <div className="no-print mt-3 text-sm text-red-600">
          {saveError}
        </div>
      )}
    </div>
  );
}

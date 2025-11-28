import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';

const EMPTY_ROWS_BY_CREW = {
  ELETTRICISTA: [
    { categoria: 'STESURA', descrizione: 'STESURA', operatori: '', tempo: '', previsto: '150', prodotto: '', note: '' },
    { categoria: 'STESURA', descrizione: 'FASCETTATURA CAVI', operatori: '', tempo: '', previsto: '600', prodotto: '', note: '' },
    { categoria: 'STESURA', descrizione: 'RIPRESA CAVI', operatori: '', tempo: '', previsto: '150', prodotto: '', note: '' },
    { categoria: 'STESURA', descrizione: 'VARI STESURA CAVI', operatori: '', tempo: '', previsto: '0,2', prodotto: '', note: '' }
  ],
  CARPENTERIA: [
    { categoria: 'CARPENTERIA', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' }
  ],
  MONTAGGIO: [
    { categoria: 'MONTAGGIO', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' }
  ]
};

const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validata dal Capo'
};

/**
 * Fait grandir/réduire la hauteur d’un <textarea> en fonction du contenu.
 * Utilisé pour DESCRIZIONE / OPERATORE / Tempo impiegato / NOTE.
 */
function autoResizeTextArea(event) {
  const el = event.target;
  // On remet à zéro pour permettre au textarea de "shrink" quand on efface
  el.style.height = 'auto';
  // On ajuste à la hauteur réelle du contenu
  el.style.height = `${el.scrollHeight}px`;
}

export default function RapportinoSheet({ crewRole }) {
  const { profile } = useAuth();

  // ------------------------------------------------------
  //  Header
  // ------------------------------------------------------
  const [costr, setCostr] = useState('6368');
  const [commessa, setCommessa] = useState('SDC');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('DRAFT');

  // Capo sempre in MAIUSCOLO
  const capoSquadra = useMemo(() => {
    const src = profile?.display_name || profile?.email || '';
    return src.toUpperCase();
  }, [profile]);

  // ------------------------------------------------------
  //  Righe del rapporto
  // ------------------------------------------------------
  const baseRows = EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA;
  const [rows, setRows] = useState(baseRows);

  useEffect(() => {
    setRows(EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA);
  }, [crewRole]);

  const handleChangeCell = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        categoria: crewRole === 'CARPENTERIA' ? 'CARPENTERIA' : crewRole === 'MONTAGGIO' ? 'MONTAGGIO' : 'STESURA',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: ''
      }
    ]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const prodottoTotale = useMemo(() => {
    return rows.reduce((sum, r) => {
      const v = parseFloat(String(r.prodotto || '0').replace(',', '.'));
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [rows]);

  // ------------------------------------------------------
  //  Stato salvataggio / errori
  // ------------------------------------------------------
  const [rapportinoId, setRapportinoId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveOk, setLastSaveOk] = useState(false);

  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [saveErrorDetails, setSaveErrorDetails] = useState('');
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const resetError = () => {
    setSaveErrorMsg('');
    setSaveErrorDetails('');
    setShowErrorDetails(false);
  };

  // ------------------------------------------------------
  //  Salvataggio in Supabase
  // ------------------------------------------------------
  const buildRapportinoPayload = (overrideStatus) => {
    if (!profile?.id) {
      return null;
    }

    return {
      id: rapportinoId || undefined,
      capo_id: profile.id,
      crew_role: crewRole,
      data,
      costr: costr || null,
      commessa: commessa || null,
      status: overrideStatus || status || 'DRAFT',
      prodotto_totale: prodottoTotale
    };
  };

  const saveRows = async (rapportinoIdValue) => {
    // On efface les anciennes lignes puis on insère les nouvelles
    const deleteRes = await supabase
      .from('rapportino_rows')
      .delete()
      .eq('rapportino_id', rapportinoIdValue);

    if (deleteRes.error) {
      throw deleteRes.error;
    }

    if (rows.length === 0) return;

    const rowsPayload = rows.map((row, index) => ({
      rapportino_id: rapportinoIdValue,
      row_index: index,
      categoria: row.categoria || null,
      descrizione: row.descrizione || null,
      operatori: row.operatori || null,
      tempo: row.tempo || null,
      previsto: row.prevvisto || row.previsto || null,
      prodotto: row.prodotto || null,
      note: row.note || null
    }));

    const insertRes = await supabase.from('rapportino_rows').insert(rowsPayload);

    if (insertRes.error) {
      throw insertRes.error;
    }
  };

  const handleSave = async (overrideStatus = null) => {
    resetError();
    setIsSaving(true);
    setLastSaveOk(false);

    try {
      const payload = buildRapportinoPayload(overrideStatus);
      if (!payload) {
        throw new Error('Profilo utente non disponibile (capo_id mancante).');
      }

      const { data: upsertData, error: upsertError } = await supabase
        .from('rapportini')
        .upsert(payload)
        .select('id')
        .single();

      if (upsertError) {
        throw upsertError;
      }

      const newId = upsertData.id;
      setRapportinoId(newId);
      setStatus(payload.status);

      await saveRows(newId);

      setLastSaveOk(true);
      setIsSaving(false);
      return true;
    } catch (err) {
      console.error('Errore salvataggio rapportino:', err);
      setIsSaving(false);
      setLastSaveOk(false);

      // Message humain pour il capo
      setSaveErrorMsg(
        'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.'
      );

      // Détails techniques pour toi
      const technical =
        err && typeof err === 'object'
          ? `${err.code ? `Codice: ${err.code}\n` : ''}${
              err.message ? `Messaggio: ${err.message}` : String(err)
            }`
          : String(err);

      setSaveErrorDetails(technical);
      return false;
    }
  };

  const handleValidateDay = async () => {
    const ok = await handleSave('VALIDATED_CAPO');
    if (ok) {
      // Plus tard : on pourra verrouiller certaines colonnes
    }
  };

  const handleNewDay = () => {
    resetError();
    setRapportinoId(null);
    setStatus('DRAFT');
    setRows(EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA);
    setLastSaveOk(false);
  };

  const handleOpenArchivio = () => {
    // placeholder pour plus tard
    alert('Archivio non ancora implementato in questa versione.');
  };

  const handleExportPdf = async () => {
    // 1) On s’assure d’abord que le salvataggio réussit
    const ok = await handleSave();
    if (!ok) {
      // Message rouge déjà affiché, export bloqué
      return;
    }

    // 2) Pour l’instant on reste sur window.print (tu pourras passer au moteur PDF plus tard)
    window.print();
  };

  const statusLabel = STATUS_LABELS[status] || status;

  // ------------------------------------------------------
  //  UI
  // ------------------------------------------------------
  return (
    <div className="mt-6 bg-white shadow-md rounded-lg p-6 rapportino-table print:bg-white">
      {/* Zone imprimable */}
      <div id="rapportino-print-area">
        <div className="flex justify-between mb-4">
          <div className="space-y-2">
            <div>
              <span className="font-semibold mr-2">COSTR.:</span>
              <input
                type="text"
                className="border-b border-slate-400 focus:outline-none px-1 min-w-[80px]"
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold mr-2">Commessa:</span>
              <input
                type="text"
                className="border-b border-slate-400 focus:outline-none px-1 min-w-[80px]"
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold mr-2">Capo Squadra:</span>
              <span className="px-1">{capoSquadra}</span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="font-semibold text-lg">
              Rapportino Giornaliero – {crewRole}
            </h2>
          </div>

          <div className="space-y-2 text-right">
            <div>
              <span className="font-semibold mr-2">Data:</span>
              <input
                type="date"
                className="border border-slate-300 rounded px-2 py-1 text-sm"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold mr-2">Stato:</span>
              <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold border border-yellow-300">
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Tabella principale */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border rapportino-header-border">
            <thead>
              <tr className="bg-slate-50">
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  CATEGORIA
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  DESCRIZIONE ATTIVITA'
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  OPERATORE
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  Tempo impiegato
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  PREVISTO
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  PRODOTTO
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  NOTE
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-xs w-6">
                  -
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="align-top">
                  {/* CATEGORIA */}
                  <td className="border rapportino-border px-2 py-1 text-xs w-32">
                    <input
                      type="text"
                      className="w-full border-none focus:outline-none bg-transparent"
                      value={row.categoria}
                      onChange={(e) =>
                        handleChangeCell(index, 'categoria', e.target.value)
                      }
                    />
                  </td>

                  {/* DESCRIZIONE ATTIVITA' */}
                  <td className="border rapportino-border px-1 py-1 text-xs w-64">
                    <textarea
                      className="rapportino-textarea w-full border-none focus:outline-none bg-transparent leading-snug"
                      rows={1}
                      value={row.descrizione}
                      onChange={(e) =>
                        handleChangeCell(index, 'descrizione', e.target.value)
                      }
                      onInput={autoResizeTextArea}
                    />
                  </td>

                  {/* OPERATORE */}
                  <td className="border rapportino-border px-1 py-1 text-xs w-48">
                    <textarea
                      className="rapportino-textarea w-full border-none focus:outline-none bg-transparent leading-snug"
                      rows={1}
                      placeholder="Una riga per operatore"
                      value={row.operatori}
                      onChange={(e) =>
                        handleChangeCell(index, 'operatori', e.target.value)
                      }
                      onInput={autoResizeTextArea}
                    />
                  </td>

                  {/* Tempo impiegato */}
                  <td className="border rapportino-border px-1 py-1 text-xs w-40">
                    <textarea
                      className="rapportino-textarea w-full border-none focus:outline-none bg-transparent leading-snug"
                      rows={1}
                      placeholder="Stesse righe degli operatori"
                      value={row.tempo}
                      onChange={(e) =>
                        handleChangeCell(index, 'tempo', e.target.value)
                      }
                      onInput={autoResizeTextArea}
                    />
                  </td>

                  {/* PREVISTO */}
                  <td className="border rapportino-border px-2 py-1 text-xs w-20">
                    <input
                      type="text"
                      className="w-full border-none focus:outline-none bg-transparent text-right"
                      value={row.previsto}
                      onChange={(e) =>
                        handleChangeCell(index, 'previsto', e.target.value)
                      }
                    />
                  </td>

                  {/* PRODOTTO */}
                  <td className="border rapportino-border px-2 py-1 text-xs w-24">
                    <input
                      type="text"
                      className="w-full border-none focus:outline-none bg-transparent text-right"
                      value={row.prodotto}
                      onChange={(e) =>
                        handleChangeCell(index, 'prodotto', e.target.value)
                      }
                    />
                  </td>

                  {/* NOTE */}
                  <td className="border rapportino-border px-1 py-1 text-xs">
                    <textarea
                      className="rapportino-textarea w-full border-none focus:outline-none bg-transparent leading-snug"
                      rows={1}
                      value={row.note}
                      onChange={(e) =>
                        handleChangeCell(index, 'note', e.target.value)
                      }
                      onInput={autoResizeTextArea}
                    />
                  </td>

                  {/* Bouton supprimer ligne */}
                  <td className="border rapportino-border px-2 py-1 text-xs text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer azioni / info – NON stampato */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between no-print">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleNewDay}
            className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
          >
            Nuova giornata
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
          >
            + Aggiungi riga
          </button>
          <button
            type="button"
            onClick={handleOpenArchivio}
            className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
          >
            Archivio
          </button>
        </div>

        <div className="flex-1 text-center text-sm font-semibold">
          Prodotto totale: {prodottoTotale}
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSaving ? 'Salvataggio…' : 'Salva rapportino'}
          </button>
          <button
            type="button"
            onClick={handleValidateDay}
            disabled={isSaving}
            className="px-4 py-2 rounded border border-emerald-600 text-emerald-700 text-sm hover:bg-emerald-50 disabled:opacity-60"
          >
            Valida giornata
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isSaving}
            className="px-4 py-2 rounded bg-sky-600 text-white text-sm hover:bg-sky-700 disabled:opacity-60"
          >
            Esporta PDF
          </button>
        </div>
      </div>

      {/* Message d’erreur humain + détails techniques */}
      {saveErrorMsg && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 no-print">
          <div>{saveErrorMsg}</div>
          {saveErrorDetails && (
            <button
              type="button"
              onClick={() => setShowErrorDetails((v) => !v)}
              className="mt-1 text-xs underline"
            >
              {showErrorDetails ? 'Nascondi dettagli tecnici' : 'Mostra dettagli tecnici'}
            </button>
          )}
          {showErrorDetails && saveErrorDetails && (
            <pre className="mt-2 text-xs bg-white border border-red-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {saveErrorDetails}
            </pre>
          )}
        </div>
      )}

      {lastSaveOk && !saveErrorMsg && (
        <div className="mt-3 text-xs text-emerald-700 no-print">
          Ultimo salvataggio riuscito. Puoi continuare a compilare o esportare il PDF.
        </div>
      )}
    </div>
  );
}

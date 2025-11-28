import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';

// Stato → label + stile badge
const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validato Capo',
  APPROVED_UFFICIO: 'Approvato Ufficio',
  RETURNED: 'Rimandato',
};

const STATUS_CLASSES = {
  DRAFT: 'bg-amber-100 text-amber-800 border border-amber-300',
  VALIDATED_CAPO: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  APPROVED_UFFICIO: 'bg-emerald-200 text-emerald-900 border border-emerald-400',
  RETURNED: 'bg-red-100 text-red-800 border border-red-300',
};

function formatToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Template iniziale per le righe, per tipo squadra
function getTemplateRows(crewRole) {
  if (crewRole === 'ELETTRICISTA') {
    return [
      {
        row_index: 0,
        categoria: 'STESURA',
        descrizione: 'STESURA',
        operatori: '',
        tempo: '',
        previsto: '150',
        prodotto: '',
        note: '',
      },
      {
        row_index: 1,
        categoria: 'STESURA',
        descrizione: 'FASCETTATURA CAVI',
        operatori: '',
        tempo: '',
        previsto: '600',
        prodotto: '',
        note: '',
      },
      {
        row_index: 2,
        categoria: 'STESURA',
        descrizione: 'RIPRESA CAVI',
        operatori: '',
        tempo: '',
        previsto: '150',
        prodotto: '',
        note: '',
      },
      {
        row_index: 3,
        categoria: 'STESURA',
        descrizione: 'VARI STESURA CAVI',
        operatori: '',
        tempo: '',
        previsto: '0.2',
        prodotto: '',
        note: '',
      },
    ];
  }

  if (crewRole === 'CARPENTERIA') {
    // Basato sul tuo modello carpenteria
    return [
      {
        row_index: 0,
        categoria: 'CARPENTERIA',
        descrizione: 'PREPARAZIONE STAFFE / SOLETTE / STRADI CAVI MAGAZZINO',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
      {
        row_index: 1,
        categoria: 'CARPENTERIA',
        descrizione: 'SALDATURA STAFFE STRADE CAVI',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
      {
        row_index: 2,
        categoria: 'CARPENTERIA',
        descrizione: 'MONTAGGIO STRADE CAVI',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
      {
        row_index: 3,
        categoria: 'CARPENTERIA',
        descrizione: 'VARIE CARPENTERIE',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ];
  }

  if (crewRole === 'MONTAGGIO') {
    // Basato sul modello montaggio
    return [
      {
        row_index: 0,
        categoria: 'IMBARCHI',
        descrizione: 'VARI IMBARCHI (LOGISTICA E TRASPORTO)',
        operatori: '',
        tempo: '',
        previsto: '0.2',
        prodotto: '',
        note: '',
      },
      {
        row_index: 1,
        categoria: 'MONTAGGIO',
        descrizione: 'MONTAGGIO APPARECCHIATURA MINORE DI 50 KG',
        operatori: '',
        tempo: '',
        previsto: '12.0',
        prodotto: '',
        note: '',
      },
      {
        row_index: 2,
        categoria: 'MONTAGGIO',
        descrizione: 'MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG',
        operatori: '',
        tempo: '',
        previsto: '1.0',
        prodotto: '',
        note: '',
      },
      {
        row_index: 3,
        categoria: 'MONTAGGIO',
        descrizione: 'MONTAGGIO APPARECCHIATURA DA 151 KG A 400 KG',
        operatori: '',
        tempo: '',
        previsto: '1.0',
        prodotto: '',
        note: '',
      },
    ];
  }

  // Default
  return [
    {
      row_index: 0,
      categoria: '',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
  ];
}

export default function RapportinoSheet({ crewRole }) {
  const { profile } = useAuth();

  const capoName = useMemo(
    () =>
      (profile?.display_name ||
        profile?.full_name ||
        profile?.email ||
        '').toUpperCase(),
    [profile]
  );

  const [date, setDate] = useState(formatToday());
  const [status, setStatus] = useState('DRAFT');
  const [costr, setCostr] = useState(''); // il capo può scrivere 6368 / 6358
  const [commessa, setCommessa] = useState('SDC');

  const [rows, setRows] = useState(() => getTemplateRows(crewRole));
  const [rapportinoId, setRapportinoId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [toast, setToast] = useState(null);

  // Calcolo prodotto totale
  const totalProdotto = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const v = parseFloat(r.prodotto);
        if (Number.isNaN(v)) return sum;
        return sum + v;
      }, 0),
    [rows]
  );

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Caricamento iniziale dal DB (se esiste un rapportino per capo + ruolo + data)
  useEffect(() => {
    if (!profile || !crewRole) return;

    let cancelled = false;

    async function loadRapportino() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const { data: rapp, error } = await supabase
          .from('rapportini')
          .select('*')
          .eq('capo_id', profile.id)
          .eq('role', crewRole)
          .eq('data', date)
          .maybeSingle();

        if (error) {
          // Se è "no rows", maybeSingle normalmente mette data = null senza errore
          console.error('Errore load rapportino:', error);
          throw error;
        }

        if (!rapp) {
          // nessun rapportino → nuovo da template
          if (!cancelled) {
            setRapportinoId(null);
            setStatus('DRAFT');
            setCostr('');
            setCommessa('SDC');
            setRows(getTemplateRows(crewRole));
          }
          return;
        }

        if (cancelled) return;

        setRapportinoId(rapp.id);
        setStatus(rapp.status || 'DRAFT');
        setCostr(rapp.costr || '');
        setCommessa(rapp.commessa || 'SDC');

        const { data: rowsData, error: rowsError } = await supabase
          .from('rapportino_rows')
          .select('*')
          .eq('rapportino_id', rapp.id)
          .order('row_index', { ascending: true });

        if (rowsError) {
          console.error('Errore load righe:', rowsError);
          throw rowsError;
        }

        if (rowsData && rowsData.length > 0) {
          setRows(
            rowsData.map((r) => ({
              row_index: r.row_index,
              categoria: r.categoria || '',
              descrizione: r.descrizione || '',
              operatori: r.operatori || '',
              tempo: r.tempo || '',
              previsto:
                r.previsto === null || r.previsto === undefined
                  ? ''
                  : String(r.previsto),
              prodotto:
                r.prodotto === null || r.prodotto === undefined
                  ? ''
                  : String(r.prodotto),
              note: r.note || '',
            }))
          );
        } else {
          setRows(getTemplateRows(crewRole));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setLoadError('Errore durante il caricamento del rapportino.');
          setRows(getTemplateRows(crewRole));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadRapportino();

    return () => {
      cancelled = true;
    };
  }, [profile, crewRole, date]);

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              [field]: value,
            }
          : r
      )
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        row_index: prev.length,
        categoria: '',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ]);
  };

  const handleNewDay = () => {
    setStatus('DRAFT');
    setRows(getTemplateRows(crewRole));
  };

  const handleExportPdf = () => {
    // Per ora usiamo la stampa del browser (Salva come PDF)
    window.print();
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    setToast(null);

    try {
      // 1) Salva / aggiorna header rapportino
      const payload = {
        capo_id: profile.id,
        role: crewRole,
        data: date,
        status,
        costr: costr || null,
        commessa: commessa || null,
      };

      let currentId = rapportinoId;

      if (!currentId) {
        const { data, error } = await supabase
          .from('rapportini')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Errore insert rapportino:', error);
          throw error;
        }
        currentId = data.id;
        setRapportinoId(currentId);
      } else {
        const { error } = await supabase
          .from('rapportini')
          .update(payload)
          .eq('id', currentId);

        if (error) {
          console.error('Errore update rapportino:', error);
          throw error;
        }
      }

      // 2) Sincronizza righe
      const cleanedRows = rows
        .map((r, index) => ({
          rapportino_id: currentId,
          row_index: index,
          categoria: r.categoria || null,
          descrizione: r.descrizione || null,
          operatori: r.operatori || null,
          tempo: r.tempo || null,
          previsto:
            r.previsto === '' || r.previsto === null
              ? null
              : Number(r.previsto),
          prodotto:
            r.prodotto === '' || r.prodotto === null
              ? null
              : Number(r.prodotto),
          note: r.note || null,
        }))
        .filter(
          (r) =>
            r.categoria ||
            r.descrizione ||
            r.operatori ||
            r.tempo ||
            r.previsto !== null ||
            r.prodotto !== null ||
            r.note
        );

      // Cancella vecchie righe
      const { error: delErr } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', currentId);

      if (delErr) {
        console.error('Errore delete righe:', delErr);
        throw delErr;
      }

      if (cleanedRows.length > 0) {
        const { error: insErr } = await supabase
          .from('rapportino_rows')
          .insert(cleanedRows);

        if (insErr) {
          console.error('Errore insert righe:', insErr);
          throw insErr;
        }
      }

      setToast({
        type: 'success',
        message: 'Rapportino salvato con successo.',
      });
    } catch (e) {
      console.error(e);
      setToast({
        type: 'error',
        message:
          'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statusLabel = STATUS_LABELS[status] || status;
  const statusClass = STATUS_CLASSES[status] || STATUS_CLASSES.DRAFT;

  return (
    <>
      {/* Foglio centrale */}
      <div className="rapportino-page mx-auto max-w-5xl border border-slate-300 px-6 py-6">
        {/* Intestazione */}
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold mr-2">COSTR.:</span>
              <input
                type="text"
                value={costr}
                onChange={(e) => setCostr(e.target.value.toUpperCase())}
                className="border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1 text-sm"
                style={{ minWidth: '80px' }}
              />
            </div>
            <div>
              <span className="font-semibold mr-2">Commessa:</span>
              <input
                type="text"
                value={commessa}
                onChange={(e) => setCommessa(e.target.value.toUpperCase())}
                className="border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1 text-sm"
                style={{ minWidth: '80px' }}
              />
            </div>
            <div>
              <span className="font-semibold mr-2">Capo Squadra:</span>
              <span className="uppercase tracking-wide">{capoName}</span>
            </div>
          </div>

          <div className="text-center">
            <div className="font-semibold text-sm mb-1">
              Rapportino Giornaliero –{' '}
              {crewRole === 'ELETTRICISTA'
                ? 'ELETTRICISTA'
                : crewRole === 'CARPENTERIA'
                ? 'CARPENTERIA'
                : crewRole === 'MONTAGGIO'
                ? 'MONTAGGIO'
                : crewRole}
            </div>
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="font-semibold">Data:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-slate-400 rounded px-2 py-1 text-xs"
              />
            </div>
          </div>

          <div className="text-right text-sm space-y-2">
            <div>
              <span className="font-semibold mr-2">Stato:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Tabella */}
        <table className="rapportino-table text-xs">
          <thead>
            <tr className="rapportino-header-border border border-slate-900 bg-slate-50">
              <th className="rapportino-border border border-slate-900 px-2 py-1 text-left w-32">
                CATEGORIA
              </th>
              <th className="rapportino-border border border-slate-900 px-2 py-1 text-left">
                DESCRIZIONE ATTIVITA&apos;
              </th>
              <th className="rapportino-border border border-slate-900 px-2 py-1 text-left w-48">
                OPERATORE
              </th>
              <th className="rapportino-border border border-slate-900 px-2 py-1 text-left w-40">
                Tempo impiegato
              </th>
              <th className="rapportino-border border border-slate-900 px-2 py-1 text-left w-24">
                PREVISTO
              </th>
              <th className="rapportino-border border border-slate-900 px-2 py-1 text-left w-24">
                PRODOTTO
              </th>
              <th className="rapportino-border border border-slate-900 px-2 py-1 text-left w-48">
                NOTE
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="rapportino-border border border-slate-900 align-top"
              >
                <td className="rapportino-border border border-slate-900 px-1 py-1 align-top">
                  <input
                    type="text"
                    value={row.categoria}
                    onChange={(e) =>
                      handleRowChange(index, 'categoria', e.target.value)
                    }
                    className="w-full border-none focus:outline-none text-xs uppercase"
                  />
                </td>
                <td className="rapportino-border border border-slate-900 px-1 py-1 align-top">
                  <textarea
                    value={row.descrizione}
                    onChange={(e) =>
                      handleRowChange(index, 'descrizione', e.target.value)
                    }
                    className="w-full border-none focus:outline-none text-xs resize-none"
                    rows={2}
                  />
                </td>
                <td className="rapportino-border border border-slate-900 px-1 py-1 align-top">
                  <textarea
                    value={row.operatori}
                    onChange={(e) =>
                      handleRowChange(index, 'operatori', e.target.value)
                    }
                    placeholder="Una riga per operatore"
                    className="w-full border-none focus:outline-none text-xs resize-none"
                    rows={2}
                  />
                </td>
                <td className="rapportino-border border border-slate-900 px-1 py-1 align-top">
                  <textarea
                    value={row.tempo}
                    onChange={(e) =>
                      handleRowChange(index, 'tempo', e.target.value)
                    }
                    placeholder="Stesse righe degli operatori"
                    className="w-full border-none focus:outline-none text-xs resize-none"
                    rows={2}
                  />
                </td>
                <td className="rapportino-border border border-slate-900 px-1 py-1 align-top">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.previsto}
                    onChange={(e) =>
                      handleRowChange(index, 'previsto', e.target.value)
                    }
                    className="w-full border-none focus:outline-none text-xs text-right"
                  />
                </td>
                <td className="rapportino-border border border-slate-900 px-1 py-1 align-top">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.prodotto}
                    onChange={(e) =>
                      handleRowChange(index, 'prodotto', e.target.value)
                    }
                    className="w-full border-none focus:outline-none text-xs text-right"
                  />
                </td>
                <td className="rapportino-border border border-slate-900 px-1 py-1 align-top">
                  <textarea
                    value={row.note}
                    onChange={(e) =>
                      handleRowChange(index, 'note', e.target.value)
                    }
                    className="w-full border-none focus:outline-none text-xs resize-none"
                    rows={2}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer tabella */}
        <div className="mt-3 flex items-center justify-between no-print">
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

          <div className="flex items-center gap-4">
            <div className="text-sm">
              Prodotto totale:{' '}
              <span className="font-semibold">
                {Number.isNaN(totalProdotto) ? '0' : totalProdotto}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSaving ? 'Salvataggio...' : 'Salva rapportino'}
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

        {isLoading && (
          <p className="no-print mt-2 text-xs text-slate-500">
            Caricamento del rapportino...
          </p>
        )}
        {loadError && (
          <p className="no-print mt-2 text-xs text-red-600">{loadError}</p>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container no-print">
          <div
            className={`toast ${
              toast.type === 'success' ? 'toast-success' : 'toast-error'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}

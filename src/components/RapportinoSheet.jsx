import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const STATUS_LABELS = {
  DRAFT: 'BOZZA',
  VALIDATED_CAPO: 'VALIDATO CAPO',
  APPROVED_UFFICIO: 'APPROVATO UFFICIO',
  RETURNED: 'RIMANDATO'
};

const CREW_LABELS = {
  ELETTRICISTA: 'ELETTRICISTA',
  CARPENTERIA: 'CARPENTERIA',
  MONTAGGIO: 'MONTAGGIO'
};

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Modello di righe base per ogni tipo squadra
function getTemplateRows(crewRole) {
  if (crewRole === 'ELETTRICISTA') {
    return [
      {
        categoria: 'STESURA',
        descrizione: 'STESURA',
        operatori: '',
        tempo: '',
        previsto: 150,
        prodotto: '',
        note: ''
      },
      {
        categoria: 'STESURA',
        descrizione: 'FASCETTATURA CAVI',
        operatori: '',
        tempo: '',
        previsto: 600,
        prodotto: '',
        note: ''
      },
      {
        categoria: 'STESURA',
        descrizione: 'RIPRESA CAVI',
        operatori: '',
        tempo: '',
        previsto: 150,
        prodotto: '',
        note: ''
      },
      {
        categoria: 'STESURA',
        descrizione: 'VARI STESURA CAVI',
        operatori: '',
        tempo: '',
        previsto: 0.2,
        prodotto: '',
        note: ''
      }
    ];
  }

  // Per CARPENTERIA / MONTAGGIO: il capo compila tutto a mano (stessa griglia)
  return [
    {
      categoria: '',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: ''
    }
  ];
}

export default function RapportinoSheet({ crewRole }) {
  const { profile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [rapportinoId, setRapportinoId] = useState(null);
  const [status, setStatus] = useState('DRAFT');
  const [date, setDate] = useState(getTodayISO());
  const [rows, setRows] = useState([]);
  const [prodottoTotale, setProdottoTotale] = useState(0);

  const [costr, setCostr] = useState('');
  const commessa = 'SDC';

  const printRef = useRef(null);

  // Caricamento / creazione del rapportino del giorno
  useEffect(() => {
    if (!profile || !crewRole) return;

    let isMounted = true;

    async function loadRapportino() {
      setIsLoading(true);
      setSaveError(null);

      try {
        // 1) Cerchiamo un rapportino esistente per (user, role, data)
        const { data, error } = await supabase
          .from('rapportini')
          .select('id, data, status')
          .eq('user_id', profile.id)
          .eq('role', crewRole)
          .eq('data', date)
          .limit(1);

        if (error) {
          console.error('Errore caricamento rapportino:', error);
          if (isMounted) {
            setSaveError(
              'Errore durante il caricamento del rapportino. Puoi comunque continuare a scrivere.'
            );
          }
        }

        const existing = data && data.length > 0 ? data[0] : null;

        // 2) Se non esiste, lo creiamo in BOZZA
        if (!existing) {
          const { data: inserted, error: insertError } = await supabase
            .from('rapportini')
            .insert({
              user_id: profile.id,
              role: crewRole,
              data: date,
              status: 'DRAFT'
            })
            .select('id, data, status')
            .single();

          if (insertError) {
            console.error('Errore creazione rapportino:', insertError);
            if (isMounted) {
              setRapportinoId(null);
              setStatus('DRAFT');
              setRows(getTemplateRows(crewRole));
              setSaveError(
                'Errore durante la creazione del rapportino. Puoi comunque scrivere, ma il salvataggio potrebbe fallire.'
              );
            }
          } else if (isMounted) {
            setRapportinoId(inserted.id);
            setStatus(inserted.status || 'DRAFT');
            setRows(getTemplateRows(crewRole));
          }
        } else {
          // 3) Carichiamo le righe esistenti
          const { data: lines, error: rowsError } = await supabase
            .from('rapportino_rows')
            .select(
              'id, row_index, categoria, descrizione, operatori, tempo, previsto, prodotto, note'
            )
            .eq('rapportino_id', existing.id)
            .order('row_index', { ascending: true });

          if (rowsError) {
            console.error('Errore caricamento righe:', rowsError);
            if (isMounted) {
              setRapportinoId(existing.id);
              setStatus(existing.status || 'DRAFT');
              setRows(getTemplateRows(crewRole));
              setSaveError(
                'Errore durante il caricamento delle righe. Puoi comunque continuare a scrivere.'
              );
            }
          } else if (isMounted) {
            setRapportinoId(existing.id);
            setStatus(existing.status || 'DRAFT');
            if (lines && lines.length > 0) {
              setRows(
                lines.map((r) => ({
                  categoria: r.categoria || '',
                  descrizione: r.descrizione || '',
                  operatori: r.operatori || '',
                  tempo: r.tempo || '',
                  previsto: r.previsto ?? '',
                  prodotto: r.prodotto ?? '',
                  note: r.note || ''
                }))
              );
            } else {
              setRows(getTemplateRows(crewRole));
            }
          }
        }
      } catch (e) {
        console.error('Eccezione caricamento rapportino:', e);
        if (isMounted) {
          setSaveError(
            'Errore inaspettato durante il caricamento. Puoi comunque continuare a scrivere.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRapportino();

    return () => {
      isMounted = false;
    };
  }, [profile, crewRole, date]);

  // Ricalcolo del prodotto totale quando cambiano le righe
  useEffect(() => {
    const sum = rows.reduce((acc, row) => {
      const val = Number(row.prodotto);
      if (Number.isNaN(val)) return acc;
      return acc + val;
    }, 0);
    setProdottoTotale(sum);
  }, [rows]);

  if (!profile) {
    return (
      <div className="p-8 text-center text-slate-600">
        Caricamento profilo in corso...
      </div>
    );
  }

  const capoDisplayName = (
    profile.display_name ||
    profile.full_name ||
    profile.email ||
    ''
  )
    .toString()
    .toUpperCase();

  const crewLabel = CREW_LABELS[crewRole] || crewRole || '';

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        categoria: '',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: ''
      }
    ]);
  };

  const handleNewDay = () => {
    const today = getTodayISO();
    setDate(today);
    setRapportinoId(null);
    setStatus('DRAFT');
    setRows(getTemplateRows(crewRole));
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!rapportinoId) {
      setSaveError(
        'Nessun rapportino inizializzato. Ricarica la pagina e riprova.'
      );
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // 1) Aggiornare la testa del rapportino
      const { error: upError } = await supabase
        .from('rapportini')
        .update({
          data: date,
          status
        })
        .eq('id', rapportinoId);

      if (upError) {
        console.error('Errore update rapportini:', upError);
        setSaveError(
          'Errore durante il salvataggio del rapportino (testa). Le righe potrebbero non essere aggiornate.'
        );
      }

      // 2) Cancellare le righe esistenti
      const { error: delError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', rapportinoId);

      if (delError) {
        console.error('Errore delete righe:', delError);
        setSaveError(
          'Errore durante il salvataggio: impossibile aggiornare le righe.'
        );
      }

      // 3) Reinserire le righe nell’ordine giusto
      const rowsToInsert = rows.map((row, index) => ({
        rapportino_id: rapportinoId,
        row_index: index,
        categoria: row.categoria || null,
        descrizione: row.descrizione || null,
        operatori: row.operatori || null,
        tempo: row.tempo || null,
        previsto:
          row.previsto === '' || row.previsto === null
            ? null
            : Number(row.previsto),
        prodotto:
          row.prodotto === '' || row.prodotto === null
            ? null
            : Number(row.prodotto),
        note: row.note || null
      }));

      if (rowsToInsert.length > 0) {
        const { error: insError } = await supabase
          .from('rapportino_rows')
          .insert(rowsToInsert);

        if (insError) {
          console.error('Errore insert righe:', insError);
          setSaveError(
            'Errore durante il salvataggio delle righe del rapportino.'
          );
        }
      }
    } catch (e) {
      console.error('Eccezione salvataggio rapportino:', e);
      setSaveError(
        'Errore inaspettato durante il salvataggio del rapportino.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);

      const fileName = `rapportino_${crewRole?.toLowerCase() || 'squadra'}_${
        date || 'giorno'
      }.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error('Errore export PDF:', e);
      alert('Errore durante la generazione del PDF.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-600">
        Caricamento del rapportino...
      </div>
    );
  }

  return (
    <>
      {/* ZONA DA ESPORTARE / STAMPARE */}
      <div
        ref={printRef}
        className="rapportino-card p-6 bg-white mx-auto max-w-5xl"
      >
        {/* En-tête */}
        <div className="flex justify-between mb-6 text-sm">
          <div className="space-y-1">
            <div>
              <span className="font-semibold mr-1">COSTR.:</span>
              <input
                type="text"
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
                className="border-b border-slate-400 outline-none px-1 text-xs"
                placeholder="6368 / 6358"
              />
            </div>
            <div>
              <span className="font-semibold mr-1">Capo Squadra:</span>
              <span className="border-b border-slate-400 px-1 text-xs">
                {capoDisplayName}
              </span>
            </div>
          </div>

          <div className="text-center flex-1">
            <div className="font-semibold text-base mb-1">
              Rapportino Giornaliero – {crewLabel}
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div>
              <span className="font-semibold mr-1">COMMESSA:</span>
              <span className="border-b border-slate-400 px-1 text-xs">
                {commessa}
              </span>
            </div>
            <div>
              <span className="font-semibold mr-1">DATA:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-b border-slate-400 outline-none px-1 text-xs"
              />
            </div>
            <div>
              <span className="font-semibold mr-1">Stato:</span>
              <span className="border-b border-slate-400 px-1 text-xs">
                {STATUS_LABELS[status] || 'BOZZA'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabella principale */}
        <table className="rapportino-table text-xs border border-slate-500">
          <thead>
            <tr className="rapportino-header-border border border-slate-500 text-center">
              <th className="rapportino-border border border-slate-500 px-2 py-1 w-24">
                CATEGORIA
              </th>
              <th className="rapportino-border border border-slate-500 px-2 py-1">
                DESCRIZIONE ATTIVITA'
              </th>
              <th className="rapportino-border border border-slate-500 px-2 py-1 w-48">
                OPERATORE
              </th>
              <th className="rapportino-border border border-slate-500 px-2 py-1 w-40">
                Tempo impiegato
              </th>
              <th className="rapportino-border border border-slate-500 px-2 py-1 w-20">
                PREVISTO
              </th>
              <th className="rapportino-border border border-slate-500 px-2 py-1 w-20">
                PRODOTTO
              </th>
              <th className="rapportino-border border border-slate-500 px-2 py-1 w-40">
                NOTE
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="rapportino-row border border-slate-500 align-top"
              >
                <td className="rapportino-border border border-slate-500 px-2">
                  <textarea
                    className="rapportino-cell-input"
                    value={row.categoria}
                    onChange={(e) =>
                      handleRowChange(index, 'categoria', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border border-slate-500 px-2">
                  <textarea
                    className="rapportino-cell-input"
                    value={row.descrizione}
                    onChange={(e) =>
                      handleRowChange(index, 'descrizione', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border border-slate-500 px-2">
                  <textarea
                    className="rapportino-cell-input"
                    value={row.operatori}
                    placeholder="Una riga per operatore"
                    onChange={(e) =>
                      handleRowChange(index, 'operatori', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border border-slate-500 px-2">
                  <textarea
                    className="rapportino-cell-input"
                    value={row.tempo}
                    placeholder="Stesse righe degli operatori"
                    onChange={(e) =>
                      handleRowChange(index, 'tempo', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border border-slate-500 px-2 text-center">
                  <input
                    type="number"
                    step="0.1"
                    className="rapportino-cell-input text-center"
                    value={row.previsto}
                    onChange={(e) =>
                      handleRowChange(index, 'previsto', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border border-slate-500 px-2 text-center">
                  <input
                    type="number"
                    step="0.1"
                    className="rapportino-cell-input text-center"
                    value={row.prodotto}
                    onChange={(e) =>
                      handleRowChange(index, 'prodotto', e.target.value)
                    }
                  />
                </td>
                <td className="rapportino-border border border-slate-500 px-2">
                  <textarea
                    className="rapportino-cell-input"
                    value={row.note}
                    onChange={(e) =>
                      handleRowChange(index, 'note', e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer stampato: totali + firme + marca CORE */}
        <div className="rapportino-footer">
          <div>
            <div>
              <strong>Prodotto totale:</strong> {prodottoTotale || 0}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>
              <strong>Generato da:</strong> CORE – Rapportino V2
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ marginRight: '40px' }}>
                Firma Capo Squadra: __________________
              </span>
              <span>Firma Ufficio: __________________</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zona bottoni & errori (solo schermo) */}
      <div className="no-print mt-4 max-w-5xl mx-auto">
        {saveError && (
          <p className="text-red-600 text-sm mb-3">
            {saveError}
          </p>
        )}

        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNewDay}
              className="px-4 py-2 border border-slate-400 rounded bg-white hover:bg-slate-100 text-sm"
            >
              Nuova giornata
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 border border-slate-400 rounded bg-white hover:bg-slate-100 text-sm"
            >
              + Aggiungi riga
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-60"
            >
              {isSaving ? 'Salvataggio...' : 'Salva rapportino'}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800 text-sm"
            >
              Esporta PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

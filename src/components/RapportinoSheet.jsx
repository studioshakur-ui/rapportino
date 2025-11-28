import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';

const CREW_LABELS = {
  ELETTRICISTA: 'Elettricista',
  CARPENTERIA: 'Carpenteria',
  MONTAGGIO: 'Montaggio'
};

// Helpers

function createEmptyRow(overrides = {}) {
  return {
    categoria: '',
    descrizione: '',
    operatori: '',
    tempo: '',
    previsto: '',
    prodotto: '',
    note: '',
    ...overrides
  };
}

/**
 * Modelli di righe per ogni tipo squadra,
 * basati sui tuoi rapportini cartacei.
 */
const DEFAULT_ROWS_BY_CREW = {
  ELETTRICISTA: [
    createEmptyRow({
      categoria: 'STESURA',
      descrizione: 'STESURA',
      previsto: '150'
    }),
    createEmptyRow({
      categoria: 'STESURA',
      descrizione: 'FASCETTATURA CAVI',
      previsto: '600'
    }),
    createEmptyRow({
      categoria: 'STESURA',
      descrizione: 'RIPRESA CAVI',
      previsto: '150'
    }),
    createEmptyRow({
      categoria: 'STESURA',
      descrizione: 'VARI STESURA CAVI',
      previsto: '0.2'
    })
  ],

  CARPENTERIA: [
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'PREPARAZIONE STAFFE SOLETTE/STRADI CAVI MAGAZZINO'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'SALDATURA STAFFE STRADE CAVI'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'MONTAGGIO STRADE CAVI'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'SALDATURA TONDINI'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'SALDATURA BASAMENTI (APPARECCHIATURE)'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'TRACCIATURA KIEPE/COLLARI'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'SALDATURA KIEPE/COLLARI'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'MOLATURA KIEPE'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'MOLATURA STAFFE, TONDINI, BASAMENTI'
    }),
    createEmptyRow({
      categoria: 'CARPENTERIA',
      descrizione: 'VARIE CARPENTERIE'
    })
  ],

  MONTAGGIO: [
    createEmptyRow({
      categoria: 'IMBARCHI',
      descrizione: 'VARI IMBARCHI (LOGISTICA E TRASPORTO)',
      previsto: '0.2'
    }),
    createEmptyRow({
      categoria: 'MONTAGGIO',
      descrizione: 'MONTAGGIO APPARECCHIATURA MINORE DI 50 KG',
      previsto: '12'
    }),
    createEmptyRow({
      categoria: 'MONTAGGIO',
      descrizione: 'MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG',
      previsto: '1'
    }),
    createEmptyRow({
      categoria: 'MONTAGGIO',
      descrizione: 'MONTAGGIO APPARECCHIATURA DA 151 KG A 400 KG',
      previsto: '1'
    }),
    createEmptyRow({
      categoria: 'MONTAGGIO',
      descrizione: 'MONTAGGIO APPARECCHIATURA DA 401 KG A 1400 KG',
      previsto: '0.1'
    })
  ]
};

const STATUS_LABELS = {
  DRAFT: 'Bozza',
  SENT: 'Inviato',
  ARCHIVED: 'Archiviato'
};

export default function RapportinoSheet({ crewRole }) {
  const { profile } = useAuth();
  const rapportinoRef = useRef(null);

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  const [rapportinoId, setRapportinoId] = useState(null);
  const [status, setStatus] = useState('DRAFT');
  const [rows, setRows] = useState(
    DEFAULT_ROWS_BY_CREW[crewRole] || [createEmptyRow()]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // --- Auto-resize des textareas (hauteur adaptable) ---

  useEffect(() => {
    const textareas = document.querySelectorAll(
      'textarea[data-autoresize="true"]'
    );
    textareas.forEach((ta) => {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    });
  }, [rows]);

  // --- Charger / créer le rapportino du jour ---

  useEffect(() => {
    if (!profile?.id || !crewRole) return;
    loadOrCreateRapportino();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, crewRole, date]);

  async function loadOrCreateRapportino() {
    setSaveError('');
    setSaveMessage('');

    const capoId = profile.id;

    // Chercher un rapportino existant
    const { data, error } = await supabase
      .from('rapportini')
      .select('*')
      .eq('capo_id', capoId)
      .eq('crew_role', crewRole)
      .eq('data', date)
      .maybeSingle();

    if (error) {
      console.error('Errore caricamento rapportino:', error);
      setSaveError(
        'Errore durante il caricamento del rapportino. Puoi comunque scrivere, ma il salvataggio potrebbe fallire.'
      );
      return;
    }

    if (!data) {
      // Pas encore de rapportino → on reste sur le modèle par défaut
      setRapportinoId(null);
      setStatus('DRAFT');
      setRows(DEFAULT_ROWS_BY_CREW[crewRole] || [createEmptyRow()]);
      return;
    }

    setRapportinoId(data.id);
    setStatus(data.status || 'DRAFT');

    // Charger les righe
    const { data: rowsData, error: rowsError } = await supabase
      .from('rapportino_rows')
      .select('*')
      .eq('rapportino_id', data.id)
      .order('row_index', { ascending: true });

    if (rowsError) {
      console.error('Errore caricamento righe rapportino:', rowsError);
      setSaveError(
        'Errore durante il caricamento delle righe. Puoi comunque scrivere, ma il salvataggio potrebbe fallire.'
      );
      return;
    }

    if (!rowsData || rowsData.length === 0) {
      setRows(DEFAULT_ROWS_BY_CREW[crewRole] || [createEmptyRow()]);
    } else {
      setRows(
        rowsData.map((r) =>
          createEmptyRow({
            categoria: r.categoria || '',
            descrizione: r.descrizione || '',
            operatori: r.operatori || '',
            tempo: r.tempo || '',
            previsto: r.previsto != null ? String(r.previsto) : '',
            prodotto: r.prodotto != null ? String(r.prodotto) : '',
            note: r.note || ''
          })
        )
      );
    }
  }

  // --- Gestion des lignes ---

  const handleChangeRow = (index, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const totalProdotto = rows.reduce((sum, r) => {
    const n = parseFloat(
      String(r.prodotto || '').replace(',', '.').trim() || '0'
    );
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  // --- Sauvegarde Supabase ---

  const handleSaveRapportino = async () => {
    if (!profile?.id) return;

    setIsSaving(true);
    setSaveError('');
    setSaveMessage('');

    const capoId = profile.id;

    try {
      // Upsert rapportino
      const payload = {
        capo_id: capoId,
        data: date,
        crew_role: crewRole,
        status,
        prodotto_totale: totalProdotto
      };

      let result;
      if (rapportinoId) {
        result = await supabase
          .from('rapportini')
          .update(payload)
          .eq('id', rapportinoId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('rapportini')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      const savedRapportino = result.data;
      setRapportinoId(savedRapportino.id);

      // Remplacer toutes les righe
      const { error: delError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', savedRapportino.id);

      if (delError) {
        throw delError;
      }

      const rowsToInsert = rows.map((r, index) => ({
        rapportino_id: savedRapportino.id,
        row_index: index,
        categoria: r.categoria || null,
        descrizione: r.descrizione || null,
        operatori: r.operatori || null,
        tempo: r.tempo || null,
        previsto:
          r.previsto !== '' && r.previsto != null
            ? parseFloat(String(r.previsto).replace(',', '.'))
            : null,
        prodotto:
          r.prodotto !== '' && r.prodotto != null
            ? parseFloat(String(r.prodotto).replace(',', '.'))
            : null,
        note: r.note || null
      }));

      if (rowsToInsert.length > 0) {
        const { error: insError } = await supabase
          .from('rapportino_rows')
          .insert(rowsToInsert);

        if (insError) {
          throw insError;
        }
      }

      setSaveMessage('Rapportino salvato correttamente.');
    } catch (err) {
      console.error('Errore salvataggio rapportino:', err);
      setSaveError(
        'Errore durante il salvataggio del rapportino. Puoi continuare a scrivere, ma i dati potrebbero non essere salvati.'
      );
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    }
  };

  // --- Export PDF (robuste, sans window.print) ---

  const handleExportPDF = async () => {
    setSaveError('');
    try {
      const element = rapportinoRef.current;
      if (!element) return;

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 20; // margini
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const x = 10;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

      const capoName =
        (profile?.display_name || profile?.email || 'capo')
          .split('@')[0]
          .toUpperCase();

      const fileName = `rapportino_${crewRole.toLowerCase()}_${capoName}_${date}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Errore export PDF:', err);
      setSaveError(
        'Errore durante la generazione del PDF. Riprova, per favore.'
      );
    }
  };

  const handleNewDay = () => {
    setRapportinoId(null);
    setStatus('DRAFT');
    setRows(DEFAULT_ROWS_BY_CREW[crewRole] || [createEmptyRow()]);
    setSaveError('');
    setSaveMessage('');
  };

  const statusLabel = STATUS_LABELS[status] || status;

  // --- Render ---

  return (
    <div className="mt-6 flex justify-center">
      <div className="bg-white shadow-md rounded-md p-4 md:p-6 w-full max-w-6xl">
        {/* ZONE EXPORTABLE EN PDF */}
        <div ref={rapportinoRef} className="rapportino-table">
          {/* En-tête */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-sm">
                <span className="font-semibold mr-2">COSTR.:</span>
                <span className="inline-block min-w-[120px] border-b border-slate-400">
                  6368
                </span>
              </div>
              <div className="text-sm mt-1">
                <span className="font-semibold mr-2">Commessa:</span>
                <span className="inline-block min-w-[120px] border-b border-slate-400">
                  SDC
                </span>
              </div>
              <div className="text-sm mt-1">
                <span className="font-semibold mr-2">Capo Squadra:</span>
                <span className="inline-block min-w-[160px] border-b border-slate-400">
                  {(profile?.display_name || profile?.email || '')
                    .split('@')[0]
                    .toUpperCase()}
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="font-semibold text-base">
                Rapportino Giornaliero – {CREW_LABELS[crewRole] || crewRole}
              </div>
              <div className="mt-2 text-sm">
                <span className="font-semibold mr-2">Data:</span>
                <input
                  type="date"
                  className="border border-slate-400 rounded px-2 py-1 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="text-right text-sm">
              <div>
                <span className="font-semibold mr-1">Stato:</span>
                <span className="px-3 py-1 rounded-full border border-amber-300 bg-amber-100 text-amber-800 text-xs">
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Tableau */}
          <table className="w-full border-collapse text-xs rapportino-header-border">
            <thead>
              <tr className="bg-slate-100">
                <th className="rapportino-header-border border text-left px-2 py-1 w-[12%]">
                  CATEGORIA
                </th>
                <th className="rapportino-header-border border text-left px-2 py-1 w-[24%]">
                  DESCRIZIONE ATTIVITA'
                </th>
                <th className="rapportino-header-border border text-left px-2 py-1 w-[20%]">
                  OPERATORE
                </th>
                <th className="rapportino-header-border border text-left px-2 py-1 w-[16%]">
                  Tempo impiegato
                </th>
                <th className="rapportino-header-border border text-left px-2 py-1 w-[10%]">
                  PREVISTO
                </th>
                <th className="rapportino-header-border border text-left px-2 py-1 w-[10%]">
                  PRODOTTO
                </th>
                <th className="rapportino-header-border border text-left px-2 py-1 w-[18%]">
                  NOTE
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="rapportino-border border align-top px-2 py-1">
                    <input
                      type="text"
                      className="w-full border-none outline-none text-xs"
                      value={row.categoria}
                      onChange={(e) =>
                        handleChangeRow(index, 'categoria', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border align-top px-2 py-1">
                    <textarea
                      data-autoresize="true"
                      rows={1}
                      className="w-full border-none outline-none resize-none text-xs"
                      value={row.descrizione}
                      onChange={(e) =>
                        handleChangeRow(index, 'descrizione', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border align-top px-2 py-1">
                    <textarea
                      data-autoresize="true"
                      rows={1}
                      className="w-full border-none outline-none resize-none text-xs"
                      placeholder="Una riga per operatore"
                      value={row.operatori}
                      onChange={(e) =>
                        handleChangeRow(index, 'operatori', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border align-top px-2 py-1">
                    <textarea
                      data-autoresize="true"
                      rows={1}
                      className="w-full border-none outline-none resize-none text-xs"
                      placeholder="Stesse righe degli operatori"
                      value={row.tempo}
                      onChange={(e) =>
                        handleChangeRow(index, 'tempo', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border align-top px-2 py-1">
                    <input
                      type="text"
                      className="w-full border-none outline-none text-xs text-right"
                      value={row.previsto}
                      onChange={(e) =>
                        handleChangeRow(index, 'previsto', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border align-top px-2 py-1">
                    <input
                      type="text"
                      className="w-full border-none outline-none text-xs text-right"
                      value={row.prodotto}
                      onChange={(e) =>
                        handleChangeRow(index, 'prodotto', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border align-top px-2 py-1">
                    <textarea
                      data-autoresize="true"
                      rows={1}
                      className="w-full border-none outline-none resize-none text-xs"
                      value={row.note}
                      onChange={(e) =>
                        handleChangeRow(index, 'note', e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Barre d'actions – seulement écran */}
        <div className="no-print mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNewDay}
              className="px-4 py-2 rounded border border-slate-400 hover:bg-slate-100 text-sm"
            >
              Nuova giornata
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 rounded border border-slate-400 hover:bg-slate-100 text-sm"
            >
              + Aggiungi riga
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="text-sm">
              Prodotto totale:{' '}
              <span className="font-semibold">{totalProdotto}</span>
            </div>

            <button
              type="button"
              onClick={handleSaveRapportino}
              disabled={isSaving}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm"
            >
              {isSaving ? 'Salvataggio...' : 'Salva rapportino'}
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2 rounded border border-slate-500 hover:bg-slate-100 text-sm"
            >
              Esporta PDF
            </button>
          </div>
        </div>

        {/* Messages */}
        {saveError && (
          <p className="no-print mt-3 text-sm text-red-600">{saveError}</p>
        )}
        {saveMessage && (
          <p className="no-print mt-3 text-sm text-emerald-700">
            {saveMessage}
          </p>
        )}
      </div>
    </div>
  );
}

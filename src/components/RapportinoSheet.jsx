import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Modèle de lignes par tipo squadra
const DEFAULT_ROWS_BY_CREW = {
  ELETTRICISTA: [
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
  ],
  CARPENTERIA: [
    {
      categoria: 'CARPENTERIA',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: ''
    }
  ],
  MONTAGGIO: [
    {
      categoria: 'MONTAGGIO',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: ''
    }
  ]
};

function getDefaultRows(crewRole) {
  const base = DEFAULT_ROWS_BY_CREW[crewRole] || DEFAULT_ROWS_BY_CREW.ELETTRICISTA;
  // On clone pour ne pas modifier le modèle
  return base.map((r) => ({ ...r }));
}

function formatToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function RapportinoSheet({ crewRole }) {
  const { profile } = useAuth();
  const capoName = (profile?.display_name || profile?.email || '').toUpperCase();

  // --- ÉTATS DE BASE ---
  const [data, setData] = useState(formatToday());
  const [stato, setStato] = useState('BOZZA');
  const [rows, setRows] = useState(getDefaultRows(crewRole));
  const [prodottoTotale, setProdottoTotale] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState(null);

  // Id du rapportino dans Supabase (si déjà créé)
  const [rapportinoId, setRapportinoId] = useState(null);

  // Ref pour export PDF
  const rapportinoRef = useRef(null);

  // États pour export PDF
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // --- AUTO-RESIZE TEXTAREAS ---
  const autoResizeAllTextareas = () => {
    if (typeof document === 'undefined') return;
    const textareas = document.querySelectorAll('textarea.autosize-rapportino');
    textareas.forEach((el) => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    });
  };

  const handleAutoResize = (event) => {
    const el = event.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  // Quand les lignes changent → recalcul produit total + auto-resize
  useEffect(() => {
    let total = 0;
    rows.forEach((r) => {
      const val = parseFloat(r.prodotto);
      if (!Number.isNaN(val)) total += val;
    });
    setProdottoTotale(total);

    autoResizeAllTextareas();
  }, [rows]);

  // --- CHARGEMENT / CREATION RAPPORTINO (simplifié) ---
  useEffect(() => {
    // Si tu as déjà ta logique Supabase qui fonctionne,
    // tu peux la garder et ignorer ce useEffect.
    async function loadRapportino() {
      if (!profile?.id) return;

      setSaveError(null);
      setSaveMessage('');

      try {
        const { data: rapp, error } = await supabase
          .from('rapportini')
          .select('id, stato, costr, commessa')
          .eq('capo_id', profile.id)
          .eq('crew_role', crewRole)
          .eq('data', data)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Errore caricamento rapportino:', error);
          setSaveError('Errore nel caricamento del rapportino.');
          return;
        }

        if (!rapp) {
          // Aucun rapportino pour ce jour / cette squadra → on laisse le modèle par défaut
          setRapportinoId(null);
          setRows(getDefaultRows(crewRole));
          setStato('BOZZA');
          return;
        }

        setRapportinoId(rapp.id);
        setStato(rapp.stato || 'BOZZA');

        const { data: rowData, error: rowError } = await supabase
          .from('rapportino_rows')
          .select(
            'id, row_index, categoria, descrizione, operatori, tempo, previsto, prodotto, note'
          )
          .eq('rapportino_id', rapp.id)
          .order('row_index', { ascending: true });

        if (rowError) {
          console.error('Errore caricamento righe:', rowError);
          setSaveError('Errore nel caricamento delle righe del rapportino.');
          return;
        }

        if (!rowData || rowData.length === 0) {
          setRows(getDefaultRows(crewRole));
        } else {
          const mapped = rowData.map((r) => ({
            id: r.id,
            categoria: r.categoria || '',
            descrizione: r.descrizione || '',
            operatori: r.operatori || '',
            tempo: r.tempo || '',
            previsto: r.previsto ?? '',
            prodotto: r.prodotto ?? '',
            note: r.note || ''
          }));
          setRows(mapped);
        }
      } catch (err) {
        console.error('Errore generico caricamento rapportino:', err);
        setSaveError('Errore imprevisto nel caricamento.');
      }
    }

    loadRapportino();
  }, [crewRole, data, profile?.id]);

  // --- HANDLERS TABLE ---

  const handleChangeField = (rowIndex, field, value) => {
    setRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex
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
    setRows(getDefaultRows(crewRole));
    setStato('BOZZA');
    setRapportinoId(null);
    setSaveError(null);
    setSaveMessage('');
  };

  // --- SAUVEGARDE SUPABASE (simplifié) ---

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);
    setSaveError(null);
    setSaveMessage('');

    try {
      let currentId = rapportinoId;

      // 1) Upsert rapportini
      if (!currentId) {
        const { data: inserted, error: insertError } = await supabase
          .from('rapportini')
          .insert({
            capo_id: profile.id,
            crew_role: crewRole,
            data,
            stato,
            costr: null,
            commessa: 'SDC'
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Errore creazione rapportino:', insertError);
          setSaveError('Errore durante la creazione del rapportino.');
          setSaving(false);
          return;
        }
        currentId = inserted.id;
        setRapportinoId(inserted.id);
      } else {
        const { error: updateError } = await supabase
          .from('rapportini')
          .update({
            stato,
            data
          })
          .eq('id', currentId);

        if (updateError) {
          console.error('Errore aggiornamento rapportino:', updateError);
          setSaveError('Errore durante l\'aggiornamento del rapportino.');
          setSaving(false);
          return;
        }
      }

      // 2) Supprimer les anciennes lignes puis réinsérer (simple & robuste)
      const { error: deleteError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', currentId);

      if (deleteError) {
        console.error('Errore cancellazione righe:', deleteError);
        setSaveError('Errore durante la cancellazione delle righe precedenti.');
        setSaving(false);
        return;
      }

      const rowsToInsert = rows.map((row, index) => ({
        rapportino_id: currentId,
        row_index: index,
        categoria: row.categoria || null,
        descrizione: row.descrizione || null,
        operatori: row.operatori || null,
        tempo: row.tempo || null,
        previsto:
          row.previsto === '' || row.previsto === null
            ? null
            : Number.isNaN(Number(row.previsto))
            ? null
            : Number(row.previsto),
        prodotto:
          row.prodotto === '' || row.prodotto === null
            ? null
            : Number.isNaN(Number(row.prodotto))
            ? null
            : Number(row.prodotto),
        note: row.note || null
      }));

      if (rowsToInsert.length > 0) {
        const { error: insertRowsError } = await supabase
          .from('rapportino_rows')
          .insert(rowsToInsert);

        if (insertRowsError) {
          console.error('Errore inserimento righe:', insertRowsError);
          setSaveError('Errore durante il salvataggio delle righe.');
          setSaving(false);
          return;
        }
      }

      setSaveMessage('Rapportino salvato correttamente.');
    } catch (err) {
      console.error('Errore generico salvataggio rapportino:', err);
      setSaveError('Errore imprevisto durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  // --- EXPORT PDF ROBUSTE ---

  const handleExportPdf = async () => {
    if (!rapportinoRef.current) return;

    try {
      setExportError(null);
      setExporting(true);

      const element = rapportinoRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeCrew = (crewRole || 'squadra').toLowerCase();
      const filename = `rapportino_${safeCrew}_${data}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Errore export PDF:', err);
      setExportError('Errore durante l\'esportazione del PDF.');
    } finally {
      setExporting(false);
    }
  };

  // --- RENDER ---

  return (
    <div className="mt-6 flex justify-center">
      <div
        ref={rapportinoRef}
        className="bg-white shadow-md rounded-md px-6 pt-4 pb-6 max-w-5xl w-full rapportino-table"
      >
        {/* EN-TÊTE RAPPORT */}
        <header className="mb-4">
          <div className="flex justify-between mb-2">
            <div>
              <div className="font-semibold">
                COSTR.: <span className="ml-2 border-b border-slate-400 inline-block w-40" />
              </div>
              <div className="font-semibold mt-1">
                Commessa:&nbsp;
                <span>SDC</span>
              </div>
              <div className="font-semibold mt-1">
                Capo Squadra:&nbsp;
                <span>{capoName}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                Rapportino Giornaliero – {crewRole}
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="font-semibold">Data:</span>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="border border-slate-400 rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="mt-2">
                <span className="font-semibold mr-1">Stato:</span>
                <span className="inline-block px-3 py-0.5 rounded-full border border-amber-500 text-xs bg-amber-100 text-amber-800">
                  {stato === 'BOZZA' ? 'Bozza' : stato}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* TABLEAU PRINCIPAL */}
        <div className="border border-slate-400">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="rapportino-header-border border-slate-400 px-2 py-1 text-left w-24">
                  CATEGORIA
                </th>
                <th className="rapportino-header-border border-slate-400 px-2 py-1 text-left w-56">
                  DESCRIZIONE ATTIVITA'
                </th>
                <th className="rapportino-header-border border-slate-400 px-2 py-1 text-left w-56">
                  OPERATORE
                </th>
                <th className="rapportino-header-border border-slate-400 px-2 py-1 text-left w-56">
                  Tempo impiegato
                </th>
                <th className="rapportino-header-border border-slate-400 px-2 py-1 text-left w-24">
                  PREVISTO
                </th>
                <th className="rapportino-header-border border-slate-400 px-2 py-1 text-left w-24">
                  PRODOTTO
                </th>
                <th className="rapportino-header-border border-slate-400 px-2 py-1 text-left w-56">
                  NOTE
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="align-top">
                  {/* CATEGORIA */}
                  <td className="rapportino-border border-slate-400 px-2 py-1">
                    <input
                      type="text"
                      value={row.categoria}
                      onChange={(e) =>
                        handleChangeField(index, 'categoria', e.target.value.toUpperCase())
                      }
                      className="w-full border-none outline-none text-sm"
                    />
                  </td>

                  {/* DESCRIZIONE */}
                  <td className="rapportino-border border-slate-400 px-2 py-1">
                    <textarea
                      className="w-full border-none outline-none text-sm resize-none overflow-hidden autosize-rapportino"
                      rows={1}
                      value={row.descrizione}
                      onChange={(e) => {
                        handleAutoResize(e);
                        handleChangeField(index, 'descrizione', e.target.value);
                      }}
                    />
                  </td>

                  {/* OPERATORE */}
                  <td className="rapportino-border border-slate-400 px-2 py-1">
                    <textarea
                      className="w-full border-none outline-none text-sm resize-none overflow-hidden autosize-rapportino"
                      rows={1}
                      placeholder="Una riga per operatore"
                      value={row.operatori}
                      onChange={(e) => {
                        handleAutoResize(e);
                        handleChangeField(index, 'operatori', e.target.value.toUpperCase());
                      }}
                    />
                  </td>

                  {/* TEMPO */}
                  <td className="rapportino-border border-slate-400 px-2 py-1">
                    <textarea
                      className="w-full border-none outline-none text-sm resize-none overflow-hidden autosize-rapportino"
                      rows={1}
                      placeholder="Stesse righe degli operatori"
                      value={row.tempo}
                      onChange={(e) => {
                        handleAutoResize(e);
                        handleChangeField(index, 'tempo', e.target.value);
                      }}
                    />
                  </td>

                  {/* PREVISTO */}
                  <td className="rapportino-border border-slate-400 px-2 py-1">
                    <input
                      type="number"
                      step="0.1"
                      value={row.previsto}
                      onChange={(e) =>
                        handleChangeField(index, 'previsto', e.target.value)
                      }
                      className="w-full border-none outline-none text-sm text-right"
                    />
                  </td>

                  {/* PRODOTTO */}
                  <td className="rapportino-border border-slate-400 px-2 py-1">
                    <input
                      type="number"
                      step="0.1"
                      value={row.prodotto}
                      onChange={(e) =>
                        handleChangeField(index, 'prodotto', e.target.value)
                      }
                      className="w-full border-none outline-none text-sm text-right"
                    />
                  </td>

                  {/* NOTE */}
                  <td className="rapportino-border border-slate-400 px-2 py-1">
                    <textarea
                      className="w-full border-none outline-none text-sm resize-none overflow-hidden autosize-rapportino"
                      rows={1}
                      value={row.note}
                      onChange={(e) => {
                        handleAutoResize(e);
                        handleChangeField(index, 'note', e.target.value);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PIED DE PAGE : BOUTONS + TOTALE */}
        <div className="mt-4 flex items-center justify-between">
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

          <div className="text-sm font-semibold">
            Prodotto totale:&nbsp;
            <span>{prodottoTotale}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 ${
                saving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {saving ? 'Salvataggio...' : 'Salva rapportino'}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className={`px-4 py-2 rounded border border-slate-400 text-sm hover:bg-slate-100 ${
                exporting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {exporting ? 'Esportazione...' : 'Esporta PDF'}
            </button>
          </div>
        </div>

        {/* MESSAGES D'ERREUR / SUCCÈS */}
        {saveError && (
          <p className="mt-2 text-sm text-red-600">
            {saveError}
          </p>
        )}
        {saveMessage && !saveError && (
          <p className="mt-2 text-sm text-emerald-700">
            {saveMessage}
          </p>
        )}
        {exportError && (
          <p className="mt-2 text-sm text-red-600">
            {exportError}
          </p>
        )}
      </div>
    </div>
  );
}

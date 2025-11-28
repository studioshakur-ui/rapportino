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

  // Pour CARPENTERIA / MONTAGGIO on laisse vide, le capo écrit tout lui-même
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

  // Pour l'en-tête
  const [costr, setCostr] = useState('');
  const commessa = 'SDC';

  const printRef = useRef(null);

  useEffect(() => {
    if (!profile || !crewRole) return;

    let isMounted = true;

    async function loadRapportino() {
      setIsLoading(true);
      setSaveError(null);

      try {
        // 1) Chercher un rapportino existant pour (user, role, date)
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

        let existing = data && data.length > 0 ? data[0] : null;

        // 2) S'il n'existe pas, en créer un (BOZZA)
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
          // 3) Charger les lignes existantes
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

  // Recalcule le produit total quand les lignes changent
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
      // 1) Mettre à jour le rapportino (status & date si modifiée)
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

      // 2) Effacer les lignes existantes
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

      // 3) Réinsérer les lignes dans l’ordre
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

// src/rapportino/useRapportinoLogic.js

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';
<<<<<<< HEAD
import { EMPTY_ROWS_BY_CREW, STATUS_LABELS } from './constants';

export default function useRapportinoLogic(crewRole) {
  const { profile } = useAuth();

  // ------------------------------------------------------
  //  Header
  // ------------------------------------------------------
=======
import { EMPTY_ROWS_BY_CREW, RAPPORTINO_STATUS_LABELS } from './constants';

// Converte "0,2" ➜ 0.2 per il DB (numeric)
// Se non valido ➜ null
function toNumeric(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  const clean = str.replace(',', '.');
  const num = parseFloat(clean);
  return Number.isFinite(num) ? num : null;
}

export function useRapportinoLogic(crewRole) {
  const { profile } = useAuth();

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
  const [costr, setCostr] = useState('6368');
  const [commessa, setCommessa] = useState('SDC');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('DRAFT');

<<<<<<< HEAD
  // Capo sempre in MAIUSCOLO
=======
  // Capo sempre in MAIUSCOLO (usato anche per capo_name in DB)
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
  const capoSquadra = useMemo(() => {
    const src = profile?.display_name || profile?.email || '';
    return src.toUpperCase();
  }, [profile]);

<<<<<<< HEAD
  // ------------------------------------------------------
  //  Righe del rapporto
  // ------------------------------------------------------
  const baseRows = EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA;
  const [rows, setRows] = useState(baseRows);
=======
  // ---------------------------------------------------------------------------
  // Righe
  // ---------------------------------------------------------------------------
  const initialRows =
    EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA;

  const [rows, setRows] = useState(initialRows);
>>>>>>> 0eadc61 (Initial commit Rapportino locale)

  useEffect(() => {
    setRows(EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA);
  }, [crewRole]);

  const handleChangeCell = (index, field, value) => {
    setRows((prev) =>
<<<<<<< HEAD
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
=======
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        categoria:
          crewRole === 'CARPENTERIA'
            ? 'CARPENTERIA'
            : crewRole === 'MONTAGGIO'
            ? 'MONTAGGIO'
            : 'STESURA',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
<<<<<<< HEAD
        note: ''
      }
=======
        note: '',
      },
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    ]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const prodottoTotale = useMemo(() => {
    return rows.reduce((sum, r) => {
<<<<<<< HEAD
      const v = parseFloat(String(r.prodotto || '0').replace(',', '.'));
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [rows]);

  // ------------------------------------------------------
  //  Stato salvataggio / errori
  // ------------------------------------------------------
=======
      const v = toNumeric(r.prodotto);
      return sum + (v || 0);
    }, 0);
  }, [rows]);

  // ---------------------------------------------------------------------------
  // Stato salvataggio / errori
  // ---------------------------------------------------------------------------
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
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

<<<<<<< HEAD
  // ------------------------------------------------------
  //  Helpers numerici
  // ------------------------------------------------------
  const normalizeNumeric = (value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;

    const fixed = trimmed.replace(',', '.');
    const num = Number(fixed);
    if (!Number.isFinite(num)) {
      return null;
    }
    return num;
  };

  // ------------------------------------------------------
  //  Salvataggio in Supabase
  // ------------------------------------------------------
  const buildRapportinoPayload = (overrideStatus) => {
    if (!profile?.id) {
      return null;
    }
=======
  // ---------------------------------------------------------------------------
  // Costruzione payload + salvataggio
  // ---------------------------------------------------------------------------
  const buildRapportinoPayload = (overrideStatus) => {
    if (!profile?.id) return null;
>>>>>>> 0eadc61 (Initial commit Rapportino locale)

    return {
      id: rapportinoId || undefined,
      capo_id: profile.id,
<<<<<<< HEAD
      capo_name: capoSquadra || null,
=======
      capo_name: capoSquadra, // <<< corrige l'errore NOT NULL su capo_name
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
      crew_role: crewRole,
      data,
      costr: costr || null,
      commessa: commessa || null,
      status: overrideStatus || status || 'DRAFT',
<<<<<<< HEAD
      prodotto_totale: prodottoTotale
=======
      prodotto_totale: prodottoTotale || 0,
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    };
  };

  const saveRows = async (rapportinoIdValue) => {
<<<<<<< HEAD
=======
    // On efface les anciennes lignes puis on insère les nouvelles
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    const deleteRes = await supabase
      .from('rapportino_rows')
      .delete()
      .eq('rapportino_id', rapportinoIdValue);

    if (deleteRes.error) {
      throw deleteRes.error;
    }

<<<<<<< HEAD
    if (rows.length === 0) return;
=======
    if (!rows.length) return;
>>>>>>> 0eadc61 (Initial commit Rapportino locale)

    const rowsPayload = rows.map((row, index) => ({
      rapportino_id: rapportinoIdValue,
      row_index: index,
      categoria: row.categoria || null,
      descrizione: row.descrizione || null,
      operatori: row.operatori || null,
      tempo: row.tempo || null,
<<<<<<< HEAD
      previsto: normalizeNumeric(row.previsto),
      prodotto: normalizeNumeric(row.prodotto),
      note: row.note || null
    }));

    const insertRes = await supabase.from('rapportino_rows').insert(rowsPayload);

=======
      previsto: toNumeric(row.prevvisto ?? row.previsto),
      prodotto: toNumeric(row.prodotto),
      note: row.note || null,
    }));

    const insertRes = await supabase.from('rapportino_rows').insert(rowsPayload);
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    if (insertRes.error) {
      throw insertRes.error;
    }
  };

<<<<<<< HEAD
  const handleSaveInternal = async (overrideStatus = null) => {
=======
  const handleSave = async (overrideStatus = null) => {
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
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

      setSaveErrorMsg(
<<<<<<< HEAD
        'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.'
=======
        'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.',
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
      );

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

<<<<<<< HEAD
  // Wrappers propres pour les boutons (pas d’event qui traîne)
  const handleSaveClick = async () => {
    return handleSaveInternal(null);
  };

  const handleValidateDay = async () => {
    return handleSaveInternal('VALIDATED_CAPO');
=======
  const handleValidateDay = async () => {
    await handleSave('VALIDATED_CAPO');
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
  };

  const handleNewDay = () => {
    resetError();
    setRapportinoId(null);
    setStatus('DRAFT');
    setRows(EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA);
    setLastSaveOk(false);
  };

  const handleOpenArchivio = () => {
    alert('Archivio non ancora implementato in questa versione.');
  };

  const handleExportPdf = async () => {
<<<<<<< HEAD
    const ok = await handleSaveInternal(null);
    if (!ok) return;

    window.print();
  };

  const statusLabel = STATUS_LABELS[status] || status;
=======
    const ok = await handleSave();
    if (!ok) return;
    window.print(); // pour l’instant on garde ça; plus tard html2canvas/jsPDF
  };

  const statusLabel = RAPPORTINO_STATUS_LABELS[status] || status;
>>>>>>> 0eadc61 (Initial commit Rapportino locale)

  return {
    // header
    costr,
    setCostr,
    commessa,
    setCommessa,
    data,
    setData,
    status,
    statusLabel,
    capoSquadra,

<<<<<<< HEAD
    // lignes
=======
    // righe
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    rows,
    handleChangeCell,
    handleAddRow,
    handleRemoveRow,
    prodottoTotale,

    // actions
<<<<<<< HEAD
    handleNewDay,
    handleOpenArchivio,
    handleSaveClick,
    handleValidateDay,
    handleExportPdf,

    // état de sauvegarde / erreurs
=======
    handleSave,
    handleValidateDay,
    handleNewDay,
    handleOpenArchivio,
    handleExportPdf,

    // stato salvataggio / errori
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
    isSaving,
    lastSaveOk,
    saveErrorMsg,
    saveErrorDetails,
    showErrorDetails,
<<<<<<< HEAD
    setShowErrorDetails
=======
    setShowErrorDetails,
>>>>>>> 0eadc61 (Initial commit Rapportino locale)
  };
}

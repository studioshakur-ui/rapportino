// src/rapportino/useRapportinoLogic.js

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import { EMPTY_ROWS_BY_CREW, STATUS_LABELS } from './constants';

export default function useRapportinoLogic(crewRole) {
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

    return {
      id: rapportinoId || undefined,
      capo_id: profile.id,
      capo_name: capoSquadra || null,
      crew_role: crewRole,
      data,
      costr: costr || null,
      commessa: commessa || null,
      status: overrideStatus || status || 'DRAFT',
      prodotto_totale: prodottoTotale
    };
  };

  const saveRows = async (rapportinoIdValue) => {
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
      previsto: normalizeNumeric(row.previsto),
      prodotto: normalizeNumeric(row.prodotto),
      note: row.note || null
    }));

    const insertRes = await supabase.from('rapportino_rows').insert(rowsPayload);

    if (insertRes.error) {
      throw insertRes.error;
    }
  };

  const handleSaveInternal = async (overrideStatus = null) => {
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
        'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.'
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

  // Wrappers propres pour les boutons (pas d’event qui traîne)
  const handleSaveClick = async () => {
    return handleSaveInternal(null);
  };

  const handleValidateDay = async () => {
    return handleSaveInternal('VALIDATED_CAPO');
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
    const ok = await handleSaveInternal(null);
    if (!ok) return;

    window.print();
  };

  const statusLabel = STATUS_LABELS[status] || status;

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

    // lignes
    rows,
    handleChangeCell,
    handleAddRow,
    handleRemoveRow,
    prodottoTotale,

    // actions
    handleNewDay,
    handleOpenArchivio,
    handleSaveClick,
    handleValidateDay,
    handleExportPdf,

    // état de sauvegarde / erreurs
    isSaving,
    lastSaveOk,
    saveErrorMsg,
    saveErrorDetails,
    showErrorDetails,
    setShowErrorDetails
  };
}

import { useEffect, useState } from 'react';
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
    note: ''
  };
}

export default function RapportinoSheet({ crewRole }) {
  const { user, profile } = useAuth();

  const [date, setDate] = useState(todayISO()); // ✅ appel de la fonction
  const [capoName, setCapoName] = useState(
    profile?.display_name || profile?.email || ''
  );
  const [status, setStatus] = useState('DRAFT');
  const [rapportinoId, setRapportinoId] = useState(null);

  const [rows, setRows] = useState([makeEmptyRow(0)]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);

  // Re-synchroniser capoName quand le profil change
  useEffect(() => {
    if (!capoName && profile) {
      setCapoName(profile.display_name || profile.email || '');
    }
  }, [profile, capoName]);

  // Charger rapportino + lignes quand user / crewRole / date changent
  useEffect(() => {
    if (!user || !crewRole || !date) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setSaveMessage(null);

      try {
        // Charger l'en-tête
        const { data: header, error: headerError } = await supabase
          .from('rapportini')
          .select('*')
          .eq('user_id', user.id)
          .eq('crew_role', crewRole)
          .eq('report_date', date)
          .maybeSingle();

        if (headerError) {
          throw headerError;
        }

        if (cancelled) return;

        if (header) {
          setRapportinoId(header.id);
          setCapoName(
            header.capo_name || profile?.display_name || profile?.email || ''
          );
          setStatus(header.status || 'DRAFT');

          // Charger les lignes
          const { data: rowData, error: rowsError } = await supabase
            .from('rapportino_rows')
            .select('*')
            .eq('rapportino_id', header.id)
            .order('row_index', { ascending: true });

          if (rowsError) {
            throw rowsError;
          }

          if (cancelled) return;

          if (rowData && rowData.length > 0) {
            const mapped = rowData.map((r, idx) => ({
              id: r.id,
              row_index: r.row_index ?? idx,
              categoria: r.categoria || '',
              descrizione: r.descrizione || '',
              operatori: r.operatori || '',
              tempo: r.tempo || '',
              previsto: r.previsto ?? '',
              prodotto: r.prodotto ?? '',
              note: r.note || ''
            }));
            setRows(mapped);
          } else {
            setRows([makeEmptyRow(0)]);
          }
        } else {
          // Aucun rapportino encore pour ce jour/squadra
          setRapportinoId(null);
          setStatus('DRAFT');
          setCapoName(profile?.display_name || profile?.email || '');
          setRows([makeEmptyRow(0)]);
        }
      } catch (err) {
        console.error('Erreur chargement rapportino:', err);
        if (!cancelled) {
          setLoadError(
            'Impossible de charger le rapportino pour ce jour : ' +
              (err?.message || err?.details || '')
          );
          setRapportinoId(null);
          setRows([makeEmptyRow(0)]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, crewRole, date, profile]);

  function handleRowChange(index, field, value) {
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
  }

  function handleAddRow() {
    setRows((prev) => {
      const nextIndex = prev.length;
      return [...prev, makeEmptyRow(nextIndex)];
    });
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
      const value =
        row.prodotto === '' || row.prodotto == null ? 0 : Number(row.prodotto);
      if (Number.isNaN(value)) return sum;
      return sum + value;
    }, 0);
  }

  async function handleSave() {
    if (!user || !crewRole || !date) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const cleanedRows = rows.map((row, index) => ({
        ...row,
        row_index: index
      }));

      const prodottoTot = computeProdottoTot(cleanedRows);

      const headerPayload = {
        user_id: user.id,
        crew_role: crewRole,
        report_date: date,
        capo_name: capoName || null,
        status: status || 'DRAFT',
        prodotto_tot: prodottoTot
      };

      let headerData = null;

      if (rapportinoId) {
        // 🔁 UPDATE si on a déjà un rapportino pour ce jour/squadra
        const { data, error } = await supabase
          .from('rapportini')
          .update(headerPayload)
          .eq('id', rapportinoId)
          .select('*')
          .single();

        if (error) throw error;
        headerData = data;
      } else {
        // ➕ INSERT sinon
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

      // Supprimer les lignes existantes pour ce rapportino
      const { error: deleteError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', newRapportinoId);

      if (deleteError) throw deleteError;

      // Préparer les nouvelles lignes (on ignore celles complètement vides)
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
          note: row.note || null
        }));

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('rapportino_rows')
          .insert(rowsToInsert);

        if (insertError) throw insertError;
      }

      setSaveMessage('Rapportino enregistré dans CORE ✅');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.error('Erreur sauvegarde rapportino:', err);
      const msg =
        err?.message ||
        err?.details ||
        err?.hint ||
        "Erreur pendant l'enregistrement du rapportino.";
      setSaveMessage('Erreur : ' + msg);
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
  }

  return (
    <div className

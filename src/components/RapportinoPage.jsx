// src/components/RapportinoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

import LoadingScreen from './LoadingScreen';
import RapportinoHeader from './rapportino/RapportinoHeader';
import RapportinoTable from './rapportino/RapportinoTable';

import {
  getTodayISO,
  parseNumeric,
  getBaseRows,
  adjustOperatorTempoHeights,
} from '../rapportinoUtils';

import RapportinoIncaCaviSection from './RapportinoIncaCaviSection';
import { applyRapportinoToInca } from '../inca/incaRapportinoLinkApi';

const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validata dal Capo',
  APPROVED_UFFICIO: "Approvata dall'Ufficio",
  RETURNED: "Rimandata dall'Ufficio",
};

const CREW_LABELS = {
  ELETTRICISTA: 'Elettricista',
  CARPENTERIA: 'Carpenteria',
  MONTAGGIO: 'Montaggio',
};

export default function RapportinoPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { shipId } = useParams();

  // ✅ COSTR PLUS PAR DÉFAUT
  const [costr, setCostr] = useState(null);

  const [crewRole, setCrewRole] = useState(() => {
    try {
      const stored = window.localStorage.getItem('core-current-role');
      if (['ELETTRICISTA', 'CARPENTERIA', 'MONTAGGIO'].includes(stored)) return stored;
    } catch {}
    return 'ELETTRICISTA';
  });

  const normalizedCrewRole = ['ELETTRICISTA', 'CARPENTERIA', 'MONTAGGIO'].includes(crewRole)
    ? crewRole
    : 'ELETTRICISTA';

  const crewLabel = CREW_LABELS[normalizedCrewRole];

  const [commessa, setCommessa] = useState('SDC');
  const [rapportinoId, setRapportinoId] = useState(null);
  const [reportDate, setReportDate] = useState(getTodayISO());
  const [status, setStatus] = useState('DRAFT');
  const [rows, setRows] = useState(() => getBaseRows(normalizedCrewRole));

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const capoName = useMemo(() => {
    return (
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      'Capo Squadra'
    ).toUpperCase();
  }, [profile]);

  const statusLabel = STATUS_LABELS[status];

  const prodottoTotale = useMemo(() => {
    return rows.reduce((sum, r) => sum + (parseNumeric(r.prodotto) || 0), 0);
  }, [rows]);

  // ✅ CHARGEMENT RAPPORTINO + COSTR DEPUIS LE NAVIRE
  useEffect(() => {
    let active = true;

    async function loadRapportino() {
      if (!profile?.id || !shipId) {
        setInitialLoading(false);
        return;
      }

      try {
        setLoading(true);

        // ✅ RÉCUPÉRATION DU COSTR DEPUIS LA TABLE SHIPS
        const { data: ship, error: shipError } = await supabase
          .from('ships')
          .select('costr')
          .eq('id', shipId)
          .single();

        if (shipError) throw shipError;
        if (ship?.costr) setCostr(ship.costr);

        const { data: rap, error: rapError } = await supabase
          .from('rapportini')
          .select('*')
          .eq('capo_id', profile.id)
          .eq('crew_role', normalizedCrewRole)
          .eq('report_date', reportDate)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rapError && rapError.code !== 'PGRST116') throw rapError;
        if (!active) return;

        if (!rap) {
          setRapportinoId(null);
          setStatus('DRAFT');
          setRows(getBaseRows(normalizedCrewRole));
        } else {
          setRapportinoId(rap.id);
          setStatus(rap.status || 'DRAFT');
          setCommessa(rap.commessa || 'SDC');

          const { data: righe } = await supabase
            .from('rapportino_rows')
            .select('*')
            .eq('rapportino_id', rap.id)
            .order('row_index');

          if (righe?.length) {
            setRows(
              righe.map((r, idx) => ({
                id: r.id,
                row_index: idx,
                categoria: r.categoria || '',
                descrizione: r.descrizione || '',
                operatori: r.operatori || '',
                tempo: r.tempo || '',
                previsto: r.previsto != null ? String(r.previsto) : '',
                prodotto: r.prodotto != null ? String(r.prodotto) : '',
                note: r.note || '',
              }))
            );
          }
        }
      } catch (err) {
        setError('Errore caricamento rapportino.');
        setErrorDetails(err?.message || String(err));
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    }

    loadRapportino();
    return () => (active = false);
  }, [profile?.id, shipId, normalizedCrewRole, reportDate]);

  const handleRowChange = (index, field, value, target) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });

    if (target) adjustOperatorTempoHeights(target);
  };

  const handleSave = async (forcedStatus) => {
    setSaving(true);
    try {
      const newStatus = forcedStatus || status;

      const cleanRows = rows.map((r, i) => ({
        categoria: r.categoria?.trim(),
        descrizione: r.descrizione?.trim(),
        operatori: r.operatori?.trim(),
        tempo: r.tempo?.trim(),
        previsto: parseNumeric(r.previsto),
        prodotto: parseNumeric(r.prodotto),
        note: r.note?.trim(),
        row_index: i,
      }));

      let newId = rapportinoId;

      if (!newId) {
        const { data } = await supabase
          .from('rapportini')
          .insert({
            capo_id: profile.id,
            crew_role: normalizedCrewRole,
            report_date: reportDate,
            data: reportDate,
            costr,
            commessa,
            status: newStatus,
            prodotto_totale: prodottoTotale,
          })
          .select()
          .single();

        newId = data.id;
        setRapportinoId(newId);
      } else {
        await supabase.from('rapportino_rows').delete().eq('rapportino_id', newId);
      }

      await supabase
        .from('rapportino_rows')
        .insert(cleanRows.map((r) => ({ ...r, rapportino_id: newId })));

      setStatus(newStatus);
      setSuccessMessage('Salvataggio riuscito.');
      return { success: true, id: newId };
    } catch (e) {
      setError('Errore salvataggio.');
      setErrorDetails(e?.message || String(e));
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    const { success, id } = await handleSave('VALIDATED_CAPO');
    if (!success || !id) return;

    if (normalizedCrewRole === 'ELETTRICISTA') {
      await applyRapportinoToInca({ rapportinoId: id });
    }
  };

  const handleExportPdf = async () => {
    const { success, id } = await handleSave(status);
    if (success) navigate(`/print/rapportino?id=${id}`);
  };

  const handleOpenIncaCockpit = () => {
    navigate(`/app/ship/${shipId}/inca`);
  };

  if (initialLoading || loading) {
    return <LoadingScreen message="Caricamento del rapportino in corso." />;
  }

  return (
    <div className="min-h-screen bg-slate-900/80">
      <main className="max-w-6xl mx-auto p-4">
        <RapportinoHeader
          costr={costr}
          commessa={commessa}
          reportDate={reportDate}
          capoName={capoName}
          onChangeCommessa={setCommessa}
          onChangeDate={setReportDate}
        />

        <RapportinoTable
          rows={rows}
          onRowChange={handleRowChange}
          onRemoveRow={() => {}}
        />

        {normalizedCrewRole === 'ELETTRICISTA' && rapportinoId && (
          <RapportinoIncaCaviSection
            rapportinoId={rapportinoId}
            shipCostr={costr}
            disabled={status !== 'DRAFT'}
          />
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={handleOpenIncaCockpit}>Cockpit INCA</button>
          <button onClick={handleValidate}>Valida</button>
          <button onClick={handleExportPdf}>PDF</button>
        </div>

        {error && (
          <pre className="mt-3 bg-red-50 text-red-800 p-2 rounded text-xs">
            {errorDetails}
          </pre>
        )}
      </main>
    </div>
  );
}

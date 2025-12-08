// src/components/RapportinoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

import LoadingScreen from './LoadingScreen';
// ⛔ Plus de ListaCaviPanel ici
// import ListaCaviPanel from './ListaCaviPanel';

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

  // Rôle de l’équipe
  const [crewRole, setCrewRole] = useState(() => {
    try {
      const stored = window.localStorage.getItem('core-current-role');
      if (
        stored === 'ELETTRICISTA' ||
        stored === 'CARPENTERIA' ||
        stored === 'MONTAGGIO'
      ) {
        return stored;
      }
    } catch {
      //
    }
    return 'ELETTRICISTA';
  });

  const normalizedCrewRole =
    crewRole === 'ELETTRICISTA' ||
    crewRole === 'CARPENTERIA' ||
    crewRole === 'MONTAGGIO'
      ? crewRole
      : 'ELETTRICISTA';

  const crewLabel = CREW_LABELS[normalizedCrewRole] || normalizedCrewRole;

  // Header
  const [costr, setCostr] = useState('6368');
  const [commessa, setCommessa] = useState('SDC');
  const [rapportinoId, setRapportinoId] = useState(null);
  const [reportDate, setReportDate] = useState(getTodayISO());
  const [status, setStatus] = useState('DRAFT');

  // Lignes
  const [rows, setRows] = useState(() => getBaseRows(normalizedCrewRole));

  // États UI
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  // ⛔ Plus de showListaCavi
  // const [showListaCavi, setShowListaCavi] = useState(false);

  const capoName = useMemo(
    () =>
      (profile?.display_name ||
        profile?.full_name ||
        profile?.email ||
        'Capo Squadra'
      )
        .toUpperCase()
        .trim(),
    [profile]
  );

  const statusLabel = STATUS_LABELS[status] || status;

  const prodottoTotale = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const v = parseNumeric(r.prodotto);
        return sum + (v || 0);
      }, 0),
    [rows]
  );

  // Chargement rapportino existant
  useEffect(() => {
    let active = true;

    async function loadRapportino() {
      if (!profile?.id) {
        setInitialLoading(false);
        return;
      }

      try {
        setLoading(true);
        setInitialLoading(true);
        setError(null);
        setErrorDetails(null);
        setShowErrorDetails(false);
        setSuccessMessage(null);

        const { data: rap, error: rapError } = await supabase
          .from('rapportini')
          .select('*')
          .eq('capo_id', profile.id)
          .eq('crew_role', normalizedCrewRole)
          .eq('report_date', reportDate)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rapError && rapError.code !== 'PGRST116') {
          throw rapError;
        }

        if (!active) return;

        if (!rap) {
          setRapportinoId(null);
          setCostr('6368');
          setCommessa('SDC');
          setStatus('DRAFT');
          setRows(getBaseRows(normalizedCrewRole));
        } else {
          setRapportinoId(rap.id);
          setCostr(rap.costr || rap.cost || '6368');
          setCommessa(rap.commessa || 'SDC');
          setStatus(rap.status || 'DRAFT');

          const { data: righe, error: rowsError } = await supabase
            .from('rapportino_rows')
            .select('*')
            .eq('rapportino_id', rap.id)
            .order('row_index', { ascending: true });

          if (rowsError) throw rowsError;
          if (!active) return;

          if (!righe || righe.length === 0) {
            setRows(getBaseRows(normalizedCrewRole));
          } else {
            const mapped = righe.map((r, idx) => ({
              id: r.id,
              row_index: r.row_index ?? idx,
              categoria: r.categoria ?? '',
              descrizione: r.descrizione ?? '',
              operatori: r.operatori ?? '',
              tempo: r.tempo ?? '',
              previsto:
                r.previsto !== null && r.previsto !== undefined
                  ? String(r.previsto)
                  : '',
              prodotto:
                r.prodotto !== null && r.prodotto !== undefined
                  ? String(r.prodotto)
                  : '',
              note: r.note ?? '',
            }));
            setRows(mapped);
          }
        }
      } catch (err) {
        console.error('Errore caricamento rapportino:', err);
        setError('Errore durante il caricamento del rapportino.');
        setErrorDetails(err?.message || String(err));
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    }

    loadRapportino();
    return () => {
      active = false;
    };
  }, [profile?.id, normalizedCrewRole, reportDate]);

  // Édition des lignes
  const handleRowChange = (index, field, value, targetForHeight) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };
      row[field] = value;
      copy[index] = row;
      return copy;
    });

    if (targetForHeight) {
      adjustOperatorTempoHeights(targetForHeight);
    }
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const nextIndex = prev.length;
      const baseCategoria =
        normalizedCrewRole === 'CARPENTERIA'
          ? 'CARPENTERIA'
          : normalizedCrewRole === 'MONTAGGIO'
          ? 'MONTAGGIO'
          : 'STESURA';

      return [
        ...prev,
        {
          id: null,
          row_index: nextIndex,
          categoria: baseCategoria,
          descrizione: '',
          operatori: '',
          tempo: '',
          previsto: '',
          prodotto: '',
          note: '',
        },
      ];
    });
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => {
      if (prev.length === 1) {
        return getBaseRows(normalizedCrewRole);
      }
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.map((r, idx) => ({ ...r, row_index: idx }));
    });
  };

  // Sauvegarde → renvoie { success, id }
  const handleSave = async (forcedStatus) => {
    if (!profile?.id) return { success: false, id: null };

    setSaving(true);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setSuccessMessage(null);

    try {
      const newStatus = forcedStatus || status || 'DRAFT';

      const cleanRows = rows.map((r, idx) => ({
        categoria: (r.categoria || '').trim(),
        descrizione: (r.descrizione || '').trim(),
        operatori: (r.operatori || '').trim(),
        tempo: (r.tempo || '').trim(),
        previsto: parseNumeric(r.previsto),
        prodotto: parseNumeric(r.prodotto),
        note: (r.note || '').trim(),
        row_index: idx,
      }));

      let newId = rapportinoId;

      if (!newId) {
        const { data: inserted, error: insertError } = await supabase
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
          .select('*')
          .single();

        if (insertError) throw insertError;
        newId = inserted.id;
        setRapportinoId(inserted.id);
      } else {
        const { error: updateError } = await supabase
          .from('rapportini')
          .update({
            costr,
            commessa,
            status: newStatus,
            prodotto_totale: prodottoTotale,
            report_date: reportDate,
            data: reportDate,
          })
          .eq('id', newId);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('rapportino_rows')
          .delete()
          .eq('rapportino_id', newId);

        if (deleteError) throw deleteError;
      }

      if (cleanRows.length > 0) {
        const rowsToInsert = cleanRows.map((r) => ({
          ...r,
          rapportino_id: newId,
        }));

        const { error: insertRowsError } = await supabase
          .from('rapportino_rows')
          .insert(rowsToInsert);

        if (insertRowsError) throw insertRowsError;
      }

      setStatus(newStatus);
      setSuccessMessage('Salvataggio riuscito.');
      return { success: true, id: newId };
    } catch (err) {
      console.error('Errore salvataggio rapportino:', err);
      setError('Errore durante il salvataggio del rapportino.');
      setErrorDetails(err?.message || String(err));
      return { success: false, id: null };
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    // 1) Sauvegarde + passage en VALIDATED_CAPO
    const { success, id } = await handleSave('VALIDATED_CAPO');
    if (!success || !id) return;

    // 2) Appliquer la production INCA seulement pour ELETTRICISTA
    if (normalizedCrewRole === 'ELETTRICISTA') {
      try {
        const result = await applyRapportinoToInca({ rapportinoId: id });
        console.log('[Rapportino] applyRapportinoToInca result', result);
        setSuccessMessage(
          `Rapportino validato. Cavi INCA aggiornati per COSTR ${costr}.`
        );
      } catch (incaErr) {
        console.error('[Rapportino] applyRapportinoToInca error', incaErr);
        setError(
          'Rapportino validato, ma errore durante aggiornamento cavi INCA.'
        );
        setErrorDetails(incaErr?.message || String(incaErr));
        setShowErrorDetails(true);
      }
    }
  };

  // ➜ Export PDF : sauvegarde, récupère l'ID, puis va sur la page de print
  const handleExportPdf = async () => {
    const { success, id } = await handleSave(status);
    if (!success || !id) return;

    navigate(`/print/rapportino?id=${encodeURIComponent(id)}`);
  };

  // ➜ Archivio : page Archive Capo
  const handleOpenArchivio = () => {
    navigate('/archive');
  };

  // ➜ Cockpit INCA plein écran
  const handleOpenIncaCockpit = () => {
    // On utilise en priorité shipId (contexte route), sinon le COSTR courant
    const targetShip = shipId || costr || '0000';
    navigate(`/app/ship/${encodeURIComponent(targetShip)}/inca`);
  };

  const handleChangeRole = () => {
    if (!shipId) return;
    navigate(`/app/ship/${shipId}/rapportino/role`);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Errore logout capo:', err);
    } finally {
      navigate('/login');
    }
  };

  const incaSectionDisabled =
    status !== 'DRAFT' && status !== 'RETURNED';

  if (initialLoading || loading) {
    return <LoadingScreen message="Caricamento del rapportino in corso." />;
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-900/80"
      style={{ opacity: 1, filter: 'none' }}
    >
      {/* Bandeau haut */}
      <header className="border-b border-slate-700 bg-slate-900 text-slate-50 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
              CORE · MODULO RAPPORTINO
            </span>
            <span className="text-sm font-semibold text-slate-50">
              COSTR {costr} · {crewLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-50">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-900 font-semibold">
              Stato: {statusLabel}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-400">
              Prodotto totale: {prodottoTotale.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={handleChangeRole}
              className="px-3 py-1.5 rounded-md border border-slate-400 text-slate-50 bg-slate-800 hover:bg-slate-700"
            >
              Cambia squadra
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md border border-rose-400 text-rose-50 bg-rose-600/90 hover:bg-rose-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6">
        <div
          className="bg-white text-slate-900 border border-slate-400 rounded-xl shadow-[0_18px_45px_rgba(0,0,0,0.35)] p-4 print:shadow-none print:border-black"
          style={{ opacity: 1, filter: 'none' }}
        >
          <RapportinoHeader
            costr={costr}
            commessa={commessa}
            reportDate={reportDate}
            capoName={capoName}
            onChangeCostr={setCostr}
            onChangeCommessa={setCommessa}
            onChangeDate={setReportDate}
          />

          <RapportinoTable
            rows={rows}
            onRowChange={handleRowChange}
            onRemoveRow={handleRemoveRow}
          />

          {/* Section INCA : choix des cavi + metri posati */}
          {normalizedCrewRole === 'ELETTRICISTA' && rapportinoId && (
            <div className="mt-4">
              <RapportinoIncaCaviSection
                rapportinoId={rapportinoId}
                shipCostr={costr}
                disabled={incaSectionDisabled}
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 rounded-md border border-slate-500 bg-white hover:bg-slate-100 text-slate-900"
              >
                + Aggiungi riga
              </button>

              {normalizedCrewRole === 'ELETTRICISTA' && (
                <button
                  type="button"
                  onClick={handleOpenIncaCockpit}
                  className="relative overflow-hidden px-3 py-1.5 rounded-md border border-emerald-500 bg-slate-950 text-emerald-200 hover:text-emerald-100 hover:bg-slate-900 transition-colors duration-200 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]
                  before:absolute before:inset-0 before:bg-gradient-to-r before:from-emerald-500/20 before:via-cyan-500/10 before:to-emerald-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                >
                  <span className="relative inline-flex items-center gap-1.5 uppercase tracking-[0.18em] text-[10px] font-semibold">
                    {/* pastille lumineuse */}
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                    Cockpit&nbsp;INCA
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenArchivio}
                className="px-3 py-1.5 rounded-md border border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-900"
              >
                Apri Archivio
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {saving && (
                <span className="text-slate-500">
                  Salvataggio in corso…
                </span>
              )}
              {successMessage && (
                <span className="text-emerald-700 font-semibold">
                  {successMessage}
                </span>
              )}
              {error && (
                <button
                  type="button"
                  onClick={() => setShowErrorDetails((v) => !v)}
                  className="px-2 py-1 rounded border border-red-400 text-red-700 bg-red-50 hover:bg-red-100"
                >
                  Errore salvataggio
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800"
              >
                Salva
              </button>
              <button
                type="button"
                onClick={handleValidate}
                className="px-3 py-1.5 rounded-md border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Valida giornata
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-3 py-1.5 rounded-md border border-sky-700 bg-sky-600 text-white hover:bg-sky-700"
              >
                Esporta PDF
              </button>
            </div>
          </div>

          {showErrorDetails && errorDetails && (
            <pre className="mt-3 text-[10px] bg-red-50 text-red-800 p-2 rounded border border-red-200 whitespace-pre-wrap">
              {errorDetails}
            </pre>
          )}
        </div>
      </main>

      {/* ⛔ Plus de ListaCaviPanel : le Capo passe par la section INCA + Cockpit */}
    </div>
  );
}

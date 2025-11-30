// src/components/RapportinoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import LoadingScreen from './LoadingScreen';
import ListaCaviPanel from './ListaCaviPanel';

/* ------------------------------------------------------- */
/* LABELS */
/* ------------------------------------------------------- */

const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validata dal Capo',
  APPROVED_UFFICIO: "Approvata dall'Ufficio",
  RETURNED: 'Rimandata dall’Ufficio',
};

const CREW_LABELS = {
  ELETTRICISTA: 'Elettricista',
  CARPENTERIA: 'Carpenteria',
  MONTAGGIO: 'Montaggio',
};

/* ------------------------------------------------------- */
/* UTILS */
/* ------------------------------------------------------- */

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

function getBaseRows(crewRole) {
  if (crewRole === 'ELETTRICISTA') {
    return [
      {
        id: null,
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
        id: null,
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
        id: null,
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
        id: null,
        row_index: 3,
        categoria: 'STESURA',
        descrizione: 'VARI STESURA CAVI',
        operatori: '',
        tempo: '',
        previsto: '0,2',
        prodotto: '',
        note: '',
      },
    ];
  }

  return [
    {
      id: null,
      row_index: 0,
      categoria: crewRole,
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
  ];
}

/* ------------------------------------------------------- */
/* COMPONENT */
/* ------------------------------------------------------- */

export default function RapportinoPage({
  crewRole,
  onChangeCrewRole,
  onLogout,
}) {
  const { profile } = useAuth();

  const [rapportinoId, setRapportinoId] = useState(null);
  const [reportDate, setReportDate] = useState(getTodayISO());
  const [costr, setCostr] = useState('6368');
  const [commessa, setCommessa] = useState('SDC');
  const [status, setStatus] = useState('DRAFT');

  const [rows, setRows] = useState(() => getBaseRows(crewRole));

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const [successMessage, setSuccessMessage] = useState(null);

  /* ------------------------------------------------------- */
  /* CHARGEMENT RAPPORTINO EXISTANT */
  /* ------------------------------------------------------- */

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

        const { data: rapData, error: rapError } = await supabase
          .from('rapportini')
          .select('*')
          .eq('capo_id', profile.id)
          .eq('crew_role', crewRole)
          .or(`data.eq.${reportDate},report_date.eq.${reportDate}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rapError && rapError.code !== 'PGRST116') throw rapError;

        if (!active) return;

        if (!rapData) {
          setRapportinoId(null);
          setCostr('6368');
          setCommessa('SDC');
          setStatus('DRAFT');
          setRows(getBaseRows(crewRole));
        } else {
          setRapportinoId(rapData.id);
          setCostr(rapData.costr || rapData.cost || '6368');
          setCommessa(rapData.commessa || 'SDC');
          setStatus(rapData.status || 'DRAFT');

          const { data: righe, error: righeError } = await supabase
            .from('rapportino_rows')
            .select('*')
            .eq('rapportino_id', rapData.id)
            .order('row_index', { ascending: true });

          if (righeError) throw righeError;

          if (!active) return;

          if (!righe || righe.length === 0) {
            setRows(getBaseRows(crewRole));
          } else {
            setRows(
              righe.map((r, idx) => ({
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
              }))
            );
          }
        }
      } catch (err) {
        console.error('Errore caricamento rapportino:', err);
        if (active) {
          setError(
            'Errore durante il caricamento del rapportino. Puoi comunque compilare una nuova giornata.'
          );
          setErrorDetails(err?.message || String(err));
          setRows(getBaseRows(crewRole));
        }
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
  }, [profile?.id, crewRole, reportDate]);

  /* ------------------------------------------------------- */
  /* MÉMO : PRODUIT TOTAL */
  /* ------------------------------------------------------- */

  const prodottoTotale = useMemo(() => {
    return rows.reduce((sum, r) => {
      const v = parseNumeric(r.prodotto);
      return v !== null ? sum + v : sum;
    }, 0);
  }, [rows]);

  const capoName =
    (profile?.display_name || profile?.full_name || profile?.email || '')
      .toUpperCase()
      .trim() || 'CAPO';

  /* ------------------------------------------------------- */
  /* HANDLERS LIGNES */
  /* ------------------------------------------------------- */

  const handleRowChange = (index, field, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: null,
        row_index: prev.length,
        categoria: crewRole,
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) =>
      prev.length === 1
        ? getBaseRows(crewRole)
        : prev
            .filter((_, idx) => idx !== index)
            .map((r, idx) => ({ ...r, row_index: idx }))
    );
  };

  const handleNewDay = () => {
    setRapportinoId(null);
    setStatus('DRAFT');
    setCostr('6368');
    setCommessa('SDC');
    setRows(getBaseRows(crewRole));
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setSuccessMessage(null);
    setReportDate(getTodayISO());
  };

  /* ------------------------------------------------------- */
  /* SAUVEGARDE */
  /* ------------------------------------------------------- */

  async function handleSave(nextStatus = null) {
    if (!profile?.id) return null;

    setSaving(true);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setSuccessMessage(null);

    try {
      const finalStatus = nextStatus || status;

      const headerPayload = {
        capo_id: profile.id,
        user_id: profile.id,
        capo_name: capoName,
        data: reportDate,
        report_date: reportDate,
        crew_role: crewRole,
        costr,
        cost: costr,
        commessa,
        status: finalStatus,
        prodotto_totale: prodottoTotale,
        prodotto_tot: prodottoTotale,
      };

      if (rapportinoId) headerPayload.id = rapportinoId;

      const { data: savedRap, error: saveError } = await supabase
        .from('rapportini')
        .upsert(headerPayload)
        .select('*')
        .single();

      if (saveError) throw saveError;

      const newId = savedRap.id;
      setRapportinoId(newId);

      const { error: delError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', newId);

      if (delError) throw delError;

      const rowsPayload = rows.map((r, idx) => ({
        rapportino_id: newId,
        row_index: idx,
        categoria: r.categoria || null,
        descrizione: r.descrizione || null,
        operatori: r.operatori || null,
        tempo: r.tempo || null,
        previsto: parseNumeric(r.previsto),
        prodotto: parseNumeric(r.prodotto),
        note: r.note || null,
      }));

      if (rowsPayload.length > 0) {
        const { error: insError } = await supabase
          .from('rapportino_rows')
          .insert(rowsPayload);
        if (insError) throw insError;
      }

      setSuccessMessage('Ultimo salvataggio riuscito.');
      return newId;
    } catch (err) {
      console.error('Errore salvataggio rapportino:', err);
      setError(
        'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.'
      );
      setErrorDetails(err?.message || String(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  const handleValidate = async () => {
    const savedId = await handleSave('VALIDATED_CAPO');
    if (savedId) setStatus('VALIDATED_CAPO');
  };

  const handleExportPdf = async () => {
    const savedId = await handleSave();
    if (!savedId) return;
    window.print();
  };

  /* ------------------------------------------------------- */

  if (!profile) return <LoadingScreen message="Caricamento del profilo..." />;

  if (initialLoading)
    return <LoadingScreen message="Caricamento del rapportino..." />;

  const statusLabel = STATUS_LABELS[status] || status;
  const crewLabel = CREW_LABELS[crewRole] || crewRole;

  /* ------------------------------------------------------- */
  /* RENDER — VERSION MULTIPAGE A4 */
  /* ------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* HEADER APP (no-print) */}
      <header className="border-b border-slate-300 bg-slate-900 text-slate-50 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            CORE · Modulo RAPPORTINO
          </span>
          <span className="text-sm">
            Capo squadra:{' '}
            <span className="font-semibold text-slate-50">{capoName}</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Tipo squadra:{' '}
            <span className="font-medium text-slate-100">{crewLabel}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-100 border border-slate-600">
            Stato: {statusLabel}
          </span>
          <button
            onClick={onChangeCrewRole}
            className="px-2.5 py-1 rounded border border-slate-500 text-slate-100 hover:bg-slate-800"
          >
            Cambia squadra
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-2.5 py-1 rounded border border-rose-500 text-rose-100 hover:bg-rose-600 hover:text-rose-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 flex justify-center py-4 px-2">
        <div className="rapportino-print-root shadow-md shadow-slate-300 rounded-lg w-[1120px] max-w-full print:shadow-none print:border-none">
          {/* TABLE AVEC THEAD RÉPÉTÉ */}
          <table className="w-full border-collapse rapportino-table">
            <thead>
              {/* TITRE */}
              <tr>
                <th colSpan={7} className="text-left pb-1 text-lg font-semibold">
                  RAPPORTINO GIORNALIERO
                </th>
              </tr>

              {/* NAVE / COMMESSA */}
              <tr>
                <th colSpan={4} className="text-left text-[12px] align-bottom">
                  Nave / Costruttore:&nbsp;
                  <input
                    className="border-b border-slate-400 focus:outline-none px-1"
                    value={costr}
                    onChange={(e) => setCostr(e.target.value)}
                  />
                </th>
                <th colSpan={3} className="text-right text-[12px] align-bottom">
                  Commessa:&nbsp;
                  <input
                    className="border-b border-slate-400 focus:outline-none px-1"
                    value={commessa}
                    onChange={(e) => setCommessa(e.target.value)}
                  />
                </th>
              </tr>

              {/* CAPO / DATA / SQUADRA / PRODOTTO */}
              <tr>
                <th colSpan={4} className="text-left text-[12px]">
                  Capo squadra:{' '}
                  <span className="font-semibold">{capoName}</span>
                </th>

                <th colSpan={3} className="text-right text-[12px]">
                  Data:&nbsp;
                  <input
                    type="date"
                    className="border border-slate-300 rounded px-1 py-0.5 text-[11px]"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                  <br />
                  Tipo squadra: <span className="font-medium">{crewLabel}</span>
                  &nbsp;· Prodotto totale:{' '}
                  <span className="font-mono font-semibold">
                    {prodottoTotale.toFixed(2)}
                  </span>
                </th>
              </tr>

              {/* ESPACE */}
              <tr>
                <th colSpan={7} className="h-2"></th>
              </tr>

              {/* HEADER DES COLONNES */}
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="w-28 border border-slate-300 px-2 py-1 text-left">
                  CATEGORIA
                </th>
                <th className="w-72 border border-slate-300 px-2 py-1 text-left">
                  DESCRIZIONE ATTIVITÀ
                </th>
                <th className="w-40 border border-slate-300 px-2 py-1 text-left">
                  OPERATORI
                </th>
                <th className="w-32 border border-slate-300 px-2 py-1 text-left">
                  TEMPO IMPIEGATO
                </th>
                <th className="w-24 border border-slate-300 px-2 py-1 text-right">
                  PREVISTO
                </th>
                <th className="w-24 border border-slate-300 px-2 py-1 text-right">
                  PRODOTTO
                </th>
                <th className="border border-slate-300 px-2 py-1 text-left">
                  NOTE
                </th>
              </tr>
            </thead>

            {/* ------------------------------------------- */}
            {/* LIGNES */}
            {/* ------------------------------------------- */}
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-200 align-top">
                  <td className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={r.categoria}
                      onChange={(e) =>
                        handleRowChange(idx, 'categoria', e.target.value)
                      }
                      className="w-full bg-transparent text-[12px] focus:outline-none"
                    />
                  </td>

                  <td className="border border-slate-300 px-2 py-1">
                    <textarea
                      value={r.descrizione}
                      onChange={(e) =>
                        handleRowChange(idx, 'descrizione', e.target.value)
                      }
                      className="rapportino-textarea w-full bg-transparent text-[12px] focus:outline-none"
                    />
                  </td>

                  <td className="border border-slate-300 px-2 py-1">
                    <textarea
                      value={r.operatori}
                      onChange={(e) =>
                        handleRowChange(idx, 'operatori', e.target.value)
                      }
                      className="rapportino-textarea w-full bg-transparent text-[12px] focus:outline-none"
                    />
                  </td>

                  <td className="border border-slate-300 px-2 py-1">
                    <textarea
                      value={r.tempo}
                      onChange={(e) =>
                        handleRowChange(idx, 'tempo', e.target.value)
                      }
                      className="rapportino-textarea w-full bg-transparent text-[12px] focus:outline-none"
                    />
                  </td>

                  <td className="border border-slate-300 px-2 py-1 text-right">
                    <input
                      type="text"
                      value={r.previsto}
                      onChange={(e) =>
                        handleRowChange(idx, 'previsto', e.target.value)
                      }
                      className="w-full bg-transparent text-right text-[12px] focus:outline-none"
                    />
                  </td>

                  <td className="border border-slate-300 px-2 py-1 text-right">
                    <input
                      type="text"
                      value={r.prodotto}
                      onChange={(e) =>
                        handleRowChange(idx, 'prodotto', e.target.value)
                      }
                      className="w-full bg-transparent text-right text-[12px] focus:outline-none"
                    />
                  </td>

                  <td className="border border-slate-300 px-2 py-1 relative">
                    <textarea
                      value={r.note}
                      onChange={(e) =>
                        handleRowChange(idx, 'note', e.target.value)
                      }
                      className="rapportino-textarea w-full bg-transparent text-[12px] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="no-print absolute -right-2 top-1 text-xs text-slate-400 hover:text-rose-600"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ------------------------------------------- */}
          {/* FOOTER BOUTONS — no print */}
          {/* ------------------------------------------- */}
          <div className="mt-3 flex flex-col gap-2 no-print">
            {error && (
              <div className="text-[12px] text-amber-900 bg-amber-100 border border-amber-300 rounded px-3 py-2">
                <div className="font-semibold mb-1">Attenzione</div>
                <div>{error}</div>
                {errorDetails && (
                  <button
                    type="button"
                    onClick={() => setShowErrorDetails((v) => !v)}
                    className="mt-1 text-[11px] underline text-amber-800"
                  >
                    {showErrorDetails
                      ? 'Nascondi dettagli tecnici'
                      : 'Mostra dettagli tecnici'}
                  </button>
                )}
                {showErrorDetails && (
                  <pre className="mt-1 text-[10px] bg-amber-50 border border-amber-200 rounded px-2 py-1 whitespace-pre-wrap">
                    {errorDetails}
                  </pre>
                )}
              </div>
            )}

            {successMessage && (
              <div className="text-[12px] text-emerald-900 bg-emerald-100 border border-emerald-300 rounded px-3 py-2">
                {successMessage}
              </div>
            )}

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <button
                  type="button"
                  onClick={handleNewDay}
                  className="px-3 py-1.5 rounded-md border border-slate-400 text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Nuova giornata
                </button>

                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 rounded-md border border-slate-400 text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  + Aggiungi riga
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving}
                  className={`px-3 py-1.5 rounded-md border text-slate-50 ${
                    saving
                      ? 'bg-slate-500 border-slate-500 cursor-wait'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {saving ? 'Salvataggio…' : 'Salva rapportino'}
                </button>

                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-md border border-emerald-600 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  Valida giornata
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-md border border-sky-600 bg-sky-500 text-slate-950 hover:bg-sky-400"
                >
                  Esporta PDF
                </button>
              </div>
            </div>
          </div>

          {/* LISTA CAVI — pas imprimée */}
          {crewRole === 'ELETTRICISTA' && (
            <div className="mt-4 no-print">
              <ListaCaviPanel rapportinoId={rapportinoId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

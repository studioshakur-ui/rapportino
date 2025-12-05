// src/components/RapportinoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import LoadingScreen from './LoadingScreen';
import ListaCaviPanel from './ListaCaviPanel';

// Libellés de statut
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

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

// "150" -> 150, "0,2" -> 0.2, "" -> null
function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

/**
 * Modèle ELECTTRICISTA pour 6368 (SDC – militaire)
 * (ancienne croisière, mais on utilise maintenant le layout 6358 partout)
 */
const MODEL_ELETTRICISTA_6368 = [
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

/**
 * Modèle ELECTTRICISTA pour 6358 (DE-ICNG – ton papier)
 */
const MODEL_ELETTRICISTA_6358 = [
  {
    id: null,
    row_index: 0,
    categoria: 'STESURA',
    descrizione: 'STESURA CAVI (3X6)',
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
    descrizione: 'SISTEMAZIONE CAVI (3X6)',
    operatori: '',
    tempo: '',
    previsto: '10,0',
    prodotto: '',
    note: '',
  },
  {
    id: null,
    row_index: 4,
    categoria: 'GESTIONE E VARIE',
    descrizione: 'VARI STESURA',
    operatori: '',
    tempo: '',
    previsto: '0,2',
    prodotto: '',
    note: '',
  },
];

/**
 * Patch demandé : on utilise pour l’instant
 * le modèle 6358 même quand on est sur COSTR 6368.
 */
const MODEL_BY_COSTR = {
  '6368': MODEL_ELETTRICISTA_6358, // ⚠️ patch temporaire
  '6358': MODEL_ELETTRICISTA_6358,
};

function cloneRows(template) {
  return template.map((r) => ({ ...r }));
}

function getBaseRows(crewRole, costr) {
  // ELECTTRICISTA – dépend du COSTR
  if (crewRole === 'ELETTRICISTA') {
    const tpl = MODEL_BY_COSTR[costr] || MODEL_ELETTRICISTA_6368;
    return cloneRows(tpl);
  }

  // CARPENTERIA
  if (crewRole === 'CARPENTERIA') {
    return [
      {
        id: null,
        row_index: 0,
        categoria: 'CARPENTERIA',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ];
  }

  // MONTAGGIO
  if (crewRole === 'MONTAGGIO') {
    return [
      {
        id: null,
        row_index: 0,
        categoria: 'MONTAGGIO',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ];
  }

  // fallback
  return [
    {
      id: null,
      row_index: 0,
      categoria: '',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
  ];
}

// Ajuste la hauteur OPERATORE / TEMPO pour une ligne
function adjustOperatorTempoHeights(textareaEl) {
  if (!textareaEl) return;
  const tr = textareaEl.closest('tr');
  if (!tr) return;
  const tAreas = tr.querySelectorAll('textarea[data-optempo="1"]');
  if (!tAreas.length) return;

  let max = 0;
  tAreas.forEach((ta) => {
    ta.style.height = 'auto';
    const h = ta.scrollHeight;
    if (h > max) max = h;
  });

  tAreas.forEach((ta) => {
    ta.style.height = `${max}px`;
  });
}

export default function RapportinoPage({
  crewRole,
  onChangeCrewRole,
  onLogout,
  initialCostr,
}) {
  const { profile } = useAuth();

  // COSTR / header
  const [costr, setCostr] = useState(initialCostr || '6368');
  const [commessa, setCommessa] = useState('SDC');
  const [reportDate, setReportDate] = useState(getTodayISO());
  const [status, setStatus] = useState('DRAFT');

  const [rapportinoId, setRapportinoId] = useState(null);

  const [rows, setRows] = useState(() =>
    getBaseRows(crewRole, initialCostr || '6368'),
  );

  // états UI
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // charge rapportino existant selon capo / crew / date
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
          .eq('report_date', reportDate)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rapError && rapError.code !== 'PGRST116') {
          throw rapError;
        }

        if (!active) return;

        if (!rapData) {
          // aucun rapportino → modèle de base
          setRapportinoId(null);
          setStatus('DRAFT');
          setRows(getBaseRows(crewRole, costr));
        } else {
          setRapportinoId(rapData.id);
          setStatus(rapData.status || 'DRAFT');
          setCostr(rapData.costr || rapData.cost || costr);
          setCommessa(rapData.commessa || commessa);

          const { data: righe, error: righeError } = await supabase
            .from('rapportino_rows')
            .select('*')
            .eq('rapportino_id', rapData.id)
            .order('row_index', { ascending: true });

          if (righeError) throw righeError;
          if (!active) return;

          if (!righe || righe.length === 0) {
            setRows(getBaseRows(crewRole, rapData.costr || costr));
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
        if (active) {
          setError(
            'Errore durante il caricamento del rapportino. Puoi comunque compilare una nuova giornata.',
          );
          setErrorDetails(err?.message || String(err));
          setRows(getBaseRows(crewRole, costr));
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
  }, [profile?.id, crewRole, reportDate, costr, commessa]);

  const prodottoTotale = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const v = parseNumeric(r.prodotto);
        if (v === null) return sum;
        return sum + v;
      }, 0),
    [rows],
  );

  const capoName =
    (profile?.display_name || profile?.full_name || profile?.email || '')
      .toUpperCase()
      .trim() || 'CAPO';

  const statusLabel = STATUS_LABELS[status] || status;
  const crewLabel = CREW_LABELS[crewRole] || crewRole;

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
      return [
        ...prev,
        {
          id: null,
          row_index: nextIndex,
          categoria:
            crewRole === 'ELETTRICISTA'
              ? 'STESURA'
              : crewRole === 'CARPENTERIA'
              ? 'CARPENTERIA'
              : crewRole === 'MONTAGGIO'
              ? 'MONTAGGIO'
              : '',
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
        return getBaseRows(crewRole, costr);
      }
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.map((r, idx) => ({ ...r, row_index: idx }));
    });
  };

  const handleNewDay = () => {
    setRapportinoId(null);
    setStatus('DRAFT');
    setRows(getBaseRows(crewRole, costr));
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setSuccessMessage(null);
    setReportDate(getTodayISO());
  };

  async function handleSave(nextStatus = null) {
    if (!profile?.id) return null;

    setSaving(true);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setSuccessMessage(null);

    try {
      const finalStatus = nextStatus || status || 'DRAFT';
      const prodottoTot = prodottoTotale;

      const headerPayload = {
        id: rapportinoId || undefined,
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
        prodotto_totale: prodottoTot,
        prodotto_tot: prodottoTot,
      };

      // ✅ Fix duplicate key: onConflict utilise (user_id, crew_role, report_date)
      const { data: savedRap, error: saveError } = await supabase
        .from('rapportini')
        .upsert(headerPayload, {
          onConflict: 'user_id,crew_role,report_date',
        })
        .select('*')
        .single();

      if (saveError) throw saveError;

      const newId = savedRap.id;
      setRapportinoId(newId);
      setStatus(savedRap.status || finalStatus);

      // On remplace toutes les lignes du jour
      const { error: delError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', newId);

      if (delError) throw delError;

      const rowsPayload = rows.map((r, idx) => ({
        rapportino_id: newId,
        row_index: r.row_index ?? idx,
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

      setSuccessMessage(
        'Ultimo salvataggio riuscito. Puoi continuare a compilare o esportare il PDF.',
      );
      return newId;
    } catch (err) {
      console.error('Errore salvataggio rapportino:', err);
      setError(
        'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.',
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
    // Impression / export PDF natif navigateur
    window.print();
  };

  const handleArchivioClick = () => {
    alert('Archivio non ancora implementato in questa versione.');
  };

  if (!profile) {
    return <LoadingScreen message="Caricamento del profilo..." />;
  }

  if (initialLoading || loading) {
    return <LoadingScreen message="Caricamento del rapportino..." />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Header non imprimé */}
      <header className="border-b border-slate-300 bg-slate-900 text-slate-50 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            CORE · Modulo RAPPORTINO · COSTR {costr}
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
            type="button"
            onClick={onChangeCrewRole}
            className="px-2.5 py-1 rounded border border-slate-500 text-slate-100 hover:bg-slate-800"
          >
            Cambia squadra
          </button>
          <button
            type="button"
            onClick={handleArchivioClick}
            className="px-2.5 py-1 rounded border border-slate-500 text-slate-100 hover:bg-slate-800"
          >
            Archivio
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

      {/* Zone imprimable */}
      <main className="flex-1 flex justify-center py-4 px-2">
        <div className="bg-white shadow-md shadow-slate-300 rounded-lg w-[1120px] max-w-full px-6 py-4 print:shadow-none print:border-none">
          {/* bandeau état + produit total (écran seulement) */}
          <div className="flex items-center justify-between mb-2 no-print text-[12px] text-slate-600">
            <div>
              CORE · Rapportino ·{' '}
              <span className="font-semibold">{crewLabel}</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                Prodotto totale:{' '}
                <span className="font-mono font-semibold">
                  {prodottoTotale.toFixed(2)}
                </span>
              </div>
              <div>
                Stato:{' '}
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-300">
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          {/* HEADER version papier */}
          <div className="mb-3">
            <div className="text-center text-[16px] font-semibold mb-3 tracking-wide">
              RAPPORTINO GIORNALIERO
            </div>

            <div className="mb-1">
              <span className="font-semibold mr-2">COSTR.:</span>
              <input
                type="text"
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
                className="inline-block w-28 border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1"
              />
            </div>

            <div className="grid grid-cols-[1fr_0.9fr_1fr] items-center gap-2">
              <div>
                <span className="font-semibold mr-2">Commessa:</span>
                <input
                  type="text"
                  value={commessa}
                  onChange={(e) => setCommessa(e.target.value)}
                  className="inline-block w-32 border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1"
                />
              </div>

              <div className="pl-4">
                <span className="font-semibold mr-2">Capo Squadra:</span>
                <span className="px-1">{capoName}</span>
              </div>

              <div className="text-right">
                <span className="font-semibold mr-2">DATA:</span>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* TABLE principale */}
          <div className="border border-slate-300 rounded-md overflow-hidden">
            <table className="w-full border-collapse text-[12px]">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="w-28 border-r border-slate-300 px-2 py-1 text-left uppercase tracking-[0.08em] text-[11px] text-slate-700">
                    CATEGORIA
                  </th>
                  <th className="w-72 border-r border-slate-300 px-2 py-1 text-left uppercase tracking-[0.08em] text-[11px] text-slate-700">
                    DESCRIZIONE ATTIVITÀ
                  </th>
                  <th className="w-40 border-r border-slate-300 px-2 py-1 text-left uppercase tracking-[0.08em] text-[11px] text-slate-700">
                    OPERATORE
                  </th>
                  <th className="w-32 border-r border-slate-300 px-2 py-1 text-left uppercase tracking-[0.08em] text-[11px] text-slate-700">
                    TEMPO IMPIEGATO
                    <span className="ml-1 text-[9px] font-normal text-slate-500">
                      (ORE)
                    </span>
                  </th>
                  <th className="w-24 border-r border-slate-300 px-2 py-1 text-right uppercase tracking-[0.08em] text-[11px] text-slate-700">
                    PREVISTO
                  </th>
                  <th className="w-24 border-r border-slate-300 px-2 py-1 text-right uppercase tracking-[0.08em] text-[11px] text-slate-700">
                    PRODOTTO
                    <span className="ml-1 text-[9px] font-normal text-slate-500">
                      (MT)
                    </span>
                  </th>
                  <th className="px-2 py-1 text-left uppercase tracking-[0.08em] text-[11px] text-slate-700">
                    NOTE
                  </th>
                  <th className="px-2 py-1 text-xs w-6 no-print border-l border-slate-300" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-t border-slate-200 align-top">
                    <td className="border-r border-slate-200 px-2 py-1">
                      <input
                        type="text"
                        value={r.categoria}
                        onChange={(e) =>
                          handleRowChange(idx, 'categoria', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] focus:outline-none"
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1">
                      <textarea
                        value={r.descrizione}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            'descrizione',
                            e.target.value,
                          )
                        }
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none"
                        rows={3}
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1">
                      <textarea
                        data-optempo="1"
                        value={r.operatori}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            'operatori',
                            e.target.value,
                            e.target,
                          )
                        }
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none rapportino-textarea"
                        rows={3}
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1">
                      <textarea
                        data-optempo="1"
                        value={r.tempo}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            'tempo',
                            e.target.value,
                            e.target,
                          )
                        }
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none text-left rapportino-textarea"
                        rows={3}
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1 text-right">
                      <input
                        type="text"
                        value={r.previsto}
                        onChange={(e) =>
                          handleRowChange(idx, 'previsto', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] text-right focus:outline-none"
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1 text-right">
                      <input
                        type="text"
                        value={r.prodotto}
                        onChange={(e) =>
                          handleRowChange(idx, 'prodotto', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] text-right focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1 relative">
                      <textarea
                        value={r.note}
                        onChange={(e) =>
                          handleRowChange(idx, 'note', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none"
                        rows={3}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="no-print absolute -right-2 top-1 text-xs text-slate-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </td>
                    <td className="px-2 py-1 text-center no-print" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer actions (non imprimé) */}
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
                {showErrorDetails && errorDetails && (
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

          {/* Lista Cavi – seulement pour ELETTRICISTA (non imprimé) */}
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

// src/components/RapportinoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import LoadingScreen from './LoadingScreen';
import ListaCaviPanel from './ListaCaviPanel';

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

// Ajuste automatiquement la hauteur OPERATORE / TEMPO pour une ligne
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
    ta.style.height = max + 'px';
  });
}

export default function RapportinoPage({
  crewRole,
  onChangeCrewRole,
  onLogout,
}) {
  const { profile } = useAuth();

  const [rapportinoId, setRapportinoId] = useState(null);
  const [reportDate, setReportDate] = useState(getTodayISO());

  // IMPORTANT : costr est maintenant partie de la clé (navire)
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

  // Charger le rapportino existant (si présent)
  // Clé logique : CAPO + DATA + SQUADRA + COSTR
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

        let query = supabase
          .from('rapportini')
          .select('*')
          .eq('capo_id', profile.id)
          .eq('crew_role', crewRole)
          .or(`data.eq.${reportDate},report_date.eq.${reportDate}`);

        // Filtre par COSTR : on veut séparer 6368 / 6358
        if (costr) {
          query = query.eq('costr', costr);
        }

        const { data: rapData, error: rapError } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rapError && rapError.code !== 'PGRST116') {
          throw rapError;
        }

        if (!active) return;

        if (!rapData) {
          // Aucun rapportino pour cette combinaison → feuille vierge
          setRapportinoId(null);
          setStatus('DRAFT');
          setRows(getBaseRows(crewRole));
          // On NE touche PAS à costr/commessa : on garde le choix de l’utilisateur
        } else {
          setRapportinoId(rapData.id);
          setCostr(rapData.costr || rapData.cost || costr || ''); // sécurités
          setCommessa(rapData.commessa || commessa || 'SDC');
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
  }, [profile?.id, crewRole, reportDate, costr]);

  const prodottoTotale = useMemo(() => {
    return rows.reduce((sum, r) => {
      const v = parseNumeric(r.prodotto);
      if (v === null) return sum;
      return sum + v;
    }, 0);
  }, [rows]);

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
        return getBaseRows(crewRole);
      }
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.map((r, idx) => ({ ...r, row_index: idx }));
    });
  };

  const handleNewDay = () => {
    setRapportinoId(null);
    setStatus('DRAFT');
    // On garde le COSTR et la commessa tapés par le capo
    setRows(getBaseRows(crewRole));
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

      if (rapportinoId) {
        headerPayload.id = rapportinoId;
      }

      const { data: savedRap, error: saveError } = await supabase
        .from('rapportini')
        .upsert(headerPayload)
        .select('*')
        .single();

      if (saveError) throw saveError;

      const newId = savedRap.id;
      setRapportinoId(newId);
      setStatus(savedRap.status || finalStatus);

      const { error: delError } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', newId);

      if (delError) throw delError;

      const rowsPayload = rows.map((r, idx) => {
        const previstoNum = parseNumeric(r.previsto);
        const prodottoNum = parseNumeric(r.prodotto);
        return {
          rapportino_id: newId,
          row_index: r.row_index ?? idx,
          categoria: r.categoria || null,
          descrizione: r.descrizione || null,
          operatori: r.operatori || null,
          tempo: r.tempo || null,
          previsto: previstoNum,
          prodotto: prodottoNum,
          note: r.note || null,
        };
      });

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
    if (savedId) {
      setStatus('VALIDATED_CAPO');
    }
  };

  const handleExportPdf = async () => {
    const savedId = await handleSave();
    if (!savedId) {
      return;
    }
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

  // Couleur de bordure du cadre selon lo stato
  const frameBorderClass =
    status === 'APPROVED_UFFICIO'
      ? 'border-emerald-400'
      : status === 'VALIDATED_CAPO'
      ? 'border-amber-300'
      : status === 'RETURNED'
      ? 'border-rose-400'
      : 'border-amber-300';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Header principale (non imprimé) */}
      <header className="border-b border-slate-300 bg-slate-900 text-slate-50 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            CORE · Modulo RAPPORTINO · COSTR {costr || '—'}
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

      {/* Contenu imprimable */}
      <main className="flex-1 flex justify-center py-4 px-2">
        <div
          className={`bg-white shadow-md shadow-slate-300 rounded-lg w-[1120px] max-w-full px-6 py-4 print:shadow-none print:border-none border-l-4 border-r-4 ${frameBorderClass}`}
        >
          {/* Bandeau stato & prodotto total – écran uniquement */}
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

          {/* === HEADER VERSION PAPIER === */}
          <div className="mb-3">
            {/* Ligne 1 : titre centré */}
            <div className="text-center text-[16px] font-semibold mb-3 tracking-wide">
              RAPPORTINO GIORNALIERO
            </div>

            {/* Ligne 2 : COSTR */}
            <div className="mb-1">
              <span className="font-semibold mr-2">COSTR.:</span>
              <input
                type="text"
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
                className="inline-block w-28 border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1"
              />
            </div>

            {/* Ligne 3 : Commessa / Capo Squadra / DATA */}
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

          {/* Table principale */}
          <div className="border border-slate-300 rounded-md overflow-hidden">
            <table className="w-full border-collapse text-[12px]">
              <thead className="bg-slate-100 border-b-2 border-slate-300">
                <tr>
                  <th className="w-28 border-r border-slate-300 px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                    Categoria
                  </th>
                  <th className="w-72 border-r border-slate-300 px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                    Descrizione attività
                  </th>
                  <th className="w-40 border-r border-slate-300 px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                    Operatore
                  </th>
                  <th className="w-32 border-r border-slate-300 px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                    Tempo impiegato
                    <span className="block text-[10px] font-normal text-slate-500">
                      (ore)
                    </span>
                  </th>
                  <th className="w-24 border-r border-slate-300 px-2 py-2 text-right text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                    Previsto
                  </th>
                  <th className="w-24 border-r border-slate-300 px-2 py-2 text-right text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                    Prodotto
                    <span className="block text-[10px] font-normal text-slate-500">
                      (mt)
                    </span>
                  </th>
                  <th className="border-slate-300 px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                    Note
                  </th>
                  <th className="border-slate-300 px-2 py-2 text-xs w-6 no-print" />
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

                    {/* OPERATORE */}
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

                    {/* TEMPO IMPIEGATO */}
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
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none rapportino-textarea"
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

          {/* Footer feuille / actions (non imprimé) */}
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

          {/* Lista Cavi – uniquement pour ELETTRICISTA (non imprimée) */}
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

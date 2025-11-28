// src/components/RapportinoSheet.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';

// Libellés pour les crew_role
const CREW_LABELS = {
  ELETTRICISTA: 'Elettricista',
  CARPENTERIA: 'Carpenteria',
  MONTAGGIO: 'Montaggio',
};

// Statuts
const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validato Capo',
  APPROVED_UFFICIO: 'Approvato Ufficio',
  RETURNED: 'Rimandato',
};

const STATUS_BADGE_CLASSES = {
  DRAFT: 'bg-amber-100 text-amber-800 border border-amber-300',
  VALIDATED_CAPO: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  APPROVED_UFFICIO: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  RETURNED: 'bg-red-100 text-red-800 border border-red-300',
};

// Templates de lignes par tipo squadra
const TEMPLATE_ROWS = {
  ELETTRICISTA: [
    { categoria: 'STESURA', descrizione: 'STESURA' },
    { categoria: 'STESURA', descrizione: 'FASCETTATURA CAVI' },
    { categoria: 'STESURA', descrizione: 'RIPRESA CAVI' },
    { categoria: 'STESURA', descrizione: 'VARI STESURA CAVI' },
  ],
  CARPENTERIA: [
    { categoria: 'CARPENTERIA', descrizione: '' },
    { categoria: 'CARPENTERIA', descrizione: '' },
    { categoria: 'CARPENTERIA', descrizione: '' },
    { categoria: 'CARPENTERIA', descrizione: '' },
  ],
  MONTAGGIO: [
    { categoria: 'MONTAGGIO', descrizione: '' },
    { categoria: 'MONTAGGIO', descrizione: '' },
    { categoria: 'MONTAGGIO', descrizione: '' },
    { categoria: 'MONTAGGIO', descrizione: '' },
  ],
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const normalizeDateInput = (value) => {
  if (!value) return todayIso();
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

export default function RapportinoSheet({ crewRole }) {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const [rapportinoId, setRapportinoId] = useState(null);
  const [dataGiorno, setDataGiorno] = useState(todayIso());
  const [costr, setCostr] = useState('');
  const [commessa, setCommessa] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [prodottoTotale, setProdottoTotale] = useState(0);

  const [rows, setRows] = useState([]);
  const [archivioOpen, setArchivioOpen] = useState(false);
  const [archivioLoading, setArchivioLoading] = useState(false);
  const [archivioItems, setArchivioItems] = useState([]);

  const rapportinoRef = useRef(null);

  const capoName = useMemo(() => {
    // On force en MAJ si possible
    if (profile?.display_name) return profile.display_name.toUpperCase();
    if (profile?.full_name) return profile.full_name.toUpperCase();
    if (profile?.email) return profile.email.split('@')[0].toUpperCase();
    return 'CAPO';
  }, [profile]);

  const crewLabel = CREW_LABELS[crewRole] ?? crewRole;

  // Recalcul du produit total
  useEffect(() => {
    const tot = rows.reduce((acc, r) => {
      const val = parseFloat(String(r.prodotto ?? '').replace(',', '.'));
      if (Number.isNaN(val)) return acc;
      return acc + val;
    }, 0);
    setProdottoTotale(tot);
  }, [rows]);

  // Chargement initial / changement de squadra
  useEffect(() => {
    if (!profile?.id || !crewRole) return;
    setError(null);
    setInfo(null);
    loadOrCreateRapportino(todayIso());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, crewRole]);

  /**
   * Charge un rapportino pour une date donnée s'il existe,
   * sinon initialise depuis le template + defaults profil.
   */
  const loadOrCreateRapportino = async (dateIso) => {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      // 1) Chercher un rapportino existant pour ce capo + crew + date
      const { data: rap, error: rapErr } = await supabase
        .from('rapportini')
        .select('id, data, costr, commessa, status, prodotto_totale')
        .eq('capo_id', profile.id)
        .eq('crew_role', crewRole)
        .eq('data', dateIso)
        .maybeSingle();

      if (rapErr) throw rapErr;

      if (rap) {
        // Rapportino trouvé → charger aussi les lignes
        setRapportinoId(rap.id);
        setDataGiorno(normalizeDateInput(rap.data));
        setCostr(rap.costr ?? '');
        setCommessa(rap.commessa ?? '');
        setStatus(rap.status ?? 'DRAFT');
        setProdottoTotale(rap.prodotto_totale ?? 0);

        const { data: rowData, error: rowErr } = await supabase
          .from('rapportino_rows')
          .select(
            'id, row_index, categoria, descrizione, operatori, tempo, previsto, prodotto, note'
          )
          .eq('rapportino_id', rap.id)
          .order('row_index', { ascending: true });

        if (rowErr) throw rowErr;

        setRows(
          (rowData ?? []).map((r) => ({
            id: r.id,
            categoria: r.categoria ?? '',
            descrizione: r.descrizione ?? '',
            operatori: r.operatori ?? '',
            tempo: r.tempo ?? '',
            previsto: r.previsto ?? '',
            prodotto: r.prodotto ?? '',
            note: r.note ?? '',
          }))
        );
      } else {
        // Aucun rapportino → initialiser depuis template + defaults profil
        const defaultCostr = profile?.default_costr ?? '6368';
        const defaultCommessa = profile?.default_commessa ?? 'SDC';

        setRapportinoId(null);
        setDataGiorno(dateIso);
        setCostr(defaultCostr);
        setCommessa(defaultCommessa);
        setStatus('DRAFT');
        setProdottoTotale(0);

        const template = TEMPLATE_ROWS[crewRole] ?? [];
        setRows(
          template.map((t) => ({
            id: null,
            categoria: t.categoria ?? '',
            descrizione: t.descrizione ?? '',
            operatori: '',
            tempo: '',
            previsto: '',
            prodotto: '',
            note: '',
          }))
        );
      }
    } catch (e) {
      console.error('Errore caricamento rapportino:', e);
      setError(
        'Errore durante il caricamento del rapportino. Puoi comunque continuare a scrivere.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charge un rapportino précis depuis l'Archivio (par id).
   */
  const loadRapportinoById = async (id) => {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const { data: rap, error: rapErr } = await supabase
        .from('rapportini')
        .select('id, data, costr, commessa, status, prodotto_totale, crew_role')
        .eq('id', id)
        .single();

      if (rapErr) throw rapErr;

      // Juste au cas où on sélectionnerait un rapport d'une autre squadra
      if (rap.crew_role && rap.crew_role !== crewRole) {
        setError('Questo rapportino appartiene ad un altro tipo squadra.');
        return;
      }

      setRapportinoId(rap.id);
      setDataGiorno(normalizeDateInput(rap.data));
      setCostr(rap.costr ?? '');
      setCommessa(rap.commessa ?? '');
      setStatus(rap.status ?? 'DRAFT');
      setProdottoTotale(rap.prodotto_totale ?? 0);

      const { data: rowData, error: rowErr } = await supabase
        .from('rapportino_rows')
        .select(
          'id, row_index, categoria, descrizione, operatori, tempo, previsto, prodotto, note'
        )
        .eq('rapportino_id', rap.id)
        .order('row_index', { ascending: true });

      if (rowErr) throw rowErr;

      setRows(
        (rowData ?? []).map((r) => ({
          id: r.id,
          categoria: r.categoria ?? '',
          descrizione: r.descrizione ?? '',
          operatori: r.operatori ?? '',
          tempo: r.tempo ?? '',
          previsto: r.previsto ?? '',
          prodotto: r.prodotto ?? '',
          note: r.note ?? '',
        }))
      );
    } catch (e) {
      console.error('Errore caricamento archivio:', e);
      setError(
        'Errore durante il caricamento dal archivio. Puoi comunque continuare a scrivere.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sauvegarde du rapportino (status paramétrable).
   */
  const handleSave = async (overrideStatus) => {
    if (!profile?.id) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    const statusToSave = overrideStatus || status || 'DRAFT';

    try {
      // 1) Upsert rapportino
      const { data: upserted, error: upErr } = await supabase
        .from('rapportini')
        .upsert(
          {
            id: rapportinoId ?? undefined,
            capo_id: profile.id,
            crew_role: crewRole,
            data: dataGiorno,
            costr: costr || null,
            commessa: commessa || null,
            status: statusToSave,
            prodotto_totale: prodottoTotale,
          },
          {
            onConflict: 'capo_id, data, crew_role',
          }
        )
        .select('id')
        .single();

      if (upErr) throw upErr;

      const currentId = upserted.id;
      setRapportinoId(currentId);
      setStatus(statusToSave);

      // 2) Réécrire toutes les lignes
      const { error: delErr } = await supabase
        .from('rapportino_rows')
        .delete()
        .eq('rapportino_id', currentId);

      if (delErr) throw delErr;

      const rowsToInsert = rows.map((r, index) => ({
        rapportino_id: currentId,
        row_index: index,
        categoria: r.categoria || null,
        descrizione: r.descrizione || null,
        operatori: r.operatori || null,
        tempo: r.tempo || null,
        previsto: r.previsto || null,
        prodotto: r.prodotto || null,
        note: r.note || null,
      }));

      if (rowsToInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('rapportino_rows')
          .insert(rowsToInsert);

        if (insErr) throw insErr;
      }

      // 3) Mettre à jour les defaults profil (COSTR / Commessa)
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          default_costr: costr || null,
          default_commessa: commessa || null,
        })
        .eq('id', profile.id);

      if (profErr) {
        console.warn('Impossibile aggiornare defaults profilo:', profErr);
      }

      setInfo('Rapportino salvato correttamente.');
    } catch (e) {
      console.error('Errore salvataggio rapportino:', e);
      setError(
        'Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    await handleSave('VALIDATED_CAPO');
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: null,
        categoria: '',
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
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handleNuovaGiornata = () => {
    const oggi = todayIso();
    setDataGiorno(oggi);
    loadOrCreateRapportino(oggi);
  };

  /**
   * Chargement de l'Archivio pour cette squadra.
   */
  const openArchivio = async () => {
    if (!profile?.id) return;
    setArchivioOpen(true);
    setArchivioLoading(true);
    setArchivioItems([]);
    setError(null);
    setInfo(null);

    try {
      const { data, error: archErr } = await supabase
        .from('rapportini')
        .select('id, data, costr, commessa, status, prodotto_totale')
        .eq('capo_id', profile.id)
        .eq('crew_role', crewRole)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (archErr) throw archErr;

      setArchivioItems(data ?? []);
    } catch (e) {
      console.error('Errore caricamento archivio:', e);
      setError('Errore durante il caricamento dell’archivio.');
    } finally {
      setArchivioLoading(false);
    }
  };

  const closeArchivio = () => {
    setArchivioOpen(false);
  };

  const handleSelectFromArchivio = async (item) => {
    closeArchivio();
    await loadRapportinoById(item.id);
  };

  return (
    <div className="mt-6">
      {/* Carte principale du rapportino */}
      <div
        ref={rapportinoRef}
        className="rapportino-table bg-white shadow-md rounded-lg px-8 py-6 max-w-5xl mx-auto"
      >
        {/* En-tête style papier */}
        <div className="flex justify-between items-start mb-4">
          <div className="text-sm space-y-2">
            <div>
              <span className="font-semibold mr-1">COSTR.:</span>
              <input
                type="text"
                className="border-b border-slate-400 focus:outline-none px-2 py-0.5 min-w-[80px]"
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold mr-1">Commessa:</span>
              <input
                type="text"
                className="border-b border-slate-400 focus:outline-none px-2 py-0.5 min-w-[80px]"
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold mr-1">Capo Squadra:</span>
              <span className="uppercase">{capoName}</span>
            </div>
          </div>

          <div className="text-center">
            <div className="font-semibold">
              Rapportino Giornaliero – {crewLabel.toUpperCase()}
            </div>
          </div>

          <div className="text-sm text-right space-y-2">
            <div>
              <span className="font-semibold mr-1">Data:</span>
              <input
                type="date"
                className="border border-slate-300 rounded px-2 py-1 text-sm"
                value={dataGiorno}
                onChange={(e) => setDataGiorno(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="font-semibold">Stato:</span>
              <span
                className={
                  'text-xs px-3 py-1 rounded-full ' +
                  (STATUS_BADGE_CLASSES[status] ??
                    'bg-slate-100 text-slate-700 border border-slate-300')
                }
              >
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
          </div>
        </div>

        {/* Tableau des activités */}
        <div className="border border-slate-400">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="bg-slate-100 text-center">
                <th className="rapportino-header-border px-2 py-2 w-[10%]">
                  CATEGORIA
                </th>
                <th className="rapportino-header-border px-2 py-2 w-[18%]">
                  DESCRIZIONE ATTIVITA&apos;
                </th>
                <th className="rapportino-header-border px-2 py-2 w-[18%]">
                  OPERATORE
                </th>
                <th className="rapportino-header-border px-2 py-2 w-[18%]">
                  Tempo impiegato
                </th>
                <th className="rapportino-header-border px-2 py-2 w-[10%]">
                  PREVISTO
                </th>
                <th className="rapportino-header-border px-2 py-2 w-[10%]">
                  PRODOTTO
                </th>
                <th className="rapportino-header-border px-2 py-2 w-[16%]">
                  NOTE
                </th>
                <th className="rapportino-header-border px-2 py-2 w-[4%]">
                  -
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="align-top">
                  <td className="rapportino-border px-2 py-1">
                    <textarea
                      className="w-full resize-none leading-snug focus:outline-none"
                      rows={Math.max(2, (row.categoria || '').split('\n').length)}
                      value={row.categoria}
                      onChange={(e) =>
                        handleRowChange(index, 'categoria', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border px-2 py-1">
                    <textarea
                      className="w-full resize-none leading-snug focus:outline-none"
                      rows={Math.max(
                        2,
                        (row.descrizione || '').split('\n').length
                      )}
                      value={row.descrizione}
                      onChange={(e) =>
                        handleRowChange(index, 'descrizione', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border px-2 py-1">
                    <textarea
                      className="w-full resize-none leading-snug focus:outline-none"
                      rows={Math.max(
                        2,
                        (row.operatori || '').split('\n').length
                      )}
                      placeholder="Una riga per operatore"
                      value={row.operatori}
                      onChange={(e) =>
                        handleRowChange(index, 'operatori', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border px-2 py-1">
                    <textarea
                      className="w-full resize-none leading-snug focus:outline-none"
                      rows={Math.max(2, (row.tempo || '').split('\n').length)}
                      placeholder="Stesse righe degli operatori"
                      value={row.tempo}
                      onChange={(e) =>
                        handleRowChange(index, 'tempo', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border px-2 py-1 text-center">
                    <input
                      className="w-full text-center focus:outline-none"
                      value={row.previsto ?? ''}
                      onChange={(e) =>
                        handleRowChange(index, 'previsto', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border px-2 py-1 text-center">
                    <input
                      className="w-full text-center focus:outline-none"
                      value={row.prodotto ?? ''}
                      onChange={(e) =>
                        handleRowChange(index, 'prodotto', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border px-2 py-1">
                    <textarea
                      className="w-full resize-none leading-snug focus:outline-none"
                      rows={Math.max(2, (row.note || '').split('\n').length)}
                      value={row.note ?? ''}
                      onChange={(e) =>
                        handleRowChange(index, 'note', e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bas de page : actions + total */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNuovaGiornata}
              className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
            >
              Nuova giornata
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
            >
              + Aggiungi riga
            </button>
            <button
              type="button"
              onClick={openArchivio}
              className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
            >
              Archivio
            </button>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-sm">
              <span className="font-semibold mr-1">Prodotto totale:</span>
              <span>{prodottoTotale}</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving || loading}
                className="px-4 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Salvataggio…' : 'Salva rapportino'}
              </button>
              <button
                type="button"
                onClick={handleValidate}
                disabled={saving || loading}
                className="px-4 py-2 rounded border border-emerald-700 text-emerald-700 text-sm hover:bg-emerald-50 disabled:opacity-60"
              >
                Valida giornata
              </button>
            </div>
          </div>
        </div>

        {/* Zone messages */}
        <div className="mt-3 min-h-[1.5rem] text-sm">
          {error && <p className="text-red-600">{error}</p>}
          {!error && info && <p className="text-emerald-700">{info}</p>}
          {!error && !info && loading && (
            <p className="text-slate-500">Caricamento del rapportino…</p>
          )}
        </div>
      </div>

      {/* Modal Archivio */}
      {archivioOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                Archivio rapportini – {crewLabel}
              </h2>
              <button
                type="button"
                onClick={closeArchivio}
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                Chiudi
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-sm">
              {archivioLoading && <p>Caricamento…</p>}
              {!archivioLoading && archivioItems.length === 0 && (
                <p>Nessun rapportino trovato per questa squadra.</p>
              )}
              {!archivioLoading && archivioItems.length > 0 && (
                <table className="w-full border border-slate-200 text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-2 py-1 border border-slate-200">
                        Data
                      </th>
                      <th className="px-2 py-1 border border-slate-200">
                        COSTR.
                      </th>
                      <th className="px-2 py-1 border border-slate-200">
                        Commessa
                      </th>
                      <th className="px-2 py-1 border border-slate-200">
                        Stato
                      </th>
                      <th className="px-2 py-1 border border-slate-200">
                        Prodotto totale
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivioItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleSelectFromArchivio(item)}
                      >
                        <td className="px-2 py-1 border border-slate-200">
                          {normalizeDateInput(item.data)}
                        </td>
                        <td className="px-2 py-1 border border-slate-200">
                          {item.costr ?? ''}
                        </td>
                        <td className="px-2 py-1 border border-slate-200">
                          {item.commessa ?? ''}
                        </td>
                        <td className="px-2 py-1 border border-slate-200">
                          {STATUS_LABELS[item.status] ?? item.status ?? ''}
                        </td>
                        <td className="px-2 py-1 border border-slate-200 text-right">
                          {item.prodotto_totale ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

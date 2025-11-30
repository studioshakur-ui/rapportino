// src/ufficio/UfficioRapportinoDetail.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validato Capo',
  APPROVED_UFFICIO: 'Approvato Ufficio',
  RETURNED: 'Rimandato',
};

const STATUS_BADGE_CLASS = {
  DRAFT: 'bg-gray-200 text-gray-800',
  VALIDATED_CAPO: 'bg-yellow-100 text-yellow-800',
  APPROVED_UFFICIO: 'bg-green-100 text-green-800',
  RETURNED: 'bg-red-100 text-red-800',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('it-IT');
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('it-IT');
}

export default function UfficioRapportinoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();

  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);
  const [cavi, setCavi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [returnNote, setReturnNote] = useState('');

  const isElett = useMemo(
    () => header?.crew_role === 'ELETTRICISTA',
    [header]
  );

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      setError('Devi effettuare il login.');
      setLoading(false);
      return;
    }

    if (profile.app_role !== 'UFFICIO' && profile.app_role !== 'DIREZIONE') {
      setError('Non sei autorizzato ad accedere alla sezione Ufficio.');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      setFeedback('');

      // Header rapportino
      const { data: headerData, error: headerErr } = await supabase
        .from('rapportini')
        .select('*')
        .eq('id', id)
        .single();

      if (headerErr || !headerData) {
        console.error('Errore caricando il rapportino:', headerErr);
        setError('Impossibile caricare il rapportino selezionato.');
        setLoading(false);
        return;
      }

      setHeader(headerData);

      // Righe attività
      const { data: rowsData, error: rowsErr } = await supabase
        .from('rapportino_rows')
        .select('*')
        .eq('rapportino_id', id)
        .order('row_index', { ascending: true });

      if (rowsErr) {
        console.error('Errore caricando le righe:', rowsErr);
      }

      setRows(rowsData || []);

      // Cavi
      const { data: caviData, error: caviErr } = await supabase
        .from('rapportino_cavi')
        .select('*')
        .eq('rapportino_id', id)
        .order('id', { ascending: true });

      if (caviErr) {
        console.error('Errore caricando i cavi:', caviErr);
      }

      setCavi(caviData || []);

      // Remplir la note de retour si déjà présente
      const existingNote =
        headerData.ufficio_note || headerData.note_ufficio || '';
      setReturnNote(existingNote);

      setLoading(false);
    };

    load();
  }, [authLoading, profile, id]);

  const canApprove =
    header &&
    header.status === 'VALIDATED_CAPO' &&
    (profile?.app_role === 'UFFICIO' || profile?.app_role === 'DIREZIONE') &&
    !saving;

  const canReturn =
    header &&
    (header.status === 'VALIDATED_CAPO' ||
      header.status === 'APPROVED_UFFICIO') &&
    (profile?.app_role === 'UFFICIO' || profile?.app_role === 'DIREZIONE') &&
    !saving;

  const handleBack = () => {
    navigate('/ufficio');
  };

  const handleApprove = async () => {
    if (!header) return;

    setSaving(true);
    setError(null);
    setFeedback('');

    const now = new Date().toISOString();

    const updatePayload = {
      status: 'APPROVED_UFFICIO',
      approved_by_ufficio: profile.id,
      approved_by_ufficio_at: now,
      // Nettoyage éventuel de retour
      returned_by_ufficio: null,
      returned_by_ufficio_at: null,
    };

    const { data, error: updErr } = await supabase
      .from('rapportini')
      .update(updatePayload)
      .eq('id', header.id)
      .select()
      .single();

    setSaving(false);

    if (updErr) {
      console.error('Errore durante approvazione:', updErr);
      setError("Errore durante l'approvazione del rapportino.");
      return;
    }

    setHeader(data);
    setFeedback('Rapportino approvato con successo.');
  };

  const handleReturn = async () => {
    if (!header) return;

    if (!returnNote.trim()) {
      setError(
        'Per rimandare il rapportino al Capo è obbligatorio inserire una nota.'
      );
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback('');

    const now = new Date().toISOString();

    const updatePayload = {
      status: 'RETURNED',
      returned_by_ufficio: profile.id,
      returned_by_ufficio_at: now,
      ufficio_note: returnNote.trim(),
      note_ufficio: returnNote.trim(), // compatibilité vieux champ
    };

    const { data, error: updErr } = await supabase
      .from('rapportini')
      .update(updatePayload)
      .eq('id', header.id)
      .select()
      .single();

    setSaving(false);

    if (updErr) {
      console.error('Errore durante il rinvio:', updErr);
      setError('Errore durante il rinvio del rapportino al Capo.');
      return;
    }

    setHeader(data);
    setFeedback('Rapportino rimandato al Capo con successo.');
  };

  if (authLoading || loading) {
    return (
      <div className="p-4 text-sm text-slate-200">
        Caricamento del rapportino…
      </div>
    );
  }

  if (error && !header) {
    return (
      <div className="p-4 max-w-4xl mx-auto text-sm text-red-400">
        <button
          type="button"
          onClick={handleBack}
          className="mb-3 text-xs text-sky-300 hover:underline"
        >
          ← Torna alla lista
        </button>
        {error}
      </div>
    );
  }

  if (!header) {
    return (
      <div className="p-4 max-w-4xl mx-auto text-sm text-slate-200">
        <button
          type="button"
          onClick={handleBack}
          className="mb-3 text-xs text-sky-300 hover:underline"
        >
          ← Torna alla lista
        </button>
        Rapportino non trovato.
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[header.status] || header.status;
  const badgeClass =
    STATUS_BADGE_CLASS[header.status] || 'bg-gray-100 text-gray-700';
  const dateToShow = header.report_date || header.data;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Barre haut / retour */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs text-sky-300 hover:underline"
        >
          ← Torna alla lista rapportini
        </button>
        <div className="text-[11px] text-slate-300">
          ID: <span className="font-mono opacity-80">{header.id}</span>
        </div>
      </div>

      {/* Titre */}
      <h1 className="text-xl font-semibold text-slate-50 mb-3">
        Dettaglio rapportino
      </h1>

      {/* Header rapportino */}
      <div className="mb-4 border border-slate-700 rounded-lg bg-slate-900/70 p-3 text-xs text-slate-100">
        <div className="flex flex-wrap gap-4 justify-between items-start">
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-[11px] text-slate-400">Data</div>
              <div className="font-semibold">{formatDate(dateToShow)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Capo</div>
              <div className="font-semibold">
                {header.capo_name || 'CAPO SCONOSCIUTO'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Squadra</div>
              <div className="font-semibold">
                {header.crew_role || '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Commessa</div>
              <div className="font-semibold">
                {header.commessa || '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Costr.</div>
              <div className="font-semibold">
                {header.costr || header.cost || '—'}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${badgeClass}`}
            >
              {statusLabel}
            </span>
            <div className="text-[11px] text-slate-400 text-right space-y-0.5">
              <div>
                Validato Capo:{' '}
                <span className="text-slate-200">
                  {formatDateTime(header.validated_by_capo_at)}
                </span>
              </div>
              <div>
                Approvato Ufficio:{' '}
                <span className="text-slate-200">
                  {formatDateTime(header.approved_by_ufficio_at)}
                </span>
              </div>
              <div>
                Rimandato Ufficio:{' '}
                <span className="text-slate-200">
                  {formatDateTime(header.returned_by_ufficio_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback / erreurs */}
      {feedback && (
        <div className="mb-3 text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-700 rounded-md px-3 py-2">
          {feedback}
        </div>
      )}
      {error && (
        <div className="mb-3 text-xs text-amber-300 bg-amber-900/30 border border-amber-700 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Actions Ufficio + note */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canApprove}
            onClick={handleApprove}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
              canApprove
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed'
            }`}
          >
            {saving && canApprove ? 'Salvataggio…' : 'Approva e chiudi'}
          </button>

          <button
            type="button"
            disabled={!canReturn}
            onClick={handleReturn}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
              canReturn
                ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                : 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed'
            }`}
          >
            {saving && canReturn ? 'Salvataggio…' : 'Rimanda al Capo'}
          </button>
        </div>

        <div className="flex-1 md:max-w-xs">
          <label className="block text-[11px] font-medium text-slate-200 mb-1">
            Nota Ufficio (visibile al Capo)
          </label>
          <textarea
            rows={3}
            className="w-full border border-slate-600 bg-slate-900/70 rounded-md px-2 py-1 text-xs text-slate-50"
            placeholder="Spiega al Capo cosa manca, cosa non torna, o cosa va corretto…"
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
          />
        </div>
      </div>

      {/* Tabella attività */}
      <section className="mb-5 border border-slate-700 bg-slate-900/70 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/80 text-[11px] font-semibold text-slate-100">
          Attività della giornata
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-left">Descrizione</th>
                <th className="px-2 py-1 text-left">Operatori</th>
                <th className="px-2 py-1 text-left">Tempo</th>
                <th className="px-2 py-1 text-right">Previsto</th>
                <th className="px-2 py-1 text-right">Prodotto</th>
                <th className="px-2 py-1 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-3 text-center text-[11px] text-slate-500"
                  >
                    Nessuna riga attività registrata.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-800 hover:bg-slate-800/70"
                >
                  <td className="px-2 py-1 whitespace-nowrap">
                    {row.categoria || '—'}
                  </td>
                  <td className="px-2 py-1">{row.descrizione || '—'}</td>
                  <td className="px-2 py-1 whitespace-pre-wrap">
                    {row.operatori || '—'}
                  </td>
                  <td className="px-2 py-1 whitespace-pre-wrap">
                    {row.tempo || '—'}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {row.previsto != null ? row.previsto : '—'}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {row.prodotto != null ? row.prodotto : '—'}
                  </td>
                  <td className="px-2 py-1">{row.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabella cavi (solo Elettricista) */}
      {isElett && (
        <section className="mb-8 border border-slate-700 bg-slate-900/70 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/80 text-[11px] font-semibold text-slate-100 flex items-center justify-between gap-2">
            <span>Lista cavi posati (giornata)</span>
            <Link
              to="/ufficio/inca"
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-400/80 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/10 hover:border-emerald-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Apri vista INCA</span>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="px-2 py-1 text-left">Codice</th>
                  <th className="px-2 py-1 text-left">Descrizione</th>
                  <th className="px-2 py-1 text-right">Metri totali</th>
                  <th className="px-2 py-1 text-right">%</th>
                  <th className="px-2 py-1 text-right">Metri posati</th>
                  <th className="px-2 py-1 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {cavi.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-3 text-center text-[11px] text-slate-500"
                    >
                      Nessun cavo registrato per questa giornata.
                    </td>
                  </tr>
                )}
                {cavi.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-800 hover:bg-slate-800/70"
                  >
                    <td className="px-2 py-1 whitespace-nowrap">
                      {c.codice || '—'}
                    </td>
                    <td className="px-2 py-1">{c.descrizione || '—'}</td>
                    <td className="px-2 py-1 text-right">
                      {c.metri_totali != null ? c.metri_totali : '—'}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.percentuale != null ? `${c.percentuale} %` : '—'}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.metri_posati != null ? c.metri_posati : '—'}
                    </td>
                    <td className="px-2 py-1">{c.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
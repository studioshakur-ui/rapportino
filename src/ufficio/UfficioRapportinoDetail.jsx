// src/ufficio/UfficioRapportinoDetail.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'In verifica',
  APPROVED_UFFICIO: 'Archiviato',
  RETURNED: 'Rimandato',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('it-IT');
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('it-IT');
}

function bestNameFromProfile(p) {
  const d = (p?.display_name || '').trim();
  const f = (p?.full_name || '').trim();
  const e = (p?.email || '').trim();
  return d || f || e || null;
}

function safeMultilineText(v) {
  if (v == null) return '';
  const s = String(v);
  const normalized = s.replace(/\r\n/g, '\n').trim();
  return normalized;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMeters(v) {
  if (v == null) return '—';
  const n = safeNum(v);
  if (!n) return '0';
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)} km`;
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? `${Math.round(n)}` : `${n.toFixed(1)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function statusTone(status) {
  switch (status) {
    case 'VALIDATED_CAPO':
      return {
        pill: 'bg-amber-500/15 text-amber-200 border border-amber-400/60',
        panel: 'bg-amber-950/25 border-amber-500/30',
        title: 'DOCUMENTO IN VERIFICA',
        subtitle: 'Controllo Ufficio · in attesa di certificazione',
      };
    case 'RETURNED':
      return {
        pill: 'bg-rose-500/15 text-rose-200 border border-rose-400/60',
        panel: 'bg-rose-950/25 border-rose-500/30',
        title: 'DOCUMENTO RIMANDATO AL CAPO',
        subtitle: 'Richiesta correzione · nota Ufficio presente',
      };
    case 'APPROVED_UFFICIO':
      return {
        pill: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/60',
        panel: 'bg-emerald-950/20 border-emerald-500/25',
        title: 'DOCUMENTO ARCHIVIATO',
        subtitle: 'Documento ufficiale · bloccato in sola lettura',
      };
    default:
      return {
        pill: 'bg-slate-700/70 text-slate-200 border border-slate-600/60',
        panel: 'bg-slate-900/40 border-slate-700/60',
        title: 'DOCUMENTO',
        subtitle: '',
      };
  }
}

export default function UfficioRapportinoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();

  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);

  // INCA linked cavi (new)
  const [incaCavi, setIncaCavi] = useState([]);

  const [capoDisplayName, setCapoDisplayName] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [returnNote, setReturnNote] = useState('');

  const isElett = useMemo(() => header?.crew_role === 'ELETTRICISTA', [header]);

  const isManager = profile?.app_role === 'MANAGER';
  const isUfficio = profile?.app_role === 'UFFICIO';
  const isDirezione = profile?.app_role === 'DIREZIONE';
  const isAdmin = profile?.app_role === 'ADMIN';

  const isArchived = header?.status === 'APPROVED_UFFICIO';
  const isReturned = header?.status === 'RETURNED';
  const isValidated = header?.status === 'VALIDATED_CAPO';

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      setError('Devi effettuare il login.');
      setLoading(false);
      return;
    }

    if (!isUfficio && !isDirezione && !isManager && !isAdmin) {
      setError('Non sei autorizzato ad accedere alla sezione Ufficio.');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      setFeedback('');
      setCapoDisplayName(null);

      // 1) Header rapportino
      const { data: headerData, error: headerErr } = await supabase
        .from('rapportini')
        .select('*')
        .eq('id', id)
        .single();

      if (headerErr || !headerData) {
        console.error('[UFFICIO DETAIL] Errore caricando il rapportino:', headerErr);
        setError('Impossibile caricare il rapportino selezionato.');
        setLoading(false);
        return;
      }

      setHeader(headerData);

      // 2) Resolve CAPO name via RPC (public profile fields)
      if (headerData.capo_id) {
        const { data: profs, error: rpcErr } = await supabase.rpc(
          'core_profiles_public_by_ids',
          { p_ids: [headerData.capo_id] }
        );

        if (rpcErr) {
          console.warn('[UFFICIO DETAIL] RPC profiles_public failed:', rpcErr);
        } else {
          const p = (profs || [])[0];
          const resolved = bestNameFromProfile(p);
          if (resolved) setCapoDisplayName(resolved);
        }
      }

      // 3) Righe attività
      const { data: rowsData, error: rowsErr } = await supabase
        .from('rapportino_rows')
        .select('*')
        .eq('rapportino_id', id)
        .order('row_index', { ascending: true });

      if (rowsErr) {
        console.error('[UFFICIO DETAIL] Errore caricando le righe:', rowsErr);
      }
      setRows(rowsData || []);

      // 4) Cavi INCA associati (SOURCE CORRETTA)
      const { data: incaData, error: incaErr } = await supabase
        .from('archive_rapportino_inca_cavi_v1')
        .select(
          [
            'link_id',
            'rapportino_id',
            'inca_cavo_id',
            'codice',
            'descrizione',
            'metri_teo',
            'metri_dis',
            'metri_posati',
            'progress_percent',
            'step_type',
            'situazione',
          ].join(',')
        )
        .eq('rapportino_id', id)
        .order('codice', { ascending: true });

      if (incaErr) {
        console.error('[UFFICIO DETAIL] Errore caricando i cavi INCA:', incaErr);
      }
      setIncaCavi(incaData || []);

      // 5) Note de retour (legacy fields)
      const existingNote = headerData.ufficio_note || headerData.note_ufficio || '';
      setReturnNote(existingNote || '');

      setLoading(false);
    };

    load();
  }, [authLoading, profile, id, isUfficio, isDirezione, isManager, isAdmin]);

  // Verrouillage “archiviato” (Option A) :
  // - Approver uniquement quand VALIDATED_CAPO
  // - Rimandare uniquement quand VALIDATED_CAPO (pas de retour depuis un archiviato)
  const canApprove =
    header &&
    header.status === 'VALIDATED_CAPO' &&
    (isUfficio || isDirezione || isAdmin) &&
    !saving;

  const canReturn =
    header &&
    header.status === 'VALIDATED_CAPO' &&
    (isUfficio || isDirezione || isAdmin) &&
    !saving;

  const statusLabel = header ? STATUS_LABELS[header.status] || header.status : '—';
  const tone = statusTone(header?.status);

  const capoResolved =
    capoDisplayName ||
    (header?.capo_name && header.capo_name !== 'CAPO SCONOSCIUTO' ? header.capo_name : null) ||
    (header?.capo_id ? `CAPO ${String(header.capo_id).slice(0, 8)}` : '—');

  const handleBack = () => navigate('/ufficio');

  const handleApprove = async () => {
    if (!header || !canApprove) return;

    setSaving(true);
    setError(null);
    setFeedback('');

    const now = new Date().toISOString();

    const updatePayload = {
      status: 'APPROVED_UFFICIO',
      approved_by_ufficio: profile.id,
      approved_by_ufficio_at: now,
      ufficio_note: returnNote || null,
      note_ufficio: returnNote || null,
    };

    const { error: updateErr } = await supabase
      .from('rapportini')
      .update(updatePayload)
      .eq('id', header.id);

    if (updateErr) {
      console.error("[UFFICIO DETAIL] Errore approvazione rapportino:", updateErr);
      setError("Errore durante l'approvazione del rapportino.");
    } else {
      setHeader((prev) => (prev ? { ...prev, ...updatePayload } : prev));
      // Message court (pas de répétition)
      setFeedback('Documento archiviato.');
    }

    setSaving(false);
  };

  const handleReturn = async () => {
    if (!header || !canReturn) return;

    if (!returnNote || !returnNote.trim()) {
      setError("Per rimandare il rapportino è obbligatorio compilare la nota.");
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
      ufficio_note: returnNote,
      note_ufficio: returnNote,
    };

    const { error: updateErr } = await supabase
      .from('rapportini')
      .update(updatePayload)
      .eq('id', header.id);

    if (updateErr) {
      console.error('[UFFICIO DETAIL] Errore rimandando il rapportino:', updateErr);
      setError('Errore durante il rinvio del rapportino.');
    } else {
      setHeader((prev) => (prev ? { ...prev, ...updatePayload } : prev));
      setFeedback('Documento rimandato al Capo.');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-300">
        Caricamento del rapportino…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <div className="px-3 py-2 rounded-md bg-red-900/40 border border-red-600 text-sm text-red-100">
          {error}
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="text-xs underline text-slate-300"
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  if (!header) {
    return (
      <div className="p-6 space-y-3">
        <div className="px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-100">
          Nessun rapportino trovato.
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="text-xs underline text-slate-300"
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  return (
    <div className={['p-4 md:p-5 space-y-4', isArchived ? 'opacity-90' : ''].join(' ')}>
      {/* CARTOUCHE STATUT (source de vérité) */}
      <div
        className={[
          'rounded-2xl border px-4 py-3',
          tone.panel,
        ].join(' ')}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
              {tone.title}
            </div>
            {tone.subtitle ? (
              <div className="text-xs text-slate-400">{tone.subtitle}</div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={[
                'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] uppercase tracking-[0.14em] font-medium',
                tone.pill,
              ].join(' ')}
            >
              {statusLabel}
              {isArchived && (
                <span className="ml-1.5 text-[10px] tracking-[0.14em] text-emerald-200/90">
                  · BLOCCATO
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-1.5 rounded-full border border-slate-700 text-slate-100 text-xs hover:bg-slate-900/60"
            >
              ← Lista
            </button>
          </div>
        </div>
      </div>

      {/* HEADER (info utili, pas de répétition) */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-1 text-sm text-slate-100">
          <div className="text-base font-semibold">
            COSTR {header.costr || '—'} · Commessa {header.commessa || '—'}
          </div>
          <div className="text-xs text-slate-400">
            Data:&nbsp;
            <span className="text-slate-100">
              {formatDate(header.report_date || header.data)}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Capo:&nbsp;
            <span className="text-slate-100">{capoResolved}</span>
          </div>
          <div className="text-xs text-slate-400">
            Squadra:&nbsp;
            <span className="text-slate-100">{header.crew_role || '—'}</span>
          </div>

          {/* Meta-dati compatti (secondaires) */}
          <div className="pt-2 text-[11px] text-slate-500 space-y-0.5">
            {header.validated_by_capo_at ? (
              <div>
                Validato Capo: <span className="text-slate-300">{formatDateTime(header.validated_by_capo_at)}</span>
              </div>
            ) : null}
            {header.approved_by_ufficio_at ? (
              <div>
                Archiviato: <span className="text-slate-300">{formatDateTime(header.approved_by_ufficio_at)}</span>
              </div>
            ) : null}
            {header.returned_by_ufficio_at ? (
              <div>
                Rimandato: <span className="text-slate-300">{formatDateTime(header.returned_by_ufficio_at)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ACTIONS (rituel + verrouillage) */}
        <div className="flex flex-col items-end gap-2 text-xs">
          {!isArchived && (
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={handleReturn}
                disabled={!canReturn}
                className={[
                  'px-3 py-1.5 rounded-md border text-xs font-medium',
                  canReturn
                    ? 'border-amber-500 text-amber-100 bg-amber-900/40 hover:bg-amber-900/60'
                    : 'border-slate-700 text-slate-500 bg-slate-900/60 cursor-not-allowed',
                ].join(' ')}
              >
                Rimanda al Capo
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={!canApprove}
                className={[
                  'px-3 py-1.5 rounded-md border text-xs font-medium',
                  canApprove
                    ? 'border-emerald-500 text-emerald-100 bg-emerald-900/40 hover:bg-emerald-900/60'
                    : 'border-slate-700 text-slate-500 bg-slate-900/60 cursor-not-allowed',
                ].join(' ')}
              >
                Approva e archivia
              </button>
            </div>
          )}

          {isManager && (
            <div className="text-[10px] text-slate-500">
              Accesso in sola lettura
            </div>
          )}

          {feedback ? (
            <div
              className={[
                'mt-1 text-[11px]',
                isReturned ? 'text-rose-300' : 'text-emerald-300',
              ].join(' ')}
            >
              {feedback}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-900/80 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Attività
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-t border-slate-800 text-[12px]">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-2 py-1 text-left border-b border-slate-800">#</th>
                <th className="px-2 py-1 text-left border-b border-slate-800">Categoria</th>
                <th className="px-2 py-1 text-left border-b border-slate-800">Descrizione</th>
                <th className="px-2 py-1 text-left border-b border-slate-800">Operatori</th>
                <th className="px-2 py-1 text-left border-b border-slate-800">Tempo</th>
                <th className="px-2 py-1 text-right border-b border-slate-800">Previsto</th>
                <th className="px-2 py-1 text-right border-b border-slate-800">Prodotto</th>
                <th className="px-2 py-1 text-left border-b border-slate-800">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
              {rows.map((r, idx) => {
                const operatori = safeMultilineText(r.operatori);
                const tempo = safeMultilineText(r.tempo);
                const note = safeMultilineText(r.note);

                return (
                  <tr key={r.id || idx}>
                    <td className="px-2 py-1 text-slate-400 align-top">{idx + 1}</td>
                    <td className="px-2 py-1 text-slate-100 align-top">{r.categoria || '—'}</td>
                    <td className="px-2 py-1 text-slate-100 align-top">{r.descrizione || '—'}</td>

                    <td className="px-2 py-1 text-slate-100 align-top whitespace-pre-line">
                      {operatori ? operatori : '—'}
                    </td>

                    <td className="px-2 py-1 text-slate-100 align-top whitespace-pre-line">
                      {tempo ? tempo : '—'}
                    </td>

                    <td className="px-2 py-1 text-slate-100 align-top text-right">
                      {r.previsto ?? '—'}
                    </td>
                    <td className="px-2 py-1 text-slate-100 align-top text-right">
                      {r.prodotto ?? '—'}
                    </td>

                    <td className="px-2 py-1 text-slate-100 align-top whitespace-pre-line">
                      {note ? note : '—'}
                    </td>
                  </tr>
                );
              })}

              {!rows.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-2 text-center text-[12px] text-slate-500"
                  >
                    Nessuna riga attività.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isElett && (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-900/80 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Cavi associati (INCA)
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-t border-slate-800 text-[12px]">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-2 py-1 text-left border-b border-slate-800">Codice</th>
                  <th className="px-2 py-1 text-left border-b border-slate-800">Descrizione</th>
                  <th className="px-2 py-1 text-right border-b border-slate-800">Metri totali</th>
                  <th className="px-2 py-1 text-right border-b border-slate-800">Metri posati</th>
                  <th className="px-2 py-1 text-right border-b border-slate-800">%</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                {incaCavi.map((c) => {
                  const metriTot = safeNum(c.metri_teo ?? c.metri_dis);
                  const metriPos = safeNum(c.metri_posati);

                  const pctFromField =
                    c.progress_percent != null && c.progress_percent !== ''
                      ? safeNum(c.progress_percent)
                      : null;

                  const pctFromCalc =
                    metriTot > 0 && metriPos > 0 ? (metriPos / metriTot) * 100 : null;

                  const pct = clamp(
                    pctFromField != null ? pctFromField : pctFromCalc != null ? pctFromCalc : 0,
                    0,
                    100
                  );

                  const metriPosDisplay =
                    metriPos > 0 ? metriPos : metriTot > 0 ? (metriTot * pct) / 100 : 0;

                  return (
                    <tr key={c.link_id || c.id || c.inca_cavo_id}>
                      <td className="px-2 py-1 text-slate-100 align-top">
                        {c.codice || '—'}
                      </td>
                      <td className="px-2 py-1 text-slate-100 align-top">
                        {c.descrizione || '—'}
                      </td>
                      <td className="px-2 py-1 text-slate-100 align-top text-right">
                        {metriTot ? formatMeters(metriTot) : '—'}
                      </td>
                      <td className="px-2 py-1 text-slate-100 align-top text-right">
                        {metriTot ? formatMeters(metriPosDisplay) : '—'}
                      </td>
                      <td className="px-2 py-1 text-slate-100 align-top text-right">
                        {pct ? `${pct.toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}

                {!incaCavi.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-[12px] text-slate-500">
                      Nessun cavo associato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Nota Ufficio → Capo
          </div>
          {isManager && (
            <span className="text-[10px] text-slate-500">Sola lettura</span>
          )}
          {isArchived && (
            <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-300">
              Archiviato · bloccato
            </span>
          )}
        </div>

        <textarea
          value={returnNote}
          onChange={(e) => setReturnNote(e.target.value)}
          disabled={isManager || isArchived}
          rows={4}
          className={[
            'w-full text-[12px] rounded-md border px-2 py-1.5 bg-slate-950/60 text-slate-100 resize-y',
            (isManager || isArchived)
              ? 'border-slate-800 cursor-not-allowed opacity-80'
              : 'border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500',
          ].join(' ')}
          placeholder={
            isArchived
              ? 'Documento archiviato (nota in sola lettura).'
              : isManager
              ? 'Nota in sola lettura.'
              : 'Nota obbligatoria per il rimando.'
          }
        />
      </div>
    </div>
  );
}

// src/ufficio/UfficioRapportiniList.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validato Capo',
  APPROVED_UFFICIO: 'Approvato Ufficio',
  RETURNED: 'Rimandato',
};

const STATUS_BADGE_CLASS = {
  DRAFT: 'bg-slate-700/80 text-slate-200',
  VALIDATED_CAPO:
    'bg-amber-500/15 text-amber-200 border border-amber-400/60',
  APPROVED_UFFICIO:
    'bg-emerald-500/15 text-emerald-200 border border-emerald-400/60',
  RETURNED: 'bg-rose-500/15 text-rose-200 border border-rose-400/60',
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('it-IT');
}

function formatProdotto(row) {
  if (row.totale_prodotto != null) return Number(row.totale_prodotto);
  if (row.prodotto_totale != null) return Number(row.prodotto_totale);
  if (row.prodotto_tot != null) return Number(row.prodotto_tot);
  return 0;
}

function bestNameFromProfile(p) {
  const d = (p?.display_name || '').trim();
  const f = (p?.full_name || '').trim();
  const e = (p?.email || '').trim();
  return d || f || e || null;
}

export default function UfficioRapportiniList() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [rapportini, setRapportini] = useState([]);
  const [capoNameById, setCapoNameById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [capoFilter, setCapoFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      setError('Devi effettuare il login.');
      setLoading(false);
      return;
    }

    if (!['UFFICIO', 'DIREZIONE', 'MANAGER', 'ADMIN'].includes(profile.app_role)) {
      setError('Non sei autorizzato ad accedere alla sezione Ufficio.');
      setLoading(false);
      return;
    }

    const fetchRapportini = async () => {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('rapportini')
        .select(
          [
            'id',
            'report_date',
            'data',
            'capo_id',
            'capo_name',
            'crew_role',
            'commessa',
            'status',
            'totale_prodotto',
            'prodotto_totale',
            'prodotto_tot',
          ].join(',')
        )
        .in('status', ['VALIDATED_CAPO', 'APPROVED_UFFICIO', 'RETURNED'])
        .order('report_date', { ascending: false })
        .order('data', { ascending: false });

      if (err) {
        console.error('[UFFICIO LIST] Errore caricando i rapportini:', err);
        setError('Errore durante il caricamento dei rapportini.');
        setRapportini([]);
        setCapoNameById({});
        setLoading(false);
        return;
      }

      const rows = data || [];
      setRapportini(rows);

      // Resolve CAPO names via RPC (public profile fields)
      const uniqueCapoIds = Array.from(
        new Set(rows.map((r) => r.capo_id).filter(Boolean))
      );

      if (uniqueCapoIds.length === 0) {
        setCapoNameById({});
        setLoading(false);
        return;
      }

      const { data: profs, error: rpcErr } = await supabase.rpc(
        'core_profiles_public_by_ids',
        { p_ids: uniqueCapoIds }
      );

      if (rpcErr) {
        // Non-blocking: fallback to capo_name
        console.warn('[UFFICIO LIST] RPC profiles_public failed:', rpcErr);
        setCapoNameById({});
        setLoading(false);
        return;
      }

      const map = {};
      (profs || []).forEach((p) => {
        map[p.id] = bestNameFromProfile(p);
      });

      setCapoNameById(map);
      setLoading(false);
    };

    fetchRapportini();
  }, [authLoading, profile]);

  const filteredRapportini = useMemo(() => {
    const q = capoFilter.trim().toLowerCase();
    return (rapportini || []).filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (roleFilter !== 'ALL' && r.crew_role !== roleFilter) return false;

      if (q) {
        const resolved =
          (r.capo_id && capoNameById[r.capo_id]) ||
          (r.capo_name || '');
        const name = String(resolved).toLowerCase();
        if (!name.includes(q)) return false;
      }

      return true;
    });
  }, [rapportini, statusFilter, capoFilter, roleFilter, capoNameById]);

  const handleRowClick = (id) => {
    navigate(`/ufficio/rapportini/${id}`);
  };

  if (authLoading || loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-slate-400">
          Caricamento rapportini Ufficio…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-rose-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 max-w-6xl mx-auto text-slate-100">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-50">
            Rapportini – Ufficio
          </h1>
          <p className="text-xs text-slate-400">
            Controllo e approvazione delle giornate validate dai Capi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span>
            Utente:&nbsp;
            <strong className="text-slate-100">
              {profile?.full_name || profile?.email || 'UFFICIO'}
            </strong>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/60">
            Ruolo: {profile?.app_role}
          </span>
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col text-xs">
            <label className="mb-1 font-medium text-slate-300">Stato</label>
            <select
              className="border border-slate-700 rounded-md px-2 py-1 text-xs bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tutti</option>
              <option value="VALIDATED_CAPO">In attesa di verifica</option>
              <option value="APPROVED_UFFICIO">Approvati</option>
              <option value="RETURNED">Rimandati</option>
            </select>
          </div>

          <div className="flex flex-col text-xs">
            <label className="mb-1 font-medium text-slate-300">
              Tipo squadra
            </label>
            <select
              className="border border-slate-700 rounded-md px-2 py-1 text-xs bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Tutte</option>
              <option value="ELETTRICISTA">Elettricista</option>
              <option value="CARPENTERIA">Carpenteria</option>
              <option value="MONTAGGIO">Montaggio</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col text-xs min-w-[180px]">
          <label className="mb-1 font-medium text-slate-300">
            Filtra per Capo
          </label>
          <input
            type="text"
            placeholder="Nome Capo…"
            className="border border-slate-700 rounded-md px-2 py-1 text-xs bg-slate-900/70 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            value={capoFilter}
            onChange={(e) => setCapoFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-[0_0_0_1px_rgba(15,23,42,0.7)]">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                Data
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                Capo
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                Squadra
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                Commessa
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                Prodotto totale
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                Stato
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-300">
                Dettaglio
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRapportini.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-xs text-slate-500"
                >
                  Nessun rapportino trovato per i filtri selezionati.
                </td>
              </tr>
            )}

            {filteredRapportini.map((r) => {
              const prodotto = formatProdotto(r);
              const statusLabel = STATUS_LABELS[r.status] || r.status;
              const badgeClass =
                STATUS_BADGE_CLASS[r.status] ||
                'bg-slate-700/80 text-slate-200';

              const dateToShow = r.report_date || r.data;

              const capoResolved =
                (r.capo_id && capoNameById[r.capo_id]) ||
                (r.capo_name && r.capo_name !== 'CAPO SCONOSCIUTO'
                  ? r.capo_name
                  : null) ||
                (r.capo_id ? `CAPO ${String(r.capo_id).slice(0, 8)}` : '—');

              return (
                <tr
                  key={r.id}
                  className="border-b border-slate-800 hover:bg-slate-900/80 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(r.id)}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                    {formatDate(dateToShow)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                    {capoResolved}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                    {r.crew_role || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                    {r.commessa || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                    {prodotto.toLocaleString('it-IT', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${badgeClass}`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <Link
                      to={`/ufficio/rapportini/${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-sky-300 hover:text-sky-200 hover:underline"
                    >
                      Apri
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// src/ufficio/UfficioRapportiniList.jsx
import { useEffect, useState, useMemo } from 'react';
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
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('it-IT');
}

function formatProdotto(row) {
  // On essaie dans l’ordre : totale_prodotto, prodotto_totale, prodotto_tot
  if (row.totale_prodotto != null) return Number(row.totale_prodotto);
  if (row.prodotto_totale != null) return Number(row.prodotto_totale);
  if (row.prodotto_tot != null) return Number(row.prodotto_tot);
  return 0;
}

// Canon: display_name > full_name > email > capo_name (fallback) > '—'
function resolveCapoName({ capoProfile, capoNameFallback }) {
  if (capoProfile?.display_name) return capoProfile.display_name;
  if (capoProfile?.full_name) return capoProfile.full_name;
  if (capoProfile?.email) return capoProfile.email;
  if (capoNameFallback) return capoNameFallback;
  return '—';
}

export default function UfficioRapportiniList() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [rapportini, setRapportini] = useState([]);
  const [capoById, setCapoById] = useState({}); // { [capo_id]: {display_name, full_name, email} }

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

    // Route-level gating is already handled by <RequireRole />.
    // Defensive check to avoid silent empty states if routing is misconfigured.
    if (!['UFFICIO', 'DIREZIONE', 'MANAGER', 'ADMIN'].includes(profile.app_role)) {
      setError('Non sei autorizzato ad accedere alla sezione Ufficio.');
      setLoading(false);
      return;
    }

    const fetchRapportini = async () => {
      setLoading(true);
      setError(null);

      // 1) Charger les rapportini (inclure capo_id)
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
        console.error('Errore caricando i rapportini Ufficio:', err);
        setError('Errore durante il caricamento dei rapportini.');
        setRapportini([]);
        setCapoById({});
        setLoading(false);
        return;
      }

      const rapportiniRows = data || [];
      setRapportini(rapportiniRows);

      // 2) Charger les profils CAPO correspondants (sans dépendre d’un JOIN FK)
      const uniqueCapoIds = Array.from(
        new Set(
          rapportiniRows
            .map((r) => r.capo_id)
            .filter((v) => typeof v === 'string' && v.length > 0)
        )
      );

      if (!uniqueCapoIds.length) {
        setCapoById({});
        setLoading(false);
        return;
      }

      const { data: capoProfiles, error: capoErr } = await supabase
        .from('profiles')
        .select('id, display_name, full_name, email')
        .in('id', uniqueCapoIds);

      if (capoErr) {
        console.error('Errore caricando i profili capo:', capoErr);
        // On garde les rapportini, mais sans enrichissement de noms
        setCapoById({});
        setLoading(false);
        return;
      }

      const map = {};
      for (const p of capoProfiles || []) {
        map[p.id] = p;
      }
      setCapoById(map);

      setLoading(false);
    };

    fetchRapportini();
  }, [authLoading, profile]);

  const enrichedRapportini = useMemo(() => {
    return (rapportini || []).map((r) => {
      const capoProfile = r.capo_id ? capoById[r.capo_id] : null;
      const capoDisplay = resolveCapoName({
        capoProfile,
        capoNameFallback: r.capo_name,
      });
      return { ...r, _capoDisplay: capoDisplay };
    });
  }, [rapportini, capoById]);

  const filteredRapportini = useMemo(() => {
    return (enrichedRapportini || []).filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      if (roleFilter !== 'ALL' && r.crew_role !== roleFilter) return false;

      if (capoFilter.trim()) {
        const q = capoFilter.trim().toLowerCase();
        const name = (r._capoDisplay || '').toLowerCase();
        if (!name.includes(q)) return false;
      }

      return true;
    });
  }, [enrichedRapportini, statusFilter, capoFilter, roleFilter]);

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

      {/* Filtri */}
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

      {/* Tabella */}
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
                    {r._capoDisplay || '—'}
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

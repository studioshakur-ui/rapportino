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
  DRAFT: 'bg-gray-200 text-gray-800',
  VALIDATED_CAPO: 'bg-yellow-100 text-yellow-800',
  APPROVED_UFFICIO: 'bg-green-100 text-green-800',
  RETURNED: 'bg-red-100 text-red-800',
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('it-IT');
}

function formatProdotto(row) {
  // On essaie dans l’ordre : prodotto_totale, prodotto_tot, totale_prodotto
  if (row.prodotto_totale != null) return Number(row.prodotto_totale);
  if (row.prodotto_tot != null) return Number(row.prodotto_tot);
  if (row.totale_prodotto != null) return Number(row.totale_prodotto);
  return 0;
}

export default function UfficioRapportiniList() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [rapportini, setRapportini] = useState([]);
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

    if (profile.app_role !== 'UFFICIO' && profile.app_role !== 'DIREZIONE') {
      setError('Non sei autorizzato ad accedere alla sezione Ufficio.');
      setLoading(false);
      return;
    }

    const fetchRapportini = async () => {
      setLoading(true);
      setError(null);

      // UFFICIO a déjà une policy "ufficio can read validated" sur rapportini
      // qui autorise SELECT sur VALIDATED_CAPO / APPROVED_UFFICIO / RETURNED.
      const { data, error: err } = await supabase
        .from('rapportini')
        .select(
          `
          id,
          data,
          report_date,
          capo_name,
          crew_role,
          commessa,
          status,
          prodotto_totale,
          prodotto_tot,
          totale_prodotto
        `
        )
        .in('status', ['VALIDATED_CAPO', 'APPROVED_UFFICIO', 'RETURNED'])
        .order('data', { ascending: false });

      if (err) {
        console.error('Errore caricando i rapportini Ufficio:', err);
        setError('Errore durante il caricamento dei rapportini.');
      } else {
        setRapportini(data || []);
      }

      setLoading(false);
    };

    fetchRapportini();
  }, [authLoading, profile]);

  const filteredRapportini = useMemo(() => {
    return (rapportini || []).filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      if (roleFilter !== 'ALL' && r.crew_role !== roleFilter) return false;

      if (capoFilter.trim()) {
        const q = capoFilter.trim().toLowerCase();
        const name = (r.capo_name || '').toLowerCase();
        if (!name.includes(q)) return false;
      }

      return true;
    });
  }, [rapportini, statusFilter, capoFilter, roleFilter]);

  const handleRowClick = (id) => {
    navigate(`/ufficio/rapportini/${id}`);
  };

  if (authLoading || loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">Caricamento rapportini Ufficio…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Rapportini – Ufficio</h1>
          <p className="text-xs text-gray-500">
            Controllo e approvazione delle giornate validate dai Capi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span>
            Utente:&nbsp;
            <strong>{profile?.full_name || profile?.email || 'UFFICIO'}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
            Ruolo: {profile?.app_role}
          </span>
        </div>
      </header>

      {/* Filtri */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col text-xs">
            <label className="mb-1 font-medium">Stato</label>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-xs"
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
            <label className="mb-1 font-medium">Tipo squadra</label>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-xs"
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

        <div className="flex flex-col text-xs">
          <label className="mb-1 font-medium">Filtra per Capo</label>
          <input
            type="text"
            placeholder="Nome Capo…"
            className="border border-gray-300 rounded-md px-2 py-1 text-xs"
            value={capoFilter}
            onChange={(e) => setCapoFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Tabella */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Data</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Capo</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Squadra</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Commessa</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">
                Prodotto totale
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Stato</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Dettaglio</th>
            </tr>
          </thead>
          <tbody>
            {filteredRapportini.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-xs text-gray-400"
                >
                  Nessun rapportino trovato per i filtri selezionati.
                </td>
              </tr>
            )}

            {filteredRapportini.map((r) => {
              const prodotto = formatProdotto(r);
              const statusLabel = STATUS_LABELS[r.status] || r.status;
              const badgeClass =
                STATUS_BADGE_CLASS[r.status] || 'bg-gray-100 text-gray-700';

              const dateToShow = r.report_date || r.data;

              return (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 hover:bg-sky-50 cursor-pointer"
                  onClick={() => handleRowClick(r.id)}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDate(dateToShow)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.capo_name || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.crew_role || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.commessa || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
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
                      className="text-xs text-sky-700 hover:underline"
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

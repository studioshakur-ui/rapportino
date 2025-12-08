// src/components/RapportinoSheet.jsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';

// Gabarits de lignes "papier" par rôle
const EMPTY_ROWS_BY_CREW = {
  ELETTRICISTA: [
    {
      categoria: 'STESURA',
      descrizione: 'STESURA',
      operatori: '',
      tempo: '',
      previsto: '150,0',
      prodotto: '',
      note: '',
    },
    {
      categoria: 'STESURA',
      descrizione: 'FASCETTATURA CAVI',
      operatori: '',
      tempo: '',
      previsto: '600,0',
      prodotto: '',
      note: '',
    },
    {
      categoria: 'STESURA',
      descrizione: 'RIPRESA CAVI',
      operatori: '',
      tempo: '',
      previsto: '150,0',
      prodotto: '',
      note: '',
    },
    {
      categoria: 'STESURA',
      descrizione: 'VARI STESURA CAVI',
      operatori: '',
      tempo: '',
      previsto: '0,2',
      prodotto: '',
      note: '',
    },
  ],
  CARPENTERIA: [
    {
      categoria: 'CARPENTERIA',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
  ],
  MONTAGGIO: [
    {
      categoria: 'MONTAGGIO',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: '',
      prodotto: '',
      note: '',
    },
  ],
};

function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

function formatPrevisto(value) {
  const n = parseNumeric(value);
  if (n === null) return '';
  // On garde "150,0" / "600,0" comme sur le papier
  if (Number.isInteger(n)) {
    return n.toFixed(1).replace('.', ',');
  }
  return String(n).replace('.', ',');
}

// Rend un champ multi-ligne comme sur le papier (OPERATORE / TEMPO / NOTE)
function MultiLineCell({ value }) {
  if (!value) return null;
  const lines = String(value).split(/\r?\n/);
  return (
    <>
      {lines.map((line, idx) => (
        <span key={idx}>
          {line}
          {idx < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export default function RapportinoSheet() {
  const { profile } = useAuth();

  const [crewRole, setCrewRole] = useState('ELETTRICISTA');
  const [reportDate, setReportDate] = useState('');
  const [costr, setCostr] = useState('6368');
  const [commessa, setCommessa] = useState('SDC');
  const [rows, setRows] = useState(EMPTY_ROWS_BY_CREW.ELETTRICISTA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const prodottoTotale = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const v = parseNumeric(r.prodotto);
        return sum + (v ?? 0);
      }, 0),
    [rows]
  );

  // Lecture des paramètres d'URL : date / role
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    const roleParam = params.get('role');

    if (dateParam) setReportDate(dateParam);
    if (roleParam) setCrewRole(roleParam);
  }, []);

  // Chargement des données depuis Supabase
  useEffect(() => {
    async function loadData() {
      if (!profile?.id || !reportDate) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const { data: rap, error: rapError } = await supabase
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

        if (!rap) {
          // Aucun rapport → gabarit brut 6368/SDC
          setCostr('6368');
          setCommessa('SDC');
          setRows(EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA);
          setLoading(false);
          return;
        }

        setCostr(rap.costr || rap.cost || '6368');
        setCommessa(rap.commessa || 'SDC');

        const { data: righe, error: rowsError } = await supabase
          .from('rapportino_rows')
          .select('*')
          .eq('rapportino_id', rap.id)
          .order('row_index', { ascending: true });

        if (rowsError) throw rowsError;

        if (!righe || righe.length === 0) {
          setRows(EMPTY_ROWS_BY_CREW[crewRole] || EMPTY_ROWS_BY_CREW.ELETTRICISTA);
        } else {
          const mapped = righe.map((r) => ({
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

        setLoading(false);
      } catch (err) {
        console.error('Errore caricamento rapportino (print):', err);
        setLoadError('Errore nel caricamento del rapportino per la stampa.');
        setLoading(false);
      }
    }

    loadData();
  }, [profile?.id, crewRole, reportDate]);

  const capoName =
    (profile?.display_name || profile?.full_name || profile?.email || '')
      .toUpperCase()
      .trim() || '';

  // Format de date "26-11-2025" ou similaire
  let formattedDate = reportDate;
  if (reportDate) {
    try {
      const d = new Date(reportDate);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      formattedDate = `${dd}-${mm}-${yyyy}`;
    } catch {
      // on garde ce qu'on a
    }
  }

  return (
    <div className="min-h-screen bg-white text-black print:bg-white print:text-black">
      {/* Conteneur format A4 : peu de marges, look "feuille pleine" */}
      <div className="mx-auto px-8 pt-10 pb-8 max-w-[900px]">
        {/* Titre centré, discret mais présent */}
        <h1 className="text-center text-[12px] font-semibold tracking-wide mb-6">
          RAPPORTINO GIORNALIERO
        </h1>

        {/* En-tête COSTR / Commessa / Capo / Data */}
        <div className="flex justify-between text-[11px] mb-4">
          <div className="space-y-1">
            <div>
              <span className="font-semibold mr-1">COSTR.:</span>
              <span>{costr}</span>
            </div>
            <div>
              <span className="font-semibold mr-1">Commessa:</span>
              <span>{commessa}</span>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div>
              <span className="font-semibold mr-1">Capo Squadra:</span>
              <span>{capoName}</span>
            </div>
            <div>
              <span className="font-semibold mr-1">DATA:</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-[10px] mt-8">Caricamento del rapportino...</div>
        )}

        {loadError && !loading && (
          <div className="text-[10px] mt-4 text-red-700">{loadError}</div>
        )}

        {!loading && !loadError && (
          <>
            {/* Tableau principal : traits noirs épais, aucune couleur */}
            <table className="w-full border border-black border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left font-semibold w-24">
                    CATEGORIA
                  </th>
                  <th className="border border-black px-2 py-1 text-left font-semibold w-64">
                    DESCRIZIONE ATTIVITÀ
                  </th>
                  <th className="border border-black px-2 py-1 text-left font-semibold w-40">
                    OPERATORE
                  </th>
                  <th className="border border-black px-2 py-1 text-center font-semibold w-28">
                    TEMPO
                    <br />
                    IMPIEGATO
                  </th>
                  <th className="border border-black px-2 py-1 text-right font-semibold w-24">
                    PREVISTO
                  </th>
                  <th className="border border-black px-2 py-1 text-right font-semibold w-24">
                    PRODOTTO
                  </th>
                  <th className="border border-black px-2 py-1 text-left font-semibold w-40">
                    NOTE
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="border border-black px-2 py-3">
                      {r.categoria}
                    </td>
                    <td className="border border-black px-2 py-3">
                      {r.descrizione}
                    </td>
                    <td className="border border-black px-2 py-3">
                      <MultiLineCell value={r.operatori} />
                    </td>
                    <td className="border border-black px-2 py-3 text-center">
                      <MultiLineCell value={r.tempo} />
                    </td>
                    <td className="border border-black px-2 py-3 text-right">
                      {formatPrevisto(r.previsto)}
                    </td>
                    <td className="border border-black px-2 py-3 text-right font-semibold">
                      {/* PRODOTTO = résultat du jour → un peu plus "fort" */}
                      {r.prodotto}
                    </td>
                    <td className="border border-black px-2 py-3">
                      <MultiLineCell value={r.note} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Rien d'autre : pas de footer, pas de totals visibles.
                Le total est calculé seulement pour usage interne si besoin. */}
            <div className="hidden">
              {/* Juste pour débug éventuel sans polluer le rendu papier */}
              Prodotto totale: {prodottoTotale}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

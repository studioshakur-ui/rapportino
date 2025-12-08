// src/rapportino/RapportinoSheet.jsx
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

const IT_MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

export default function RapportinoSheet() {
  const { profile } = useAuth();

  const [rapportinoId, setRapportinoId] = useState(null);
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

  // Lecture du paramètre d'URL : id
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      setRapportinoId(idParam);
    } else {
      setLoading(false);
    }
  }, []);

  // Chargement des données depuis Supabase par ID
  useEffect(() => {
    async function loadData() {
      if (!rapportinoId) {
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const { data: rap, error: rapError } = await supabase
          .from('rapportini')
          .select('*')
          .eq('id', rapportinoId)
          .maybeSingle();

        if (rapError && rapError.code !== 'PGRST116') {
          throw rapError;
        }

        if (!rap) {
          setCostr('6368');
          setCommessa('SDC');
          setCrewRole('ELETTRICISTA');
          setRows(EMPTY_ROWS_BY_CREW.ELETTRICISTA);
          setLoading(false);
          return;
        }

        setCostr(rap.costr || rap.cost || '6368');
        setCommessa(rap.commessa || 'SDC');
        setCrewRole(rap.crew_role || 'ELETTRICISTA');
        setReportDate(rap.report_date || rap.data || '');

        const { data: righe, error: rowsError } = await supabase
          .from('rapportino_rows')
          .select('*')
          .eq('rapportino_id', rap.id)
          .order('row_index', { ascending: true });

        if (rowsError) throw rowsError;

        if (!righe || righe.length === 0) {
          setRows(
            EMPTY_ROWS_BY_CREW[rap.crew_role] ||
              EMPTY_ROWS_BY_CREW.ELETTRICISTA
          );
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

        // Lancer la boîte de dialogue d'impression
        setTimeout(() => {
          try {
            window.print();
          } catch {
            // ignore
          }
        }, 300);
      } catch (err) {
        console.error('Errore caricamento rapportino (print):', err);
        setLoadError('Errore nel caricamento del rapportino per la stampa.');
        setLoading(false);
      }
    }

    loadData();
  }, [rapportinoId]);

  const capoName =
    (profile?.display_name || profile?.full_name || profile?.email || '')
      .toUpperCase()
      .trim() || '';

  // Date en italien : 08 dicembre 2025
  let formattedDate = '';
  if (reportDate) {
    try {
      const d = new Date(reportDate);
      const dd = String(d.getDate()).padStart(2, '0');
      const monthName = IT_MONTHS[d.getMonth()] || '';
      const yyyy = d.getFullYear();
      formattedDate = `${dd} ${monthName} ${yyyy}`;
    } catch {
      formattedDate = reportDate;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Caricamento per la stampa…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black print:bg-white print:text-black">
      <div className="mx-auto px-8 pt-10 pb-8 max-w-[900px]">
        {/* Ligne 1 : titre centré */}
        <div className="text-center text-[16px] font-semibold mb-4 tracking-wide">
          RAPPORTINO GIORNALIERO
        </div>

        {/* Ligne 2 : COSTR */}
        <div className="mb-2 text-[11px]">
          <span className="font-semibold mr-2">COSTR.:</span>
          <span>{costr}</span>
        </div>

        {/* Ligne 3 : Commessa / Capo / Data */}
        <div className="mb-4 text-[11px] grid grid-cols-[1.1fr_1.2fr_0.9fr] items-center">
          <div>
            <span className="font-semibold mr-2">Commessa:</span>
            <span>{commessa}</span>
          </div>
          <div className="text-center">
            <span className="font-semibold mr-2">Capo Squadra:</span>
            <span>{capoName}</span>
          </div>
          <div className="text-right">
            <span className="font-semibold mr-2">Data:</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Tableau principal */}
        <table className="w-full border border-black border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 w-24 text-left">
                CATEGORIA
              </th>
              <th className="border border-black px-1 py-1 w-64 text-left">
                DESCRIZIONE
              </th>
              <th className="border border-black px-1 py-1 w-40 text-left">
                OPERATORE
              </th>
              <th className="border border-black px-1 py-1 w-32 text-left">
                TEMPO IMPIEGATO
              </th>
              <th className="border border-black px-1 py-1 w-24 text-right">
                PREVISTO
              </th>
              <th className="border border-black px-1 py-1 w-24 text-right">
                PRODOTTO
              </th>
              <th className="border border-black px-1 py-1 w-40 text-left">
                NOTE
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="align-top">
                <td className="border border-black px-1 py-1">
                  {r.categoria}
                </td>
                <td className="border border-black px-1 py-1">
                  {r.descrizione}
                </td>
                <td className="border border-black px-1 py-1">
                  <MultiLineCell value={r.operatori} />
                </td>
                <td className="border border-black px-1 py-1">
                  <MultiLineCell value={r.tempo} />
                </td>
                <td className="border border-black px-1 py-1 text-right">
                  {formatPrevisto(r.previsto)}
                </td>
                <td className="border border-black px-1 py-1 text-right">
                  {r.prodotto}
                </td>
                <td className="border border-black px-1 py-1">
                  <MultiLineCell value={r.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Prodotto totale */}
        <div className="mt-3 text-right text-[11px]">
          <span className="font-semibold mr-2">PRODOTTO TOTALE:</span>
          <span>{prodottoTotale.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

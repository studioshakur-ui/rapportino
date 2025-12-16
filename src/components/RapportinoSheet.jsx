import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';

const EMPTY_ROWS_BY_CREW = {
  ELETTRICISTA: [
    { categoria: 'STESURA', descrizione: 'STESURA', operatori: '', tempo: '', previsto: '150,0', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
  ],
  MECCANICO: [
    { categoria: 'MECC', descrizione: 'MECCANICA', operatori: '', tempo: '', previsto: '150,0', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
  ],
  CARPENTIERE: [
    { categoria: 'CARP', descrizione: 'CARPENTERIA', operatori: '', tempo: '', previsto: '150,0', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
    { categoria: '', descrizione: '', operatori: '', tempo: '', previsto: '', prodotto: '', note: '' },
  ],
};

function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatPrevisto(value) {
  const n = parseNumeric(value);
  if (n === null) return '';
  if (Number.isInteger(n)) return n.toFixed(1).replace('.', ',');
  return String(n).replace('.', ',');
}

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
  'gennaio','febbraio','marzo','aprile','maggio','giugno',
  'luglio','agosto','settembre','ottobre','novembre','dicembre',
];

export default function RapportinoSheet() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rapportinoId, setRapportinoId] = useState(null);

  const [costr, setCostr] = useState('');
  const [commessa, setCommessa] = useState('');
  const [crewRole, setCrewRole] = useState('ELETTRICISTA');
  const [reportDate, setReportDate] = useState('');
  const [rows, setRows] = useState(EMPTY_ROWS_BY_CREW.ELETTRICISTA);

  const totals = useMemo(
    () => rows.reduce((sum, r) => sum + (parseNumeric(r.prodotto) ?? 0), 0),
    [rows]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) setRapportinoId(idParam);
    else setLoading(false);
  }, []);

  // Neutraliser preview classes si l’utilisateur arrive depuis un preview
  useEffect(() => {
    try {
      document.documentElement.classList.remove('print-preview');
      document.body.classList.remove('print-preview');
    } catch {}
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        if (!rapportinoId) {
          setLoading(false);
          return;
        }

        const { data: rap, error: rapErr } = await supabase
          .from('rapportini')
          .select('*')
          .eq('id', rapportinoId)
          .single();

        if (rapErr) throw rapErr;

        setCostr(rap.costr || '');
        setCommessa(rap.commessa || '');
        setCrewRole((rap.crew_role || 'ELETTRICISTA').toUpperCase());
        setReportDate(rap.report_date || '');

        const { data: righe, error: rowsErr } = await supabase
          .from('rapportino_rows')
          .select('*')
          .eq('rapportino_id', rapportinoId)
          .order('row_index', { ascending: true });

        if (rowsErr) throw rowsErr;

        const base =
          EMPTY_ROWS_BY_CREW[(rap.crew_role || 'ELETTRICISTA').toUpperCase()] ||
          EMPTY_ROWS_BY_CREW.ELETTRICISTA;

        if (!righe || righe.length === 0) {
          setRows(base);
        } else {
          const mapped = righe.map((r) => ({
            categoria: r.categoria ?? '',
            descrizione: r.descrizione ?? '',
            operatori: r.operatori ?? '',
            tempo: r.tempo ?? '',
            previsto: r.previsto !== null && r.previsto !== undefined ? String(r.previsto) : '',
            prodotto: r.prodotto !== null && r.prodotto !== undefined ? String(r.prodotto) : '',
            note: r.note ?? '',
          }));
          setRows(mapped);
        }

        setLoading(false);

        setTimeout(() => {
          try {
            window.print();
          } catch {}
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

  let formattedDate = '';
  if (reportDate) {
    try {
      const d = new Date(`${reportDate}T00:00:00`);
      const day = String(d.getDate()).padStart(2, '0');
      const month = IT_MONTHS[d.getMonth()] || '';
      const year = d.getFullYear();
      formattedDate = `${day} ${month} ${year}`;
    } catch {
      formattedDate = reportDate;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-700">
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
    <div id="rapportino-document" className="min-h-screen bg-white text-black print:bg-white print:text-black">
      <div className="rapportino-document">
        <div className="text-center text-[16px] font-semibold mb-4 tracking-wide">
          RAPPORTINO GIORNALIERO
        </div>

        <div className="mb-2 text-[11px]">
          <span className="font-semibold mr-2">COSTR.:</span>
          <span>{costr}</span>
        </div>

        <div className="mb-3 text-[11px]">
          <span className="font-semibold mr-2">COMMESSA:</span>
          <span>{commessa}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 text-[11px]">
          <div className="text-left">
            <span className="font-semibold mr-2">Ruolo:</span>
            <span>{crewRole}</span>
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

        <table className="rapportino-table text-[10px]">
          <thead>
            <tr>
              <th className="px-1 py-1 text-left">CATEGORIA</th>
              <th className="px-1 py-1 text-left">DESCRIZIONE</th>
              <th className="px-1 py-1 text-left">OPERATORE</th>
              <th className="px-1 py-1 text-left">TEMPO IMPIEGATO</th>
              <th className="px-1 py-1 text-right">PREVISTO</th>
              <th className="px-1 py-1 text-right">PRODOTTO</th>
              <th className="px-1 py-1 text-left">NOTE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="align-top">
                <td className="px-1 py-1">{r.categoria}</td>
                <td className="px-1 py-1">{r.descrizione}</td>
                <td className="px-1 py-1"><MultiLineCell value={r.operatori} /></td>
                <td className="px-1 py-1"><MultiLineCell value={r.tempo} /></td>
                <td className="px-1 py-1 text-right">{formatPrevisto(r.previsto)}</td>
                <td className="px-1 py-1 text-right">{r.prodotto}</td>
                <td className="px-1 py-1"><MultiLineCell value={r.note} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 text-[11px] flex justify-end">
          <span className="font-semibold mr-2">Totale prodotto:</span>
          <span>{totals ? String(totals).replace('.', ',') : ''}</span>
        </div>
      </div>
    </div>
  );
}

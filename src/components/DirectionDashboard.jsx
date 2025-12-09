// src/components/DirectionDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

// Recharts – timeline & bar "operativi"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

// ECharts – vue INCA premium
import ReactECharts from 'echarts-for-react';

// Utils dates / format
function toISODate(d) {
  if (!(d instanceof Date)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function formatDateLabel(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT');
}

function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function DirectionDashboard() {
  const { profile } = useAuth();

  // Filtres globaux
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [costrFilter, setCostrFilter] = useState('');
  const [commessaFilter, setCommessaFilter] = useState('');

  // État data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rapportiniCurrent, setRapportiniCurrent] = useState([]);
  const [rapportiniPrevious, setRapportiniPrevious] = useState([]);
  const [incaTeorico, setIncaTeorico] = useState([]);

  // ─────────────────────────────
  // INIT : dernière semaine glissante
  // ─────────────────────────────
  useEffect(() => {
    if (dateFrom || dateTo) return;

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    setDateFrom(toISODate(start));
    setDateTo(toISODate(today));
  }, [dateFrom, dateTo]);

  // ─────────────────────────────
  // CHARGEMENT des données
  // ─────────────────────────────
  useEffect(() => {
    if (!profile) return;
    if (!dateFrom || !dateTo) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1) Fenêtre actuelle
        let qNow = supabase
          .from('rapportini')
          .select('*')
          .gte('report_date', dateFrom)
          .lte('report_date', dateTo)
          .order('report_date', { ascending: true });

        if (costrFilter.trim()) {
          // Dans rapportini on a costr + cost, on filtre sur costr si présent
          qNow = qNow.eq('costr', costrFilter.trim());
        }
        if (commessaFilter.trim()) {
          qNow = qNow.eq('commessa', commessaFilter.trim());
        }

        const { data: rapNow, error: rapNowErr } = await qNow;
        if (rapNowErr) throw rapNowErr;

        // 2) Fenêtre précédente (même durée juste avant) pour le Δ
        const fromDateObj = new Date(dateFrom);
        const toDateObj = new Date(dateTo);
        const diffMs = toDateObj.getTime() - fromDateObj.getTime();

        const prevTo = new Date(fromDateObj.getTime() - 24 * 60 * 60 * 1000);
        const prevFrom = new Date(prevTo.getTime() - diffMs);

        let qPrev = supabase
          .from('rapportini')
          .select('*')
          .gte('report_date', toISODate(prevFrom))
          .lte('report_date', toISODate(prevTo));

        if (costrFilter.trim()) {
          qPrev = qPrev.eq('costr', costrFilter.trim());
        }
        if (commessaFilter.trim()) {
          qPrev = qPrev.eq('commessa', commessaFilter.trim());
        }

        const { data: rapPrev, error: rapPrevErr } = await qPrev;
        if (rapPrevErr) throw rapPrevErr;

        // 3) INCA teorico – vue dédiée Direction
        let incaQ = supabase.from('direzione_inca_teorico').select('*');
        if (costrFilter.trim()) {
          incaQ = incaQ.eq('costr', costrFilter.trim());
        }
        if (commessaFilter.trim()) {
          incaQ = incaQ.eq('commessa', commessaFilter.trim());
        }
        const { data: incaRows, error: incaErr } = await incaQ;
        if (incaErr) throw incaErr;

        if (!cancelled) {
          setRapportiniCurrent(rapNow || []);
          setRapportiniPrevious(rapPrev || []);
          setIncaTeorico(incaRows || []);
        }
      } catch (err) {
        console.error('[DirectionDashboard] Errore caricamento dati:', err);
        if (!cancelled) {
          setError(
            "Errore nel caricamento dei dati Direzione. Riprova o contatta l’Ufficio."
          );
          setRapportiniCurrent([]);
          setRapportiniPrevious([]);
          setIncaTeorico([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [profile, dateFrom, dateTo, costrFilter, commessaFilter]);

  // ───────────────────────────
  // KPI PRINCIPAUX
  // ───────────────────────────
  const kpi = useMemo(() => {
    const currCount = rapportiniCurrent.length;
    const prevCount = rapportiniPrevious.length;

    const sumProd = (rows) =>
      rows.reduce((sum, r) => {
        const v =
          typeof r.prodotto_totale === 'number'
            ? r.prodotto_totale
            : typeof r.prodotto_totale === 'string'
            ? Number.parseFloat(r.prodotto_totale) || 0
            : 0;
        return sum + v;
      }, 0);

    const currProd = sumProd(rapportiniCurrent);
    const prevProd = sumProd(rapportiniPrevious);

    const currAvg = currCount ? currProd / currCount : 0;
    const prevAvg = prevCount ? prevProd / prevCount : 0;

    let incaPrevisti = 0;
    let incaRealizzati = 0;
    let incaPosati = 0;

    incaTeorico.forEach((row) => {
      if (typeof row.metri_previsti_totali === 'number') {
        incaPrevisti += row.metri_previsti_totali;
      }
      if (typeof row.metri_realizzati === 'number') {
        incaRealizzati += row.metri_realizzati;
      }
      if (typeof row.metri_posati === 'number') {
        incaPosati += row.metri_posati;
      }
    });

    const incaCover =
      incaPrevisti > 0 ? Math.min(100, (incaRealizzati / incaPrevisti) * 100) : 0;

    const deltaProd = currProd - prevProd;
    const deltaProdPerc = prevProd > 0 ? (deltaProd / prevProd) * 100 : null;

    return {
      currCount,
      prevCount,
      currProd,
      prevProd,
      currAvg,
      prevAvg,
      incaPrevisti,
      incaRealizzati,
      incaPosati,
      incaCover,
      deltaProd,
      deltaProdPerc,
    };
  }, [rapportiniCurrent, rapportiniPrevious, incaTeorico]);

  // ───────────────────────────
  // TIMELINE – Recharts
  // ───────────────────────────
  const timelineData = useMemo(() => {
    if (!rapportiniCurrent.length) return [];

    const map = new Map();

    rapportiniCurrent.forEach((r) => {
      const key = r.report_date || r.data || r.created_at?.slice(0, 10);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          label: formatDateLabel(key),
          rapportini: 0,
          prodotto: 0,
        });
      }
      const entry = map.get(key);
      entry.rapportini += 1;

      const prod =
        typeof r.prodotto_totale === 'number'
          ? r.prodotto_totale
          : typeof r.prodotto_totale === 'string'
          ? Number.parseFloat(r.prodotto_totale) || 0
          : 0;

      entry.prodotto += prod;
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [rapportiniCurrent]);

  // ───────────────────────────
  // INCA – ECharts
  // ───────────────────────────
  const incaOption = useMemo(() => {
    if (!incaTeorico.length) {
      return {
        title: {
          text: 'INCA · nessun dato disponibile',
          textStyle: { color: '#9ca3af', fontSize: 12 },
        },
        grid: { left: 40, right: 10, top: 30, bottom: 30 },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [],
        backgroundColor: 'transparent',
      };
    }

    const sorted = [...incaTeorico].sort(
      (a, b) => (b.metri_previsti_totali || 0) - (a.metri_previsti_totali || 0)
    );
    const top = sorted.slice(0, 12);

    const labels = top.map(
      (row) =>
        row.nome_file ||
        (row.commessa && `${row.costr || ''} · ${row.commessa}`.trim()) ||
        row.costr ||
        (row.caricato_il ? formatDateLabel(row.caricato_il) : '')
    );

    const previsti = top.map((r) => r.metri_previsti_totali || 0);
    const realizzati = top.map((r) => r.metri_realizzati || 0);
    const posati = top.map((r) => r.metri_posati || 0);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['Previsti', 'Realizzati', 'Posati'],
        textStyle: { color: '#e5e7eb', fontSize: 11 },
      },
      grid: {
        left: 40,
        right: 10,
        top: 40,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          color: '#9ca3af',
          fontSize: 10,
          rotate: 30,
        },
        axisLine: { lineStyle: { color: '#1f2937' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        axisLine: { lineStyle: { color: '#1f2937' } },
        splitLine: { lineStyle: { color: '#111827' } },
      },
      series: [
        {
          name: 'Previsti',
          type: 'bar',
          data: previsti,
          emphasis: { focus: 'series' },
        },
        {
          name: 'Realizzati',
          type: 'bar',
          data: realizzati,
          emphasis: { focus: 'series' },
        },
        {
          name: 'Posati',
          type: 'line',
          data: posati,
          smooth: true,
        },
      ],
      color: ['#38bdf8', '#22c55e', '#f97316'],
    };
  }, [incaTeorico]);

  // ───────────────────────────
  // RISQUES & NEXT ACTIONS
  // ───────────────────────────
  const risks = useMemo(() => {
    const out = [];

    // 1) Baisse de production
    if (kpi.prevProd > 0 && kpi.deltaProdPerc != null && kpi.deltaProdPerc < -10) {
      out.push({
        level: 'ALTA',
        title: 'Produzione in calo',
        detail: `~${formatNumber(Math.abs(kpi.deltaProdPerc))}% in meno rispetto alla finestra precedente.`,
        hint: 'Verifica commesse critiche e blocchi eventuali in cantiere.',
      });
    }

    // 2) Peu de rapportini
    if (kpi.currCount > 0 && kpi.currCount < kpi.prevCount) {
      out.push({
        level: 'MEDIA',
        title: 'Meno rapportini registrati',
        detail: `${kpi.currCount} vs ${kpi.prevCount} nella finestra precedente.`,
        hint: 'Controlla eventuali giornate mancanti o squadre non allineate al digitale.',
      });
    }

    // 3) Copertura INCA basse
    if (kpi.incaCover > 0 && kpi.incaCover < 50) {
      out.push({
        level: 'ALTA',
        title: 'Copertura INCA bassa',
        detail: `Copertura stimata ~${formatNumber(kpi.incaCover)}% rispetto ai metri previsti.`,
        hint: 'Individua i cavi più critici in INCA Cockpit e pianifica un recupero mirato.',
      });
    }

    if (!out.length && (rapportiniCurrent.length || incaTeorico.length)) {
      out.push({
        level: 'BASSA',
        title: 'Nessun rischio evidente',
        detail: 'Indicatori principali allineati rispetto al periodo precedente.',
        hint: 'Usa i filtri per analizzare singole navi / commesse.',
      });
    }

    if (!out.length) {
      out.push({
        level: 'INFO',
        title: 'Nessun dato nel range selezionato',
        detail: 'Seleziona un periodo con attività per vedere rischi e KPI.',
        hint: 'Inizia con gli ultimi 7–30 giorni su una nave attiva.',
      });
    }

    return out;
  }, [kpi, rapportiniCurrent.length, incaTeorico.length]);

  const nextActions = useMemo(() => {
    const actions = [];

    if (kpi.deltaProdPerc != null && kpi.deltaProdPerc < -10) {
      actions.push(
        'Programmare un allineamento rapido con i Capi sulle commesse con produzione in calo.'
      );
    }

    if (kpi.incaCover > 0 && kpi.incaCover < 60) {
      actions.push(
        'Richiedere una review INCA–campo con Ufficio per verificare cavi scoperti / incompleti.'
      );
    }

    if (!actions.length && rapportiniCurrent.length) {
      actions.push(
        'Mantenere la pianificazione attuale; monitorare solo eventuali scostamenti nei prossimi giorni.'
      );
    }

    if (!actions.length) {
      actions.push('Applica un filtro periodo con dati per sbloccare le raccomandazioni.');
    }

    return actions;
  }, [kpi, rapportiniCurrent.length]);

  // ───────────────────────────
  // RENDER
  // ───────────────────────────
  return (
    <div className="space-y-5">
      {/* HEADER + FILTRES TEMPS */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            Direzione · CNCS / CORE
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
            Dashboard Direzione
          </h1>
          <p className="mt-1 text-[12px] text-slate-400 max-w-xl">
            Vista sintetica di produzione, avanzamento cavi INCA e rischi operativi.
            Filtri per periodo, nave e commessa. Tutto in sola lettura.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 text-[11px]">
          <div className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full border border-emerald-500/70 bg-emerald-900/40 text-emerald-100">
              Direzione · sola lettura
            </span>
            <span className="px-2 py-0.5 rounded-full border border-sky-500/70 bg-sky-900/40 text-sky-100">
              Pronto per drill-down verso Ufficio / Capo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Finestra:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-100"
            />
            <span className="text-slate-500">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-100"
            />
          </div>
        </div>
      </header>

      {/* FILTRES NAVIRE / COMMESSA */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">COSTR</span>
          <input
            type="text"
            value={costrFilter}
            onChange={(e) => setCostrFilter(e.target.value)}
            placeholder="es. 6368"
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">Commessa</span>
          <input
            type="text"
            value={commessaFilter}
            onChange={(e) => setCommessaFilter(e.target.value)}
            placeholder="es. ICING"
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setCostrFilter('');
              setCommessaFilter('');
            }}
            className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-950/80 text-[11px] text-slate-300 hover:bg-slate-900"
          >
            Reset filtri
          </button>
        </div>
      </section>

      {/* MESSAGES ERREUR / LOADING */}
      {error && (
        <div className="rounded-xl border border-rose-500/60 bg-rose-900/30 px-4 py-2 text-[12px] text-rose-100">
          {error}
        </div>
      )}
      {loading && !error && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-[12px] text-slate-300">
          Caricamento dati Direzione…
        </div>
      )}

      {/* STRIP KPI (6 tuiles) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1 – Rapportini */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Rapportini
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {kpi.currCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {kpi.prevCount
              ? `${kpi.prevCount} nella finestra precedente`
              : 'Nessun storico precedente sul range selezionato.'}
          </div>
        </div>

        {/* KPI 2 – Prodotto totale */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Prodotto totale
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-300">
            {formatNumber(kpi.currProd)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>vs periodo precedente</span>
            {kpi.deltaProdPerc != null && (
              <span
                className={[
                  'ml-1 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px]',
                  kpi.deltaProdPerc > 0
                    ? 'border-emerald-500 text-emerald-300'
                    : 'border-rose-500 text-rose-300',
                ].join(' ')}
              >
                {kpi.deltaProdPerc > 0 ? '▲' : '▼'}{' '}
                {formatNumber(Math.abs(kpi.deltaProdPerc))}%
              </span>
            )}
          </div>
        </div>

        {/* KPI 3 – Prod moyen / rapportino */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Prod. medio / rapportino
          </div>
          <div className="mt-1 text-2xl font-semibold text-sky-300">
            {formatNumber(kpi.currAvg)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {kpi.prevAvg
              ? `Prev: ${formatNumber(kpi.prevAvg)}`
              : 'Nessun valore medio precedente.'}
          </div>
        </div>

        {/* KPI 4 – INCA previsti */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            INCA · metri previsti
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {formatNumber(kpi.incaPrevisti)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Somma metri teorici sui file INCA filtrati.
          </div>
        </div>

        {/* KPI 5 – INCA realizzati */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            INCA · metri realizzati
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-300">
            {formatNumber(kpi.incaRealizzati)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Metri marcati come completati / realizzati.
          </div>
        </div>

        {/* KPI 6 – Copertura INCA */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Copertura INCA stimata
          </div>
          <div className="mt-1 text-2xl font-semibold text-fuchsia-300">
            {kpi.incaCover ? `${formatNumber(kpi.incaCover)}%` : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Rapporto metri realizzati / previsti.
          </div>
        </div>
      </section>

      {/* LIGNE PRINCIPALE : Timeline + INCA */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-4">
        {/* Timeline Recharts */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Timeline produzione
              </div>
              <div className="text-xs text-slate-300">
                Rapportini e prodotto giornaliero nel periodo selezionato.
              </div>
            </div>
          </div>
          <div className="h-60 w-full">
            {timelineData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#1e293b',
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#e5e7eb' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="prodotto"
                    name="Prodotto"
                    fill="#38bdf8"
                    barSize={18}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rapportini"
                    name="Rapportini"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
                Nessun dato disponibile per il periodo selezionato.
              </div>
            )}
          </div>
        </div>

        {/* INCA – ECharts */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                INCA · confronto teorico / reale
              </div>
              <div className="text-xs text-slate-300">
                Prime commesse / file INCA per metri previsti, realizzati e posati.
              </div>
            </div>
          </div>
          <div className="h-60 w-full">
            <ReactECharts
              option={incaOption}
              style={{ width: '100%', height: '100%' }}
              notMerge
              lazyUpdate
            />
          </div>
        </div>
      </section>

      {/* RISCHI + NEXT ACTIONS */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)] gap-4">
        {/* Panneau Risques */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-[12px]">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">
            Pannello rischi
          </div>
          <p className="text-slate-400 mb-2">
            Elenco sintetico dei rischi principali derivati da produzione e INCA
            nel periodo selezionato.
          </p>
          <ul className="space-y-2">
            {risks.map((r, idx) => (
              <li
                key={idx}
                className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-100">
                    {r.title}
                  </span>
                  <span
                    className={[
                      'px-2 py-0.5 rounded-full text-[10px] border',
                      r.level === 'ALTA'
                        ? 'border-rose-500 text-rose-300'
                        : r.level === 'MEDIA'
                        ? 'border-amber-400 text-amber-200'
                        : 'border-emerald-400 text-emerald-200',
                    ].join(' ')}
                  >
                    {r.level}
                  </span>
                </div>
                <div className="text-slate-300">{r.detail}</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Suggerimento: {r.hint}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Next actions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-[12px]">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">
            Next actions · Direzione
          </div>
          <p className="text-slate-400 mb-2">
            Piccolo elenco operativo per la Direzione, basato sugli indicatori
            attuali. Perfetto per la riunione mattutina.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300">
            {nextActions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ol>
          <div className="mt-3 border-t border-slate-800 pt-2 text-[11px] text-slate-500">
            In futuro questo pannello potrà aprire direttamente le viste Manager /
            Ufficio filtrate (drill-down sulle commesse critiche).
          </div>
        </div>
      </section>
    </div>
  );
}

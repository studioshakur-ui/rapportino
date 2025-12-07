// src/inca/IncaCaviTable.jsx
import React, { useMemo, useState } from 'react';

export default function IncaCaviTable({ cavi, loading }) {
  const [search, setSearch] = useState('');
  const [statoFilter, setStatoFilter] = useState('');
  const [livelloFilter, setLivelloFilter] = useState('');

  const {
    filtered,
    distinctStato,
    distinctLivello,
  } = useMemo(() => {
    const list = Array.isArray(cavi) ? cavi : [];
    const norm = (v) => (v || '').toString().toLowerCase();

    const statoSet = new Set(
      list
        .map((c) => (c.stato_cantiere || '').trim())
        .filter((v) => v && v !== '-')
    );
    const livelloSet = new Set(
      list
        .map((c) => (c.livello || '').trim())
        .filter((v) => v && v !== '-')
    );

    const distinctStato = Array.from(statoSet).sort((a, b) =>
      a.localeCompare(b, 'it-IT')
    );
    const distinctLivello = Array.from(livelloSet).sort((a, b) =>
      a.localeCompare(b, 'it-IT')
    );

    const s = norm(search);

    const filtered = list.filter((c) => {
      if (statoFilter && (c.stato_cantiere || '').trim() !== statoFilter) {
        return false;
      }
      if (livelloFilter && (c.livello || '').trim() !== livelloFilter) {
        return false;
      }
      if (!s) return true;

      return (
        norm(c.codice).includes(s) ||
        norm(c.descrizione).includes(s) ||
        norm(c.marca_cavo).includes(s) ||
        norm(c.tipo).includes(s) ||
        norm(c.sezione).includes(s)
      );
    });

    return { filtered, distinctStato, distinctLivello };
  }, [cavi, search, statoFilter, livelloFilter]);

  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
      {/* Barre filtres */}
      <div className="px-3 py-2 border-b border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
        <div className="text-slate-400">
          Lista cavi ·{' '}
          <span className="text-slate-200">
            {Array.isArray(cavi) ? cavi.length : 0}
          </span>
        </div>

        <div className="flex-1" />

        <select
          value={statoFilter}
          onChange={(e) => setStatoFilter(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">Tutti gli stati cantiere</option>
          {distinctStato.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={livelloFilter}
          onChange={(e) => setLivelloFilter(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">Tutti i livelli</option>
          {distinctLivello.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Cerca per codice, descrizione, tipo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-48 md:w-64"
        />
      </div>

      {/* Table cavi */}
      <div className="max-h-[420px] overflow-auto text-[11px]">
        <table className="w-full border-collapse">
          <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
            <tr className="text-slate-400">
              <th className="px-3 py-2 text-left font-normal w-40">Codice</th>
              <th className="px-3 py-2 text-left font-normal w-44">
                Descrizione
              </th>
              <th className="px-3 py-2 text-left font-normal w-32">
                Marca / Livello
              </th>
              <th className="px-3 py-2 text-left font-normal w-32">
                Tipo / Sezione
              </th>
              <th className="px-3 py-2 text-right font-normal w-28">
                Metri teo
              </th>
              <th className="px-3 py-2 text-right font-normal w-28">
                Prev / Posati
              </th>
              <th className="px-3 py-2 text-left font-normal w-40">
                Stato cantiere
              </th>
              <th className="px-3 py-2 text-left font-normal">
                Situazione cavo
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  Nessun cavo trovato con questi filtri.
                </td>
              </tr>
            )}

            {filtered.map((cavo) => (
              <tr
                key={cavo.id}
                className="border-t border-slate-900 hover:bg-slate-900/60"
              >
                <td className="px-3 py-2 text-slate-100 font-mono">
                  {cavo.codice || '—'}
                </td>
                <td className="px-3 py-2 text-slate-200">
                  {cavo.descrizione || '—'}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  <div>{cavo.marca_cavo || '—'}</div>
                  <div className="text-[10px] text-slate-500">
                    Livello: {cavo.livello || '—'}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-300">
                  <div>{cavo.tipo || '—'}</div>
                  <div className="text-[10px] text-slate-500">
                    Sezione: {cavo.sezione || '—'}
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-slate-100">
                  {cavo.metri_teo != null
                    ? Number(cavo.metri_teo).toLocaleString('it-IT', {
                        maximumFractionDigits: 1,
                      })
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right text-slate-100">
                  <div>
                    {cavo.metri_previsti != null
                      ? Number(cavo.metri_previsti).toLocaleString('it-IT', {
                          maximumFractionDigits: 1,
                        })
                      : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Posati:{' '}
                    {cavo.metri_posati_teorici != null
                      ? Number(cavo.metri_posati_teorici).toLocaleString(
                          'it-IT',
                          { maximumFractionDigits: 1 }
                        )
                      : '—'}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-200">
                  {cavo.stato_cantiere || '—'}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {cavo.situazione_cavo || cavo.situazione || '—'}
                </td>
              </tr>
            ))}

            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  Caricamento cavi INCA…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

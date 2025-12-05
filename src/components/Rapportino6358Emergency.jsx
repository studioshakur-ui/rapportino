// src/components/Rapportino6358Emergency.jsx
import React, { useMemo, useState } from 'react';

function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

function getBaseRows() {
  return [
    {
      categoria: 'STESURA',
      descrizione: 'STESURA',
      operatori: '',
      tempo: '',
      previsto: '150',
      prodotto: '',
      note: '',
    },
    {
      categoria: 'STESURA',
      descrizione: 'FASCETTATURA CAVI',
      operatori: '',
      tempo: '',
      previsto: '600',
      prodotto: '',
      note: '',
    },
    {
      categoria: 'STESURA',
      descrizione: 'RIPRESA CAVI',
      operatori: '',
      tempo: '',
      previsto: '150',
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
  ];
}

export default function Rapportino6358Emergency() {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [costr, setCostr] = useState('6358');
  const [commessa, setCommessa] = useState('ICING');
  const [data, setData] = useState(todayISO);
  const [capo, setCapo] = useState('MAIGA HAMIDOU');
  const [rows, setRows] = useState(getBaseRows);

  const prodottoTotale = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const v = parseNumeric(r.prodotto);
        if (v === null) return sum;
        return sum + v;
      }, 0),
    [rows],
  );

  const handleRowChange = (index, field, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        categoria: 'STESURA',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Bandeau haut simple (non imprimé) */}
      <header className="no-print border-b border-slate-300 bg-slate-900 text-slate-50 px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            CORE · RAPPORTINO 6358 (EMERGENZA)
          </span>
          <span className="text-sm">
            Capo squadra:{' '}
            <span className="font-semibold text-slate-50">{capo}</span>
          </span>
          <span className="text-[11px] text-slate-400">
            COSTR {costr} · Commessa {commessa}
          </span>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="px-3 py-1.5 rounded-md border border-sky-600 bg-sky-500 text-slate-950 text-xs font-medium hover:bg-sky-400"
        >
          Esporta / Stampa
        </button>
      </header>

      {/* Feuille A4 horizontale centrale */}
      <main className="flex-1 flex justify-center py-4 px-2">
        <div className="bg-white shadow-md shadow-slate-300 rounded-lg w-[1120px] max-w-full px-6 py-4 print:shadow-none print:border-none">
          {/* Bandeau info haut (non imprimé) */}
          <div className="no-print flex items-center justify-between mb-2 text-[12px] text-slate-600">
            <div>Rapportino 6358 · ICING · Elettricista</div>
            <div>
              Prodotto totale:{' '}
              <span className="font-mono font-semibold">
                {prodottoTotale.toFixed(2)}
              </span>
            </div>
          </div>

          {/* HEADER papier */}
          <div className="mb-3">
            <div className="text-center text-[16px] font-semibold mb-3 tracking-wide">
              RAPPORTINO GIORNALIERO
            </div>

            <div className="mb-1 flex gap-8">
              <div>
                <span className="font-semibold mr-2">COSTR.:</span>
                <input
                  type="text"
                  value={costr}
                  onChange={(e) => setCostr(e.target.value)}
                  className="inline-block w-32 border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1"
                />
              </div>
              <div>
                <span className="font-semibold mr-2">Commessa:</span>
                <input
                  type="text"
                  value={commessa}
                  onChange={(e) => setCommessa(e.target.value)}
                  className="inline-block w-32 border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1fr] items-center gap-2">
              <div>
                <span className="font-semibold mr-2">Capo Squadra:</span>
                <input
                  type="text"
                  value={capo}
                  onChange={(e) => setCapo(e.target.value.toUpperCase())}
                  className="inline-block border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1 w-64"
                />
              </div>
              <div className="text-right">
                <span className="font-semibold mr-2">DATA:</span>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* TABLE principale */}
          <div className="border border-slate-300 rounded-md overflow-hidden">
            <table className="w-full border-collapse text-[12px]">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="w-28 border-r border-slate-300 px-2 py-1 text-left">
                    CATEGORIA
                  </th>
                  <th className="w-72 border-r border-slate-300 px-2 py-1 text-left">
                    DESCRIZIONE ATTIVITÀ
                  </th>
                  <th className="w-40 border-r border-slate-300 px-2 py-1 text-left">
                    OPERATORE
                  </th>
                  <th className="w-32 border-r border-slate-300 px-2 py-1 text-left">
                    Tempo impiegato
                  </th>
                  <th className="w-24 border-r border-slate-300 px-2 py-1 text-right">
                    PREVISTO
                  </th>
                  <th className="w-24 border-r border-slate-300 px-2 py-1 text-right">
                    PRODOTTO
                  </th>
                  <th className="px-2 py-1 text-left">
                    NOTE
                  </th>
                  <th className="px-2 py-1 text-xs w-6 no-print">
                    -
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-t border-slate-200 align-top">
                    <td className="border-r border-slate-200 px-2 py-1">
                      <input
                        type="text"
                        value={r.categoria}
                        onChange={(e) =>
                          handleRowChange(idx, 'categoria', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] focus:outline-none"
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1">
                      <textarea
                        value={r.descrizione}
                        onChange={(e) =>
                          handleRowChange(idx, 'descrizione', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none"
                        rows={3}
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1">
                      <textarea
                        value={r.operatori}
                        onChange={(e) =>
                          handleRowChange(idx, 'operatori', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none"
                        rows={3}
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1">
                      <textarea
                        value={r.tempo}
                        onChange={(e) =>
                          handleRowChange(idx, 'tempo', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none"
                        rows={3}
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1 text-right">
                      <input
                        type="text"
                        value={r.previsto}
                        onChange={(e) =>
                          handleRowChange(idx, 'previsto', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] text-right focus:outline-none"
                      />
                    </td>
                    <td className="border-r border-slate-200 px-2 py-1 text-right">
                      <input
                        type="text"
                        value={r.prodotto}
                        onChange={(e) =>
                          handleRowChange(idx, 'prodotto', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] text-right focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1 relative">
                      <textarea
                        value={r.note}
                        onChange={(e) =>
                          handleRowChange(idx, 'note', e.target.value)
                        }
                        className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none"
                        rows={3}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="no-print absolute -right-2 top-1 text-xs text-slate-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </td>
                    <td className="px-2 py-1 text-center no-print" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions bas (non imprimé) */}
          <div className="mt-3 flex justify-between items-center no-print text-[11px]">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded-md border border-slate-400 text-slate-700 bg-slate-100 hover:bg-slate-200"
            >
              + Aggiungi riga
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 rounded-md border border-sky-600 bg-sky-500 text-slate-950 hover:bg-sky-400"
            >
              Esporta / Stampa
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

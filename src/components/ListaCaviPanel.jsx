// src/components/ListaCaviPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';

// Normalisation agressive pour matcher les headers
function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD') // enlever les accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '') // espaces
    .replace(/[^a-z0-9]/g, ''); // ponctuation
}

function isCodiceHeader(h) {
  return (
    h.includes('codice') ||
    h.includes('cod') ||
    h.includes('cavo') ||
    h === 'id' ||
    h.startsWith('idcavo') ||
    h.startsWith('ref') ||
    h.includes('sigla')
  );
}

function isDescrizioneHeader(h) {
  return (
    h.includes('descrizione') ||
    h.includes('descr') ||
    h.includes('descritt') ||
    h.includes('description') ||
    h.includes('desc')
  );
}

function isMetriHeader(h) {
  // On gère explicitement "Lunghezza di disegno"
  return (
    h.includes('lunghezzadidisegno') ||
    h.includes('lunghezzadisegno') ||
    h.includes('lunghezza') ||
    h.includes('metri') ||
    h === 'ml' ||
    h === 'mlineari' ||
    h === 'mtotali' ||
    h === 'metrototale' ||
    h === 'mtot' ||
    h === 'mtotale'
  );
}

function parseNumberLike(value) {
  if (value === null || value === undefined) return 0;
  const s = String(value).trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, '').replace(',', '.'); // 1.234,56 → 1234.56
  const n = Number(normalized);
  if (Number.isNaN(n)) return 0;
  return n;
}

export default function ListaCaviPanel({ rapportinoId }) {
  const [cavi, setCavi] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | ZERO | PARTIAL | FULL
  const [showZero, setShowZero] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [massPercent, setMassPercent] = useState('');
  const [loading, setLoading] = useState(false);
  const [importInfo, setImportInfo] = useState(null);
  const [importWarning, setImportWarning] = useState(null);
  const [saving, setSaving] = useState(false);

  // Charger la lista cavi existante depuis la DB
  useEffect(() => {
    if (!rapportinoId) {
      setCavi([]);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setImportInfo(null);
      setImportWarning(null);
      try {
        const { data, error } = await supabase
          .from('rapportino_cavi')
          .select('*')
          .eq('rapportino_id', rapportinoId)
          .order('id', { ascending: true });

        if (error) throw error;

        if (!active) return;

        const mapped =
          data?.map((row, idx) => ({
            id: row.id ?? `${row.rapportino_id}-${idx}`,
            codice: row.codice ?? '',
            descrizione: row.descrizione ?? '',
            metriTotali: Number(row.metri_totali || 0),
            percentuale: Number(row.percentuale || 0),
            metriPosati: Number(row.metri_posati || 0),
          })) ?? [];

        setCavi(mapped);
      } catch (err) {
        console.error('Errore caricamento lista cavi:', err);
        if (active) {
          setCavi([]);
          setImportWarning(
            'Errore durante il caricamento della lista cavi. Puoi comunque importare nuovi file.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [rapportinoId]);

  // IMPORT EXCEL/CSV (multi-file, multi-sheet, très robuste)
  const handleImport = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImportInfo(null);
    setImportWarning(null);

    let imported = [];
    let totalCaviThisRun = 0;
    let someFileMissingMetri = false;

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });

        let foundMetriInThisFile = false;
        let localCavi = [];

        // On parcourt TOUTES les feuilles du fichier
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          if (!ws) continue;

          const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (!json || !json.length) continue;

          // On cherche la première ligne d'entête avec au moins 2 cellules non vides
          let headerRowIndex = 0;
          let header = json[0];

          for (let i = 0; i < json.length; i++) {
            const row = json[i];
            const nonEmptyCount = row.filter((cell) =>
              String(cell || '').trim()
            ).length;
            if (nonEmptyCount >= 2) {
              headerRowIndex = i;
              header = row;
              break;
            }
          }

          const normHeader = header.map(normalizeHeader);

          const idxCodice = normHeader.findIndex(isCodiceHeader);
          const idxDesc = normHeader.findIndex(isDescrizioneHeader);
          const idxMetri = normHeader.findIndex(isMetriHeader);

          if (idxCodice === -1 && idxDesc === -1) {
            // Feuille pas intéressante, on skippe
            continue;
          }

          if (idxMetri === -1) {
            // On traitera les cavi mais avec 0 mètres
            someFileMissingMetri = true;
          } else {
            foundMetriInThisFile = true;
          }

          for (let r = headerRowIndex + 1; r < json.length; r++) {
            const row = json[r];
            if (!row) continue;

            const codice = String(row[idxCodice] ?? '').trim();
            const descrizione = String(row[idxDesc] ?? '').trim();
            const metriTotali =
              idxMetri === -1 ? 0 : parseNumberLike(row[idxMetri]);

            if (!codice && !descrizione) continue;

            localCavi.push({
              id: `${file.name}-${sheetName}-${r}-${codice}`,
              codice,
              descrizione,
              metriTotali,
              percentuale: 0,
              metriPosati: 0,
            });
          }
        }

        totalCaviThisRun += localCavi.length;
        imported.push(...localCavi);

        if (!foundMetriInThisFile) {
          // Aucun sheet de ce fichier n’avait de colonne mètres reconnue
          someFileMissingMetri = true;
        }
      } catch (err) {
        console.error('Errore import file:', file.name, err);
        setImportWarning(
          `Errore durante l'import del file ${file.name}. Alcune righe potrebbero non essere state importate.`
        );
      }
    }

    // Fusion : anciens cavi + nouveaux
    const map = new Map();

    // 1) On met d'abord ceux déjà existants en base
    for (const c of cavi) {
      const key = `${c.codice}__${c.descrizione}`;
      map.set(key, { ...c });
    }

    // 2) On ajoute / met à jour avec les imports
    for (const c of imported) {
      const key = `${c.codice}__${c.descrizione}`;
      if (!map.has(key)) {
        map.set(key, { ...c });
      } else {
        const prev = map.get(key);
        // On garde les mètres totaux les plus grands
        const metriTotali = Math.max(
          Number(prev.metriTotali || 0),
          Number(c.metriTotali || 0)
        );
        map.set(key, {
          ...prev,
          metriTotali,
        });
      }
    }

    const merged = Array.from(map.values());
    setCavi(merged);
    setSelectedIds([]);
    setMassPercent('');

    setImportInfo(
      `Import completato: ${totalCaviThisRun} cavi aggiunti/aggiornati (multi-file). Ricorda di salvare.`
    );

    if (someFileMissingMetri) {
      setImportWarning(
        "Colonna lunghezza/metri non trovata in almeno un file. Se puoi, usa 'Lunghezza di disegno', 'Lunghezza', 'Metri' o simili."
      );
    }

    e.target.value = '';
  };

  // Filtres
  const filteredCavi = useMemo(() => {
    const term = search.trim().toLowerCase();

    return cavi.filter((c) => {
      const pct = Number(c.percentuale || 0);

      // Filtre de texte
      if (term) {
        const match =
          (c.codice || '').toLowerCase().includes(term) ||
          (c.descrizione || '').toLowerCase().includes(term);
        if (!match) return false;
      }

      // Afficher / masquer les 0 %
      if (!showZero && pct === 0) return false;

      if (filterStatus === 'ZERO' && pct !== 0) return false;
      if (filterStatus === 'PARTIAL' && (pct <= 0 || pct >= 100)) return false;
      if (filterStatus === 'FULL' && pct !== 100) return false;

      return true;
    });
  }, [cavi, search, filterStatus, showZero]);

  const totalMetriPosati = useMemo(() => {
    return cavi.reduce((sum, c) => sum + (Number(c.metriPosati) || 0), 0);
  }, [cavi]);

  const allVisibleSelected =
    filteredCavi.length > 0 &&
    filteredCavi.every((c) => selectedIds.includes(c.id));

  const handleToggleSelectAll = (checked) => {
    if (checked) setSelectedIds(filteredCavi.map((c) => c.id));
    else setSelectedIds([]);
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyPercentToSelection = (value) => {
    const perc = Number(value);
    if (Number.isNaN(perc)) return;
    const pct = Math.max(0, Math.min(100, perc));

    const newCavi = cavi.map((c) => {
      if (!selectedIds.includes(c.id)) return c;
      const metriTot = Number(c.metriTotali || 0);
      const metriPosati = Math.round(metriTot * (pct / 100) * 100) / 100;
      return {
        ...c,
        percentuale: pct,
        metriPosati,
      };
    });

    setCavi(newCavi);
  };

  const applyPercentToSingle = (id, value) => {
    const perc = Number(value);
    if (Number.isNaN(perc)) return;
    const pct = Math.max(0, Math.min(100, perc));

    const newCavi = cavi.map((c) => {
      if (c.id !== id) return c;
      const metriTot = Number(c.metriTotali || 0);
      const metriPosati = Math.round(metriTot * (pct / 100) * 100) / 100;
      return {
        ...c,
        percentuale: pct,
        metriPosati,
      };
    });

    setCavi(newCavi);
  };

  const handleSaveListaCavi = async () => {
    if (!rapportinoId) {
      setImportWarning(
        'Salva prima il rapportino principale prima di salvare la lista cavi.'
      );
      return;
    }

    setSaving(true);
    setImportWarning(null);
    try {
      // On remplace complètement la liste du jour
      const { error: delError } = await supabase
        .from('rapportino_cavi')
        .delete()
        .eq('rapportino_id', rapportinoId);

      if (delError) throw delError;

      if (cavi.length > 0) {
        const payload = cavi.map((c) => ({
          rapportino_id: rapportinoId,
          codice: c.codice,
          descrizione: c.descrizione,
          metri_totali: Number(c.metriTotali || 0),
          percentuale: Number(c.percentuale || 0),
          metri_posati: Number(c.metriPosati || 0),
        }));

        const { error: insError } = await supabase
          .from('rapportino_cavi')
          .insert(payload);

        if (insError) throw insError;
      }

      setImportInfo(
        'Lista cavi salvata correttamente. I metri posati sono disponibili per il calcolo del prodotto.'
      );
    } catch (err) {
      console.error('Errore salvataggio lista cavi:', err);
      setImportWarning(
        'Errore durante il salvataggio della lista cavi. Riprova più tardi.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 border border-slate-200 rounded-lg bg-slate-50/80 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-800">
          Lista cavi del giorno
        </h2>
        <label className="text-[11px] text-slate-600 flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={showZero}
            onChange={(e) => setShowZero(e.target.checked)}
          />
          Mostra anche 0%
        </label>
      </div>

      {importInfo && (
        <div className="mb-2 text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-300 rounded px-3 py-1.5">
          {importInfo}
        </div>
      )}

      {importWarning && (
        <div className="mb-2 text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded px-3 py-1.5">
          {importWarning}
        </div>
      )}

      {/* Barre de recherche + import */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded px-2 py-1 text-[11px]"
            placeholder="🔍 Cerca per codice o descrizione..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="text-[11px] text-slate-500 cursor-pointer">
            <span className="mr-1 border border-slate-300 rounded px-2 py-1 inline-block hover:bg-slate-100">
              Importa
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Filtres de status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-600">Filtro:</span>
            {[
              ['ALL', 'Tutti'],
              ['ZERO', '0%'],
              ['PARTIAL', '1–99%'],
              ['FULL', '100%'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`px-2 py-0.5 rounded border text-[11px] ${
                  filterStatus === key
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setFilterStatus(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500">
            Cavi: {cavi.length} · Filtrati: {filteredCavi.length}
          </div>
        </div>
      </div>

      {/* Barre de sélection multiple */}
      {selectedIds.length > 0 && (
        <div className="mb-2 border border-emerald-200 bg-emerald-50 rounded px-2 py-1 flex items-center justify-between">
          <div className="text-[11px] text-emerald-900">
            Cavi selezionati:{' '}
            <span className="font-semibold">{selectedIds.length}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <input
              type="number"
              className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right"
              value={massPercent}
              onChange={(e) => setMassPercent(e.target.value)}
              placeholder="%"
            />
            <button
              type="button"
              className="px-2 py-0.5 rounded border border-emerald-500 text-emerald-700 hover:bg-emerald-100"
              onClick={() => applyPercentToSelection(massPercent)}
            >
              Imposta %
            </button>
            <button
              type="button"
              className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => applyPercentToSelection(100)}
            >
              100%
            </button>
            <button
              type="button"
              className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => applyPercentToSelection(0)}
            >
              0%
            </button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="border border-slate-200 rounded overflow-auto max-h-[320px] bg-white">
        <table className="w-full text-[11px] table-fixed">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="w-8 px-1 py-1 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => handleToggleSelectAll(e.target.checked)}
                />
              </th>
              <th className="w-40 px-1 py-1 text-left">Codice</th>
              <th className="px-1 py-1 text-left">Descrizione</th>
              <th className="w-20 px-1 py-1 text-right">Metri</th>
              <th className="w-20 px-1 py-1 text-right">% posa</th>
              <th className="w-24 px-1 py-1 text-right">Posati</th>
            </tr>
          </thead>
          <tbody>
            {filteredCavi.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 py-6 text-center text-slate-500"
                >
                  Nessun cavo trovato con i filtri attuali.
                </td>
              </tr>
            ) : (
              filteredCavi.map((c) => {
                const pct = Number(c.percentuale || 0);
                const rowBg =
                  pct === 0 ? '' : pct < 100 ? 'bg-amber-50' : 'bg-emerald-50';

                return (
                  <tr
                    key={c.id}
                    className={`border-t border-slate-100 align-middle ${rowBg}`}
                  >
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => handleToggleRow(c.id)}
                      />
                    </td>
                    <td className="px-1 py-1 truncate">{c.codice}</td>
                    <td className="px-1 py-1 truncate">{c.descrizione}</td>
                    <td className="px-1 py-1 text-right">
                      {Number(c.metriTotali || 0)}
                    </td>
                    <td className="px-1 py-1 text-right">
                      <input
                        type="number"
                        className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right"
                        value={c.percentuale ?? ''}
                        onChange={(e) =>
                          applyPercentToSingle(c.id, e.target.value)
                        }
                      />
                    </td>
                    <td className="px-1 py-1 text-right">
                      {Number(c.metriPosati || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-[11px] text-slate-600">
          Totale metri posati oggi:{' '}
          <span className="font-semibold">
            {totalMetriPosati.toFixed(2)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSaveListaCavi}
          disabled={saving}
          className={`px-3 py-1.5 rounded-md border text-[11px] ${
            saving
              ? 'bg-slate-500 border-slate-500 text-slate-100 cursor-wait'
              : 'bg-slate-900 border-slate-800 text-slate-50 hover:bg-slate-800'
          }`}
        >
          {saving ? 'Salvataggio…' : 'Salva lista cavi'}
        </button>
      </div>
    </div>
  );
}

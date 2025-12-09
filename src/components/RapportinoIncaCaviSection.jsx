// src/components/RapportinoIncaCaviSection.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchRapportinoIncaCavi,
  addRapportinoCavoRow,
  updateRapportinoCavoRow,
  deleteRapportinoCavoRow,
  searchIncaCaviForRapportino,
} from "../inca/incaRapportinoLinkApi";

function formatMeters(v) {
  if (v == null) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return `${num.toFixed(1)} m`;
}

/**
 * Section à insérer dans RapportinoPage.jsx
 *
 * Props :
 *  - rapportinoId: uuid
 *  - shipCostr: string (ex: "6368")
 *  - disabled?: boolean (quand rapportino VALIDATO / INVIATO)
 */
export default function RapportinoIncaCaviSection({
  rapportinoId,
  shipCostr,
  disabled = false,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerCandidates, setPickerCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [savingRowId, setSavingRowId] = useState(null);

  // Charger les lignes existantes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!rapportinoId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRapportinoIncaCavi(rapportinoId);
        if (cancelled) return;
        setRows(data);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [rapportinoId]);

  const totalMetriPosati = useMemo(() => {
    return rows.reduce(
      (sum, r) => sum + (Number(r.metri_posati || 0) || 0),
      0
    );
  }, [rows]);

  const totalCavi = rows.length;

  const excludeIds = useMemo(
    () => rows.map((r) => r.inca_cavo_id).filter(Boolean),
    [rows]
  );

  /* ---------------------------------------------------------------------- */
  /*                         GESTION DES LIGNES LOCALES                     */
  /* ---------------------------------------------------------------------- */

  /**
   * Changement de pourcentage (0 / 50 / 70 / 100)
   *
   * On calcule les mètres = pourcentage * (metri_previsti ou metri_teo)
   * et on stocke quand même des mètres dans rapportino_inca_cavi.metri_posati.
   */
  async function handleChangePercent(rowId, percent, cavo) {
    if (disabled) return;
    if (!cavo) return;

    const base =
      Number(cavo.metri_previsti || cavo.metri_teo || 0) || 0;

    const metriPosati =
      percent > 0 && base > 0 ? (base * percent) / 100 : 0;

    setSavingRowId(rowId);
    try {
      const updated = await updateRapportinoCavoRow(rowId, {
        metri_posati: metriPosati,
      });
      setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)));
    } catch (e) {
      console.error("[RapportinoIncaSection] update percent error", e);
      setError(e.message || String(e));
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleDeleteRow(rowId) {
    if (disabled) return;
    const ok = window.confirm("Rimuovere questo cavo dal rapportino?");
    if (!ok) return;

    try {
      await deleteRapportinoCavoRow(rowId);
      setRows((prev) => prev.filter((r) => r.id !== rowId));
    } catch (e) {
      console.error("[RapportinoIncaSection] delete row error", e);
      setError(e.message || String(e));
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                         PICKER "AGGIUNGI DA INCA"                      */
  /* ---------------------------------------------------------------------- */

  async function openPicker() {
    if (!shipCostr) {
      setError("COSTR nave non disponibile per il collegamento INCA.");
      return;
    }
    setPickerOpen(true);
    setPickerSearch("");
    await reloadPicker("");
  }

  async function reloadPicker(search) {
    if (!shipCostr) return;
    try {
      setPickerLoading(true);
      const data = await searchIncaCaviForRapportino({
        shipCostr,
        search,
        excludeIncaIds: excludeIds,
        limit: 120,
      });
      setPickerCandidates(data);
    } catch (e) {
      console.error("[RapportinoIncaSection] picker load error", e);
      setError(e.message || String(e));
    } finally {
      setPickerLoading(false);
    }
  }

  async function handlePickerSearchChange(e) {
    const s = e.target.value;
    setPickerSearch(s);
    await reloadPicker(s);
  }

  async function handleSelectCavo(cavo) {
    if (!rapportinoId || !cavo?.id) return;
    try {
      // On ajoute avec 0 m par défaut → le Capo choisira 50/70/100 ensuite
      const newRow = await addRapportinoCavoRow(rapportinoId, cavo.id, 0);
      setRows((prev) => [...prev, newRow]);
      setPickerOpen(false);
    } catch (e) {
      console.error("[RapportinoIncaSection] add cavo error", e);
      setError(e.message || String(e));
    }
  }

  /* ---------------------------------------------------------------------- */

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-400">
            Cavi INCA collegati al rapportino
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Seleziona i cavi da INCA e indica l&apos;avanzamento del turno
            (50% / 70% / 100%). La produzione viene applicata ai cavi INCA
            in fase di validazione del rapportino.
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>
              Cavi:{" "}
              <span className="text-emerald-300 font-semibold">
                {totalCavi}
              </span>
            </span>
            <span className="hidden sm:inline">
              Metri stimati turno:{" "}
              <span className="text-emerald-300 font-semibold">
                {totalMetriPosati.toFixed(1)} m
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-emerald-500/70 bg-emerald-500/10 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ＋ Aggiungi cavo da INCA
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[11px] px-3 py-2 rounded-lg border border-rose-500/60 bg-rose-500/10 text-rose-100">
          {error}
        </div>
      )}

      {/* TABLEAU PRINCIPAL */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
        <div className="max-h-[260px] overflow-auto text-[11px]">
          <table className="w-full border-collapse">
            <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
              <tr className="text-slate-400">
                <Th className="w-[220px]">Marca / codice</Th>
                <Th>Arrivo</Th>
                <Th className="text-right">Lung. disegno</Th>
                <Th className="text-center">Avanzamento turno</Th>
                <Th>Situazione</Th>
                <Th className="w-[40px] text-right">Azioni</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <Td colSpan={6} className="py-6 text-center text-slate-500">
                    Caricamento cavi INCA del rapportino…
                  </Td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <Td colSpan={6} className="py-4 text-center text-slate-500">
                    Nessun cavo collegato. Usa &quot;Aggiungi cavo da INCA&quot;.
                  </Td>
                </tr>
              )}

              {rows.map((row) => (
                <RapportinoIncaRow
                  key={row.id}
                  row={row}
                  disabled={disabled}
                  saving={savingRowId === row.id}
                  onChangePercent={handleChangePercent}
                  onDelete={handleDeleteRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PICKER MODAL */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[80vh] rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl flex flex-col overflow-hidden">
            <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="text-[11px] uppercase tracking-[0.2em] text-sky-400">
                  Seleziona cavi da INCA
                </div>
                <div className="text-[11px] text-slate-400">
                  COSTR {shipCostr || "?"} · cavi non ancora collegati a questo
                  rapportino.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="px-3 py-1.5 rounded-full border border-slate-600 text-[11px] text-slate-100 hover:bg-slate-800/80"
              >
                Chiudi
              </button>
            </header>

            <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800">
              <div className="flex-1">
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={handlePickerSearchChange}
                  placeholder="Cerca per marca, codice, descrizione, locale…"
                  className="w-full text-[11px] rounded-full bg-slate-900/80 border border-slate-700 px-3 py-1.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              {pickerLoading && (
                <span className="text-[11px] text-amber-400 animate-pulse">
                  Caricamento cavi…
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto text-[11px]">
              <table className="w-full border-collapse">
                <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
                  <tr className="text-slate-400">
                    <Th className="w-[220px]">Marca / codice</Th>
                    <Th>Arrivo</Th>
                    <Th className="text-right">Lung. disegno</Th>
                    <Th className="text-right">Lung. prevista</Th>
                    <Th>Situazione</Th>
                    <Th className="w-[80px] text-right">Seleziona</Th>
                  </tr>
                </thead>
                <tbody>
                  {!pickerLoading && pickerCandidates.length === 0 && (
                    <tr>
                      <Td colSpan={6} className="py-4 text-center text-slate-500">
                        Nessun cavo trovato per questi criteri.
                      </Td>
                    </tr>
                  )}

                  {pickerCandidates.map((cavo) => (
                    <tr
                      key={cavo.id}
                      className="border-t border-slate-900 hover:bg-slate-900/70"
                    >
                      <Td className="font-medium text-slate-50">
                        <div className="flex flex-col">
                          <span className="truncate">
                            {cavo.marca_cavo || "—"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {cavo.codice || "—"}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-col">
                          <span className="truncate text-slate-100">
                            {cavo.zona_a || "—"}
                          </span>
                          <span className="truncate text-[10px] text-slate-400">
                            {cavo.descrizione_a || cavo.descrizione || "—"}
                          </span>
                        </div>
                      </Td>
                      <Td className="text-right">
                        {formatMeters(cavo.metri_teo)}
                      </Td>
                      <Td className="text-right">
                        {formatMeters(cavo.metri_previsti)}
                      </Td>
                      <Td>
                        <SituazioneBadge value={cavo.situazione} />
                      </Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleSelectCavo(cavo)}
                          className="px-2 py-1 rounded-full border border-emerald-500/70 text-[11px] text-emerald-100 bg-emerald-900/40 hover:bg-emerald-900/70"
                        >
                          Usa
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Th({ children, className = "" }) {
  return (
    <th className={`px-3 py-2 text-left font-normal ${className}`}>{children}</th>
  );
}

function Td({ children, className = "", ...rest }) {
  return (
    <td className={`px-3 py-2 text-slate-200 ${className}`} {...rest}>
      {children}
    </td>
  );
}

function SituazioneBadge({ value }) {
  const v = (value || "").trim();
  let label = v || "—";
  let cls =
    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border";

  switch (v) {
    case "P":
      label = "Posato";
      cls += " bg-emerald-900/60 border-emerald-500/70 text-emerald-100";
      break;
    case "T":
      label = "Tagliato";
      cls += " bg-sky-900/60 border-sky-500/70 text-sky-100";
      break;
    case "R":
      label = "Richiesta";
      cls += " bg-amber-900/60 border-amber-500/70 text-amber-100";
      break;
    case "B":
      label = "Bloccato";
      cls += " bg-rose-900/60 border-rose-500/70 text-rose-100";
      break;
    case "E":
      label = "Eliminato";
      cls += " bg-slate-900/60 border-slate-600 text-slate-100";
      break;
    default:
      label = v || "—";
      cls += " bg-slate-900/60 border-slate-700 text-slate-300";
  }

  return <span className={cls}>{label}</span>;
}

/**
 * Ligne principale du tableau Rapportino ↔ INCA
 * Ici on calcule automatiquement quel pourcentage est sélectionné
 * à partir de metri_posati / metri_previsti (approx 0 / 50 / 70 / 100).
 */
function RapportinoIncaRow({
  row,
  disabled,
  saving,
  onChangePercent,
  onDelete,
}) {
  const c = row.inca_cavo || {};
  const base = Number(c.metri_previsti || c.metri_teo || 0) || 0;
  const metriPosati = Number(row.metri_posati || 0) || 0;

  let selected = 0;
  if (base > 0 && metriPosati > 0) {
    const ratio = metriPosati / base;
    if (Math.abs(ratio - 0.5) < 0.05) selected = 50;
    else if (Math.abs(ratio - 0.7) < 0.05) selected = 70;
    else if (ratio >= 0.95) selected = 100;
  }

  const percOptions = [0, 50, 70, 100];

  return (
    <tr className="border-t border-slate-900 hover:bg-slate-900/60">
      <Td className="font-medium text-slate-50">
        <div className="flex flex-col">
          <span className="truncate">{c.marca_cavo || "—"}</span>
          <span className="text-[10px] text-slate-400">
            {c.codice || "—"}
          </span>
        </div>
      </Td>
      <Td>
        <div className="flex flex-col">
          <span className="truncate text-slate-100">
            {c.zona_a || "—"}
          </span>
          <span className="truncate text-[10px] text-slate-400">
            {c.descrizione_a || c.descrizione || "—"}
          </span>
        </div>
      </Td>
      <Td className="text-right">{formatMeters(c.metri_teo)}</Td>

      {/* Avanzamento turno en pourcentage */}
      <Td className="text-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 border border-slate-700 px-1 py-0.5">
          {percOptions.map((p) => {
            const isActive = p === selected;
            const label = p === 0 ? "—" : `${p}%`;
            const baseClasses =
              "px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-colors";
            const activeClasses =
              "bg-emerald-500/80 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.7)]";
            const inactiveClasses =
              "bg-transparent text-slate-300 hover:bg-slate-800/80";

            return (
              <button
                key={p}
                type="button"
                disabled={disabled || saving}
                onClick={() => onChangePercent(row.id, p, c)}
                className={
                  baseClasses +
                  " " +
                  (isActive ? activeClasses : inactiveClasses)
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </Td>

      <Td>
        <SituazioneBadge value={c.situazione} />
      </Td>
      <Td className="text-right">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDelete(row.id)}
          className="px-2 py-1 rounded-full border border-slate-600 text-[11px] text-slate-200 hover:bg-slate-800/80 disabled:opacity-50"
        >
          ✕
        </button>
      </Td>
    </tr>
  );
}

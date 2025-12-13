// src/components/RapportinoIncaCaviSection.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchRapportinoIncaCavi,
  addRapportinoCavoRow,
  updateRapportinoCavoRow,
  deleteRapportinoCavoRow,
  searchIncaCaviForRapportino,
  getCodiceHistorySummary,
} from "../inca/incaRapportinoLinkApi";

function formatMeters(v) {
  if (v == null) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return `${num.toFixed(1)} m`;
}

function normalizeStepType(v) {
  const t = String(v || "POSA").toUpperCase().trim();
  return t === "RIPRESA" ? "RIPRESA" : "POSA";
}

function normalizePercent(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  const p = Math.round(n);
  return [50, 70, 100].includes(p) ? p : "";
}

/**
 * Section à insérer dans RapportinoPage.jsx
 *
 * Props :
 *  - rapportinoId: uuid
 *  - shipCostr: string (ex: "6368")
 *  - shipCommessa?: string (optionnel, si tu veux affiner les checks)
 *  - disabled?: boolean (quand rapportino VALIDATO / INVIATO)
 */
export default function RapportinoIncaCaviSection({
  rapportinoId,
  shipCostr,
  shipCommessa = "",
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

  // Modal RIPRESA
  const [ripresaModal, setRipresaModal] = useState({
    open: false,
    incaCavo: null,
    reason: "",
    checking: false,
    summary: null,
  });

  // Charger les lignes existantes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!rapportinoId) {
        setRows([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRapportinoIncaCavi(rapportinoId);
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
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

  const totalCavi = rows.length;

  // On exclut du picker uniquement les câbles déjà ajoutés (inca_cavo_id)
  // => Le picker sert à ajouter des POSA; la RIPRESA se fait depuis la ligne existante
  const excludeIds = useMemo(
    () => rows.map((r) => r.inca_cavo_id).filter(Boolean),
    [rows]
  );

  /* ---------------------------------------------------------------------- */
  /*                         GESTION DES LIGNES LOCALES                     */
  /* ---------------------------------------------------------------------- */

  async function handleChangeProgress(rowId, value, stepType) {
    if (disabled) return;

    const st = normalizeStepType(stepType);
    const safe = st === "RIPRESA" ? 100 : normalizePercent(value);

    setSavingRowId(rowId);
    try {
      const updated = await updateRapportinoCavoRow(rowId, {
        progress_percent: safe === "" ? null : safe,
      });
      setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)));
    } catch (e) {
      console.error("[RapportinoIncaSection] update progress error", e);
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
      setPickerCandidates(Array.isArray(data) ? data : []);
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
    if (disabled) return;
    if (!rapportinoId || !cavo?.id) return;

    try {
      // POSA par défaut, avancement null
      const newRow = await addRapportinoCavoRow(
        rapportinoId,
        cavo.id,
        null,
        "POSA"
      );
      setRows((prev) => [...prev, newRow]);
      setPickerOpen(false);
    } catch (e) {
      console.error("[RapportinoIncaSection] add cavo error", e);
      setError(e.message || String(e));
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                               RIPRESA                                  */
  /* ---------------------------------------------------------------------- */

  async function openRipresaModalFromRow(row) {
    if (disabled) return;

    const c = row?.inca_cavo || {};
    const stepType = normalizeStepType(row?.step_type);

    // RIPRESA ne se fait pas si la ligne est déjà RIPRESA
    if (stepType === "RIPRESA") {
      setError("Questa riga è già una RIPRESA (100%).");
      return;
    }

    const percent = Number(row?.progress_percent || 0) || 0;
    if (percent < 50) {
      setError(
        "Ripresa disponibile solo dopo una POSA almeno al 50% (per evitare litigi)."
      );
      return;
    }

    const codice = c.codice || "";
    if (!codice) {
      setError("Codice cavo non disponibile. Impossibile aprire RIPRESA.");
      return;
    }

    // On tente un check “intelligent” si les colonnes cache existent déjà.
    setRipresaModal({
      open: true,
      incaCavo: c,
      reason:
        percent === 50 || percent === 70
          ? "POSA parziale registrata. La RIPRESA deve portare il cavo a 100% (una sola volta)."
          : "POSA già a 100%. Ripresa non necessaria, ma puoi usarla solo se previsto dal processo.",
      checking: true,
      summary: null,
    });

    try {
      const summary = await getCodiceHistorySummary({
        costr: c.costr || shipCostr,
        commessa: c.commessa || shipCommessa,
        codice,
        excludeRowId: null,
      });

      setRipresaModal((prev) => ({
        ...prev,
        checking: false,
        summary: summary || null,
      }));
    } catch (e) {
      // Non bloquant : si cache pas encore en DB, on continue, DB fera foi
      setRipresaModal((prev) => ({
        ...prev,
        checking: false,
        summary: null,
      }));
    }
  }

  async function confirmRipresa() {
    if (disabled) return;
    const c = ripresaModal?.incaCavo;
    if (!c?.id) return;

    // Si on a la summary et qu’elle dit “ripresa already exists”, on bloque côté UI
    if (ripresaModal?.summary?.hasRipresa) {
      setError(
        "Ripresa già registrata per questo cavo (codice). Ripresa è unica."
      );
      setRipresaModal({ open: false, incaCavo: null, reason: "", checking: false, summary: null });
      return;
    }

    try {
      // On ajoute une nouvelle ligne RIPRESA 100% (unique)
      const newRow = await addRapportinoCavoRow(
        rapportinoId,
        c.id,
        100,
        "RIPRESA"
      );
      setRows((prev) => [...prev, newRow]);
      setRipresaModal({ open: false, incaCavo: null, reason: "", checking: false, summary: null });
    } catch (e) {
      console.error("[RapportinoIncaSection] ripresa add error", e);
      setError(e.message || String(e));
      setRipresaModal({ open: false, incaCavo: null, reason: "", checking: false, summary: null });
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
            Seleziona i cavi da INCA e indica l&apos;avanzamento di questo turno.
            POSA: 50/70/100. RIPRESA: 100 (una sola volta).
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>
              Cavi:{" "}
              <span className="text-emerald-300 font-semibold">{totalCavi}</span>
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
        <div className="max-h-[300px] overflow-auto text-[11px]">
          <table className="w-full border-collapse">
            <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
              <tr className="text-slate-400">
                <Th className="w-[220px]">Marca / codice</Th>
                <Th>Arrivo</Th>
                <Th className="text-right">Lung. disegno</Th>
                <Th className="text-center w-[100px]">Step</Th>
                <Th className="text-right w-[160px]">Avanzamento (%)</Th>
                <Th>Situazione</Th>
                <Th className="w-[150px] text-right">RIPRESA</Th>
                <Th className="w-[40px] text-right">Azioni</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <Td colSpan={8} className="py-6 text-center text-slate-500">
                    Caricamento cavi INCA del rapportino…
                  </Td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <Td colSpan={8} className="py-4 text-center text-slate-500">
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
                  onChangeProgress={handleChangeProgress}
                  onDelete={handleDeleteRow}
                  onOpenRipresa={() => openRipresaModalFromRow(row)}
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
                          <span className="truncate">{cavo.marca_cavo || "—"}</span>
                          <span className="text-[10px] text-slate-400">
                            {cavo.codice || "—"}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-col">
                          <span className="truncate text-slate-100">{cavo.zona_a || "—"}</span>
                          <span className="truncate text-[10px] text-slate-400">
                            {cavo.descrizione_a || cavo.descrizione || "—"}
                          </span>
                        </div>
                      </Td>
                      <Td className="text-right">{formatMeters(cavo.metri_teo)}</Td>
                      <Td className="text-right">{formatMeters(cavo.metri_previsti)}</Td>
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

      {/* MODAL RIPRESA */}
      {ripresaModal.open && (
        <div
          className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl overflow-hidden">
            <header className="px-4 py-3 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300">
                  RIPRESA CAVO — 100%
                </div>
                <div className="text-[12px] text-slate-200 font-semibold">
                  {ripresaModal?.incaCavo?.codice || "—"}{" "}
                  <span className="text-slate-500 font-normal">
                    · {ripresaModal?.incaCavo?.marca_cavo || "—"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {ripresaModal.reason}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRipresaModal({
                    open: false,
                    incaCavo: null,
                    reason: "",
                    checking: false,
                    summary: null,
                  })
                }
                className="px-3 py-1.5 rounded-full border border-slate-600 text-[11px] text-slate-100 hover:bg-slate-800/80"
              >
                Chiudi
              </button>
            </header>

            <div className="px-4 py-4 space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-300">
                <div className="text-slate-200 font-semibold mb-1">
                  Regola litigi (critica)
                </div>
                <div>
                  La RIPRESA porta il cavo a 100% e deve essere registrata{" "}
                  <span className="text-slate-100 font-semibold">una sola volta</span>.
                  Se esiste già, il sistema la rifiuterà (UI + vincolo DB).
                </div>
              </div>

              {ripresaModal.checking && (
                <div className="text-[11px] text-amber-300 animate-pulse">
                  Verifica storico RIPRESA…
                </div>
              )}

              {!ripresaModal.checking && ripresaModal.summary && (
                <div className="grid grid-cols-3 gap-2">
                  <MiniKpi
                    label="Max POSA"
                    value={`${ripresaModal.summary.maxPosaPercent || 0}%`}
                  />
                  <MiniKpi
                    label="POSA parziale"
                    value={ripresaModal.summary.hasPartialPosa ? "Sì" : "No"}
                  />
                  <MiniKpi
                    label="RIPRESA esistente"
                    value={ripresaModal.summary.hasRipresa ? "Sì" : "No"}
                    danger={ripresaModal.summary.hasRipresa}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setRipresaModal({
                      open: false,
                      incaCavo: null,
                      reason: "",
                      checking: false,
                      summary: null,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/60 text-[11px] text-slate-200 hover:bg-slate-900/80"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  disabled={disabled || ripresaModal.checking || ripresaModal.summary?.hasRipresa}
                  onClick={confirmRipresa}
                  className="px-3 py-1.5 rounded-xl border border-amber-500/70 bg-amber-500/15 text-[11px] text-amber-100 hover:bg-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    ripresaModal.summary?.hasRipresa
                      ? "RIPRESA già esistente"
                      : "Conferma RIPRESA 100%"
                  }
                >
                  Conferma RIPRESA 100%
                </button>
              </div>

              <div className="text-[10px] text-slate-500">
                Nota: se il controllo storico non è disponibile (cache non ancora
                attiva), la verifica definitiva sarà comunque garantita dal database.
              </div>
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

function StepBadge({ value }) {
  const v = normalizeStepType(value);
  const base =
    "inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border";

  if (v === "RIPRESA") {
    return (
      <span className={`${base} bg-amber-900/50 border-amber-500/70 text-amber-100`}>
        RIPRESA
      </span>
    );
  }
  return (
    <span className={`${base} bg-sky-900/50 border-sky-500/70 text-sky-100`}>
      POSA
    </span>
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

function MiniKpi({ label, value, danger = false }) {
  return (
    <div
      className={[
        "rounded-xl border bg-slate-950/60 px-3 py-2",
        danger ? "border-rose-500/70" : "border-slate-800",
      ].join(" ")}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className={["text-[12px] font-semibold", danger ? "text-rose-200" : "text-slate-100"].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function RapportinoIncaRow({
  row,
  disabled,
  saving,
  onChangeProgress,
  onDelete,
  onOpenRipresa,
}) {
  const c = row.inca_cavo || {};
  const stepType = normalizeStepType(row.step_type);
  const percent = stepType === "RIPRESA" ? 100 : normalizePercent(row.progress_percent);

  const canRipresa =
    !disabled && stepType === "POSA" && (percent === 50 || percent === 70);

  return (
    <tr className="border-t border-slate-900 hover:bg-slate-900/60">
      <Td className="font-medium text-slate-50">
        <div className="flex flex-col">
          <span className="truncate">{c.marca_cavo || "—"}</span>
          <span className="text-[10px] text-slate-400">{c.codice || "—"}</span>
        </div>
      </Td>

      <Td>
        <div className="flex flex-col">
          <span className="truncate text-slate-100">{c.zona_a || "—"}</span>
          <span className="truncate text-[10px] text-slate-400">
            {c.descrizione_a || c.descrizione || "—"}
          </span>
        </div>
      </Td>

      <Td className="text-right">{formatMeters(c.metri_teo)}</Td>

      <Td className="text-center">
        <StepBadge value={stepType} />
      </Td>

      <Td className="text-right">
        {stepType === "RIPRESA" ? (
          <span className="inline-flex items-center justify-end w-24 text-[11px] font-semibold text-amber-200">
            100%
          </span>
        ) : (
          <select
            value={percent === "" ? "" : String(percent)}
            disabled={disabled || saving}
            onChange={(e) => onChangeProgress(row.id, e.target.value, stepType)}
            className="w-24 text-right text-[11px] rounded-md bg-slate-900/80 border border-slate-700 px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
          >
            <option value="">—</option>
            <option value="50">50%</option>
            <option value="70">70%</option>
            <option value="100">100%</option>
          </select>
        )}
      </Td>

      <Td>
        <SituazioneBadge value={c.situazione} />
      </Td>

      <Td className="text-right">
        <button
          type="button"
          disabled={!canRipresa}
          onClick={onOpenRipresa}
          className={[
            "px-2 py-1 rounded-full border text-[11px]",
            canRipresa
              ? "border-amber-500/70 text-amber-100 bg-amber-900/30 hover:bg-amber-900/55"
              : "border-slate-700 text-slate-400 bg-slate-900/30 opacity-60 cursor-not-allowed",
          ].join(" ")}
          title={
            canRipresa
              ? "Apri RIPRESA 100% (una sola volta)"
              : "RIPRESA disponibile solo dopo POSA 50% o 70%"
          }
        >
          RIPRESA 100%
        </button>
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

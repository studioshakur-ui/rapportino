// src/components/RapportinoIncaCaviSection.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { calcMetriPosati, formatMeters, getBaseMetri, safeNum } from "../inca/incaMath";

const SITUAZIONI = ["P", "T", "R", "B", "E", "NP"];
const PICKER_PAGE_SIZE = 120;

function norm(v) {
  return String(v ?? "").trim();
}

function situazioneKey(v) {
  const s = norm(v);
  if (!s) return "NP";
  return SITUAZIONI.includes(s) ? s : "NP";
}

function Chip({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-[12px] font-semibold border transition",
        active
          ? "bg-[rgba(99,102,241,0.18)] text-[var(--inca-300)] border-[rgba(129,140,248,0.55)]"
          : "bg-slate-900/40 text-slate-100 border-slate-700 hover:bg-slate-900/70",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function pickDaA(row) {
  const da = norm(row?.zona_da) || norm(row?.apparato_da) || "—";
  const a = norm(row?.zona_a) || norm(row?.apparato_a) || "—";
  return { da, a };
}

function lampDotClass(k) {
  switch (k) {
    case "P":
      return "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)] ring-emerald-300/25";
    case "T":
      return "bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.55)] ring-sky-300/25";
    case "R":
      return "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)] ring-amber-300/25";
    case "B":
      return "bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.55)] ring-rose-300/25";
    case "E":
      return "bg-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.55)] ring-violet-300/25";
    case "NP":
    default:
      return "bg-slate-500 shadow-[0_0_10px_rgba(148,163,184,0.20)] ring-slate-400/15";
  }
}

function SituazioneLamp({ k, compact = false }) {
  return (
    <span
      title={`Situazione: ${k}`}
      className={[
        "inline-flex items-center gap-2 rounded-full border border-slate-700 bg-core-section",
        compact ? "px-2 py-1 text-[11px]" : "px-2 py-0.5 text-[11px]",
        "font-semibold text-slate-100",
      ].join(" ")}
    >
      <span
        className={[
          "h-2.5 w-2.5 rounded-full ring-1 ring-white/10",
          lampDotClass(k),
        ].join(" ")}
      />
      <span>{k}</span>
    </span>
  );
}

/**
 * CAPO — Section "CAVI INCA COLLEGATI AL RAPPORTINO"
 *
 * Props:
 * - rapportinoId (required)
 * - reportDate (optional)
 * - costr (required for picker)
 * - commessa (required for picker)
 */
export default function RapportinoIncaCaviSection({ rapportinoId, reportDate, costr, commessa }) {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  const [links, setLinks] = useState([]);

  // picker drawer
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState(null);

  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerSituazioni, setPickerSituazioni] = useState([]);
  const [pickerOnlyNonP, setPickerOnlyNonP] = useState(false);

  const [pickerRows, setPickerRows] = useState([]);
  const [pickerOffset, setPickerOffset] = useState(0);
  const [pickerHasMore, setPickerHasMore] = useState(true);

  const pickerListRef = useRef(null);
  const abortRef = useRef({ cancelled: false });

  const percentOptions = useMemo(() => [0, 50, 70, 100], []);
  const canUsePicker = Boolean(norm(costr) && norm(commessa)); // STRICT

  const normalizedReportDate = useMemo(() => {
    try {
      if (reportDate) {
        const d = new Date(reportDate);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
    } catch {
      // ignore
    }
    return new Date().toISOString().slice(0, 10);
  }, [reportDate]);

  // -----------------------------
  // Load linked INCA for rapportino
  // -----------------------------
  const reloadLinks = useCallback(async () => {
    if (!rapportinoId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: e } = await supabase
        .from("rapportino_inca_cavi")
        .select(
          `
          id,
          rapportino_id,
          inca_cavo_id,
          step_type,
          progress_percent,
          metri_posati,
          posa_date,
          note,
          inca_cavi:inca_cavo_id (
            id,
            codice,
            descrizione,
            metri_teo,
            metri_dis,
            situazione,
            marca_cavo,
            zona_da,
            zona_a,
            apparato_da,
            apparato_a
          )
        `
        )
        .eq("rapportino_id", rapportinoId)
        .order("created_at", { ascending: true });

      if (e) throw e;
      setLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] loadLinks error:", err);
      setError("Impossibile caricare i cavi INCA collegati al rapportino.");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [rapportinoId]);

  useEffect(() => {
    if (!rapportinoId) {
      setLinks([]);
      setLoading(false);
      return;
    }
    reloadLinks();
  }, [rapportinoId, reloadLinks]);

  const linkedIncaIds = useMemo(() => {
    const s = new Set();
    for (const l of links || []) if (l?.inca_cavo_id) s.add(l.inca_cavo_id);
    return s;
  }, [links]);

  // -----------------------------
  // Derived display rows
  // -----------------------------
  const displayRows = useMemo(() => {
    return (links || []).map((l) => {
      const inca = l.inca_cavi || null;
      const base = getBaseMetri(inca);
      const pct =
        l.progress_percent != null && l.progress_percent !== ""
          ? safeNum(l.progress_percent)
          : 0;

      const storedPosati = safeNum(l.metri_posati);
      const computedPosati = calcMetriPosati(base, pct);
      const posati = storedPosati > 0 ? storedPosati : computedPosati;

      return {
        linkId: l.id,
        incaId: l.inca_cavo_id,
        codice: inca?.codice || l.codice_cache || "—",
        descrizione: inca?.descrizione || "—",
        baseMetri: base,
        percent: pct,
        metriPosati: posati,
        stepType: (l.step_type || "POSA").toUpperCase(),
        situazione: inca?.situazione || "—",
        ripresaLocked: String((l.step_type || "")).toUpperCase() === "RIPRESA",
      };
    });
  }, [links]);

  // -----------------------------
  // Update link progress
  // -----------------------------
  async function updateLinkProgress({ linkId, newPercent, newStepType }) {
    const row = (links || []).find((x) => x.id === linkId);
    if (!row) return;

    const inca = row.inca_cavi || null;
    const base = getBaseMetri(inca);

    const step = String(newStepType || row.step_type || "POSA").toUpperCase();
    const forcedPercent = step === "RIPRESA" ? 100 : safeNum(newPercent);

    const metriPosati = calcMetriPosati(base, forcedPercent);

    setSavingId(linkId);
    setError(null);

    try {
      const payload = {
        step_type: step,
        progress_percent: forcedPercent,
        metri_posati: metriPosati,
        posa_date: normalizedReportDate,
      };

      const { error: e } = await supabase
        .from("rapportino_inca_cavi")
        .update(payload)
        .eq("id", linkId);
      if (e) throw e;

      setLinks((prev) =>
        (prev || []).map((x) => (x.id === linkId ? { ...x, ...payload } : x))
      );
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] updateLinkProgress error:", err);
      setError("Errore aggiornando avanzamento INCA (salvataggio fallito).");
    } finally {
      setSavingId(null);
    }
  }

  // -----------------------------
  // Delete link
  // -----------------------------
  async function removeLink(linkId) {
    if (!linkId) return;

    setSavingId(linkId);
    setError(null);

    try {
      const { error: e } = await supabase
        .from("rapportino_inca_cavi")
        .delete()
        .eq("id", linkId);
      if (e) throw e;

      setLinks((prev) => (prev || []).filter((x) => x.id !== linkId));
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] removeLink error:", err);
      setError("Errore rimuovendo il cavo INCA dal rapportino.");
    } finally {
      setSavingId(null);
    }
  }

  // -----------------------------
  // Picker: open/close/reset
  // -----------------------------
  const openPicker = useCallback(() => {
    if (!canUsePicker) return;
    setIsPickerOpen(true);
  }, [canUsePicker]);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setPickerQuery("");
    setPickerSituazioni([]);
    setPickerOnlyNonP(false);
    setPickerRows([]);
    setPickerError(null);
    setPickerOffset(0);
    setPickerHasMore(true);
  }, []);

  // -----------------------------
  // Picker: build query
  // -----------------------------
  const buildPickerQuery = useCallback(() => {
    let q = supabase
      .from("inca_cavi")
      .select(
        "id,codice,descrizione,metri_teo,situazione,marca_cavo,zona_da,zona_a,apparato_da,apparato_a"
      )
      .eq("costr", norm(costr))
      .eq("commessa", norm(commessa))
      .order("codice", { ascending: true });

    const search = norm(pickerQuery).toLowerCase();
    if (search) {
      q = q.or(
        [
          `codice.ilike.%${search}%`,
          `descrizione.ilike.%${search}%`,
          `marca_cavo.ilike.%${search}%`,
        ].join(",")
      );
    }

    if (pickerSituazioni.length > 0) {
      const nonNP = pickerSituazioni.filter((x) => x !== "NP");
      const hasNP = pickerSituazioni.includes("NP");

      const ors = [];
      if (nonNP.length > 0) ors.push(`situazione.in.(${nonNP.join(",")})`);
      if (hasNP) ors.push("situazione.is.null", "situazione.eq.");
      q = q.or(ors.join(","));
    }

    if (pickerOnlyNonP) {
      q = q.or("situazione.is.null,situazione.neq.P,situazione.eq.");
    }

    return q;
  }, [costr, commessa, pickerQuery, pickerSituazioni, pickerOnlyNonP]);

  const loadPickerFirstPage = useCallback(async () => {
    if (!isPickerOpen) return;
    if (!canUsePicker) return;

    setPickerLoading(true);
    setPickerError(null);
    setPickerRows([]);
    setPickerOffset(0);
    setPickerHasMore(true);

    abortRef.current.cancelled = false;
    const localAbort = abortRef.current;

    try {
      const from = 0;
      const to = PICKER_PAGE_SIZE - 1;

      const q = buildPickerQuery().range(from, to);
      const { data, error: e } = await q;

      if (e) throw e;
      if (localAbort.cancelled) return;

      const rows = (data || []).filter((r) => !linkedIncaIds.has(r.id));
      setPickerRows(rows);
      setPickerOffset((data || []).length);
      setPickerHasMore((data || []).length === PICKER_PAGE_SIZE);

      requestAnimationFrame(() => {
        if (pickerListRef.current) pickerListRef.current.scrollTop = 0;
      });
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] picker first page error:", err);
      setPickerError("Impossibile caricare la lista INCA (picker).");
      setPickerRows([]);
      setPickerHasMore(false);
    } finally {
      if (!localAbort.cancelled) setPickerLoading(false);
    }
  }, [isPickerOpen, canUsePicker, buildPickerQuery, linkedIncaIds]);

  const loadPickerMore = useCallback(async () => {
    if (!isPickerOpen) return;
    if (!canUsePicker) return;
    if (pickerLoading) return;
    if (!pickerHasMore) return;

    setPickerLoading(true);
    setPickerError(null);

    abortRef.current.cancelled = false;
    const localAbort = abortRef.current;

    try {
      const from = pickerOffset;
      const to = pickerOffset + PICKER_PAGE_SIZE - 1;

      const q = buildPickerQuery().range(from, to);
      const { data, error: e } = await q;

      if (e) throw e;
      if (localAbort.cancelled) return;

      const chunk = (data || []).filter((r) => !linkedIncaIds.has(r.id));
      setPickerRows((prev) => prev.concat(chunk));
      setPickerOffset((prev) => prev + (data || []).length);
      setPickerHasMore((data || []).length === PICKER_PAGE_SIZE);
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] picker load more error:", err);
      setPickerError("Errore caricando altri cavi INCA.");
      setPickerHasMore(false);
    } finally {
      if (!localAbort.cancelled) setPickerLoading(false);
    }
  }, [isPickerOpen, canUsePicker, pickerLoading, pickerHasMore, pickerOffset, buildPickerQuery, linkedIncaIds]);

  useEffect(() => {
    if (!isPickerOpen) return;
    loadPickerFirstPage();
    return () => {
      abortRef.current.cancelled = true;
    };
  }, [isPickerOpen, pickerQuery, pickerSituazioni, pickerOnlyNonP, costr, commessa, loadPickerFirstPage]);

  const onPickerScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      const threshold = 260;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining < threshold) loadPickerMore();
    },
    [loadPickerMore]
  );

  const togglePickerSituazione = useCallback((k) => {
    setPickerSituazioni((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return Array.from(s);
    });
  }, []);

  const resetPickerFilters = useCallback(() => {
    setPickerQuery("");
    setPickerSituazioni([]);
    setPickerOnlyNonP(false);
  }, []);

  // -----------------------------
  // Add single cable (1 tap)
  // -----------------------------
  const addOne = useCallback(
    async (incaId) => {
      if (!rapportinoId || !incaId) return;

      setPickerLoading(true);
      setPickerError(null);

      try {
        const { data: incaRow, error: e1 } = await supabase
          .from("inca_cavi")
          .select("id,metri_teo,metri_dis")
          .eq("id", incaId)
          .single();

        if (e1) throw e1;

        const base = getBaseMetri(incaRow);
        const pct = 0;
        const posati = calcMetriPosati(base, pct);

        const payload = {
          rapportino_id: rapportinoId,
          inca_cavo_id: incaId,
          step_type: "POSA",
          progress_percent: pct,
          metri_posati: posati,
          posa_date: normalizedReportDate,
        };

        const { error: e2 } = await supabase
          .from("rapportino_inca_cavi")
          .insert(payload);
        if (e2) throw e2;

        await reloadLinks();
        setPickerRows((prev) => prev.filter((r) => r.id !== incaId));
      } catch (err) {
        console.error("[RapportinoIncaCaviSection] addOne error:", err);
        setPickerError("Errore aggiungendo il cavo INCA al rapportino.");
      } finally {
        setPickerLoading(false);
      }
    },
    [rapportinoId, normalizedReportDate, reloadLinks]
  );

  // -----------------------------
  // UI
  // -----------------------------
  if (!rapportinoId) {
    return (
      <div className="rounded-2xl border-core bg-core-card p-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted">
          <span className="text-inca font-semibold">INCA</span> · Cavi collegati
        </div>
        <div className="mt-1 text-[13px] text-core font-semibold">
          Rapportino non disponibile
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border-core bg-core-card p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted">
              <span className="text-inca font-semibold">INCA</span> · Cavi collegati
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] text-muted">{displayRows.length}</div>

            <button
              type="button"
              onClick={openPicker}
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold transition",
                canUsePicker ? "btn-inca" : "btn-core opacity-50 cursor-not-allowed",
              ].join(" ")}
              disabled={!canUsePicker}
              title={
                canUsePicker
                  ? "Collega cavo INCA"
                  : "Per aprire il picker servono COSTR + COMMESSA (filtro INCA)."
              }
            >
              + Collega cavo INCA
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-600/40 bg-rose-950/25 px-3 py-2 text-[12px] text-rose-200">
            {error}
          </div>
        )}

        <div
          className={[
            "mt-3 overflow-x-auto rounded-2xl border border-slate-800",
            displayRows.length === 0 && !loading ? "bg-transparent" : "bg-slate-950/30",
          ].join(" ")}
        >
          <table className="min-w-[980px] w-full">
            <thead className="bg-slate-950/60 border-b border-slate-800">
              <tr className="text-left text-[11px] text-slate-500">
                <th className="px-3 py-2">Marca / codice</th>
                <th className="px-3 py-2">Lung. disegno</th>
                <th className="px-3 py-2">Step</th>
                <th className="px-3 py-2">Avanzamento (%)</th>
                <th className="px-3 py-2">Metri posati</th>
                <th className="px-3 py-2">Situazione</th>
                <th className="px-3 py-2 text-right">Azioni</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[12px] text-slate-500">
                    Caricamento…
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10" />
                </tr>
              ) : (
                displayRows.map((r) => {
                  const isSaving = savingId === r.linkId;
                  const k = situazioneKey(r.situazione);

                  return (
                    <tr key={r.linkId} className="hover:bg-slate-900/25">
                      <td className="px-3 py-2">
                        <div className="text-[12px] text-slate-100 font-semibold">{r.codice}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.descrizione && r.descrizione !== "—" ? r.descrizione : "—"}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-100">
                        {r.baseMetri ? formatMeters(r.baseMetri) : "—"}
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={r.stepType}
                          disabled={isSaving}
                          onChange={(e) =>
                            updateLinkProgress({
                              linkId: r.linkId,
                              newStepType: e.target.value,
                              newPercent: r.percent,
                            })
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 px-2 py-1 text-[12px] outline-none"
                        >
                          <option value="POSA">POSA</option>
                          <option value="RIPRESA">RIPRESA</option>
                        </select>
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={r.percent}
                          disabled={isSaving || r.ripresaLocked}
                          onChange={(e) =>
                            updateLinkProgress({
                              linkId: r.linkId,
                              newStepType: r.stepType,
                              newPercent: Number(e.target.value),
                            })
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 px-2 py-1 text-[12px] outline-none"
                          title={r.ripresaLocked ? "RIPRESA è bloccata a 100%" : "Seleziona avanzamento"}
                        >
                          {percentOptions.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-100">
                        {Math.round(r.metriPosati)}
                      </td>

                      <td className="px-3 py-2">
                        <SituazioneLamp k={k} />
                      </td>

                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => removeLink(r.linkId)}
                          className="px-3 py-1.5 rounded-lg border border-rose-600/50 bg-rose-950/20 hover:bg-rose-950/35 text-[12px] text-rose-200"
                        >
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PICKER DRAWER */}
      {isPickerOpen ? (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-5xl sm:rounded-2xl rounded-t-3xl border-core bg-core-card shadow-2xl overflow-hidden">
            {/* Drawer header */}
            <div className="px-4 py-3 border-b border-slate-800 bg-core-section">
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted">
                    <span className="text-inca font-semibold">INCA</span> · Selezione cavo
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-core truncate">
                    COSTR {norm(costr)} · COMMESSA {norm(commessa)}
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closePicker}
                    className="px-3 py-1.5 rounded-lg btn-core text-[12px] font-semibold"
                  >
                    Chiudi
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                <input
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Cerca marca/codice/descrizione…"
                  className="w-full rounded-xl border-core bg-core-card text-core px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--inca-400)]"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerOnlyNonP((v) => !v)}
                    className={[
                      "px-3 py-2 rounded-xl border text-[12px] font-semibold transition",
                      pickerOnlyNonP
                        ? "bg-[rgba(99,102,241,0.18)] text-[var(--inca-300)] border-[rgba(129,140,248,0.55)]"
                        : "btn-core",
                    ].join(" ")}
                    title="Escludi POSA (P)"
                  >
                    Solo non P
                  </button>

                  <button
                    type="button"
                    onClick={resetPickerFilters}
                    className="px-3 py-2 rounded-xl btn-core text-[12px] font-semibold"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {SITUAZIONI.map((k) => (
                  <Chip
                    key={k}
                    active={pickerSituazioni.includes(k)}
                    onClick={() => togglePickerSituazione(k)}
                    title={`Filtra situazione ${k}`}
                  >
                    {k}
                  </Chip>
                ))}
              </div>

              {pickerError ? (
                <div className="mt-2 text-[12px] text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-lg px-2 py-2">
                  {pickerError}
                </div>
              ) : null}
            </div>

            {/* List */}
            <div
              ref={pickerListRef}
              onScroll={onPickerScroll}
              className="max-h-[72vh] overflow-y-auto"
            >
              <div className="p-3">
                {pickerRows.length === 0 && !pickerLoading ? (
                  <div className="py-10" />
                ) : (
                  <div className="rounded-2xl border-core overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead className="bg-core-section sticky top-0 z-10 border-b border-slate-800">
                        <tr className="text-core">
                          <th className="px-3 py-2 text-left">Marca / codice</th>
                          <th className="px-3 py-2 text-left">Da / A</th>
                          <th className="px-3 py-2 text-right">Lung. disegno</th>
                          <th className="px-3 py-2 text-center">Situazione</th>
                          <th className="px-3 py-2 text-right">Azione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pickerRows.map((r) => {
                          const k = situazioneKey(r.situazione);
                          const { da, a } = pickDaA(r);

                          return (
                            <tr
                              key={r.id}
                              className="border-t border-slate-800 bg-core-card/40 hover:bg-core-card/70"
                            >
                              <td className="px-3 py-2">
                                <div className="text-[12px] text-core font-semibold">
                                  {norm(r.codice) || norm(r.marca_cavo) || "—"}
                                </div>
                                <div className="text-[11px] text-muted truncate max-w-[520px]">
                                  {norm(r.descrizione) || "—"}
                                </div>
                              </td>

                              <td className="px-3 py-2">
                                <div className="text-[12px] text-core">
                                  <span className="text-muted font-semibold">DA</span>{" "}
                                  <span className="text-core">{da}</span>{" "}
                                  <span className="text-muted">→</span>{" "}
                                  <span className="text-muted font-semibold">A</span>{" "}
                                  <span className="text-core">{a}</span>
                                </div>
                              </td>

                              <td className="px-3 py-2 text-right text-core">
                                {Number(r.metri_teo ?? 0) || 0}
                              </td>

                              <td className="px-3 py-2 text-center">
                                <div className="inline-flex items-center justify-center">
                                  <SituazioneLamp k={k} compact />
                                </div>
                              </td>

                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  disabled={pickerLoading}
                                  onClick={() => addOne(r.id)}
                                  className="px-3 py-1.5 rounded-lg border border-[rgba(129,140,248,0.55)] bg-[rgba(99,102,241,0.12)] hover:bg-[rgba(99,102,241,0.18)] text-[12px] font-semibold text-core"
                                >
                                  Aggancia
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {pickerLoading ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-[12px] text-muted">
                              Caricamento…
                            </td>
                          </tr>
                        ) : null}

                        {!pickerHasMore && pickerRows.length > 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-[12px] text-muted">
                              Fine lista
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                )}

                {pickerHasMore && !pickerLoading ? (
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={loadPickerMore}
                      className="px-3 py-1.5 rounded-lg btn-core text-[12px] font-semibold"
                    >
                      Carica altri
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-4 py-3 border-t border-slate-800 bg-core-section flex items-center justify-end">
              <button
                type="button"
                onClick={closePicker}
                className="px-3 py-1.5 rounded-lg btn-core text-[12px] font-semibold"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

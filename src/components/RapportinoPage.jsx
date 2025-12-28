// src/components/RapportinoPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

import LoadingScreen from "./LoadingScreen";
import RapportinoHeader from "./rapportino/RapportinoHeader";
import RapportinoTable from "./rapportino/RapportinoTable";
import RapportinoIncaCaviSection from "./RapportinoIncaCaviSection";

import CatalogModal from "./rapportino/modals/CatalogModal";
import OperatorPickerModal from "./rapportino/modals/OperatorPickerModal";
import TempoPickerModal from "./rapportino/modals/TempoPickerModal";

import { getTodayISO, parseNumeric, adjustOperatorTempoHeights } from "../rapportinoUtils";

import {
  CREW_LABELS,
  STATUS_LABELS,
  cn,
  computeProdottoTotale,
  formatDateIt,
  joinLines,
  normalizeCrewRole,
  normalizeLegacyTempoAlignment,
  readRoleFromLocalStorage,
  splitLinesKeepEmpties,
} from "./rapportino/page/rapportinoHelpers";

import { useReturnedInbox } from "./rapportino/page/useReturnedInbox";
import { useRapportinoData } from "./rapportino/page/useRapportinoData";
import {
  addRowFromCatalog,
  handleTempoChangeLegacy,
  removeOperatorFromRow,
  removeRow,
  saveRapportino,
  setCanonicalTempoForLine,
  toggleOperatorInRow,
} from "./rapportino/page/useRapportinoActions";

/**
 * Toast overlay (non intrusif)
 */
function ToastOverlay({ toast, onClose }) {
  const t = toast;
  if (!t?.message) return null;

  const tone =
    t.type === "error"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
      : t.type === "success"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : "border-slate-700/50 bg-slate-950/60 text-slate-100";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-3 no-print">
      <div
        className={[
          "pointer-events-auto",
          "max-w-[min(720px,96vw)] w-full sm:w-auto",
          "rounded-2xl border shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
          "backdrop-blur",
          "px-3 py-2.5",
          tone,
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold leading-5 truncate">{t.message}</div>
            {t.detail ? <div className="mt-0.5 text-[11px] text-slate-300 whitespace-pre-wrap">{t.detail}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700/60 bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-900/35"
            aria-label="Chiudi"
            title="Chiudi"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Build tempo picker items for a row:
 * - Canonical: use operator_items
 * - Legacy: derive from operatori/tempo lines
 */
function buildTempoPickerItemsFromRow(row) {
  const canon = Array.isArray(row?.operator_items) ? row.operator_items : [];
  if (canon.length > 0) return canon;

  const opLines = splitLinesKeepEmpties(row?.operatori);
  const tmLines = splitLinesKeepEmpties(row?.tempo);

  const targetLen = Math.max(opLines.length, tmLines.length, 0);
  const paddedOps = opLines.concat(Array(Math.max(0, targetLen - opLines.length)).fill(""));
  const paddedTm = tmLines.concat(Array(Math.max(0, targetLen - tmLines.length)).fill(""));

  return paddedOps.map((label, i) => ({
    operator_id: "", // legacy has no operator_id here
    label: String(label || "").trim(),
    tempo_raw: String(paddedTm[i] ?? ""),
  }));
}

export default function RapportinoPage() {
  const { shipId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  useOutletContext() || {};

  const [crewRole, setCrewRole] = useState(() => readRoleFromLocalStorage());
  const normalizedCrewRole = normalizeCrewRole(crewRole);
  const crewLabel = CREW_LABELS[normalizedCrewRole] || normalizedCrewRole;

  const [reportDate, setReportDate] = useState(getTodayISO());

  const capoName = useMemo(() => {
    return (profile?.display_name || profile?.full_name || profile?.email || "Capo Squadra").toUpperCase().trim();
  }, [profile]);

  const {
    rapportinoId,
    setRapportinoId,
    setRapportinoCrewRole,
    costr,
    setCostr,
    commessa,
    setCommessa,
    status,
    setStatus,
    rows,
    setRows,
    loading,
    initialLoading,
    error,
    errorDetails,
    showError,
    effectiveCrewRoleForInca,
  } = useRapportinoData({
    profileId: profile?.id,
    crewRole: normalizedCrewRole,
    reportDate,
  });

  const canEdit = status === "DRAFT" || status === "RETURNED";
  const canEditInca = !!rapportinoId && canEdit;

  const showIncaBlock = effectiveCrewRoleForInca === "ELETTRICISTA";
  const [incaOpen, setIncaOpen] = useState(false);

  // AUTO-OPEN INCA when RETURNED + saved rapportino + role OK
  useEffect(() => {
    if (!showIncaBlock) return;
    if (!rapportinoId) return;
    if (status !== "RETURNED") return;
    setIncaOpen(true);
  }, [showIncaBlock, rapportinoId, status]);

  useEffect(() => {
    // When changing day/role, default closed (unless auto-open rule triggers)
    setIncaOpen(false);
  }, [reportDate, normalizedCrewRole]);

  const { returnedCount, latestReturned, returnedLoading, loadReturnedInbox } = useReturnedInbox({
    profileId: profile?.id,
    crewRole: normalizedCrewRole,
  });

  const prodottoTotale = useMemo(() => computeProdottoTotale(rows, parseNumeric), [rows]);
  const statusLabel = STATUS_LABELS[status] || status;

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const pushToast = (t) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(t);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, t?.type === "error" ? 4000 : 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const [saving, setSaving] = useState(false);
  const [uiError, setUiError] = useState(null);
  const [uiErrorDetails, setUiErrorDetails] = useState(null);
  const [showUiErrorDetails, setShowUiErrorDetails] = useState(false);

  // Modals
  const [catOpen, setCatOpen] = useState(false);

  const [opOpen, setOpOpen] = useState(false);
  const [opRowIndex, setOpRowIndex] = useState(null);

  const [tmOpen, setTmOpen] = useState(false);
  const [tmRowIndex, setTmRowIndex] = useState(null);

  const currentTempoRow = tmRowIndex != null ? rows[tmRowIndex] : null;
  const currentTempoItems = useMemo(() => buildTempoPickerItemsFromRow(currentTempoRow), [currentTempoRow]);

  const openOperatorPickerForRow = (rowIndex) => {
    setOpRowIndex(rowIndex);
    setOpOpen(true);
  };
  const closeOperatorPicker = () => {
    setOpOpen(false);
    setOpRowIndex(null);
  };

  const openTempoPickerForRow = (rowIndex) => {
    setTmRowIndex(rowIndex);
    setTmOpen(true);
  };
  const closeTempoPicker = () => {
    setTmOpen(false);
    setTmRowIndex(null);
  };

  const handleRowChange = (index, field, value, targetForHeight) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...(copy[index] || {}) };
      row[field] = value;
      copy[index] = row;
      return copy;
    });

    if (field === "tempo" && targetForHeight) {
      adjustOperatorTempoHeights(targetForHeight);
    }
  };

  const handleRemoveRow = (rowIndex) => {
    removeRow({ setRows }, rowIndex);
    pushToast({ type: "info", message: "Riga rimossa." });
  };

  const handleRemoveOperatorFromRow = async (rowIndex, operatorId) => {
    try {
      removeOperatorFromRow({ setRows }, rowIndex, operatorId);
      pushToast({ type: "success", message: "Operatore rimosso." });
    } catch (e) {
      console.error("[Rapportino] remove operator error:", e);
      setUiError("Errore durante la rimozione dell'operatore.");
      setUiErrorDetails(e?.message || String(e));
      pushToast({
        type: "error",
        message: "Errore durante la rimozione dell'operatore.",
        detail: e?.message || String(e),
      });
    }
  };

  const handleSave = async (forcedStatus) => {
    if (!profile?.id) return false;

    setSaving(true);
    setUiError(null);
    setUiErrorDetails(null);
    setShowUiErrorDetails(false);

    try {
      await saveRapportino({
        profileId: profile.id,
        crewRole: normalizedCrewRole,
        reportDate,
        status,
        forcedStatus,
        costr,
        commessa,
        prodottoTotale,
        rows,
        rapportinoId,
        setRapportinoId,
        setRapportinoCrewRole,
        setStatus,
        loadReturnedInbox,
        setSuccessMessage: (msg) => pushToast({ type: "success", message: msg || "Salvataggio riuscito." }),
      });
      return true;
    } catch (err) {
      console.error("Errore salvataggio rapportino:", err);
      setUiError("Errore durante il salvataggio del rapportino.");
      setUiErrorDetails(err?.message || String(err));
      pushToast({
        type: "error",
        message: "Errore durante il salvataggio del rapportino.",
        detail: err?.message || String(err),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    await handleSave("VALIDATED_CAPO");
  };

  const handlePrint = async () => {
    const ok = await handleSave(status);
    if (!ok) return;

    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn("Print failed:", e);
      }
    }, 120);
  };

  if (initialLoading || loading) {
    return <LoadingScreen message="Caricamento del rapportino in corso." />;
  }

  if (showError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-lg border p-5">
          <div className="font-semibold text-red-700">{error}</div>
          {errorDetails && (
            <pre className="mt-3 text-xs bg-slate-50 text-slate-800 p-2 rounded border whitespace-pre-wrap">
              {errorDetails}
            </pre>
          )}
          <button className="mt-4 px-3 py-2 rounded bg-slate-900 text-white" onClick={() => navigate(-1)}>
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  const selectedIdsForModal = (() => {
    if (opRowIndex == null) return [];
    const row = rows[opRowIndex];
    const items = Array.isArray(row?.operator_items) ? row.operator_items : [];
    return items.map((it) => String(it.operator_id)).filter(Boolean);
  })();

  const canOpenCatalog = canEdit && !!String(shipId || "").trim() && !!String(commessa || "").trim();

  // LEGACY set tempo per line (writes into r.tempo aligned to operatori lines)
  const setLegacyTempoForLine = (rowIndex, lineIndex, tempoRaw) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...(copy[rowIndex] || {}) };

      const opLines = splitLinesKeepEmpties(row.operatori);
      const aligned = normalizeLegacyTempoAlignment(row.operatori, row.tempo);
      const tmLines = splitLinesKeepEmpties(aligned);

      const targetLen = Math.max(opLines.length, tmLines.length, 0);
      const padded = tmLines.concat(Array(Math.max(0, targetLen - tmLines.length)).fill(""));

      padded[lineIndex] = String(tempoRaw ?? "");
      row.tempo = joinLines(padded.slice(0, targetLen));

      copy[rowIndex] = row;
      return copy;
    });
  };

  const isRowCanonical = (row) => {
    const items = Array.isArray(row?.operator_items) ? row.operator_items : [];
    return items.length > 0;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900/80">
      <ToastOverlay toast={toast} onClose={() => setToast(null)} />

      <main className="flex-1 px-2 md:px-4 py-4 md:py-6">
        {/* Banner RETURNED */}
        {latestReturned && returnedCount > 0 && (
          <div className="no-print w-full px-0 mb-4">
            <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-slate-900/60 to-slate-900/60 p-3 md:p-3.5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                      Rimandato
                    </span>
                    <span className="text-[11px] text-slate-300">{returnedCount} in attesa</span>
                  </div>

                  <div className="mt-1 text-[12px] md:text-[13px] text-slate-100 font-semibold truncate">
                    {formatDateIt(latestReturned.report_date)} · COSTR {latestReturned.costr || "—"}
                    {latestReturned.commessa ? ` / ${latestReturned.commessa}` : ""}
                  </div>

                  <div className="mt-0.5 text-[11px] text-slate-300">
                    {rapportinoId === latestReturned.id && status === "RETURNED"
                      ? "Documento aperto: correggi e salva, poi valida."
                      : "Documento rimandato dall'Ufficio: apri e correggi."}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={rapportinoId === latestReturned.id && status === "RETURNED"}
                    onClick={() => {
                      setUiError(null);
                      setUiErrorDetails(null);
                      setShowUiErrorDetails(false);
                      if (latestReturned?.report_date) setReportDate(latestReturned.report_date);
                    }}
                    className={
                      "px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-[0.06em] transition-colors " +
                      (rapportinoId === latestReturned.id && status === "RETURNED"
                        ? "border-slate-700 text-slate-400 bg-slate-900/40"
                        : "border-amber-300/40 text-amber-100 bg-amber-500/15 hover:bg-amber-500/25")
                    }
                  >
                    Apri e correggi
                  </button>

                  {returnedLoading && <span className="text-[11px] text-slate-400">Aggiornamento…</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div
            id="rapportino-document"
            className={cn(
              "rapportino-document bg-white text-slate-900 border border-slate-200",
              "shadow-[0_18px_45px_rgba(0,0,0,0.25)]",
              "w-full"
            )}
            style={{ maxWidth: "min(1280px, 100%)" }}
          >
            <RapportinoHeader
              costr={costr}
              commessa={commessa}
              reportDate={reportDate}
              capoName={capoName}
              onChangeCostr={setCostr}
              onChangeCommessa={setCommessa}
              onChangeDate={setReportDate}
            />

            {/* META */}
            <div className="no-print mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Ruolo:</span> {crewLabel}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-900 border border-slate-200 text-[11px] font-semibold">
                  Stato: {statusLabel}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                  Prodotto totale: {Number(prodottoTotale || 0).toFixed(2)}
                </span>

                {showIncaBlock ? (
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-1 rounded-full border text-[11px] font-semibold",
                      incaOpen
                        ? "border-sky-300 bg-sky-50 text-sky-900"
                        : "border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
                    )}
                    onClick={() => setIncaOpen((v) => !v)}
                    disabled={!canEditInca}
                    title={!canEditInca ? "Salva prima per attivare INCA" : "Apri/chiudi sezione INCA"}
                  >
                    INCA
                  </button>
                ) : null}
              </div>
            </div>

            {/* TABLE */}
            <RapportinoTable
              rows={rows}
              onRowChange={(idx, field, value, target) => {
                if (field === "tempo") {
                  handleTempoChangeLegacy({ setRows }, idx, value);
                  if (target) adjustOperatorTempoHeights(target);
                  return;
                }
                handleRowChange(idx, field, value, target);
              }}
              onRemoveRow={handleRemoveRow}
              onOpenOperatorPicker={openOperatorPickerForRow}
              onOpenTempoPicker={(rowIndex) => openTempoPickerForRow(rowIndex)}
              onRemoveOperatorFromRow={handleRemoveOperatorFromRow}
              readOnly={!canEdit}
            />

            {/* INCA BLOCK */}
            {showIncaBlock && incaOpen ? (
              <div className="mt-4">
                <RapportinoIncaCaviSection
                  rapportinoId={rapportinoId}
                  reportDate={reportDate}
                  costr={costr}
                  commessa={commessa}
                />
              </div>
            ) : null}

            {/* ACTION BAR */}
            <div className="no-print mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-t border-slate-200 px-3 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(undefined)}
                  className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white hover:bg-slate-950"
                  disabled={!canEdit || saving}
                >
                  {saving ? "Salvataggio…" : "Salva"}
                </button>

                <button
                  type="button"
                  onClick={handleValidate}
                  className="px-3 py-2 rounded-xl border border-emerald-700 bg-emerald-600/90 text-white hover:bg-emerald-700"
                  disabled={!canEdit}
                >
                  Valida giornata
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-2 rounded-xl border border-sky-700 bg-sky-600/90 text-white hover:bg-sky-700"
                  title="Stampa A4 orizzontale (stessa pagina)"
                >
                  Export / Print
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCatOpen(true)}
                  disabled={!canOpenCatalog}
                  className={cn(
                    "px-3 py-2 rounded-xl border text-[12px] font-semibold",
                    !canOpenCatalog
                      ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                      : "border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-900"
                  )}
                  title={
                    !canOpenCatalog
                      ? "Imposta Commessa (e contesto Ship) per usare il Catalogo"
                      : "Apri Catalogo (Ship + Commessa)"
                  }
                >
                  Catalogo
                </button>
              </div>
            </div>

            {(uiError || error) ? (
              <div className="mt-3 no-print rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                {uiError || error}
              </div>
            ) : null}

            {showUiErrorDetails && (uiErrorDetails || errorDetails) ? (
              <pre className="mt-3 text-[10px] bg-red-50 text-red-800 p-2 rounded border border-red-200 whitespace-pre-wrap no-print">
                {uiErrorDetails || errorDetails}
              </pre>
            ) : null}
          </div>
        </div>
      </main>

      {/* MODALS */}
      <CatalogModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        onlyActive={true}
        shipId={shipId}
        commessa={commessa}
        onPickActivity={(activity) => {
          addRowFromCatalog({ setRows }, activity);
          setCatOpen(false);
          pushToast({ type: "success", message: "Attività aggiunta." });
        }}
      />

      <OperatorPickerModal
        open={opOpen}
        rowIndex={opRowIndex}
        selectedOperatorIds={selectedIdsForModal}
        onClose={closeOperatorPicker}
        onToggleOperator={(op, action) => {
          if (opRowIndex == null) return;
          if (!canEdit) return;
          toggleOperatorInRow({ setRows }, opRowIndex, { id: op.id, name: op.name }, action);
        }}
      />

      <TempoPickerModal
        open={tmOpen}
        rowIndex={tmRowIndex}
        items={currentTempoItems}
        onClose={closeTempoPicker}
        onSetTempoForLine={(lineIndex, tempoRaw) => {
          if (tmRowIndex == null) return;
          const row = rows[tmRowIndex];
          if (isRowCanonical(row)) {
            setCanonicalTempoForLine({ setRows }, tmRowIndex, lineIndex, tempoRaw);
          } else {
            setLegacyTempoForLine(tmRowIndex, lineIndex, tempoRaw);
          }
        }}
        onRemoveOperator={(operatorId) => {
          if (tmRowIndex == null) return;
          if (!canEdit) return;
          // Only meaningful for canonical; legacy operatorId is empty
          if (!operatorId) return;
          handleRemoveOperatorFromRow(tmRowIndex, operatorId);
        }}
      />
    </div>
  );
}

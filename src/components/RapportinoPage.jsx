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
  normalizeCrewRole,
  readRoleFromLocalStorage,
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
 * Tesla clean + Toast overlay (non intrusif)
 * - Barre d’actions en bas: primaires à gauche, secondaires à droite
 * - Toast overlay: discret, auto-hide, ne pousse pas le layout
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
            {t.detail ? (
              <div className="mt-0.5 text-[11px] text-slate-300 whitespace-pre-wrap">{t.detail}</div>
            ) : null}
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

export default function RapportinoPage() {
  const { shipId } = useParams(); // ship context for scoped catalog
  const { profile } = useAuth();
  const navigate = useNavigate();
  useOutletContext() || {};

  const [crewRole, setCrewRole] = useState(() => readRoleFromLocalStorage());
  const normalizedCrewRole = normalizeCrewRole(crewRole);
  const crewLabel = CREW_LABELS[normalizedCrewRole] || normalizedCrewRole;

  const [reportDate, setReportDate] = useState(getTodayISO());

  const capoName = useMemo(() => {
    return (profile?.display_name || profile?.full_name || profile?.email || "Capo Squadra")
      .toUpperCase()
      .trim();
  }, [profile]);

  const {
    rapportinoId,
    setRapportinoId,
    rapportinoCrewRole,
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

  useEffect(() => {
    setIncaOpen(false);
  }, [reportDate, normalizedCrewRole]);

  const { returnedCount, latestReturned, returnedLoading, loadReturnedInbox } = useReturnedInbox({
    profileId: profile?.id,
    crewRole: normalizedCrewRole,
  });

  const prodottoTotale = useMemo(() => computeProdottoTotale(rows, parseNumeric), [rows]);
  const statusLabel = STATUS_LABELS[status] || status;

  // Toast overlay (non intrusif)
  const [toast, setToast] = useState(null); // {type:"success"|"error"|"info", message, detail?}
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

  // UI messaging
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
  const currentTempoItems = Array.isArray(currentTempoRow?.operator_items) ? currentTempoRow.operator_items : [];

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
      const row = { ...copy[index] };

      // V2: catalog-locked fields
      if (row.activity_id && (field === "categoria" || field === "descrizione" || field === "previsto")) {
        return prev;
      }

      // Legacy guard for operator/tempo alignment when not canonical
      if (field === "operatori" && (!row.operator_items || row.operator_items.length === 0)) {
        row.operatori = value;
        const { normalizeLegacyTempoAlignment } = require("./rapportino/page/rapportinoHelpers");
        row.tempo = normalizeLegacyTempoAlignment(value, row.tempo || "");
      } else if (field === "tempo" && (!row.operator_items || row.operator_items.length === 0)) {
        const { normalizeLegacyTempoAlignment } = require("./rapportino/page/rapportinoHelpers");
        row.tempo = normalizeLegacyTempoAlignment(row.operatori || "", value);
      } else {
        row[field] = value;
      }

      copy[index] = row;
      return copy;
    });

    if (targetForHeight) adjustOperatorTempoHeights(targetForHeight);
  };

  const handleRemoveRow = async (index) => {
    setUiError(null);
    setUiErrorDetails(null);
    setShowUiErrorDetails(false);

    try {
      setSaving(true);
      const res = await removeRow({ rows, setRows }, index, { canEdit });
      if (!res.ok && res.reason !== "readonly") {
        setUiError("Errore durante l'eliminazione della riga.");
        pushToast({ type: "error", message: "Errore durante l'eliminazione della riga." });
      } else if (res.ok) {
        pushToast({ type: "success", message: "Riga eliminata." });
      }
    } catch (e) {
      console.error("[Rapportino] remove row error:", e);
      setUiError("Errore durante l'eliminazione della riga.");
      setUiErrorDetails(e?.message || String(e));
      pushToast({
        type: "error",
        message: "Errore durante l'eliminazione della riga.",
        detail: e?.message || String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOperatorFromRow = (rowIndex, operatorId) => {
    if (!canEdit) return;

    setUiError(null);
    setUiErrorDetails(null);
    setShowUiErrorDetails(false);

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
              </div>
            </div>

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

            {/* INCA collapsible */}
            {showIncaBlock ? (
              <div className="mt-5 no-print">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">INCA</div>
                    <div className="text-[12px] text-slate-700">Cavi collegati (collapsible)</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIncaOpen((v) => !v)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-[12px] font-semibold",
                      "border-slate-300 bg-white hover:bg-slate-100"
                    )}
                    title={incaOpen ? "Chiudi INCA" : "Apri INCA"}
                  >
                    {incaOpen ? "Chiudi" : "Apri"}
                  </button>
                </div>

                {incaOpen ? (
                  <div className="mt-3">
                    <RapportinoIncaCaviSection
                      rapportinoId={rapportinoId}
                      reportDate={reportDate}
                      costr={costr}
                      commessa={commessa}
                      canEdit={canEditInca}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* ACTIONS — Tesla clean: primary left + secondary right */}
            <div className="mt-4 flex items-center justify-between gap-3 text-[11px] no-print">
              <div className="flex flex-wrap items-center gap-2">
                {saving && <span className="text-slate-500">Operazione in corso…</span>}

                {(uiErrorDetails || errorDetails) && (
                  <button
                    type="button"
                    onClick={() => setShowUiErrorDetails((v) => !v)}
                    className="px-2 py-1 rounded border border-red-400 text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    Dettagli errore
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-50 hover:bg-slate-900"
                  disabled={!canEdit}
                >
                  Salva
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
                      ? "border-slate-200 bg-white text-slate-300 cursor-not-allowed"
                      : "border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
                  )}
                  title={
                    !canOpenCatalog
                      ? "Imposta Commessa (e contesto Ship) per usare il Catalogo"
                      : "Aggiungi una riga dal Catalogo (Ship + Commessa)"
                  }
                >
                  + Aggiungi riga
                </button>

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
          setCanonicalTempoForLine({ setRows }, tmRowIndex, lineIndex, tempoRaw);
        }}
        onRemoveOperator={(operatorId) => {
          if (tmRowIndex == null) return;
          if (!canEdit) return;
          handleRemoveOperatorFromRow(tmRowIndex, operatorId);
        }}
      />
    </div>
  );
}

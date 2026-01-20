// /src/components/RapportinoPage.tsx
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useOutletContext, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { formatDisplayName } from "../utils/formatHuman";

import LoadingScreen from "./LoadingScreen";
import RapportinoHeader from "./rapportino/RapportinoHeader";
import RapportinoTable from "./rapportino/RapportinoTable.tsx";
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
import { useProductivityIndexMap } from "./rapportino/page/useProductivityIndexMap";
import { useCapoHoursMemory } from "./rapportino/page/useCapoHoursMemory";

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
    operator_id: "",
    label: String(label || "").trim(),
    tempo_raw: String(paddedTm[i] ?? ""),
  }));
}

/**
 * INCA button (discret, dark blue, not flashy)
 */
function incaBtnClass(disabled) {
  const base = [
    "inline-flex items-center gap-2",
    "rounded-full px-4 py-2",
    "border text-[12px] font-extrabold tracking-[0.16em] uppercase",
    "transition-colors duration-150",
    "select-none",
  ];

  if (disabled) {
    return cn(...base, "border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed");
  }

  return cn(...base, "border-slate-300/60 text-slate-50", "focus:outline-none focus:ring-2 focus:ring-sky-500/25");
}

function incaBtnStyle(disabled) {
  if (disabled) return undefined;
  // sombre et discret: pas de glow, pas de gradient agressif
  return {
    backgroundImage: [
      "linear-gradient(180deg, rgba(2,6,23,0.92) 0%, rgba(15,23,42,0.92) 100%)",
      "repeating-linear-gradient(135deg, rgba(56,189,248,0.06) 0px, rgba(56,189,248,0.06) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 9px)",
    ].join(","),
  };
}

// ────────────────────────────────────────────────────────────────
// URL Date helpers: ?date=YYYY-MM-DD (canonical "working date")
// ────────────────────────────────────────────────────────────────
function isValidIsoDateParam(v) {
  const s = String(v || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;

  const [yy, mm, dd] = s.split("-").map((x) => Number(x));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;

  // stricter: reject impossible dates like 2026-02-31
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  return dt.getUTCFullYear() === yy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd;
}

function getDateFromSearch(search) {
  try {
    const sp = new URLSearchParams(String(search || ""));
    const d = sp.get("date");
    if (isValidIsoDateParam(d)) return String(d);
    return null;
  } catch {
    return null;
  }
}

function setDateInSearch(search, nextDate) {
  const sp = new URLSearchParams(String(search || ""));
  if (nextDate && isValidIsoDateParam(nextDate)) {
    sp.set("date", String(nextDate));
  } else {
    sp.delete("date");
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function safeStr(v) {
  return String(v ?? "").trim();
}

function hasAnyMeaningfulContent({ costr, commessa, rows }) {
  if (safeStr(costr) || safeStr(commessa)) return true;

  const arr = Array.isArray(rows) ? rows : [];
  return arr.some((r) => {
    const descr = safeStr(r?.descrizione_attivita ?? r?.descrizione);
    const cat = safeStr(r?.categoria);
    const note = safeStr(r?.note);
    const opLegacy = safeStr(r?.operatori);
    const tempoLegacy = safeStr(r?.tempo);
    const previsto = r?.previsto;
    const prodotto = r?.prodotto;

    const canon = Array.isArray(r?.operator_items) ? r.operator_items : [];
    const hasCanonOps = canon.some((it) => safeStr(it?.label) || safeStr(it?.tempo_raw));

    return (
      descr ||
      cat ||
      note ||
      opLegacy ||
      tempoLegacy ||
      hasCanonOps ||
      (previsto !== null && previsto !== undefined && safeStr(previsto) !== "") ||
      (prodotto !== null && prodotto !== undefined && safeStr(prodotto) !== "")
    );
  });
}

function buildAutoSaveSignature({ profileId, crewRole, reportDate, costr, commessa, rows, status }) {
  // Keep signature stable + cheap: do not include huge transient fields.
  // We include enough to detect meaningful changes.
  const arr = Array.isArray(rows) ? rows : [];
  const compactRows = arr.map((r) => ({
    categoria: safeStr(r?.categoria),
    descrizione: safeStr(r?.descrizione_attivita ?? r?.descrizione),
    operatori: safeStr(r?.operatori),
    tempo: safeStr(r?.tempo),
    previsto: r?.previsto ?? null,
    prodotto: r?.prodotto ?? null,
    note: safeStr(r?.note),
    activity_id: r?.activity_id ? String(r.activity_id) : null,
    operator_items: Array.isArray(r?.operator_items)
      ? r.operator_items.map((it) => ({
          operator_id: it?.operator_id ? String(it.operator_id) : "",
          label: safeStr(it?.label),
          tempo_raw: safeStr(it?.tempo_raw),
          tempo_hours: it?.tempo_hours ?? null,
          line_index: typeof it?.line_index === "number" ? it.line_index : null,
        }))
      : [],
  }));

  return JSON.stringify({
    profileId: profileId ? String(profileId) : "",
    crewRole: crewRole ? String(crewRole) : "",
    reportDate: reportDate ? String(reportDate) : "",
    status: status ? String(status) : "",
    costr: safeStr(costr),
    commessa: safeStr(commessa),
    rows: compactRows,
  });
}

export default function RapportinoPage() {
  const { shipId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useOutletContext() || {};

  const [crewRole, setCrewRole] = useState(() => readRoleFromLocalStorage());
  const normalizedCrewRole = normalizeCrewRole(crewRole);
  const crewLabel = CREW_LABELS[normalizedCrewRole] || normalizedCrewRole;

  // Canonical report date = URL (?date=YYYY-MM-DD) or today
  const initialReportDate = useMemo(() => {
    const fromUrl = getDateFromSearch(location.search);
    return fromUrl || getTodayISO();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // read once for init

  const [reportDate, setReportDate] = useState(initialReportDate);

  // Sync state if URL changes (back/forward, deep link, etc.)
  useEffect(() => {
    const fromUrl = getDateFromSearch(location.search);
    const next = fromUrl || getTodayISO();
    setReportDate((prev) => (String(prev) === String(next) ? prev : next));
  }, [location.search]);

  const setReportDateAndUrl = (nextDate) => {
    const next = isValidIsoDateParam(nextDate) ? String(nextDate) : getTodayISO();
    setReportDate(next);

    const nextSearch = setDateInSearch(location.search, next);
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: true }
    );
  };

  const capoName = useMemo(() => formatDisplayName(profile, "Capo Squadra"), [profile]);

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
    setIncaOpen(false);
  }, [reportDate, normalizedCrewRole]);

  // Enlever lignes sans description (rendu + save + print)
  const visibleRows = useMemo(() => {
    const arr = Array.isArray(rows) ? rows : [];
    return arr.filter((r) => {
      const descr = String(r?.descrizione_attivita ?? r?.descrizione ?? "").trim();
      return descr.length > 0;
    });
  }, [rows]);

  // CAPO sidebar UX only (no business logic): keep a lightweight, deterministic hours summary
  // in localStorage so the operator pills can always show the current total hours.
  // Never blocks the flow; never affects DB writes.
  useCapoHoursMemory({ shipId, reportDate, rows: visibleRows });

  // Read-only: indice di produttività (per operatore, per attività) via KPI views.
  // Aucun recalcul local: la DB est la source de vérité.
  const productivityIndexMap = useProductivityIndexMap({
    profileId: profile?.id,
    reportDate,
    costr,
    commessa,
    rows: visibleRows,
  });

  const prodottoTotale = useMemo(() => computeProdottoTotale(visibleRows, parseNumeric), [visibleRows]);
  const statusLabel = STATUS_LABELS[status] || status;

  const { returnedCount, latestReturned, returnedLoading, loadReturnedInbox } = useReturnedInbox({
    profileId: profile?.id,
    crewRole: normalizedCrewRole,
  });

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

  const currentTempoRow = tmRowIndex != null ? visibleRows[tmRowIndex] : null;
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
    // IMPORTANT: visibleRows est filtré, mais rows est la source de vérité.
    // Ici on modifie par index de visibleRows: on mappe via l'id si possible, sinon via index brut.
    setRows((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      const vr = visibleRows[index];
      const key = vr?.id ? String(vr.id) : null;

      const copy = prevArr.map((x) => ({ ...x }));
      let targetIdx = -1;
      if (key) targetIdx = copy.findIndex((x) => String(x?.id || "") === key);
      if (targetIdx < 0) targetIdx = index;

      const row = { ...(copy[targetIdx] || {}) };
      row[field] = value;
      copy[targetIdx] = row;
      return copy;
    });

    if (field === "tempo" && targetForHeight) {
      adjustOperatorTempoHeights(targetForHeight);
    }
  };

  const handleRemoveRow = (rowIndex) => {
    // rowIndex on visibleRows => map to source rows via id
    const vr = visibleRows[rowIndex];
    const key = vr?.id ? String(vr.id) : null;

    if (!key) {
      removeRow({ setRows }, rowIndex);
      pushToast({ type: "info", message: "Riga rimossa." });
      return;
    }

    setRows((prev) => (Array.isArray(prev) ? prev : []).filter((r) => String(r?.id || "") !== key));
    pushToast({ type: "info", message: "Riga rimossa." });
  };

  const handleRemoveOperatorFromRow = async (rowIndex, operatorId) => {
    try {
      // rowIndex on visibleRows => map to source by id
      const vr = visibleRows[rowIndex];
      const key = vr?.id ? String(vr.id) : null;

      if (!key) {
        removeOperatorFromRow({ setRows }, rowIndex, operatorId);
      } else {
        setRows((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const idx = arr.findIndex((r) => String(r?.id || "") === key);
          if (idx < 0) return prev;
          const copy = [...arr];
          const row = { ...(copy[idx] || {}) };
          copy[idx] = row;

          const tmpSetRows = (fn) => {
            const next = fn(copy);
            return next;
          };

          removeOperatorFromRow({ setRows: (fn) => tmpSetRows(fn) }, idx, operatorId);
          return copy;
        });
      }

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

  const handleSave = async (forcedStatus): Promise<string | null> => {
    if (!profile?.id) return null;

    // HARD RULE: if validating and PRODOTTO is NULL/empty => NOTE is mandatory.
    if (forcedStatus === "VALIDATED_CAPO") {
      const invalid = (Array.isArray(visibleRows) ? visibleRows : [])
        .map((r, i) => ({
          i,
          descr: String(r?.descrizione || r?.descrizione_attivita || "").trim(),
          prod: parseNumeric(r?.prodotto),
          note: String(r?.note || "").trim(),
        }))
        .filter((x) => x.descr && x.prod === null && !x.note);

      if (invalid.length > 0) {
        const preview = invalid
          .slice(0, 5)
          .map((x) => `Riga ${x.i + 1}: ${x.descr}`)
          .join("\n");

        pushToast({
          type: "error",
          message: "Validazione bloccata: PRODOTTO mancante.",
          detail:
            "Se PRODOTTO è vuoto/null, devi inserire una NOTA (obbligatoria).\n" +
            preview +
            (invalid.length > 5 ? `\n(+${invalid.length - 5} altre)` : ""),
        });

        return null;
      }
    }

    let savedRapportinoId: string | null = rapportinoId ? String(rapportinoId) : null;

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
        rows: visibleRows, // save uniquement lignes avec description
        rapportinoId,
        setRapportinoId: (id) => {
          try {
            savedRapportinoId = id ? String(id) : savedRapportinoId;
          } catch {}
          setRapportinoId(id);
        },
        setRapportinoCrewRole,
        setStatus,
        loadReturnedInbox,
        setSuccessMessage: (msg) => pushToast({ type: "success", message: msg || "Salvataggio riuscito." }),
      });
      return savedRapportinoId;
    } catch (err) {
      console.error("Errore salvataggio rapportino:", err);
      setUiError("Errore durante il salvataggio del rapportino.");
      setUiErrorDetails(err?.message || String(err));
      pushToast({
        type: "error",
        message: "Errore durante il salvataggio del rapportino.",
        detail: err?.message || String(err),
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    await handleSave("VALIDATED_CAPO");
  };

  // Print/Export: pas de nouvel onglet.
  // On sauvegarde d'abord, puis on ouvre la boîte de dialogue d'impression du navigateur.
  const handlePrint = async () => {
    const ok = await handleSave(status);
    if (!ok) return;

    // petit délai pour laisser React peindre l'état final avant impression
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn("window.print failed:", e);
      }
    }, 50);
  };

  // ────────────────────────────────────────────────────────────────
  // AUTO-SAVE (debounced)
  // ────────────────────────────────────────────────────────────────
  const autoSaveTimerRef = useRef(null);
  const autoSaveInFlightRef = useRef(false);
  const lastSavedSigRef = useRef("");

  const autoSaveEnabled = true;

  const autoSaveSig = useMemo(() => {
    // We autosave what the user is effectively working on (visibleRows)
    return buildAutoSaveSignature({
      profileId: profile?.id,
      crewRole: normalizedCrewRole,
      reportDate,
      costr,
      commessa,
      rows: visibleRows,
      status,
    });
  }, [profile?.id, normalizedCrewRole, reportDate, costr, commessa, visibleRows, status]);

  useEffect(() => {
    if (!autoSaveEnabled) return;
    if (!canEdit) return;
    if (!profile?.id) return;
    if (initialLoading || loading) return;
    if (saving) return;
    if (autoSaveInFlightRef.current) return;

    // Do not autosave if the rapport is completely empty
    if (!hasAnyMeaningfulContent({ costr, commessa, rows: visibleRows })) return;

    // If nothing changed since last autosave/manual save, skip
    if (autoSaveSig === lastSavedSigRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        autoSaveInFlightRef.current = true;

        // NOTE: autosave keeps current status (DRAFT/RETURNED) and does NOT validate.
        const ok = await handleSave(undefined);
        if (ok) {
          lastSavedSigRef.current = autoSaveSig;
          pushToast({ type: "info", message: "Auto-salvato." });
        }
      } catch (e) {
        // Keep autosave errors non-blocking but visible
        console.warn("[AutoSave] failed:", e);
        pushToast({ type: "error", message: "Auto-save fallito.", detail: e?.message || String(e) });
      } finally {
        autoSaveInFlightRef.current = false;
      }
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    autoSaveEnabled,
    canEdit,
    profile?.id,
    initialLoading,
    loading,
    saving,
    autoSaveSig,
    costr,
    commessa,
    visibleRows,
  ]);

  // When manual save succeeds, mark current signature as saved (avoid immediate autosave loop)
  useEffect(() => {
    // If rapportinoId exists, we consider last loaded state as saved baseline.
    // But we still want autosave if user changes afterwards.
    if (!rapportinoId) return;
    // Don't overwrite if user is actively editing; keep only if signature is empty
    if (!lastSavedSigRef.current) lastSavedSigRef.current = autoSaveSig;
  }, [rapportinoId, autoSaveSig]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ────────────────────────────────────────────────────────────────

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
    const row = visibleRows[opRowIndex];
    const items = Array.isArray(row?.operator_items) ? row.operator_items : [];
    return items.map((it) => String(it.operator_id)).filter(Boolean);
  })();

  const canOpenCatalog = canEdit && !!String(shipId || "").trim() && !!String(commessa || "").trim();

  const setLegacyTempoForLine = (rowIndex, lineIndex, tempoRaw) => {
    const vr = visibleRows[rowIndex];
    const key = vr?.id ? String(vr.id) : null;

    setRows((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const idx = key ? arr.findIndex((r) => String(r?.id || "") === key) : rowIndex;
      if (idx < 0) return prev;

      const copy = [...arr];
      const row = { ...(copy[idx] || {}) };

      const opLines = splitLinesKeepEmpties(row.operatori);
      const aligned = normalizeLegacyTempoAlignment(row.operatori, row.tempo);
      const tmLines = splitLinesKeepEmpties(aligned);

      const targetLen = Math.max(opLines.length, tmLines.length, 0);
      const padded = tmLines.concat(Array(Math.max(0, targetLen - tmLines.length)).fill(""));

      padded[lineIndex] = String(tempoRaw ?? "");
      row.tempo = joinLines(padded.slice(0, targetLen));

      copy[idx] = row;
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
                      if (latestReturned?.report_date) setReportDateAndUrl(latestReturned.report_date);
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

        <div className="w-full">
          <div
            id="rapportino-document"
            className={cn(
              "rapportino-document bg-white text-slate-900 border border-slate-200",
              "shadow-[0_18px_45px_rgba(0,0,0,0.25)]",
              "w-full"
            )}
          >
            <div className="core-print-signature print-only">Copyright © 2026 CNCS — CORE</div>
            <RapportinoHeader
              costr={costr}
              commessa={commessa}
              reportDate={reportDate}
              capoName={capoName}
              onChangeCostr={setCostr}
              onChangeCommessa={setCommessa}
              onChangeDate={(d) => setReportDateAndUrl(d)}
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

            {/* TABLE */}
            <RapportinoTable
              rows={visibleRows}
              productivityIndexMap={productivityIndexMap}
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
              onDropOperatorToRow={(rowIndex, op) => {
                if (!canEdit) return;
                const id = op?.id ? String(op.id) : "";
                const name = String(op?.name || "").trim();
                if (!name) return;

                toggleOperatorInRow({ setRows }, rowIndex, { id, name }, "add");
                pushToast({ type: "success", message: `Aggiunto: ${name}` });
              }}
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
            <div className="no-print mt-4 border-t border-slate-200 px-3 py-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
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
                    title="Export / Print (solo foglio rapportino)"
                  >
                    Export / Print
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {showIncaBlock ? (
                    <button
                      type="button"
                      className={incaBtnClass(!canEditInca)}
                      style={incaBtnStyle(!canEditInca)}
                      onClick={() => setIncaOpen((v) => !v)}
                      disabled={!canEditInca}
                      title={!canEditInca ? "Salva prima per attivare INCA" : "Apri/chiudi INCA Cockpit"}
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-200/80" />
                      INCA · COCKPIT
                    </button>
                  ) : null}

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
                    title={!canOpenCatalog ? "Imposta Commessa (e contesto Ship) per usare il Catalogo" : "Apri Catalogo"}
                  >
                    Catalogo
                  </button>
                </div>
              </div>
            </div>

            {uiError || error ? (
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
        onClose={() => {
          setOpOpen(false);
          setOpRowIndex(null);
        }}
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
        onClose={() => {
          setTmOpen(false);
          setTmRowIndex(null);
        }}
        onSetTempoForLine={(lineIndex, tempoRaw) => {
          if (tmRowIndex == null) return;
          const row = visibleRows[tmRowIndex];
          if (isRowCanonical(row)) {
            setCanonicalTempoForLine({ setRows }, tmRowIndex, lineIndex, tempoRaw);
          } else {
            setLegacyTempoForLine(tmRowIndex, lineIndex, tempoRaw);
          }
        }}
        onRemoveOperator={(operatorId) => {
          if (tmRowIndex == null) return;
          if (!canEdit) return;
          if (!operatorId) return;
          handleRemoveOperatorFromRow(tmRowIndex, operatorId);
        }}
      />
    </div>
  );
}
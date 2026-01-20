// src/features/inca/IncaImportModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIncaImporter } from "./useIncaImporter";
import { corePills, cardSurface } from "../../ui/designSystem";

import {
  clearIncaImportDraft,
  readIncaImportDraft,
  type IncaImportModeUI,
  type IncaImportDraftV1,
  writeIncaImportDraft,
} from "./incaImportDraft";

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function formatDateTimeIT(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("it-IT");
}

type IncaFileTarget = {
  id: string;
  costr: string | null;
  commessa: string | null;
  file_name: string | null;
  uploaded_at: string | null;
  file_type: string | null;
  file_path?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaultCostr?: string | null;
  defaultCommessa?: string | null;
  onImported?: (data: unknown) => void;
};

/**
 * iOS/Safari NOTE
 * When opening the native file picker (<input type="file">), iOS can suspend/kill the webview.
 * On return, React state is lost. To keep UX stable, we persist a "draft" in sessionStorage
 * and auto-resume the modal + fields.
 */
export default function IncaImportModal({
  open,
  onClose,
  defaultCostr,
  defaultCommessa,
  onImported,
}: Props): JSX.Element | null {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [costr, setCostr] = useState<string>(defaultCostr || "");
  const [commessa, setCommessa] = useState<string>(defaultCommessa || "");
  const [projectCode, setProjectCode] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // OPTION B: mode selector + enrich target
  const [modeUI, setModeUI] = useState<IncaImportModeUI>("COMMIT");
  const [targets, setTargets] = useState<IncaFileTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState<boolean>(false);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [targetIncaFileId, setTargetIncaFileId] = useState<string>("");

  // UX: iOS resume banner
  const [resumeBanner, setResumeBanner] = useState<boolean>(false);

  const importer = useIncaImporter() as any;
  const {
    dryRun,
    commit,
    enrichTipo,
    loading,
    phase,
    error,
    result,
    reset,
  }: {
    dryRun: (args: any) => Promise<any>;
    commit: (args: any) => Promise<any>;
    enrichTipo: (args: any) => Promise<any>;
    loading: boolean;
    phase: "idle" | "analyzing" | "importing";
    error: any;
    result: any;
    reset: () => void;
  } = importer;

  const draftSnapshot = useMemo<IncaImportDraftV1>(() => {
    return {
      v: 1,
      open: true,
      updatedAt: Date.now(),
      costr,
      commessa,
      projectCode,
      note,
      modeUI,
      targetIncaFileId,
      needsReselectFile: false,
    };
  }, [commessa, costr, modeUI, note, projectCode, targetIncaFileId]);

  const persistDraft = (patch?: Partial<IncaImportDraftV1>): void => {
    const next: IncaImportDraftV1 = {
      ...draftSnapshot,
      ...(patch || {}),
      v: 1,
      open: true,
      updatedAt: Date.now(),
    };
    writeIncaImportDraft(next);
  };

  const clearDraft = (): void => {
    clearIncaImportDraft();
  };

  // Restore draft on open (if any) — takes precedence over defaults.
  useEffect(() => {
    if (!open) return;

    const d = readIncaImportDraft();
    if (d?.open) {
      setCostr(d.costr || defaultCostr || "");
      setCommessa(d.commessa || defaultCommessa || "");
      setProjectCode(d.projectCode || "");
      setNote(d.note || "");
      setModeUI(d.modeUI || "COMMIT");
      setTargetIncaFileId(d.targetIncaFileId || "");
      setResumeBanner(!!d.needsReselectFile);
    } else {
      setCostr(defaultCostr || "");
      setCommessa(defaultCommessa || "");
      setProjectCode("");
      setNote("");
      setModeUI("COMMIT");
      setTargetIncaFileId("");
      setResumeBanner(false);
    }

    // Reset importer state at every open (avoids old results polluting current import)
    reset();
    setFile(null);
    setTargets([]);
    setTargetsError(null);
  }, [open, defaultCostr, defaultCommessa, reset]);

  // Persist draft while open (lightweight + robust for iOS)
  useEffect(() => {
    if (!open) return;
    persistDraft({ needsReselectFile: resumeBanner });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, costr, commessa, projectCode, note, modeUI, targetIncaFileId, resumeBanner]);

  const isDryOk = !!(result?.ok && result?.mode === "DRY_RUN");
  const isCommitOk = !!(result?.ok && result?.mode === "COMMIT");
  const isEnrichOk = !!(result?.ok && result?.mode === "ENRICH_TIPO");

  const counts = (result?.counts as any) || null;
  const debug = (result?.debug as any) || null;
  const total = typeof result?.total === "number" ? (result.total as number) : 0;
  const received = (result?.received as any) || null;

  const fileType = useMemo(() => {
    if (!file) return null;
    return "XLSX";
  }, [file]);

  const canDry = !!file && !!norm(costr) && !!norm(commessa) && !loading;

  const canCommit = isDryOk && modeUI === "COMMIT" && !loading;
  const canEnrich =
    isDryOk && modeUI === "ENRICH_TIPO" && !!norm(targetIncaFileId) && !loading;

  const warnings = useMemo(() => {
    if (!counts || !total) return [] as string[];
    const w: string[] = [];
    const npRatio = total > 0 ? ((counts.NP || 0) as number) / total : 0;
    if (npRatio > 0.6) w.push("Alto NP: verifica layout/STATO CANTIERE.");

    const nonStandard = debug?.nonStandardStatuses;
    if (Array.isArray(nonStandard) && nonStandard.length > 0) {
      w.push("Statuti non standard rilevati (vedi Debug). ");
    }
    return w;
  }, [counts, debug, total]);

  const handleFile = (f: File | null) => {
    setFile(f || null);
    // If user reselected a file, we can clear the resume banner
    if (f) {
      setResumeBanner(false);
      persistDraft({ needsReselectFile: false });
    }
  };

  const handleSelectFileClick = (): void => {
    // IMPORTANT (iOS): persist draft BEFORE opening native picker
    persistDraft({ needsReselectFile: true });
    setResumeBanner(true);
    fileInputRef.current?.click();
  };

  const handleDry = async (): Promise<void> => {
    await dryRun({ file, costr, commessa, projectCode, note });
  };

  const handleCommit = async (): Promise<void> => {
    const data = await commit({ file, costr, commessa, projectCode, note });
    onImported?.(data);
    clearDraft();
  };

  const handleEnrich = async (): Promise<void> => {
    const data = await enrichTipo({
      file,
      costr,
      commessa,
      projectCode,
      note,
      targetIncaFileId,
    });
    onImported?.(data);
    clearDraft();
  };

  // Load enrich targets (inca_files) for the current COSTR/COMMESSA
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function loadTargets(): Promise<void> {
      if (!open) return;
      if (!norm(costr) || !norm(commessa)) {
        setTargets([]);
        setTargetsError(null);
        setTargetIncaFileId("");
        return;
      }

      setLoadingTargets(true);
      setTargetsError(null);

      try {
        const { data, error: e } = await supabase
          .from("inca_files")
          .select("id,costr,commessa,file_name,uploaded_at,file_type,file_path")
          .eq("costr", norm(costr))
          .eq("commessa", norm(commessa))
          .order("uploaded_at", { ascending: false })
          .limit(200)
          .abortSignal(ac.signal);

        if (e) throw e;
        if (!alive) return;

        const list = Array.isArray(data) ? (data as IncaFileTarget[]) : [];
        setTargets(list);

        if (norm(targetIncaFileId)) {
          const still = list.some((x) => x.id === targetIncaFileId);
          if (!still) setTargetIncaFileId("");
        }
      } catch (err) {
        if (!alive) return;
        // eslint-disable-next-line no-console
        console.error("[IncaImportModal] loadTargets error:", err);
        setTargets([]);
        setTargetsError("Impossibile caricare i file INCA esistenti (target). ");
        setTargetIncaFileId("");
      } finally {
        if (!alive) return;
        setLoadingTargets(false);
      }
    }

    void loadTargets();
    return () => {
      alive = false;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, costr, commessa]);

  useEffect(() => {
    if (modeUI !== "ENRICH_TIPO") {
      setTargetIncaFileId("");
    }
  }, [modeUI]);

  // Make footer always visible: internal scrolling container
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleClose = (): void => {
    clearDraft();
    onClose();
  };

  if (!open) return null;

  const sizeKb =
    typeof received?.sizeBytes === "number"
      ? Math.max(1, Math.round((received.sizeBytes as number) / 1024))
      : null;

  const primaryActionLabel =
    modeUI === "ENRICH_TIPO"
      ? phase === "importing"
        ? "Arricchisco…"
        : "Enrich TIPO"
      : phase === "importing"
      ? "Importo…"
      : "Importa";

  const primaryActionHandler = modeUI === "ENRICH_TIPO" ? handleEnrich : handleCommit;

  const primaryActionDisabled = modeUI === "ENRICH_TIPO" ? !canEnrich : !canCommit;

  const primaryActionTitle = !isDryOk ? "Esegui prima Analizza (dry-run)" : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-6">
      {/* IMPORTANT: make modal a flex column with max height; body scrolls, footer is sticky */}
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {phase !== "idle" && (
          <div className="h-1 bg-slate-800 overflow-hidden">
            <div className="h-full w-1/2 bg-sky-500 animate-pulse" />
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Import INCA · Cockpit
            </div>
            <div className="text-sm font-semibold">XLSX → Analisi → Commit / Enrich</div>
            <div className="text-[12px] text-slate-500 mt-1">CORE 1.0: solo XLSX. PDF disattivato.</div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="h-9 w-9 rounded-full border border-slate-700 hover:bg-slate-900 disabled:opacity-60"
            title="Chiudi"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {resumeBanner && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[12px] text-amber-100">
              <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200">Ripristino iOS</div>
              <div className="mt-1">
                iOS può sospendere CORE quando apri il selettore file. Ho ripristinato la sessione e i campi.
                Per sicurezza, seleziona di nuovo il file XLSX.
              </div>
            </div>
          )}

          <div
            className={[
              cardSurface(true),
              "border-dashed border-sky-500/40 flex flex-col items-center justify-center py-10 text-center transition-all",
              phase !== "idle" ? "shadow-[0_0_24px_rgba(56,189,248,0.6)]" : "",
            ].join(" ")}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0] || null;
              handleFile(f);
            }}
          >
            <div className="text-sm font-semibold">
              {phase === "analyzing"
                ? "Analisi in corso…"
                : phase === "importing"
                ? modeUI === "ENRICH_TIPO"
                  ? "Arricchimento in corso…"
                  : "Importazione in corso…"
                : "Trascina qui il file INCA (XLSX)"}
            </div>
            <div className="text-xs text-slate-400 mt-1">XLSX · Edge parser</div>

            <button
              className="mt-4 px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
              onClick={handleSelectFileClick}
              type="button"
            >
              Seleziona file
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                handleFile(f);
              }}
            />

            {file && (
              <div className="mt-4 flex items-center gap-2">
                <span className={corePills(true, "sky")}>{fileType}</span>
                <span className="text-xs text-slate-300">{file.name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="COSTR" value={costr} onChange={setCostr} placeholder="6368" />
            <Input label="Commessa" value={commessa} onChange={setCommessa} placeholder="SDC" />
            <Input
              label="Project code"
              value={projectCode}
              onChange={setProjectCode}
              placeholder="es. 6368-SDC-INCA-01"
            />
            <Input
              label="Note"
              value={note}
              onChange={setNote}
              placeholder="Revisione, note interne…"
            />
          </div>

          {isDryOk && (
            <div className={cardSurface(true)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Modalità post-analisi</div>
                  <div className="text-xs text-slate-400 mt-1">
                    COMMIT crea un nuovo file INCA. ENRICH aggiorna solo{" "}
                    <span className="text-slate-200 font-semibold">TIPO CAVO</span> su un file esistente.
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Stato:{" "}
                  <span className="text-slate-200 font-semibold">
                    {modeUI === "ENRICH_TIPO" ? "ENRICH_TIPO" : "COMMIT"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 cursor-pointer hover:bg-slate-900/40">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="inca-import-mode"
                      checked={modeUI === "COMMIT"}
                      onChange={() => setModeUI("COMMIT")}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100">Importa (COMMIT)</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Crea un nuovo{" "}
                        <span className="font-semibold text-slate-200">inca_file</span> e inserisce i cavi.
                      </div>
                    </div>
                  </div>
                </label>

                <label className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 cursor-pointer hover:bg-slate-900/40">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="inca-import-mode"
                      checked={modeUI === "ENRICH_TIPO"}
                      onChange={() => setModeUI("ENRICH_TIPO")}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100">Enrich (ENRICH_TIPO)</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Nessun nuovo file. Upsert di{" "}
                        <span className="font-semibold text-slate-200">tipo</span> per{" "}
                        <span className="font-semibold text-slate-200">codice</span>. Non tocca DA/A, P/NP, progress.
                      </div>
                    </div>
                  </div>
                </label>
              </div>
              {modeUI === "ENRICH_TIPO" && (
                <div className="mt-4">
                  <div className="text-xs text-slate-400 mb-2">File INCA target (stesso COSTR/COMMESSA)</div>

                  <div className="flex flex-col gap-2">
                    <select
                      value={targetIncaFileId}
                      onChange={(e) => setTargetIncaFileId(e.target.value)}
                      disabled={loadingTargets}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-sky-500/70 disabled:opacity-60"
                    >
                      <option value="">
                        {loadingTargets
                          ? "Caricamento file target…"
                          : targets.length
                          ? "Seleziona un file INCA esistente…"
                          : "Nessun file INCA trovato per COSTR/COMMESSA"}
                      </option>
                      {targets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {`${formatDateTimeIT(t.uploaded_at)} · ${t.file_name || "file"} · ${String(t.id).slice(0, 8)}…`}
                        </option>
                      ))}
                    </select>

                    {targetsError && (
                      <div className="rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
                        {targetsError}
                      </div>
                    )}

                    {!targetsError && !loadingTargets && targets.length > 0 && !norm(targetIncaFileId) && (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                        Seleziona il file target “ricco” (quello con DA/A già popolati). ENRICH aggiorna solo TIPO.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isDryOk && received && (
            <div className={cardSurface(true)}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Risultato analisi (pipeline)</div>
                <div className="text-xs text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    <span className={corePills(true, "sky")}>XLSX</span>
                    {sizeKb ? <span>{sizeKb} KB</span> : null}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-400">File</div>
                  <div className="mt-1 text-slate-100 font-mono break-all">{received.fileName || "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-400">COSTR / COMMESSA</div>
                  <div className="mt-1 text-slate-100 font-semibold">
                    {received.costr} / {received.commessa}
                  </div>
                </div>
              </div>

              {typeof result?.next === "string" && (
                <div className="mt-3 text-xs text-slate-300 italic">{result.next}</div>
              )}
            </div>
          )}

          {warnings.length > 0 && (
            <div className={cardSurface(true, "border-amber-500/50 bg-amber-500/5")}>
              <div className="text-sm font-semibold text-amber-200 mb-2">Avvisi</div>
              <ul className="list-disc pl-5 text-xs text-amber-100">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {isDryOk && counts && (
            <div className={cardSurface(true)}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Telemetry INCA</div>
                <div className="text-xs text-slate-400">
                  Totale: <span className="text-slate-100 font-semibold">{total}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {(["P", "T", "R", "B", "E", "NP"] as const).map((k) => (
                  <div
                    key={k}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 flex justify-between"
                  >
                    <span>{k}</span>
                    <span className="font-semibold">{(counts as any)[k] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isDryOk && debug && (
            <details className={cardSurface(true)}>
              <summary className="cursor-pointer text-sm font-medium">Debug tecnico (Edge)</summary>
              <pre className="mt-3 text-[11px] text-slate-300 overflow-auto">{JSON.stringify(debug, null, 2)}</pre>
            </details>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
              {error?.message || String(error)}
            </div>
          )}

          {isCommitOk && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              Import completato con successo (COMMIT).
            </div>
          )}

          {isEnrichOk && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              Enrich completato con successo (ENRICH_TIPO).
            </div>
          )}

          {/* Spacer to guarantee content is not hidden behind sticky footer on small screens */}
          <div className="h-20 md:h-0" />
        </div>

        {/* Sticky footer always visible */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-800 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/75 sticky bottom-0">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDry}
              disabled={!canDry}
              className="px-4 py-2 rounded-full border border-sky-500/60 bg-sky-500/15 text-sky-100 disabled:opacity-50"
            >
              {phase === "analyzing" ? "Analisi…" : "Analizza"}
            </button>

            <button
              type="button"
              onClick={primaryActionHandler}
              disabled={primaryActionDisabled}
              className="px-4 py-2 rounded-full border border-emerald-500/60 bg-emerald-500/15 text-emerald-100 disabled:opacity-50"
              title={primaryActionTitle}
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

function Input({ label, value, onChange, placeholder }: InputProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-slate-400">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-sky-500/70"
      />
    </div>
  );
}

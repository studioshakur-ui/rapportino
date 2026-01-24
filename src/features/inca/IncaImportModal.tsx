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

  const [modeUI, setModeUI] = useState<IncaImportModeUI>("COMMIT");
  const [targets, setTargets] = useState<IncaFileTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState<boolean>(false);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [targetIncaFileId, setTargetIncaFileId] = useState<string>("");

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

    reset();
    setFile(null);
    setTargets([]);
    setTargetsError(null);
  }, [open, defaultCostr, defaultCommessa, reset]);

  useEffect(() => {
    if (!open) return;
    persistDraft({ needsReselectFile: resumeBanner });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, costr, commessa, projectCode, note, modeUI, targetIncaFileId, resumeBanner]);

  const isDryOk = !!(result?.ok && (result as any)?.mode === "DRY_RUN");
  // COMMIT passe désormais par `inca-sync` : il peut ne pas renvoyer `mode`.
  // On considère "sync ok" si ok=true et qu'on a un identifiant de file/import.
  const isCommitOk = !!(
    result?.ok &&
    (result as any)?.mode !== "DRY_RUN" &&
    (Boolean((result as any)?.incaFileId) || Boolean((result as any)?.inca_file_id) || Boolean((result as any)?.importId))
  );
  const isEnrichOk = !!(result?.ok && (result as any)?.mode === "ENRICH_TIPO");

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
  const canEnrich = isDryOk && modeUI === "ENRICH_TIPO" && !!norm(targetIncaFileId) && !loading;

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
    if (f) {
      setResumeBanner(false);
      persistDraft({ needsReselectFile: false });
    }
  };

  const handleSelectFileClick = (): void => {
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

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function loadTargets(): Promise<void> {
      if (!open) return;
      if (modeUI !== "ENRICH_TIPO") return;
      if (!norm(costr) || !norm(commessa)) return;

      setLoadingTargets(true);
      setTargetsError(null);

      const { data, error } = await supabase
        .from("inca_files")
        .select("id, costr, commessa, file_name, uploaded_at, file_type, file_path")
        .eq("costr", norm(costr))
        .eq("commessa", norm(commessa))
        .order("uploaded_at", { ascending: false });

      if (!alive) return;

      if (error) {
        setTargetsError(error.message);
        setTargets([]);
      } else {
        setTargets((data || []) as any);
      }

      setLoadingTargets(false);
    }

    loadTargets();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [open, modeUI, costr, commessa]);

  const primaryActionHandler = modeUI === "ENRICH_TIPO" ? handleEnrich : handleCommit;
  const primaryActionLabel = modeUI === "ENRICH_TIPO" ? "Enrich TIPO" : "Sync";
  const primaryActionDisabled = modeUI === "ENRICH_TIPO" ? !canEnrich : !canCommit;

  const primaryActionTitle = !isDryOk ? "Esegui prima Analizza (dry-run)" : "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-6">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="shrink-0 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Import INCA</div>
              <div className="text-lg font-semibold mt-1">Analisi + Sync robusta</div>
              <div className="text-xs text-slate-400 mt-1">
                Step 1: <b>Analizza</b> (inca-import DRY_RUN) → Step 2: <b>Sync</b> (inca-sync).
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                clearDraft();
                onClose();
              }}
              className="px-4 py-2 rounded-full border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
            >
              Chiudi
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          {resumeBanner && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              iOS: dopo la selezione file, la pagina può ricaricare. Seleziona di nuovo il file e continua.
            </div>
          )}

          <div className={cardSurface(true)}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Dati import</div>
              <div className="text-xs text-slate-400">{fileType || "—"}</div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="COSTR" value={costr} onChange={setCostr} placeholder="es. SDC" />
              <Input label="COMMESSA" value={commessa} onChange={setCommessa} placeholder="es. 006368" />
              <Input label="Project code" value={projectCode} onChange={setProjectCode} placeholder="opzionale" />
              <Input label="Note" value={note} onChange={setNote} placeholder="opzionale" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleSelectFileClick}
                className="px-4 py-2 rounded-full border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
              >
                Seleziona file
              </button>

              <div className="text-xs text-slate-400">
                {file ? (
                  <span className="text-slate-100 font-mono break-all">{file.name}</span>
                ) : (
                  "Nessun file selezionato"
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModeUI("COMMIT")}
                className={corePills(modeUI === "COMMIT")}
              >
                Sync
              </button>
              <button
                type="button"
                onClick={() => setModeUI("ENRICH_TIPO")}
                className={corePills(modeUI === "ENRICH_TIPO")}
              >
                Enrich TIPO
              </button>
            </div>

            {modeUI === "ENRICH_TIPO" && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-slate-400">Target INCA file</div>
                  <select
                    value={targetIncaFileId}
                    onChange={(e) => setTargetIncaFileId(e.target.value)}
                    disabled={loadingTargets}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-sky-500/70"
                  >
                    <option value="">— Seleziona —</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {(t.file_name || "inca.xlsx") + " · " + formatDateTimeIT(t.uploaded_at)}
                      </option>
                    ))}
                  </select>
                  {targetsError && <div className="text-xs text-rose-300 mt-1">{targetsError}</div>}
                </div>
              </div>
            )}
          </div>

          {result?.ok && (
            <div className={cardSurface(true)}>
              <div className="text-sm font-semibold">Risultato</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-400">File</div>
                  <div className="mt-1 text-slate-100 font-mono break-all">{received?.fileName || "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-400">COSTR / COMMESSA</div>
                  <div className="mt-1 text-slate-100 font-semibold">
                    {received?.costr} / {received?.commessa}
                  </div>
                </div>
              </div>

              {typeof result?.next === "string" && <div className="mt-3 text-xs text-slate-300 italic">{result.next}</div>}
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
              Sync completato con successo.
            </div>
          )}

          {isEnrichOk && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              Enrich completato con successo (ENRICH_TIPO).
            </div>
          )}

          <div className="h-20 md:h-0" />
        </div>

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

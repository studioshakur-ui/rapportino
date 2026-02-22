// src/features/inca/IncaImportModal.tsx
import { useEffect, useMemo, useRef, useState  } from "react";
import { useIncaImporter } from "./useIncaImporter";

import {
  clearIncaImportDraft,
  readIncaImportDraft,
  type IncaImportDraftV1,
  writeIncaImportDraft,
} from "./incaImportDraft";

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

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

  const [resumeBanner, setResumeBanner] = useState<boolean>(false);

  const importer = useIncaImporter() as any;
  const {
    dryRun,
    commit,
    loading,
    phase,
    error,
    result,
    reset,
  }: {
    dryRun: (args: any) => Promise<any>;
    commit: (args: any) => Promise<any>;
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
      needsReselectFile: false,
    };
  }, [commessa, costr, note, projectCode]);

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
      setResumeBanner(!!d.needsReselectFile);
    } else {
      setCostr(defaultCostr || "");
      setCommessa(defaultCommessa || "");
      setProjectCode("");
      setNote("");
      setResumeBanner(false);
    }

    reset();
    setFile(null);
  }, [open, defaultCostr, defaultCommessa, reset]);

  useEffect(() => {
    if (!open) return;
    persistDraft({ needsReselectFile: resumeBanner });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, costr, commessa, projectCode, note, resumeBanner]);

  const isDryOk = !!(result?.ok && (result as any)?.mode === "DRY_RUN");
  // COMMIT passe désormais par `inca-sync` : il peut ne pas renvoyer `mode`.
  // On considère "sync ok" si ok=true et qu'on a un identifiant de file/import.
  const isCommitOk = !!(
    result?.ok &&
    (result as any)?.mode !== "DRY_RUN" &&
    (Boolean((result as any)?.incaFileId) || Boolean((result as any)?.inca_file_id) || Boolean((result as any)?.importId))
  );
  const counts = (result?.counts as any) || null;
  const debug = (result?.debug as any) || null;
  const total = typeof result?.total === "number" ? (result.total as number) : 0;
  const received = (result?.received as any) || null;

  const fileType = useMemo(() => {
    if (!file) return null;
    return "XLSX";
  }, [file]);

  const canDry = !!file && !!norm(costr) && !!norm(commessa) && !loading;

  const canCommit = isDryOk && !loading;

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
  const primaryActionHandler = handleCommit;
  const primaryActionLabel = "Sync";
  const primaryActionDisabled = !canCommit;

  const primaryActionTitle = !isDryOk ? "Esegui prima Analizza (dry-run)" : "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center theme-overlay p-3 md:p-6">
      <div className="w-full max-w-5xl rounded-2xl theme-panel shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="shrink-0 px-6 py-4 border-b theme-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] theme-text-muted">Import INCA</div>
              <div className="text-lg font-semibold mt-1 theme-text">Analisi + Sync robusta</div>
              <div className="text-xs theme-text-muted mt-1">
                Step 1: <b>Analizza</b> (inca-import DRY_RUN) → Step 2: <b>Sync</b> (inca-sync).
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                clearDraft();
                onClose();
              }}
              className="btn-instrument px-4 py-2 rounded-full"
            >
              Chiudi
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          {resumeBanner && (
            <div className="rounded-xl border border-[var(--role-warning-border)] bg-[var(--role-warning-soft)] p-4 text-sm text-[var(--role-warning-ink)]">
              iOS: dopo la selezione file, la pagina può ricaricare. Seleziona di nuovo il file e continua.
            </div>
          )}

          <div className="theme-panel-2 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold theme-text">Dati import</div>
              <div className="text-xs theme-text-muted">{fileType || "—"}</div>
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
                className="btn-instrument px-4 py-2 rounded-full"
              >
                Seleziona file
              </button>

              <div className="text-xs theme-text-muted">
                {file ? (
                  <span className="theme-text font-mono break-all">{file.name}</span>
                ) : (
                  "Nessun file selezionato"
                )}
              </div>
            </div>

          </div>

          {result?.ok && (
            <div className="theme-panel-2 rounded-2xl p-4">
              <div className="text-sm font-semibold theme-text">Risultato</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl theme-panel-2 px-3 py-2">
                  <div className="theme-text-muted">File</div>
                  <div className="mt-1 theme-text font-mono break-all">{received?.fileName || "—"}</div>
                </div>

                <div className="rounded-xl theme-panel-2 px-3 py-2">
                  <div className="theme-text-muted">COSTR / COMMESSA</div>
                  <div className="mt-1 theme-text font-semibold">
                    {received?.costr} / {received?.commessa}
                  </div>
                </div>
              </div>

              {typeof result?.next === "string" && (
                <div className="mt-3 text-xs theme-text-muted italic">{result.next}</div>
              )}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="theme-panel-2 rounded-2xl p-4 border border-[var(--role-warning-border)] bg-[var(--role-warning-soft)]">
              <div className="text-sm font-semibold text-[var(--role-warning-ink)] mb-2">Avvisi</div>
              <ul className="list-disc pl-5 text-xs text-[var(--role-warning-ink)]">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {isDryOk && counts && (
            <div className="theme-panel-2 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold theme-text">Telemetry INCA</div>
                <div className="text-xs theme-text-muted">
                  Totale: <span className="theme-text font-semibold">{total}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {(["P", "T", "R", "B", "E", "NP"] as const).map((k) => (
                  <div key={k} className="rounded-xl theme-panel-2 px-3 py-2 flex justify-between">
                    <span>{k}</span>
                    <span className="font-semibold">{(counts as any)[k] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isDryOk && debug && (
            <details className="theme-panel-2 rounded-2xl p-4">
              <summary className="cursor-pointer text-sm font-medium">Debug tecnico (Edge)</summary>
              <pre className="mt-3 text-[11px] theme-text-muted overflow-auto">{JSON.stringify(debug, null, 2)}</pre>
            </details>
          )}

          {error && (
            <div className="rounded-xl border border-[var(--role-danger-border)] bg-[var(--role-danger-soft)] p-4 text-sm text-[var(--role-danger-ink)]">
              {error?.message || String(error)}
            </div>
          )}

          {isCommitOk && (
            <div className="rounded-xl border border-[var(--role-success-border)] bg-[var(--role-success-soft)] p-4 text-sm text-[var(--role-success-ink)]">
              Sync completato con successo.
            </div>
          )}

          <div className="h-20 md:h-0" />
        </div>

        <div className="shrink-0 px-6 py-4 border-t theme-border theme-panel-2 backdrop-blur supports-[backdrop-filter]:bg-[var(--panel2)]/75 sticky bottom-0">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDry}
              disabled={!canDry}
              className="btn-instrument px-4 py-2 rounded-full disabled:opacity-50"
            >
              {phase === "analyzing" ? "Analisi…" : "Analizza"}
            </button>

            <button
              type="button"
              onClick={primaryActionHandler}
              disabled={primaryActionDisabled}
              className="btn-primary px-4 py-2 rounded-full disabled:opacity-50"
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
      <div className="text-xs theme-text-muted">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl theme-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
      />
    </div>
  );
}


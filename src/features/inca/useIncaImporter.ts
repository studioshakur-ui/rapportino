// src/features/inca/useIncaImporter.ts
import { useCallback, useMemo, useRef, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import { uploadIncaFileToStorage, type IncaUploadedFileRef } from "./incaStorageUpload";

export type IncaImportPhase = "idle" | "analyzing" | "importing";

export type IncaImporterResult = { ok: true } & Record<string, unknown>;

type IncaImportArgsBase = {
  file: File;
  costr: string;
  commessa: string;
  projectCode?: string;
  note?: string;
  shipId?: string;
  force?: boolean;
};

type DryRunArgs = IncaImportArgsBase;

type CommitArgs = IncaImportArgsBase;

function isXlsxFile(file: File | null | undefined): boolean {
  if (!file) return false;
  const n = String(file.name || "").toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls");
}

function normalizeEdgeError(err: unknown): Error {
  if (!err) return new Error("Errore sconosciuto.");
  if (err instanceof Error) return new Error(prettifyImportErrorMessage(err.message));
  try {
    const raw = typeof err === "string" ? err : JSON.stringify(err);
    return new Error(prettifyImportErrorMessage(raw));
  } catch {
    return new Error("Errore sconosciuto.");
  }
}

function prettifyImportErrorMessage(message: string): string {
  const src = String(message || "");
  const up = src.toUpperCase();
  if (
    up.includes("WORKER_LIMIT") ||
    up.includes("CPU TIME EXCEEDED") ||
    up.includes("HTTP 546") ||
    up.includes("INCA_FILE_TOO_LARGE_EDGE") ||
    up.includes("INCA_DRY_RUN_TOO_MANY_ROWS")
  ) {
    return "Analyse trop lourde pour la limite Edge. Réduis le fichier/scope ou passe directement à Sync.";
  }
  return src;
}

async function buildFunctionsErrorMessage(error: any): Promise<string> {
  const base = String(error?.message || "Edge Function returned a non-2xx status code").trim();
  const context = error?.context as Response | undefined;
  if (!context) return base;

  const status = typeof context.status === "number" ? context.status : 0;
  let bodyMsg = "";
  try {
    const raw = await context.clone().text();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { error?: string; message?: string };
        bodyMsg = String(parsed?.error || parsed?.message || raw).trim();
      } catch {
        bodyMsg = raw.trim();
      }
    }
  } catch {
    bodyMsg = "";
  }

  const parts = [`HTTP ${status || "?"}`, base];
  if (bodyMsg && bodyMsg !== base) parts.push(bodyMsg);
  return prettifyImportErrorMessage(parts.filter(Boolean).join(" · "));
}

async function invokeFunction(
  name: string,
  payload: Record<string, unknown> | FormData,
): Promise<IncaImporterResult> {
  const { data, error } = await supabase.functions.invoke(name, { body: payload });

  if (error) {
    const msg = await buildFunctionsErrorMessage(error);
    const e = new Error(msg) as Error & { details?: unknown };
    e.details = error;
    throw e;
  }

  const d = data as any;
  if (!d || d.ok !== true) {
    const msg = d?.error || "Errore Edge Function.";
    const e = new Error(msg) as Error & { details?: unknown };
    e.details = d?.extra || d;
    throw e;
  }

  return d as IncaImporterResult;
}

export function useIncaImporter() {
  const [loading, setLoading] = useState<boolean>(false);
  const [phase, setPhase] = useState<IncaImportPhase>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<IncaImporterResult | null>(null);
  const uploadedRef = useRef<{ key: string; fileRef: IncaUploadedFileRef } | null>(null);

  const uploadKeyOf = (args: IncaImportArgsBase): string => {
    const f = args.file;
    const parts = [
      args.costr || "",
      args.commessa || "",
      f?.name || "",
      String(f?.size || 0),
      String(f?.lastModified || 0),
    ];
    return parts.join("|").toLowerCase();
  };

  const ensureUploaded = useCallback(async (args: IncaImportArgsBase): Promise<IncaUploadedFileRef> => {
    const key = uploadKeyOf(args);
    const cached = uploadedRef.current;
    if (cached && cached.key === key) return cached.fileRef;

    const fileRef = await uploadIncaFileToStorage({
      file: args.file,
      costr: args.costr,
      commessa: args.commessa,
    });
    uploadedRef.current = { key, fileRef };
    return fileRef;
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setPhase("idle");
    setError(null);
    setResult(null);
    uploadedRef.current = null;
  }, []);

  const dryRun = useCallback(async (args: DryRunArgs): Promise<IncaImporterResult> => {
    try {
      setLoading(true);
      setPhase("analyzing");
      setResult(null);
      setError(null);

      if (!args.file) throw new Error("Seleziona un file XLSX.");
      if (!isXlsxFile(args.file)) throw new Error("CORE 1.0: il PDF è disattivato. Usa un file .xlsx/.xls.");
      const up = await ensureUploaded(args);
      const payload = {
        mode: "DRY_RUN",
        costr: String(args.costr || "").trim(),
        commessa: String(args.commessa || "").trim(),
        projectCode: String(args.projectCode || "").trim(),
        note: String(args.note || "").trim(),
        file_name: up.fileName,
        storage_bucket: up.bucket,
        storage_path: up.path,
        size_bytes: up.sizeBytes,
        mime_type: up.mimeType,
        shipId: String(args.shipId || "").trim() || null,
      };
      const data = await invokeFunction("inca-import", payload);
      setResult(data);
      return data;
    } catch (err) {
      const e = normalizeEdgeError(err);
      setError(e);
      throw e;
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }, [ensureUploaded]);

  const commit = useCallback(async (args: CommitArgs): Promise<IncaImporterResult> => {
    try {
      setLoading(true);
      setPhase("importing");
      setError(null);

      if (!args.file) throw new Error("Seleziona un file XLSX.");
      if (!isXlsxFile(args.file)) throw new Error("CORE 1.0: il PDF è disattivato. Usa un file .xlsx/.xls.");
      const up = await ensureUploaded(args);
      const payload = {
        mode: "SYNC",
        costr: String(args.costr || "").trim(),
        commessa: String(args.commessa || "").trim(),
        projectCode: String(args.projectCode || "").trim(),
        note: String(args.note || "").trim(),
        file_name: up.fileName,
        storage_bucket: up.bucket,
        storage_path: up.path,
        size_bytes: up.sizeBytes,
        mime_type: up.mimeType,
        shipId: String(args.shipId || "").trim() || null,
        force: Boolean(args.force),
      };
      // IMPORTANT: commit writes MUST go through inca-sync (not inca-import).
      const data = await invokeFunction("inca-sync", payload);
      setResult(data);
      return data;
    } catch (err) {
      const e = normalizeEdgeError(err);
      setError(e);
      throw e;
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }, [ensureUploaded]);

  return useMemo(
    () => ({
      dryRun,
      commit,
      loading,
      phase,
      error,
      result,
      reset,
    }),
    [dryRun, commit, loading, phase, error, result, reset],
  );
}

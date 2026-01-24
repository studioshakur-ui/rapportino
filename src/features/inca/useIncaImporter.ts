import { useCallback, useMemo, useState } from "react";

import { supabase } from "../../lib/supabaseClient";

type IncaImportPhase = "idle" | "analyzing" | "importing";

type InvokeOk = { ok: true } & Record<string, unknown>;

function isXlsxFile(file: File | null | undefined): boolean {
  if (!file) return false;
  const n = String(file.name || "").toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls");
}

function buildFormData(args: {
  file: File;
  costr: string;
  commessa: string;
  projectCode?: string;
  note?: string;
  mode?: string;
  targetIncaFileId?: string;
  shipId?: string;
  force?: boolean;
}): FormData {
  const form = new FormData();
  if (args.mode) form.append("mode", args.mode);
  form.append("costr", String(args.costr || "").trim());
  form.append("commessa", String(args.commessa || "").trim());
  form.append("projectCode", String(args.projectCode || "").trim());
  form.append("note", String(args.note || "").trim());
  form.append("fileName", args.file?.name || "inca.xlsx");
  form.append("file", args.file);

  if (args.targetIncaFileId) form.append("targetIncaFileId", String(args.targetIncaFileId).trim());
  if (args.shipId) form.append("shipId", String(args.shipId).trim());
  if (args.force) form.append("force", "true");

  return form;
}

function normalizeEdgeError(err: unknown): Error {
  if (!err) return new Error("Errore sconosciuto.");
  if (err instanceof Error) return err;
  try {
    return new Error(typeof err === "string" ? err : JSON.stringify(err));
  } catch {
    return new Error("Errore sconosciuto.");
  }
}

async function invokeFunction(name: string, payload: BodyInit): Promise<InvokeOk> {
  const { data, error } = await supabase.functions.invoke(name, { body: payload });

  if (error) {
    const msg = error?.message || "Edge Function returned a non-2xx status code";
    const err = new Error(msg) as Error & { details?: unknown };
    err.details = error;
    throw err;
  }

  const d = data as any;
  if (!d || d.ok !== true) {
    const msg = d?.error || "Errore Edge Function.";
    const err = new Error(msg) as Error & { details?: unknown };
    err.details = d?.extra || d;
    throw err;
  }

  return d as InvokeOk;
}

export function useIncaImporter() {
  const [loading, setLoading] = useState<boolean>(false);
  const [phase, setPhase] = useState<IncaImportPhase>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<InvokeOk | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setPhase("idle");
    setError(null);
    setResult(null);
  }, []);

  const dryRun = useCallback(async (args: { file: File; costr: string; commessa: string; projectCode?: string; note?: string }) => {
    try {
      setLoading(true);
      setPhase("analyzing");
      setResult(null);
      setError(null);

      if (!args.file) throw new Error("Seleziona un file XLSX.");
      if (!isXlsxFile(args.file)) throw new Error("CORE 1.0: il PDF è disattivato. Usa un file .xlsx/.xls.");

      const form = buildFormData({
        file: args.file,
        costr: args.costr,
        commessa: args.commessa,
        projectCode: args.projectCode,
        note: args.note,
        mode: "DRY_RUN",
      });

      const data = await invokeFunction("inca-import", form);
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
  }, []);

  const commit = useCallback(
    async (args: {
      file: File;
      costr: string;
      commessa: string;
      projectCode?: string;
      note?: string;
      shipId?: string;
      force?: boolean;
    }) => {
      try {
        setLoading(true);
        setPhase("importing");
        setError(null);

        if (!args.file) throw new Error("Seleziona un file XLSX.");
        if (!isXlsxFile(args.file)) throw new Error("CORE 1.0: il PDF è disattivato. Usa un file .xlsx/.xls.");

        const form = buildFormData({
          file: args.file,
          costr: args.costr,
          commessa: args.commessa,
          projectCode: args.projectCode,
          note: args.note,
          shipId: args.shipId,
          force: args.force,
        });

        const data = await invokeFunction("inca-sync", form);
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
    },
    [],
  );

  const enrichTipo = useCallback(
    async (args: {
      file: File;
      costr: string;
      commessa: string;
      projectCode?: string;
      note?: string;
      targetIncaFileId: string;
    }) => {
      try {
        setLoading(true);
        setPhase("importing");
        setError(null);

        if (!args.file) throw new Error("Seleziona un file XLSX.");
        if (!isXlsxFile(args.file)) throw new Error("CORE 1.0: il PDF è disattivato. Usa un file .xlsx/.xls.");
        if (!String(args.targetIncaFileId || "").trim()) throw new Error("Seleziona un file INCA target per ENRICH_TIPO.");

        const form = buildFormData({
          file: args.file,
          costr: args.costr,
          commessa: args.commessa,
          projectCode: args.projectCode,
          note: args.note,
          mode: "ENRICH_TIPO",
          targetIncaFileId: args.targetIncaFileId,
        });

        const data = await invokeFunction("inca-import", form);
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
    },
    [],
  );

  return useMemo(
    () => ({
      dryRun,
      commit,
      enrichTipo,
      loading,
      phase,
      error,
      result,
      reset,
    }),
    [dryRun, commit, enrichTipo, loading, phase, error, result, reset],
  );
}

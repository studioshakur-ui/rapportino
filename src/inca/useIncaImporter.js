// src/inca/useIncaImporter.js
import { useCallback, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function isXlsxFile(file) {
  if (!file) return false;
  const n = String(file.name || "").toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls");
}

function buildFormData({ file, costr, commessa, projectCode, note, mode }) {
  const form = new FormData();
  form.append("mode", mode);
  form.append("costr", String(costr || "").trim());
  form.append("commessa", String(commessa || "").trim());
  form.append("projectCode", String(projectCode || "").trim());
  form.append("note", String(note || "").trim());
  form.append("fileName", file?.name || "inca.xlsx");
  form.append("file", file);
  return form;
}

function normalizeEdgeError(err) {
  // supabase.functions.invoke() renvoie souvent une Error générique,
  // mais on a parfois { context } / { details } / ou un body JSON.
  if (!err) return new Error("Errore sconosciuto.");

  if (err instanceof Error) return err;

  try {
    return new Error(typeof err === "string" ? err : JSON.stringify(err));
  } catch {
    return new Error("Errore sconosciuto.");
  }
}

export function useIncaImporter() {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | analyzing | importing
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const reset = useCallback(() => {
    setLoading(false);
    setPhase("idle");
    setError(null);
    setResult(null);
  }, []);

  const invoke = useCallback(async (payload) => {
    setError(null);

    const { data, error: e } = await supabase.functions.invoke("inca-import", {
      body: payload,
    });

    if (e) {
      // essaye de reconstituer un message utile
      const msg =
        e?.message ||
        "Edge Function returned a non-2xx status code";

      const err = new Error(msg);
      err.details = e;
      throw err;
    }

    if (!data || data.ok !== true) {
      const msg = data?.error || "Errore Edge Function.";
      const err = new Error(msg);
      err.details = data?.extra || data;
      throw err;
    }

    return data;
  }, []);

  const dryRun = useCallback(
    async ({ file, costr, commessa, projectCode, note }) => {
      try {
        setLoading(true);
        setPhase("analyzing");
        setResult(null);
        setError(null);

        if (!file) throw new Error("Seleziona un file XLSX.");
        if (!isXlsxFile(file)) {
          throw new Error("CORE 1.0: il PDF è disattivato. Usa un file .xlsx/.xls.");
        }

        const form = buildFormData({
          file,
          costr,
          commessa,
          projectCode,
          note,
          mode: "DRY_RUN",
        });

        const data = await invoke(form);
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
    [invoke]
  );

  const commit = useCallback(
    async ({ file, costr, commessa, projectCode, note }) => {
      try {
        setLoading(true);
        setPhase("importing");
        setError(null);

        if (!file) throw new Error("Seleziona un file XLSX.");
        if (!isXlsxFile(file)) {
          throw new Error("CORE 1.0: il PDF è disattivato. Usa un file .xlsx/.xls.");
        }

        const form = buildFormData({
          file,
          costr,
          commessa,
          projectCode,
          note,
          mode: "COMMIT",
        });

        const data = await invoke(form);
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
    [invoke]
  );

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
    [dryRun, commit, loading, phase, error, result, reset]
  );
}

// src/inca/useIncaImporter.js
import { useCallback, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Import INCA via Edge Function (server-side parse XLSX).
 */
export function useIncaImporter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const run = useCallback(async ({ file, costr, commessa, projectCode, note, mode }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!file) throw new Error("Seleziona un file da importare.");
      if (!String(costr || "").trim()) throw new Error("COSTR obbligatorio.");
      if (!String(commessa || "").trim()) throw new Error("COMMESSA obbligatorio.");
      if (mode !== "DRY_RUN" && mode !== "COMMIT") throw new Error('Mode invalido (atteso: "DRY_RUN" o "COMMIT").');

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("Sessione non valida. Rifai login.");

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!baseUrl) throw new Error("VITE_SUPABASE_URL mancante nel progetto.");

      const form = new FormData();
      form.append("file", file);
      form.append("fileName", file?.name || "inca.xlsx"); // ✅ NEW
      form.append("costr", String(costr).trim());
      form.append("commessa", String(commessa).trim());
      if (projectCode) form.append("projectCode", String(projectCode).trim());
      if (note) form.append("note", String(note).trim());
      form.append("mode", mode);

      const url = `${baseUrl}/functions/v1/inca-import`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // ne pas fixer Content-Type avec FormData
        },
        body: form,
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Risposta non-JSON (${res.status}): ${String(text).slice(0, 200)}`);
      }

      if (!res.ok) {
        const msg = data?.error || `Errore import (${res.status})`;
        throw new Error(msg);
      }

      setResult(data);
      return data;
    } catch (e) {
      console.error("[INCA Import] errore:", e);
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const dryRun = useCallback(async ({ file, costr, commessa, projectCode, note }) => {
    return run({ file, costr, commessa, projectCode, note, mode: "DRY_RUN" });
  }, [run]);

  const commit = useCallback(async ({ file, costr, commessa, projectCode, note }) => {
    return run({ file, costr, commessa, projectCode, note, mode: "COMMIT" });
  }, [run]);

  return {
    loading,
    error,
    result,
    dryRun,
    commit,
  };
}

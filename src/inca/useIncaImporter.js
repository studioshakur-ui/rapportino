// src/inca/useIncaImporter.js
import { useCallback, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Import INCA via Edge Function (XLSX / PDF).
 * AUCUN parsing PDF/XLSX ici.
 */
export function useIncaImporter() {
  const [phase, setPhase] = useState("idle"); // idle | analyzing | importing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const run = useCallback(async ({ file, costr, commessa, projectCode, note, mode }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setPhase(mode === "DRY_RUN" ? "analyzing" : "importing");

    try {
      if (!file) throw new Error("Seleziona un file INCA (XLSX o PDF).");

      const costrTrim = String(costr ?? "").trim();
      const commessaTrim = String(commessa ?? "").trim();

      if (!costrTrim) throw new Error("COSTR obbligatorio.");
      if (!commessaTrim) throw new Error("COMMESSA obbligatorio.");
      if (mode !== "DRY_RUN" && mode !== "COMMIT") throw new Error('Mode invalido ("DRY_RUN" o "COMMIT").');

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("Sessione non valida. Rifai login.");

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!baseUrl) throw new Error("VITE_SUPABASE_URL mancante.");

      const form = new FormData();
      form.append("file", file);
      form.append("fileName", file?.name || "inca");
      form.append("costr", costrTrim);
      form.append("commessa", commessaTrim);
      if (projectCode) form.append("projectCode", String(projectCode).trim());
      if (note) form.append("note", String(note).trim());
      form.append("mode", mode);

      const res = await fetch(`${baseUrl}/functions/v1/inca-import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Risposta non-JSON (${res.status})`);
      }

      if (!res.ok) throw new Error(data?.error || `Errore import (${res.status})`);

      setResult(data);
      return data;
    } catch (e) {
      console.error("[INCA Import]", e);
      setError(e);
      throw e;
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }, []);

  const dryRun = useCallback((p) => run({ ...p, mode: "DRY_RUN" }), [run]);
  const commit = useCallback((p) => run({ ...p, mode: "COMMIT" }), [run]);

  return { phase, loading, error, result, dryRun, commit };
}

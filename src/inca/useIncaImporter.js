// src/inca/useIncaImporter.js
import { useCallback, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Import INCA via Edge Function (XLSX / PDF).
 * AUCUN parsing PDF/XLSX ici.
 * Le front envoie juste le fichier brut.
 */
export function useIncaImporter() {
  const [phase, setPhase] = useState("idle"); // idle | analyzing | importing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Error | string | null
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
      const projectTrim = String(projectCode ?? "").trim();
      const noteTrim = String(note ?? "").trim();

      if (!costrTrim) throw new Error("COSTR obbligatorio.");
      if (!commessaTrim) throw new Error("COMMESSA obbligatorio.");
      if (mode !== "DRY_RUN" && mode !== "COMMIT") {
        throw new Error('Mode invalido ("DRY_RUN" o "COMMIT").');
      }

      const form = new FormData();
      form.append("file", file);
      form.append("fileName", file?.name || "inca");
      form.append("costr", costrTrim);
      form.append("commessa", commessaTrim);
      if (projectTrim) form.append("projectCode", projectTrim);
      if (noteTrim) form.append("note", noteTrim);
      form.append("mode", mode);

      // IMPORTANT: invoke gère Authorization automatiquement via la session Supabase.
      const { data, error: fnError } = await supabase.functions.invoke("inca-import", {
        body: form,
      });

      if (fnError) {
        // fnError.message est souvent plus clair que res.ok
        throw new Error(fnError.message || "Errore Edge Function (inca-import).");
      }

      // data = réponse JSON de la Function
      setResult(data);
      return data;
    } catch (e) {
      console.error("[INCA Import]", e);
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }, []);

  const dryRun = useCallback((p) => run({ ...p, mode: "DRY_RUN" }), [run]);
  const commit = useCallback((p) => run({ ...p, mode: "COMMIT" }), [run]);

  return { phase, loading, error, result, dryRun, commit };
}


// src/inca/useIncaImporter.js
// Hook React pour orchestrer l'import INCA côté front.

import { useState, useCallback } from "react";
import { parseIncaFile } from "./incaParser";
import { createIncaDataset } from "./incaApi";

export function useIncaImporter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const importInca = useCallback(
    async ({ file, costr, commessa, projectCode, note }) => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        if (!file) throw new Error("Seleziona un file da importare.");

        const { cavi, percorsiByCodice } = await parseIncaFile(file);

        const dataset = await createIncaDataset({
          costr,
          commessa,
          projectCode,
          fileName: file.name,
          fileType: detectFileTypeLabel(file),
          note,
          cavi,
          percorsiByCodice,
        });

        setResult(dataset);
        return dataset;
      } catch (err) {
        console.error("Errore import INCA:", err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    importInca,
    loading,
    error,
    result,
  };
}

function detectFileTypeLabel(file) {
  const name = (file?.name || "").toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "XLSX";
  if (name.endsWith(".csv")) return "CSV";
  if (name.endsWith(".pdf")) return "PDF";
  if (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  )
    return "IMAGE";
  return "UNKNOWN";
}

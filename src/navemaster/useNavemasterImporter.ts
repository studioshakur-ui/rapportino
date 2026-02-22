// src/navemaster/useNavemasterImporter.ts
import { useMemo, useState } from "react";

import { supabase } from "../lib/supabaseClient";

type ImportResult = {
  importId: string;
};

type ImportState = {
  loading: boolean;
  error: string | null;
  lastImportId: string | null;
};

export function useNavemasterImporter(): {
  state: ImportState;
  importExcel: (args: { shipId: string; file: File }) => Promise<ImportResult>;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImportId, setLastImportId] = useState<string | null>(null);

  async function importExcel(args: { shipId: string; file: File }): Promise<ImportResult> {
    const { shipId, file } = args;
    setLoading(true);
    setError(null);

    try {
      // 1) upload file into storage
      const storagePath = `navemaster/${shipId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("imports")
        .upload(storagePath, file, { upsert: false });
      if (upErr) throw upErr;

      // 2) call Edge function that parses Excel and writes navemaster_imports + navemaster_rows
      const { data, error: fnErr } = await supabase.functions.invoke("navemaster-import", {
        body: { ship_id: shipId, storage_path: storagePath, file_name: file.name },
      });
      if (fnErr) throw fnErr;

      const importId = (data as { import_id?: string } | null)?.import_id;
      if (!importId) throw new Error("navemaster-import: missing import_id");

      setLastImportId(importId);
      return { importId };
    } catch (e: any) {
      setError(e?.message ?? "Import failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  const state = useMemo<ImportState>(() => ({ loading, error, lastImportId }), [loading, error, lastImportId]);
  return { state, importExcel };
}
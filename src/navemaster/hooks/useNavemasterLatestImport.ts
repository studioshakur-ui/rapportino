// src/navemaster/hooks/useNavemasterLatestImport.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { NavemasterLatestImportV1 } from "../contracts/navemaster.types";

export function useNavemasterLatestImport(shipId: string | null): {
  data: NavemasterLatestImportV1 | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<NavemasterLatestImportV1 | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!shipId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("navemaster_latest_import_v1")
      .select("id, ship_id, costr, commessa, file_name, file_bucket, file_path, source_sha256, note, imported_by, imported_at, is_active")
      .eq("ship_id", shipId)
      .maybeSingle();

    if (error) {
      setError(error.message || "latest import error");
      setData(null);
      setLoading(false);
      return;
    }

    setData((data as NavemasterLatestImportV1 | null) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId]);

  return useMemo(() => ({ data, loading, error, refresh: load }), [data, loading, error]);
}
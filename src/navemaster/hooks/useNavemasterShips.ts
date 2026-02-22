// src/navemaster/hooks/useNavemasterShips.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { ShipLite } from "../contracts/navemaster.types";

export function useNavemasterShips(): {
  ships: ShipLite[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [ships, setShips] = useState<ShipLite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("ships")
      .select("id, code, name, costr, commessa, is_active")
      .order("code", { ascending: true });

    if (error) {
      setError(error.message || "ships load error");
      setShips([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as ShipLite[];
    // Keep inactive out by default (ABD: avoid noise)
    setShips(list.filter((s) => s.is_active !== false));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return useMemo(
    () => ({
      ships,
      loading,
      error,
      refresh: load,
    }),
    [ships, loading, error]
  );
}
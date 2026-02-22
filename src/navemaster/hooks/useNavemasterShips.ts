// src/navemaster/hooks/useNavemasterShips.ts
import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";

export type ShipLite = {
  id: string;
  code: string | null;
  name: string | null;
  costr: string | null;
  commessa: string | null;
  is_active: boolean;
};

export function useNavemasterShips(): {
  ships: ShipLite[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [ships, setShips] = useState<ShipLite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    // CNCS rule: do not rely on `ships` visibility.
    // Use the scoped view so CAPO sees only his perimeter.
    const { data, error } = await supabase
      .from("navemaster_ships_scope_v1")
      .select("id, code, name, costr, commessa, is_active")
      .order("code", { ascending: true });

    if (error) {
      setError(error.message);
      setShips([]);
      setLoading(false);
      return;
    }

    setShips((data ?? []) as ShipLite[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ships, loading, error, refresh: load };
}
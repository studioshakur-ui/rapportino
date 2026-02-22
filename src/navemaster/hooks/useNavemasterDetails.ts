// src/navemaster/hooks/useNavemasterDetails.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { NavemasterIncaAlert, NavemasterRowDetails } from "../contracts/navemaster.types";

export function useNavemasterRowDetails(rowId: string | null): {
  row: NavemasterRowDetails | null;
  alerts: NavemasterIncaAlert[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [row, setRow] = useState<NavemasterRowDetails | null>(null);
  const [alerts, setAlerts] = useState<NavemasterIncaAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!rowId) {
      setRow(null);
      setAlerts([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: r, error: e1 } = await supabase
      .from("navemaster_rows")
      .select(
        "id, navemaster_import_id, marcacavo, descrizione, stato_cavo, situazione_cavo_conit, livello, sezione, tipologia, zona_da, zona_a, apparato_da, apparato_a, impianto, payload"
      )
      .eq("id", rowId)
      .maybeSingle();

    if (e1) {
      setError(e1.message || "details error");
      setRow(null);
      setAlerts([]);
      setLoading(false);
      return;
    }

    const rowData = (r as NavemasterRowDetails | null) ?? null;
    setRow(rowData);

    if (!rowData?.marcacavo) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    // alerts for this marcacavo (ship filter is applied at page level; here we only filter by marcacavo)
    const { data: a, error: e2 } = await supabase
      .from("navemaster_inca_alerts")
      .select("id, ship_id, inca_file_id, marcacavo, navemaster_state, inca_state, rule, created_at, severity, meta")
      .eq("marcacavo", rowData.marcacavo)
      .order("created_at", { ascending: false })
      .limit(200);

    if (e2) {
      // non-fatal for row details
      setAlerts([]);
      setLoading(false);
      return;
    }

    setAlerts((a ?? []) as NavemasterIncaAlert[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId]);

  return useMemo(() => ({ row, alerts, loading, error, refresh: load }), [row, alerts, loading, error]);
}
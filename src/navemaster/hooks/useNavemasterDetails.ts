// src/navemaster/hooks/useNavemasterDetails.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { NavemasterAlertV2, NavemasterRowDetailsV2 } from "../contracts/navemaster.types";

export function useNavemasterRowDetails(rowId: string | null): {
  row: NavemasterRowDetailsV2 | null;
  alerts: NavemasterAlertV2[];
  events: Array<{
    id: string;
    event_type: string;
    event_at: string;
    note: string | null;
    blocco_locale_id: string | null;
  }>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [row, setRow] = useState<NavemasterRowDetailsV2 | null>(null);
  const [alerts, setAlerts] = useState<NavemasterAlertV2[]>([]);
  const [events, setEvents] = useState<
    Array<{ id: string; event_type: string; event_at: string; note: string | null; blocco_locale_id: string | null }>
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!rowId) {
      setRow(null);
      setAlerts([]);
      setEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: r, error: e1 } = await supabase
      .from("navemaster_state_rows")
      .select(
        "id, run_id, ship_id, inca_file_id, codice, codice_norm, stato_nav, metri_ref, metri_posati_ref, delta_metri, descrizione, impianto, tipo, sezione, livello, zona_da, zona_a, apparato_da, apparato_a, descrizione_da, descrizione_a, wbs, last_proof_at, last_rapportino_id, coverage, created_at"
      )
      .eq("id", rowId)
      .maybeSingle();

    if (e1) {
      setError(e1.message || "details error");
      setRow(null);
      setAlerts([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const rowData = (r as NavemasterRowDetailsV2 | null) ?? null;
    setRow(rowData);

    if (!rowData?.codice_norm || !rowData?.run_id) {
      setAlerts([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    // alerts for this codice (scoped by run)
    const { data: a, error: e2 } = await supabase
      .from("navemaster_alerts")
      .select("id, run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence, status, created_at")
      .eq("run_id", rowData.run_id)
      .eq("codice_norm", rowData.codice_norm)
      .order("created_at", { ascending: false })
      .limit(200);

    if (e2) {
      // non-fatal for row details
      setAlerts([]);
    } else {
      setAlerts((a ?? []) as NavemasterAlertV2[]);
    }

    const { data: ev, error: e3 } = await supabase
      .from("navemaster_events")
      .select("id, event_type, event_at, note, blocco_locale_id")
      .eq("ship_id", rowData.ship_id)
      .eq("codice_norm", rowData.codice_norm)
      .order("event_at", { ascending: false })
      .limit(50);

    if (e3) {
      setEvents([]);
    } else {
      setEvents((ev ?? []) as any);
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId]);

  return useMemo(() => ({ row, alerts, events, loading, error, refresh: load }), [row, alerts, events, loading, error]);
}

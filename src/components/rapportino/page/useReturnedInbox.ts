// /src/components/rapportino/page/useReturnedInbox.js
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export function useReturnedInbox({
  profileId,
  crewRole,
}: {
  profileId: unknown;
  crewRole: unknown;
}) {
  const [returnedCount, setReturnedCount] = useState<number>(0);
  const [latestReturned, setLatestReturned] = useState<Record<string, unknown> | null>(null);
  const [returnedLoading, setReturnedLoading] = useState<boolean>(false);

  const loadReturnedInbox = useCallback(async () => {
    if (!profileId) {
      setReturnedCount(0);
      setLatestReturned(null);
      return;
    }

    setReturnedLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from("rapportini")
        .select("id", { count: "exact", head: true })
        .eq("capo_id", profileId)
        .eq("crew_role", crewRole)
        .eq("status", "RETURNED");

      if (countError) throw countError;

      const { data: last, error: lastError } = await supabase
        .from("rapportini")
        .select("id, report_date, costr, commessa, updated_at")
        .eq("capo_id", profileId)
        .eq("crew_role", crewRole)
        .eq("status", "RETURNED")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError && (lastError as { code?: string } | null | undefined)?.code !== "PGRST116") throw lastError;

      setReturnedCount(Number(count || 0));
      setLatestReturned(last || null);
    } catch (e) {
      console.warn("[Rapportino] returned inbox load failed:", e);
      setReturnedCount(0);
      setLatestReturned(null);
    } finally {
      setReturnedLoading(false);
    }
  }, [profileId, crewRole]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await loadReturnedInbox();
    })();
    return () => {
      active = false;
    };
  }, [loadReturnedInbox]);

  return {
    returnedCount,
    latestReturned,
    returnedLoading,
    loadReturnedInbox,
  };
}

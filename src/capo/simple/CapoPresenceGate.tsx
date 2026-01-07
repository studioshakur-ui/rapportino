// src/capo/simple/CapoPresenceGate.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Props = { children: React.ReactNode };

function localIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CapoPresenceGate({ children }: Props): JSX.Element {
  const nav = useNavigate();
  const { shipId } = useParams();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const today = useMemo(() => localIsoDate(), []);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        setLoading(true);
        setAllowed(false);

        if (!shipId) {
          nav("/app", { replace: true });
          return;
        }

        // 1) Must be assigned today to this ship
        const { data: assigned, error: aErr } = await supabase
          .from("capo_today_ship_assignments_v1")
          .select("ship_id")
          .eq("plan_date", today)
          .eq("ship_id", shipId)
          .maybeSingle();

        if (aErr) throw aErr;
        if (!assigned?.ship_id) {
          nav("/app", { replace: true });
          return;
        }

        // 2) Must have confirmed presence
        const { data: att, error: attErr } = await supabase
          .from("capo_ship_attendance")
          .select("confirmed_at")
          .eq("plan_date", today)
          .eq("ship_id", shipId)
          .maybeSingle();

        if (attErr) throw attErr;
        if (!att?.confirmed_at) {
          nav(`/app/ship/${shipId}/presence`, { replace: true });
          return;
        }

        if (!mounted) return;
        setAllowed(true);
      } catch (e) {
        console.error("[CapoPresenceGate] error:", e);
        // Fail-safe: send to presence (or entry) to avoid bypass
        if (shipId) {
          nav(`/app/ship/${shipId}/presence`, { replace: true });
        } else {
          nav("/app", { replace: true });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, [shipId, today, nav]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">Verifica presenza…</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">Reindirizzamento…</div>
      </div>
    );
  }

  return <>{children}</>;
}

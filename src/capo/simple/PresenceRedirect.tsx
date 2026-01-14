// src/capo/simple/PresenceRedirect.tsx
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Hard redirect:
 * Any attempt to open /app/ship/:shipId/presence must go to /rapportino.
 * This removes presence as a blocking step.
 */
export default function PresenceRedirect(): JSX.Element {
  const nav = useNavigate();
  const { shipId } = useParams();

  useEffect(() => {
    if (!shipId) {
      nav("/app", { replace: true });
      return;
    }
    nav(`/app/ship/${shipId}/rapportino`, { replace: true });
  }, [shipId, nav]);

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">
        Reindirizzamento…
      </div>
    </div>
  );
}
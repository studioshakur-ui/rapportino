// src/capo/simple/CapoPresencePage.tsx
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Presence is disabled (temporary or permanent).
 * We redirect CAPO straight to Rapportino for the ship.
 * This completely removes any dependency on RLS/presence tables.
 */
export default function CapoPresencePage(): JSX.Element {
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
        Reindirizzamento al rapportino…
      </div>
    </div>
  );
}
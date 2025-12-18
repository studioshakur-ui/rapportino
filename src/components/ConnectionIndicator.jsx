// src/components/ConnectionIndicator.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * ConnectionIndicator
 * - compact: boolean -> si true, affiche uniquement la pastille (cockpit mode)
 * - className: string -> classes additionnelles
 */
export default function ConnectionIndicator({ compact = false, className = "" }) {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    let alive = true;
    let timer = null;

    const tick = async () => {
      try {
        const { data, error } = await supabase.rpc("ping");
        if (!alive) return;

        // ping() doit retourner { ok: true } si tout va bien
        const isOk = !error && data?.ok === true;
        setOk(isOk);
      } catch (e) {
        if (!alive) return;
        setOk(false);
      }
    };

    // tick immédiat + interval
    tick();
    timer = setInterval(tick, 15000);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const title = useMemo(() => {
    return ok ? "Connessione: Online" : "Connessione: Offline";
  }, [ok]);

  // Cockpit compact: pastille seule, aucun texte (pour top bar)
  if (compact) {
    return (
      <span
        title={title}
        aria-label={title}
        className={[
          "inline-block w-2.5 h-2.5 rounded-full",
          ok ? "bg-emerald-500" : "bg-rose-500",
          "shadow-[0_0_10px_rgba(16,185,129,0.25)]",
          !ok ? "shadow-[0_0_10px_rgba(244,63,94,0.25)]" : "",
          className,
        ].join(" ")}
      />
    );
  }

  // Mode standard: pastille + label (utile hors top bar)
  return (
    <div
      className={["flex items-center gap-2 text-[11px]", className].join(" ")}
      title={title}
      aria-label={title}
    >
      <span
        className={[
          "inline-block w-2.5 h-2.5 rounded-full",
          ok ? "bg-emerald-500" : "bg-rose-500",
        ].join(" ")}
      />
      <span className="text-slate-500">{ok ? "Online" : "Offline"}</span>
    </div>
  );
}

// src/capo/simple/CapoSimpleEntry.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type ShipAssignment = {
  plan_date: string; // YYYY-MM-DD
  ship_id: string;
  ship_code: string | null;
  ship_name: string | null;
  costr: string | null;
  commessa: string | null;
  position: number | null;
};

function cn(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(" ");
}

function localIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CapoSimpleEntry(): JSX.Element {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [ships, setShips] = useState<ShipAssignment[]>([]);

  const today = useMemo(() => localIsoDate(), []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const { data: rows, error } = await supabase
          .from("capo_today_ship_assignments_v1")
          .select("plan_date, ship_id, ship_code, ship_name, costr, commessa, position")
          .eq("plan_date", today)
          .order("position", { ascending: true });

        if (error) throw error;
        if (!mounted) return;

        const list = (Array.isArray(rows) ? rows : []) as ShipAssignment[];
        setShips(list);

        if (list.length === 1 && list[0]?.ship_id) {
          nav(`/app/ship/${list[0].ship_id}/presence`, { replace: true });
        }
      } catch (e) {
        console.error("[CapoSimpleEntry] load error:", e);
        if (!mounted) return;
        setErr("Impossibile caricare le assegnazioni di oggi (verifica view/RLS)." );
        setShips([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [today, nav]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">Caricamento…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-4 space-y-3">
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-100">{err}</div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-[12px] font-semibold text-slate-100"
        >
          Riprova
        </button>
      </div>
    );
  }

  if (ships.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 space-y-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">CAPO · OGGI ({today})</div>
          <div className="text-[16px] font-semibold">Nessuna assegnazione oggi</div>
          <div className="text-[13px] text-slate-300">
            Contatta il tuo Manager per assegnare il cantiere (max 2 ships).
          </div>
        </div>
      </div>
    );
  }

  // 2 ships max by rule, show simple selector
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 space-y-1">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">CAPO · OGGI ({today})</div>
        <div className="text-[16px] font-semibold">Seleziona il cantiere</div>
        <div className="text-[12px] text-slate-400">Hai 2 assegnazioni. Scegli 1 ship per fare la presenza.</div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {ships.slice(0, 2).map((s) => (
          <button
            key={s.ship_id}
            type="button"
            onClick={() => nav(`/app/ship/${s.ship_id}/presence`)}
            className={cn(
              "w-full text-left rounded-2xl border border-slate-800 bg-slate-950/60 p-4",
              "hover:bg-slate-900/40 active:scale-[0.99] transition"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-50 truncate">
                  {s.ship_code || "—"} · {s.ship_name || "Ship"}
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  COSTR {s.costr || "—"} · COMMESSA {s.commessa || "—"}
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-semibold text-slate-200">
                #{s.position ?? "?"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

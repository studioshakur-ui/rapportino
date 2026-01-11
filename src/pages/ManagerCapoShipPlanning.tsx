import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

type CapoRow = {
  capo_id: string;
  display_name: string | null;
  email: string | null;
};

type ShipRow = {
  ship_id: string;
  ship_code: string | null;
  ship_name: string | null;
  costr: string | null;
  commessa: string | null;
};

type ShipOption = {
  id: string;
  code: string | null;
  name: string | null;
  costr: string | null;
  commessa: string | null;
};

function cn(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(" ");
}

function safeText(v: unknown): string {
  return (v == null ? "" : String(v)).trim();
}

function cardClass(): string {
  return cn(
    "rounded-2xl border border-slate-800 bg-slate-950",
    "shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
  );
}

function btnGhost(): string {
  return cn(
    "inline-flex items-center justify-center rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

function btnPrimary(): string {
  return cn(
    "inline-flex items-center justify-center rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "border-sky-400/55 text-slate-50 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

function sectionTitle(kicker: string, title: string, right?: React.ReactNode) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">{kicker}</div>
        <div className="mt-1 text-[14px] font-semibold text-slate-50 truncate">{title}</div>
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

function pillClass(active: boolean): string {
  const base = "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold leading-none";
  return cn(
    base,
    active
      ? "border-sky-400/65 bg-slate-50/10 text-slate-50"
      : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/45",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
  );
}

export default function ManagerCapoShipPlanning(): JSX.Element {
  const { uid, session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  const [capi, setCapi] = useState<CapoRow[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);

  const [capoId, setCapoId] = useState<string>("");

  // Ship assignment is PERENNE: we store it in ship_capos, not capo_ship_assignments.
  const [ship1, setShip1] = useState<string>("");
  const [ship2, setShip2] = useState<string>("");

  const assignedLabel = useMemo(() => {
    const byId = new Map(ships.map((s) => [s.id, s]));
    const ids = [ship1, ship2].filter(Boolean);
    const labels = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((s) => safeText(s?.code) || safeText(s?.name) || safeText(s?.id).slice(0, 8));
    if (labels.length === 0) return "—";
    return labels.join(", ");
  }, [ship1, ship2, ships]);

  const loadPerimeter = async () => {
    if (!uid || !session) {
      setCapi([]);
      setShips([]);
      return;
    }

    setLoading(true);
    setErr("");
    setToast("");

    try {
      // 1) Capi assigned to Manager (canonical)
      const { data: capiData, error: capiErr } = await supabase.rpc("manager_my_capi_v1");
      if (capiErr) throw capiErr;
      const capiList: CapoRow[] = (Array.isArray(capiData) ? capiData : []).map((r: any) => ({
        capo_id: r.capo_id,
        display_name: r.display_name || null,
        email: r.email || null,
      }));
      setCapi(capiList);

      // 2) Ships in Manager perimeter (canonical)
      const { data: shipData, error: shipErr } = await supabase.rpc("manager_my_ships_v1");
      if (shipErr) throw shipErr;

      const shipList: ShipOption[] = (Array.isArray(shipData) ? shipData : [])
        .map((r: any) => ({
          id: r.ship_id,
          code: r.ship_code || null,
          name: r.ship_name || null,
          costr: r.costr || null,
          commessa: r.commessa || null,
        }))
        .sort((a: ShipOption, b: ShipOption) => safeText(a.code || a.name).localeCompare(safeText(b.code || b.name)));
      setShips(shipList);

      // Default capo selection
      if (!capoId && capiList.length > 0) {
        setCapoId(capiList[0].capo_id);
      }
    } catch (e) {
      console.error("[ManagerCapoShipPlanning] loadPerimeter error:", e);
      setErr("Impossibile caricare perimetro (RPC/RLS). Verifica manager_my_capi_v1 / manager_my_ships_v1.");
      setCapi([]);
      setShips([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentShipAssignments = async (nextCapoId: string) => {
    if (!nextCapoId) {
      setShip1("");
      setShip2("");
      return;
    }

    setErr("");
    setToast("");

    try {
      // Read perenne assignments from ship_capos.
      // Ordering is deterministic via created_at. "position" (for UI) can be derived by row_number() in DB views.
      const { data, error } = await supabase
        .from("ship_capos")
        .select(
          `
          ship_id,
          capo_id,
          created_at,
          ships:ship_id ( id, code, name, costr, commessa )
        `
        )
        .eq("capo_id", nextCapoId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const ids = rows.map((r: any) => r.ship_id).filter(Boolean);
      setShip1(ids[0] || "");
      setShip2(ids[1] || "");
    } catch (e) {
      console.error("[ManagerCapoShipPlanning] loadCurrentShipAssignments error:", e);
      setErr("Impossibile caricare assegnazioni attive (ship_capos). Verifica RLS/perimetro.");
      setShip1("");
      setShip2("");
    }
  };

  useEffect(() => {
    loadPerimeter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!capoId) return;
    loadCurrentShipAssignments(capoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capoId]);

  const saveAssignments = async () => {
    if (!uid) {
      setErr("Non autenticato.");
      return;
    }
    if (!capoId) {
      setErr("Seleziona un CAPO.");
      return;
    }

    setBusy(true);
    setErr("");
    setToast("");

    try {
      // Normalize: ship2 cannot equal ship1
      let s1 = safeText(ship1);
      let s2 = safeText(ship2);
      if (s1 && s2 && s1 === s2) s2 = "";

      // Replace strategy: delete all current assignments for this capo, then insert the new set.
      // This guarantees we do not keep stale rows and avoids unique conflicts.
      const { error: delErr } = await supabase.from("ship_capos").delete().eq("capo_id", capoId);
      if (delErr) throw delErr;

      const toInsert = [s1, s2].filter(Boolean).map((shipId) => ({
        ship_id: shipId,
        capo_id: capoId,
        created_by: uid,
      }));

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("ship_capos").insert(toInsert);
        if (insErr) throw insErr;
      }

      await loadCurrentShipAssignments(capoId);
      setToast("Salvato.");
    } catch (e) {
      console.error("[ManagerCapoShipPlanning] saveAssignments error:", e);
      setErr("Salvataggio assegnazioni fallito (RLS o DB). Verifica ship_capos / ship_managers / manager_capo_assignments.");
    } finally {
      setBusy(false);
    }
  };

  const capoLabel = useMemo(() => {
    const c = capi.find((x) => x.capo_id === capoId);
    return safeText(c?.display_name) || safeText(c?.email) || "—";
  }, [capi, capoId]);

  const shipOptions = useMemo(() => {
    const list = Array.isArray(ships) ? ships : [];
    const fmt = (s: ShipOption) => {
      const left = safeText(s.code) || "—";
      const right = safeText(s.name) || "Ship";
      const meta = [safeText(s.costr), safeText(s.commessa)].filter(Boolean).join(" · ");
      return meta ? `${left} · ${right} (${meta})` : `${left} · ${right}`;
    };

    return list.map((s) => ({ id: s.id, label: fmt(s) }));
  }, [ships]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050910] text-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className={cardClass() + " p-4"}>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-300">
              Caricamento…
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050910] text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className={cardClass() + " p-4"}>
          {sectionTitle(
            "MANAGER · CAPO · SHIP",
            "Assegnazione perenne Ship → CAPO",
            <button type="button" className={btnGhost()} disabled={busy} onClick={loadPerimeter}>
              Ricarica perimetro
            </button>
          )}

          <div className="mt-2 text-[12px] text-slate-400">
            L’assignation n’est pas journalière: le ship reste sur le CAPO jusqu’à suppression par le Manager.
          </div>
          <div className="mt-1 text-[12px] text-slate-400">
            Les équipes hebdo se gèrent dans <span className="text-slate-200 font-semibold">/manager/assegnazioni</span>.
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-100">
              {err}
            </div>
          ) : null}

          {toast ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-100">
              {toast}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Selectors */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Selettori</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">CAPO</div>
                  <select
                    value={capoId}
                    onChange={(e) => setCapoId(e.target.value)}
                    className={cn(
                      "mt-1 w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                      "border-slate-800 bg-slate-950/70 text-slate-50",
                      "outline-none focus:ring-2 focus:ring-sky-500/35"
                    )}
                  >
                    {capi.length === 0 ? <option value="">— Nessun capo —</option> : null}
                    {capi.map((c) => {
                      const label = safeText(c.display_name) || safeText(c.email) || "—";
                      return (
                        <option key={c.capo_id} value={c.capo_id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <div className="mt-2 text-[12px] text-slate-500">
                    Fonte: RPC <span className="text-slate-200 font-semibold">manager_my_capi_v1()</span>
                  </div>
                </div>

                <div className="md:col-span-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ships assegnati al CAPO</div>

                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <div>
                      <div className="text-[12px] text-slate-400">Ship #1</div>
                      <select
                        value={ship1}
                        onChange={(e) => setShip1(e.target.value)}
                        className={cn(
                          "mt-1 w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                          "border-slate-800 bg-slate-950/70 text-slate-50",
                          "outline-none focus:ring-2 focus:ring-sky-500/35"
                        )}
                      >
                        <option value="">— Nessuno —</option>
                        {shipOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="text-[12px] text-slate-400">Ship #2</div>
                      <select
                        value={ship2}
                        onChange={(e) => setShip2(e.target.value)}
                        className={cn(
                          "mt-1 w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                          "border-slate-800 bg-slate-950/70 text-slate-50",
                          "outline-none focus:ring-2 focus:ring-sky-500/35"
                        )}
                      >
                        <option value="">— Nessuno —</option>
                        {shipOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-2 text-[12px] text-slate-500">
                    Fonte ships: RPC <span className="text-slate-200 font-semibold">manager_my_ships_v1()</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  className={btnPrimary()}
                  disabled={!capoId || busy}
                  onClick={saveAssignments}
                >
                  Salva assegnazioni
                </button>
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={!capoId || busy}
                  onClick={() => loadCurrentShipAssignments(capoId)}
                >
                  Ricarica
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Attivi (perenne)</div>
                <div className="mt-1 text-[12px] text-slate-300">
                  CAPO: <span className="text-slate-50 font-semibold">{capoLabel}</span>
                </div>
                <div className="mt-1 text-[12px] text-slate-300">
                  Ships: <span className="text-slate-50 font-semibold">{assignedLabel}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Notes</div>

              <div className="mt-3 space-y-3 text-[12px] text-slate-300 leading-relaxed">
                <div>
                  Cette page ne pilote plus les équipes “au jour”. Les équipes se font en hebdo dans{" "}
                  <span className="text-slate-50 font-semibold">Assegnazioni</span>.
                </div>
                <div>
                  Côté CAPO, la liste ships “aujourd’hui” reste compatible via une view dédiée (ex: capo_today_ship_assignments_v1),
                  avec plan_date forcée à CURRENT_DATE.
                </div>
                <div>
                  Et surtout: la présence (capo/operator attendance) ne dépend plus de capo_ship_assignments.
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Règles</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={pillClass(true)}>Perenne</span>
                    <span className={pillClass(true)}>Edge-safe</span>
                    <span className={pillClass(true)}>RLS first</span>
                  </div>
                  <div className="mt-2 text-[12px] text-slate-400">
                    Si le save échoue: vérifier <span className="text-slate-200 font-semibold">ship_managers</span> (perimetro),
                    <span className="text-slate-200 font-semibold"> manager_capo_assignments</span> (active=true),
                    et app_role du profil.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

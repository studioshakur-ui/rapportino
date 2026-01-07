// src/pages/ManagerCapoShipPlanning.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n/I18nProvider";

type CapoItem = {
  id: string;
  label: string;
  email?: string;
};

type ShipItem = {
  id: string;
  label: string;
  costr?: string;
  commessa?: string;
};

type OperatorItem = {
  id: string;
  label: string;
  code?: string;
  roles?: string[];
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function safeText(v: unknown) {
  return (v == null ? "" : String(v)).trim();
}

function fmtDateYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function card() {
  return cn(
    "rounded-2xl border border-slate-800 bg-slate-950",
    "shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
  );
}

function btnPrimary(disabled?: boolean) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "border-sky-400/55 text-slate-50 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    disabled ? "opacity-50 cursor-not-allowed" : ""
  );
}

function btnGhost(disabled?: boolean) {
  return cn(
    "inline-flex items-center justify-center rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    disabled ? "opacity-50 cursor-not-allowed" : ""
  );
}

function inputClass() {
  return cn(
    "w-full rounded-xl border border-slate-800 bg-slate-950/60",
    "px-3 py-2 text-[13px] text-slate-100",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
  );
}

function selectClass() {
  return inputClass();
}

function pillMuted() {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-1",
    "border-slate-800 bg-slate-950/40 text-slate-300 text-[11px] font-semibold"
  );
}

type ExpectedState = {
  ship1: Set<string>;
  ship2: Set<string>;
};

export default function ManagerCapoShipPlanning({ isDark = true }: { isDark?: boolean }) {
  const { uid, session } = useAuth() as any;
  const { t } = useI18n() as any;

  const [dayDate, setDayDate] = useState<string>(fmtDateYYYYMMDD(new Date()));

  const [capi, setCapi] = useState<CapoItem[]>([]);
  const [ships, setShips] = useState<ShipItem[]>([]);
  const [operators, setOperators] = useState<OperatorItem[]>([]);

  const [capoId, setCapoId] = useState<string>("");
  const [ship1, setShip1] = useState<string>("");
  const [ship2, setShip2] = useState<string>("");

  const [expectedByShip, setExpectedByShip] = useState<ExpectedState>({
    ship1: new Set<string>(),
    ship2: new Set<string>(),
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPerimeter, setLoadingPerimeter] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  const activeShips = useMemo(() => {
    const ids = [ship1, ship2].filter(Boolean);
    return Array.from(new Set(ids));
  }, [ship1, ship2]);

  const shipMap = useMemo(() => {
    const m = new Map<string, ShipItem>();
    (ships || []).forEach((s) => m.set(s.id, s));
    return m;
  }, [ships]);

  const ship1Name = ship1 ? safeText(shipMap.get(ship1)?.label) : "";
  const ship2Name = ship2 ? safeText(shipMap.get(ship2)?.label) : "";

  const setToastSoft = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 1600);
  };

  // ---------- Load perimeter ----------
  const loadCapi = async () => {
    // RPC must exist: manager_my_capi_v1()
    const { data, error } = await supabase.rpc("manager_my_capi_v1");
    if (error) throw error;

    const list: CapoItem[] = (Array.isArray(data) ? data : []).map((r: any) => ({
      id: r.capo_id,
      label: safeText(r.display_name) || safeText(r.email) || "—",
      email: safeText(r.email) || "",
    }));
    list.sort((a, b) => a.label.localeCompare(b.label));
    setCapi(list);
  };

  const loadOperators = async () => {
    // RPC must exist: manager_my_operators_v1()
    const { data, error } = await supabase.rpc("manager_my_operators_v1");
    if (error) throw error;

    const list: OperatorItem[] = (Array.isArray(data) ? data : []).map((r: any) => ({
      id: r.operator_id,
      label: safeText(r.operator_name) || safeText(r.operator_code) || "—",
      code: safeText(r.operator_code) || "",
      roles: Array.isArray(r.operator_roles) ? r.operator_roles : [],
    }));

    list.sort((a, b) => a.label.localeCompare(b.label));
    setOperators(list);
  };

  const loadShips = async () => {
    // Prefer RPC if you have it. If not, fallback to join ship_managers -> ships.
    try {
      const { data, error } = await supabase.rpc("manager_my_ships_v1");
      if (error) throw error;

      const list: ShipItem[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        id: r.ship_id,
        label:
          safeText(r.ship_code) ||
          safeText(r.ship_name) ||
          safeText(r.code) ||
          safeText(r.name) ||
          "—",
        costr: safeText(r.costr),
        commessa: safeText(r.commessa),
      }));

      list.sort((a, b) => a.label.localeCompare(b.label));
      setShips(list);
      return;
    } catch {
      // fallback below
    }

    const res = await supabase
      .from("ship_managers")
      .select("ship_id, ships:ships(id, code, name, costr, commessa)")
      .eq("manager_id", uid);

    if (res.error) throw res.error;

    const rows = Array.isArray(res.data) ? res.data : [];
    const list: ShipItem[] = rows
      .map((r: any) => {
        const s = r.ships;
        return {
          id: r.ship_id,
          label: safeText(s?.code) || safeText(s?.name) || "—",
          costr: safeText(s?.costr),
          commessa: safeText(s?.commessa),
        };
      })
      .filter((x: ShipItem) => Boolean(x.id));

    list.sort((a, b) => a.label.localeCompare(b.label));
    setShips(list);
  };

  const loadPerimeter = async () => {
    if (!session || !uid) return;
    setLoadingPerimeter(true);
    setErr("");
    try {
      await Promise.all([loadCapi(), loadOperators(), loadShips()]);
    } catch (e) {
      console.error("[ManagerCapoShipPlanning] loadPerimeter error:", e);
      setErr(
        "Perimetro Manager non disponibile. Se ship_managers è bloccata da RLS, crea RPC manager_my_ships_v1()."
      );
    } finally {
      setLoadingPerimeter(false);
    }
  };

  useEffect(() => {
    loadPerimeter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, uid]);

  // ---------- Load existing plan for selected capo/date ----------
  const loadExisting = async () => {
    if (!capoId || !dayDate) return;
    setLoading(true);
    setErr("");
    try {
      const a = await supabase
        .from("capo_ship_assignments")
        .select("*")
        .eq("plan_date", dayDate)
        .eq("capo_id", capoId)
        .order("position", { ascending: true });

      if (a.error) throw a.error;

      const rows = Array.isArray(a.data) ? a.data : [];
      const pos1 = rows.find((r: any) => r.position === 1);
      const pos2 = rows.find((r: any) => r.position === 2);

      setShip1(pos1?.ship_id || "");
      setShip2(pos2?.ship_id || "");

      const e = await supabase
        .from("capo_ship_expected_operators")
        .select("*")
        .eq("plan_date", dayDate)
        .eq("capo_id", capoId);

      if (e.error) throw e.error;

      const expected = Array.isArray(e.data) ? e.data : [];
      const s1 = pos1?.ship_id || "";
      const s2 = pos2?.ship_id || "";

      const ship1Set = new Set<string>(
        expected.filter((x: any) => x.ship_id === s1).map((x: any) => x.operator_id)
      );
      const ship2Set = new Set<string>(
        expected.filter((x: any) => x.ship_id === s2).map((x: any) => x.operator_id)
      );

      setExpectedByShip({ ship1: ship1Set, ship2: ship2Set });
    } catch (e) {
      console.error("[ManagerCapoShipPlanning] loadExisting error:", e);
      setErr("Impossibile caricare assegnazioni esistenti (RLS o DB).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capoId, dayDate]);

  // ---------- Save assignments ----------
  const saveAssignments = async () => {
    if (!capoId) return setErr("Seleziona un CAPO.");
    if (!dayDate) return setErr("Data non valida.");
    if (ship1 && ship2 && ship1 === ship2) return setErr("Ship #1 e Ship #2 non possono essere uguali.");

    setErr("");
    setLoading(true);
    try {
      // replace: delete then insert
      const del = await supabase
        .from("capo_ship_assignments")
        .delete()
        .eq("plan_date", dayDate)
        .eq("capo_id", capoId);

      if (del.error) throw del.error;

      const payload: any[] = [];
      if (ship1) payload.push({ plan_date: dayDate, capo_id: capoId, manager_id: uid, ship_id: ship1, position: 1 });
      if (ship2) payload.push({ plan_date: dayDate, capo_id: capoId, manager_id: uid, ship_id: ship2, position: 2 });

      if (payload.length > 0) {
        const ins = await supabase.from("capo_ship_assignments").insert(payload);
        if (ins.error) throw ins.error;
      }

      setToastSoft("Assegnazioni salvate.");
      await loadExisting();
    } catch (e) {
      console.error("[ManagerCapoShipPlanning] saveAssignments error:", e);
      setErr("Salvataggio assegnazioni fallito (RLS o DB).");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpected = (shipKey: "ship1" | "ship2", operatorId: string) => {
    setExpectedByShip((prev) => {
      const next: ExpectedState = {
        ship1: new Set(prev.ship1),
        ship2: new Set(prev.ship2),
      };
      const set = next[shipKey];
      if (set.has(operatorId)) set.delete(operatorId);
      else set.add(operatorId);
      return next;
    });
  };

  const saveExpectedForShip = async (shipKey: "ship1" | "ship2") => {
    if (!capoId) return setErr("Seleziona un CAPO.");
    if (!dayDate) return setErr("Data non valida.");

    const shipId = shipKey === "ship1" ? ship1 : ship2;
    if (!shipId) return setErr("Seleziona prima il cantiere (ship).");

    setErr("");
    setLoading(true);
    try {
      const del = await supabase
        .from("capo_ship_expected_operators")
        .delete()
        .eq("plan_date", dayDate)
        .eq("capo_id", capoId)
        .eq("ship_id", shipId);

      if (del.error) throw del.error;

      const ids = Array.from(expectedByShip[shipKey] || []);
      const insPayload = ids.map((opId, idx) => ({
        plan_date: dayDate,
        capo_id: capoId,
        manager_id: uid,
        ship_id: shipId,
        operator_id: opId,
        position: idx + 1,
      }));

      if (insPayload.length > 0) {
        const ins = await supabase.from("capo_ship_expected_operators").insert(insPayload);
        if (ins.error) throw ins.error;
      }

      setToastSoft("Operatori salvati.");
    } catch (e) {
      console.error("[ManagerCapoShipPlanning] saveExpectedForShip error:", e);
      setErr("Salvataggio operatori fallito (RLS o DB).");
    } finally {
      setLoading(false);
    }
  };

  if (!session || !uid) {
    return <div className="p-4 text-slate-300">{t?.("APP_LOADING_PROFILE") ?? "Loading…"}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">MANAGER · PLANNING</div>
          <div className="mt-1 text-[14px] font-semibold text-slate-50 truncate">
            Capi · Cantieri · Operai (CAPO Simple)
          </div>
          <div className="mt-2 text-[12px] text-slate-400">
            Assegna fino a 2 ships al CAPO per giorno e definisci gli operatori attesi per la presenza.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {toast ? <span className={pillMuted()}>{toast}</span> : null}
          <button className={btnGhost(loadingPerimeter)} onClick={loadPerimeter} disabled={loadingPerimeter}>
            Ricarica perimetro
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-950/20 p-3 text-[12px] text-rose-100">
          {err}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left */}
        <div className={cn(card(), "p-4")}>
          <div className="text-[11px] font-semibold text-slate-200">Selettori</div>

          <div className="mt-3">
            <label className="block text-[11px] text-slate-400 mb-1">Data</label>
            <input className={inputClass()} type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
          </div>

          <div className="mt-3">
            <label className="block text-[11px] text-slate-400 mb-1">CAPO</label>
            <select className={selectClass()} value={capoId} onChange={(e) => setCapoId(e.target.value)}>
              <option value="">— Seleziona CAPO —</option>
              {capi.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="mt-2 text-[11px] text-slate-500">
              Fonte: RPC <span className="text-slate-300">manager_my_capi_v1()</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button className={btnPrimary(loading || !capoId)} disabled={loading || !capoId} onClick={saveAssignments}>
              Salva assegnazioni
            </button>
            <button className={btnGhost(loading || !capoId)} disabled={loading || !capoId} onClick={loadExisting}>
              Ricarica
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[11px] font-semibold text-slate-200">Regole</div>
            <ul className="mt-2 text-[12px] text-slate-400 space-y-1">
              <li>• Max 2 ships per giorno (position 1/2)</li>
              <li>• Ship #1 ≠ Ship #2</li>
              <li>• Operatori attesi alimentano la pagina Presenza CAPO</li>
            </ul>
          </div>
        </div>

        {/* Middle */}
        <div className={cn(card(), "p-4")}>
          <div className="text-[11px] font-semibold text-slate-200">Ships del giorno</div>

          <div className="mt-3">
            <label className="block text-[11px] text-slate-400 mb-1">Ship #1 (position 1)</label>
            <select className={selectClass()} value={ship1} onChange={(e) => setShip1(e.target.value)}>
              <option value="">— Nessuno —</option>
              {ships.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} {s.costr ? `· ${s.costr}` : ""} {s.commessa ? `· ${s.commessa}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <label className="block text-[11px] text-slate-400 mb-1">Ship #2 (position 2)</label>
            <select className={selectClass()} value={ship2} onChange={(e) => setShip2(e.target.value)}>
              <option value="">— Nessuno —</option>
              {ships.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} {s.costr ? `· ${s.costr}` : ""} {s.commessa ? `· ${s.commessa}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-[12px] text-slate-400">
            Attivi oggi:{" "}
            {activeShips.length === 0 ? (
              <span className="text-slate-300">—</span>
            ) : (
              <span className="text-slate-200 font-semibold">
                {ship1Name}
                {ship2Name ? ` · ${ship2Name}` : ""}
              </span>
            )}
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Fonte ships: RPC <span className="text-slate-300">manager_my_ships_v1()</span> (se esiste) oppure join{" "}
            <span className="text-slate-300">ship_managers → ships</span>.
          </div>
        </div>

        {/* Right */}
        <div className={cn(card(), "p-4")}>
          <div className="text-[11px] font-semibold text-slate-200">Operatori attesi</div>
          <div className="mt-2 text-[12px] text-slate-400">
            Seleziona gli operatori attesi per ship. Questo alimenta la Presenza CAPO.
          </div>

          {/* Ship1 ops */}
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold text-slate-200">
                Ship #1: <span className="text-slate-300">{ship1Name || "—"}</span>
              </div>
              <button
                className={btnPrimary(loading || !ship1)}
                disabled={loading || !ship1}
                onClick={() => saveExpectedForShip("ship1")}
              >
                Salva
              </button>
            </div>

            {!ship1 ? (
              <div className="mt-2 text-[12px] text-slate-500">Seleziona Ship #1 per gestire gli operatori.</div>
            ) : (
              <div className="mt-3 max-h-[240px] overflow-auto pr-1">
                {operators.map((o) => {
                  const checked = expectedByShip.ship1.has(o.id);
                  return (
                    <label key={o.id} className="flex items-center gap-2 py-1 text-[12px] text-slate-200">
                      <input type="checkbox" checked={checked} onChange={() => toggleExpected("ship1", o.id)} />
                      <span className="min-w-0 truncate">
                        {o.label} {o.code ? <span className="text-slate-500">· {o.code}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ship2 ops */}
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold text-slate-200">
                Ship #2: <span className="text-slate-300">{ship2Name || "—"}</span>
              </div>
              <button
                className={btnPrimary(loading || !ship2)}
                disabled={loading || !ship2}
                onClick={() => saveExpectedForShip("ship2")}
              >
                Salva
              </button>
            </div>

            {!ship2 ? (
              <div className="mt-2 text-[12px] text-slate-500">Seleziona Ship #2 per gestire gli operatori.</div>
            ) : (
              <div className="mt-3 max-h-[240px] overflow-auto pr-1">
                {operators.map((o) => {
                  const checked = expectedByShip.ship2.has(o.id);
                  return (
                    <label key={o.id} className="flex items-center gap-2 py-1 text-[12px] text-slate-200">
                      <input type="checkbox" checked={checked} onChange={() => toggleExpected("ship2", o.id)} />
                      <span className="min-w-0 truncate">
                        {o.label} {o.code ? <span className="text-slate-500">· {o.code}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Fonte operatori: RPC <span className="text-slate-300">manager_my_operators_v1()</span>
          </div>
        </div>
      </div>
    </div>
  );
}

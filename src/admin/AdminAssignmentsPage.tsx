import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAdminConsole } from "./AdminConsoleContext";

type ProfileRow = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  app_role?: string | null;
};

type ShipRow = {
  id: string;
  code?: string | null;
  name?: string | null;
  costr?: string | null;
  commessa?: string | null;
};

type AssignmentRow = {
  capo_id: string;
  manager_id: string;
  active: boolean;
  created_at?: string | null;
};

type ShipManagerRow = {
  ship_id: string;
  manager_id: string;
  created_at?: string | null;
};

function cn(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(" ");
}

function labelOf(p?: ProfileRow | null): string {
  return (p?.display_name || p?.full_name || p?.email || p?.id || "—").trim();
}

function scopeLabelOfShip(s?: ShipRow | null): string {
  if (!s) return "—";
  const costr = (s.costr || "").trim();
  const commessa = (s.commessa || "").trim();
  if (costr && commessa) return `${costr} · ${commessa}`;
  return (s.code || s.name || s.id || "—").trim();
}

function shipLabel(s?: ShipRow | null): string {
  if (!s) return "—";
  const code = (s.code || "").trim();
  const name = (s.name || "").trim();
  const scope = scopeLabelOfShip(s);
  if (code && name) return `${code} · ${name} (${scope})`;
  if (code) return `${code} (${scope})`;
  if (name) return `${name} (${scope})`;
  return scope;
}

export default function AdminAssignmentsPage(): JSX.Element {
  const { setConfig, resetConfig, registerSearchItems, clearSearchItems, setRecentItems } = useAdminConsole();

  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  const [managers, setManagers] = useState<ProfileRow[]>([]);
  const [capi, setCapi] = useState<ProfileRow[]>([]);
  const [ships, setShips] = useState<ShipRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [shipManagers, setShipManagers] = useState<ShipManagerRow[]>([]);

  const [q, setQ] = useState<string>("");
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [newCostr, setNewCostr] = useState<string>("");
  const [newCommessa, setNewCommessa] = useState<string>("");

  const loadAll = async (): Promise<void> => {
    setLoading(true);
    setErr("");
    try {
      const [mgrRes, capoRes, shipRes, asgRes, shipMgrRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, full_name, email, app_role")
          .eq("app_role", "MANAGER")
          .order("display_name", { ascending: true }),

        supabase
          .from("profiles")
          .select("id, display_name, full_name, email, app_role")
          .eq("app_role", "CAPO")
          .order("display_name", { ascending: true }),

        supabase
          .from("ships")
          .select("id, code, name, costr, commessa")
          .order("code", { ascending: true }),

        supabase
          .from("manager_capo_assignments")
          .select("capo_id, manager_id, active, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("ship_managers")
          .select("ship_id, manager_id, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (mgrRes.error) throw mgrRes.error;
      if (capoRes.error) throw capoRes.error;
      if (shipRes.error) throw shipRes.error;
      if (asgRes.error) throw asgRes.error;
      if (shipMgrRes.error) throw shipMgrRes.error;

      const mgrs = Array.isArray(mgrRes.data) ? (mgrRes.data as ProfileRow[]) : [];
      setManagers(mgrs);
      setCapi(Array.isArray(capoRes.data) ? (capoRes.data as ProfileRow[]) : []);
      setShips(Array.isArray(shipRes.data) ? (shipRes.data as ShipRow[]) : []);
      setAssignments(Array.isArray(asgRes.data) ? (asgRes.data as AssignmentRow[]) : []);
      setShipManagers(Array.isArray(shipMgrRes.data) ? (shipMgrRes.data as ShipManagerRow[]) : []);

      if (!selectedManagerId && mgrs.length > 0) {
        setSelectedManagerId(mgrs[0].id);
      }
    } catch (e) {
      console.error("[AdminAssignmentsPage] load error:", e);
      setErr("Impossibile caricare manager/capi/scope (verifica RLS).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const managerById = useMemo(() => new Map(managers.map((x) => [x.id, x])), [managers]);
  const shipById = useMemo(() => new Map(ships.map((x) => [x.id, x])), [ships]);

  const assignmentByCapo = useMemo(() => {
    const map = new Map<string, AssignmentRow>();
    for (const a of assignments) map.set(a.capo_id, a);
    return map;
  }, [assignments]);

  const scopesByManager = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const sm of shipManagers) {
      const s = shipById.get(sm.ship_id);
      if (!s) continue;
      const lbl = scopeLabelOfShip(s);
      const arr = map.get(sm.manager_id) || [];
      if (!arr.includes(lbl)) arr.push(lbl);
      map.set(sm.manager_id, arr);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.localeCompare(b));
      map.set(k, arr);
    }
    return map;
  }, [shipManagers, shipById]);

  const capiCountByManager = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      if (!a.manager_id || !a.active) continue;
      map.set(a.manager_id, (map.get(a.manager_id) || 0) + 1);
    }
    return map;
  }, [assignments]);

  const filteredManagers = useMemo(() => {
    const qq = (q || "").trim().toLowerCase();
    if (!qq) return managers;
    return managers.filter((m) => {
      const blob = [
        m.id,
        m.display_name,
        m.full_name,
        m.email,
        (scopesByManager.get(m.id) || []).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [managers, q, scopesByManager]);

  const selectedManager = useMemo(
    () => managers.find((m) => m.id === selectedManagerId) || null,
    [managers, selectedManagerId]
  );

  const selectedManagerCapos = useMemo(() => {
    if (!selectedManagerId) return new Set<string>();
    return new Set(
      assignments
        .filter((a) => a.manager_id === selectedManagerId)
        .map((a) => a.capo_id)
    );
  }, [assignments, selectedManagerId]);

  const selectedManagerShips = useMemo(() => {
    if (!selectedManagerId) return new Set<string>();
    return new Set(
      shipManagers
        .filter((x) => x.manager_id === selectedManagerId)
        .map((x) => x.ship_id)
    );
  }, [shipManagers, selectedManagerId]);

  const capiRows = useMemo(() => {
    return capi.map((c) => {
      const a = assignmentByCapo.get(c.id);
      const currentManager = a?.manager_id ? managerById.get(a.manager_id) : null;
      const assignedToSelected = Boolean(a && a.manager_id === selectedManagerId);
      return {
        capo: c,
        assignment: a || null,
        currentManagerLabel: labelOf(currentManager),
        assignedToSelected,
      };
    });
  }, [capi, assignmentByCapo, managerById, selectedManagerId]);

  const searchItems = useMemo(() => {
    return managers.map((m) => {
      const capiCount = capiCountByManager.get(m.id) || 0;
      const scopes = scopesByManager.get(m.id) || [];
      return {
        id: m.id,
        entity: "Assignments",
        title: labelOf(m),
        subtitle: `Capi: ${capiCount} · Scope: ${scopes.length}`,
        route: "/admin/assignments",
        tokens: [m.id, m.display_name, m.full_name, m.email, scopes.join(" ")].filter(Boolean).join(" "),
      };
    });
  }, [managers, capiCountByManager, scopesByManager]);

  const recent = useMemo(() => {
    return managers.slice(0, 5).map((m) => ({
      id: m.id,
      title: labelOf(m),
      subtitle: `Capi ${capiCountByManager.get(m.id) || 0}`,
      route: "/admin/assignments",
    }));
  }, [managers, capiCountByManager]);

  useEffect(() => {
    setConfig({
      title: "Assignments (Manager scope)",
      searchPlaceholder: "Cerca manager, costr, commessa…",
    });
    return () => resetConfig();
  }, [setConfig, resetConfig]);

  useEffect(() => {
    registerSearchItems("Assignments", searchItems);
    return () => clearSearchItems("Assignments");
  }, [registerSearchItems, clearSearchItems, searchItems]);

  useEffect(() => {
    setRecentItems(recent);
    return () => setRecentItems([]);
  }, [setRecentItems, recent]);

  const assignCapoToManager = async (capoId: string, managerId: string): Promise<void> => {
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase
        .from("manager_capo_assignments")
        .upsert({ capo_id: capoId, manager_id: managerId, active: true }, { onConflict: "capo_id" });
      if (error) throw error;
      await loadAll();
    } catch (e) {
      console.error("[AdminAssignmentsPage] assignCapoToManager error:", e);
      setErr("Errore salvando assegnazione CAPO → Manager.");
    } finally {
      setBusy(false);
    }
  };

  const unassignCapo = async (capoId: string): Promise<void> => {
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase
        .from("manager_capo_assignments")
        .delete()
        .eq("capo_id", capoId);
      if (error) throw error;
      await loadAll();
    } catch (e) {
      console.error("[AdminAssignmentsPage] unassignCapo error:", e);
      setErr("Errore rimuovendo assegnazione CAPO.");
    } finally {
      setBusy(false);
    }
  };

  const toggleCapoActive = async (capoId: string, nextActive: boolean): Promise<void> => {
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase
        .from("manager_capo_assignments")
        .update({ active: nextActive })
        .eq("capo_id", capoId);
      if (error) throw error;
      await loadAll();
    } catch (e) {
      console.error("[AdminAssignmentsPage] toggleCapoActive error:", e);
      setErr("Errore aggiornando stato assegnazione CAPO.");
    } finally {
      setBusy(false);
    }
  };

  const addScopeShip = async (shipId: string, managerId: string): Promise<void> => {
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase
        .from("ship_managers")
        .upsert({ ship_id: shipId, manager_id: managerId }, { onConflict: "ship_id,manager_id" });
      if (error) throw error;
      await loadAll();
    } catch (e) {
      console.error("[AdminAssignmentsPage] addScopeShip error:", e);
      setErr("Errore salvando scope Manager (nave).");
    } finally {
      setBusy(false);
    }
  };

  const removeScopeShip = async (shipId: string, managerId: string): Promise<void> => {
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase
        .from("ship_managers")
        .delete()
        .eq("ship_id", shipId)
        .eq("manager_id", managerId);
      if (error) throw error;
      await loadAll();
    } catch (e) {
      console.error("[AdminAssignmentsPage] removeScopeShip error:", e);
      setErr("Errore rimuovendo scope Manager (nave).");
    } finally {
      setBusy(false);
    }
  };

  const createScopeAndAssign = async (): Promise<void> => {
    const managerId = selectedManagerId;
    const costr = newCostr.trim();
    const commessa = newCommessa.trim();

    if (!managerId) {
      setErr("Seleziona prima un manager.");
      return;
    }
    if (!costr || !commessa) {
      setErr("Compila costr e commessa per creare un nuovo scope.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      // 1) Reuse existing ship if same scope already exists
      const existing = ships.find(
        (s) =>
          (s.costr || "").trim().toLowerCase() === costr.toLowerCase() &&
          (s.commessa || "").trim().toLowerCase() === commessa.toLowerCase()
      );
      let shipId = existing?.id || "";

      // 2) Otherwise create a new ship with derived code/name
      if (!shipId) {
        const code = `${costr}-${commessa}`.replace(/\s+/g, "-").toUpperCase().slice(0, 64);
        const name = `COSTR ${costr} · ${commessa}`.slice(0, 120);

        const { data: insertedShip, error: shipErr } = await supabase
          .from("ships")
          .insert({
            costr,
            commessa,
            code,
            name,
            is_active: true,
          })
          .select("id")
          .single();
        if (shipErr) {
          const sx = shipErr as { code?: string; message?: string };
          if (sx?.code === "42501") {
            setErr(
              "RLS bloque la création de nave (table ships). Applique la migration policy ADMIN INSERT sur ships, puis réessaie ici."
            );
            return;
          }
          throw shipErr;
        }
        shipId = String((insertedShip as { id: string }).id || "");
      }

      if (!shipId) throw new Error("Nave non risolta.");

      // 3) Link ship to selected manager
      const { error: linkErr } = await supabase
        .from("ship_managers")
        .upsert({ ship_id: shipId, manager_id: managerId }, { onConflict: "ship_id,manager_id" });
      if (linkErr) throw linkErr;

      setNewCostr("");
      setNewCommessa("");
      await loadAll();
    } catch (e) {
      console.error("[AdminAssignmentsPage] createScopeAndAssign error:", e);
      setErr("Errore creando/collegando scope manager.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl theme-panel p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="kicker">ADMIN · MANAGER ORIENTED</div>
            <div className="mt-1 text-[14px] font-semibold theme-text">Manager → CAPO + Scope (costr/commessa)</div>
            <div className="mt-1 text-[12px] theme-text-muted">
              Tables: <span className="theme-text font-semibold">manager_capo_assignments</span> +{" "}
              <span className="theme-text font-semibold">ship_managers</span>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center justify-center rounded-full border theme-border bg-[var(--panel2)] px-4 py-2 text-[12px] font-semibold theme-text hover:bg-[var(--panel)]"
            disabled={busy}
          >
            Ricarica
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-8">
            <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">Cerca manager</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, email, costr, commessa…"
              className="mt-1 w-full rounded-xl theme-input px-3 py-2 text-[13px] outline-none"
            />
          </div>
          <div className="md:col-span-4 flex items-end gap-2">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold badge-neutral">
              Managers: <span className="ml-2 theme-text">{managers.length}</span>
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold badge-neutral">
              Ships: <span className="ml-2 theme-text">{ships.length}</span>
            </span>
          </div>
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-[var(--role-danger-border)] bg-[var(--role-danger-soft)] px-3 py-2 text-[13px] text-[var(--role-danger-ink)]">
            {err}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-4 rounded-2xl theme-panel overflow-hidden">
          <div className="px-4 py-3 border-b theme-border bg-[var(--panel2)]">
            <div className="text-[12px] theme-text-muted">{loading ? "Caricamento…" : `${filteredManagers.length} manager`}</div>
          </div>
          <div className="divide-y theme-border max-h-[68vh] overflow-auto">
            {filteredManagers.map((m) => {
              const isActive = m.id === selectedManagerId;
              const scopes = scopesByManager.get(m.id) || [];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedManagerId(m.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-[var(--panel2)]",
                    isActive ? "bg-[var(--panel2)]" : ""
                  )}
                >
                  <div className="text-[13px] font-semibold theme-text truncate">{labelOf(m)}</div>
                  <div className="mt-1 text-[11px] theme-text-muted truncate">
                    Capi attivi: {capiCountByManager.get(m.id) || 0} · Scope: {scopes.length}
                  </div>
                  <div className="mt-1 text-[11px] theme-text-muted truncate">
                    {(m.email || "").trim() || "—"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-8 space-y-3">
          <div className="rounded-2xl theme-panel p-4">
            <div className="text-[12px] theme-text-muted">Manager selezionato</div>
            <div className="mt-1 text-[14px] font-semibold theme-text">{labelOf(selectedManager)}</div>
            <div className="mt-1 text-[12px] theme-text-muted">
              Scope attuale: {(scopesByManager.get(selectedManagerId) || []).length} costr/commessa
            </div>
          </div>

          <div className="rounded-2xl theme-panel overflow-hidden">
            <div className="px-4 py-3 border-b theme-border bg-[var(--panel2)] flex items-center justify-between">
              <div className="text-[12px] theme-text-muted">CAPO assegnati al manager</div>
              <div className="text-[11px] theme-text-muted">{selectedManagerCapos.size} assegnati</div>
            </div>
            <div className="divide-y theme-border max-h-[34vh] overflow-auto">
              {capiRows.map((row) => {
                const c = row.capo;
                const a = row.assignment;
                const checked = row.assignedToSelected;
                return (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold theme-text truncate">{labelOf(c)}</div>
                        <div className="text-[11px] theme-text-muted truncate">
                          Attuale: {a ? row.currentManagerLabel : "— Nessun manager —"}
                          {a && !a.active ? " · inactive" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!checked ? (
                          <button
                            type="button"
                            disabled={!selectedManagerId || busy}
                            onClick={() => assignCapoToManager(c.id, selectedManagerId)}
                            className="rounded-full border px-3 py-1 text-[12px] font-semibold badge-info"
                          >
                            Assegna
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleCapoActive(c.id, !Boolean(a?.active))}
                              className={cn(
                                "rounded-full border px-3 py-1 text-[12px] font-semibold",
                                a?.active ? "badge-success" : "badge-neutral"
                              )}
                            >
                              {a?.active ? "Active" : "Inactive"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => unassignCapo(c.id)}
                              className="rounded-full border px-3 py-1 text-[12px] font-semibold badge-danger"
                            >
                              Rimuovi
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl theme-panel overflow-hidden">
            <div className="px-4 py-3 border-b theme-border bg-[var(--panel2)] flex items-center justify-between">
              <div className="text-[12px] theme-text-muted">Scope Manager (navi -&gt; costr/commessa)</div>
              <div className="text-[11px] theme-text-muted">{selectedManagerShips.size} navi nel perimetro</div>
            </div>
            <div className="px-4 py-3 border-b theme-border bg-[var(--panel2)]">
              <div className="text-[12px] font-semibold theme-text">Créer nouveau scope</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  value={newCostr}
                  onChange={(e) => setNewCostr(e.target.value)}
                  placeholder="costr"
                  className="rounded-xl theme-input px-3 py-2 text-[13px] outline-none"
                />
                <input
                  value={newCommessa}
                  onChange={(e) => setNewCommessa(e.target.value)}
                  placeholder="commessa"
                  className="rounded-xl theme-input px-3 py-2 text-[13px] outline-none"
                />
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  disabled={!selectedManagerId || busy}
                  onClick={createScopeAndAssign}
                  className="rounded-full border px-3 py-1 text-[12px] font-semibold badge-info"
                >
                  Créer + Ajouter scope
                </button>
              </div>
            </div>
            <div className="divide-y theme-border max-h-[34vh] overflow-auto">
              {ships.map((s) => {
                const linked = selectedManagerShips.has(s.id);
                return (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold theme-text truncate">{shipLabel(s)}</div>
                        <div className="text-[11px] theme-text-muted truncate">
                          Scope: {scopeLabelOfShip(s)}
                        </div>
                      </div>
                      <div>
                        {!linked ? (
                          <button
                            type="button"
                            disabled={!selectedManagerId || busy}
                            onClick={() => addScopeShip(s.id, selectedManagerId)}
                            className="rounded-full border px-3 py-1 text-[12px] font-semibold badge-info"
                          >
                            Aggiungi scope
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeScopeShip(s.id, selectedManagerId)}
                            className="rounded-full border px-3 py-1 text-[12px] font-semibold badge-danger"
                          >
                            Rimuovi scope
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

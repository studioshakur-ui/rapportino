import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "../utils/cn";
import { formatDisplayName } from "../utils/formatHuman";

/**
 * NOTE:
 * This file is intentionally verbose. It prioritizes correctness and debuggability.
 */

/**
 * Supabase client (frontend)
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Enums (frontend shadow)
 * - plan_status: DRAFT | PUBLISHED | FROZEN
 * - plan_period_type: DAY | WEEK
 */
const PLAN_STATUSES = ["DRAFT", "PUBLISHED", "FROZEN"];
const PERIOD_TYPES = ["DAY", "WEEK"];

function normalizePlanStatus(v) {
  if (v === "PUBLISHED") return "PUBLISHED";
  if (v === "FROZEN") return "FROZEN";
  return "DRAFT";
}

function normalizePeriodType(v) {
  if (v === "WEEK") return "WEEK";
  return "DAY";
}

/**
 * Helpers
 */
function isoFromDateInput(dateStr) {
  // dateStr is "YYYY-MM-DD" (input type="date")
  return dateStr;
}

function formatDateIt(d) {
  // d: "YYYY-MM-DD"
  const [y, m, day] = String(d).split("-");
  return `${day}/${m}/${y}`;
}

function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeInt(v, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function stableSortByPosition(arr) {
  return [...arr].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/**
 * Sortable item: operator chip
 */
function SortableOperatorChip({ id, label, disabled, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-full border border-border/30 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground shadow-soft backdrop-blur",
        disabled && "opacity-50 pointer-events-none"
      )}
      {...attributes}
      {...listeners}
    >
      <span className="truncate max-w-[180px]">{label}</span>
      <button
        type="button"
        className="ml-1 rounded-full border border-border/30 bg-white/5 px-2 py-1 text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.();
        }}
      >
        Rimuovi
      </button>
    </div>
  );
}

/**
 * Main page
 */
export default function ManagerAssignments() {
  const outlet = useOutletContext?.() ?? {};
  const auth = outlet?.auth ?? null;

  const [periodType, setPeriodType] = useState("DAY");
  const [planDate, setPlanDate] = useState(getTodayISO());

  const [plan, setPlan] = useState(null);
  const status = normalizePlanStatus(plan?.status);

  const [caps, setCaps] = useState([]);
  const [operatorsPool, setOperatorsPool] = useState([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const [globalView, setGlobalView] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Derived flags
  const isFrozen = status === "FROZEN";

  // dnd
  const [activeDrag, setActiveDrag] = useState(null);

  /**
   * Load/ensure plan
   */
  const ensurePlan = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const managerId = auth?.user?.id ?? null;
      if (!managerId) throw new Error("auth missing");

      const pt = normalizePeriodType(periodType);
      const pd = isoFromDateInput(planDate);

      // Find existing plan for manager+period+date
      const { data: found, error: foundErr } = await supabase
        .from("manager_plans")
        .select("*")
        .eq("manager_id", managerId)
        .eq("period_type", pt)
        .eq("plan_date", pd)
        .limit(1)
        .maybeSingle();

      if (foundErr) throw foundErr;

      if (found) {
        setPlan(found);
        return found;
      }

      // Create new plan
      const payload = {
        manager_id: managerId,
        period_type: pt,
        plan_date: pd,
        status: "DRAFT",
        note: null,
      };

      const { data: created, error: createErr } = await supabase
        .from("manager_plans")
        .insert(payload)
        .select("*")
        .single();

      if (createErr) throw createErr;

      setPlan(created);
      return created;
    } catch (e) {
      console.error(e);
      setErr(String(e?.message ?? e));
      setPlan(null);
      return null;
    } finally {
      setBusy(false);
    }
  }, [auth?.user?.id, periodType, planDate]);

  /**
   * Load capos and operators
   */
  const loadData = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const managerId = auth?.user?.id ?? null;
      if (!managerId) throw new Error("auth missing");

      // Load capos assigned to manager (manager_capo_assignments)
      const { data: caposData, error: caposErr } = await supabase
        .from("manager_capo_assignments")
        .select("capo_id, capo_name, is_active")
        .eq("manager_id", managerId)
        .eq("is_active", true)
        .order("capo_name", { ascending: true });

      if (caposErr) throw caposErr;

      // Load operators for manager perimeter (ship_managers -> ship_operators)
      // There is a view/service in your stack; here we assume a table ship_operators filtered by manager perimeter in RLS.
      const { data: opsData, error: opsErr } = await supabase
        .from("ship_operators")
        .select("id, name, roles")
        .order("name", { ascending: true });

      if (opsErr) throw opsErr;

      setCaps(
        (caposData ?? []).map((c) => ({
          capo_id: c.capo_id,
          capo_name: c.capo_name,
          is_active: !!c.is_active,
          members: [],
        }))
      );

      setOperatorsPool(opsData ?? []);
    } catch (e) {
      console.error(e);
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, [auth?.user?.id]);

  /**
   * Load slots + members for plan
   */
  const loadSlots = useCallback(
    async (planId) => {
      if (!planId) return;

      setErr(null);
      setBusy(true);
      try {
        // Load slots
        const { data: slots, error: slotsErr } = await supabase
          .from("plan_capo_slots")
          .select("*")
          .eq("plan_id", planId)
          .order("position", { ascending: true });

        if (slotsErr) throw slotsErr;

        // Load slot members
        const { data: members, error: memErr } = await supabase
          .from("plan_slot_members")
          .select("*")
          .in("slot_id", (slots ?? []).map((s) => s.id));

        if (memErr) throw memErr;

        // Build capos UI model
        const byCapo = new Map();
        for (const s of slots ?? []) {
          byCapo.set(s.capo_id, { slot: s, members: [] });
        }
        for (const m of members ?? []) {
          const slot = (slots ?? []).find((s) => s.id === m.slot_id);
          if (!slot) continue;
          const key = slot.capo_id;
          const entry = byCapo.get(key);
          if (!entry) continue;
          entry.members.push(m);
        }

        setCaps((prev) => {
          const next = prev.map((c) => {
            const entry = byCapo.get(c.capo_id);
            if (!entry) return { ...c, members: [] };
            const ordered = stableSortByPosition(entry.members);
            const memberIds = ordered.map((x) => x.operator_id);
            const memberLabels = memberIds.map((id) => {
              const op = operatorsPool.find((o) => o.id === id);
              return op?.name ?? id;
            });

            return {
              ...c,
              slot_id: entry.slot.id,
              members: memberIds.map((id, idx) => ({
                operator_id: id,
                label: memberLabels[idx],
              })),
            };
          });
          return next;
        });
      } catch (e) {
        console.error(e);
        setErr(String(e?.message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [operatorsPool]
  );

  /**
   * Sync on changes
   */
  useEffect(() => {
    (async () => {
      const p = await ensurePlan();
      await loadData();
      if (p?.id) await loadSlots(p.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, planDate]);

  /**
   * Actions
   */
  const updatePlanStatus = useCallback(
    async (ns) => {
      setErr(null);
      setBusy(true);
      try {
        if (!plan?.id) return;

        const patch = {
          status: ns,
          frozen_at: ns === "FROZEN" ? new Date().toISOString() : null,
        };

        const { data, error } = await supabase
          .from("manager_plans")
          .update(patch)
          .eq("id", plan.id)
          .select("*")
          .single();

        if (error) throw error;
        setPlan(data);
      } catch (e) {
        console.error(e);
        setErr(String(e?.message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [plan?.id]
  );

  const reloadAll = useCallback(async () => {
    const p = await ensurePlan();
    await loadData();
    if (p?.id) await loadSlots(p.id);
  }, [ensurePlan, loadData, loadSlots]);

  /**
   * Drag & drop handling (operators -> slots)
   */
  const onDragStart = useCallback((event) => {
    setActiveDrag(event.active?.id ?? null);
  }, []);

  const onDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      setActiveDrag(null);

      if (!active?.id || !over?.id) return;
      if (isFrozen) return;

      // active.id can be "POOL:<operator_id>" or "SLOT:<capo_id>:<operator_id>"
      const a = String(active.id);
      const o = String(over.id);

      // Drop target can be "DROP:<capo_id>" or a chip id
      // We support adding from pool and sorting within slot.
      const isFromPool = a.startsWith("POOL:");
      const opId = isFromPool ? a.replace("POOL:", "") : a.split(":").slice(-1)[0];

      const targetCapoId = o.startsWith("DROP:") ? o.replace("DROP:", "") : o.split(":")[1];

      if (!targetCapoId) return;

      setBusy(true);
      setErr(null);

      try {
        if (!plan?.id) throw new Error("plan missing");

        // Ensure slot exists for capo
        let capoEntry = caps.find((c) => c.capo_id === targetCapoId);
        if (!capoEntry) return;

        let slotId = capoEntry.slot_id;

        if (!slotId) {
          // create slot
          const payload = {
            plan_id: plan.id,
            capo_id: targetCapoId,
            position: safeInt(caps.findIndex((c) => c.capo_id === targetCapoId), 0) + 1,
          };

          const { data: created, error: createErr } = await supabase
            .from("plan_capo_slots")
            .insert(payload)
            .select("*")
            .single();

          if (createErr) throw createErr;
          slotId = created.id;

          // update local
          setCaps((prev) => prev.map((c) => (c.capo_id === targetCapoId ? { ...c, slot_id: slotId } : c)));
        }

        // Fetch current members for that slot
        const { data: mem, error: memErr } = await supabase
          .from("plan_slot_members")
          .select("*")
          .eq("slot_id", slotId);

        if (memErr) throw memErr;

        const current = stableSortByPosition(mem ?? []);
        const exists = current.some((x) => x.operator_id === opId);

        if (!exists) {
          // Insert new member at end
          const payload = {
            slot_id: slotId,
            operator_id: opId,
            position: (current?.length ?? 0) + 1,
          };

          const { error: insErr } = await supabase.from("plan_slot_members").insert(payload);
          if (insErr) throw insErr;
        }

        // Reload slots for correctness
        await loadSlots(plan.id);
      } catch (e) {
        console.error(e);
        setErr(String(e?.message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [caps, isFrozen, loadSlots, plan?.id]
  );

  const removeFromCapo = useCallback(
    async (capoId, operatorId) => {
      if (isFrozen) return;
      setBusy(true);
      setErr(null);
      try {
        const capo = caps.find((c) => c.capo_id === capoId);
        if (!capo?.slot_id) return;

        const { error } = await supabase
          .from("plan_slot_members")
          .delete()
          .eq("slot_id", capo.slot_id)
          .eq("operator_id", operatorId);

        if (error) throw error;
        await loadSlots(plan.id);
      } catch (e) {
        console.error(e);
        setErr(String(e?.message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [caps, isFrozen, loadSlots, plan?.id]
  );

  /**
   * UI
   */
  return (
    <div className="min-h-[calc(100vh-64px)] p-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">CNCS · MANAGER</div>
            <div className="mt-1 text-lg font-semibold text-foreground">Assegnazioni</div>
          </div>

          <div className="flex items-center gap-2">
            {plan?.status ? (
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                  plan.status === "FROZEN"
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : plan.status === "PUBLISHED"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-border/30 bg-white/5 text-muted-foreground"
                )}
              >
                {plan.status}
              </span>
            ) : null}

            <button
              type="button"
              className={cn(
                "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                busy && "opacity-60 pointer-events-none"
              )}
              onClick={() => setGlobalView((v) => !v)}
              title="Vista globale"
            >
              Vista globale
            </button>

            <button
              type="button"
              className={cn(
                "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                busy && "opacity-60 pointer-events-none"
              )}
              onClick={reloadAll}
              title="Ricarica dati"
            >
              Ricarica
            </button>

            <button
              type="button"
              className={cn(
                "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                (!plan?.id || busy || isFrozen) && "opacity-60 pointer-events-none"
              )}
              onClick={() => updatePlanStatus("PUBLISHED")}
              title="Pubblica il piano (visibile come riferimento)"
            >
              Pubblica
            </button>


              {status !== "FROZEN" ? (
            <button
              type="button"
              className={cn(
                "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                (!plan?.id || busy) && "opacity-60 pointer-events-none"
              )}
              onClick={() => updatePlanStatus("FROZEN")}
              title="Congela il piano (blocca le modifiche)"
            >
              Congela
            </button>

              ) : null}

            {status === "FROZEN" ? (
              <button
                type="button"
                className={cn(
                  "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 shadow-soft hover:bg-emerald-500/15",
                  (!plan?.id || busy) && "opacity-60 pointer-events-none"
                )}
                onClick={() => updatePlanStatus("PUBLISHED")}
                title="Sblocca il piano (riabilita le modifiche durante la giornata)"
              >
                Sblocca
              </button>
            ) : null}
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="font-semibold">Errore</div>
            <div className="mt-1 opacity-90">{err}</div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-12 gap-6">
          {/* LEFT: Plan controls */}
          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-2xl border border-border/20 bg-white/5 p-5 shadow-soft">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">MANAGER · PLANNING</div>
              <div className="mt-2 text-sm font-semibold text-foreground">
                {periodType === "DAY" ? `Piano giorno · ${formatDateIt(planDate)}` : `Piano settimana · ${formatDateIt(planDate)}`}
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold shadow-soft",
                    periodType === "DAY"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-border/30 bg-white/5 text-foreground hover:bg-white/10"
                  )}
                  onClick={() => setPeriodType("DAY")}
                >
                  Giorno
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold shadow-soft",
                    periodType === "WEEK"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-border/30 bg-white/5 text-foreground hover:bg-white/10"
                  )}
                  onClick={() => setPeriodType("WEEK")}
                >
                  Settimana
                </button>
              </div>

              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Data</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    className={cn(
                      "w-full rounded-xl border border-border/20 bg-black/20 px-3 py-2 text-sm text-foreground outline-none",
                      busy && "opacity-60"
                    )}
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                    busy && "opacity-60 pointer-events-none"
                  )}
                  onClick={ensurePlan}
                >
                  Aggiorna piano
                </button>

                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                    busy && "opacity-60 pointer-events-none"
                  )}
                  onClick={() => {
                    // Placeholder for future slots management modal
                    console.info("Slots clicked");
                  }}
                >
                  Slots
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-border/20 bg-black/20 p-4 text-sm">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Controlli</div>
                <div className="mt-3 space-y-1 text-muted-foreground">
                  <div>
                    Capi assegnati: <span className="font-semibold text-foreground">{caps.length}</span>
                  </div>
                  <div>
                    Operatori liberi:{" "}
                    <span className="font-semibold text-foreground">
                      {operatorsPool.length}
                    </span>
                  </div>
                  <div>
                    Stato:{" "}
                    <span className={cn("font-semibold", isFrozen ? "text-red-200" : "text-foreground")}>
                      {status}
                      {isFrozen ? " · bloccato" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE: Capos + slots */}
          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-2xl border border-border/20 bg-white/5 p-5 shadow-soft">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">CAPI · SQUADRE</div>
              <div className="mt-2 text-sm font-semibold text-foreground">Trascina operatori nelle righe</div>

              <div className="mt-4">
                <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                  <div className="space-y-4">
                    {caps.map((capo) => {
                      const capoLabel = capo.capo_name ?? capo.capo_id;
                      const memberIds = (capo.members ?? []).map((m) => `SLOT:${capo.capo_id}:${m.operator_id}`);

                      return (
                        <div key={capo.capo_id} className="rounded-2xl border border-border/20 bg-black/20 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                {capoLabel}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {capo.members?.length ?? 0} operatori
                            </div>
                          </div>

                          <div className="mt-4">
                            <SortableContext items={memberIds} strategy={verticalListSortingStrategy}>
                              <div className="flex flex-wrap gap-2">
                                {(capo.members ?? []).map((m) => {
                                  const chipId = `SLOT:${capo.capo_id}:${m.operator_id}`;
                                  return (
                                    <SortableOperatorChip
                                      key={chipId}
                                      id={chipId}
                                      label={m.label ?? m.operator_id}
                                      disabled={isFrozen}
                                      onRemove={() => removeFromCapo(capo.capo_id, m.operator_id)}
                                    />
                                  );
                                })}

                                <div
                                  id={`DROP:${capo.capo_id}`}
                                  className={cn(
                                    "min-h-[40px] min-w-[220px] rounded-2xl border border-dashed border-border/25 bg-white/3 px-4 py-3 text-xs text-muted-foreground",
                                    isFrozen && "opacity-50"
                                  )}
                                >
                                  + Aggiungi operatore
                                  <div className="mt-1 text-[10px] opacity-80">Apre mini popup con la lista (oggi)</div>
                                </div>
                              </div>
                            </SortableContext>
                          </div>

                          {isFrozen ? (
                            <div className="mt-4 text-xs text-red-200">Piano congelato: modifiche disabilitate.</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <DragOverlay>
                    {activeDrag ? (
                      <div className="rounded-full border border-border/30 bg-white/10 px-3 py-2 text-xs font-semibold text-foreground shadow-soft backdrop-blur">
                        {activeDrag.startsWith("POOL:")
                          ? operatorsPool.find((o) => o.id === activeDrag.replace("POOL:", ""))?.name ??
                            activeDrag.replace("POOL:", "")
                          : activeDrag}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          </div>

          {/* RIGHT: Operators pool */}
          <div className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-border/20 bg-white/5 p-5 shadow-soft">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">OPERATORI · OGGI</div>
              <div className="mt-2 text-sm font-semibold text-foreground">Trascina nelle righe</div>

              <div className="mt-4">
                <input
                  type="text"
                  className="w-full rounded-xl border border-border/20 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
                  placeholder="Cerca..."
                  onChange={(e) => {
                    // quick filter in-memory
                    const q = e.target.value?.toLowerCase?.() ?? "";
                    if (!q) {
                      // no-op
                      return;
                    }
                  }}
                />
              </div>

              <div className="mt-4 rounded-xl border border-border/20 bg-black/20 p-4">
                <div className="text-xs text-muted-foreground">Disponibili ({operatorsPool.length})</div>

                <div className="mt-3 space-y-2">
                  {operatorsPool.slice(0, 200).map((op) => (
                    <div
                      key={op.id}
                      id={`POOL:${op.id}`}
                      className={cn(
                        "cursor-grab rounded-2xl border border-border/25 bg-white/5 px-4 py-3 text-sm text-foreground shadow-soft active:cursor-grabbing",
                        isFrozen && "opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="text-sm font-semibold">{op.name}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">Roles: {op.roles ?? "—"}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                      busy && "opacity-60 pointer-events-none"
                    )}
                    onClick={reloadAll}
                  >
                    Ricarica operatori
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                      busy && "opacity-60 pointer-events-none"
                    )}
                    onClick={reloadAll}
                  >
                    Ricarica capi
                  </button>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Nota: il pool è limitato al perimetro Manager (ship_managers → ship_operators). Gli operatori già
                  assegnati non compaiono qui.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug/Global view placeholder */}
        {globalView ? (
          <div className="mt-8 rounded-2xl border border-border/20 bg-white/5 p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Vista globale</div>
            <div className="mt-2 text-sm text-muted-foreground">
              (Placeholder) Qui andrà la vista globale multi-capo / multi-ship quando definita.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

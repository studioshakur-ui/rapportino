// src/pages/ManagerAssignments.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { supabase } from "../lib/supabaseClient";
import { cn } from "../utils/cn";

/**
 * NOTE:
 * This file is intentionally verbose. It prioritizes correctness and debuggability.
 */

type PlanStatus = "DRAFT" | "PUBLISHED" | "FROZEN";
type PeriodType = "DAY" | "WEEK";

type OutletAuth = {
  user?: { id?: string | null } | null;
} | null;

type OutletContext = {
  auth?: OutletAuth;
};

type ManagerPlanRow = {
  id: string;
  manager_id: string;
  period_type: PeriodType;
  plan_date: string; // YYYY-MM-DD
  status: PlanStatus;
  note: string | null;
  frozen_at: string | null;
  updated_at?: string | null;
};

type CapoAssignmentRow = {
  capo_id: string;
  capo_name: string | null;
  is_active: boolean | null;
};

type ShipOperatorRow = {
  id: string;
  name: string | null;
  roles: string | null;
};

type PlanCapoSlotRow = {
  id: string;
  plan_id: string;
  capo_id: string;
  position: number | null;
};

type PlanSlotMemberRow = {
  id?: string;
  slot_id: string;
  operator_id: string;
  position: number | null;
};

type CapoUiMember = {
  operator_id: string;
  label: string;
};

type CapoUi = {
  capo_id: string;
  capo_name: string | null;
  is_active: boolean;
  slot_id?: string;
  members: CapoUiMember[];
};

function normalizePlanStatus(v: unknown): PlanStatus {
  if (v === "PUBLISHED") return "PUBLISHED";
  if (v === "FROZEN") return "FROZEN";
  return "DRAFT";
}

function normalizePeriodType(v: unknown): PeriodType {
  if (v === "WEEK") return "WEEK";
  return "DAY";
}

function formatDateIt(d: string): string {
  const [y, m, day] = String(d).split("-");
  return `${day}/${m}/${y}`;
}

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function safeInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function stableSortByPosition<T extends { position?: number | null }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/**
 * Sortable item: operator chip
 */
type SortableOperatorChipProps = {
  id: string;
  label: string;
  disabled?: boolean;
  onRemove?: () => void;
};

function SortableOperatorChip({ id, label, disabled, onRemove }: SortableOperatorChipProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
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
        disabled ? "opacity-50 pointer-events-none" : ""
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
export default function ManagerAssignments(): JSX.Element {
  const outlet = (useOutletContext?.() as OutletContext) ?? {};
  const auth = outlet?.auth ?? null;

  const [periodType, setPeriodType] = useState<PeriodType>("DAY");
  const [planDate, setPlanDate] = useState<string>(getTodayISO());

  const [plan, setPlan] = useState<ManagerPlanRow | null>(null);
  const status = normalizePlanStatus(plan?.status);
  const isFrozen = status === "FROZEN";

  const [caps, setCaps] = useState<CapoUi[]>([]);
  const [operatorsPool, setOperatorsPool] = useState<ShipOperatorRow[]>([]);

  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const [globalView, setGlobalView] = useState<boolean>(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const [activeDrag, setActiveDrag] = useState<string | null>(null);

  const managerId = auth?.user?.id ?? null;

  /**
   * Load/ensure plan
   */
  const ensurePlan = useCallback(async (): Promise<ManagerPlanRow | null> => {
    setErr(null);
    setBusy(true);
    try {
      if (!managerId) throw new Error("auth missing");

      const pt = normalizePeriodType(periodType);
      const pd = planDate;

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
        const f = found as unknown as ManagerPlanRow;
        setPlan(f);
        return f;
      }

      const payload = {
        manager_id: managerId,
        period_type: pt,
        plan_date: pd,
        status: "DRAFT" as const,
        note: null as string | null,
      };

      const { data: created, error: createErr } = await supabase.from("manager_plans").insert(payload).select("*").single();
      if (createErr) throw createErr;

      const c = created as unknown as ManagerPlanRow;
      setPlan(c);
      return c;
    } catch (e: any) {
      console.error(e);
      setErr(String(e?.message ?? e));
      setPlan(null);
      return null;
    } finally {
      setBusy(false);
    }
  }, [managerId, periodType, planDate]);

  /**
   * Load capos and operators
   */
  const loadData = useCallback(async (): Promise<void> => {
    setErr(null);
    setBusy(true);
    try {
      if (!managerId) throw new Error("auth missing");

      const { data: caposData, error: caposErr } = await supabase
        .from("manager_capo_assignments")
        .select("capo_id, capo_name, is_active")
        .eq("manager_id", managerId)
        .eq("is_active", true)
        .order("capo_name", { ascending: true });

      if (caposErr) throw caposErr;

      const { data: opsData, error: opsErr } = await supabase
        .from("ship_operators")
        .select("id, name, roles")
        .order("name", { ascending: true });

      if (opsErr) throw opsErr;

      const caposRows = (caposData ?? []) as unknown as CapoAssignmentRow[];
      const opsRows = (opsData ?? []) as unknown as ShipOperatorRow[];

      setCaps(
        caposRows.map((c) => ({
          capo_id: c.capo_id,
          capo_name: c.capo_name ?? null,
          is_active: Boolean(c.is_active),
          members: [],
        }))
      );

      setOperatorsPool(opsRows);
    } catch (e: any) {
      console.error(e);
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, [managerId]);

  /**
   * Load slots + members for plan
   */
  const loadSlots = useCallback(
    async (planId: string): Promise<void> => {
      if (!planId) return;

      setErr(null);
      setBusy(true);
      try {
        const { data: slots, error: slotsErr } = await supabase
          .from("plan_capo_slots")
          .select("*")
          .eq("plan_id", planId)
          .order("position", { ascending: true });

        if (slotsErr) throw slotsErr;

        const slotsRows = (slots ?? []) as unknown as PlanCapoSlotRow[];
        const slotIds = slotsRows.map((s) => s.id);

        const { data: members, error: memErr } = slotIds.length
          ? await supabase.from("plan_slot_members").select("*").in("slot_id", slotIds)
          : { data: [], error: null };

        if (memErr) throw memErr;

        const memRows = (members ?? []) as unknown as PlanSlotMemberRow[];

        const byCapo = new Map<string, { slot: PlanCapoSlotRow; members: PlanSlotMemberRow[] }>();
        for (const s of slotsRows) byCapo.set(s.capo_id, { slot: s, members: [] });

        for (const m of memRows) {
          const slot = slotsRows.find((s) => s.id === m.slot_id);
          if (!slot) continue;
          const entry = byCapo.get(slot.capo_id);
          if (!entry) continue;
          entry.members.push(m);
        }

        setCaps((prev) => {
          return prev.map((c) => {
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
        });
      } catch (e: any) {
        console.error(e);
        setErr(String(e?.message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [operatorsPool]
  );

  useEffect(() => {
    (async () => {
      const p = await ensurePlan();
      await loadData();
      if (p?.id) await loadSlots(p.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, planDate]);

  const updatePlanStatus = useCallback(
    async (ns: PlanStatus): Promise<void> => {
      setErr(null);
      setBusy(true);
      try {
        if (!plan?.id) return;

        const patch = {
          status: ns,
          frozen_at: ns === "FROZEN" ? new Date().toISOString() : null,
        };

        const { data, error } = await supabase.from("manager_plans").update(patch).eq("id", plan.id).select("*").single();
        if (error) throw error;

        setPlan(data as unknown as ManagerPlanRow);
      } catch (e: any) {
        console.error(e);
        setErr(String(e?.message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [plan?.id]
  );

  const reloadAll = useCallback(async (): Promise<void> => {
    const p = await ensurePlan();
    await loadData();
    if (p?.id) await loadSlots(p.id);
  }, [ensurePlan, loadData, loadSlots]);

  const onDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active?.id;
    setActiveDrag(id ? String(id) : null);
  }, []);

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);

      if (!active?.id || !over?.id) return;
      if (isFrozen) return;

      const a = String(active.id);
      const o = String(over.id);

      const isFromPool = a.startsWith("POOL:");
      const opId = isFromPool ? a.replace("POOL:", "") : a.split(":").slice(-1)[0];

      const targetCapoId = o.startsWith("DROP:") ? o.replace("DROP:", "") : o.split(":")[1];
      if (!targetCapoId) return;

      setBusy(true);
      setErr(null);

      try {
        if (!plan?.id) throw new Error("plan missing");

        const capoEntry = caps.find((c) => c.capo_id === targetCapoId);
        if (!capoEntry) return;

        let slotId = capoEntry.slot_id;

        if (!slotId) {
          const payload = {
            plan_id: plan.id,
            capo_id: targetCapoId,
            position: safeInt(caps.findIndex((c) => c.capo_id === targetCapoId), 0) + 1,
          };

          const { data: created, error: createErr } = await supabase.from("plan_capo_slots").insert(payload).select("*").single();
          if (createErr) throw createErr;

          slotId = (created as unknown as PlanCapoSlotRow).id;

          setCaps((prev) => prev.map((c) => (c.capo_id === targetCapoId ? { ...c, slot_id: slotId } : c)));
        }

        const { data: mem, error: memErr } = await supabase.from("plan_slot_members").select("*").eq("slot_id", slotId);
        if (memErr) throw memErr;

        const current = stableSortByPosition((mem ?? []) as unknown as PlanSlotMemberRow[]);
        const exists = current.some((x) => x.operator_id === opId);

        if (!exists) {
          const payload = {
            slot_id: slotId,
            operator_id: opId,
            position: (current?.length ?? 0) + 1,
          };

          const { error: insErr } = await supabase.from("plan_slot_members").insert(payload);
          if (insErr) throw insErr;
        }

        await loadSlots(plan.id);
      } catch (e: any) {
        console.error(e);
        setErr(String(e?.message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [caps, isFrozen, loadSlots, plan?.id]
  );

  const removeFromCapo = useCallback(
    async (capoId: string, operatorId: string): Promise<void> => {
      if (isFrozen) return;
      setBusy(true);
      setErr(null);
      try {
        const capo = caps.find((c) => c.capo_id === capoId);
        if (!capo?.slot_id) return;
        if (!plan?.id) return;

        const { error } = await supabase.from("plan_slot_members").delete().eq("slot_id", capo.slot_id).eq("operator_id", operatorId);
        if (error) throw error;

        await loadSlots(plan.id);
      } catch (e: any) {
        console.error(e);
        setErr(String(e?.message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [caps, isFrozen, loadSlots, plan?.id]
  );

  const activeDragLabel = useMemo(() => {
    if (!activeDrag) return null;
    if (activeDrag.startsWith("POOL:")) {
      const id = activeDrag.replace("POOL:", "");
      return operatorsPool.find((o) => o.id === id)?.name ?? id;
    }
    return activeDrag;
  }, [activeDrag, operatorsPool]);

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
                busy ? "opacity-60 pointer-events-none" : ""
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
                busy ? "opacity-60 pointer-events-none" : ""
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
                !plan?.id || busy || isFrozen ? "opacity-60 pointer-events-none" : ""
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
                  !plan?.id || busy ? "opacity-60 pointer-events-none" : ""
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
                  !plan?.id || busy ? "opacity-60 pointer-events-none" : ""
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
                      busy ? "opacity-60" : ""
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
                    busy ? "opacity-60 pointer-events-none" : ""
                  )}
                  onClick={ensurePlan}
                >
                  Aggiorna piano
                </button>

                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                    busy ? "opacity-60 pointer-events-none" : ""
                  )}
                  onClick={() => {
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
                    Operatori liberi: <span className="font-semibold text-foreground">{operatorsPool.length}</span>
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
                            <div className="text-xs text-muted-foreground">{capo.members?.length ?? 0} operatori</div>
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
                                    isFrozen ? "opacity-50" : ""
                                  )}
                                >
                                  + Aggiungi operatore
                                  <div className="mt-1 text-[10px] opacity-80">Apre mini popup con la lista (oggi)</div>
                                </div>
                              </div>
                            </SortableContext>
                          </div>

                          {isFrozen ? <div className="mt-4 text-xs text-red-200">Piano congelato: modifiche disabilitate.</div> : null}
                        </div>
                      );
                    })}
                  </div>

                  <DragOverlay>
                    {activeDragLabel ? (
                      <div className="rounded-full border border-border/30 bg-white/10 px-3 py-2 text-xs font-semibold text-foreground shadow-soft backdrop-blur">
                        {activeDragLabel}
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
                  onChange={() => {
                    // placeholder: implement in-memory filter
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
                        isFrozen ? "opacity-50 pointer-events-none" : ""
                      )}
                    >
                      <div className="text-sm font-semibold">{op.name ?? op.id}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">Roles: {op.roles ?? "—"}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                      busy ? "opacity-60 pointer-events-none" : ""
                    )}
                    onClick={reloadAll}
                  >
                    Ricarica operatori
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border border-border/30 bg-white/5 px-4 py-2 text-xs font-semibold text-foreground shadow-soft hover:bg-white/10",
                      busy ? "opacity-60 pointer-events-none" : ""
                    )}
                    onClick={reloadAll}
                  >
                    Ricarica capi
                  </button>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Nota: il pool è limitato al perimetro Manager (ship_managers → ship_operators). Gli operatori già assegnati non compaiono qui.
                </div>
              </div>
            </div>
          </div>
        </div>

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

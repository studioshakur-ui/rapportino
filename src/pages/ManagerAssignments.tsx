// src/pages/ManagerAssignments.tsx
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

import NamePill from "../manager/components/NamePill";
import SlotsWorkspaceModal from "../manager/components/SlotsWorkspaceModal";

/**
 * MANAGER — Assegnazioni (Planning)
 *
 * DB contract (confirmed):
 * - manager_plans(period_type plan_period_type, status plan_status)
 *   unique DAY: (manager_id, plan_date) where period_type='DAY'
 *   unique WEEK: (manager_id, year_iso, week_iso) where period_type='WEEK'
 * - plan_capo_slots unique (plan_id, capo_id)
 * - plan_slot_members unique by pkey id; order via (position)
 * - manager_capo_assignments pk/capo mapping (capo_id -> manager_id) + active flag
 *
 * IMPORTANT:
 * - Do NOT read manager_capo_assignments directly from the frontend (RLS risk).
 * - Use RPC public.manager_my_capi_v1() (SECURITY DEFINER + auth.uid()) as the canonical source.
 *
 * CANONICAL (NEW):
 * - Operators pool must be scoped to manager perimeter:
 *   ship_managers -> ship_operators -> operators
 * - Use RPC public.manager_my_operators_v1() (SECURITY DEFINER) as canonical source.
 */

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function isoWeekYear(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

function fmtDateYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function parseDateLocal(yyyyMmDd) {
  const s = safeText(yyyyMmDd);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date();
  const [yy, mm, dd] = s.split("-").map((x) => Number(x));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return new Date();
  return new Date(yy, mm - 1, dd);
}

function weekMondayFromAnchor(yyyyMmDd) {
  const d = parseDateLocal(yyyyMmDd);
  const day = d.getDay();
  const isoDay = (day + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(d);
  monday.setDate(d.getDate() - isoDay);
  monday.setHours(0, 0, 0, 0);
  return monday;
}


function safeText(v) {
  return (v == null ? "" : String(v)).trim();
}

function pillClass(active) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold leading-none";
  return cn(
    base,
    active
      ? "border-sky-400/65 bg-slate-50/10 text-slate-50"
      : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/45",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
  );
}

function btnGhost() {
  return cn(
    "inline-flex items-center justify-center rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

function btnPrimary() {
  return cn(
    "inline-flex items-center gap-2 rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "border-sky-400/55 text-slate-50 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

function badgeStatus(status) {
  const s = safeText(status).toUpperCase();
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-[0.16em]";
  if (s === "FROZEN") return cn(base, "border-rose-400/45 bg-rose-500/10 text-rose-100");
  if (s === "PUBLISHED") return cn(base, "border-emerald-400/45 bg-emerald-500/10 text-emerald-100");
  return cn(base, "border-slate-600/60 bg-slate-900/35 text-slate-200");
}

function cardClass() {
  return cn(
    "rounded-2xl border border-slate-800 bg-slate-950",
    "shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
  );
}

function sectionTitle(kicker, title, right) {
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

function normalizePeriodType(v) {
  const x = safeText(v).toUpperCase();
  return x === "WEEK" ? "WEEK" : "DAY";
}

function normalizePlanStatus(v) {
  const x = safeText(v).toUpperCase();
  if (x === "PUBLISHED" || x === "FROZEN") return x;
  return "DRAFT";
}

export default function ManagerAssignments({ isDark = true }) {
  const { uid, profile, session } = useAuth();

  const [me, setMe] = useState(null);

  // Plan selector
  const [periodType, setPeriodType] = useState("DAY");
  const [dayDate, setDayDate] = useState(fmtDateYYYYMMDD(new Date()));
  const [weekDateAnchor, setWeekDateAnchor] = useState(fmtDateYYYYMMDD(new Date()));

  // Active plan
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Slots + members
  const [slots, setSlots] = useState([]); // {id, capo_id, capo_name, position}
  const [membersBySlotId, setMembersBySlotId] = useState(new Map()); // slot_id -> array {id, operator_id, operator_name, position, role_tag, note}
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Pool operators (SCOPED to manager perimeter)
  const [operators, setOperators] = useState([]); // {id, name, roles[]}
  const [qOperators, setQOperators] = useState("");
  const [loadingOperators, setLoadingOperators] = useState(false);

  // Capi assigned to manager
  const [capi, setCapi] = useState([]); // {capo_id, display_name, email}
  const [loadingCapi, setLoadingCapi] = useState(false);

  // UI state
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  // Workspace modal (Excel-like)
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  // Popup for tapping an operator cell
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlotId, setPickerSlotId] = useState(null);
  const [pickerRowIndex, setPickerRowIndex] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const toastTimerRef = useRef(null);

  const effectivePeriod = normalizePeriodType(periodType);

  const status = normalizePlanStatus(plan?.status);
  const isFrozen = status === "FROZEN";
  const isPublished = status === "PUBLISHED";

  const clearToastSoon = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 1800);
  };

  const setToastSoft = (t) => {
    setToast(t);
    clearToastSoon();
  };

  useEffect(() => {
    if (!session || !uid) {
      setMe(null);
      return;
    }
    setMe({
      id: uid,
      app_role: profile?.app_role || null,
      allowed_cantieri: Array.isArray(profile?.allowed_cantieri) ? profile.allowed_cantieri : [],
    });
  }, [session, uid, profile]);

  /**
   * Load operator pool (CANONICAL)
   * - Uses RPC manager_my_operators_v1() to avoid RLS issues and enforce perimeter
   * - Fallback path tries to rebuild from perimeter ships if needed
   */
  const loadOperators = async () => {
    setLoadingOperators(true);
    setErr("");

    try {
      // 1) Canonical path: RPC returns operators already scoped
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("manager_my_operators_v1");
        if (rpcErr) throw rpcErr;

        const list = (Array.isArray(rpcData) ? rpcData : []).map((r) => ({
          id: r.operator_id,
          name: safeText(r.operator_name),
          roles: Array.isArray(r.operator_roles) ? r.operator_roles : [],
          created_at: r.created_at || null,
        }));

        setOperators(list);
        return;
      } catch (e) {
        // fallback (non-blocking): try with ship perimeter + join if policies allow
        console.warn("[ManagerAssignments] manager_my_operators_v1 rpc warning:", e);
      }

      // 2) Fallback: get ships perimeter via RPC
      const { data: perim, error: perimErr } = await supabase.rpc("manager_my_ships_v1");
      if (perimErr) throw perimErr;

      const shipIds = (Array.isArray(perim) ? perim : []).map((x) => x.ship_id).filter(Boolean);
      if (shipIds.length === 0) {
        setOperators([]);
        return;
      }

      // 3) Read ship_operators scoped to ships, join operators
      const { data: rows, error: rowsErr } = await supabase
        .from("ship_operators")
        .select(
          `
          operator_id,
          active,
          operators:operator_id (
            id,
            name,
            roles,
            created_at
          )
        `
        )
        .in("ship_id", shipIds);

      if (rowsErr) throw rowsErr;

      const dedup = new Map();
      (Array.isArray(rows) ? rows : []).forEach((r) => {
        if (r?.active === false) return;
        const o = r?.operators;
        if (!o?.id) return;
        if (!dedup.has(o.id)) {
          dedup.set(o.id, {
            id: o.id,
            name: safeText(o.name),
            roles: Array.isArray(o.roles) ? o.roles : [],
            created_at: o.created_at || null,
          });
        }
      });

      const list = Array.from(dedup.values()).sort((a, b) => safeText(a.name).localeCompare(safeText(b.name)));
      setOperators(list);
    } catch (e) {
      console.error("[ManagerAssignments] loadOperators error:", e);
      setOperators([]);
      setErr("Impossibile caricare operatori nel perimetro Manager (RPC/RLS).");
    } finally {
      setLoadingOperators(false);
    }
  };

  useEffect(() => {
    loadOperators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load capi for manager via RPC */
  const loadCapiForManager = async () => {
    if (!uid) return;
    setLoadingCapi(true);
    setErr("");
    try {
      const { data, error } = await supabase.rpc("manager_my_capi_v1");
      if (error) throw error;

      const list = (Array.isArray(data) ? data : []).map((r) => ({
        capo_id: r.capo_id,
        display_name: safeText(r.display_name) || safeText(r.email) || "—",
        email: safeText(r.email) || "",
      }));

      setCapi(list);
    } catch (e) {
      console.error("[ManagerAssignments] loadCapiForManager RPC error:", e);
      setCapi([]);
      setErr("Impossibile caricare capi assegnati al Manager (RPC/RLS).");
    } finally {
      setLoadingCapi(false);
    }
  };

  useEffect(() => {
    if (!uid) return;
    loadCapiForManager();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  /** Audit helper */
  const audit = async ({ plan_id, action, target_type, target_id, payload }) => {
    if (!me?.id) return;
    try {
      const { error } = await supabase.from("planning_audit").insert({
        plan_id: plan_id || null,
        actor_id: me.id,
        action: String(action || "UNKNOWN"),
        target_type: target_type ? String(target_type) : null,
        target_id: target_id || null,
        payload: payload && typeof payload === "object" ? payload : {},
      });
      if (error) throw error;
    } catch (e) {
      console.error("[ManagerAssignments] audit insert error:", e);
    }
  };

  /** Get or create plan (DAY/WEEK) */
  const getOrCreatePlan = async (opts = {}) => {
    if (!me?.id) {
      setErr("Profilo non disponibile.");
      return null;
    }

    const pType = normalizePeriodType(opts?.periodType ?? opts?.period_type ?? periodType);
    const dDay = safeText(opts?.dayDate ?? opts?.plan_date ?? dayDate);
    const anchorStr = safeText(opts?.weekDateAnchor ?? opts?.week_date_anchor ?? weekDateAnchor) || fmtDateYYYYMMDD(new Date());

    setLoadingPlan(true);
    setErr("");
    setToast("");

    try {
      let res = null;

      if (pType === "DAY") {
        if (!dDay) throw new Error("Data non valida.");

        res = await supabase
          .from("manager_plans")
          .select("*")
          .eq("manager_id", me.id)
          .eq("period_type", "DAY")
          .eq("plan_date", dDay)
          .maybeSingle();

        if (res.error && res.error.code !== "PGRST116") throw res.error;

        if (!res.data) {
          const ins = await supabase
            .from("manager_plans")
            .insert({
              manager_id: me.id,
              period_type: "DAY",
              plan_date: dDay,
              status: "DRAFT",
              note: null,
              created_by: me.id,
            })
            .select("*")
            .single();
          if (ins.error) throw ins.error;
          res = ins;

          await audit({
            plan_id: ins.data?.id,
            action: "PLAN_CREATE",
            target_type: "manager_plans",
            target_id: ins.data?.id,
            payload: { period_type: "DAY", plan_date: dDay },
          });
        }
      } else {
        const anchor = weekMondayFromAnchor(anchorStr);
        const { year, week } = isoWeekYear(anchor);

        res = await supabase
          .from("manager_plans")
          .select("*")
          .eq("manager_id", me.id)
          .eq("period_type", "WEEK")
          .eq("year_iso", year)
          .eq("week_iso", week)
          .maybeSingle();

        if (res.error && res.error.code !== "PGRST116") throw res.error;

        if (!res.data) {
          const ins = await supabase
            .from("manager_plans")
            .insert({
              manager_id: me.id,
              period_type: "WEEK",
              year_iso: year,
              week_iso: week,
              status: "DRAFT",
              note: null,
              created_by: me.id,
            })
            .select("*")
            .single();
          if (ins.error) throw ins.error;
          res = ins;

          await audit({
            plan_id: ins.data?.id,
            action: "PLAN_CREATE",
            target_type: "manager_plans",
            target_id: ins.data?.id,
            payload: { period_type: "WEEK", year_iso: year, week_iso: week },
          });
        }
      }

      const planRow = res?.data || null;
      setPlan(planRow);
      setToastSoft(planRow ? "Piano caricato." : "—");

      return planRow;
    } catch (e) {
      console.error("[ManagerAssignments] getOrCreatePlan error:", e);
      setPlan(null);
      setErr("Impossibile caricare/creare il piano (RLS o dati). ");
      return null;
    } finally {
      setLoadingPlan(false);
    }
  };

  /** Ensure capo slots exist for capi assigned to manager */
  const ensureSlotsForPlan = async (planRow) => {
    if (!planRow?.id) return [];
    if (!Array.isArray(capi) || capi.length === 0) return [];

    const { data: existing, error: e1 } = await supabase
      .from("plan_capo_slots")
      .select("id,plan_id,capo_id,position,note,created_at")
      .eq("plan_id", planRow.id)
      .order("position", { ascending: true });
    if (e1) throw e1;

    const existingByCapo = new Map((Array.isArray(existing) ? existing : []).map((s) => [s.capo_id, s]));
    const toInsert = [];

    capi.forEach((c, idx) => {
      if (!existingByCapo.has(c.capo_id)) {
        toInsert.push({
          plan_id: planRow.id,
          capo_id: c.capo_id,
          position: idx + 1,
          note: null,
          created_by: me?.id || null,
        });
      }
    });

    if (toInsert.length > 0) {
      // NOTE: use upsert to avoid 23505 duplicates when users click twice / parallel refresh.
      // Unique key: (plan_id, capo_id)
      const { data: inserted, error: e2 } = await supabase
        .from("plan_capo_slots")
        .upsert(toInsert, { onConflict: "plan_id,capo_id" })
        .select("id,plan_id,capo_id,position,note,created_at");
      if (e2) throw e2;

      await audit({
        plan_id: planRow.id,
        action: "SLOTS_AUTOCREATE",
        target_type: "plan_capo_slots",
        target_id: null,
        payload: { created: toInsert.map((x) => ({ capo_id: x.capo_id, position: x.position })) },
      });

      const merged = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(inserted) ? inserted : [])];
      return merged;
    }

    return Array.isArray(existing) ? existing : [];
  };

  /** Load slots + members */
  const loadSlotsAndMembers = async (planRow) => {
    if (!planRow?.id) {
      setSlots([]);
      setMembersBySlotId(new Map());
      return;
    }

    setLoadingSlots(true);
    setErr("");

    try {
      const slotsRaw = await ensureSlotsForPlan(planRow);

      const capoNameById = new Map(capi.map((c) => [c.capo_id, c.display_name]));
      const slotsMapped = slotsRaw
        .map((s) => ({
          id: s.id,
          plan_id: s.plan_id,
          capo_id: s.capo_id,
          capo_name: capoNameById.get(s.capo_id) || "—",
          position: s.position,
          note: s.note || "",
        }))
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      setSlots(slotsMapped);

      const { data: mem, error: e3 } = await supabase
        .from("plan_slot_members")
        .select(
          `
          id,
          slot_id,
          operator_id,
          position,
          role_tag,
          note,
          operators:operator_id (
            id,
            name
          )
        `
        )
        .eq("plan_id", planRow.id)
        .order("slot_id", { ascending: true })
        .order("position", { ascending: true });

      if (e3) throw e3;

      const map = new Map();
      (Array.isArray(mem) ? mem : []).forEach((r) => {
        const arr = map.get(r.slot_id) || [];
        arr.push({
          id: r.id,
          slot_id: r.slot_id,
          operator_id: r.operator_id,
          operator_name: safeText(r?.operators?.name) || "—",
          position: r.position,
          role_tag: r.role_tag || null,
          note: r.note || "",
        });
        map.set(r.slot_id, arr);
      });

      setMembersBySlotId(map);
    } catch (e) {
      console.error("[ManagerAssignments] loadSlotsAndMembers error:", e);
      setSlots([]);
      setMembersBySlotId(new Map());
      setErr("Impossibile caricare slots/membri (RLS o dati).");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (!plan?.id) return;
    loadSlotsAndMembers(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, capi]);

  const handleLoadPlan = async (opts = {}) => {
    const p = await getOrCreatePlan(opts);
    if (p?.id) {
      await loadSlotsAndMembers(p);
    }
  };

  const jumpToDayFromWeek = async (isoDay) => {
    const d = safeText(isoDay);
    if (!d) return;
    setPeriodType("DAY");
    setDayDate(d);
    await handleLoadPlan({ periodType: "DAY", dayDate: d });
  };

  const weekDays = useMemo(() => {
    if (effectivePeriod !== "WEEK") return [];
    const monday = weekMondayFromAnchor(weekDateAnchor || fmtDateYYYYMMDD(new Date()));
    const labels = ["Lun", "Mar", "Mer", "Gio", "Ven"];
    return labels.map((lab, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return { label: lab, date: fmtDateYYYYMMDD(dt) };
    });
  }, [effectivePeriod, weekDateAnchor]);

  const applyWeekToDays = async (overwrite = false) => {
    if (!plan?.id || effectivePeriod !== "WEEK") return;
    setBusy(true);
    setErr("");
    try {
      const { data, error } = await supabase.rpc("manager_apply_week_to_days_v1", {
        p_week_plan_id: plan.id,
        p_overwrite: !!overwrite,
      });
      if (error) throw error;

      await audit({
        plan_id: plan.id,
        action: "WEEK_APPLY_TO_DAYS",
        target_type: "manager_plans",
        target_id: plan.id,
        payload: { overwrite: !!overwrite, result: data || null },
      });

      setToastSoft(overwrite ? "Settimana applicata (sovrascritto)." : "Settimana applicata Lun–Ven.");
    } catch (e) {
      console.error("[ManagerAssignments] applyWeekToDays error:", e);
      setErr("Impossibile applicare la settimana ai giorni.");
    } finally {
      setBusy(false);
    }
  };

  const canMutate = !isFrozen && !busy && !!plan?.id;

  const allAssignedOperatorIds = useMemo(() => {
    const s = new Set();
    membersBySlotId.forEach((arr) => {
      (arr || []).forEach((m) => s.add(m.operator_id));
    });
    return s;
  }, [membersBySlotId]);

  const filteredOperators = useMemo(() => {
    const q = safeText(qOperators).toLowerCase();
    const base = Array.isArray(operators) ? operators : [];
    const visible = base.filter((o) => !allAssignedOperatorIds.has(o.id));
    if (!q) return visible;
    return visible.filter((o) => safeText(o.name).toLowerCase().includes(q));
  }, [operators, qOperators, allAssignedOperatorIds]);

  const filteredPickerOperators = useMemo(() => {
    const q = safeText(pickerSearch).toLowerCase();
    const base = filteredOperators;
    if (!q) return base;
    return base.filter((o) => safeText(o.name).toLowerCase().includes(q));
  }, [filteredOperators, pickerSearch]);

  const setMapMembers = (slotId, nextArr) => {
    setMembersBySlotId((prev) => {
      const m = new Map(prev);
      m.set(slotId, nextArr);
      return m;
    });
  };

  const upsertMemberDB = async ({ slot_id, operator_id, position }) => {
    if (!plan?.id) return null;

    // NOTE: unique constraint is (plan_id, operator_id). A manager cannot assign the same operator twice
    // in the same plan. If the operator already exists in another slot, this upsert will MOVE it.
    const { data, error } = await supabase
      .from("plan_slot_members")
      .upsert(
        {
          slot_id,
          operator_id,
          position,
          role_tag: null,
          note: null,
          plan_id: plan.id,
          created_by: me?.id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "plan_id,operator_id" }
      )
      .select(
        `
        id,
        slot_id,
        operator_id,
        position,
        role_tag,
        note,
        operators:operator_id ( id, name )
      `
      )
      .single();
    if (error) throw error;

    await audit({
      plan_id: plan.id,
      action: "MEMBER_UPSERT",
      target_type: "plan_slot_members",
      target_id: data?.id,
      payload: { slot_id, operator_id, position },
    });

    return {
      id: data.id,
      slot_id: data.slot_id,
      operator_id: data.operator_id,
      operator_name: safeText(data?.operators?.name) || "—",
      position: data.position,
      role_tag: data.role_tag || null,
      note: data.note || "",
    };
  };

  const updateMemberSlotDB = async ({ member_id, slot_id }) => {
    if (!plan?.id) return;
    const { error } = await supabase
      .from("plan_slot_members")
      .update({ slot_id, updated_at: new Date().toISOString() })
      .eq("id", member_id);
    if (error) throw error;
    await audit({
      plan_id: plan.id,
      action: "MEMBER_MOVE",
      target_type: "plan_slot_members",
      target_id: member_id,
      payload: { slot_id },
    });
  };

  const deleteMemberDB = async (memberId) => {
    if (!plan?.id) return;
    const { error } = await supabase.from("plan_slot_members").delete().eq("id", memberId);
    if (error) throw error;
    await audit({
      plan_id: plan.id,
      action: "MEMBER_REMOVE",
      target_type: "plan_slot_members",
      target_id: memberId,
      payload: {},
    });
  };

  const updateMemberPositionsDB = async (slotId, membersArr) => {
    if (!plan?.id) return;

    for (let i = 0; i < membersArr.length; i += 1) {
      const m = membersArr[i];
      const newPos = i + 1;
      if (m.position === newPos) continue;
      const { error } = await supabase.from("plan_slot_members").update({ position: newPos }).eq("id", m.id);
      if (error) throw error;
    }

    await audit({
      plan_id: plan.id,
      action: "MEMBER_REORDER",
      target_type: "plan_slot_members",
      target_id: null,
      payload: { slot_id: slotId, size: membersArr.length },
    });
  };

  const addOperatorToSlot = async ({ slotId, operatorId, atIndex = null }) => {
    if (!canMutate) return;
    if (!slotId || !operatorId) return;

    setBusy(true);
    setErr("");

    const existing = membersBySlotId.get(slotId) || [];
    const nextPos = atIndex == null ? existing.length + 1 : Math.max(1, Math.min(existing.length + 1, atIndex + 1));

    try {
      // Detect if the operator is already assigned in another slot (stale UI / parallel edits)
      let alreadyInSlotId = null;
      membersBySlotId.forEach((arr, sId) => {
        if (alreadyInSlotId) return;
        const found = (arr || []).find((m) => m.operator_id === operatorId);
        if (found) alreadyInSlotId = sId;
      });

      const inserted = await upsertMemberDB({ slot_id: slotId, operator_id: operatorId, position: nextPos });

      // If it was moved from another slot, safest UX is a reload (keeps positions consistent everywhere).
      if (alreadyInSlotId && alreadyInSlotId !== slotId) {
        await loadSlotsAndMembers(plan);
        setToastSoft("Spostato.");
        return;
      }

      const next = [...existing];
      if (atIndex == null || atIndex >= next.length) next.push(inserted);
      else next.splice(atIndex, 0, inserted);

      const normalized = next.map((m, idx) => ({ ...m, position: idx + 1 }));
      setMapMembers(slotId, normalized);

      await updateMemberPositionsDB(slotId, normalized);

      setToastSoft("Assegnato.");
    } catch (e) {
      console.error("[ManagerAssignments] addOperatorToSlot error:", e);
      setErr("Impossibile assegnare l’operatore (RLS/duplicati).");
      await loadSlotsAndMembers(plan);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (slotId, member) => {
    if (!canMutate) return;
    if (!slotId || !member?.id) return;

    setBusy(true);
    setErr("");

    const existing = membersBySlotId.get(slotId) || [];
    const next = existing.filter((m) => m.id !== member.id).map((m, idx) => ({ ...m, position: idx + 1 }));
    setMapMembers(slotId, next);

    try {
      await deleteMemberDB(member.id);
      await updateMemberPositionsDB(slotId, next);
      setToastSoft("Rimosso.");
    } catch (e) {
      console.error("[ManagerAssignments] removeMember error:", e);
      setErr("Impossibile rimuovere (RLS).");
      await loadSlotsAndMembers(plan);
    } finally {
      setBusy(false);
    }
  };

  const reorderWithinSlot = async ({ slotId, fromIndex, toIndex }) => {
    if (!canMutate) return;
    if (fromIndex === toIndex) return;

    setBusy(true);
    setErr("");

    const existing = membersBySlotId.get(slotId) || [];
    if (fromIndex < 0 || fromIndex >= existing.length) {
      setBusy(false);
      return;
    }
    const boundedTo = Math.max(0, Math.min(existing.length - 1, toIndex));

    const next = [...existing];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(boundedTo, 0, moved);

    const normalized = next.map((m, idx) => ({ ...m, position: idx + 1 }));
    setMapMembers(slotId, normalized);

    try {
      await updateMemberPositionsDB(slotId, normalized);
      setToastSoft("Ordinato.");
    } catch (e) {
      console.error("[ManagerAssignments] reorderWithinSlot error:", e);
      setErr("Impossibile riordinare (RLS).");
      await loadSlotsAndMembers(plan);
    } finally {
      setBusy(false);
    }
  };

  const onDragStartOperator = (e, operator) => {
    const payload = { type: "OPERATOR", operatorId: operator.id };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDragStartMember = (e, { slotId, index }) => {
    const payload = { type: "MEMBER", slotId, index };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const parseDropPayload = (e) => {
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const onDropToSlot = async (e, slotId, atIndex = null) => {
    e.preventDefault();
    if (!canMutate) return;
    const payload = parseDropPayload(e);
    if (!payload) return;

    if (payload.type === "OPERATOR") {
      await addOperatorToSlot({ slotId, operatorId: payload.operatorId, atIndex });
      return;
    }

    if (payload.type === "MEMBER") {
      const fromSlotId = payload.slotId;
      const fromIndex = payload.index;

      const fromArr = membersBySlotId.get(fromSlotId) || [];
      const moving = fromArr[fromIndex];
      if (!moving?.id) return;

      // Same slot -> reorder
      if (fromSlotId === slotId) {
        await reorderWithinSlot({ slotId, fromIndex, toIndex: atIndex ?? fromIndex });
        return;
      }

      // Cross-slot move (Manager only)
      if (!plan?.id) return;

      setBusy(true);
      setErr("");

      try {
        // 1) Update DB (move)
        await updateMemberSlotDB({ member_id: moving.id, slot_id: slotId });

        // 2) Update UI state
        const targetArr = membersBySlotId.get(slotId) || [];
        const nextFrom = fromArr.filter((m) => m.id !== moving.id).map((m, idx) => ({ ...m, position: idx + 1 }));
        const insertAt = atIndex == null ? targetArr.length : Math.max(0, Math.min(targetArr.length, atIndex));
        const nextTarget = [...targetArr];
        nextTarget.splice(insertAt, 0, { ...moving, slot_id: slotId });
        const nextTargetNorm = nextTarget.map((m, idx) => ({ ...m, position: idx + 1 }));

        setMembersBySlotId((prev) => {
          const m = new Map(prev);
          m.set(fromSlotId, nextFrom);
          m.set(slotId, nextTargetNorm);
          return m;
        });

        // 3) Persist positions
        await updateMemberPositionsDB(fromSlotId, nextFrom);
        await updateMemberPositionsDB(slotId, nextTargetNorm);

        setToastSoft("Spostato.");
      } catch (errMove) {
        console.error("[ManagerAssignments] move member error:", errMove);
        setErr("Impossibile spostare tra capi (RLS/duplicati).");
        await loadSlotsAndMembers(plan);
      } finally {
        setBusy(false);
      }
    }
  };

  const onDragOverAllow = (e) => {
    if (!canMutate) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const openPicker = ({ slotId, rowIndex }) => {
    if (!canMutate) return;
    setPickerSlotId(slotId);
    setPickerRowIndex(rowIndex);
    setPickerSearch("");
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setPickerSlotId(null);
    setPickerRowIndex(null);
    setPickerSearch("");
  };

  const updatePlanStatus = async (nextStatus) => {
    if (!plan?.id) return;
    if (isFrozen) return;

    const ns = normalizePlanStatus(nextStatus);

    setBusy(true);
    setErr("");

    try {
      // WEEK: status must propagate to Mon-Fri DAY plans (CAPO consumes DAY plans)
      if (effectivePeriod === "WEEK") {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("manager_set_week_status_v1", {
          p_week_plan_id: plan.id,
          p_next_status: ns,
          p_overwrite: false,
        });
        if (rpcErr) throw rpcErr;

        const { data: refreshed, error: rErr } = await supabase
          .from("manager_plans")
          .select("*")
          .eq("id", plan.id)
          .single();
        if (rErr) throw rErr;

        setPlan(refreshed);

        await audit({
          plan_id: plan.id,
          action: ns === "PUBLISHED" ? "PLAN_PUBLISH" : ns === "FROZEN" ? "PLAN_FREEZE" : "PLAN_DRAFT",
          target_type: "manager_plans",
          target_id: plan.id,
          payload: { from: status, to: ns, week_result: rpcData || null },
        });

        setToastSoft(ns === "FROZEN" ? "Settimana congelata (e giorni Lun-Ven)." : ns === "PUBLISHED" ? "Settimana pubblicata (e giorni Lun-Ven)." : "Bozza.");
        return;
      }

      // DAY: existing behavior
      const patch = {
        status: ns,
        updated_at: new Date().toISOString(),
      };

      if (ns === "FROZEN") patch.frozen_at = new Date().toISOString();

      const { data, error } = await supabase.from("manager_plans").update(patch).eq("id", plan.id).select("*").single();
      if (error) throw error;

      setPlan(data);
      await audit({
        plan_id: plan.id,
        action: ns === "PUBLISHED" ? "PLAN_PUBLISH" : ns === "FROZEN" ? "PLAN_FREEZE" : "PLAN_DRAFT",
        target_type: "manager_plans",
        target_id: plan.id,
        payload: { from: status, to: ns },
      });

      setToastSoft(ns === "FROZEN" ? "Piano congelato." : ns === "PUBLISHED" ? "Piano pubblicato." : "Bozza.");
    } catch (e) {
      console.error("[ManagerAssignments] updatePlanStatus error:", e);
      setErr("Impossibile aggiornare stato (RLS).");
    } finally {
      setBusy(false);
    }
  };

  const headerLabel = useMemo(() => {
    if (!plan?.id) return "Nessun piano caricato";
    if (effectivePeriod === "DAY") return `Piano giorno · ${safeText(plan.plan_date) || "—"}`;
    return `Piano settimana · ${safeText(plan.year_iso)}-W${safeText(plan.week_iso)}`;
  }, [plan, effectivePeriod]);

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#050910] text-slate-50" : "bg-white text-slate-900")}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className={cardClass() + " p-4"}>
          {sectionTitle(
            "MANAGER · PLANNING",
            headerLabel,
            <div className="flex items-center gap-2">
              {plan?.status ? <span className={badgeStatus(plan.status)}>{normalizePlanStatus(plan.status)}</span> : null}

              <button type="button" className={btnGhost()} disabled={!plan?.id} onClick={() => setWorkspaceOpen(true)} title="Vista Excel globale">
                Vista globale
              </button>

              <button type="button" className={btnGhost()} disabled={loadingPlan || busy} onClick={handleLoadPlan}>
                {loadingPlan ? "Carico…" : plan?.id ? "Ricarica" : "Carica/crea"}
              </button>

              <button
                type="button"
                className={btnPrimary()}
                disabled={!plan?.id || busy || isFrozen}
                onClick={() => updatePlanStatus("PUBLISHED")}
                title="Rende il piano visibile ai Capi"
              >
                Pubblica
              </button>

              <button
                type="button"
                className={btnPrimary()}
                disabled={!plan?.id || busy || isFrozen}
                onClick={() => updatePlanStatus("FROZEN")}
                title="Blocca definitivamente il piano"
              >
                Congela
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Plan selector */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Piano</div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={pillClass(effectivePeriod === "DAY")} onClick={() => setPeriodType("DAY")}>
                  Giorno
                </button>
                <button type="button" className={pillClass(effectivePeriod === "WEEK")} onClick={() => setPeriodType("WEEK")}>
                  Settimana
                </button>
              </div>

              {effectivePeriod === "DAY" ? (
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Data</div>
                  <input
                    type="date"
                    value={dayDate}
                    onChange={(e) => setDayDate(e.target.value)}
                    className={cn(
                      "mt-1 w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                      "border-slate-800 bg-slate-950/70 text-slate-50",
                      "outline-none focus:ring-2 focus:ring-sky-500/35"
                    )}
                  />
                </div>
              ) : (
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ancora settimana (una data)</div>
                  <input
                    type="date"
                    value={weekDateAnchor}
                    onChange={(e) => setWeekDateAnchor(e.target.value)}
                    className={cn(
                      "mt-1 w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                      "border-slate-800 bg-slate-950/70 text-slate-50",
                      "outline-none focus:ring-2 focus:ring-sky-500/35"
                    )}
                  />
                  <div className="mt-2 text-[12px] text-slate-500">
                    ISO:{" "}
                    <span className="text-slate-200 font-semibold">
                      {(() => {
                        const d = parseDateLocal(weekDateAnchor);
                        const { year, week } = isoWeekYear(d);
                        return `${year}-W${week}`;
                      })()}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Vai al giorno (Lun–Ven)</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {weekDays.map((wd) => (
                        <button
                          key={wd.date}
                          type="button"
                          className={btnGhost()}
                          disabled={busy || loadingPlan}
                          onClick={() => jumpToDayFromWeek(wd.date)}
                          title="Apri il piano giorno per questa data"
                        >
                          {wd.label} <span className="text-slate-400">{wd.date}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button type="button" className={btnPrimary()} disabled={loadingPlan || busy || !me?.id} onClick={handleLoadPlan}>
                  {plan?.id ? "Aggiorna piano" : "Crea piano"}
                </button>
                <button type="button" className={btnGhost()} disabled={!plan?.id || busy} onClick={() => loadSlotsAndMembers(plan)}>
                  Slots
                </button>

                {effectivePeriod === "WEEK" ? (
                  <button
                    type="button"
                    className={btnGhost()}
                    disabled={!plan?.id || busy || loadingPlan}
                    onClick={() => applyWeekToDays(false)}
                    title="Copia le squadre della settimana su Lun–Ven (senza sovrascrivere i giorni gia compilati)"
                  >
                    Applica Lun–Ven
                  </button>
                ) : null}
              </div>

              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Controlli</div>
                <div className="mt-1 text-[12px] text-slate-300">
                  Capi assegnati: <span className="font-semibold text-slate-50">{loadingCapi ? "…" : capi.length}</span>
                </div>
                <div className="mt-1 text-[12px] text-slate-300">
                  Operatori liberi: <span className="font-semibold text-slate-50">{loadingOperators ? "…" : filteredOperators.length}</span>
                </div>
                <div className="mt-2 text-[12px] text-slate-500">
                  Stato: <span className="text-slate-200 font-semibold">{status}</span>{" "}
                  {isFrozen ? <span className="text-rose-200">· bloccato</span> : isPublished ? <span className="text-emerald-200">· visibile</span> : null}
                </div>
              </div>

              {err ? (
                <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
                  {err}
                </div>
              ) : null}

              {toast ? (
                <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-100">
                  {toast}
                </div>
              ) : null}
            </div>

            {/* Slots */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              {sectionTitle("CAPI · SQUADRE", "Trascina operatori nelle righe", null)}

              {!plan?.id ? (
                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-300">
                  Carica o crea un piano per iniziare.
                </div>
              ) : loadingSlots ? (
                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-300">
                  Caricamento slots…
                </div>
              ) : slots.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-300">
                  Nessun capo assegnato a questo Manager.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {slots.map((s) => {
                    const members = membersBySlotId.get(s.id) || [];
                    return (
                      <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Capo</div>
                            <div className="mt-1">
                              <NamePill isDark={isDark} tone="emerald">
                                {s.capo_name}
                              </NamePill>
                            </div>
                          </div>
                          <div className="text-[12px] text-slate-400">
                            <span className="text-slate-200 font-semibold">{members.length}</span> operatori
                          </div>
                        </div>

                        <div
                          className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden"
                          onDragOver={onDragOverAllow}
                          onDrop={(e) => onDropToSlot(e, s.id, null)}
                          title={canMutate ? "Trascina qui per assegnare" : "Piano bloccato"}
                        >
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                            <div className="col-span-8 text-slate-200">Operatore</div>
                            <div className="col-span-2 text-slate-200">Pos</div>
                            <div className="col-span-2 text-right text-slate-200">Azioni</div>
                          </div>

                          <div className="divide-y divide-slate-800">
                            {members.length === 0 ? (
                              <div className="px-3 py-4 text-[13px] text-slate-400">
                                Nessun operatore assegnato. Trascina dalla lista a destra o tocca una riga per scegliere.
                              </div>
                            ) : (
                              members.map((m, idx) => (
                                <div
                                  key={m.id}
                                  className={cn("px-3 py-2 hover:bg-slate-900/20", canMutate ? "cursor-grab" : "cursor-default")}
                                  draggable={canMutate}
                                  onDragStart={(e) => onDragStartMember(e, { slotId: s.id, index: idx })}
                                  onDragOver={(e) => onDragOverAllow(e)}
                                  onDrop={(e) => onDropToSlot(e, s.id, idx)}
                                >
                                  <div className="grid grid-cols-12 gap-2 items-center">
                                    <button
                                      type="button"
                                      className={cn(
                                        "col-span-8 text-left",
                                        "rounded-xl border px-2.5 py-2",
                                        "border-slate-800 bg-slate-950/60 hover:bg-slate-900/35",
                                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                                        "disabled:opacity-60 disabled:cursor-not-allowed"
                                      )}
                                      disabled={!canMutate}
                                      onClick={() => openPicker({ slotId: s.id, rowIndex: idx })}
                                      title="Tocca per sostituire (mini popup)"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <NamePill isDark={isDark} tone="sky" className="max-w-full">
                                          {m.operator_name}
                                        </NamePill>
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-500 truncate">Trascina per riordinare · Tap per popup</div>
                                    </button>

                                    <div className="col-span-2 text-[12px] text-slate-300 tabular-nums">{idx + 1}</div>

                                    <div className="col-span-2 text-right">
                                      <button
                                        type="button"
                                        className={btnGhost()}
                                        disabled={!canMutate}
                                        onClick={() => removeMember(s.id, m)}
                                        title="Rimuovi"
                                      >
                                        Rimuovi
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}

                            <div className="px-3 py-2">
                              <button
                                type="button"
                                className={cn(
                                  "w-full rounded-xl border px-3 py-2.5 text-left",
                                  "border-slate-800 bg-slate-950/40 hover:bg-slate-900/25",
                                  "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                                  "disabled:opacity-60 disabled:cursor-not-allowed"
                                )}
                                disabled={!canMutate}
                                onClick={() => openPicker({ slotId: s.id, rowIndex: members.length })}
                                title="Tocca per scegliere un operatore"
                              >
                                <div className="text-[12px] font-semibold text-slate-200">+ Aggiungi operatore</div>
                                <div className="text-[11px] text-slate-500">Apre mini popup con la lista (oggi)</div>
                              </button>
                            </div>
                          </div>
                        </div>

                        {isFrozen ? <div className="mt-2 text-[12px] text-rose-200">Piano congelato: modifiche disabilitate.</div> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Operator pool */}
            <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              {sectionTitle("OPERATORI · OGGI", "Trascina nelle righe", null)}

              <div className="mt-3">
                <input
                  value={qOperators}
                  onChange={(e) => setQOperators(e.target.value)}
                  placeholder="Cerca…"
                  className={cn(
                    "w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                    "border-slate-800 bg-slate-950/70 text-slate-50 placeholder:text-slate-500",
                    "outline-none focus:ring-2 focus:ring-sky-500/35"
                  )}
                />
              </div>

              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                  Disponibili ({loadingOperators ? "…" : filteredOperators.length})
                </div>

                <div className="max-h-[58vh] overflow-auto">
                  {loadingOperators ? (
                    <div className="px-3 py-4 text-[13px] text-slate-400">Caricamento…</div>
                  ) : filteredOperators.length === 0 ? (
                    <div className="px-3 py-4 text-[13px] text-slate-400">
                      Nessun operatore disponibile nel perimetro (o già assegnati).
                    </div>
                  ) : (
                    filteredOperators.map((o) => (
                      <div
                        key={o.id}
                        className={cn(
                          "px-3 py-2 border-b border-slate-800 last:border-b-0 hover:bg-slate-900/20",
                          canMutate ? "cursor-grab" : "cursor-default opacity-80"
                        )}
                        draggable={canMutate}
                        onDragStart={(e) => onDragStartOperator(e, o)}
                        title={canMutate ? "Trascina sul capo" : "Piano bloccato"}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <NamePill isDark={isDark} tone="sky">
                            {safeText(o.name) || "—"}
                          </NamePill>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Roles: {Array.isArray(o.roles) && o.roles.length ? o.roles.join(", ") : "—"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button type="button" className={btnGhost()} disabled={busy} onClick={loadOperators}>
                  Ricarica operatori
                </button>
                <button type="button" className={btnGhost()} disabled={busy || loadingCapi} onClick={loadCapiForManager}>
                  Ricarica capi
                </button>
              </div>

              <div className="mt-3 text-[12px] text-slate-500">
                Nota: il pool è limitato al perimetro Manager (ship_managers → ship_operators). Gli operatori già assegnati non compaiono qui.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace modal (Excel-like global view) */}
      <SlotsWorkspaceModal
        isOpen={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        isDark={isDark}
        plan={plan}
        slots={slots}
        membersBySlotId={membersBySlotId}
      />

      {/* Mini popup picker */}
      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Seleziona operatore"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePicker();
          }}
        >
          <div className="absolute inset-0 bg-black/70" />

          <div
            className={cn(
              "relative w-full sm:w-[min(980px,96vw)]",
              "rounded-t-3xl sm:rounded-3xl border border-slate-800",
              "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
              "px-4 pb-4 pt-4"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Operatore · Selezione rapida</div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">Lista operatori disponibili (oggi)</div>
                <div className="mt-1 text-[12px] text-slate-500">Tocca un nome per inserirlo nella riga selezionata.</div>
              </div>
              <button type="button" onClick={closePicker} className={btnGhost()}>
                Chiudi
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Filtro</div>
                <input
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Cerca…"
                  className={cn(
                    "mt-2 w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                    "border-slate-800 bg-slate-950/70 text-slate-50 placeholder:text-slate-500",
                    "outline-none focus:ring-2 focus:ring-sky-500/35"
                  )}
                />
                <div className="mt-2 text-[12px] text-slate-500">
                  Risultati: <span className="text-slate-200 font-semibold">{filteredPickerOperators.length}</span>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Target</div>
                  <div className="mt-1 text-[12px] text-slate-300">
                    Slot: <span className="text-slate-50 font-semibold">{safeText(pickerSlotId).slice(0, 8) || "—"}</span>
                  </div>
                  <div className="mt-1 text-[12px] text-slate-300">
                    Riga: <span className="text-slate-50 font-semibold">{pickerRowIndex == null ? "—" : pickerRowIndex + 1}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                  Seleziona operatore
                </div>
                <div className="max-h-[56vh] overflow-auto">
                  {filteredPickerOperators.length === 0 ? (
                    <div className="px-3 py-5 text-[13px] text-slate-400">Nessun operatore disponibile.</div>
                  ) : (
                    filteredPickerOperators.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 border-b border-slate-800 last:border-b-0",
                          "hover:bg-slate-900/25 focus:outline-none focus:bg-slate-900/25"
                        )}
                        onClick={async () => {
                          const slotId = pickerSlotId;
                          const idx = pickerRowIndex;

                          closePicker();

                          await addOperatorToSlot({
                            slotId,
                            operatorId: o.id,
                            atIndex: typeof idx === "number" ? idx : null,
                          });
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <NamePill isDark={isDark} tone="sky">
                            {safeText(o.name) || "—"}
                          </NamePill>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Roles: {Array.isArray(o.roles) && o.roles.length ? o.roles.join(", ") : "—"}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 text-[12px] text-slate-500">
              Nota v1: inserisce l’operatore nella riga target. In v2: sostituzione atomica.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
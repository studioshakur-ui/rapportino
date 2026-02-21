// src/admin/AdminPlanningPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAdminConsole } from "./AdminConsoleContext";

type PlanningRow = {
  plan_id?: string | null;
  period_type?: string | null;
  plan_date?: string | null;
  year_iso?: number | string | null;
  week_iso?: number | string | null;
  status?: string | null;
  manager_id?: string | null;
  slot_id?: string | null;
  capo_id?: string | null;
  operator_id?: string | null;
  operator_position?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SlotMember = {
  operator_id: string;
  position?: number | null;
};

type SlotAccum = {
  slot_id: string;
  capo_id?: string | null;
  members: SlotMember[];
};

type PlanAccum = {
  plan_id: string;
  period_type?: string | null;
  plan_date?: string | null;
  year_iso?: number | string | null;
  week_iso?: number | string | null;
  status?: string | null;
  manager_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  slots: Map<string, SlotAccum>;
};

type PlanView = Omit<PlanAccum, "slots"> & { slots: SlotAccum[] };

function cn(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(" ");
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "sky" | "amber" | "emerald" | "rose";
}): JSX.Element {
  const map = {
    slate: "badge-neutral",
    sky: "badge-info",
    amber: "badge-warning",
    emerald: "badge-success",
    rose: "badge-danger",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold", map[tone] || map.slate)}>
      {children}
    </span>
  );
}

export default function AdminPlanningPage(): JSX.Element {
  const { setConfig, resetConfig, registerSearchItems, clearSearchItems, setRecentItems } = useAdminConsole();
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");
  const [rows, setRows] = useState<PlanningRow[]>([]);

  // Filters
  const [periodType, setPeriodType] = useState<string>("ALL"); // DAY/WEEK/ALL
  const [status, setStatus] = useState<string>("ALL"); // DRAFT/PUBLISHED/FROZEN/ALL
  const [q, setQ] = useState<string>("");

  const fetchData = async (): Promise<void> => {
    setLoading(true);
    setErr("");
    try {
      // admin_planning_overview_v1 contains denormalized lines (plan + slot + member)
      let query = supabase
        .from("admin_planning_overview_v1")
        .select(
          `
          plan_id,
          period_type,
          plan_date,
          year_iso,
          week_iso,
          status,
          manager_id,
          slot_id,
          capo_id,
          operator_id,
          operator_position,
          created_at,
          updated_at
        `
        )
        .order("updated_at", { ascending: false })
        .limit(1200);

      const { data, error } = await query;
      if (error) throw error;

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AdminPlanningPage] load error:", e);
      setErr("Impossibile caricare admin_planning_overview_v1 (verifica RLS e view).");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const plans = useMemo<PlanView[]>(() => {
    // Group by plan_id -> slot_id -> members
    const map = new Map<string, PlanAccum>();

    for (const r of rows) {
      const pid = r.plan_id || "";
      if (!pid) continue;

      if (!map.has(pid)) {
        map.set(pid, {
          plan_id: pid,
          period_type: r.period_type || null,
          plan_date: r.plan_date || null,
          year_iso: r.year_iso ?? null,
          week_iso: r.week_iso ?? null,
          status: r.status || null,
          manager_id: r.manager_id || null,
          created_at: r.created_at || null,
          updated_at: r.updated_at || null,
          slots: new Map<string, SlotAccum>(),
        });
      }

      const plan = map.get(pid);
      if (!plan) continue;

      // Keep latest updated_at if present
      if (r.updated_at && (!plan.updated_at || String(r.updated_at) > String(plan.updated_at))) {
        plan.updated_at = r.updated_at;
      }

      const sid = r.slot_id || null;
      if (sid) {
        if (!plan.slots.has(sid)) {
          plan.slots.set(sid, {
            slot_id: sid,
            capo_id: r.capo_id || null,
            members: [],
          });
        }
        const slot = plan.slots.get(sid);
        if (!slot) continue;
        if (r.operator_id) {
          slot.members.push({
            operator_id: r.operator_id,
            position: r.operator_position ?? null,
          });
        }
      }
    }

    const list: PlanView[] = Array.from(map.values()).map((p) => {
      const slots: SlotAccum[] = Array.from(p.slots.values()).map((s) => ({
        ...s,
        members: (s.members || [])
          .slice()
          .sort((a: SlotMember, b: SlotMember) => (a.position ?? 9999) - (b.position ?? 9999)),
      }));
      return {
        ...p,
        slots,
      };
    });

    // Apply filters
    const qq = (q || "").trim().toLowerCase();
    const filtered = list.filter((p) => {
      if (periodType !== "ALL" && String(p.period_type || "").toUpperCase() !== periodType) return false;
      if (status !== "ALL" && String(p.status || "").toUpperCase() !== status) return false;

      if (!qq) return true;

      const blob = [
        p.plan_id,
        p.period_type,
        p.plan_date,
        p.year_iso,
        p.week_iso,
        p.status,
        p.manager_id,
        ...p.slots.map((s: SlotAccum) => s.capo_id),
        ...p.slots.flatMap((s: SlotAccum) => s.members.map((m: SlotMember) => m.operator_id)),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(qq);
    });

    // Sort by updated_at desc
    filtered.sort((a: PlanView, b: PlanView) => String(b.updated_at || "") > String(a.updated_at || "") ? 1 : -1);

    return filtered;
  }, [rows, periodType, status, q]);

  const searchItems = useMemo(() => {
    return plans.map((p) => ({
      id: String(p.plan_id),
      entity: "Planning",
      title: `Plan ${String(p.plan_id)}`,
      subtitle: [p.status, p.period_type, p.plan_date ? `Data ${p.plan_date}` : ""].filter(Boolean).join(" · "),
      route: "/admin/planning",
      tokens: [
        p.plan_id,
        p.period_type,
        p.plan_date,
        p.year_iso,
        p.week_iso,
        p.status,
        p.manager_id,
        ...p.slots.map((s: SlotAccum) => s.capo_id),
        ...p.slots.flatMap((s: SlotAccum) => s.members.map((m: SlotMember) => m.operator_id)),
      ]
        .filter(Boolean)
        .join(" "),
      updatedAt: p.updated_at || p.created_at || null,
      badge: p.status || undefined,
      badgeTone: statusTone(p.status),
    }));
  }, [plans]);

  const recent = useMemo(() => {
    const sorted = [...plans].sort((a, b) =>
      String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""))
    );
    return sorted.slice(0, 5).map((p) => ({
      id: String(p.plan_id),
      title: `Plan ${String(p.plan_id)}`,
      subtitle: [p.status, p.period_type].filter(Boolean).join(" · "),
      route: "/admin/planning",
      timeLabel: p.updated_at || p.created_at || undefined,
    }));
  }, [plans]);

  useEffect(() => {
    setConfig({ title: "Planning", searchPlaceholder: "Cerca piani, capi, manager, operatori…" });
    return () => resetConfig();
  }, [setConfig, resetConfig]);

  useEffect(() => {
    registerSearchItems("Planning", searchItems);
    return () => clearSearchItems("Planning");
  }, [registerSearchItems, clearSearchItems, searchItems]);

  useEffect(() => {
    setRecentItems(recent);
    return () => setRecentItems([]);
  }, [setRecentItems, recent]);

  const statusTone = (s: unknown): "slate" | "sky" | "amber" => {
    const v = String(s || "").toUpperCase();
    if (v === "DRAFT") return "slate";
    if (v === "PUBLISHED") return "sky";
    if (v === "FROZEN") return "amber";
    return "slate";
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl theme-panel p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              ADMIN · PLANNING OVERVIEW
            </div>
            <div className="mt-1 text-[14px] font-semibold text-slate-50">
              Plans (DAY/WEEK) · Slots Capo · Membri
            </div>
            <div className="mt-1 text-[12px] text-slate-400">
              Fonte: <span className="text-slate-200 font-semibold">admin_planning_overview_v1</span>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center justify-center rounded-full border theme-border bg-[var(--panel2)] px-4 py-2 text-[12px] font-semibold theme-text hover:bg-[var(--panel)]"
          >
            Ricarica
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Period</div>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="mt-1 w-full rounded-xl theme-input px-3 py-2 text-[13px] outline-none"
            >
              <option value="ALL">Tutti</option>
              <option value="DAY">DAY</option>
              <option value="WEEK">WEEK</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl theme-input px-3 py-2 text-[13px] outline-none"
            >
              <option value="ALL">Tutti</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="FROZEN">FROZEN</option>
            </select>
          </div>

          <div className="md:col-span-6">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca plan_id, manager_id, capo_id, operator_id, week/date…"
              className="mt-1 w-full rounded-xl theme-input px-3 py-2 text-[13px] placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
            {err}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl theme-panel overflow-hidden">
        <div className="px-4 py-3 border-b theme-border bg-[var(--panel2)] flex items-center justify-between">
          <div className="text-[12px] text-slate-300">
            {loading ? "Caricamento…" : `${plans.length} piani`}
          </div>
          <div className="text-[11px] text-slate-500">
            Ultimi dati · limit 1200 righe view
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-[13px] text-slate-400">Caricamento…</div>
        ) : plans.length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-slate-400">
            Nessun piano trovato con questi filtri.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {plans.map((p) => (
              <div key={p.plan_id} className="px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(p.status)}>{String(p.status || "—")}</Badge>
                      <Badge tone="slate">{String(p.period_type || "—")}</Badge>
                      {p.plan_date ? <Badge tone="emerald">Data {String(p.plan_date)}</Badge> : null}
                      {p.week_iso && p.year_iso ? (
                        <Badge tone="sky">
                          W{p.week_iso} · {p.year_iso}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-2 text-[12px] text-slate-400">
                      Plan ID: <span className="text-slate-200 font-semibold">{p.plan_id}</span>
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500">
                      Manager: <span className="text-slate-300">{p.manager_id || "—"}</span> · Updated:{" "}
                      <span className="text-slate-300">{p.updated_at ? String(p.updated_at) : "—"}</span>
                    </div>
                  </div>

                  <div className="text-[12px] text-slate-400">
                    Slots: <span className="text-slate-50 font-semibold">{p.slots.length}</span> · Membri:{" "}
                    <span className="text-slate-50 font-semibold">
                      {p.slots.reduce((sum: number, s: SlotAccum) => sum + (s.members?.length || 0), 0)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {p.slots.length === 0 ? (
                    <div className="text-[12px] text-slate-500">
                      Nessuno slot (plan senza capi).
                    </div>
                  ) : (
                    p.slots.map((s: SlotAccum) => (
                      <div key={s.slot_id} className="rounded-2xl border theme-border bg-[var(--panel2)] p-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          Slot Capo
                        </div>
                        <div className="mt-1 text-[12px] text-slate-200">
                          Capo: <span className="font-semibold">{s.capo_id || "—"}</span>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-500">
                          Slot ID: <span className="text-slate-400">{s.slot_id}</span>
                        </div>

                        <div className="mt-2">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                            Membri
                          </div>
                          {(!s.members || s.members.length === 0) ? (
                            <div className="mt-1 text-[12px] text-slate-500">Nessun operatore.</div>
                          ) : (
                            <div className="mt-1 space-y-1">
                              {s.members.map((m: SlotMember) => (
                                <div
                                  key={`${s.slot_id}-${m.operator_id}`}
                                  className="flex items-center justify-between rounded-xl border theme-border bg-[var(--panel2)] px-2 py-1.5"
                                >
                                  <div className="text-[12px] text-slate-200 truncate">
                                    {m.operator_id}
                                  </div>
                                  <div className="text-[12px] text-slate-500 tabular-nums">
                                    #{m.position ?? "—"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

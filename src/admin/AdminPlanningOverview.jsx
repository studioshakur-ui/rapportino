// src/admin/AdminPlanningOverview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * ADMIN — Planning Overview + Assignments (Manager ↔ Capo) + Audit
 *
 * Uses:
 * - admin_planning_overview_v1 (view) for aggregated rows
 * - manager_capo_assignments to attach capi to a manager (pk capo_id)
 * - planning_audit for audit feed
 * - profiles for managers/capi display labels
 *
 * IMPORTANT:
 * - RLS is enabled on all planning tables. This page assumes ADMIN has broad read/write per your policies.
 */

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function card() {
  return cn("rounded-2xl theme-panel");
}

function btnGhost() {
  return cn(
    "inline-flex items-center justify-center rounded-full px-3 py-2",
    "text-[12px] font-semibold btn-instrument",
    "focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

function btnPrimary() {
  return cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-2",
    "text-[12px] font-semibold btn-primary",
    "focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

function badgeStatus(status) {
  const s = String(status || "").trim().toUpperCase();
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-[0.16em]";
  if (s === "FROZEN") return cn(base, "badge-danger");
  if (s === "PUBLISHED") return cn(base, "badge-success");
  return cn(base, "badge-neutral");
}

function safeText(v) {
  return (v == null ? "" : String(v)).trim();
}

export default function AdminPlanningOverview({ isDark = true }) {
  const [me, setMe] = useState(null);

  // View rows (denormalized)
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // Audit
  const [auditRows, setAuditRows] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Profiles
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState([]); // manager_capo_assignments + profiles
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // UI filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL/DRAFT/PUBLISHED/FROZEN
  const [periodFilter, setPeriodFilter] = useState("ALL"); // ALL/DAY/WEEK

  // Assignment editor
  const [selectedCapoId, setSelectedCapoId] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [activeFlag, setActiveFlag] = useState(true);

  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  /** Load me */
  useEffect(() => {
    let alive = true;
    async function loadMe() {
      try {
        const { data, error } = await supabase.rpc("core_current_profile");
        if (error) throw error;
        if (!alive) return;
        setMe(data || null);
      } catch (e) {
        console.error("[AdminPlanningOverview] loadMe error:", e);
        if (!alive) return;
        setMe(null);
        setErr("Impossibile determinare profilo ADMIN.");
      }
    }
    loadMe();
    return () => {
      alive = false;
    };
  }, []);

  /** Load profiles (for dropdowns) */
  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,app_role,display_name,full_name,email,created_at")
        .order("app_role", { ascending: true })
        .order("display_name", { ascending: true });
      if (error) throw error;
      setProfiles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AdminPlanningOverview] loadProfiles error:", e);
      setProfiles([]);
      setErr("Impossibile caricare profiles.");
    } finally {
      setLoadingProfiles(false);
    }
  };

  /** Load overview view */
  const loadOverview = async () => {
    setLoadingRows(true);
    setErr("");
    try {
      // view columns are not guaranteed, so we fetch '*' and use defensive rendering
      let qy = supabase.from("admin_planning_overview_v1").select("*");

      if (statusFilter !== "ALL") qy = qy.eq("status", statusFilter);
      if (periodFilter !== "ALL") qy = qy.eq("period_type", periodFilter);

      const { data, error } = await qy.order("created_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AdminPlanningOverview] loadOverview error:", e);
      setRows([]);
      setErr("Impossibile caricare overview (RLS/view).");
    } finally {
      setLoadingRows(false);
    }
  };

  /** Load audit feed */
  const loadAudit = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase
        .from("planning_audit")
        .select(
          `
          id,
          plan_id,
          actor_id,
          action,
          target_type,
          target_id,
          payload,
          created_at,
          profiles:actor_id ( id, display_name, full_name, email, app_role )
        `
        )
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;

      const list = (Array.isArray(data) ? data : []).map((r) => {
        const p = r?.profiles || {};
        const who = safeText(p.display_name) || safeText(p.full_name) || safeText(p.email) || "—";
        return { ...r, actor_label: who, actor_role: safeText(p.app_role) || "—" };
      });

      setAuditRows(list);
    } catch (e) {
      console.error("[AdminPlanningOverview] loadAudit error:", e);
      setAuditRows([]);
      setErr("Impossibile caricare audit.");
    } finally {
      setLoadingAudit(false);
    }
  };

  /** Load current assignments (join to capo/manager profiles) */
  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from("manager_capo_assignments")
        .select(
          `
          capo_id,
          manager_id,
          active,
          created_at,
          profiles_capo:capo_id ( id, display_name, full_name, email, app_role ),
          profiles_manager:manager_id ( id, display_name, full_name, email, app_role )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (Array.isArray(data) ? data : []).map((r) => {
        const c = r?.profiles_capo || {};
        const m = r?.profiles_manager || {};
        const capoLabel = safeText(c.display_name) || safeText(c.full_name) || safeText(c.email) || "—";
        const manLabel = safeText(m.display_name) || safeText(m.full_name) || safeText(m.email) || "—";
        return {
          capo_id: r.capo_id,
          manager_id: r.manager_id,
          active: !!r.active,
          created_at: r.created_at,
          capo_label: capoLabel,
          manager_label: manLabel,
        };
      });

      setAssignments(list);
    } catch (e) {
      console.error("[AdminPlanningOverview] loadAssignments error:", e);
      setAssignments([]);
      setErr("Impossibile caricare assegnazioni capo/manager.");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadOverview();
    loadAudit();
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const managers = useMemo(() => profiles.filter((p) => safeText(p.app_role).toUpperCase() === "MANAGER"), [profiles]);
  const capi = useMemo(() => profiles.filter((p) => safeText(p.app_role).toUpperCase() === "CAPO"), [profiles]);

  const filteredRows = useMemo(() => {
    const qq = safeText(q).toLowerCase();
    const base = Array.isArray(rows) ? rows : [];
    if (!qq) return base;

    // very defensive: search across common fields
    return base.filter((r) => {
      const hay = [
        r?.plan_id,
        r?.manager_id,
        r?.capo_id,
        r?.operator_id,
        r?.status,
        r?.period_type,
        r?.plan_date,
        r?.year_iso,
        r?.week_iso,
      ]
        .map((x) => safeText(x).toLowerCase())
        .join(" · ");
      return hay.includes(qq);
    });
  }, [rows, q]);

  const groupedByPlan = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const pid = safeText(r.plan_id) || "—";
      const arr = map.get(pid) || [];
      arr.push(r);
      map.set(pid, arr);
    });
    // Sort plans by most recent created_at if present
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const ra = a[1]?.[0];
      const rb = b[1]?.[0];
      const ta = safeText(ra?.created_at) ? Date.parse(ra.created_at) : 0;
      const tb = safeText(rb?.created_at) ? Date.parse(rb.created_at) : 0;
      return tb - ta;
    });
    return entries;
  }, [filteredRows]);

  const saveAssignment = async () => {
    setErr("");
    setToast("");

    const capo_id = safeText(selectedCapoId);
    const manager_id = safeText(selectedManagerId);

    if (!capo_id || !manager_id) {
      setErr("Seleziona CAPO e MANAGER.");
      return;
    }

    setBusy(true);
    try {
      // pk is capo_id -> upsert overwrites manager_id
      const { error } = await supabase.from("manager_capo_assignments").upsert({
        capo_id,
        manager_id,
        active: !!activeFlag,
        created_by: me?.id || null,
      });

      if (error) throw error;

      setToast("Assegnazione salvata.");
      setSelectedCapoId("");
      setSelectedManagerId("");
      setActiveFlag(true);

      await loadAssignments();
    } catch (e) {
      console.error("[AdminPlanningOverview] saveAssignment error:", e);
      setErr("Impossibile salvare assegnazione (RLS).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("min-h-screen theme-bg theme-scope")}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className={card() + " p-4"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="kicker">ADMIN · PLANNING</div>
              <div className="mt-1 text-[16px] font-semibold theme-text">Overview · Assignments · Audit</div>
              <div className="mt-1 text-[12px] theme-text-muted">
                Controllo centralizzato: piani, capi assegnati ai manager, audit delle azioni.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className={btnGhost()} disabled={busy} onClick={loadProfiles}>
                Profiles
              </button>
              <button type="button" className={btnGhost()} disabled={busy} onClick={loadAssignments}>
                Assegnazioni
              </button>
              <button type="button" className={btnGhost()} disabled={busy} onClick={loadOverview}>
                Overview
              </button>
              <button type="button" className={btnGhost()} disabled={busy} onClick={loadAudit}>
                Audit
              </button>
            </div>
          </div>

          {err ? <div className="mt-4 rounded-xl px-3 py-2 text-[13px] badge-danger">{err}</div> : null}

          {toast ? <div className="mt-4 rounded-xl px-3 py-2 text-[13px] badge-success">{toast}</div> : null}

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Assignments editor */}
            <div className="lg:col-span-4 rounded-2xl theme-panel-2 p-3">
              <div className="kicker">Manager ↔ Capo</div>
              <div className="mt-1 text-[14px] font-semibold theme-text">Assegna un Capo a un Manager</div>

              <div className="mt-3">
                <div className="kicker">CAPO</div>
                <select
                  value={selectedCapoId}
                  onChange={(e) => setSelectedCapoId(e.target.value)}
                  className={cn(
                    "mt-1 w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                    "theme-input",
                    "outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  )}
                >
                  <option value="">— Seleziona —</option>
                  {capi.map((p) => {
                    const label = safeText(p.display_name) || safeText(p.full_name) || safeText(p.email) || "—";
                    return (
                      <option key={p.id} value={p.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mt-3">
                <div className="kicker">MANAGER</div>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className={cn(
                    "mt-1 w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                    "theme-input",
                    "outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  )}
                >
                  <option value="">— Seleziona —</option>
                  {managers.map((p) => {
                    const label = safeText(p.display_name) || safeText(p.full_name) || safeText(p.email) || "—";
                    return (
                      <option key={p.id} value={p.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  id="activeFlag"
                  type="checkbox"
                  checked={activeFlag}
                  onChange={(e) => setActiveFlag(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="activeFlag" className="text-[12px] theme-text-muted">
                  Attivo
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button type="button" className={btnPrimary()} disabled={busy} onClick={saveAssignment}>
                  Salva
                </button>
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={busy}
                  onClick={() => {
                    setSelectedCapoId("");
                    setSelectedManagerId("");
                    setActiveFlag(true);
                    setErr("");
                    setToast("");
                  }}
                >
                  Reset
                </button>
              </div>

              <div className="mt-4 rounded-2xl border theme-border bg-[var(--panel)] overflow-hidden">
                <div className="px-3 py-2 border-b theme-border bg-[var(--panel2)] text-[11px] theme-text-muted">
                  Assegnazioni correnti ({loadingAssignments ? "…" : assignments.length})
                </div>
                <div className="max-h-[44vh] overflow-auto">
                  {loadingAssignments ? (
                    <div className="px-3 py-4 text-[13px] theme-text-muted">Caricamento…</div>
                  ) : assignments.length === 0 ? (
                    <div className="px-3 py-4 text-[13px] theme-text-muted">Nessuna assegnazione.</div>
                  ) : (
                    assignments.map((a) => (
                      <div key={a.capo_id} className="px-3 py-2 border-b theme-border last:border-b-0">
                        <div className="text-[13px] font-semibold theme-text truncate">{a.capo_label}</div>
                        <div className="mt-0.5 text-[12px] theme-text-muted truncate">
                          → <span className="theme-text font-semibold">{a.manager_label}</span>{" "}
                          {a.active ? <span className="badge-success px-2 py-0.5 rounded-full">· attivo</span> : <span className="badge-danger px-2 py-0.5 rounded-full">· disattivo</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Overview */}
            <div className="lg:col-span-5 rounded-2xl theme-panel-2 p-3">
              <div className="kicker">Overview</div>
              <div className="mt-1 text-[14px] font-semibold theme-text">Piani (vista admin_planning_overview_v1)</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-6">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cerca plan_id / manager_id / capo_id / operator_id…"
                    className={cn(
                      "w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                      "theme-input",
                      "outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    )}
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                      "theme-input",
                      "outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    )}
                  >
                    <option value="ALL">Periodo: ALL</option>
                    <option value="DAY">DAY</option>
                    <option value="WEEK">WEEK</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-2.5 text-[13px]",
                      "theme-input",
                      "outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    )}
                  >
                    <option value="ALL">Stato: ALL</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="FROZEN">FROZEN</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button type="button" className={btnPrimary()} disabled={busy} onClick={loadOverview}>
                  Applica
                </button>
                <div className="text-[12px] theme-text-muted">
                  Righe: <span className="theme-text font-semibold">{loadingRows ? "…" : filteredRows.length}</span>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel)] overflow-hidden">
                <div className="px-3 py-2 border-b theme-border bg-[var(--panel2)] text-[11px] theme-text-muted">
                  Piani raggruppati ({loadingRows ? "…" : groupedByPlan.length})
                </div>

                <div className="max-h-[62vh] overflow-auto">
                  {loadingRows ? (
                    <div className="px-3 py-5 text-[13px] theme-text-muted">Caricamento…</div>
                  ) : groupedByPlan.length === 0 ? (
                    <div className="px-3 py-5 text-[13px] theme-text-muted">Nessun piano.</div>
                  ) : (
                    groupedByPlan.map(([planId, items]) => {
                      const head = items?.[0] || {};
                      const status = safeText(head.status) || "—";
                      const ptype = safeText(head.period_type) || "—";

                      const label =
                        ptype === "DAY"
                          ? `DAY · ${safeText(head.plan_date) || "—"}`
                          : `WEEK · ${safeText(head.year_iso) || "—"}-W${safeText(head.week_iso) || "—"}`;

                      const slotsCount = new Set(items.map((x) => safeText(x.slot_id)).filter(Boolean)).size;
                      const membersCount = items.filter((x) => safeText(x.operator_id)).length;

                      return (
                        <div key={planId} className="px-3 py-3 border-b theme-border last:border-b-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="kicker">Plan</div>
                              <div className="mt-1 text-[13px] font-semibold theme-text truncate">{label}</div>
                              <div className="mt-1 text-[12px] theme-text-muted truncate">
                                plan_id: <span className="theme-text">{planId}</span>
                              </div>
                              {head.manager_id ? (
                                <div className="mt-1 text-[12px] theme-text-muted truncate">
                                  manager_id: <span className="theme-text">{safeText(head.manager_id)}</span>
                                </div>
                              ) : null}
                            </div>

                            <div className="shrink-0 text-right">
                              <div className={badgeStatus(status)}>{status.toUpperCase()}</div>
                              <div className="mt-2 text-[12px] theme-text-muted">
                                Slots: <span className="theme-text font-semibold">{slotsCount}</span>
                              </div>
                              <div className="mt-1 text-[12px] theme-text-muted">
                                Membri: <span className="theme-text font-semibold">{membersCount}</span>
                              </div>
                            </div>
                          </div>

                          {/* compact preview rows */}
                          <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel)] overflow-hidden">
                            <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b theme-border bg-[var(--panel2)] text-[11px] theme-text-muted">
                              <div className="col-span-4 theme-text">Capo</div>
                              <div className="col-span-4 theme-text">Operatore</div>
                              <div className="col-span-2 theme-text">Pos</div>
                              <div className="col-span-2 theme-text">Slot</div>
                            </div>

                            <div className="max-h-[220px] overflow-auto">
                              {items.slice(0, 18).map((r, i) => (
                                <div key={`${planId}-${i}`} className="grid grid-cols-12 gap-2 px-3 py-2 text-[12px] theme-text">
                                  <div className="col-span-4 truncate">{safeText(r.capo_id) || "—"}</div>
                                  <div className="col-span-4 truncate">{safeText(r.operator_id) || "—"}</div>
                                  <div className="col-span-2 tabular-nums">{safeText(r.operator_position) || "—"}</div>
                                  <div className="col-span-2 truncate">{safeText(r.slot_id) ? safeText(r.slot_id).slice(0, 8) : "—"}</div>
                                </div>
                              ))}
                              {items.length > 18 ? (
                                <div className="px-3 py-2 text-[12px] theme-text-muted">… {items.length - 18} righe in più</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-3 text-[12px] theme-text-muted">
                Nota: la vista admin è volutamente “defensiva” (colonne non hardcodate). Se vuoi label leggibili (nomi capo/operatori),
                si aggiunge una view v2 con join su profiles/operators.
              </div>
            </div>

            {/* Audit */}
            <div className="lg:col-span-3 rounded-2xl theme-panel-2 p-3">
              <div className="kicker">Audit</div>
              <div className="mt-1 text-[14px] font-semibold theme-text">Ultime azioni</div>

              <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel)] overflow-hidden">
                <div className="px-3 py-2 border-b theme-border bg-[var(--panel2)] text-[11px] theme-text-muted">
                  Eventi ({loadingAudit ? "…" : auditRows.length})
                </div>
                <div className="max-h-[70vh] overflow-auto">
                  {loadingAudit ? (
                    <div className="px-3 py-5 text-[13px] theme-text-muted">Caricamento…</div>
                  ) : auditRows.length === 0 ? (
                    <div className="px-3 py-5 text-[13px] theme-text-muted">Nessun evento.</div>
                  ) : (
                    auditRows.map((a) => (
                      <div key={a.id} className="px-3 py-2 border-b theme-border last:border-b-0">
                        <div className="text-[12px] theme-text-muted">
                          <span className="theme-text font-semibold">{safeText(a.action) || "—"}</span>{" "}
                          <span className="theme-text-muted">·</span>{" "}
                          <span className="theme-text">{safeText(a.actor_label)}</span>{" "}
                          <span className="theme-text-muted">·</span>{" "}
                          <span className="theme-text-muted">{safeText(a.created_at) ? new Date(a.created_at).toLocaleString() : "—"}</span>
                        </div>
                        <div className="mt-1 text-[11px] theme-text-muted truncate">
                          plan: {safeText(a.plan_id) ? safeText(a.plan_id).slice(0, 10) : "—"} · target:{" "}
                          {safeText(a.target_type) || "—"} {safeText(a.target_id) ? safeText(a.target_id).slice(0, 10) : ""}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button type="button" className={btnGhost()} disabled={busy} onClick={loadAudit}>
                  Ricarica audit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick checks */}
        <div className="mt-4 text-[12px] theme-text-muted">
          Stato profilo:{" "}
          <span className="theme-text font-semibold">
            {me?.app_role ? String(me.app_role).toUpperCase() : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

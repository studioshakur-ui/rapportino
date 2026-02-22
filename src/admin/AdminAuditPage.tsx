// src/admin/AdminAuditPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAdminConsole } from "./AdminConsoleContext";

export default function AdminAuditPage(): JSX.Element {
  const { setConfig, resetConfig, registerSearchItems, clearSearchItems, setRecentItems } = useAdminConsole();
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState<string>("");

  const load = async (): Promise<void> => {
    setLoading(true);
    setErr("");
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
          actor:actor_id (
            id,
            display_name,
            full_name,
            email,
            app_role
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) throw error;

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AdminAuditPage] load error:", e);
      setErr("Impossibile caricare planning_audit (verifica RLS).");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = (q || "").trim().toLowerCase();
    if (!qq) return rows;

    return rows.filter((r) => {
      const actor = r.actor || {};
      const blob = [
        r.id,
        r.plan_id,
        r.actor_id,
        actor.display_name,
        actor.full_name,
        actor.email,
        actor.app_role,
        r.action,
        r.target_type,
        r.target_id,
        JSON.stringify(r.payload || {}),
        r.created_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(qq);
    });
  }, [rows, q]);

  const searchItems = useMemo(() => {
    return filtered.map((r) => {
      const actor = r.actor || {};
      const actorLabel = actor.display_name || actor.full_name || actor.email || r.actor_id || "—";
      return {
        id: String(r.id),
        entity: "Audit planning",
        title: r.action || "—",
        subtitle: `${actorLabel} · ${r.target_type || "—"}`,
        route: "/admin/audit",
        tokens: [
          r.id,
          r.plan_id,
          r.actor_id,
          actor.display_name,
          actor.full_name,
          actor.email,
          actor.app_role,
          r.action,
          r.target_type,
          r.target_id,
          JSON.stringify(r.payload || {}),
        ]
          .filter(Boolean)
          .join(" "),
        updatedAt: r.created_at || null,
      };
    });
  }, [filtered]);

  const recent = useMemo(() => {
    return rows.slice(0, 5).map((r) => {
      const actor = r.actor || {};
      const actorLabel = actor.display_name || actor.full_name || actor.email || r.actor_id || "—";
      return {
        id: String(r.id),
        title: r.action || "—",
        subtitle: actorLabel,
        route: "/admin/audit",
        timeLabel: r.created_at || undefined,
      };
    });
  }, [rows]);

  useEffect(() => {
    setConfig({ title: "Audit planning", searchPlaceholder: "Cerca azioni, attori, plan_id…" });
    return () => resetConfig();
  }, [setConfig, resetConfig]);

  useEffect(() => {
    registerSearchItems("Audit planning", searchItems);
    return () => clearSearchItems("Audit planning");
  }, [registerSearchItems, clearSearchItems, searchItems]);

  useEffect(() => {
    setRecentItems(recent);
    return () => setRecentItems([]);
  }, [setRecentItems, recent]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl theme-panel p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="kicker">ADMIN · AUDIT PLANNING</div>
            <div className="mt-1 text-[14px] font-semibold theme-text">Journal (actions / payload)</div>
            <div className="mt-1 text-[12px] theme-text-muted">
              Table: <span className="theme-text font-semibold">planning_audit</span>
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center rounded-full border theme-border bg-[var(--panel2)] px-4 py-2 text-[12px] font-semibold theme-text hover:bg-[var(--panel)]"
          >
            Ricarica
          </button>
        </div>

        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">Search</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca action, actor, plan_id, payload…"
            className="mt-1 w-full rounded-xl theme-input px-3 py-2 text-[13px] outline-none"
          />
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-[var(--role-danger-border)] bg-[var(--role-danger-soft)] px-3 py-2 text-[13px] text-[var(--role-danger-ink)]">
            {err}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl theme-panel overflow-hidden">
        <div className="px-4 py-3 border-b theme-border bg-[var(--panel2)] flex items-center justify-between">
          <div className="text-[12px] theme-text-muted">
            {loading ? "Caricamento…" : `${filtered.length} eventi`}
          </div>
          <div className="text-[11px] theme-text-muted">limit 250</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-[13px] theme-text-muted">Caricamento…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-6 text-[13px] theme-text-muted">
            Nessun evento audit trovato.
          </div>
        ) : (
          <div className="divide-y theme-border">
            {filtered.map((r) => {
              const actor = r.actor || {};
              const actorLabel =
                actor.display_name || actor.full_name || actor.email || r.actor_id || "—";

              return (
                <div key={r.id} className="px-4 py-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] theme-text-muted">Action</div>
                      <div className="mt-1 text-[13px] theme-text font-semibold">
                        {r.action || "—"}
                      </div>
                      <div className="mt-1 text-[12px] theme-text-muted">
                        Actor: <span className="theme-text">{actorLabel}</span>{" "}
                        {actor.app_role ? (
                          <span className="ml-2 theme-text-muted">({actor.app_role})</span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[12px] theme-text-muted">
                        Plan: <span className="theme-text">{r.plan_id || "—"}</span>
                        {r.target_type ? (
                          <>
                            {" "}· Target: <span className="theme-text">{r.target_type}</span>
                          </>
                        ) : null}
                        {r.target_id ? (
                          <>
                            {" "}· Target ID: <span className="theme-text-muted">{r.target_id}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-[12px] theme-text-muted">
                      {r.created_at ? String(r.created_at) : "—"}
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel2)] p-3">
                    <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">
                      Payload
                    </div>
                    <pre className="mt-2 text-[11px] theme-text whitespace-pre-wrap break-words">
                      {JSON.stringify(r.payload || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// src/admin/AdminAuditPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const load = async () => {
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

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              ADMIN · AUDIT PLANNING
            </div>
            <div className="mt-1 text-[14px] font-semibold text-slate-50">
              Journal (actions / payload)
            </div>
            <div className="mt-1 text-[12px] text-slate-400">
              Table: <span className="text-slate-200 font-semibold">planning_audit</span>
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/50"
          >
            Ricarica
          </button>
        </div>

        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Search</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca action, actor, plan_id, payload…"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none"
          />
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
            {err}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-[12px] text-slate-300">
            {loading ? "Caricamento…" : `${filtered.length} eventi`}
          </div>
          <div className="text-[11px] text-slate-500">limit 250</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-[13px] text-slate-400">Caricamento…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-slate-400">
            Nessun evento audit trovato.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((r) => {
              const actor = r.actor || {};
              const actorLabel =
                actor.display_name || actor.full_name || actor.email || r.actor_id || "—";

              return (
                <div key={r.id} className="px-4 py-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] text-slate-500">Action</div>
                      <div className="mt-1 text-[13px] text-slate-50 font-semibold">
                        {r.action || "—"}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500">
                        Actor: <span className="text-slate-300">{actorLabel}</span>{" "}
                        {actor.app_role ? (
                          <span className="ml-2 text-slate-500">({actor.app_role})</span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500">
                        Plan: <span className="text-slate-300">{r.plan_id || "—"}</span>
                        {r.target_type ? (
                          <>
                            {" "}· Target: <span className="text-slate-300">{r.target_type}</span>
                          </>
                        ) : null}
                        {r.target_id ? (
                          <>
                            {" "}· Target ID: <span className="text-slate-400">{r.target_id}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-[12px] text-slate-500">
                      {r.created_at ? String(r.created_at) : "—"}
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Payload
                    </div>
                    <pre className="mt-2 text-[11px] text-slate-200 whitespace-pre-wrap break-words">
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

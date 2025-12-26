// src/admin/AdminAssignmentsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

function pill() {
  return cn(
    "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold",
    "border-slate-700 bg-slate-950/40 text-slate-200"
  );
}

export default function AdminAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [managers, setManagers] = useState([]);
  const [capi, setCapi] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [q, setQ] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setErr("");
    try {
      // Profiles: app_role is text in your schema snippet; values are MANAGER / CAPO
      const [mgrRes, capoRes, asgRes] = await Promise.all([
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
          .from("manager_capo_assignments")
          .select("capo_id, manager_id, active, created_at, created_by")
          .order("created_at", { ascending: false }),
      ]);

      if (mgrRes.error) throw mgrRes.error;
      if (capoRes.error) throw capoRes.error;
      if (asgRes.error) throw asgRes.error;

      setManagers(Array.isArray(mgrRes.data) ? mgrRes.data : []);
      setCapi(Array.isArray(capoRes.data) ? capoRes.data : []);
      setAssignments(Array.isArray(asgRes.data) ? asgRes.data : []);
    } catch (e) {
      console.error("[AdminAssignmentsPage] load error:", e);
      setErr("Impossibile caricare profili o assignments (verifica RLS).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const capoById = useMemo(() => new Map(capi.map((x) => [x.id, x])), [capi]);
  const managerById = useMemo(() => new Map(managers.map((x) => [x.id, x])), [managers]);

  const merged = useMemo(() => {
    const map = new Map(); // capo_id -> assignment row (or empty)
    for (const c of capi) {
      map.set(c.id, { capo_id: c.id, manager_id: null, active: false });
    }
    for (const a of assignments) {
      if (!a?.capo_id) continue;
      map.set(a.capo_id, {
        capo_id: a.capo_id,
        manager_id: a.manager_id || null,
        active: Boolean(a.active),
      });
    }

    const list = Array.from(map.values()).map((r) => {
      const capo = capoById.get(r.capo_id);
      const mgr = r.manager_id ? managerById.get(r.manager_id) : null;
      return {
        ...r,
        capo_label:
          capo?.display_name || capo?.full_name || capo?.email || r.capo_id,
        manager_label:
          mgr?.display_name || mgr?.full_name || mgr?.email || (r.manager_id || "—"),
      };
    });

    const qq = (q || "").trim().toLowerCase();
    if (!qq) return list;

    return list.filter((x) => {
      const blob = `${x.capo_id} ${x.capo_label} ${x.manager_id || ""} ${x.manager_label} ${x.active}`
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [assignments, capi, capoById, managerById, q]);

  const upsertAssignment = async ({ capo_id, manager_id, active }) => {
    setErr("");
    try {
      const payload = {
        capo_id,
        manager_id: manager_id || null,
        active: Boolean(active),
      };

      // PK is capo_id -> upsert is deterministic
      const { error } = await supabase
        .from("manager_capo_assignments")
        .upsert(payload, { onConflict: "capo_id" });

      if (error) throw error;
      await loadAll();
    } catch (e) {
      console.error("[AdminAssignmentsPage] upsert error:", e);
      setErr("Errore salvando assignment (upsert).");
    }
  };

  const clearAssignment = async (capo_id) => {
    setErr("");
    try {
      const { error } = await supabase
        .from("manager_capo_assignments")
        .delete()
        .eq("capo_id", capo_id);

      if (error) throw error;
      await loadAll();
    } catch (e) {
      console.error("[AdminAssignmentsPage] delete error:", e);
      setErr("Errore rimuovendo assignment (delete).");
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              ADMIN · MANAGER ↔ CAPO
            </div>
            <div className="mt-1 text-[14px] font-semibold text-slate-50">
              Assignments (source des équipes Capo)
            </div>
            <div className="mt-1 text-[12px] text-slate-400">
              Table: <span className="text-slate-200 font-semibold">manager_capo_assignments</span> (PK: capo_id)
            </div>
          </div>

          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/50"
          >
            Ricarica
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-8">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca capo o manager…"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none"
            />
          </div>
          <div className="md:col-span-4 flex items-end gap-2">
            <span className={pill()}>
              Managers: <span className="ml-2 text-slate-50">{managers.length}</span>
            </span>
            <span className={pill()}>
              Capi: <span className="ml-2 text-slate-50">{capi.length}</span>
            </span>
          </div>
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
            {loading ? "Caricamento…" : `${merged.length} capi`}
          </div>
          <div className="text-[11px] text-slate-500">Edita assignment per capo</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-[13px] text-slate-400">Caricamento…</div>
        ) : merged.length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-slate-400">
            Nessun capo trovato.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {merged.map((r) => (
              <div key={r.capo_id} className="px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] text-slate-500">Capo</div>
                    <div className="mt-1 text-[13px] text-slate-50 font-semibold truncate">
                      {r.capo_label}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      ID: <span className="text-slate-400">{r.capo_id}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-slate-500">Manager</div>
                    <select
                      value={r.manager_id || ""}
                      onChange={(e) =>
                        upsertAssignment({
                          capo_id: r.capo_id,
                          manager_id: e.target.value || null,
                          active: r.active,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[13px] text-slate-100 outline-none"
                    >
                      <option value="">— Nessun manager —</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {(m.display_name || m.full_name || m.email || m.id).trim()}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-[11px] text-slate-500 truncate">
                      Attuale: <span className="text-slate-300">{r.manager_label}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        upsertAssignment({
                          capo_id: r.capo_id,
                          manager_id: r.manager_id,
                          active: !r.active,
                        })
                      }
                      className={cn(
                        "rounded-full border px-4 py-2 text-[12px] font-semibold",
                        r.active
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                          : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/50"
                      )}
                      title="Toggle active"
                      disabled={!r.manager_id}
                    >
                      {r.active ? "Active" : "Inactive"}
                    </button>

                    <button
                      type="button"
                      onClick={() => clearAssignment(r.capo_id)}
                      className="rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-[12px] font-semibold text-rose-200 hover:bg-rose-500/15"
                      title="Rimuovi"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {!r.manager_id ? (
                  <div className="mt-3 text-[12px] text-amber-200">
                    Nessun manager assegnato: questo capo non comparirà come “slot” in un plan generato da quel manager.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// src/manager/ManagerUsersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * MANAGER DIRECTORY (READ-ONLY)
 * - AUCUNE création de compte
 * - AUCUNE assignation/modification de rôle
 * - AUCUN reset password
 *
 * Objectif: annuaire opérationnel (si RLS l'autorise).
 * Tout ce qui est IAM (Identity & Access Management) est ADMIN-only.
 */
export default function ManagerUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, email, full_name, display_name, app_role, allowed_cantieri, created_at")
        .order("created_at", { ascending: true });

      if (err) throw err;
      setUsers(data || []);
    } catch (e) {
      console.error("[ManagerUsersPage] loadUsers error:", e);
      setUsers([]);
      setError(
        e?.message ||
          "Accesso negato o errore nel caricamento utenti (RLS/policy)."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const query = (q || "").trim().toLowerCase();

    return (users || []).filter((u) => {
      const name = (u.display_name || u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.app_role || "").toUpperCase();

      const cantieri = Array.isArray(u.allowed_cantieri) ? u.allowed_cantieri : [];
      const cantieriStr = cantieri.join(" ").toLowerCase();

      const matchQ =
        !query ||
        name.includes(query) ||
        email.includes(query) ||
        cantieriStr.includes(query);

      const matchRole = roleFilter === "ALL" ? true : role === roleFilter;

      return matchQ && matchRole;
    });
  }, [users, q, roleFilter]);

  return (
    <div className="border border-slate-800 rounded-2xl p-4 sm:p-6 bg-slate-950/60">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            Directory (read-only)
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-50">
            Utenti visibili al Manager
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Annuaire operativo. Nessuna gestione account o ruoli qui:
            <span className="text-slate-300"> ADMIN only</span>.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <div className="text-[11px] text-slate-500">
            Totale visibile:{" "}
            <span className="font-semibold text-slate-200">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca: nome, email, cantiere…"
              className="w-56 sm:w-64 rounded-full border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-900 border-slate-700 text-slate-50"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-full border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-900 border-slate-700 text-slate-50"
            >
              <option value="ALL">Tutti i ruoli</option>
              <option value="CAPO">CAPO</option>
              <option value="UFFICIO">UFFICIO</option>
              <option value="MANAGER">MANAGER</option>
              <option value="DIREZIONE">DIREZIONE</option>
            </select>

            <button
              type="button"
              onClick={loadUsers}
              className="text-[11px] px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-900/50"
            >
              Ricarica
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-700 bg-amber-900/20 px-3 py-2 text-[12px] text-amber-200">
          <div className="font-semibold mb-0.5">Accesso limitato</div>
          <div className="text-amber-200/90">
            {error}
            <div className="mt-1 text-[11px] text-amber-200/70">
              Normale se RLS limita la visibilità del Manager al suo perimetro.
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 p-3 sm:p-4 bg-slate-950/40">
        {loading ? (
          <div className="text-xs text-slate-400">Caricamento…</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-slate-400">
            Nessun utente visibile con i filtri attuali (o RLS restringe l’accesso).
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="text-left py-1.5 pr-3">Nome</th>
                  <th className="text-left py-1.5 pr-3">Email</th>
                  <th className="text-left py-1.5 pr-3">Ruolo (read-only)</th>
                  <th className="text-left py-1.5 pr-3">Cantieri visibili</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/80">
                {filtered.map((u) => {
                  const name = u.display_name || u.full_name || "(senza nome)";
                  const roleLabel = (u.app_role || "N/D").toUpperCase();
                  const cantieri = Array.isArray(u.allowed_cantieri) ? u.allowed_cantieri : [];

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/50">
                      <td className="py-1.5 pr-3 text-slate-100">{name}</td>
                      <td className="py-1.5 pr-3 text-slate-300">{u.email}</td>
                      <td className="py-1.5 pr-3">
                        <span className="inline-flex items-center rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-200">
                          {roleLabel}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3">
                        {cantieri.length === 0 ? (
                          <span className="text-slate-500 text-[11px]">
                            Nessun cantiere (o non esposto da RLS)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {cantieri.map((c) => (
                              <span
                                key={c}
                                className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-[11px] text-slate-500">
          Nota: questa pagina è volutamente senza azioni “admin”.
        </div>
      </div>
    </div>
  );
}

// src/manager/ManagerUsersPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function generateTempPassword() {
  // Password temporaire simple (à améliorer si besoin)
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < 14; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

export default function ManagerUsersPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("CAPO");
  const [cantieriRaw, setCantieriRaw] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      // ⚠️ Adapter les colonnes en fonction de ta table "profiles"
      const { data, error: err } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, display_name, app_role, allowed_cantieri"
        )
        .order("created_at", { ascending: true });

      if (err) throw err;
      setUsers(data || []);
    } catch (err) {
      console.error("[ManagerUsersPage] Errore caricando utenti:", err);
      setError("Errore nel caricamento degli utenti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !fullName) {
      setError("Email e nome completo sono obbligatori.");
      return;
    }

    setCreating(true);
    try {
      const tempPassword = generateTempPassword();

      // 1) Creazione utente auth
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password: tempPassword,
        });

      if (signUpError) {
        throw signUpError;
      }

      const user = signUpData?.user;
      if (!user) {
        throw new Error("Nessun utente restituito dalla signUp.");
      }

      // 2) Parsing cantieri
      const cantieriList = cantieriRaw
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      // 3) Inserimento riga profilo
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id, // ⚠️ id = user.id (supabase auth)
        email,
        full_name: fullName,
        display_name: fullName,
        app_role: role, // CAPO / UFFICIO / MANAGER / DIREZIONE
        allowed_cantieri: cantieriList, // jsonb[] en DB conseillé
      });

      if (profileError) {
        throw profileError;
      }

      // 4) Reset form + reload
      setEmail("");
      setFullName("");
      setRole("CAPO");
      setCantieriRaw("");
      await loadUsers();
    } catch (err) {
      console.error("[ManagerUsersPage] Errore creazione utente:", err);
      setError(
        err?.message ||
          "Errore durante la creazione dell'utente. Controlla i log."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border rounded-2xl border-slate-800 bg-slate-950/40 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-100">
            Gestione utenti &amp; cantieri
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Il Manager crea e mantiene gli accessi a CORE.  
            Ogni utente ha un ruolo chiaro e un insieme di cantieri autorizzati.
          </p>
        </div>
        <div className="text-[11px] text-slate-500 text-right">
          <div className="uppercase tracking-[0.18em] text-slate-600">
            Ruoli disponibili
          </div>
          <div>CAPO · UFFICIO · MANAGER · DIREZIONE</div>
        </div>
      </div>

      {/* Bloc création utilisateur */}
      <div className="mb-5 rounded-2xl border border-sky-800/70 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
              Nuovo utente
            </div>
            <div className="text-xs text-slate-400">
              Creazione di un utente CORE con ruolo e cantieri autorizzati.
            </div>
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            La password iniziale viene generata in modo sicuro e inviata via
            email da Supabase.
          </div>
        </div>

        <form
          onSubmit={handleCreateUser}
          className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Email
            </label>
            <input
              type="email"
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="es. capo.6368@azienda.it"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Nome completo
            </label>
            <input
              type="text"
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome e cognome"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Ruolo
            </label>
            <select
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="CAPO">CAPO</option>
              <option value="UFFICIO">UFFICIO</option>
              <option value="MANAGER">MANAGER</option>
              <option value="DIREZIONE">DIREZIONE</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Cantieri autorizzati
            </label>
            <input
              type="text"
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={cantieriRaw}
              onChange={(e) => setCantieriRaw(e.target.value)}
              placeholder="es. 6368, 6358"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-between mt-1">
            {error && (
              <div className="text-[11px] text-rose-400">{error}</div>
            )}
            <button
              type="submit"
              disabled={creating}
              className={[
                "ml-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium border",
                creating
                  ? "border-slate-600 text-slate-400 bg-slate-800 cursor-wait"
                  : "border-sky-500 text-sky-100 bg-sky-600/20 hover:bg-sky-500/30",
              ].join(" ")}
            >
              {creating ? "Creazione in corso…" : "Crea utente"}
            </button>
          </div>
        </form>
      </div>

      {/* Liste des utilisateurs */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Utenti registrati
          </div>
          <div className="text-[11px] text-slate-500">
            Totale:{" "}
            <span className="font-semibold text-slate-200">
              {users.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-slate-400">Caricamento utenti…</div>
        ) : users.length === 0 ? (
          <div className="text-xs text-slate-400">
            Nessun utente presente. Crea il primo utente con il form sopra.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="text-left py-1.5 pr-3">Nome</th>
                  <th className="text-left py-1.5 pr-3">Email</th>
                  <th className="text-left py-1.5 pr-3">Ruolo</th>
                  <th className="text-left py-1.5 pr-3">Cantieri autorizzati</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const name =
                    u.display_name || u.full_name || "(senza nome)";
                  const roleLabel = u.app_role || "N/D";
                  const cantieri = Array.isArray(u.allowed_cantieri)
                    ? u.allowed_cantieri
                    : [];

                  return (
                    <tr
                      key={u.id}
                      className="border-b border-slate-900/80 hover:bg-slate-900/60"
                    >
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
                            Nessun cantiere assegnato
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
      </div>
    </div>
  );
}

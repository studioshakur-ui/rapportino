// src/admin/users/components/InviteUserDialog.tsx

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { AppRole } from "../hooks/useAdminUsersData";
import { cn } from "./ui";

function inferDisplayName(email: string): string {
  const e = (email || "").trim();
  if (!e.includes("@")) return e;
  const local = e.split("@")[0] || "";
  const clean = local.replace(/[._-]+/g, " ").trim();
  if (!clean) return e;
  return clean
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export type InviteUserForm = {
  email: string;
  app_role: AppRole;
  full_name: string;
  display_name: string;
  default_costr: string;
  default_commessa: string;
  allowed_cantieri: string;
};

export default function InviteUserDialog(props: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: InviteUserForm) => Promise<void>;
  busy?: boolean;
  initialEmail?: string;
}) {
  const { open, onClose, onSubmit, busy, initialEmail } = props;

  const [email, setEmail] = useState(initialEmail || "");
  const [role, setRole] = useState<AppRole>("CAPO");
  const [fullName, setFullName] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [defaultCostr, setDefaultCostr] = useState<string>("");
  const [defaultCommessa, setDefaultCommessa] = useState<string>("");
  const [allowedCantieri, setAllowedCantieri] = useState<string>("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    if (!e || !e.includes("@")) return false;
    if (!role) return false;
    return true;
  }, [email, role]);

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail || "");
    setRole("CAPO");
    setFullName("");
    setDisplayName("");
    setShowAdvanced(false);
    setDefaultCostr("");
    setDefaultCommessa("");
    setAllowedCantieri("");
  }, [open, initialEmail]);

  useEffect(() => {
    if (!open) return;
    if (!displayName.trim() && email.trim().includes("@")) {
      setDisplayName(inferDisplayName(email));
    }
  }, [open, email, displayName]);

  const submit = useCallback(async () => {
    if (!canSubmit || busy) return;
    await onSubmit({
      email,
      app_role: role,
      full_name: fullName,
      display_name: displayName,
      default_costr: defaultCostr,
      default_commessa: defaultCommessa,
      allowed_cantieri: allowedCantieri,
    });
  }, [canSubmit, busy, onSubmit, email, role, fullName, displayName, defaultCostr, defaultCommessa, allowedCantieri]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") void submit();
    },
    [onClose, submit]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 theme-scope" role="dialog" aria-modal="true" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 theme-overlay" onClick={onClose} />

      <div className={cn("relative w-full max-w-2xl rounded-2xl", "theme-modal")} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b theme-border flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">CNCS · Admin</div>
            <div className="mt-1 text-[18px] font-semibold text-slate-50">Invita utente</div>
            <div className="mt-1 text-[12px] text-slate-300">Ctrl/⌘ + Enter per inviare</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn("rounded-full border px-3 py-2 text-[12px] font-semibold", "theme-panel-2 theme-border hover:opacity-95")}
          >
            Chiudi
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome.cognome@azienda.it"
                className={cn("mt-2 w-full rounded-xl px-3 py-2 text-[14px]", "theme-input", "focus:outline-none focus:ring-2 focus:ring-sky-500/25")}
                autoFocus
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Ruolo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className={cn("mt-2 w-full rounded-xl px-3 py-2 text-[14px]", "theme-input", "focus:outline-none focus:ring-2 focus:ring-sky-500/25")}
              >
                <option value="CAPO">CAPO</option>
                <option value="UFFICIO">UFFICIO</option>
                <option value="MANAGER">MANAGER</option>
                <option value="DIREZIONE">DIREZIONE</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="md:col-span-6">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome Cognome"
                className={cn("mt-2 w-full rounded-xl px-3 py-2 text-[14px]", "theme-input", "focus:outline-none focus:ring-2 focus:ring-sky-500/25")}
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display label"
                className={cn("mt-2 w-full rounded-xl px-3 py-2 text-[14px]", "theme-input", "focus:outline-none focus:ring-2 focus:ring-sky-500/25")}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={cn("text-[12px] font-semibold underline decoration-dotted underline-offset-4", "text-slate-300 hover:text-slate-100")}
            >
              {showAdvanced ? "Nascondi opzioni avanzate" : "Mostra opzioni avanzate"}
            </button>
          </div>

          {showAdvanced ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Default COSTR</label>
                <input
                  value={defaultCostr}
                  onChange={(e) => setDefaultCostr(e.target.value)}
                  placeholder="es. 6368"
                  className={cn("mt-2 w-full rounded-xl px-3 py-2 text-[14px]", "theme-input")}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Default Commessa</label>
                <input
                  value={defaultCommessa}
                  onChange={(e) => setDefaultCommessa(e.target.value)}
                  placeholder="es. SDC"
                  className={cn("mt-2 w-full rounded-xl px-3 py-2 text-[14px]", "theme-input")}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Allowed cantieri</label>
                <input
                  value={allowedCantieri}
                  onChange={(e) => setAllowedCantieri(e.target.value)}
                  placeholder="CSV (es. MFC,TS,SP...)"
                  className={cn("mt-2 w-full rounded-xl px-3 py-2 text-[14px]", "theme-input")}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className={cn("rounded-xl border px-4 py-2 text-[13px] font-semibold", "theme-panel-2 theme-border hover:opacity-95")}>
              Annulla
            </button>

            <button
              type="button"
              disabled={!canSubmit || Boolean(busy)}
              onClick={() => void submit()}
              className={cn(
                "rounded-xl border px-4 py-2 text-[13px] font-semibold transition-opacity",
                "border-sky-500/40 bg-sky-500/10 text-sky-50 hover:bg-sky-500/15",
                (!canSubmit || Boolean(busy)) && "opacity-60 cursor-not-allowed"
              )}
            >
              {busy ? "Invio..." : "Invita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
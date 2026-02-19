// src/admin/users/components/DangerConfirmDialog.tsx

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { cn } from "./ui";

export type DangerMode = "suspend" | "hard_delete";

export default function DangerConfirmDialog(props: {
  open: boolean;
  mode: DangerMode;
  title: string;
  subtitle?: string;
  confirmLabel: string;
  emailToConfirm?: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const { open, mode, title, subtitle, confirmLabel, emailToConfirm, busy, onClose, onConfirm } = props;
  const [typed, setTyped] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setTyped("");
    setReason("");
  }, [open]);

  const expected = useMemo(() => {
    if (mode === "hard_delete") return "DELETE";
    return (emailToConfirm || "").trim();
  }, [mode, emailToConfirm]);

  const canConfirm = useMemo(() => {
    if (!expected) return false;
    return typed.trim() === expected;
  }, [typed, expected]);

  const confirm = useCallback(async () => {
    if (!canConfirm || busy) return;
    await onConfirm(reason.trim());
  }, [canConfirm, busy, onConfirm, reason]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") void confirm();
    },
    [onClose, confirm]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className={cn(
          "relative w-full max-w-xl rounded-2xl border",
          mode === "hard_delete" ? "border-rose-500/35" : "border-amber-500/35",
          "bg-[#050910] shadow-[0_10px_50px_rgba(0,0,0,0.6)]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("p-5 border-b", mode === "hard_delete" ? "border-rose-500/25" : "border-amber-500/25")}>
          <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">CNCS · Danger zone</div>
          <div className="mt-2 text-[18px] font-semibold text-slate-50">{title}</div>
          {subtitle ? <div className="mt-2 text-[13px] text-slate-300 leading-relaxed">{subtitle}</div> : null}
        </div>

        <div className="p-5">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Conferma scrivendo: <span className="text-slate-200">{expected}</span>
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className={cn(
              "mt-2 w-full rounded-xl border px-3 py-2 text-[14px]",
              "border-slate-800 bg-slate-950/60 text-slate-50",
              "focus:outline-none focus:ring-2",
              mode === "hard_delete" ? "focus:ring-rose-500/35" : "focus:ring-amber-500/35"
            )}
            placeholder={expected}
            autoFocus
          />

          <label className="mt-4 block text-[11px] uppercase tracking-[0.18em] text-slate-500">Motivo (opzionale)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={cn(
              "mt-2 w-full rounded-xl border px-3 py-2 text-[14px]",
              "border-slate-800 bg-slate-950/60 text-slate-50",
              "focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            )}
            placeholder="Es: richiesta HR / errore provisioning / ..."
          />
        </div>

        <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn("rounded-xl border px-4 py-2 text-[12px] font-semibold", "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40")}
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!canConfirm || !!busy}
            className={cn(
              "rounded-xl border px-4 py-2 text-[12px] font-semibold",
              !canConfirm || busy
                ? "border-slate-800 bg-slate-950/40 text-slate-500"
                : mode === "hard_delete"
                  ? "border-rose-500/45 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                  : "border-amber-500/45 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
            )}
          >
            {busy ? "Esecuzione…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

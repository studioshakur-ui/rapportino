// src/admin/users/components/DangerConfirmDialog.tsx

import { useMemo, useState } from "react";
import { cn } from "./ui";

export type DangerMode = "suspend" | "hard_delete";

export default function DangerConfirmDialog(props: {
  open: boolean;
  title: string;
  subtitle?: string;
  mode?: DangerMode;
  confirmLabel?: string;
  cancelLabel?: string;
  emailToConfirm?: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const {
    open,
    title,
    subtitle,
    confirmLabel = "Conferma",
    cancelLabel = "Annulla",
    emailToConfirm,
    busy,
    onClose,
    onConfirm,
  } = props;

  const [reason, setReason] = useState<string>("");
  const emailHint = useMemo(() => (emailToConfirm ? String(emailToConfirm) : ""), [emailToConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 theme-scope" role="dialog" aria-modal="true">
      <div className="absolute inset-0 theme-overlay" onClick={onClose} />

      <div className={cn("relative w-full max-w-lg rounded-2xl", "theme-modal")} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b theme-border">
          <div className="kicker">CNCS · Admin</div>
          <div className="mt-1 text-[18px] font-semibold theme-text">{title}</div>
          {subtitle ? <div className="mt-1 text-[12px] theme-text-muted">{subtitle}</div> : null}
          {emailHint ? <div className="mt-2 text-[11px] theme-text-muted">Target: {emailHint}</div> : null}
        </div>

        <div className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <div className="kicker">Motivo (opzionale)</div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl border theme-border bg-[var(--panel2)] px-3 py-2 text-[13px] theme-text outline-none"
              placeholder="Inserisci un motivo…"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={cn("rounded-xl border px-4 py-2 text-[13px] font-semibold", "theme-panel-2 theme-border hover:opacity-95")}>
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void onConfirm(reason)}
            className={cn(
              "rounded-xl px-4 py-2 text-[13px] font-semibold transition-opacity badge-danger",
              Boolean(busy) && "opacity-60 cursor-not-allowed"
            )}
          >
            {busy ? "..." : confirmLabel}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

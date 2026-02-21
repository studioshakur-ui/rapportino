// src/admin/users/components/DangerConfirmDialog.tsx

import { cn } from "./ui";

export default function DangerConfirmDialog(props: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const { open, title, description, confirmLabel = "Conferma", cancelLabel = "Annulla", busy, onClose, onConfirm } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 theme-scope" role="dialog" aria-modal="true">
      <div className="absolute inset-0 theme-overlay" onClick={onClose} />

      <div className={cn("relative w-full max-w-lg rounded-2xl", "theme-modal")} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b theme-border">
          <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">CNCS · Admin</div>
          <div className="mt-1 text-[18px] font-semibold text-slate-50">{title}</div>
          {description ? <div className="mt-1 text-[12px] text-slate-300">{description}</div> : null}
        </div>

        <div className="p-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={cn("rounded-xl border px-4 py-2 text-[13px] font-semibold", "theme-panel-2 theme-border hover:opacity-95")}>
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void onConfirm()}
            className={cn(
              "rounded-xl border px-4 py-2 text-[13px] font-semibold transition-opacity",
              "border-rose-500/45 bg-rose-500/10 text-rose-50 hover:bg-rose-500/15",
              Boolean(busy) && "opacity-60 cursor-not-allowed"
            )}
          >
            {busy ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
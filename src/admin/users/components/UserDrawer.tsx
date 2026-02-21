// src/admin/users/components/UserDrawer.tsx

import { cn } from "./ui";

export default function UserDrawer(props: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { open, title = "Dettagli utente", onClose, children } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] theme-scope" role="dialog" aria-modal="true">
      <div className="absolute inset-0 theme-overlay" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 w-[min(520px,96vw)]">
        <div className={cn("relative z-[60] h-full border-l", "theme-modal theme-border")} onClick={(e) => e.stopPropagation()}>
          <div className="p-5 border-b theme-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">CNCS · Admin</div>
              <div className="mt-1 text-[16px] font-semibold text-slate-50 truncate">{title}</div>
            </div>
            <button type="button" onClick={onClose} className={cn("rounded-xl border px-3 py-2 text-[12px] font-semibold", "theme-panel-2 theme-border hover:opacity-95")}>
              Chiudi
            </button>
          </div>

          <div className="p-5 h-[calc(100%-74px)] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
// src/admin/users/components/UserActionsMenu.tsx

import { useMemo, useRef, useState } from "react";
import { cn } from "./ui";

export type UserAction = "reset_pwd" | "suspend" | "reactivate" | "hard_delete";

export default function UserActionsMenu(props: {
  disabled?: boolean;
  canSuspend: boolean;
  isSuspended: boolean;
  onAction: (action: UserAction) => void;
}) {
  const { disabled, canSuspend, isSuspended, onAction } = props;
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState<boolean>(false);

  const onClose = () => setOpen(false);

  const style = useMemo(() => {
    const anchorRect = btnRef.current?.getBoundingClientRect();
    if (!anchorRect) return undefined;
    const top = Math.round(anchorRect.bottom + 8);
    const left = Math.round(Math.max(8, anchorRect.right - 260));
    return { position: "fixed" as const, top, left, width: 260 };
  }, [open]);

  const items: Array<{ label: string; action: UserAction; tone?: "neutral" | "danger" }> = [
    { label: "Resetta password", action: "reset_pwd" },
  ];

  if (canSuspend) {
    if (isSuspended) items.push({ label: "Riattiva", action: "reactivate" });
    else items.push({ label: "Sospendi", action: "suspend", tone: "danger" });
  }

  items.push({ label: "Elimina definitivamente", action: "hard_delete", tone: "danger" });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[12px] font-semibold",
          "theme-border bg-[var(--panel2)] theme-text",
          "hover:bg-[var(--panel)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        •••
      </button>

      {open ? (
        <div className="fixed inset-0 z-[9999] theme-scope" role="dialog" aria-modal="true">
          <div className="absolute inset-0 theme-overlay" onClick={onClose} />

          <div className={cn("rounded-2xl overflow-hidden", "theme-popover")} style={style} onClick={(e) => e.stopPropagation()}>
            <div className="p-2 flex flex-col gap-1">
              {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                onAction(it.action);
                onClose();
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl border text-[13px] font-semibold transition-colors",
                "theme-panel-2 theme-border hover:opacity-95",
                it.tone === "danger" && "badge-danger"
              )}
            >
              {it.label}
            </button>
          ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

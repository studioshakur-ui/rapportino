// src/admin/users/components/UserActionsMenu.tsx

import { useMemo } from "react";
import { cn } from "./ui";

export default function UserActionsMenu(props: {
  open: boolean;
  anchorRect?: DOMRect | null;
  onClose: () => void;
  items: Array<{ label: string; onClick: () => void; tone?: "neutral" | "danger" }>;
}) {
  const { open, anchorRect, onClose, items } = props;

  const style = useMemo(() => {
    if (!anchorRect) return undefined;
    const top = Math.round(anchorRect.bottom + 8);
    const left = Math.round(Math.max(8, anchorRect.right - 260));
    return { position: "fixed" as const, top, left, width: 260 };
  }, [anchorRect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] theme-scope" role="dialog" aria-modal="true">
      <div className="absolute inset-0 theme-overlay" onClick={onClose} />

      <div className={cn("rounded-2xl overflow-hidden", "theme-popover")} style={style} onClick={(e) => e.stopPropagation()}>
        <div className="p-2 flex flex-col gap-1">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                it.onClick();
                onClose();
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl border text-[13px] font-semibold transition-colors",
                "theme-panel-2 theme-border hover:opacity-95",
                it.tone === "danger" && "border-rose-500/30 bg-rose-500/8 text-rose-50"
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
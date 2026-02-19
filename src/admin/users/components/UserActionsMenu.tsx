// src/admin/users/components/UserActionsMenu.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "./ui";

export type UserAction = "reset_pwd" | "suspend" | "hard_delete";

export default function UserActionsMenu(props: { disabled?: boolean; onAction: (action: UserAction) => void }) {
  const { disabled, onAction } = props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open, close]);

  const fire = useCallback(
    (a: UserAction) => {
      close();
      onAction(a);
    },
    [close, onAction]
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center rounded-xl border px-2.5 py-1.5 text-[12px] font-semibold",
          disabled
            ? "border-slate-800 bg-slate-950/40 text-slate-600"
            : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
        )}
        title="Azioni"
      >
        ⋯
      </button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 mt-2 w-44 rounded-2xl border border-slate-800",
            "bg-[#050910] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden z-50"
          )}
        >
          <button
            type="button"
            onClick={() => fire("reset_pwd")}
            className={cn("w-full text-left px-3 py-2 text-[12px] font-semibold", "text-slate-100 hover:bg-slate-900/35")}
          >
            Reset password
          </button>

          <div className="h-px bg-slate-800" />

          <button
            type="button"
            onClick={() => fire("suspend")}
            className={cn("w-full text-left px-3 py-2 text-[12px] font-semibold", "text-amber-100 hover:bg-amber-500/10")}
          >
            Suspend
          </button>

          <button
            type="button"
            onClick={() => fire("hard_delete")}
            className={cn("w-full text-left px-3 py-2 text-[12px] font-semibold", "text-rose-100 hover:bg-rose-500/10")}
          >
            Hard delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
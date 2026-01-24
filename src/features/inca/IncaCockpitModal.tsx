import React, { useEffect } from "react";

import IncaCockpit from "./IncaCockpit";

export type IncaCockpitModalProps = {
  open: boolean;
  /**
   * The selected INCA file id to open.
   * REQUIRED: the cockpit must never silently fall back to "latest".
   */
  incaFileId: string | null;
  onClose?: (() => void) | null;
};

/**
 * Fullscreen modal wrapper for INCA Cockpit.
 * - ESC closes
 * - Click on backdrop closes
 * - Locks body scroll
 */
export default function IncaCockpitModal({ open, incaFileId, onClose }: IncaCockpitModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="INCA Cockpit"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="absolute inset-0 p-2 sm:p-3 md:p-4">
        <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/85 shadow-2xl">
          <div className="h-full overflow-auto">
            <IncaCockpit mode="modal" fileId={incaFileId} onRequestClose={onClose ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}

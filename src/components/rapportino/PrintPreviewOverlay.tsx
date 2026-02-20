import { useEffect } from "react";

/**
 * Overlay Preview
 * - Ajoute html/body.print-preview pour isoler le #rapportino-document via index.css
 * - Le document devient fixed + scrollable, au-dessus du layout AppShell
 */
export default function PrintPreviewOverlay({
  open,
  onClose,
  onPrint,
  title = "Preview di stampa",
}: {
  open: boolean;
  onClose?: () => void;
  onPrint?: () => void;
  title?: string;
}): JSX.Element | null {
  useEffect(() => {
    if (!open) return;

    const root = document.documentElement;
    const body = document.body;

    const hadHtml = root.classList.contains("print-preview");
    const hadBody = body.classList.contains("print-preview");

    root.classList.add("print-preview");
    body.classList.add("print-preview");

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (!hadHtml) root.classList.remove("print-preview");
      if (!hadBody) body.classList.remove("print-preview");
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] no-print" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Chiudi preview"
        className="absolute inset-0 w-full h-full bg-black/60 cursor-default"
        onClick={onClose}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[70]">
        <div className="mx-auto max-w-6xl px-3 md:px-6">
          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/90 text-slate-50 shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
                  Preview stampa
                </div>
                <div className="text-[12px] font-semibold truncate">{title}</div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-md border border-slate-500 bg-slate-900 hover:bg-slate-800 text-[12px]"
                >
                  Chiudi
                </button>
                <button
                  type="button"
                  onClick={onPrint}
                  className="px-3 py-1.5 rounded-md border border-sky-500 bg-sky-600 hover:bg-sky-700 text-[12px] font-semibold"
                >
                  Stampa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hint footer */}
      <div className="absolute bottom-0 left-0 right-0 z-[70] pb-3">
        <div className="mx-auto max-w-6xl px-3 md:px-6">
          <div className="text-[11px] text-slate-200/90">
            Suggerimento: su mobile, usa zoom browser per controllare la densità, poi “Stampa”.
          </div>
        </div>
      </div>
    </div>
  );
}

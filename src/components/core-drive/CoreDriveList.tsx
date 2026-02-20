// /src/components/core-drive/CoreDriveList.jsx
import type { ReactNode } from "react";
import { bytes, fmtDateTime, statusTone } from "./coreDriveUi";

function Badge({ children, tone = "neutral" }: { children?: ReactNode; tone?: string }) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium";
  const map: Record<string, string> = {
    neutral: "border-slate-800 bg-slate-950/60 text-slate-200",
    ok: "border-emerald-700/60 bg-emerald-950/20 text-emerald-200",
    info: "border-sky-700/60 bg-sky-950/20 text-sky-200",
    warn: "border-amber-700/60 bg-amber-950/20 text-amber-200",
  };
  return <span className={base + " " + (map[tone] || map.neutral)}>{children}</span>;
}

type CoreDriveItem = {
  id: string | number;
  filename?: string;
  categoria?: string;
  origine?: string;
  stato_doc?: string;
  created_at?: string;
  commessa?: string;
  size_bytes?: number;
};

export default function CoreDriveList({
  items,
  onOpen,
  onDelete,
  hasMore,
  onLoadMore,
  loadingMore,
}: {
  items?: CoreDriveItem[];
  onOpen?: (file: CoreDriveItem) => void;
  onDelete?: (file: CoreDriveItem) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}) {
  const list = Array.isArray(items) ? items : [];

  if (!list.length) {
    return (
      <div className="mx-auto mt-4 w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
        Nessun documento.
      </div>
    );
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-6xl">
      <div className="space-y-2">
        {list.map((f) => (
          <div
            key={f.id}
            className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 hover:border-slate-600"
            onClick={() => onOpen?.(f)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-medium text-slate-100">{f.filename}</div>

                <div className="hidden sm:flex items-center gap-1">
                  {f.categoria && <Badge>{f.categoria}</Badge>}
                  {f.origine && <Badge tone="info">{f.origine}</Badge>}
                  {f.stato_doc && <Badge tone={statusTone(f.stato_doc)}>{f.stato_doc}</Badge>}
                </div>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{fmtDateTime(f.created_at)}</span>
                {f.commessa && (
                  <>
                    <span className="text-slate-800">•</span>
                    <span className="text-slate-400">Commessa</span>
                    <span className="text-slate-200">{f.commessa}</span>
                  </>
                )}
                {f.size_bytes ? (
                  <>
                    <span className="text-slate-800">•</span>
                    <span>{bytes(f.size_bytes)}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="ml-3 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen?.(f);
                }}
                className="hidden sm:inline-flex h-8 items-center rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:border-slate-600"
              >
                Preview
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(f);
                  }}
                  className="h-8 items-center rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:border-rose-500/60 hover:text-rose-200"
                  title="Cancella"
                >
                  Cancella
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className={
              "h-9 rounded-lg border px-4 text-sm " +
              (loadingMore
                ? "border-slate-800 bg-slate-950/60 text-slate-500 cursor-not-allowed"
                : "border-slate-800 bg-slate-950/60 text-slate-100 hover:border-slate-600")
            }
          >
            {loadingMore ? "Caricamento…" : "Carica altri"}
          </button>
        </div>
      )}
    </div>
  );
}

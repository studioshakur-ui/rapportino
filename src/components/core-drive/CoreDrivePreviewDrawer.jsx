// /src/components/core-drive/CoreDrivePreviewDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getSignedUrl } from "../../services/coreDrive.api";
import { fmtDateTimeLong } from "./coreDriveUi";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[11px] font-medium text-slate-200">
      {children}
    </span>
  );
}

export default function CoreDrivePreviewDrawer({ file, onClose }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(null);

  const isPdf = useMemo(() => {
    const mt = (file?.mime_type || "").toLowerCase();
    return mt.includes("pdf");
  }, [file]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setErr(null);
      setUrl(null);
      try {
        const signed = await getSignedUrl(file);
        if (!alive) return;
        setUrl(signed);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setErr("Errore preview.");
      }
    }

    if (file) load();
    return () => {
      alive = false;
    };
  }, [file]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl border-l border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between border-b border-slate-800 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{file.filename}</div>

            <div className="mt-1 flex flex-wrap gap-1">
              {file.categoria && <Badge>{file.categoria}</Badge>}
              {file.origine && <Badge>{file.origine}</Badge>}
              {file.stato_doc && <Badge>{file.stato_doc}</Badge>}
              {file.commessa && <Badge>Commessa: {file.commessa}</Badge>}
            </div>

            <div className="mt-1 text-xs text-slate-500">{fmtDateTimeLong(file.created_at)}</div>
          </div>

          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex h-8 items-center rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:border-slate-600"
              >
                Apri
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:border-slate-600"
            >
              Chiudi
            </button>
          </div>
        </div>

        <div className="h-[calc(100%-56px)] p-3">
          {!url && !err && (
            <div className="h-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-500">
              Caricamento…
            </div>
          )}

          {err && (
            <div className="h-full rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-200">
              {err}
            </div>
          )}

          {url && (
            <div className="h-full overflow-hidden rounded-xl border border-slate-800 bg-white">
              {/* PDF ou autres: iframe suffit (simple, robuste) */}
              {isPdf ? (
                <iframe src={url} className="h-full w-full" title="CORE Drive Preview" />
              ) : (
                <iframe src={url} className="h-full w-full" title="CORE Drive Preview" />
              )}
            </div>
          )}

          {(file.note || file.rapportino_id || file.inca_file_id || file.inca_cavo_id) && (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              {file.note && (
                <div className="text-sm text-slate-200">
                  <div className="text-xs font-medium text-slate-400">Nota</div>
                  <div className="mt-1">{file.note}</div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                {file.rapportino_id && <Badge>Rapportino</Badge>}
                {file.inca_file_id && <Badge>INCA File</Badge>}
                {file.inca_cavo_id && <Badge>INCA Cavo</Badge>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

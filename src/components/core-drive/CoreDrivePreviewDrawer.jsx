// /src/components/core-drive/docs/CoreDrivePreviewDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getSignedUrl } from "../../services/coreDrive.api";
import Badge from "./ui/Badge";
import { bytes, formatDateTime } from "./docs/coreDriveDocsUi";
import { useCoreDriveEvents } from "../../hooks/useCoreDriveEvents";

export default function CoreDrivePreviewDrawer({ file, onClose }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(null);

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useCoreDriveEvents(file?.id, { limit: 12 });

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

            <div className="mt-2 flex flex-wrap gap-2">
              {file.cantiere ? <Badge>{file.cantiere}</Badge> : null}
              {file.categoria ? <Badge>{file.categoria}</Badge> : null}
              {file.origine ? <Badge tone="info">{file.origine}</Badge> : null}
              {file.is_frozen ? <Badge tone="warn">FROZEN</Badge> : null}
              {file.is_deleted ? <Badge tone="danger">STORICO</Badge> : null}
              {file.stato_doc ? <Badge tone="ok">{file.stato_doc}</Badge> : null}
              {file.commessa ? <Badge tone="neutral">{file.commessa}</Badge> : null}
              {file.size_bytes ? <Badge tone="neutral">{bytes(file.size_bytes)}</Badge> : null}
            </div>

            <div className="mt-1 text-xs text-slate-500">{formatDateTime(file.created_at)}</div>
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
              {isPdf ? (
                <iframe src={url} className="h-full w-full" title="CORE Drive Preview PDF" />
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
                {file.rapportino_id ? <Badge>Rapportino</Badge> : null}
                {file.inca_file_id ? <Badge>INCA File</Badge> : null}
                {file.inca_cavo_id ? <Badge>INCA Cavo</Badge> : null}
              </div>
            </div>
          )}

          {/* Canonical event log (naval-grade) */}
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-400">Eventi (registro)</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">append-only</div>
            </div>

            {eventsLoading ? (
              <div className="mt-2 text-sm text-slate-500">Caricamento eventi…</div>
            ) : eventsError ? (
              <div className="mt-2 text-sm text-rose-200">Errore eventi.</div>
            ) : (events || []).length === 0 ? (
              <div className="mt-2 text-sm text-slate-500">Nessun evento registrato.</div>
            ) : (
              <div className="mt-2 space-y-2">
                {(events || []).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-800/70 bg-slate-950/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-slate-200">
                        <span className="font-semibold">
                          {String(ev.event_type || "").replace(/_/g, " ")}
                        </span>
                        {ev.actor_role ? (
                          <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {ev.actor_role}
                          </span>
                        ) : null}
                      </div>
                      {ev.payload?.reason ? (
                        <div className="mt-0.5 text-xs text-slate-400">Motivo: {ev.payload.reason}</div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-[11px] text-slate-500">{formatDateTime(ev.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

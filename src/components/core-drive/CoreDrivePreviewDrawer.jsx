// /src/components/core-drive/CoreDrivePreviewDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getSignedUrl } from "../../services/coreDrive.api";
import { useCoreDriveEvents } from "../../hooks/useCoreDriveEvents";

import Badge from "./ui/Badge";
import { bytes, formatDateTime } from "./docs/coreDriveDocsUi";

function safeUpper(v) {
  return String(v || "").trim().toUpperCase();
}

function isSpreadsheetMime(mimeType) {
  const mt = String(mimeType || "").toLowerCase();
  return (
    mt.includes("spreadsheet") ||
    mt.includes("excel") ||
    mt.includes("officedocument.spreadsheetml")
  );
}

function extFromName(name) {
  const s = String(name || "");
  const idx = s.lastIndexOf(".");
  if (idx < 0) return "";
  return s.slice(idx + 1).toLowerCase();
}

export default function CoreDrivePreviewDrawer({ file, onClose }) {
  const navigate = useNavigate();

  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(null);

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useCoreDriveEvents(file?.id, { limit: 12 });

  const mimeType = String(file?.mime_type || "");
  const fileName = String(file?.filename || "");
  const ext = useMemo(() => extFromName(fileName), [fileName]);

  const isPdf = useMemo(() => {
    const mt = mimeType.toLowerCase();
    return mt.includes("pdf") || ext === "pdf";
  }, [mimeType, ext]);

  const isImage = useMemo(() => {
    const mt = mimeType.toLowerCase();
    return mt.startsWith("image/");
  }, [mimeType]);

  const isSpreadsheet = useMemo(() => {
    return isSpreadsheetMime(mimeType) || ext === "xlsx" || ext === "xls" || ext === "csv";
  }, [mimeType, ext]);

  const isIncaSource = useMemo(() => {
    // In CORE Drive, INCA source tagging may live in `categoria` (e.g. INCA_SRC)
    // while `origine` may be SYSTEM/USER. Accept both to avoid mis-routing.
    const origine = safeUpper(file?.origine);
    const categoria = safeUpper(file?.categoria);
    return !!file?.inca_file_id || origine === "INCA_SRC" || categoria === "INCA_SRC";
  }, [file]);

  const cockpitBasePath = useMemo(() => {
    // If user is in CAPO space (/app/*) we route to /app/navemaster (read-only cockpit)
    // Otherwise use the UFFICIO cockpit route.
    const p = String(window?.location?.pathname || "");
    return p.startsWith("/app/") ? "/app/navemaster" : "/ufficio/navemaster";
  }, []);

  function openCockpit() {
    if (!file) return;

    const costr = String(file.cantiere || "").trim();
    const commessa = String(file.commessa || "").trim();
    const incaFileId = String(file.inca_file_id || "").trim();

    const params = new URLSearchParams();
    if (costr) params.set("costr", costr);
    if (commessa) params.set("commessa", commessa);
    if (incaFileId) params.set("incaFileId", incaFileId);
    params.set("cockpit", "1");
    params.set("from", "core-drive");
    if (file.id) params.set("fileId", String(file.id));

    navigate(`${cockpitBasePath}?${params.toString()}`);
  }

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

  const canOpenCockpit = isIncaSource;
  const showInlinePreview = !!url && (isPdf || isImage);

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
            {canOpenCockpit ? (
              <button
                type="button"
                onClick={openCockpit}
                className="inline-flex h-8 items-center rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200 hover:bg-emerald-900/20"
                title="Apri NAVEMASTER Cockpit (popup géant)"
              >
                Cockpit
              </button>
            ) : null}

            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:border-slate-600"
                title="Apri/Scarica il file"
              >
                Apri
              </a>
            ) : null}

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

          {url && showInlinePreview && (
            <div className="h-full overflow-hidden rounded-xl border border-slate-800 bg-white">
              {isPdf ? (
                <iframe src={url} className="h-full w-full" title="CORE Drive Preview PDF" />
              ) : isImage ? (
                <img src={url} alt={file.filename} className="h-full w-full object-contain" />
              ) : null}
            </div>
          )}

          {url && !showInlinePreview && (
            <div className="h-full rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Anteprima</div>
              <div className="mt-1 text-sm text-slate-200">
                {isSpreadsheet
                  ? "Les fichiers Excel ne sont pas prévisualisables ici."
                  : "Ce type de fichier n'est pas prévisualisable ici."}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                {canOpenCockpit ? (
                  <button
                    type="button"
                    onClick={openCockpit}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-emerald-200 hover:bg-emerald-900/20"
                  >
                    Ouvrir Cockpit
                  </button>
                ) : null}

                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 px-4 text-[12px] uppercase tracking-[0.14em] text-slate-200 hover:border-slate-600"
                >
                  Télécharger
                </a>

                <div className="text-[12px] text-slate-400">
                  {isSpreadsheet && canOpenCockpit ? "Recommandé: Cockpit (données INCA/NAVEMASTER)." : null}
                </div>
              </div>
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

// src/navemaster/NavemasterImportModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavemasterImporter } from "./useNavemasterImporter";
import { corePills, cardSurface } from "../ui/designSystem";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function NavemasterImportModal({ open, onClose, ship, onImported }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [costr, setCostr] = useState(ship?.costr || "");
  const [commessa, setCommessa] = useState(ship?.commessa || "");
  const [note, setNote] = useState("");

  // FIX: le hook retourne dryRun/commit, pas uploadAndRun
  const { dryRun, commit, loading, phase, error, result, reset } = useNavemasterImporter();

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setCostr(ship?.costr || "");
    setCommessa(ship?.commessa || "");
    setNote("");
    reset();
  }, [open, ship?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = useMemo(() => {
    const code = ship?.code ? ` · ${ship.code}` : "";
    return `Import NAVEMASTER${code}`;
  }, [ship?.code]);

  if (!open) return null;

  const canRun = !!file && !!ship?.id && !loading;

  async function handleDryRun() {
    if (!canRun) return;
    // FIX: signature attendue par le hook => ship_id + file
    await dryRun({ file, ship_id: ship.id, costr, commessa, note });
  }

  async function handleCommit() {
    if (!canRun) return;
    // FIX: signature attendue par le hook => ship_id + file
    await commit({ file, ship_id: ship.id, costr, commessa, note });
    onImported?.();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className={cx("w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#050910] shadow-2xl", cardSurface)}>
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-800">
          <div className="min-w-0">
            <div className={corePills.kicker}>NAVEMASTER · Snapshot import</div>
            <div className="text-lg sm:text-xl font-semibold tracking-tight text-slate-100">{title}</div>
            <div className="text-xs text-slate-400 mt-1">
              Upload XLSX → DRY-RUN (contrôles) → COMMIT (écrit en base). Aucun parsing côté front.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
          >
            Fermer
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">COSTR</div>
              <input
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
                placeholder="ex: 6368"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </label>

            <label className="block">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">Commessa</div>
              <input
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
                placeholder="ex: SDC"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </label>

            <label className="block">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">Fichier XLSX</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900/60 file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-slate-200 hover:file:bg-slate-900"
              />
            </label>
          </div>

          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">Note</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optionnel"
              rows={2}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-200">
              <div className="text-xs uppercase tracking-[0.18em]">Erreur</div>
              <div className="mt-1 text-sm">{error}</div>
            </div>
          ) : null}

          {result?.ok ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-4 text-emerald-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-[0.18em]">Résultat</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 text-[11px] uppercase tracking-[0.18em]">
                  {result.mode}
                </span>
                {result?.meta?.sha256 ? (
                  <span className="text-[11px] text-emerald-200/80">sha256: {String(result.meta.sha256).slice(0, 12)}…</span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Rows importables</div>
                  <div className="text-2xl font-semibold mt-1">{result?.meta?.rows_importable ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Headers</div>
                  <div className="text-2xl font-semibold mt-1">{result?.meta?.headers_found ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Warnings</div>
                  <div className="text-sm mt-2">{(result.warnings || []).length ? result.warnings.join(" · ") : "—"}</div>
                </div>
              </div>

              {result.mode === "DRY_RUN" && result.sample?.length ? (
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80 mb-2">Sample (25)</div>
                  <pre className="max-h-[220px] overflow-auto rounded-xl border border-emerald-500/20 bg-black/30 p-3 text-[11px] leading-relaxed text-emerald-100/90">
                    {JSON.stringify(result.sample, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="text-xs text-slate-400">
              Phase: <span className="text-slate-200">{phase}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canRun}
                onClick={handleDryRun}
                className={cx(
                  "rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition",
                  canRun
                    ? "border-slate-700 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40"
                    : "border-slate-800 bg-slate-950/20 text-slate-600 cursor-not-allowed"
                )}
              >
                DRY-RUN
              </button>

              <button
                type="button"
                disabled={!canRun || !(result?.ok && result?.mode === "DRY_RUN")}
                onClick={handleCommit}
                className={cx(
                  "rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition",
                  canRun && result?.mode === "DRY_RUN"
                    ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/20"
                    : "border-slate-800 bg-slate-950/20 text-slate-600 cursor-not-allowed"
                )}
              >
                COMMIT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

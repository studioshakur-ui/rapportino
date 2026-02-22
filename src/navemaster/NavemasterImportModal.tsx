// src/navemaster/NavemasterImportModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavemasterImport } from "./hooks/useNavemasterImport";
import type { AppRole, ShipLite } from "./contracts/navemaster.types";
import { cardSurface, corePills } from "../ui/designSystem";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export default function NavemasterImportModal(props: {
  open: boolean;
  onClose: () => void;
  ship: ShipLite | null;
  onImported: () => void;
  role: AppRole | null;
}): JSX.Element | null {
  const { open, onClose, ship, onImported, role } = props;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [costr, setCostr] = useState<string>(ship?.costr ?? "");
  const [commessa, setCommessa] = useState<string>(ship?.commessa ?? "");
  const [note, setNote] = useState<string>("");

  const { dryRun, commit, forceReplace, loading, phase, error, result, reset } = useNavemasterImport();

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setCostr(ship?.costr ?? "");
    setCommessa(ship?.commessa ?? "");
    setNote("");
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ship?.id]);

  const title = useMemo(() => {
    const code = ship?.code ? ` · ${ship.code}` : "";
    return `Import NAVEMASTER${code}`;
  }, [ship?.code]);

  if (!open) return null;

  const isAdmin = role === "ADMIN";
  const canRun = role === "UFFICIO" || role === "ADMIN";

  const bucket = "core"; // keep consistent with project (adjust if your storage bucket differs)

  async function run(mode: "DRY" | "COMMIT" | "FORCE") {
    if (!ship?.id) return;
    if (!file) return;

    const args = { shipId: ship.id, costr: costr.trim(), commessa: commessa.trim(), note, bucket, file };

    if (mode === "DRY") await dryRun(args);
    if (mode === "COMMIT") await commit(args);
    if (mode === "FORCE") await forceReplace(args);
  }

  useEffect(() => {
    if (phase === "DONE" && result?.ok) {
      onImported();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className={cx("w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#050910]", cardSurface(true))}>
        <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <div className={corePills.kicker}>NAVEMASTER</div>
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            <div className="text-xs text-slate-500 mt-1">phase: {phase}</div>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/30">
            Chiudi
          </button>
        </div>

        <div className="p-4 space-y-3">
          {!canRun ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-200 text-sm">
              Accesso negato (richiesto UFFICIO o ADMIN)
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">COSTR</div>
              <input
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">COMMESSA</div>
              <input
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">NOTE</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
            />
          </label>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block text-sm text-slate-300 file:mr-3 file:rounded-xl file:border file:border-slate-800 file:bg-slate-950/40 file:px-3 file:py-2 file:text-sm file:text-slate-200"
            />
            {file ? <div className="text-xs text-slate-500">{file.name}</div> : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-200 text-sm">{error}</div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              disabled={!canRun || !file || loading}
              onClick={() => run("DRY")}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/30 disabled:opacity-50"
            >
              DRY RUN
            </button>

            <button
              disabled={!canRun || !file || loading}
              onClick={() => run("COMMIT")}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/30 disabled:opacity-50"
            >
              COMMIT
            </button>

            <button
              disabled={!isAdmin || !file || loading}
              onClick={() => run("FORCE")}
              className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950/30 disabled:opacity-50"
              title="ADMIN only"
            >
              FORCE REPLACE
            </button>
          </div>

          {result?.ok ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-200 text-sm">
              OK · import completato
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

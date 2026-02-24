
import { useEffect, useMemo, useState } from "react";
import { uploadCoreFile } from "../../services/coreDrive.api";
import { bytes } from "./docs/coreDriveDocsUi";

export default function CoreDriveUpload({
  defaultCantiere = "",
  defaultOrigine = "UFFICIO",
  onUploaded,
}: {
  defaultCantiere?: string;
  defaultOrigine?: string;
  onUploaded?: () => void;
}) {
  const [open, setOpen] = useState<boolean>(false);

  const [file, setFile] = useState<File | null>(null);
  const [cantiere, setCantiere] = useState<string>(defaultCantiere || "");
  const [categoria, setCategoria] = useState<string>("ALTRO");
  const [commessa, setCommessa] = useState<string>("");
  const [stato_doc, setStatoDoc] = useState<string>("BOZZA");
  const [note, setNote] = useState<string>("");

  const [uploading, setUploading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => Boolean(file && cantiere && categoria && !uploading), [
    file,
    cantiere,
    categoria,
    uploading,
  ]);

  const reset = () => {
    setFile(null);
    setCategoria("ALTRO");
    setCommessa("");
    setStatoDoc("BOZZA");
    setNote("");
    setErr(null);
  };

  // When the lens changes (ex: CAPO changes ship), keep cantiere coherent.
  useEffect(() => {
    // Do not override user input for Ufficio/Staff unless we have a strict default.
    if (!open) return;
    if (defaultCantiere) setCantiere(defaultCantiere);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCantiere, open]);

  async function doUpload() {
    if (!canSubmit) return;
    if (!file) return;

    setUploading(true);
    setErr(null);

    try {
      await uploadCoreFile({
        file,
        meta: {
          cantiere,
          categoria,
          commessa: commessa || null,
          origine: defaultOrigine,
          stato_doc,
          note: note || null,
        },
      });

      reset();
      setOpen(false);
      onUploaded?.();
    } catch (e) {
      console.error(e);
      setErr("Errore upload. Riprova.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm font-medium text-slate-100 hover:border-slate-600"
      >
        Carica
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
          <div className="mx-auto mt-10 w-[92vw] max-w-xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="text-sm font-semibold text-slate-100">Upload documento</div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setErr(null);
                }}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-600"
              >
                Chiudi
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <input
                  type="file"
                  onChange={(e) => setFile(e.currentTarget.files?.[0] || null)}
                  className="w-full text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:text-slate-100 hover:file:bg-slate-800"
                />
                {file && (
                  <div className="mt-2 text-xs text-slate-400">
                    <span className="text-slate-200">{file.name}</span>
                    <span className="mx-2 text-slate-700">•</span>
                    {bytes(file.size)}
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-300">Cantiere</div>
                  <input
                    value={cantiere}
                    onChange={(e) => setCantiere(e.target.value)}
                    placeholder="es. 1234"
                    className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-slate-500/40"
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-slate-300">Categoria</div>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-slate-500/40"
                  >
                    <option value="ALTRO">ALTRO</option>
                    <option value="RAPPORTINO_PDF">RAPPORTINO_PDF</option>
                    <option value="RAPPORTINO_ATTACHMENT">RAPPORTINO_ATTACHMENT</option>
                    <option value="INCA_SRC">INCA_SRC</option>
                    <option value="INCA_ATTACHMENT">INCA_ATTACHMENT</option>
                  </select>
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-slate-300">Commessa</div>
                  <input
                    value={commessa}
                    onChange={(e) => setCommessa(e.target.value)}
                    placeholder="opzionale"
                    className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-slate-500/40"
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-slate-300">Stato</div>
                  <select
                    value={stato_doc}
                    onChange={(e) => setStatoDoc(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-slate-500/40"
                  >
                    <option value="BOZZA">BOZZA</option>
                    <option value="CONFERMATO">CONFERMATO</option>
                    <option value="ARCHIVIATO">ARCHIVIATO</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 text-xs font-medium text-slate-300">Nota</div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="opzionale"
                  className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-slate-500/40"
                />
              </div>

              {err && (
                <div className="mt-3 rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                  {err}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  className="h-9 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 hover:border-slate-600"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={doUpload}
                  disabled={!canSubmit}
                  className={[
                    "h-9 rounded-lg px-3 text-sm font-medium",
                    canSubmit
                      ? "bg-slate-100 text-slate-900 hover:bg-white"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  {uploading ? "Caricamento…" : "Conferma upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

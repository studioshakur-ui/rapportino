// src/ufficio/UfficioIncaHub.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

import LoadingScreen from "../components/LoadingScreen";
import IncaCockpitModal from "../inca/IncaCockpitModal";
import IncaImportModal from "../inca/IncaImportModal";

export default function UfficioIncaHub() {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState(null);

  const [selectedFileId, setSelectedFileId] = useState("");
  const [cockpitOpen, setCockpitOpen] = useState(false);

  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadFiles() {
      setLoadingFiles(true);
      setError(null);

      try {
        const { data, error: e } = await supabase
          .from("inca_files")
          .select("*")
          .order("uploaded_at", { ascending: false });

        if (e) throw e;
        if (!alive) return;

        const list = data || [];
        setFiles(list);

        if (!selectedFileId && list.length > 0) {
          setSelectedFileId(list[0].id);
        }
      } catch (err) {
        console.error("[UfficioIncaHub] loadFiles error:", err);
        if (!alive) return;
        setError("Impossibile caricare i file INCA.");
        setFiles([]);
      } finally {
        if (alive) setLoadingFiles(false);
      }
    }

    loadFiles();

    return () => {
      alive = false;
    };
  }, [selectedFileId]);

  const selectedFile = useMemo(() => {
    return (files || []).find((f) => f.id === selectedFileId) || null;
  }, [files, selectedFileId]);

  const headerCostr = (selectedFile?.costr || "").trim();
  const headerCommessa = (selectedFile?.commessa || "").trim();

  if (loadingFiles) {
    return <LoadingScreen message="Caricamento modulo INCA…" />;
  }

  return (
    <div className="p-4">
      {/* TOP: header compact */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Tracciamento INCA
          </div>
          <div className="text-2xl font-semibold text-slate-50">
            INCA · avanzamento cavi
          </div>
          <div className="text-[12px] text-slate-400 mt-1">
            Import · file · cockpit.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-[13px] font-semibold text-slate-200 hover:bg-slate-900/60"
            title="Importa un file INCA (XLSX/PDF)"
          >
            Importa INCA
          </button>

          <button
            type="button"
            onClick={() => setCockpitOpen(true)}
            disabled={!selectedFileId}
            className={[
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition",
              selectedFileId
                ? "border-sky-500/70 bg-sky-500/15 text-sky-100 hover:bg-sky-500/20"
                : "border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed",
            ].join(" ")}
            title={selectedFileId ? "Apri cockpit INCA" : "Seleziona un file INCA"}
          >
            <span className="text-lg leading-none">+</span>
            Apri cockpit
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-[12px] text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* IMPORT CARD */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Import INCA
              </div>
              <div className="text-[13px] text-slate-200 font-semibold">
                XLSX (PDF in fase successiva)
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/60"
              onClick={() => setImportOpen(true)}
            >
              Importa file INCA
            </button>
          </div>

          <div className="mt-3 text-[12px] text-slate-500">
            Regola: il cockpit lavora su file INCA già importati.
          </div>
        </div>

        {/* RIGHT: Projects / active ships */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Cantieri / Navi
              </div>
              <div className="text-[13px] text-slate-200 font-semibold">
                Vista sintetica
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              {files.length} file
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-3">
            {files.length === 0 ? (
              <div className="text-[12px] text-slate-500">
                Nessun progetto attivo. Importa un file INCA.
              </div>
            ) : (
              <div className="text-[12px] text-slate-400">
                Seleziona un file e apri il cockpit.{" "}
                {selectedFile ? (
                  <span className="text-slate-500">
                    (Selezionato: {headerCostr || "—"} · {headerCommessa || "—"})
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILES TABLE */}
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              File INCA caricati
            </div>
            <div className="text-[12px] text-slate-400">
              Seleziona un file → Apri cockpit.
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/60"
          >
            Aggiorna
          </button>
        </div>

        <div className="max-h-[52vh] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur border-b border-slate-800">
              <tr className="text-left text-[11px] text-slate-500">
                <th className="px-4 py-2">COSTR</th>
                <th className="px-4 py-2">Commessa</th>
                <th className="px-4 py-2">Progetto</th>
                <th className="px-4 py-2">Nome file</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Importato</th>
              </tr>
            </thead>

            <tbody>
              {(files || []).map((f) => {
                const active = f.id === selectedFileId;

                return (
                  <tr
                    key={f.id}
                    className={[
                      "border-b border-slate-900/80 cursor-pointer",
                      active ? "bg-sky-500/10" : "hover:bg-slate-900/40",
                    ].join(" ")}
                    onClick={() => setSelectedFileId(f.id)}
                    title="Seleziona file"
                  >
                    <td className="px-4 py-2 text-[12px] text-slate-100 font-semibold">
                      {f.costr || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-300">
                      {f.commessa || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-400">
                      {f.project_code || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-200">
                      {f.file_name || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-400">
                      {f.file_type || "—"}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-slate-500">
                      {f.uploaded_at ? new Date(f.uploaded_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}

              {files.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[12px] text-slate-500"
                  >
                    Nessun file INCA trovato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedFile && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[12px] text-slate-400">
              Selezionato:{" "}
              <span className="text-slate-100 font-semibold">
                {selectedFile.costr || "—"} · {selectedFile.commessa || "—"}
              </span>{" "}
              <span className="text-slate-500">
                · {selectedFile.file_name || "—"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCockpitOpen(true)}
              className="rounded-xl border border-sky-500/70 bg-sky-500/15 px-3 py-2 text-[12px] text-sky-100 hover:bg-sky-500/20"
            >
              Apri cockpit
            </button>
          </div>
        )}
      </div>

      {/* IMPORT MODAL */}
      <IncaImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultCostr={headerCostr || ""}
        defaultCommessa={headerCommessa || ""}
        onImported={(data) => {
          // si commit renvoie inca_file_id, on le sélectionne direct
          const newId = data?.inca_file_id || null;
          setImportOpen(false);
          if (newId) setSelectedFileId(newId);
          window.location.reload(); // simple & fiable (tu améliorera ensuite)
        }}
      />

      {/* FULLSCREEN COCKPIT MODAL */}
      <IncaCockpitModal
        open={cockpitOpen}
        incaFileId={selectedFileId}
        onClose={() => setCockpitOpen(false)}
      />
    </div>
  );
}

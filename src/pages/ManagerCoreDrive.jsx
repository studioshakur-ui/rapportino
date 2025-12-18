// src/pages/ManagerCoreDrive.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { listCoreFiles } from "../services/coreDrive.api";


function safeText(value) {
  if (value == null) return "";
  return String(value);
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const v = bytes / Math.pow(1024, i);
  return `${v.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("it-IT");
}

export default function ManagerCoreDrive({ isDark = true }) {
  const { profile } = useAuth();

  const borderClass = isDark ? "border-slate-800" : "border-slate-200";
  const bgCard = isDark ? "bg-slate-950/60" : "bg-white";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";
  const textMain = isDark ? "text-slate-50" : "text-slate-900";

  const [ships, setShips] = useState([]);
  const [shipsLoading, setShipsLoading] = useState(true);
  const [shipsError, setShipsError] = useState(null);
  const [selectedShipId, setSelectedShipId] = useState("");

  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");

  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState(null);

  const [previewFile, setPreviewFile] = useState(null);

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || null,
    [ships, selectedShipId]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadShips() {
      setShipsLoading(true);
      setShipsError(null);

      try {
        if (!profile?.id) {
          setShips([]);
          return;
        }

        const { data, error } = await supabase
          .from("ship_managers")
          .select(
            "ship_id, ships:ships(id, code, name, costr, commessa, is_active)"
          )
          .eq("manager_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped = (data || [])
          .map((r) => r.ships)
          .filter(Boolean);

        if (!isMounted) return;
        setShips(mapped);
        const firstActive = mapped.find((s) => s.is_active) || mapped[0];
        setSelectedShipId(firstActive?.id || "");
      } catch (err) {
        if (!isMounted) return;
        console.error("[ManagerCoreDrive] loadShips error:", err);
        setShipsError(err?.message || "Errore nel caricamento cantieri");
      } finally {
        if (!isMounted) return;
        setShipsLoading(false);
      }
    }

    loadShips();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadFiles() {
      setFilesError(null);
      setFilesLoading(true);
      setFiles([]);

      try {
        if (!selectedShip?.code) {
          setFiles([]);
          return;
        }

        const data = await listCoreFiles({
          cantiere: selectedShip.code,
          categoria: categoria || null,
          search: search || null,
        });

        if (!isMounted) return;
        setFiles(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isMounted) return;
        console.error("[ManagerCoreDrive] loadFiles error:", err);
        setFilesError(err?.message || "Errore nel caricamento documenti");
      } finally {
        if (!isMounted) return;
        setFilesLoading(false);
      }
    }

    loadFiles();
    return () => {
      isMounted = false;
    };
  }, [selectedShip?.code, categoria, search]);

  const shipLabel = (s) => {
    const code = safeText(s?.code).trim();
    const name = safeText(s?.name).trim();
    if (code && name) return `${code} · ${name}`;
    return code || name || "Cantiere";
  };

  const showNoPerimeter = !shipsLoading && ships.length === 0 && !shipsError;

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          Documenti (Manager)
        </div>
        <h1 className={`text-xl sm:text-2xl font-semibold ${textMain}`}>
          CORE Drive
        </h1>
        <p className={`text-xs ${textMuted} mt-1 max-w-3xl`}>
          Consultazione in sola lettura dei documenti nel tuo perimetro.
        </p>
      </header>

      <section
        className={[
          "rounded-2xl border p-3 sm:p-4",
          borderClass,
          bgCard,
        ].join(" ")}
      >
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Perimetro
            </div>
            <div className={`text-xs ${textMuted}`}>
              Seleziona un cantiere tra quelli assegnati.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                Cantiere
              </label>
              <select
                value={selectedShipId}
                onChange={(e) => setSelectedShipId(e.target.value)}
                className={[
                  "h-9 rounded-xl border bg-slate-950 px-2.5 text-sm",
                  "border-slate-800 text-slate-100",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/60",
                ].join(" ")}
                disabled={shipsLoading || ships.length === 0}
              >
                {shipsLoading ? (
                  <option value="">Caricamento…</option>
                ) : ships.length === 0 ? (
                  <option value="">Nessun cantiere assegnato</option>
                ) : (
                  ships.map((s) => (
                    <option key={s.id} value={s.id}>
                      {shipLabel(s)}
                      {s.is_active ? "" : " (inattivo)"}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                Ricerca
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome file…"
                className={[
                  "h-9 rounded-xl border bg-slate-950 px-2.5 text-sm",
                  "border-slate-800 text-slate-100 placeholder:text-slate-600",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/60",
                ].join(" ")}
                disabled={shipsLoading || ships.length === 0}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                Categoria
              </label>
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="(opzionale)"
                className={[
                  "h-9 rounded-xl border bg-slate-950 px-2.5 text-sm",
                  "border-slate-800 text-slate-100 placeholder:text-slate-600",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/60",
                ].join(" ")}
                disabled={shipsLoading || ships.length === 0}
              />
            </div>
          </div>
        </div>

        {shipsError ? (
          <div className="mt-4 rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {shipsError}
          </div>
        ) : null}

        {showNoPerimeter ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3">
            <div className="text-sm text-slate-100 font-medium">
              Nessun cantiere assegnato
            </div>
            <div className={`text-xs ${textMuted} mt-1`}>
              Contatta l&apos;ADMIN per l&apos;abilitazione del perimetro.
            </div>
          </div>
        ) : null}
      </section>

      <section
        className={[
          "rounded-2xl border p-3 sm:p-4",
          borderClass,
          bgCard,
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Documenti
            </div>
            <div className={`text-xs ${textMuted} mt-1`}>
              Elenco file nel perimetro selezionato.
            </div>
          </div>
          <div className={`text-[11px] ${textMuted} text-right`}>
            <div className="uppercase tracking-[0.18em] text-slate-600">
              Modalità
            </div>
            <div>Sola lettura</div>
          </div>
        </div>

        {filesError ? (
          <div className="rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {filesError}
          </div>
        ) : null}

        {filesLoading ? (
          <div className={`text-xs ${textMuted}`}>Caricamento…</div>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3">
            <div className="text-sm text-slate-100 font-medium">
              Nessun documento
            </div>
            <div className={`text-xs ${textMuted} mt-1`}>
              Non ci sono file disponibili per il cantiere selezionato.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-1.5 pr-3">File</th>
                  <th className="text-left py-1.5 pr-3">Categoria</th>
                  <th className="text-left py-1.5 pr-3">Origine</th>
                  <th className="text-left py-1.5 pr-3">Dimensione</th>
                  <th className="text-left py-1.5 pr-3">Creato</th>
                  <th className="text-right py-1.5 pl-3">Apri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {files.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-900/40">
                    <td className="py-2 pr-3 text-slate-100">
                      {safeText(f.filename) || "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      {safeText(f.categoria) || "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      {safeText(f.origine) || "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      {formatBytes(f.size_bytes)}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      {formatDateTime(f.created_at)}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <button
                        className="text-xs font-medium text-sky-300 hover:text-sky-200"
                        onClick={() => setPreviewFile(f)}
                      >
                        Apri
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewFile ? (
        <CoreDrivePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      ) : null}
    </div>
  );
}

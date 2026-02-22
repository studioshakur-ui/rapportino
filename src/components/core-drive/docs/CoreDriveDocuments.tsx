// /src/components/core-drive/docs/CoreDriveDocuments.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import { formatDisplayName } from "../../../utils/formatHuman";
import { supabase } from "../../../lib/supabaseClient";

import Badge from "../ui/Badge";
import KpiTile from "../ui/KpiTile";
import Segmented from "../ui/Segmented";

import {
  freezeCoreFile,
  listCoreFiles,
  softDeleteCoreFile,
  type CoreFileCursor,
} from "../../../services/coreDrive.api";

import { bytes, formatDateTime, uniqSorted } from "./coreDriveDocsUi";

import CoreDriveUpload from "../CoreDriveUpload";
import CoreDrivePreviewDrawer from "../CoreDrivePreviewDrawer";

const VIEW_OPTIONS: Array<{ value: "LIST" | "TIMELINE" | "COMPARE"; label: string }> = [
  { value: "LIST", label: "Lista" },
  { value: "TIMELINE", label: "Linea tempo" },
  { value: "COMPARE", label: "Confronto" },
];

type CoreDriveItem = {
  id: string | number;
  filename?: string;
  created_at?: string;
  created_by?: string | null;
  cantiere?: string;
  categoria?: string;
  commessa?: string;
  origine?: string;
  stato_doc?: string;
  mime_type?: string;
  size_bytes?: number;
  note?: string;
  inca_file_id?: string;
  inca_cavo_id?: string;
  rapportino_id?: string;
  is_frozen?: boolean;
  is_deleted?: boolean;
};
type Profile = { app_role?: string; role?: string } | null | undefined;
type CoreDriveResult = { items: CoreDriveItem[]; nextCursor: CoreFileCursor | null; hasMore: boolean };

export default function CoreDriveDocuments() {
  const { profile } = useAuth() as { profile?: Profile };
  const navigate = useNavigate();

  const appRole = profile?.app_role || profile?.role || "";
  const capoLabel = formatDisplayName(profile as any, "CAPO");

  const canDelete = ["UFFICIO", "MANAGER", "DIREZIONE", "ADMIN"].includes(String(appRole).toUpperCase());
  const canFreeze = ["UFFICIO", "DIREZIONE", "ADMIN"].includes(String(appRole).toUpperCase());

  const [view, setView] = useState<"LIST" | "TIMELINE" | "COMPARE">("LIST");

  const [filters, setFilters] = useState({
    cantiere: "",
    categoria: "",
    commessa: "",
    origine: "",
    stato_doc: "",
    mimeGroup: "",
    text: "",
    dateFrom: "",
    dateTo: "",
  });

  const [items, setItems] = useState<CoreDriveItem[]>([]);
  const [capoLabels, setCapoLabels] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<CoreFileCursor | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const [preview, setPreview] = useState<CoreDriveItem | null>(null);

  function canOpenNavemasterCockpit(f: CoreDriveItem | null | undefined): boolean {
    // Canonical rule: if the file is linked to an INCA import OR is tagged as INCA source,
    // we treat it as a cockpit-entry (NAVEMASTER).
    // Note: in your CORE Drive taxonomy, "INCA_SRC" may be stored either in `origine` OR in `categoria`
    // depending on the uploader path (SYSTEM/user). We therefore accept both.
    const origine = String(f?.origine || "").trim().toUpperCase();
    const categoria = String(f?.categoria || "").trim().toUpperCase();
    return !!f?.inca_file_id || origine === "INCA_SRC" || categoria === "INCA_SRC";
  }

  function openNavemasterCockpitFromFile(f: CoreDriveItem | null | undefined): void {
    if (!f) return;

    const roleUp = String(appRole || "").trim().toUpperCase();
    const base = roleUp === "CAPO" ? "/app/navemaster" : "/ufficio/navemaster";

    // CORE Drive meta fields map naturally to ship COSTR/COMMESSA
    const costr = String(f.cantiere || "").trim();
    const commessa = String(f.commessa || "").trim();
    const incaFileId = String(f.inca_file_id || "").trim();

    const params = new URLSearchParams();
    if (costr) params.set("costr", costr);
    if (commessa) params.set("commessa", commessa);
    if (incaFileId) params.set("incaFileId", incaFileId);
    params.set("cockpit", "1");
    params.set("from", "core-drive");
    params.set("fileId", String(f.id || ""));

    navigate(`${base}?${params.toString()}`);
  }

  const facets = useMemo(() => {
    return {
      cantieri: uniqSorted(items.map((x) => x.cantiere)),
      categorie: uniqSorted(items.map((x) => x.categoria)),
      commesse: uniqSorted(items.map((x) => x.commessa)),
      origini: uniqSorted(items.map((x) => x.origine)),
      stati: uniqSorted(items.map((x) => x.stato_doc)),
    };
  }, [items]);

  async function loadFirstPage() {
    setLoading(true);
    setErr(null);
    try {
      const res = (await listCoreFiles({ filters, pageSize: 80, cursor: null })) as CoreDriveResult;
      setItems(res.items);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (e) {
      console.error(e);
      setErr("Errore caricamento documenti.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setErr(null);
    try {
      const res = (await listCoreFiles({ filters, pageSize: 80, cursor })) as CoreDriveResult;
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (e) {
      console.error(e);
      setErr("Errore caricamento documenti.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.cantiere,
    filters.categoria,
    filters.commessa,
    filters.origine,
    filters.stato_doc,
    filters.mimeGroup,
    filters.text,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const kpis = useMemo(() => {
    const total = items.length;

    const totalBytes = items.reduce((sum, x) => sum + (Number(x.size_bytes) || 0), 0);

    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);

    const last7 = items.filter((x) => x.created_at && new Date(x.created_at) >= d7).length;

    const topCategoria = (() => {
      const m = new Map();
      items.forEach((x) => {
        const k = x.categoria || "—";
        m.set(k, (m.get(k) || 0) + 1);
      });
      let best = { k: "—", v: 0 };
      m.forEach((v, k) => {
        if (v > best.v) best = { k, v };
      });
      return best;
    })();

    const topOrigine = (() => {
      const m = new Map();
      items.forEach((x) => {
        const k = x.origine || "—";
        m.set(k, (m.get(k) || 0) + 1);
      });
      let best = { k: "—", v: 0 };
      m.forEach((v, k) => {
        if (v > best.v) best = { k, v };
      });
      return best;
    })();

    const topCapo = (() => {
      const m = new Map<string, number>();
      items.forEach((x) => {
        if (String(x.origine || "").toUpperCase() !== "CAPO") return;
        const id = String(x.created_by || "").trim();
        if (!id) return;
        m.set(id, (m.get(id) || 0) + 1);
      });
      let best = { id: "", v: 0 };
      m.forEach((v, id) => {
        if (v > best.v) best = { id, v };
      });
      return best;
    })();

    const oldest = (() => {
      const sorted = [...items]
        .filter((x) => x.created_at)
        .sort((a, b) => new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime());
      return sorted[0]?.created_at || null;
    })();

    return {
      total,
      totalBytes,
      last7,
      topCategoria,
      topOrigine,
      topCapo,
      oldest,
    };
  }, [items]);

  const timelineData = useMemo(() => {
    const map = new Map();
    items.forEach((x) => {
      if (!x.created_at) return;
      const key = String(x.created_at).slice(0, 10);
      if (!map.has(key)) map.set(key, { date: key, docs: 0, bytes: 0 });
      const e = map.get(key);
      e.docs += 1;
      e.bytes += Number(x.size_bytes) || 0;
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [items]);

  const compare = useMemo(() => {
    const mode = filters.categoria ? "COMMESSA" : "CATEGORIA";
    const keyFn = (x: CoreDriveItem) => {
      if (filters.categoria) return x.commessa || "Senza commessa";
      return x.categoria || "—";
    };

    const m = new Map();
    items.forEach((x) => {
      const k = keyFn(x);
      if (!m.has(k)) m.set(k, { label: k, docs: 0, bytes: 0 });
      const e = m.get(k);
      e.docs += 1;
      e.bytes += Number(x.size_bytes) || 0;
    });

    const arr = Array.from(m.values()).sort((a, b) => b.bytes - a.bytes);
    const maxBytes = arr.reduce((mx, r) => Math.max(mx, r.bytes || 0), 0) || 0;

    return { mode, arr, maxBytes };
  }, [items, filters.categoria]);
  void timelineData;
  void compare;

  useEffect(() => {
    const capoIds = Array.from(
      new Set(
        items
          .filter((x) => String(x.origine || "").toUpperCase() === "CAPO")
          .map((x) => String(x.created_by || "").trim())
          .filter(Boolean)
      )
    );

    if (capoIds.length === 0) {
      setCapoLabels({});
      return;
    }

    let alive = true;

    (async () => {
      const { data: profs, error: rpcErr } = await supabase.rpc("core_profiles_public_by_ids", {
        p_ids: capoIds,
      });

      if (!alive) return;
      if (rpcErr) {
        console.warn("[CORE DRIVE] profiles_public failed:", rpcErr);
        setCapoLabels({});
        return;
      }

      const out: Record<string, string> = {};
      (profs || []).forEach((p: any) => {
        const label = String(p?.display_name || p?.full_name || p?.email || p?.id || "—").trim();
        if (p?.id) out[String(p.id)] = label;
      });
      setCapoLabels(out);
    })();

    return () => {
      alive = false;
    };
  }, [items]);

  async function handleDelete(f: CoreDriveItem) {
    if (!canDelete) return;
    const reason = window.prompt("Motivo cancellazione (soft delete):", "");
    if (reason === null) return;
    try {
      await (softDeleteCoreFile as unknown as (arg: { id: string; reason?: string | null }) => Promise<unknown>)({
        id: String(f.id),
        reason: (reason || "").trim() || null,
      });
      await loadFirstPage();
      if (preview?.id === f.id) setPreview(null);
    } catch (e) {
      console.error(e);
      alert("Errore cancellazione.");
    }
  }

  async function handleFreeze(f: CoreDriveItem) {
    if (!canFreeze) return;
    if (f.is_frozen) return;
    const reason = window.prompt("Motivo congelamento (inviolabile):", "");
    if (reason === null) return;
    try {
      await (freezeCoreFile as unknown as (arg: { id: string; reason?: string | null }) => Promise<unknown>)({
        id: String(f.id),
        reason: (reason || "").trim() || null,
      });
      await loadFirstPage();
    } catch (e) {
      console.error(e);
      alert("Errore congelamento.");
    }
  }

  return (
    <div className="p-3 space-y-3">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">CORE Drive</div>
            <div className="text-xl font-semibold text-slate-100">Documenti</div>
            <div className="mt-1 text-sm text-slate-400">
              Governance: append-only eventi · freeze inviolabile · audit.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Segmented value={view} options={VIEW_OPTIONS} onChange={(v) => setView(v)} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <KpiTile label="Documenti" value={kpis.total} />
          <KpiTile label="Peso totale" value={bytes(kpis.totalBytes)} />
          <KpiTile label="Ultimi 7 giorni" value={kpis.last7} />
        <KpiTile
          label="Origine top"
          value={
            String(appRole).toUpperCase() === "CAPO" && String(kpis.topOrigine.k || "").toUpperCase() === "CAPO"
              ? `${capoLabel} (${kpis.topOrigine.v})`
              : `${kpis.topOrigine.k} (${kpis.topOrigine.v})`
          }
        />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="text-sm font-semibold text-slate-100">Filtri</div>
          <div className="text-xs text-slate-500">Dataset: {items.length} / pagina</div>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-3">
            <label className="text-[12px] text-slate-400">Cantiere</label>
            <select
              value={filters.cantiere}
              onChange={(e) => setFilters((p) => ({ ...p, cantiere: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutti</option>
              {facets.cantieri.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="text-[12px] text-slate-400">Categoria</label>
            <select
              value={filters.categoria}
              onChange={(e) => setFilters((p) => ({ ...p, categoria: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutte</option>
              {facets.categorie.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="text-[12px] text-slate-400">Commessa</label>
            <select
              value={filters.commessa}
              onChange={(e) => setFilters((p) => ({ ...p, commessa: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutte</option>
              {facets.commesse.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="text-[12px] text-slate-400">Origine</label>
            <select
              value={filters.origine}
              onChange={(e) => setFilters((p) => ({ ...p, origine: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutte</option>
              {facets.origini.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="text-[12px] text-slate-400">Stato doc</label>
            <select
              value={filters.stato_doc}
              onChange={(e) => setFilters((p) => ({ ...p, stato_doc: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutti</option>
              {facets.stati.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="text-[12px] text-slate-400">Tipo file</label>
            <select
              value={filters.mimeGroup}
              onChange={(e) => setFilters((p) => ({ ...p, mimeGroup: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutti</option>
              <option value="PDF">PDF</option>
              <option value="IMG">Immagini</option>
              <option value="XLSX">Excel</option>
              <option value="DOC">Office</option>
              <option value="OTHER">Altro</option>
            </select>
          </div>

          <div className="lg:col-span-6">
            <label className="text-[12px] text-slate-400">Testo</label>
            <input
              value={filters.text}
              onChange={(e) => setFilters((p) => ({ ...p, text: e.target.value }))}
              placeholder="Cerca: filename, note, commessa…"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="text-[12px] text-slate-400">Da</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="text-[12px] text-slate-400">A</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="lg:col-span-12 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {filters.dateFrom || filters.dateTo ? (
                <>
                  Intervallo:{" "}
                  <span className="text-slate-200">
                    {filters.dateFrom || "—"} → {filters.dateTo || "—"}
                  </span>
                </>
              ) : (
                <>Intervallo: —</>
              )}
            </div>

            <button
              type="button"
              className="h-9 rounded-xl border border-slate-800 bg-slate-950/60 px-4 text-sm text-slate-200 hover:border-slate-600"
              onClick={() =>
                setFilters({
                  cantiere: "",
                  categoria: "",
                  commessa: "",
                  origine: "",
                  stato_doc: "",
                  mimeGroup: "",
                  text: "",
                  dateFrom: "",
                  dateTo: "",
                })
              }
            >
              Resetta
            </button>
          </div>
        </div>
      </section>

      <CoreDriveUpload onUploaded={() => loadFirstPage()} />

      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="text-sm font-semibold text-slate-100">Risultati</div>
          <div className="text-xs text-slate-500">{loading ? "Caricamento…" : `${items.length} doc`}</div>
        </div>

        {err ? (
          <div className="p-4 text-sm text-rose-200">{err}</div>
        ) : loading ? (
          <div className="p-4 text-sm text-slate-500">Caricamento documenti…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">Nessun documento per i filtri attuali.</div>
        ) : view === "LIST" ? (
          <div className="divide-y divide-slate-800/60">
            {items.map((f) => (
              <div
                key={f.id}
                className="group flex items-center justify-between px-4 py-3 hover:bg-slate-900/40 cursor-pointer"
                onClick={() => {
                  if (canOpenNavemasterCockpit(f)) {
                    openNavemasterCockpitFromFile(f);
                  } else {
                    setPreview(f);
                  }
                }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100">{f.filename}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{formatDateTime(f.created_at)}</span>
                    {f.cantiere ? <Badge>{f.cantiere}</Badge> : null}
                    {f.categoria ? <Badge>{f.categoria}</Badge> : null}
                    {f.commessa ? <Badge tone="info">{f.commessa}</Badge> : null}
                    {f.origine ? <Badge tone="neutral">{f.origine}</Badge> : null}
                    {f.is_frozen ? <Badge tone="warn">CONGELATO</Badge> : null}
                    {f.is_deleted ? <Badge tone="danger">STORICO</Badge> : null}
                    {f.stato_doc ? <Badge tone="ok">{f.stato_doc}</Badge> : null}
                    {f.size_bytes ? <span>{bytes(f.size_bytes)}</span> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canFreeze && !f.is_frozen ? (
                    <button
                      type="button"
                      className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:border-amber-500/60 hover:text-amber-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFreeze(f);
                      }}
                    >
                      Congela
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={!!f.is_frozen}
                      className={[
                        "h-8 rounded-lg border bg-slate-950/60 px-3 text-xs",
                        f.is_frozen
                          ? "border-slate-800 text-slate-600 cursor-not-allowed"
                          : "border-slate-800 text-slate-200 hover:border-rose-500/60 hover:text-rose-200",
                      ].join(" ")}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(f);
                      }}
                    >
                      Cancella
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={[
                      "h-8 rounded-lg border bg-slate-950/60 px-3 text-xs",
                      canOpenNavemasterCockpit(f)
                        ? "border-emerald-500/40 text-emerald-200 hover:border-emerald-400/60 hover:text-emerald-100"
                        : "border-slate-800 text-slate-200 hover:border-slate-600",
                    ].join(" ")}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canOpenNavemasterCockpit(f)) {
                        openNavemasterCockpitFromFile(f);
                      } else {
                        setPreview(f);
                      }
                    }}
                  >
                    {canOpenNavemasterCockpit(f) ? "Cockpit" : "Anteprima"}
                  </button>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="p-3 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className={[
                    "h-9 rounded-lg border px-4 text-sm",
                    loadingMore
                      ? "border-slate-800 bg-slate-950/60 text-slate-500 cursor-not-allowed"
                      : "border-slate-800 bg-slate-950/60 text-slate-100 hover:border-slate-600",
                  ].join(" ")}
                >
                  {loadingMore ? "Caricamento…" : "Carica altri"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-400">
            Vista {view} disponibile (dati già pronti). UI in evoluzione.
          </div>
        )}
      </section>

      {preview ? <CoreDrivePreviewDrawer file={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

// /src/components/core-drive/docs/CoreDriveDocuments.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";

import Badge from "../ui/Badge";
import KpiTile from "../ui/KpiTile";
import Segmented from "../ui/Segmented";

import {
  freezeCoreFile,
  listCoreFiles,
  softDeleteCoreFile,
} from "../../../services/coreDrive.api";

import { bytes, formatDate, formatDateTime, uniqSorted } from "./coreDriveDocsUi";

import CoreDriveUpload from "../CoreDriveUpload";
import CoreDrivePreviewDrawer from "../CoreDrivePreviewDrawer";

const VIEW_OPTIONS = [
  { value: "LIST", label: "Lista" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "COMPARE", label: "Confronto" },
];

export default function CoreDriveDocuments() {
  const { profile } = useAuth();

  const appRole = profile?.app_role || profile?.role || "";

  const canDelete = ["UFFICIO", "MANAGER", "DIREZIONE", "ADMIN"].includes(String(appRole).toUpperCase());
  const canFreeze = ["UFFICIO", "DIREZIONE", "ADMIN"].includes(String(appRole).toUpperCase());

  const [view, setView] = useState("LIST");

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

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState(null);

  const [preview, setPreview] = useState(null);

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
      const res = await listCoreFiles({ filters, pageSize: 80, cursor: null });
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
      const res = await listCoreFiles({ filters, pageSize: 80, cursor });
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

    const oldest = (() => {
      const sorted = [...items]
        .filter((x) => x.created_at)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return sorted[0]?.created_at || null;
    })();

    return {
      total,
      totalBytes,
      last7,
      topCategoria,
      topOrigine,
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
    return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [items]);

  const compare = useMemo(() => {
    const mode = filters.categoria ? "COMMESSA" : "CATEGORIA";
    const keyFn = (x) => {
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

  async function handleDelete(f) {
    if (!canDelete) return;
    const reason = window.prompt("Motivo cancellazione (soft delete):", "");
    if (reason === null) return;
    try {
      await softDeleteCoreFile({ id: f.id, reason: (reason || "").trim() || null });
      await loadFirstPage();
      if (preview?.id === f.id) setPreview(null);
    } catch (e) {
      console.error(e);
      alert("Errore cancellazione.");
    }
  }

  async function handleFreeze(f) {
    if (!canFreeze) return;
    if (f.is_frozen) return;
    const reason = window.prompt("Motivo freeze (inviolabile):", "");
    if (reason === null) return;
    try {
      await freezeCoreFile({ id: f.id, reason: (reason || "").trim() || null });
      await loadFirstPage();
    } catch (e) {
      console.error(e);
      alert("Errore freeze.");
    }
  }

  return (
    <div className="space-y-5">
      {/* KPI strip (wow, sans bruit) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiTile label="Documenti" value={kpis.total} hint="Totale in vista" />
        <KpiTile label="Ultimi 7 giorni" value={kpis.last7} hint="Upload recenti" tone="info" />
        <KpiTile label="Dimensione" value={bytes(kpis.totalBytes)} hint="Somma file" />
        <KpiTile
          label="Top categoria"
          value={kpis.topCategoria.k}
          hint={`${kpis.topCategoria.v} doc`}
        />
        <KpiTile
          label="Top origine"
          value={kpis.topOrigine.k}
          hint={`${kpis.topOrigine.v} doc`}
        />
        <KpiTile
          label="Più vecchio"
          value={kpis.oldest ? formatDate(kpis.oldest) : "—"}
          hint="Punto storico"
        />
      </section>

      {/* Search spotlight + filtres (clean) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Documents</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
              <Badge tone="neutral">Ricerca + preview</Badge>
              <Badge tone="neutral">Facette rapide</Badge>
              <Badge tone="neutral">Audit-ready</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Segmented value={view} onChange={setView} options={VIEW_OPTIONS} />
            <CoreDriveUpload
              defaultOrigine={profile?.app_role || profile?.role || "UFFICIO"}
              onUploaded={loadFirstPage}
            />
          </div>
        </div>

        {/* Filters grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Cantiere</div>
            <select
              value={filters.cantiere}
              onChange={(e) => setFilters((p) => ({ ...p, cantiere: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutti</option>
              {facets.cantieri.map((x) => (
                <option key={x || "—"} value={x || ""}>
                  {x || "—"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Categoria</div>
            <select
              value={filters.categoria}
              onChange={(e) => setFilters((p) => ({ ...p, categoria: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutte</option>
              {facets.categorie.map((x) => (
                <option key={x || "—"} value={x || ""}>
                  {x || "—"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Commessa</div>
            <select
              value={filters.commessa}
              onChange={(e) => setFilters((p) => ({ ...p, commessa: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutte</option>
              {facets.commesse.map((x) => (
                <option key={x || "—"} value={x || ""}>
                  {x || "—"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Origine</div>
            <select
              value={filters.origine}
              onChange={(e) => setFilters((p) => ({ ...p, origine: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutte</option>
              {facets.origini.map((x) => (
                <option key={x || "—"} value={x || ""}>
                  {x || "—"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stato</div>
            <select
              value={filters.stato_doc}
              onChange={(e) => setFilters((p) => ({ ...p, stato_doc: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutti</option>
              {facets.stati.map((x) => (
                <option key={x || "—"} value={x || ""}>
                  {x || "—"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Tipo file</div>
            <select
              value={filters.mimeGroup}
              onChange={(e) => setFilters((p) => ({ ...p, mimeGroup: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Tutti</option>
              <option value="PDF">PDF</option>
              <option value="IMG">Immagini</option>
              <option value="XLSX">Excel</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Ricerca</div>
            <input
              value={filters.text}
              onChange={(e) => setFilters((p) => ({ ...p, text: e.target.value }))}
              placeholder="Filename, note, commessa, categoria…"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Da</div>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">A</div>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
      </section>

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
                onClick={() => setPreview(f)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100">{f.filename}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{formatDateTime(f.created_at)}</span>
                    {f.cantiere ? <Badge>{f.cantiere}</Badge> : null}
                    {f.categoria ? <Badge>{f.categoria}</Badge> : null}
                    {f.commessa ? <Badge tone="info">{f.commessa}</Badge> : null}
                    {f.origine ? <Badge tone="neutral">{f.origine}</Badge> : null}
                    {f.is_frozen ? <Badge tone="warn">FROZEN</Badge> : null}
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
                      Freeze
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
                    className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:border-slate-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview(f);
                    }}
                  >
                    Preview
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

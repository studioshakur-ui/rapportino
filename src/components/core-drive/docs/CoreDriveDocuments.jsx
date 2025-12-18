// /src/components/core-drive/docs/CoreDriveDocuments.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";

import Badge from "../ui/Badge";
import KpiTile from "../ui/KpiTile";
import Segmented from "../ui/Segmented";

import { deleteCoreFile, listCoreFiles } from "../../../services/coreDrive.api";

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

  const canDelete =
    profile?.app_role === "DIREZIONE" ||
    profile?.app_role === "ADMIN" ||
    profile?.role === "DIREZIONE" ||
    profile?.role === "ADMIN";

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
    const ok = window.confirm("Confermi cancellazione documento?");
    if (!ok) return;

    try {
      await deleteCoreFile({ id: f.id, storage_path: f.storage_path });
      await loadFirstPage();
      if (preview?.id === f.id) setPreview(null);
    } catch (e) {
      console.error(e);
      alert("Errore cancellazione.");
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

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-2">
          <input
            value={filters.text}
            onChange={(e) => setFilters((p) => ({ ...p, text: e.target.value }))}
            placeholder="Ricerca: nome file, note, commessa, categoria…"
            className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />

          <select
            value={filters.cantiere}
            onChange={(e) => setFilters((p) => ({ ...p, cantiere: e.target.value }))}
            className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Cantiere</option>
            {facets.cantieri.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            value={filters.categoria}
            onChange={(e) => setFilters((p) => ({ ...p, categoria: e.target.value }))}
            className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Categoria</option>
            {facets.categorie.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            value={filters.mimeGroup}
            onChange={(e) => setFilters((p) => ({ ...p, mimeGroup: e.target.value }))}
            className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Tipo</option>
            <option value="PDF">PDF</option>
            <option value="IMG">Immagini</option>
            <option value="XLSX">Excel</option>
          </select>

          <input
            value={filters.commessa}
            onChange={(e) => setFilters((p) => ({ ...p, commessa: e.target.value }))}
            placeholder="Commessa (opz.)"
            className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
          />

          <select
            value={filters.origine}
            onChange={(e) => setFilters((p) => ({ ...p, origine: e.target.value }))}
            className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Origine</option>
            {facets.origini.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            value={filters.stato_doc}
            onChange={(e) => setFilters((p) => ({ ...p, stato_doc: e.target.value }))}
            className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Stato</option>
            {facets.stati.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <div className="lg:col-span-3 flex gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
              title="Dal"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
              title="Al"
            />
          </div>

          <button
            type="button"
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
            className="lg:col-span-12 justify-self-end px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/70 text-[12px] text-slate-300 hover:bg-slate-900"
          >
            Reset filtri
          </button>
        </div>
      </section>

      {err && (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          {err}
        </div>
      )}

      {/* Split cockpit: gauche contenu, droite comparatif (wow) */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] gap-4">
        {/* LEFT */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
            {loading ? (
              <div className="flex h-52 items-center justify-center text-sm text-slate-400">
                Caricamento documenti…
              </div>
            ) : !items.length ? (
              <div className="p-4 text-sm text-slate-400">
                Nessun documento per i filtri attuali.
              </div>
            ) : view === "LIST" ? (
              <div className="divide-y divide-slate-800/60">
                {items.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center justify-between px-4 py-3 hover:bg-slate-900/40 cursor-pointer"
                    onClick={() => setPreview(f)}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-100">
                        {f.filename}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{formatDateTime(f.created_at)}</span>
                        {f.cantiere ? <Badge>{f.cantiere}</Badge> : null}
                        {f.categoria ? <Badge>{f.categoria}</Badge> : null}
                        {f.commessa ? <Badge tone="info">{f.commessa}</Badge> : null}
                        {f.origine ? <Badge tone="neutral">{f.origine}</Badge> : null}
                        {f.stato_doc ? <Badge tone="ok">{f.stato_doc}</Badge> : null}
                        {f.size_bytes ? <span>{bytes(f.size_bytes)}</span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canDelete ? (
                        <button
                          type="button"
                          className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:border-rose-500/60 hover:text-rose-200"
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
            ) : view === "TIMELINE" ? (
              <Timeline timelineData={timelineData} />
            ) : (
              <CompareBars title="Confronto (peso per bytes)" rows={compare.arr} max={compare.maxBytes} />
            )}
          </div>
        </div>

        {/* RIGHT: comparatif + micro-infos (sans blabla) */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Cockpit
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              CORE Drive · Documents
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="neutral">Preview immediata</Badge>
              <Badge tone="neutral">Filtri robusti</Badge>
              <Badge tone="neutral">Operativo</Badge>
            </div>

            <div className="mt-3 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>In vista</span>
                <span className="text-slate-200">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Dimensione</span>
                <span className="text-slate-200">{bytes(kpis.totalBytes)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Confronto rapido
            </div>
            <div className="mt-2">
              <CompareBars
                title={filters.categoria ? "Bytes per commessa" : "Bytes per categoria"}
                rows={compare.arr.slice(0, 8)}
                max={compare.maxBytes}
              />
            </div>
          </div>
        </div>
      </section>

      {preview && <CoreDrivePreviewDrawer file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function Timeline({ timelineData }) {
  const maxDocs = timelineData.reduce((mx, d) => Math.max(mx, d.docs || 0), 0) || 0;

  return (
    <div className="h-72 w-full px-4 py-3 flex flex-col">
      {timelineData.length === 0 ? (
        <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
          Nessun dato timeline.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Timeline upload</span>
            <span>Barre = #doc</span>
          </div>
          <div className="flex-1 flex items-end gap-[3px] overflow-x-auto border-t border-slate-800 pt-2">
            {timelineData.map((d) => {
              const h = maxDocs > 0 ? Math.max(6, (d.docs / maxDocs) * 100) : 0;
              return (
                <div key={d.date} className="group flex flex-col items-center justify-end min-w-[14px]">
                  <div className="relative flex items-end h-40">
                    <div
                      style={{ height: `${h}%` }}
                      className="w-[7px] rounded-t bg-sky-500/80 group-hover:bg-sky-400 transition-colors"
                    />
                    <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 whitespace-nowrap shadow-lg">
                        <div>{formatDate(d.date)}</div>
                        <div className="font-mono">{d.docs} doc</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-[9px] text-slate-500 rotate-[-50deg] origin-top">
                    {formatDate(d.date)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CompareBars({ title, rows, max }) {
  const m = Number(max || 0) || 0;

  return (
    <div className="space-y-2">
      {title ? <div className="text-xs text-slate-300">{title}</div> : null}

      {rows?.length ? (
        rows.map((r) => {
          const width = m > 0 ? Math.max(4, (Number(r.bytes || 0) / m) * 100) : 0;
          return (
            <div key={r.label} className="space-y-0.5">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span className="truncate max-w-[60%]">{r.label}</span>
                <span className="font-mono text-slate-400">{bytes(r.bytes)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  style={{ width: `${width}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-emerald-300"
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex h-20 items-center justify-center text-[11px] text-slate-500">
          Dati insufficienti.
        </div>
      )}
    </div>
  );
}

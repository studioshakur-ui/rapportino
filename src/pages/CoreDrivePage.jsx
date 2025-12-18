// /src/pages/CoreDrivePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

import CoreDriveFilters from "../components/core-drive/CoreDriveFilters";
import CoreDriveUpload from "../components/core-drive/CoreDriveUpload";
import CoreDriveList from "../components/core-drive/CoreDriveList";
import CoreDrivePreviewDrawer from "../components/core-drive/CoreDrivePreviewDrawer";

import { deleteCoreFile, listCoreFiles } from "../services/coreDriveApi";
import { uniqSorted } from "../components/core-drive/coreDriveUi";

export default function CoreDrivePage() {
  const { profile } = useAuth();

  const canDelete =
    profile?.app_role === "DIREZIONE" ||
    profile?.app_role === "ADMIN" ||
    profile?.role === "DIREZIONE" ||
    profile?.role === "ADMIN";

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
      const res = await listCoreFiles({ filters, pageSize: 60, cursor: null });
      setItems(res.items);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (e) {
      console.error(e);
      setErr("Errore di caricamento.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setErr(null);
    try {
      const res = await listCoreFiles({ filters, pageSize: 60, cursor });
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (e) {
      console.error(e);
      setErr("Errore di caricamento.");
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

  async function handleDelete(f) {
    if (!canDelete) return;
    const ok = window.confirm("Confermi cancellazione?");
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
    <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <CoreDriveFilters filters={filters} onChange={setFilters} facets={facets} />
          <CoreDriveUpload
            defaultOrigine={profile?.app_role || profile?.role || "UFFICIO"}
            onUploaded={loadFirstPage}
          />
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-rose-900/60 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
            {err}
          </div>
        )}

        {loading ? (
          <div className="mx-auto mt-4 w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-500">
            Caricamento…
          </div>
        ) : (
          <CoreDriveList
            items={items}
            onOpen={(f) => setPreview(f)}
            onDelete={canDelete ? handleDelete : undefined}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
          />
        )}
      </div>

      {preview && <CoreDrivePreviewDrawer file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

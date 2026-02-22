// src/inca/IncaFileViewer.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import IncaFileDetail from "./IncaFileDetail";
import IncaCaviTable, { type IncaCavoRow as IncaCaviTableRow, type IncaTableViewMode } from "./IncaCaviTable";

type IncaFile = {
  id?: string | number;
  costr?: string;
  commessa?: string;
  project_code?: string;
  file_name?: string;
  file_type?: string;
  uploaded_at?: string;
  note?: string;
};
type IncaCavoMetricRow = IncaCaviTableRow & {
  metri_previsti?: number | string | null;
  metri_posati_teorici?: number | string | null;
};

export default function IncaFileViewer({ file }: { file?: IncaFile | null }) {
  const [cavi, setCavi] = useState<IncaCavoMetricRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<IncaTableViewMode>("standard");

  useEffect(() => {
    let active = true;

    async function loadCavi() {
      if (!file?.id) {
        setCavi([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: dbError } = await supabase
          .from("inca_cavi")
          .select("*")
          .eq("inca_file_id", file.id)
          .order("codice", { ascending: true });

        if (dbError) throw dbError;
        if (!active) return;

        setCavi(Array.isArray(data) ? (data as IncaCavoMetricRow[]) : []);
      } catch (err) {
        console.error("[INCA] Errore caricamento cavi:", err);
        if (active) {
          setError("Impossibile caricare i cavi INCA per questo file.");
          setCavi([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCavi();

    return () => {
      active = false;
    };
  }, [file?.id]);

  const metrics = useMemo(() => {
    const list = Array.isArray(cavi) ? cavi : [];
    let metriTeo = 0;
    let metriPrev = 0;
    let metriPosati = 0;
    let metriTot = 0;
    const byStatoCantiere: Record<string, number> = {};

    for (const c of list) {
      if (c.metri_teo != null) metriTeo += Number(c.metri_teo) || 0;
      if (c.metri_previsti != null) metriPrev += Number(c.metri_previsti) || 0;
      if (c.metri_posati_teorici != null)
        metriPosati += Number(c.metri_posati_teorici) || 0;
      if (c.metri_totali != null) metriTot += Number(c.metri_totali) || 0;

      const stato = (c.stato_cantiere || "").trim() || "SENZA STATO";
      byStatoCantiere[stato] = (byStatoCantiere[stato] || 0) + 1;
    }

    return {
      totalCavi: list.length,
      metriTeo,
      metriPrev,
      metriPosati,
      metriTot,
      byStatoCantiere,
    };
  }, [cavi]);

  if (!file) {
    return (
      <div className="rounded-xl theme-panel px-4 py-4 text-[13px] theme-text-muted">
        <div className="text-[11px] theme-text-muted uppercase tracking-[0.18em] mb-1">INCA</div>
        <div className="text-[15px] font-semibold theme-text mb-1">Nessun file selezionato</div>
        <div className="text-[12px] theme-text-muted">Seleziona un file dalla lista per aprire i cavi.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl theme-panel px-4 py-4">
      <IncaFileDetail file={file} metrics={metrics} />

      {error && (
        <div className="mb-3 rounded-md border border-[var(--role-warning-border)] bg-[var(--role-warning-soft)] px-3 py-2 text-[12px] text-[var(--role-warning-ink)]">
          {error}
        </div>
      )}

      <IncaCaviTable
        rows={cavi}
        loading={loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  );
}

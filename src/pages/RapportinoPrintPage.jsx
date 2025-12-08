// src/pages/RapportinoPrintPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import RapportinoPrintLayout from "../rapportino/RapportinoPrintLayout";

export default function RapportinoPrintPage() {
  const { reportId } = useParams();

  const [report, setReport] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        // 1) rapport (table reports)
        const { data: reportData, error: reportError } = await supabase
          .from("reports")
          .select("*")
          .eq("id", reportId)
          .single();

        if (reportError) throw reportError;

        // 2) lignes (table report_rows)
        const { data: rowsData, error: rowsError } = await supabase
          .from("report_rows")
          .select("*")
          .eq("report_id", reportId)
          .order("order_index", { ascending: true });

        if (rowsError) throw rowsError;

        if (!isMounted) return;

        setReport(reportData);
        setRows(rowsData || []);
        setLoading(false);

        // 3) on lance l'impression une fois que React a peint le layout
        setTimeout(() => {
          try {
            window.print();
          } catch {
            // on ignore
          }
        }, 300);
      } catch (err) {
        console.error("[RapportinoPrintPage] Errore caricamento:", err);
        if (!isMounted) return;
        setLoadError(err);
        setLoading(false);
      }
    }

    if (reportId) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  if (loading) {
    return (
      <div className="rapportino-print-loading">
        Caricamento rapporto…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rapportino-print-error">
        Errore durante il caricamento del rapporto.
        <br />
        <code>{loadError.message}</code>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rapportino-print-error">
        Rapporto non trovato.
      </div>
    );
  }

  return <RapportinoPrintLayout report={report} rows={rows} />;
}

// src/pages/CapoPresentation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import LoadingScreen from "../components/LoadingScreen";
import RapportinoHeader from "../components/rapportino/RapportinoHeader";
import RapportinoTable from "../components/rapportino/RapportinoTable";
import { formatHumanName } from "../utils/formatHuman";

import { getBaseRows, parseNumeric } from "../rapportinoUtils";

const CREW_LABELS = {
  ELETTRICISTA: "Elettricista",
  CARPENTERIA: "Carpenteria",
  MONTAGGIO: "Montaggio",
};

export default function CapoPresentation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rapportino, setRapportino] = useState(null);
  const [rows, setRows] = useState(() => getBaseRows("ELETTRICISTA"));

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // PRESENTAZIONE (solo lettura): prendiamo l'ultimo rapportino aggiornato
        // per mostrare il flusso reale senza bisogno di essere il CAPO proprietario.
        const { data: rap, error: rapError } = await supabase
          .from("rapportini")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rapError && rapError.code !== "PGRST116") throw rapError;
        if (!alive) return;

        if (!rap) {
          setRapportino(null);
          setRows(getBaseRows("ELETTRICISTA"));
          return;
        }

        setRapportino(rap);

        const { data: righe, error: rowsError } = await supabase
          .from("rapportino_rows")
          .select("*")
          .eq("rapportino_id", rap.id)
          .order("row_index", { ascending: true });

        if (rowsError) throw rowsError;
        if (!alive) return;

        if (!righe || righe.length === 0) {
          setRows(getBaseRows(rap.crew_role || "ELETTRICISTA"));
        } else {
          const mapped = righe.map((r, idx) => ({
            id: r.id,
            row_index: r.row_index ?? idx,
            categoria: r.categoria ?? "",
            descrizione: r.descrizione ?? "",
            operatori: r.operatori ?? "",
            tempo: r.tempo ?? "",
            previsto:
              r.previsto !== null && r.previsto !== undefined ? String(r.previsto) : "",
            prodotto:
              r.prodotto !== null && r.prodotto !== undefined ? String(r.prodotto) : "",
            note: r.note ?? "",
          }));
          setRows(mapped);
        }
      } catch (e) {
        console.error("[CapoPresentation] load error:", e);
        setError("Errore nel caricamento della vista CAPO (presentazione). ");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const crewLabel = useMemo(() => {
    const r = rapportino?.crew_role;
    return CREW_LABELS[r] || r || "Elettricista";
  }, [rapportino?.crew_role]);

  const prodottoTotale = useMemo(() => {
    return rows.reduce((sum, r) => {
      const v = parseNumeric(r.prodotto);
      return sum + (v || 0);
    }, 0);
  }, [rows]);

  if (loading) {
    return <LoadingScreen message="Caricamento vista CAPO (presentazione)…" />;
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
            Direzione · Presentazione · Vista CAPO
            <span className="ml-2 inline-flex items-center rounded-full border border-slate-800 bg-slate-950/20 px-2 py-0.5 text-[10px] tracking-[0.18em] text-slate-400">
              SOLO LETTURA
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-slate-100">
            Rapporto giornaliero sul terreno
          </div>
          <div className="text-[12px] sm:text-[13px] text-slate-400 max-w-3xl leading-relaxed">
            Vista di presentazione: mostra un rapportino reale senza modifiche, per capire il flusso e la qualità del dato.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/direction/presentazione"
            className="rounded-full border border-slate-800 bg-slate-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/35"
          >
            ← Torna a Presentazione
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden">
        <div className="p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
                CORE · MODULO RAPPORTINO (PRESENTAZIONE)
              </span>
              <span className="text-sm font-semibold text-slate-100">
  Rapporto giornaliero – esempio reale
</span>

            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="px-3 py-1 rounded-full bg-slate-950/30 border border-slate-800 text-slate-200">
                Prodotto totale: {prodottoTotale.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <div
              id="rapportino-document"
              className="rapportino-document bg-white text-slate-900 border border-slate-200 shadow-[0_18px_45px_rgba(0,0,0,0.25)]"
            >
              <RapportinoHeader
                costr={rapportino?.costr || ""}
                commessa={rapportino?.commessa || ""}
                reportDate={rapportino?.report_date || rapportino?.data || ""}
                capoName={formatHumanName(rapportino?.capo_name || "Capo Squadra")}
                readOnly
              />

              <RapportinoTable rows={rows} readOnly />

              <div className="mt-4 no-print rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                Nota: questa vista è in <span className="font-semibold">sola lettura</span> e non consente modifiche o validazioni.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

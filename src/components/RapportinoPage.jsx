// src/components/RapportinoPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

import LoadingScreen from "./LoadingScreen";
import RapportinoHeader from "./rapportino/RapportinoHeader";
import RapportinoTable from "./rapportino/RapportinoTable";
import RapportinoIncaCaviSection from "./RapportinoIncaCaviSection";

import {
  getTodayISO,
  parseNumeric,
  getBaseRows,
  adjustOperatorTempoHeights,
} from "../rapportinoUtils";

const STATUS_LABELS = {
  DRAFT: "Bozza",
  VALIDATED_CAPO: "Validata dal Capo",
  APPROVED_UFFICIO: "Approvata dall'Ufficio",
  RETURNED: "Rimandata dall'Ufficio",
};

const CREW_LABELS = {
  ELETTRICISTA: "Elettricista",
  CARPENTERIA: "Carpenteria",
  MONTAGGIO: "Montaggio",
};

export default function RapportinoPage() {
  const { shipId } = useParams(); // shipId sert à la navigation UX, PAS à la table rapportini
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [crewRole, setCrewRole] = useState(() => {
    try {
      const stored = window.localStorage.getItem("core-current-role");
      if (
        stored === "ELETTRICISTA" ||
        stored === "CARPENTERIA" ||
        stored === "MONTAGGIO"
      )
        return stored;
    } catch {}
    return "ELETTRICISTA";
  });

  const normalizedCrewRole =
    crewRole === "ELETTRICISTA" ||
    crewRole === "CARPENTERIA" ||
    crewRole === "MONTAGGIO"
      ? crewRole
      : "ELETTRICISTA";

  const crewLabel = CREW_LABELS[normalizedCrewRole] || normalizedCrewRole;

  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("");
  const [rapportinoId, setRapportinoId] = useState(null);
  const [reportDate, setReportDate] = useState(getTodayISO());
  const [status, setStatus] = useState("DRAFT");

  const [rows, setRows] = useState(() => getBaseRows(normalizedCrewRole));

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Inbox RETURNED (rapporto rimandato dall'Ufficio):
  // rende impossibile "mancare" un ritorno anche se la data corrente è diversa.
  const [returnedCount, setReturnedCount] = useState(0);
  const [latestReturned, setLatestReturned] = useState(null);
  const [returnedLoading, setReturnedLoading] = useState(false);

  const capoName = useMemo(() => {
    return (
      (profile?.display_name ||
        profile?.full_name ||
        profile?.email ||
        "Capo Squadra")
        .toUpperCase()
        .trim()
    );
  }, [profile]);

  const statusLabel = STATUS_LABELS[status] || status;

  const formatDateIt = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const prodottoTotale = useMemo(() => {
    return rows.reduce((sum, r) => {
      const v = parseNumeric(r.prodotto);
      return sum + (v || 0);
    }, 0);
  }, [rows]);

  const canEditInca =
    !!rapportinoId && (status === "DRAFT" || status === "RETURNED");

  const loadReturnedInbox = async () => {
    if (!profile?.id) {
      setReturnedCount(0);
      setLatestReturned(null);
      return;
    }

    setReturnedLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from("rapportini")
        .select("id", { count: "exact", head: true })
        .eq("capo_id", profile.id)
        .eq("crew_role", normalizedCrewRole)
        .eq("status", "RETURNED");

      if (countError) throw countError;

      const { data: last, error: lastError } = await supabase
        .from("rapportini")
        .select("id, report_date, costr, commessa, updated_at")
        .eq("capo_id", profile.id)
        .eq("crew_role", normalizedCrewRole)
        .eq("status", "RETURNED")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError && lastError.code !== "PGRST116") throw lastError;

      setReturnedCount(Number(count || 0));
      setLatestReturned(last || null);
    } catch (e) {
      console.warn("[Rapportino] returned inbox load failed:", e);
      setReturnedCount(0);
      setLatestReturned(null);
    } finally {
      setReturnedLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await loadReturnedInbox();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, normalizedCrewRole]);

  useEffect(() => {
    let active = true;

    async function loadRapportino() {
      if (!profile?.id) {
        setInitialLoading(false);
        return;
      }

      try {
        setLoading(true);
        setInitialLoading(true);
        setError(null);
        setErrorDetails(null);
        setShowErrorDetails(false);
        setSuccessMessage(null);

        const { data: rap, error: rapError } = await supabase
          .from("rapportini")
          .select("*")
          .eq("capo_id", profile.id)
          .eq("crew_role", normalizedCrewRole)
          .eq("report_date", reportDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rapError && rapError.code !== "PGRST116") throw rapError;
        if (!active) return;

        if (!rap) {
          setRapportinoId(null);
          setCostr("");
          setCommessa("");
          setStatus("DRAFT");
          setRows(getBaseRows(normalizedCrewRole));
        } else {
          setRapportinoId(rap.id);
          setCostr(rap.costr || "");
          setCommessa(rap.commessa || "");
          setStatus(rap.status || "DRAFT");

          const { data: righe, error: rowsError } = await supabase
            .from("rapportino_rows")
            .select("*")
            .eq("rapportino_id", rap.id)
            .order("row_index", { ascending: true });

          if (rowsError) throw rowsError;
          if (!active) return;

          if (!righe || righe.length === 0) {
            setRows(getBaseRows(normalizedCrewRole));
          } else {
            const mapped = righe.map((r, idx) => ({
              id: r.id,
              row_index: r.row_index ?? idx,
              categoria: r.categoria ?? "",
              descrizione: r.descrizione ?? "",
              operatori: r.operatori ?? "",
              tempo: r.tempo ?? "",
              previsto:
                r.previsto !== null && r.previsto !== undefined
                  ? String(r.previsto)
                  : "",
              prodotto:
                r.prodotto !== null && r.prodotto !== undefined
                  ? String(r.prodotto)
                  : "",
              note: r.note ?? "",
            }));
            setRows(mapped);
          }
        }
      } catch (err) {
        console.error("[Rapportino] load error:", err);
        setError("Errore nel caricamento del rapportino.");
        setErrorDetails(err?.message || String(err));
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    }

    loadRapportino();
    return () => {
      active = false;
    };
  }, [profile?.id, normalizedCrewRole, reportDate]);

  const handleRowChange = (index, field, value, targetForHeight) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };
      row[field] = value;
      copy[index] = row;
      return copy;
    });

    if (targetForHeight) {
      adjustOperatorTempoHeights(targetForHeight);
    }
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const nextIndex = prev.length;
      const baseCategoria =
        normalizedCrewRole === "CARPENTERIA"
          ? "CARPENTERIA"
          : normalizedCrewRole === "MONTAGGIO"
          ? "MONTAGGIO"
          : "STESURA";

      return [
        ...prev,
        {
          id: null,
          row_index: nextIndex,
          categoria: baseCategoria,
          descrizione: "",
          operatori: "",
          tempo: "",
          previsto: "",
          prodotto: "",
          note: "",
        },
      ];
    });
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => {
      if (prev.length === 1) return getBaseRows(normalizedCrewRole);
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.map((r, idx) => ({ ...r, row_index: idx }));
    });
  };

  const handleSave = async (forcedStatus) => {
    if (!profile?.id) return false;

    setSaving(true);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setSuccessMessage(null);

    try {
      const newStatus = forcedStatus || status || "DRAFT";

      const cleanRows = rows.map((r, idx) => ({
        categoria: (r.categoria || "").trim(),
        descrizione: (r.descrizione || "").trim(),
        operatori: (r.operatori || "").trim(),
        tempo: (r.tempo || "").trim(),
        previsto: parseNumeric(r.previsto),
        prodotto: parseNumeric(r.prodotto),
        note: (r.note || "").trim(),
        row_index: idx,
      }));

      let newId = rapportinoId;

      if (!newId) {
        const { data: inserted, error: insertError } = await supabase
          .from("rapportini")
          .insert({
            capo_id: profile.id,
            crew_role: normalizedCrewRole,
            report_date: reportDate,
            data: reportDate,
            costr,
            commessa,
            status: newStatus,
            prodotto_totale: prodottoTotale,
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        newId = inserted.id;
        setRapportinoId(inserted.id);
      } else {
        const { error: updateError } = await supabase
          .from("rapportini")
          .update({
            costr,
            commessa,
            status: newStatus,
            prodotto_totale: prodottoTotale,
            report_date: reportDate,
            data: reportDate,
          })
          .eq("id", newId);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from("rapportino_rows")
          .delete()
          .eq("rapportino_id", newId);

        if (deleteError) throw deleteError;
      }

      if (cleanRows.length > 0) {
        const rowsToInsert = cleanRows.map((r) => ({
          ...r,
          rapportino_id: newId,
        }));
        const { error: insertRowsError } = await supabase
          .from("rapportino_rows")
          .insert(rowsToInsert);
        if (insertRowsError) throw insertRowsError;
      }

      setStatus(newStatus);
      setSuccessMessage("Salvataggio riuscito.");

      await loadReturnedInbox();
      return true;
    } catch (err) {
      console.error("Errore salvataggio rapportino:", err);
      setError("Errore durante il salvataggio del rapportino.");
      setErrorDetails(err?.message || String(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    await handleSave("VALIDATED_CAPO");
  };

  const handlePrint = async () => {
    const ok = await handleSave(status);
    if (!ok) return;

    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn("Print failed:", e);
      }
    }, 120);
  };

  const handleLogout = async () => {
    try {
      await signOut?.();
    } catch (err) {
      console.error("Errore logout capo:", err);
    } finally {
      navigate("/login");
    }
  };

  if (initialLoading || loading) {
    return <LoadingScreen message="Caricamento del rapportino in corso." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-lg border p-5">
          <div className="font-semibold text-red-700">{error}</div>
          {errorDetails && (
            <pre className="mt-3 text-xs bg-slate-50 text-slate-800 p-2 rounded border whitespace-pre-wrap">
              {errorDetails}
            </pre>
          )}
          <button
            className="mt-4 px-3 py-2 rounded bg-slate-900 text-white"
            onClick={() => navigate(-1)}
          >
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900/80">
      {/* TOP BAR — fine, sobre, 1 seule action */}
      <header className="no-print sticky top-0 z-20 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="h-12 max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
              CORE · CAPO · RAPPORTINO
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-full border border-rose-400/40 text-rose-100 bg-rose-600/75 hover:bg-rose-600 transition text-[12px] font-semibold"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 px-2 md:px-4 py-4 md:py-6">
        {/* Banner RETURNED — impossible à manquer */}
        {latestReturned && returnedCount > 0 && (
          <div className="no-print max-w-6xl mx-auto px-2 md:px-0 mb-4">
            <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-slate-900/60 to-slate-900/60 p-3 md:p-3.5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                      Rimandato
                    </span>
                    <span className="text-[11px] text-slate-300">
                      {returnedCount} in attesa
                    </span>
                  </div>

                  <div className="mt-1 text-[12px] md:text-[13px] text-slate-100 font-semibold truncate">
                    {formatDateIt(latestReturned.report_date)} · COSTR{" "}
                    {latestReturned.costr || "—"}
                    {latestReturned.commessa
                      ? ` / ${latestReturned.commessa}`
                      : ""}
                  </div>

                  <div className="mt-0.5 text-[11px] text-slate-300">
                    {rapportinoId === latestReturned.id && status === "RETURNED"
                      ? "Documento aperto: correggi e salva, poi valida."
                      : "Documento rimandato dall'Ufficio: apri e correggi."}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      rapportinoId === latestReturned.id && status === "RETURNED"
                    }
                    onClick={() => {
                      setError(null);
                      setErrorDetails(null);
                      setShowErrorDetails(false);
                      setSuccessMessage(null);
                      if (latestReturned?.report_date)
                        setReportDate(latestReturned.report_date);
                    }}
                    className={
                      "px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-[0.06em] transition-colors " +
                      (rapportinoId === latestReturned.id && status === "RETURNED"
                        ? "border-slate-700 text-slate-400 bg-slate-900/40"
                        : "border-amber-300/40 text-amber-100 bg-amber-500/15 hover:bg-amber-500/25")
                    }
                  >
                    Apri e correggi
                  </button>

                  {returnedLoading && (
                    <span className="text-[11px] text-slate-400">
                      Aggiornamento…
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div
            id="rapportino-document"
            className="rapportino-document bg-white text-slate-900 border border-slate-200 shadow-[0_18px_45px_rgba(0,0,0,0.25)]"
          >
            <RapportinoHeader
              costr={costr}
              commessa={commessa}
              reportDate={reportDate}
              capoName={capoName}
              onChangeCostr={setCostr}
              onChangeCommessa={setCommessa}
              onChangeDate={setReportDate}
            />

            {/* META (déplacé depuis la top bar) */}
            <div className="no-print mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Ruolo:</span>{" "}
                {crewLabel}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-900 border border-slate-200 text-[11px] font-semibold">
                  Stato: {statusLabel}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                  Prodotto totale: {prodottoTotale.toFixed(2)}
                </span>
              </div>
            </div>

            <RapportinoTable
              rows={rows}
              onRowChange={handleRowChange}
              onRemoveRow={handleRemoveRow}
            />

            <div className="mt-6 no-print">
              <RapportinoIncaCaviSection
                rapportinoId={rapportinoId}
                reportDate={reportDate}
                costr={costr}
                commessa={commessa}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] no-print">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
                >
                  + Aggiungi riga
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {saving && (
                  <span className="text-slate-500">Salvataggio in corso…</span>
                )}
                {successMessage && (
                  <span className="text-emerald-700 font-semibold">
                    {successMessage}
                  </span>
                )}

                {errorDetails && (
                  <button
                    type="button"
                    onClick={() => setShowErrorDetails((v) => !v)}
                    className="px-2 py-1 rounded border border-red-400 text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    Dettagli errore
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800"
                >
                  Salva
                </button>

                <button
                  type="button"
                  onClick={handleValidate}
                  className="px-3 py-1.5 rounded-md border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Valida giornata
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-md border border-sky-700 bg-sky-600 text-white hover:bg-sky-700"
                  title="Stampa A4 orizzontale (stessa pagina)"
                >
                  Export / Print
                </button>
              </div>
            </div>

            {showErrorDetails && errorDetails && (
              <pre className="mt-3 text-[10px] bg-red-50 text-red-800 p-2 rounded border border-red-200 whitespace-pre-wrap no-print">
                {errorDetails}
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// src/components/RapportinoIncaCaviSection.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * RAPPORTINO — INCA (Mini-cockpit maîtrisé + INCA Snapshot + Link modal)
 * Objectif CORE 1.0:
 * - Affiche les cavi INCA liés au rapportino.
 * - La "Situazione" est GLOBALE (source unique): inca_cavi.situazione (NULL => NP).
 * - Pas d’action de masse ici.
 * - Ajoute un "INCA snapshot" (P/NP/B/T + total) filtré par COSTR/commessa.
 * - Implémente "Collega cavo INCA": modal de recherche + insertion dans rapportino_inca_cavi.
 *
 * IMPORTANT:
 * - Pas de parsing XLSX côté front, on lit uniquement la base.
 * - Le lien se fait via rapportino_inca_cavi (rapportino_id + inca_cavo_id).
 */

const SITUAZIONI_ORDER = ["NP", "T", "P", "R", "B", "E"];

const SITUAZIONI_LABEL = {
  NP: "Non posato",
  T: "Teorico",
  P: "Posato",
  R: "Rimosso",
  B: "Bloccato",
  E: "Eliminato",
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCode(v) {
  return (v || "").toString().trim();
}

function matchSearch(code, q) {
  const c = normalizeCode(code).toLowerCase();
  const qq = (q || "").toString().trim().toLowerCase();
  if (!qq) return true;
  return c.includes(qq);
}

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10; // 1 décimale
}

/**
 * Lisibilité AA (dark): texte clair constant + couleur portée par bordure/dot.
 * Pas d’animations.
 */
function dotClass(k) {
  const base = "inline-block h-2.5 w-2.5 rounded-full";
  const map = {
    NP: "bg-slate-400",
    T: "bg-sky-400",
    P: "bg-emerald-400",
    R: "bg-amber-400",
    B: "bg-fuchsia-400",
    E: "bg-rose-400",
  };
  return [base, map[k] || map.NP].join(" ");
}

function badgeLetterClass(k) {
  const base =
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold leading-none";
  const map = {
    NP: "bg-slate-200/10 border-slate-500/60 text-slate-50",
    T: "bg-sky-400/15 border-sky-400/60 text-slate-50",
    P: "bg-emerald-400/15 border-emerald-400/60 text-slate-50",
    R: "bg-amber-400/15 border-amber-400/60 text-slate-50",
    B: "bg-fuchsia-400/15 border-fuchsia-400/60 text-slate-50",
    E: "bg-rose-400/15 border-rose-400/60 text-slate-50",
  };
  return [base, map[k] || map.NP].join(" ");
}

function pillClass(k, active = false) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-semibold leading-none";
  const neutral =
    "bg-slate-950/35 text-slate-50 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35";
  const mapBorder = {
    NP: "border-slate-500/60",
    T: "border-sky-400/65",
    P: "border-emerald-400/65",
    R: "border-amber-400/65",
    B: "border-fuchsia-400/65",
    E: "border-rose-400/65",
  };
  const activeState = active ? "bg-slate-50/10 ring-2 ring-white/10" : "";
  return [base, neutral, mapBorder[k] || mapBorder.NP, activeState].join(" ");
}

function incaBadge() {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5",
        "text-[10px] font-bold tracking-[0.18em] uppercase",
        "border-slate-700 text-slate-300 bg-slate-950/40",
      ].join(" ")}
      title="Stato salvato su INCA (globale)"
    >
      INCA
    </span>
  );
}

function snapshotChipClass(k) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-semibold";
  const neutral = "bg-slate-950/35 text-slate-50";
  const mapBorder = {
    P: "border-emerald-400/55",
    NP: "border-slate-500/55",
    B: "border-fuchsia-400/55",
    T: "border-sky-400/55",
    R: "border-amber-400/55",
    E: "border-rose-400/55",
  };
  return [base, neutral, mapBorder[k] || "border-slate-700"].join(" ");
}

function normalizeSituazioneKey(raw) {
  const v = raw == null ? "" : String(raw).trim();
  if (!v) return "NP";
  if (SITUAZIONI_ORDER.includes(v)) return v;
  return "NP";
}

function isUniqueViolation(error) {
  // Postgres unique violation: 23505
  return (
    error &&
    (error.code === "23505" ||
      (typeof error.message === "string" &&
        error.message.toLowerCase().includes("duplicate")))
  );
}

export default function RapportinoIncaCaviSection({
  rapportinoId,
  reportDate,
  costr,
  commessa,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Rows liés au rapportino (avec join inca_cavi)
  const [rows, setRows] = useState([]);

  // UX — search table
  const [search, setSearch] = useState("");

  // Modal picker "situazione" (ligne)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIncaCavoId, setPickerIncaCavoId] = useState(null); // inca_cavi.id
  const [pickerValue, setPickerValue] = useState("NP");

  // Link modal (Collega cavo INCA)
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkQ, setLinkQ] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkErr, setLinkErr] = useState("");
  const [linkList, setLinkList] = useState([]);
  const [linkToast, setLinkToast] = useState(""); // mini feedback (non intrusif)
  const linkSearchTimerRef = useRef(null);

  // Snapshot INCA (global, filtré par COSTR/commessa)
  const [snapLoading, setSnapLoading] = useState(false);
  const [snapErr, setSnapErr] = useState("");
  const [snap, setSnap] = useState({
    total: 0,
    byKey: { NP: 0, T: 0, P: 0, R: 0, B: 0, E: 0 },
    updatedAt: null,
  });

  const linkedIdsSet = useMemo(() => {
    return new Set(rows.map((r) => r.inca_cavo_id).filter(Boolean));
  }, [rows]);

  const closePicker = () => {
    setPickerOpen(false);
    setPickerIncaCavoId(null);
  };

  const openPickerForRow = (row) => {
    const cur = row?.situazioneKey || "NP";
    setPickerIncaCavoId(row?.inca_cavo_id || null);
    setPickerValue(cur);
    setPickerOpen(true);
  };

  const openLinkModal = () => {
    setLinkErr("");
    setLinkToast("");
    setLinkOpen(true);
    // prime list à l’ouverture
    setLinkQ("");
  };

  const closeLinkModal = () => {
    setLinkOpen(false);
    setLinkErr("");
    setLinkToast("");
    setLinkList([]);
    setLinkLoading(false);
    if (linkSearchTimerRef.current) clearTimeout(linkSearchTimerRef.current);
  };

  const fetchSnapshot = async () => {
    if (!costr || !commessa) {
      setSnapErr("");
      setSnapLoading(false);
      setSnap({
        total: 0,
        byKey: { NP: 0, T: 0, P: 0, R: 0, B: 0, E: 0 },
        updatedAt: null,
      });
      return;
    }

    setSnapLoading(true);
    setSnapErr("");

    try {
      // Agrégation simple côté front (compatible partout)
      const { data, error } = await supabase
        .from("inca_cavi")
        .select(
          `
            situazione,
            inca_files!inner (
              costr,
              commessa
            )
          `
        )
        .eq("inca_files.costr", costr)
        .eq("inca_files.commessa", commessa);

      if (error) throw error;

      const list = Array.isArray(data) ? data : [];
      const byKey = { NP: 0, T: 0, P: 0, R: 0, B: 0, E: 0 };

      for (const r of list) {
        const key = normalizeSituazioneKey(r?.situazione);
        if (byKey[key] == null) byKey[key] = 0;
        byKey[key] += 1;
      }

      setSnap({
        total: list.length,
        byKey,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] snapshot error:", e);
      setSnapErr("Snapshot INCA non disponibile.");
      setSnap({
        total: 0,
        byKey: { NP: 0, T: 0, P: 0, R: 0, B: 0, E: 0 },
        updatedAt: null,
      });
    } finally {
      setSnapLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setErr("");

    try {
      if (!rapportinoId) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from("rapportino_inca_cavi")
        .select(
          `
            id,
            rapportino_id,
            inca_cavo_id,
            metri_posati,
            note,
            progress_percent,
            step_type,
            codice_cache,
            inca_cavi:inca_cavo_id (
              codice,
              metri_teo,
              situazione
            )
          `
        )
        .eq("rapportino_id", rapportinoId)
        .order("codice_cache", { ascending: true, nullsFirst: false })
        .order("codice", { ascending: true, foreignTable: "inca_cavi" });

      if (error) throw error;

      const list = Array.isArray(data) ? data : [];
      setRows(
        list.map((r) => {
          const codice = r?.codice_cache || r?.inca_cavi?.codice || "";
          const metri_teo = safeNum(r?.inca_cavi?.metri_teo);
          const situazioneKey = normalizeSituazioneKey(r?.inca_cavi?.situazione);

          return {
            id: r.id,
            rapportino_id: r.rapportino_id,
            inca_cavo_id: r.inca_cavo_id,
            codice,
            metri_teo,
            metri_posati: safeNum(r.metri_posati),
            step_type: r.step_type || null,
            note: r.note || "",
            progress_percent: safeNum(r.progress_percent),
            situazioneKey,
          };
        })
      );
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] fetch error:", e);
      setRows([]);
      setErr("Impossibile caricare i cavi INCA collegati.");
    } finally {
      setLoading(false);
    }
  };

  // Load table rows
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapportinoId]);

  // Load snapshot when context changes
  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costr, commessa]);

  // Link modal search (debounced)
  useEffect(() => {
    if (!linkOpen) return;

    if (linkSearchTimerRef.current) clearTimeout(linkSearchTimerRef.current);

    linkSearchTimerRef.current = setTimeout(() => {
      (async () => {
        setLinkLoading(true);
        setLinkErr("");

        try {
          if (!costr || !commessa) {
            setLinkList([]);
            setLinkErr("COSTR/commessa non disponibili. Apri il rapportino con contesto corretto.");
            return;
          }

          // Query INCA cavi pour cette commessa
          let q = supabase
            .from("inca_cavi")
            .select(
              `
                id,
                codice,
                metri_teo,
                situazione,
                inca_files!inner (
                  costr,
                  commessa
                )
              `
            )
            .eq("inca_files.costr", costr)
            .eq("inca_files.commessa", commessa)
            .order("codice", { ascending: true })
            .limit(60);

          const s = (linkQ || "").trim();
          if (s) {
            q = q.ilike("codice", `%${s}%`);
          }

          const { data, error } = await q;
          if (error) throw error;

          const list = (Array.isArray(data) ? data : [])
            .map((r) => ({
              id: r.id,
              codice: r.codice || "",
              metri_teo: safeNum(r.metri_teo),
              situazioneKey: normalizeSituazioneKey(r.situazione),
            }))
            // Exclure ceux déjà liés (client-side)
            .filter((r) => !linkedIdsSet.has(r.id));

          setLinkList(list);
        } catch (e) {
          console.error("[RapportinoIncaCaviSection] link search error:", e);
          setLinkErr("Errore caricando la lista cavi INCA.");
          setLinkList([]);
        } finally {
          setLinkLoading(false);
        }
      })();
    }, 250);

    return () => {
      if (linkSearchTimerRef.current) clearTimeout(linkSearchTimerRef.current);
    };
  }, [linkQ, linkOpen, costr, commessa, linkedIdsSet]);

  const filteredRows = useMemo(() => {
    const q = (search || "").trim();
    if (!q) return rows;
    return rows.filter((r) => matchSearch(r.codice, q));
  }, [rows, search]);

  const count = filteredRows.length;

  // Update stato (source unique: inca_cavi.situazione)
  const handleUpdateSituazioneSingle = async (incaCavoId, newKey) => {
    if (!incaCavoId) return;

    const key = newKey === "NP" ? null : newKey;

    // Optimistic UI (table)
    setRows((prev) =>
      prev.map((r) =>
        r.inca_cavo_id === incaCavoId
          ? { ...r, situazioneKey: newKey || "NP" }
          : r
      )
    );

    setSaving(true);
    setErr("");

    try {
      const { error } = await supabase
        .from("inca_cavi")
        .update({ situazione: key })
        .eq("id", incaCavoId);

      if (error) throw error;

      // Refresh snapshot (car état global)
      await fetchSnapshot();
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] update single error:", e);
      setErr("Errore aggiornando lo stato (INCA). Ricarico…");
      await fetchData();
      await fetchSnapshot();
    } finally {
      setSaving(false);
    }
  };

  // Link a cable to rapportino
  const handleLinkCavo = async (cavo) => {
    if (!rapportinoId) {
      setLinkToast("");
      setLinkErr("Rapportino non valido.");
      return;
    }
    if (!cavo?.id) return;

    setLinkLoading(true);
    setLinkErr("");
    setLinkToast("");

    try {
      // Insert link row
      const payload = {
        rapportino_id: rapportinoId,
        inca_cavo_id: cavo.id,
        // garde le tri stable même si INCA change
        codice_cache: cavo.codice || null,
        // champs rapportino: on laisse null/0 par défaut
        metri_posati: 0,
        note: null,
        progress_percent: null,
        step_type: null,
      };

      const { error } = await supabase.from("rapportino_inca_cavi").insert(payload);

      if (error) {
        if (isUniqueViolation(error)) {
          setLinkToast("Cavo già collegato.");
          // on retire quand même de la liste pour éviter confusion
          setLinkList((prev) => prev.filter((x) => x.id !== cavo.id));
          return;
        }
        throw error;
      }

      setLinkToast("Collegato.");
      // Refresh table + snapshot + list
      await fetchData();
      await fetchSnapshot();
      setLinkList((prev) => prev.filter((x) => x.id !== cavo.id));
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] link insert error:", e);
      setLinkErr("Errore collegando il cavo. Verifica permessi/RLS o duplicati.");
    } finally {
      setLinkLoading(false);
    }
  };

  const snapTotal = snap.total || 0;
  const snapP = snap.byKey.P || 0;
  const snapNP = snap.byKey.NP || 0;
  const snapB = snap.byKey.B || 0;
  const snapT = snap.byKey.T || 0;

  return (
    <div className="mt-6">
      {/* Header compact (silencieux, premium) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                INCA · CAVI COLLEGATI
              </div>

              {(costr || commessa || reportDate) ? (
                <span className="text-slate-600">·</span>
              ) : null}

              {costr || commessa ? (
                <div className="text-[12px] text-slate-300">
                  {costr ? (
                    <>
                      COSTR{" "}
                      <span className="font-semibold text-slate-100">{costr}</span>
                    </>
                  ) : null}
                  {costr && commessa ? (
                    <span className="text-slate-600"> / </span>
                  ) : null}
                  {commessa ? (
                    <span className="font-semibold text-slate-100">{commessa}</span>
                  ) : null}
                </div>
              ) : null}

              {reportDate ? (
                <>
                  <span className="text-slate-600">·</span>
                  <div className="text-[12px] text-slate-300">
                    Data{" "}
                    <span className="font-semibold text-slate-100">
                      {String(reportDate)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Ligne statut + note globale */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-slate-300">
                {loading ? "…" : count} <span className="text-slate-500">cavi</span>
              </span>
              {incaBadge()}
              <span className="text-[12px] text-slate-500">
                Modifica Situazione = aggiornamento globale INCA
              </span>
            </div>

            {/* INCA Snapshot (mini instrument) */}
            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2.5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Snapshot INCA
                  </div>
                  {snapLoading ? (
                    <span className="text-[12px] text-slate-400">Caricamento…</span>
                  ) : snapErr ? (
                    <span className="text-[12px] text-rose-200">{snapErr}</span>
                  ) : !costr || !commessa ? (
                    <span className="text-[12px] text-slate-500">
                      Seleziona COSTR/commessa
                    </span>
                  ) : (
                    <span className="text-[12px] text-slate-400">
                      Totale{" "}
                      <span className="font-semibold text-slate-100">{snapTotal}</span>
                    </span>
                  )}
                </div>

                {/* Chips P / NP / B / T */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={snapshotChipClass("P")}>
                    <span className={badgeLetterClass("P")}>P</span>
                    <span className="text-slate-50">Posato</span>
                    <span className="text-slate-200 tabular-nums">
                      {snapLoading || snapErr ? "—" : `${pct(snapP, snapTotal)}%`}
                    </span>
                  </span>

                  <span className={snapshotChipClass("NP")}>
                    <span className={badgeLetterClass("NP")}>NP</span>
                    <span className="text-slate-50">Non posato</span>
                    <span className="text-slate-200 tabular-nums">
                      {snapLoading || snapErr ? "—" : `${pct(snapNP, snapTotal)}%`}
                    </span>
                  </span>

                  <span className={snapshotChipClass("B")}>
                    <span className={badgeLetterClass("B")}>B</span>
                    <span className="text-slate-50">Bloccato</span>
                    <span className="text-slate-200 tabular-nums">
                      {snapLoading || snapErr ? "—" : `${pct(snapB, snapTotal)}%`}
                    </span>
                  </span>

                  <span className={snapshotChipClass("T")}>
                    <span className={badgeLetterClass("T")}>T</span>
                    <span className="text-slate-50">Teorico</span>
                    <span className="text-slate-200 tabular-nums">
                      {snapLoading || snapErr ? "—" : `${pct(snapT, snapTotal)}%`}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-2",
                "text-[13px] font-semibold",
                "border-sky-400/55 text-slate-50 bg-slate-950/35 hover:bg-slate-900/35",
                "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
              ].join(" ")}
              title="Collega cavo INCA"
              onClick={openLinkModal}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-400/55 text-sky-200">
                +
              </span>
              <span>Collega cavo INCA</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {err ? (
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
            {err}
          </div>
        ) : null}

        {/* Search (discret) */}
        <div className="mt-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca marca/codice…"
            className={[
              "w-full rounded-2xl border",
              "border-slate-800 bg-slate-950/35",
              "px-3 py-2.5 text-[13px] text-slate-50",
              "placeholder:text-slate-500",
              "outline-none focus:ring-2 focus:ring-sky-500/35",
            ].join(" ")}
          />
        </div>
      </div>

      {/* Table (centrale) */}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/35">
        <table className="min-w-[980px] w-full text-slate-50">
          <thead className="bg-slate-950/70 border-b border-slate-800">
            <tr className="text-left text-[11px] text-slate-400">
              <th className="px-3 py-2 text-slate-300">Marca / codice</th>
              <th className="px-3 py-2 text-slate-300">Lung. disegno</th>
              <th className="px-3 py-2 text-slate-300">Step</th>
              <th className="px-3 py-2 text-slate-300">Metri posati (rap.)</th>
              <th className="px-3 py-2 text-slate-300">Situazione (INCA)</th>
              <th className="px-3 py-2 text-right text-slate-300">Azioni</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-5 text-[13px] text-slate-300">
                  Caricamento…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-100">
                        Nessun cavo INCA collegato
                      </div>
                      <div className="mt-1 text-[12px] text-slate-400">
                        Collega i cavi coinvolti nel rapportino per gestire la
                        Situazione INCA.
                      </div>
                    </div>

                    <button
                      type="button"
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2",
                        "text-[13px] font-semibold",
                        "border-sky-400/55 text-slate-50 bg-slate-950/35 hover:bg-slate-900/35",
                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                      ].join(" ")}
                      onClick={openLinkModal}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-400/55 text-sky-200">
                        +
                      </span>
                      <span>Collega cavo INCA</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/25">
                  <td className="px-3 py-2">
                    <div className="text-[13px] text-slate-50 font-semibold">
                      {r.codice || "—"}
                    </div>
                    {r.note ? (
                      <div className="mt-1 text-[12px] text-slate-400 truncate">
                        {r.note}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[13px] text-slate-100 tabular-nums">
                      {safeNum(r.metri_teo).toFixed(2)}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[13px] text-slate-100">
                      {r.step_type || "—"}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[13px] text-slate-100 tabular-nums">
                      {safeNum(r.metri_posati).toFixed(2)}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openPickerForRow(r)}
                      className={pillClass(r.situazioneKey)}
                      title="Imposta situazione (INCA globale)"
                    >
                      <span className={badgeLetterClass(r.situazioneKey)}>
                        {r.situazioneKey}
                      </span>
                      <span className="whitespace-nowrap">
                        {SITUAZIONI_LABEL[r.situazioneKey] || "—"}
                      </span>
                      <span className={dotClass(r.situazioneKey)} aria-hidden="true" />
                      {incaBadge()}
                    </button>
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className={[
                        "inline-flex items-center rounded-full border px-3 py-2",
                        "text-[12px] font-semibold",
                        "border-slate-700 text-slate-100 bg-slate-950/25 hover:bg-slate-900/35",
                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                      ].join(" ")}
                      title="Scollega"
                      onClick={async () => {
                        setSaving(true);
                        setErr("");
                        try {
                          const { error } = await supabase
                            .from("rapportino_inca_cavi")
                            .delete()
                            .eq("id", r.id);
                          if (error) throw error;

                          setRows((prev) => prev.filter((x) => x.id !== r.id));
                          // refresh snapshot/list if link modal open
                          await fetchSnapshot();
                        } catch (e) {
                          console.error(
                            "[RapportinoIncaCaviSection] delete link error:",
                            e
                          );
                          setErr("Errore rimuovendo il collegamento. Ricarico…");
                          await fetchData();
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Rimuovi
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Saving hint */}
      {saving ? (
        <div className="mt-2 text-[12px] text-slate-400">Salvataggio…</div>
      ) : null}

      {/* Picker modal (situazione) */}
      {pickerOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Situazione cavo (INCA)"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePicker();
          }}
        >
          <div className="absolute inset-0 bg-black/70" />

          <div
            className={[
              "relative w-full sm:w-[min(720px,96vw)]",
              "rounded-t-3xl sm:rounded-3xl border border-slate-800",
              "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
              "px-4 pb-4 pt-4",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Situazione <span className="text-slate-600">·</span>{" "}
                  <span className="text-slate-300">INCA (globale)</span>
                </div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">
                  Seleziona stato
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Questa modifica aggiorna lo stato del cavo su INCA.
                </div>
              </div>

              <button
                type="button"
                onClick={closePicker}
                className={[
                  "inline-flex items-center justify-center rounded-full border px-3 py-2",
                  "text-[13px] font-semibold",
                  "border-slate-700 text-slate-100 bg-slate-950/25 hover:bg-slate-900/35",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                ].join(" ")}
              >
                Chiudi
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SITUAZIONI_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setPickerValue(k);
                    handleUpdateSituazioneSingle(pickerIncaCavoId, k);
                    closePicker();
                  }}
                  className={pillClass(k, pickerValue === k)}
                  title={SITUAZIONI_LABEL[k]}
                >
                  <span className={badgeLetterClass(k)}>{k}</span>
                  <span>{SITUAZIONI_LABEL[k]}</span>
                  <span className={dotClass(k)} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Link modal (Collega cavo INCA) */}
      {linkOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Collega cavo INCA"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeLinkModal();
          }}
        >
          <div className="absolute inset-0 bg-black/70" />

          <div
            className={[
              "relative w-full sm:w-[min(860px,96vw)]",
              "rounded-t-3xl sm:rounded-3xl border border-slate-800",
              "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
              "px-4 pb-4 pt-4",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Collega cavo <span className="text-slate-600">·</span>{" "}
                  <span className="text-slate-300">INCA</span>
                </div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">
                  Cerca e collega un cavo alla lista del rapportino
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Mostra solo cavi di COSTR/commessa e non già collegati.
                </div>
              </div>

              <button
                type="button"
                onClick={closeLinkModal}
                className={[
                  "inline-flex items-center justify-center rounded-full border px-3 py-2",
                  "text-[13px] font-semibold",
                  "border-slate-700 text-slate-100 bg-slate-950/25 hover:bg-slate-900/35",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                ].join(" ")}
              >
                Chiudi
              </button>
            </div>

            {/* Context + search */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Contesto
                </div>
                <div className="mt-1 text-[13px] text-slate-50 font-semibold">
                  {costr && commessa ? (
                    <>
                      COSTR {costr} / {commessa}
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Rapportino:{" "}
                  <span className="font-semibold text-slate-200">
                    {rapportinoId ? "OK" : "—"}
                  </span>
                </div>
              </div>

              <div className="md:col-span-8">
                <input
                  value={linkQ}
                  onChange={(e) => setLinkQ(e.target.value)}
                  placeholder="Cerca codice INCA… (es. MARCA CAVO)"
                  className={[
                    "w-full rounded-2xl border",
                    "border-slate-800 bg-slate-950/35",
                    "px-3 py-3 text-[13px] text-slate-50",
                    "placeholder:text-slate-500",
                    "outline-none focus:ring-2 focus:ring-sky-500/35",
                  ].join(" ")}
                />
                <div className="mt-2 flex items-center gap-2">
                  {linkLoading ? (
                    <span className="text-[12px] text-slate-400">Caricamento…</span>
                  ) : null}
                  {linkToast ? (
                    <span className="text-[12px] text-emerald-200">{linkToast}</span>
                  ) : null}
                  {linkErr ? (
                    <span className="text-[12px] text-rose-200">{linkErr}</span>
                  ) : null}
                  {!linkLoading && !linkErr ? (
                    <span className="text-[12px] text-slate-500">
                      {linkList.length} risultati
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* List results */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30">
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/60">
                <div className="grid grid-cols-12 gap-2 text-[11px] text-slate-400">
                  <div className="col-span-6 text-slate-300">Codice</div>
                  <div className="col-span-2 text-slate-300">Lung.</div>
                  <div className="col-span-3 text-slate-300">Situazione</div>
                  <div className="col-span-1 text-right text-slate-300">+</div>
                </div>
              </div>

              <div className="max-h-[52vh] overflow-auto">
                {linkLoading ? (
                  <div className="px-3 py-6 text-[13px] text-slate-400">
                    Caricamento lista…
                  </div>
                ) : linkList.length === 0 ? (
                  <div className="px-3 py-6 text-[13px] text-slate-400">
                    Nessun risultato (o tutti già collegati).
                  </div>
                ) : (
                  linkList.map((c) => (
                    <div
                      key={c.id}
                      className="px-3 py-2 border-b border-slate-800 last:border-b-0 hover:bg-slate-900/20"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6 min-w-0">
                          <div className="text-[13px] font-semibold text-slate-50 truncate">
                            {c.codice || "—"}
                          </div>
                          <div className="mt-0.5 text-[12px] text-slate-400">
                            ID: <span className="text-slate-500">{c.id}</span>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="text-[13px] text-slate-100 tabular-nums">
                            {safeNum(c.metri_teo).toFixed(2)}
                          </div>
                        </div>

                        <div className="col-span-3">
                          <span className={pillClass(c.situazioneKey)} title="Situazione (INCA)">
                            <span className={badgeLetterClass(c.situazioneKey)}>
                              {c.situazioneKey}
                            </span>
                            <span className="whitespace-nowrap">
                              {SITUAZIONI_LABEL[c.situazioneKey] || "—"}
                            </span>
                            <span className={dotClass(c.situazioneKey)} aria-hidden="true" />
                            {incaBadge()}
                          </span>
                        </div>

                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            disabled={linkLoading}
                            onClick={() => handleLinkCavo(c)}
                            className={[
                              "inline-flex items-center justify-center rounded-full border px-3 py-2",
                              "text-[12px] font-semibold",
                              "border-sky-400/55 text-slate-50 bg-slate-950/35 hover:bg-slate-900/35",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                            ].join(" ")}
                            title="Collega"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 text-[12px] text-slate-500">
              Nota: il collegamento crea una riga su <span className="text-slate-300 font-semibold">rapportino_inca_cavi</span>.
              La Situazione resta globale su <span className="text-slate-300 font-semibold">inca_cavi</span>.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

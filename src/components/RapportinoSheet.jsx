import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Etichette per il crew_role
const CREW_ROLE_LABELS = {
  ELETTRICISTA: "ELETTRICISTA",
  CARPENTERIA: "CARPENTERIA",
  MONTAGGIO: "MONTAGGIO",
};

// Template delle righe per tipo squadra, basato sui tuoi rapportini cartacei
function getTemplateRowsForCrew(crewRole) {
  const commonEmpty = {
    operatori: "",
    tempo: "",
    previsto: "",
    prodotto: "",
    note: "",
  };

  switch (crewRole) {
    case "ELETTRICISTA":
      return [
        {
          categoria: "STESURA",
          descrizione: "STESURA",
          ...commonEmpty,
        },
        {
          categoria: "STESURA",
          descrizione: "FASCETTATURA CAVI",
          ...commonEmpty,
        },
        {
          categoria: "STESURA",
          descrizione: "RIPRESA CAVI",
          ...commonEmpty,
        },
        {
          categoria: "STESURA",
          descrizione: "VARI STESURA CAVI",
          ...commonEmpty,
        },
      ];
    case "CARPENTERIA":
      return [
        {
          categoria: "CARPENTERIA",
          descrizione: "SALDATURA STAFFE STRADE CAVI MAGAZZINO",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "SALDATURA STAFFE STRADE CAVI",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "MONTAGGIO STRADE CAVI",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "SALDATURA TONDINI",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "SALDATURA BASAMENTI (APPARECCHIATURE)",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "TRACCIATURA KIEPE/COLLARI",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "SALDATURA KIEPE/COLLARI",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "MOLATURA KIEPE",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "MOLATURA STAFFE, TONDINI, BASAMENTI",
          ...commonEmpty,
        },
        {
          categoria: "CARPENTERIA",
          descrizione: "VARIE CARPENTERIE",
          ...commonEmpty,
        },
      ];
    case "MONTAGGIO":
      return [
        {
          categoria: "IMBARCHI",
          descrizione: "VARI IMBARCHI (LOGISTICA E TRASPORTO)",
          ...commonEmpty,
        },
        {
          categoria: "MONTAGGIO",
          descrizione: "MONTAGGIO APPARECCHIATURA MINORE DI 50 KG",
          ...commonEmpty,
        },
        {
          categoria: "MONTAGGIO",
          descrizione: "MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG",
          ...commonEmpty,
        },
        {
          categoria: "MONTAGGIO",
          descrizione: "MONTAGGIO APPARECCHIATURA DA 151 KG A 400 KG",
          ...commonEmpty,
        },
        {
          categoria: "MONTAGGIO",
          descrizione: "MONTAGGIO APPARECCHIATURA DA 401 KG A 1400 KG",
          ...commonEmpty,
        },
      ];
    default:
      return [
        {
          categoria: "",
          descrizione: "",
          ...commonEmpty,
        },
      ];
  }
}

// Format YYYY-MM-DD -> DD/MM/YYYY
function formatDateHuman(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

// Oggi in formato YYYY-MM-DD
function getTodayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * RapportinoSheet
 *
 * Props previste:
 * - profile : profilo Supabase (full_name, display_name, ecc.)
 * - crewRole : "ELETTRICISTA" | "CARPENTERIA" | "MONTAGGIO"
 */
export default function RapportinoSheet({ profile, crewRole }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [rapportinoId, setRapportinoId] = useState(null);

  const [date, setDate] = useState(getTodayIso());
  const [status, setStatus] = useState("DRAFT");
  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("SDC");
  const [capoName, setCapoName] = useState(
    profile?.display_name || profile?.full_name || profile?.email || ""
  );

  const [rows, setRows] = useState([]);

  const crewRoleLabel = CREW_ROLE_LABELS[crewRole] || crewRole || "";

  // Totale prodotto
  const totalProdotto = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const v = Number(
          typeof r.prodotto === "string" ? r.prodotto.replace(",", ".") : r.prodotto
        );
        if (Number.isNaN(v)) return sum;
        return sum + v;
      }, 0),
    [rows]
  );

  // CARICAMENTO del rapportino del giorno (o creazione se non esiste)
  useEffect(() => {
    let isMounted = true;

    async function loadRapportino() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!isMounted) return;
        setErrorMessage("Sessione non valida. Effettua di nuovo il login.");
        setLoading(false);
        return;
      }

      // 1) Cerco un rapportino esistente per (user_id, data, role)
      const { data: header, error: headerError } = await supabase
        .from("rapportini")
        .select("*")
        .eq("user_id", user.id)
        .eq("data", date)
        .eq("role", crewRole)
        .maybeSingle();

      if (!isMounted) return;

      if (headerError && headerError.code !== "PGRST116") {
        console.error("Errore caricamento rapportino:", headerError);
        setErrorMessage(
          "Errore durante il caricamento del rapportino. I dati locali rimangono utilizzabili."
        );
        setLoading(false);
        return;
      }

      let currentId = header?.id ?? null;

      // 2) Se non c'è header: ne creo uno base
      if (!currentId) {
        const insertPayload = {
          user_id: user.id,
          data: date,
          role: crewRole,
          capo_nome: capoName || null,
          costr: costr || null,
          commessa: commessa || null,
          status: status || "DRAFT",
        };

        const { data: inserted, error: insertError } = await supabase
          .from("rapportini")
          .insert(insertPayload)
          .select()
          .single();

        if (!isMounted) return;

        if (insertError) {
          console.error("Errore creazione rapportino:", insertError);
          setErrorMessage(
            "Errore durante la creazione del rapportino. Puoi comunque scrivere, ma il salvataggio potrebbe fallire."
          );
          setLoading(false);
          return;
        }

        currentId = inserted.id;
        setRapportinoId(inserted.id);
        setStatus(inserted.status || "DRAFT");
        setCostr(inserted.costr || "");
        setCommessa(inserted.commessa || "SDC");
        setCapoName(inserted.capo_nome || capoName);
      } else {
        // Header trovato -> sincronizzo stato locale
        setRapportinoId(currentId);
        setStatus(header.status || "DRAFT");
        setCostr(header.costr || "");
        setCommessa(header.commessa || "SDC");
        setCapoName(header.capo_nome || capoName);
      }

      // 3) Carico le righe
      const { data: dbRows, error: rowsError } = await supabase
        .from("rapportino_rows")
        .select("*")
        .eq("rapportino_id", currentId)
        .order("row_index", { ascending: true });

      if (!isMounted) return;

      if (rowsError) {
        console.error("Errore caricamento righe:", rowsError);
        setErrorMessage(
          "Errore durante il caricamento delle righe. È stato caricato un modello vuoto."
        );
        setRows(getTemplateRowsForCrew(crewRole));
        setLoading(false);
        return;
      }

      if (!dbRows || dbRows.length === 0) {
        // Nessun record -> carico il template standard
        setRows(getTemplateRowsForCrew(crewRole));
      } else {
        setRows(
          dbRows.map((r) => ({
            id: r.id,
            categoria: r.categoria || "",
            descrizione: r.descrizione || "",
            operatori: r.operatori || "",
            tempo: r.tempo || "",
            previsto: r.previsto ?? "",
            prodotto: r.prodotto ?? "",
            note: r.note || "",
          }))
        );
      }

      setLoading(false);
    }

    loadRapportino();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewRole, date]);

  // Modifica celle
  function handleRowChange(index, field, value) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function handleAddRow() {
    setRows((prev) => [
      ...prev,
      {
        categoria: "",
        descrizione: "",
        operatori: "",
        tempo: "",
        previsto: "",
        prodotto: "",
        note: "",
      },
    ]);
  }

  function handleDeleteRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  // Salvataggio
  async function handleSave() {
    if (!rapportinoId) {
      setErrorMessage(
        "Rapportino non inizializzato correttamente. Ricarica la pagina e riprova."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Sessione scaduta. Effettua di nuovo il login.");
      setSaving(false);
      return;
    }

    // 1) Aggiorno l'header
    const { error: updateHeaderError } = await supabase
      .from("rapportini")
      .update({
        data: date,
        costr: costr || null,
        commessa: commessa || null,
        status: status || "DRAFT",
        capo_nome: capoName || null,
      })
      .eq("id", rapportinoId)
      .eq("user_id", user.id);

    if (updateHeaderError) {
      console.error("Errore update header:", updateHeaderError);
      setErrorMessage("Errore durante il salvataggio del rapportino.");
      setSaving(false);
      return;
    }

    // 2) Sostituisco completamente le righe (delete + insert)
    const { error: deleteError } = await supabase
      .from("rapportino_rows")
      .delete()
      .eq("rapportino_id", rapportinoId);

    if (deleteError) {
      console.error("Errore delete righe:", deleteError);
      setErrorMessage("Errore durante il salvataggio delle righe (cancellazione).");
      setSaving(false);
      return;
    }

    const payloadRows = rows.map((row, index) => ({
      rapportino_id: rapportinoId,
      row_index: index,
      categoria: row.categoria || "",
      descrizione: row.descrizione || "",
      operatori: row.operatori || "",
      tempo: row.tempo || "",
      previsto:
        row.previsto === "" || row.previsto === null
          ? null
          : Number(
              typeof row.previsto === "string"
                ? row.previsto.replace(",", ".")
                : row.previsto
            ),
      prodotto:
        row.prodotto === "" || row.prodotto === null
          ? null
          : Number(
              typeof row.prodotto === "string"
                ? row.prodotto.replace(",", ".")
                : row.prodotto
            ),
      note: row.note || "",
    }));

    if (payloadRows.length > 0) {
      const { error: insertRowsError } = await supabase
        .from("rapportino_rows")
        .insert(payloadRows);

      if (insertRowsError) {
        console.error("Errore insert righe:", insertRowsError);
        setErrorMessage("Errore durante il salvataggio delle righe.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
  }

  // Stampa / export PDF (A4 orizzontale tramite CSS)
  function handlePrint() {
    window.print();
  }

  return (
    <div className="rapportino-page">
      {/* Titolo */}
      <h1 className="rapportino-title">
        Rapportino Giornaliero – {crewRoleLabel}
      </h1>

      {/* Meta (Costr, Commessa, Capo, Data, Stato) */}
      <div className="rapportino-meta mb-2">
        <div className="rapportino-meta-row">
          <span>
            <span className="rapportino-meta-label">Costr.:</span>{" "}
            <input
              type="text"
              value={costr}
              onChange={(e) => setCostr(e.target.value)}
              className="border-b border-dotted border-slate-400 bg-transparent outline-none px-1"
            />
          </span>
          <span>
            <span className="rapportino-meta-label">Commessa:</span>{" "}
            <input
              type="text"
              value={commessa}
              onChange={(e) => setCommessa(e.target.value)}
              className="border-b border-dotted border-slate-400 bg-transparent outline-none px-1"
            />
          </span>
          <span>
            <span className="rapportino-meta-label">Capo Squadra:</span>{" "}
            <input
              type="text"
              value={capoName}
              onChange={(e) => setCapoName(e.target.value)}
              className="border-b border-dotted border-slate-400 bg-transparent outline-none px-1"
            />
          </span>
          <span>
            <span className="rapportino-meta-label">Data:</span>{" "}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-b border-dotted border-slate-400 bg-transparent outline-none px-1"
            />
            <span className="ml-2 text-xs text-slate-500">
              ({formatDateHuman(date)})
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="rapportino-meta-label">Stato:</span>
            <span className="inline-flex items-center rounded-full border border-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {status || "DRAFT"}
            </span>
          </span>
        </div>
      </div>

      {/* Toolbar – non stampata */}
      <div className="rapportino-toolbar no-print">
        <button
          type="button"
          onClick={() => {
            setRows(getTemplateRowsForCrew(crewRole));
            setStatus("DRAFT");
          }}
          className="px-3 py-1.5 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Nuova giornata
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-1.5 rounded-md bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Salvataggio..." : "Salva rapportino"}
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-1.5 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Stampa / Export PDF
        </button>
      </div>

      {/* Tabella principale */}
      <table className="rapportino-table">
        <thead>
          <tr>
            <th className="col-categoria">CATEGORIA</th>
            <th className="col-descrizione">DESCRIZIONE ATTIVITA&apos;</th>
            <th className="col-operatori">OPERATORE</th>
            <th className="col-tempo">Tempo impiegato</th>
            <th className="col-previsto">PREVISTO</th>
            <th className="col-prodotto">PRODOTTO</th>
            <th className="col-note">NOTE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              <td>
                <textarea
                  value={row.categoria}
                  onChange={(e) =>
                    handleRowChange(index, "categoria", e.target.value)
                  }
                />
              </td>
              <td>
                <textarea
                  value={row.descrizione}
                  onChange={(e) =>
                    handleRowChange(index, "descrizione", e.target.value)
                  }
                />
              </td>
              <td>
                <textarea
                  placeholder="Una riga per operatore"
                  value={row.operatori}
                  onChange={(e) =>
                    handleRowChange(index, "operatori", e.target.value)
                  }
                />
              </td>
              <td>
                <textarea
                  placeholder="Stesse righe degli operatori"
                  value={row.tempo}
                  onChange={(e) =>
                    handleRowChange(index, "tempo", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.previsto}
                  onChange={(e) =>
                    handleRowChange(index, "previsto", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.prodotto}
                  onChange={(e) =>
                    handleRowChange(index, "prodotto", e.target.value)
                  }
                />
              </td>
              <td>
                <textarea
                  value={row.note}
                  onChange={(e) =>
                    handleRowChange(index, "note", e.target.value)
                  }
                />
              </td>
              <td className="no-print" style={{ width: "24px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteRow(index)}
                  className="text-red-500 text-lg leading-none"
                  aria-label="Elimina riga"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Aggiungi riga + totale */}
      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={handleAddRow}
          className="no-print px-3 py-1.5 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          + Aggiungi riga
        </button>

        <div className="rapportino-footer">
          Prodotto totale: {totalProdotto || 0}
        </div>
      </div>

      {/* Messaggi di stato */}
      <div className="mt-2 text-sm text-slate-500">
        {loading && "Caricamento del rapportino..."}
        {errorMessage && (
          <div className="mt-1 text-red-600 no-print">{errorMessage}</div>
        )}
      </div>
    </div>
  );
}

// src/components/RapportinoSheet.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// --- Helpers ---------------------------------------------------------------

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcolaTotaleProdotto(righe) {
  return righe.reduce((sum, r) => sum + (Number(r.prodotto) || 0), 0);
}

// Modelli di righe predefinite per ogni tipo squadra
function creaTemplateRighe(crewRole) {
  if (crewRole === "ELETTRICISTA") {
    return [
      {
        categoria: "STESURA",
        descrizione: "STESURA",
        operatori: "",
        tempo: "",
        previsto: 150,
        prodotto: "",
        note: "",
      },
      {
        categoria: "STESURA",
        descrizione: "FASCETTATURA CAVI",
        operatori: "",
        tempo: "",
        previsto: 600,
        prodotto: "",
        note: "",
      },
      {
        categoria: "STESURA",
        descrizione: "RIPRESA CAVI",
        operatori: "",
        tempo: "",
        previsto: 150,
        prodotto: "",
        note: "",
      },
      {
        categoria: "STESURA",
        descrizione: "VARI STESURA CAVI",
        operatori: "",
        tempo: "",
        previsto: 0.2,
        prodotto: "",
        note: "",
      },
    ];
  }

  if (crewRole === "MONTAGGIO") {
    return [
      {
        categoria: "IMBARCHI",
        descrizione: "VARI IMBARCHI (LOGISTICA E TRASPORTO)",
        operatori: "",
        tempo: "",
        previsto: 0.2,
        prodotto: "",
        note: "",
      },
      {
        categoria: "MONTAGGIO",
        descrizione: "MONTAGGIO APPARECCHIATURA MINORE DI 50 KG",
        operatori: "",
        tempo: "",
        previsto: 12.0,
        prodotto: "",
        note: "",
      },
      {
        categoria: "MONTAGGIO",
        descrizione: "MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG",
        operatori: "",
        tempo: "",
        previsto: 1.0,
        prodotto: "",
        note: "",
      },
      {
        categoria: "MONTAGGIO",
        descrizione: "MONTAGGIO APPARECCHIATURA DA 151 KG A 400 KG",
        operatori: "",
        tempo: "",
        previsto: 1.0,
        prodotto: "",
        note: "",
      },
      {
        categoria: "MONTAGGIO",
        descrizione: "MONTAGGIO APPARECCHIATURA DA 401 KG A 1400 KG",
        operatori: "",
        tempo: "",
        previsto: 0.1,
        prodotto: "",
        note: "",
      },
    ];
  }

  // CARPENTERIA
  return [
    {
      categoria: "CARPENTERIA",
      descrizione: "MONTAGGIO STRADE CAVI / STAFFE",
      operatori: "",
      tempo: "",
      previsto: 8.0,
      prodotto: "",
      note: "",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "SALDATURA STAFFE STRADE CAVI",
      operatori: "",
      tempo: "",
      previsto: 21.0,
      prodotto: "",
      note: "",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "SALDATURA BASAMENTI (APPARECCHIATURE)",
      operatori: "",
      tempo: "",
      previsto: 7.0,
      prodotto: "",
      note: "",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "TRACCIATURA KIEPE/COLLARI",
      operatori: "",
      tempo: "",
      previsto: 8.0,
      prodotto: "",
      note: "",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "VARIE CARPENTERIE",
      operatori: "",
      tempo: "",
      previsto: 0.2,
      prodotto: "",
      note: "",
    },
  ];
}

const CREW_ROLE_LABEL = {
  ELETTRICISTA: "ELETTRICISTA",
  CARPENTERIA: "CARPENTERIA",
  MONTAGGIO: "MONTAGGIO",
};

// --- Componente principale -------------------------------------------------

/**
 * props:
 *  - crewRole: "ELETTRICISTA" | "CARPENTERIA" | "MONTAGGIO"
 *  - profile: { id, email, display_name?, full_name? }
 */
export default function RapportinoSheet({ crewRole, profile }) {
  const [data, setData] = useState(todayISO());
  const [stato, setStato] = useState("DRAFT");
  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("SDC");
  const [capoSquadra, setCapoSquadra] = useState("");
  const [righe, setRighe] = useState([]);
  const [rapportinoId, setRapportinoId] = useState(null);
  const [caricando, setCaricando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  const titoloRole = CREW_ROLE_LABEL[crewRole] || crewRole || "";

  // Nome capo in MAIUSCOLO a partire dal profilo
  const capoDefault = useMemo(() => {
    if (!profile) return "";
    const base =
      profile.display_name ||
      profile.full_name ||
      (profile.email ? profile.email.split("@")[0] : "");
    return (base || "").toUpperCase();
  }, [profile]);

  // Inizializza capo squadra quando cambia il profilo
  useEffect(() => {
    setCapoSquadra((prev) => prev || capoDefault);
  }, [capoDefault]);

  // Carica il rapportino del giorno (se esiste) oppure template
  useEffect(() => {
    if (!profile?.id || !crewRole) return;

    let isCancelled = false;
    async function load() {
      setCaricando(true);
      setErrore("");

      try {
        const { data: rap, error: errRap } = await supabase
          .from("rapportini")
          .select(
            "id, stato, costr, commessa, capo_squadra, prodotto_totale, crew_role"
          )
          .eq("capo_id", profile.id)
          .eq("crew_role", crewRole)
          .eq("data", data)
          .maybeSingle();

        if (errRap && errRap.code !== "PGRST116") {
          console.error(errRap);
          if (!isCancelled) {
            setErrore(
              "Errore durante il caricamento del rapportino. Puoi comunque scrivere."
            );
          }
        }

        if (!isCancelled) {
          if (rap) {
            setRapportinoId(rap.id);
            setStato(rap.stato || "DRAFT");
            setCostr(rap.costr || "");
            setCommessa(rap.commessa || "SDC");
            setCapoSquadra(
              (rap.capo_squadra || capoDefault || "").toUpperCase()
            );

            const { data: righeDb, error: errRighe } = await supabase
              .from("rapportino_rows")
              .select(
                "id, row_index, categoria, descrizione, operatori, tempo, previsto, prodotto, note"
              )
              .eq("rapportino_id", rap.id)
              .order("row_index", { ascending: true });

            if (errRighe) {
              console.error(errRighe);
              setRighe(creaTemplateRighe(crewRole));
            } else if (righeDb && righeDb.length > 0) {
              setRighe(
                righeDb.map((r) => ({
                  categoria: r.categoria || "",
                  descrizione: r.descrizione || "",
                  operatori: r.operatori || "",
                  tempo: r.tempo || "",
                  previsto: r.previsto ?? "",
                  prodotto: r.prodotto ?? "",
                  note: r.note || "",
                }))
              );
            } else {
              setRighe(creaTemplateRighe(crewRole));
            }
          } else {
            setRapportinoId(null);
            setStato("DRAFT");
            setCostr("");
            setCommessa("SDC");
            setCapoSquadra(capoDefault);
            setRighe(creaTemplateRighe(crewRole));
          }
        }
      } finally {
        if (!isCancelled) setCaricando(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [profile?.id, crewRole, data, capoDefault]);

  // Gestione righe ----------------------------------------------------------

  const prodottoTotale = useMemo(() => calcolaTotaleProdotto(righe), [righe]);

  function aggiornaCella(index, campo, valore) {
    setRighe((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [campo]: valore } : r))
    );
  }

  function aggiungiRiga() {
    setRighe((prev) => [
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

  function rimuoviRiga(index) {
    setRighe((prev) => prev.filter((_, i) => i !== index));
  }

  // Salvataggio -------------------------------------------------------------

  async function salvaRapportino() {
    if (!profile?.id) return;
    setSalvando(true);
    setErrore("");

    try {
      const payload = {
        capo_id: profile.id,
        capo_squadra: capoSquadra || capoDefault,
        costr: costr || null,
        commessa: commessa || null,
        data,
        crew_role: crewRole,
        stato,
        prodotto_totale: prodottoTotale,
      };

      let currentId = rapportinoId;

      if (currentId) {
        const { error: errUpd } = await supabase
          .from("rapportini")
          .update(payload)
          .eq("id", currentId);

        if (errUpd) throw errUpd;

        // Per semplicità, cancelliamo e reinseriamo le righe
        await supabase
          .from("rapportino_rows")
          .delete()
          .eq("rapportino_id", currentId);
      } else {
        const { data: inserted, error: errIns } = await supabase
          .from("rapportini")
          .insert(payload)
          .select("id")
          .single();

        if (errIns) throw errIns;
        currentId = inserted.id;
        setRapportinoId(currentId);
      }

      const righePayload = righe.map((r, index) => ({
        rapportino_id: currentId,
        row_index: index,
        categoria: r.categoria || null,
        descrizione: r.descrizione || null,
        operatori: r.operatori || null,
        tempo: r.tempo || null,
        previsto:
          r.previsto === "" || r.previsto === null ? null : Number(r.previsto),
        prodotto:
          r.prodotto === "" || r.prodotto === null ? null : Number(r.prodotto),
        note: r.note || null,
      }));

      if (righePayload.length > 0) {
        const { error: errRows } = await supabase
          .from("rapportino_rows")
          .insert(righePayload);

        if (errRows) throw errRows;
      }
    } catch (err) {
      console.error(err);
      setErrore(
        "Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere."
      );
    } finally {
      setSalvando(false);
    }
  }

  function nuovaGiornata() {
    setRapportinoId(null);
    setStato("DRAFT");
    setRighe(creaTemplateRighe(crewRole));
  }

  function stampaRapportino() {
    // IMPORTANTISSIMO: assicurati che la navbar / layout siano marcati
    // con la classe "no-print" per non stampare il resto del sito.
    window.print();
  }

  // ------------------------------------------------------------------------

  return (
    <div className="flex justify-center py-8 px-2">
      <div className="bg-white shadow-md rounded-md px-8 py-6 w-full max-w-6xl">
        {/* Area stampabile: la vera "pagina" A4 */}
        <div id="rapportino-print-area" className="rapportino-table">
          {/* Intestazione */}
          <div className="flex flex-col items-center mb-4">
            <div className="text-sm mb-2">
              {/* riga superiore con costr / commessa */}
              <div className="flex justify-between mb-1">
                <div className="flex gap-2">
                  <span className="font-semibold">COSTR.:</span>
                  <input
                    type="text"
                    value={costr}
                    onChange={(e) => setCostr(e.target.value.toUpperCase())}
                    className="border-b border-slate-400 focus:outline-none px-1 text-xs"
                    style={{ minWidth: "5rem" }}
                  />
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold">COMMESSA:</span>
                  <input
                    type="text"
                    value={commessa}
                    onChange={(e) =>
                      setCommessa(e.target.value.toUpperCase())
                    }
                    className="border-b border-slate-400 focus:outline-none px-1 text-xs"
                    style={{ minWidth: "4rem" }}
                  />
                </div>
              </div>

              {/* riga con capo squadra / data */}
              <div className="flex justify-between mt-1">
                <div className="flex gap-2">
                  <span className="font-semibold">Capo Squadra:</span>
                  <input
                    type="text"
                    value={capoSquadra}
                    onChange={(e) =>
                      setCapoSquadra(e.target.value.toUpperCase())
                    }
                    className="border-b border-slate-400 focus:outline-none px-1 text-xs"
                    style={{ minWidth: "10rem" }}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-semibold">DATA:</span>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="border border-slate-400 rounded px-1 text-xs"
                  />
                </div>
              </div>
            </div>

            <h1 className="text-lg font-semibold mt-2 mb-1">
              Rapportino Giornaliero – {titoloRole}
            </h1>
          </div>

          {/* Stato (solo testo, come etichetta) */}
          <div className="flex justify-end mb-2 text-xs">
            <span className="font-semibold mr-1">Stato:</span>
            <span>{stato}</span>
          </div>

          {/* Tabella principale */}
          <div className="border border-slate-700 rapportino-header-border">
            <div className="grid grid-cols-[1.4fr,3fr,2fr,1.6fr,1.4fr,1.4fr,2.3fr] text-xs font-semibold text-center">
              <div className="border-r border-slate-700 py-1">CATEGORIA</div>
              <div className="border-r border-slate-700 py-1">
                DESCRIZIONE ATTIVITA'
              </div>
              <div className="border-r border-slate-700 py-1">OPERATORE</div>
              <div className="border-r border-slate-700 py-1">
                Tempo
                <br />
                impiegato
              </div>
              <div className="border-r border-slate-700 py-1">PREVISTO</div>
              <div className="border-r border-slate-700 py-1">PRODOTTO</div>
              <div className="py-1">NOTE</div>
            </div>

            {/* Righe */}
            {righe.map((riga, index) => (
              <div
                key={index}
                className="grid grid-cols-[1.4fr,3fr,2fr,1.6fr,1.4fr,1.4fr,2.3fr] text-xs min-h-[40px]"
              >
                <div className="border-t border-r border-slate-700">
                  <textarea
                    value={riga.categoria}
                    onChange={(e) =>
                      aggiornaCella(index, "categoria", e.target.value)
                    }
                    className="w-full h-full resize-none px-1 py-0.5 focus:outline-none"
                  />
                </div>

                <div className="border-t border-r border-slate-700">
                  <textarea
                    value={riga.descrizione}
                    onChange={(e) =>
                      aggiornaCella(index, "descrizione", e.target.value)
                    }
                    className="w-full h-full resize-none px-1 py-0.5 focus:outline-none"
                  />
                </div>

                <div className="border-t border-r border-slate-700">
                  <textarea
                    value={riga.operatori}
                    onChange={(e) =>
                      aggiornaCella(index, "operatori", e.target.value)
                    }
                    placeholder="Una riga per operatore"
                    className="w-full h-full resize-none px-1 py-0.5 focus:outline-none"
                  />
                </div>

                <div className="border-t border-r border-slate-700">
                  <textarea
                    value={riga.tempo}
                    onChange={(e) =>
                      aggiornaCella(index, "tempo", e.target.value)
                    }
                    placeholder="Stesse righe degli operatori"
                    className="w-full h-full resize-none px-1 py-0.5 focus:outline-none"
                  />
                </div>

                <div className="border-t border-r border-slate-700 flex items-stretch">
                  <input
                    type="number"
                    step="0.1"
                    value={riga.previsto}
                    onChange={(e) =>
                      aggiornaCella(index, "previsto", e.target.value)
                    }
                    className="w-full px-1 py-0.5 focus:outline-none"
                  />
                </div>

                <div className="border-t border-r border-slate-700 flex items-stretch">
                  <input
                    type="number"
                    step="0.1"
                    value={riga.prodotto}
                    onChange={(e) =>
                      aggiornaCella(index, "prodotto", e.target.value)
                    }
                    className="w-full px-1 py-0.5 focus:outline-none"
                  />
                </div>

                <div className="border-t border-slate-700 flex items-stretch">
                  <textarea
                    value={riga.note}
                    onChange={(e) =>
                      aggiornaCella(index, "note", e.target.value)
                    }
                    className="w-full h-full resize-none px-1 py-0.5 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Totale prodotto */}
          <div className="flex justify-end mt-2 text-xs">
            <span className="font-semibold mr-1">Prodotto totale:</span>
            <span>{prodottoTotale}</span>
          </div>
        </div>

        {/* Azioni (NON stampate) */}
        <div className="mt-4 flex flex-wrap gap-3 items-center justify-between no-print">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={nuovaGiornata}
              className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-100"
            >
              Nuova giornata
            </button>
            <button
              type="button"
              onClick={aggiungiRiga}
              className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-100"
            >
              + Aggiungi riga
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={salvaRapportino}
              disabled={salvando}
              className="px-4 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {salvando ? "Salvataggio..." : "Salva rapportino"}
            </button>
            <button
              type="button"
              onClick={stampaRapportino}
              className="px-4 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-100"
            >
              Stampa / PDF
            </button>
          </div>
        </div>

        {/* Messaggi */}
        {caricando && (
          <p className="mt-3 text-xs text-slate-500 no-print">
            Caricamento del rapportino…
          </p>
        )}
        {errore && (
          <p className="mt-2 text-xs text-red-600 no-print">{errore}</p>
        )}
      </div>
    </div>
  );
}

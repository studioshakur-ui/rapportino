// src/components/RapportinoSheet.jsx
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";


// Templates di righe per ogni tipo squadra (stessa struttura colonne)
const TEMPLATE_RIGHE = {
  ELETTRICISTA: [
    { categoria: "STESURA", descrizione: "STESURA" },
    { categoria: "STESURA", descrizione: "FASCETTATURA CAVI" },
    { categoria: "STESURA", descrizione: "RIPRESA CAVI" },
    { categoria: "STESURA", descrizione: "VARI STESURA CAVI" },
  ],
  MONTAGGIO: [
    {
      categoria: "IMBARCHI",
      descrizione: "VARI IMBARCHI (LOGISTICA E TRASPORTO)",
    },
    {
      categoria: "MONTAGGIO",
      descrizione: "MONTAGGIO APPARECCHIATURA MINORE DI 50 KG",
    },
    {
      categoria: "MONTAGGIO",
      descrizione: "MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG",
    },
    {
      categoria: "MONTAGGIO",
      descrizione: "MONTAGGIO APPARECCHIATURA DA 151 KG A 400 KG",
    },
    {
      categoria: "MONTAGGIO",
      descrizione: "MONTAGGIO APPARECCHIATURA DA 401 KG A 1400 KG",
    },
  ],
  CARPENTERIA: [
    {
      categoria: "CARPENTERIA",
      descrizione: "PREPARAZIONE STAFFE SOLETTE/STRADE CAVI MAGAZZINO",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "SALDATURA STAFFE STRADE CAVI",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "MONTAGGIO STRADE CAVI",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "SALDATURA TONDINI",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "SALDATURA BASAMENTI (APPARECCHIATURE)",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "TRACCIATURA KIEPE/COLLARI",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "SALDATURA KIEPE/COLLARI",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "MOLATURA KIEPE",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "MOLATURA STAFFE, TONDINI, BASAMENTI",
    },
    {
      categoria: "CARPENTERIA",
      descrizione: "VARIE CARPENTERIE",
    },
  ],
};

// Utility: oggi in formato YYYY-MM-DD
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Utility: formato italiano DD/MM/YYYY
function formatItalianDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export default function RapportinoSheet({ crewRole }) {
  const [session, setSession] = useState(null);

  const [data, setData] = useState(todayISO());
  const [costr, setCostr] = useState("6368");
  const [commessa, setCommessa] = useState("SDC");
  const [capoSquadra, setCapoSquadra] = useState("");
  const [stato, setStato] = useState("DRAFT");

  const [righe, setRighe] = useState([]);
  const [rapportinoId, setRapportinoId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState(null);

  // Titolo per tipo squadra
  const titoloRuolo = useMemo(() => {
    switch (crewRole) {
      case "ELETTRICISTA":
        return "ELETTRICISTA";
      case "MONTAGGIO":
        return "MONTAGGIO";
      case "CARPENTERIA":
        return "CARPENTERIA";
      default:
        return crewRole || "";
    }
  }, [crewRole]);

  // Calcolo prodotto totale
  const prodottoTotale = useMemo(() => {
    return righe.reduce((sum, r) => {
      const v = Number(r.prodotto);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }, [righe]);

  // Inizializza sessione e carica rapporto del giorno
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoading(true);
      setErrore(null);

      const { data: authData, error: authError } =
        await supabase.auth.getSession();

      if (authError) {
        console.error(authError);
        if (!isMounted) return;
        setErrore("Errore di autenticazione.");
        setLoading(false);
        return;
      }

      const sess = authData?.session || null;
      if (!isMounted) return;

      setSession(sess);

      if (!sess) {
        setErrore("Sessione non trovata. Effettua di nuovo il login.");
        setLoading(false);
        return;
      }

      await caricaRapportino(sess.user.id, data, crewRole, isMounted);
      setLoading(false);
    }

    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewRole]);

  // Se cambia la data, ricarichiamo il rapporto di quella data
  useEffect(() => {
    if (!session) return;
    let isMounted = true;

    async function reload() {
      setLoading(true);
      setErrore(null);
      await caricaRapportino(session.user.id, data, crewRole, isMounted);
      setLoading(false);
    }

    reload();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function caricaRapportino(userId, dataISO, role, isMountedFlag) {
    try {
      // Proviamo a prendere il rapportino esistente
      const { data: raprows, error: rapError } = await supabase
        .from("rapportini")
        .select("*")
        .eq("capo_id", userId)
        .eq("data", dataISO)
        .eq("role", role)
        .maybeSingle();

      if (rapError && rapError.code !== "PGRST116") {
        console.error(rapError);
        if (isMountedFlag) {
          setErrore("Errore durante il caricamento del rapportino.");
        }
        // In caso di errore non blocchiamo la compilazione: usiamo template locale
        inizializzaNuovoRapportino(role);
        return;
      }

      if (!raprows) {
        // Nessun rapportino salvato: template vuoto
        inizializzaNuovoRapportino(role);
        return;
      }

      if (!isMountedFlag) return;

      setRapportinoId(raprows.id || null);
      setCostr(raprows.costr || "6368");
      setCommessa(raprows.commessa || "SDC");
      setCapoSquadra(raprows.capo_squadra || "");
      setStato(raprows.stato || "DRAFT");

      // Carichiamo le righe
      const { data: righeData, error: righeError } = await supabase
        .from("rapportino_rows")
        .select("*")
        .eq("rapportino_id", raprows.id)
        .order("row_index", { ascending: true });

      if (righeError) {
        console.error(righeError);
        setErrore("Errore durante il caricamento delle righe.");
        inizializzaNuovoRapportino(role);
        return;
      }

      if (righeData && righeData.length > 0) {
        setRighe(
          righeData.map((r) => ({
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
        inizializzaNuovoRapportino(role);
      }
    } catch (e) {
      console.error(e);
      if (isMountedFlag) {
        setErrore(
          "Errore imprevisto durante il caricamento del rapportino."
        );
        inizializzaNuovoRapportino(role);
      }
    }
  }

  function inizializzaNuovoRapportino(role) {
    const base =
      TEMPLATE_RIGHE[role] ||
      TEMPLATE_RIGHE.ELETTRICISTA ||
      [];

    setRapportinoId(null);
    setStato("DRAFT");
    setRighe(
      base.map((r) => ({
        categoria: r.categoria,
        descrizione: r.descrizione,
        operatori: "",
        tempo: "",
        previsto: "",
        prodotto: "",
        note: "",
      }))
    );
  }

  function handleCambiaData(e) {
    setData(e.target.value);
  }

  function handleNuovaGiornata() {
    setData(todayISO());
    inizializzaNuovoRapportino(crewRole);
  }

  function handleCambiaRiga(index, campo, valore) {
    setRighe((current) =>
      current.map((r, i) =>
        i === index
          ? {
              ...r,
              [campo]: valore,
            }
          : r
      )
    );
  }

  function handleAggiungiRiga() {
    setRighe((current) => [
      ...current,
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

  function handleRimuoviRiga(index) {
    setRighe((current) => current.filter((_, i) => i !== index));
  }

  async function handleSalva() {
    if (!session) return;
    setSaving(true);
    setErrore(null);

    try {
      const payloadRapportino = {
        capo_id: session.user.id,
        data,
        role: crewRole,
        costr,
        commessa,
        capo_squadra: capoSquadra,
        stato,
        prodotto_totale: prodottoTotale,
      };

      const { data: rapData, error: rapError } = await supabase
        .from("rapportini")
        .upsert(payloadRapportino, {
          onConflict: "capo_id,data,role",
          ignoreDuplicates: false,
        })
        .select()
        .maybeSingle();

      if (rapError) {
        console.error(rapError);
        setErrore(
          "Errore durante il salvataggio del rapportino. Puoi comunque continuare a scrivere, ma il salvataggio potrebbe non riuscire."
        );
        setSaving(false);
        return;
      }

      const id = rapData?.id;
      setRapportinoId(id);

      // Sostituiamo tutte le righe del rapportino con lo stato corrente
      await supabase
        .from("rapportino_rows")
        .delete()
        .eq("rapportino_id", id);

      const righePayload = righe.map((r, index) => ({
        rapportino_id: id,
        row_index: index,
        categoria: r.categoria || null,
        descrizione: r.descrizione || null,
        operatori: r.operatori || null,
        tempo: r.tempo || null,
        previsto:
          r.previsto === "" || r.previsto === null
            ? null
            : Number(r.previsto),
        prodotto:
          r.prodotto === "" || r.prodotto === null
            ? null
            : Number(r.prodotto),
        note: r.note || null,
      }));

      const { error: righeError } = await supabase
        .from("rapportino_rows")
        .insert(righePayload);

      if (righeError) {
        console.error(righeError);
        setErrore(
          "Rapporto salvato parzialmente: errore durante il salvataggio delle righe."
        );
        setSaving(false);
        return;
      }

      setErrore(null);
      setSaving(false);
    } catch (e) {
      console.error(e);
      setErrore(
        "Errore imprevisto durante il salvataggio del rapportino."
      );
      setSaving(false);
    }
  }

  function handleStampa() {
    window.print();
  }

  if (loading && !session) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-700">
        Caricamento in corso…
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-8">
      <div className="bg-white shadow-lg rounded-2xl px-8 py-6 w-full max-w-6xl rapportino-table no-print">
        {/* Intestazione tipo documento */}
        <h1 className="text-center text-xl font-semibold mb-4">
          Rapportino Giornaliero – {titoloRuolo}
        </h1>

        {/* RIGA EN-TÊTE */}
        <div className="grid grid-cols-12 gap-4 text-sm mb-4">
          <div className="col-span-3">
            <div className="flex items-center">
              <span className="mr-2 font-semibold">Costr.:</span>
              <input
                type="text"
                className="border-b border-slate-400 flex-1 px-1 py-0.5 text-sm"
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
              />
            </div>
          </div>

          <div className="col-span-3">
            <div className="flex items-center">
              <span className="mr-2 font-semibold">Capo Squadra:</span>
              <input
                type="text"
                className="border-b border-slate-400 flex-1 px-1 py-0.5 text-sm uppercase"
                value={capoSquadra}
                onChange={(e) => setCapoSquadra(e.target.value)}
              />
            </div>
          </div>

          <div className="col-span-2">
            <div className="flex items-center">
              <span className="mr-2 font-semibold">Commessa:</span>
              <input
                type="text"
                className="border-b border-slate-400 flex-1 px-1 py-0.5 text-sm"
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
              />
            </div>
          </div>

          <div className="col-span-2">
            <div className="flex items-center">
              <span className="mr-2 font-semibold">Data:</span>
              <input
                type="date"
                className="border border-slate-400 rounded px-2 py-1 text-sm"
                value={data}
                onChange={handleCambiaData}
              />
            </div>
          </div>

          <div className="col-span-2 flex items-center justify-end space-x-2">
            <span className="px-3 py-1 border border-slate-400 rounded-full text-xs font-semibold">
              {stato}
            </span>
          </div>
        </div>

        {/* Pulsanti azione */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleNuovaGiornata}
            className="px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50"
          >
            Nuova giornata
          </button>

          <div className="space-x-2">
            <button
              type="button"
              onClick={handleSalva}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Salvataggio…" : "Salva rapportino"}
            </button>
            <button
              type="button"
              onClick={handleStampa}
              className="px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50"
            >
              Stampa / Esporta PDF
            </button>
          </div>
        </div>

        {/* TABELLA RAPPORTO – stesse colonne del cartaceo */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm rapportino-header-border border border-slate-500">
            <thead>
              <tr className="text-center">
                <th className="rapportino-border border border-slate-500 px-2 py-1 w-32">
                  CATEGORIA
                </th>
                <th className="rapportino-border border border-slate-500 px-2 py-1">
                  DESCRIZIONE ATTIVITÀ
                </th>
                <th className="rapportino-border border border-slate-500 px-2 py-1 w-40">
                  OPERATORE
                </th>
                <th className="rapportino-border border border-slate-500 px-2 py-1 w-40">
                  TEMPO IMPIEGATO
                </th>
                <th className="rapportino-border border border-slate-500 px-2 py-1 w-24">
                  PREVISTO
                </th>
                <th className="rapportino-border border border-slate-500 px-2 py-1 w-24">
                  PRODOTTO
                </th>
                <th className="rapportino-border border border-slate-500 px-2 py-1 w-48">
                  NOTE
                </th>
                <th className="rapportino-border border border-slate-500 px-2 py-1 w-8">
                  -
                </th>
              </tr>
            </thead>
            <tbody>
              {righe.map((riga, index) => (
                <tr key={index} className="align-top">
                  <td className="rapportino-border border border-slate-500 p-0">
                    <textarea
                      className="w-full h-16 resize-y px-2 py-1 text-sm focus:outline-none"
                      value={riga.categoria}
                      onChange={(e) =>
                        handleCambiaRiga(index, "categoria", e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border border-slate-500 p-0">
                    <textarea
                      className="w-full h-16 resize-y px-2 py-1 text-sm focus:outline-none"
                      value={riga.descrizione}
                      onChange={(e) =>
                        handleCambiaRiga(index, "descrizione", e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border border-slate-500 p-0">
                    <textarea
                      className="w-full h-16 resize-y px-2 py-1 text-sm focus:outline-none"
                      placeholder="Una riga per operatore"
                      value={riga.operatori}
                      onChange={(e) =>
                        handleCambiaRiga(index, "operatori", e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border border-slate-500 p-0">
                    <textarea
                      className="w-full h-16 resize-y px-2 py-1 text-sm focus:outline-none"
                      placeholder="Stesse righe degli operatori"
                      value={riga.tempo}
                      onChange={(e) =>
                        handleCambiaRiga(index, "tempo", e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border border-slate-500 p-0">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full px-2 py-1 text-sm focus:outline-none"
                      value={riga.previsto}
                      onChange={(e) =>
                        handleCambiaRiga(index, "previsto", e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border border-slate-500 p-0">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full px-2 py-1 text-sm focus:outline-none"
                      value={riga.prodotto}
                      onChange={(e) =>
                        handleCambiaRiga(index, "prodotto", e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border border-slate-500 p-0">
                    <textarea
                      className="w-full h-16 resize-y px-2 py-1 text-sm focus:outline-none"
                      value={riga.note}
                      onChange={(e) =>
                        handleCambiaRiga(index, "note", e.target.value)
                      }
                    />
                  </td>
                  <td className="rapportino-border border border-slate-500 p-0 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => handleRimuoviRiga(index)}
                      className="text-red-500 text-lg leading-none px-2"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pulsante aggiungi riga + totale */}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAggiungiRiga}
            className="px-3 py-1.5 rounded-md border border-slate-300 text-sm hover:bg-slate-50"
          >
            + Aggiungi riga
          </button>

          <div className="text-sm">
            Prodotto totale:{" "}
            <span className="font-semibold">{prodottoTotale}</span>
          </div>
        </div>

        {/* Messaggio di errore */}
        {errore && (
          <div className="mt-4 text-sm text-red-600">
            {errore}
          </div>
        )}

        {/* Info piccola in basso */}
        <div className="mt-4 text-[11px] text-slate-500">
          Data corrente: {formatItalianDate(data)}
        </div>
      </div>
    </div>
  );
}

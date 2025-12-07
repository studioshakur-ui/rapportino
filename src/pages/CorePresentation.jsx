// src/pages/CorePresentation.jsx
import React from "react";

export default function CorePresentation() {
  const sections = [
    {
      id: "problema",
      label: "01",
      title: "Il problema reale",
      body: (
        <>
          <p className="text-xs text-slate-200 mb-2">
            Oggi il controllo in CONIT è già forte in ufficio (Navemaster,
            Excel, report). Il punto fragile è il modo in cui nasce il dato
            sul campo.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Dati che arrivano tardi o già filtrati.</li>
            <li>Riscritture tra Capo, ufficio e direzione.</li>
            <li>Ricostruzioni a posteriori quando c’è un problema.</li>
          </ul>
          <p className="text-[11px] text-sky-300 mt-2">
            Il rischio non è nel controllo, ma nel momento in cui il dato nasce
            male.
          </p>
        </>
      ),
    },
    {
      id: "ruolo-core",
      label: "02",
      title: "Dove si inserisce CORE",
      body: (
        <>
          <p className="text-xs text-slate-200 mb-2">
            CORE non sostituisce il sistema CONIT. Si inserisce prima,
            alla sorgente del dato.
          </p>
          <div className="text-[11px] text-slate-300 mb-2">
            <div>CAPO → <span className="text-sky-300 font-semibold">CORE</span> → UFFICIO → NAVEMASTER → DIREZIONE</div>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Il Capo scrive una volta sola in modo strutturato.</li>
            <li>L’ufficio non riscrive: controlla e valida.</li>
            <li>La direzione vede numeri già puliti, senza reinterpretazioni.</li>
          </ul>
        </>
      ),
    },
    {
      id: "cosa-fa",
      label: "03",
      title: "Cosa fa oggi, concretamente",
      body: (
        <>
          <p className="text-xs text-slate-200 mb-2">
            CORE non è un prototipo: oggi copre già il flusso base
            del lavoro operativo.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Rapportini giornalieri squadre / attività / ore / note.</li>
            <li>Storico rapportini in Archivio (consultazione veloce).</li>
            <li>Lettura INCA: tratte, metri, stato avanzamento.</li>
            <li>Allineamento naturale tra campo, ufficio e direzione.</li>
          </ul>
          <p className="text-[11px] text-emerald-300 mt-2">
            È già un sistema vivo, usabile oggi, non una presentazione teorica.
          </p>
        </>
      ),
    },
    {
      id: "cosa-toglie",
      label: "04",
      title: "Cosa toglie dalle spalle",
      body: (
        <>
          <p className="text-xs text-slate-200 mb-2">
            L’obiettivo non è “aggiungere un software”, ma togliere lavoro
            inutile e rischio di errore.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Fine delle riscritture dei rapportini.</li>
            <li>Meno messaggi di correzione tra Capo e ufficio.</li>
            <li>Meno ricostruzioni a fine settimana o fine mese.</li>
            <li>Più chiarezza su costr, commessa, ore e attività.</li>
          </ul>
          <p className="text-[11px] text-rose-300 mt-2">
            Meno rumore operativo, più controllo reale.
          </p>
        </>
      ),
    },
    {
      id: "inca",
      label: "05",
      title: "INCA e percorso reale",
      body: (
        <>
          <p className="text-xs text-slate-200 mb-2">
            Oggi l’INCA è un riferimento tecnico. Con CORE diventa
            collegato al lavoro reale sul cantiere.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Tratte e metri leggibili, zona per zona.</li>
            <li>Possibilità di confronto teorico / reale.</li>
            <li>Base per il controllo della posa cavi ("Percorso").</li>
          </ul>
          <p className="text-[11px] text-sky-300 mt-2">
            Dal disegno al metro realmente posato: questa è la direzione.
          </p>
        </>
      ),
    },
    {
      id: "test",
      label: "06",
      title: "Come provarlo senza rischi",
      body: (
        <>
          <p className="text-xs text-slate-200 mb-2">
            L’idea non è cambiare subito il modo di lavorare di tutti.
            È provare in modo silenzioso su un perimetro controllato.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Una nave o una parte di nave.</li>
            <li>Nessun cambiamento per le squadre sul campo.</li>
            <li>Nessun doppio lavoro per l’ufficio.</li>
            <li>Due settimane di osservazione reale.</li>
          </ul>
          <p className="text-[11px] text-emerald-300 mt-2">
            Se non toglie lavoro dalle spalle, si spegne. Punto.
          </p>
        </>
      ),
    },
    {
      id: "cornice",
      label: "07",
      title: "Cornice chiara per CONIT",
      body: (
        <>
          <p className="text-xs text-slate-200 mb-2">
            Questa presentazione è dedicata a CONIT e alla realtà dei cantieri
            navali dove già lavoriamo.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Nessun vincolo automatico, nessun impegno commerciale.</li>
            <li>Osservazione, numeri e problemi reali al centro.</li>
            <li>Priorità: ridurre i problemi operativi, non creare lavoro nuovo.</li>
          </ul>
        </>
      ),
    },
    {
      id: "conclusione",
      label: "08",
      title: "Conclusione operativa",
      body: (
        <>
          <p className="text-xs text-slate-200 mb-2">
            CORE non è un progetto, non è una promessa, non è una startup.
          </p>
          <p className="text-[11px] text-slate-300">
            È uno strumento operativo: o riduce i problemi sul campo e
            in ufficio, oppure non ha senso usarlo.
          </p>
          <p className="text-[11px] text-sky-300 mt-3">
            Questo è il criterio con cui va giudicato.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="mb-2">
        <div className="text-[10px] uppercase tracking-[0.22em] text-sky-400 mb-1">
          CORE · Presentazione operativa per CONIT
        </div>
        <h1 className="text-sm sm:text-base font-semibold text-slate-50">
          Come CORE si inserisce nel modo di lavorare di CONIT
        </h1>
        <p className="text-[11px] text-slate-400 mt-1 max-w-2xl">
          Questa pagina non è marketing. Riassume in modo concreto dove
          CORE interviene, cosa fa oggi e come può essere provato in modo
          controllato, senza cambiare le abitudini del cantiere.
        </p>
      </header>

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.id}
            className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 shadow-sm"
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Sezione {section.label}
              </span>
            </div>
            <h2 className="text-xs sm:text-[13px] font-semibold text-slate-50 mb-2">
              {section.title}
            </h2>
            {section.body}
          </section>
        ))}
      </div>
    </div>
  );
}

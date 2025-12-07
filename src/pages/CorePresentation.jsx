// src/pages/CorePresentation.jsx
import React from "react";

export default function CorePresentation() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* HERO IMPACT */}
      <section className="relative z-10 px-6 md:px-10 py-16 md:py-24 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.38em] text-sky-400 mb-4">
            CORE · PRESENTAZIONE OPERATIVA PER CONIT
          </div>

          <h1 className="text-4xl md:text-6xl xl:text-7xl font-bold leading-tight mb-6">
            IL DATO NASCE SUL CAMPO.
            <br />
            <span className="text-sky-400">
              È LÌ CHE SI VINCE O SI PERDE IL CONTROLLO.
            </span>
          </h1>

          <p className="max-w-3xl text-base md:text-lg text-slate-300">
            CORE non è una promessa. È una macchina operativa che intercetta il
            dato nel momento esatto in cui nasce, prima che venga riscritto,
            reinterpretato o perso.
          </p>
        </div>
      </section>

      {/* BLOCCO 1 – IL PROBLEMA */}
      <section className="px-6 md:px-10 py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500 mb-3">
              PROBLEMA STRUTTURALE
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Il controllo in ufficio è forte.
              <br />
              <span className="text-rose-400">Il rischio è prima.</span>
            </h2>
            <p className="text-lg text-slate-300 max-w-xl mb-4">
              Quando il dato arriva in ufficio, è già il risultato di:
            </p>
            <ul className="text-sm md:text-base text-slate-300 space-y-1 list-disc list-inside">
              <li>appunti diversi tra loro,</li>
              <li>memoria del Capo,</li>
              <li>messaggi vocali, foto, correzioni a catena.</li>
            </ul>
            <p className="mt-4 text-sm text-slate-400 max-w-xl">
              Il controllo finale resta forte, ma deve continuamente ricostruire
              qualcosa che non nasce mai uniforme.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
              <div className="text-4xl font-bold text-rose-400 mb-2">+30%</div>
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                TEMPO PERSO IN RICOSTRUZIONI
              </div>
              <p className="text-[11px] text-slate-400">
                Settimana dopo settimana, il tempo di chi controlla viene
                mangiato da ricostruzioni a posteriori.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
              <div className="text-4xl font-bold text-rose-400 mb-2">∞</div>
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                CORREZIONI CAPO ⇄ UFFICIO
              </div>
              <p className="text-[11px] text-slate-400">
                Correzioni continue via telefono, messaggi e fogli Excel
                modificati all’ultimo minuto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCCO 2 – POSIZIONE DI CORE */}
      <section className="px-6 md:px-10 py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500 mb-3">
            POSIZIONE STRATEGICA
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            CORE SI INSERISCE IN UN SOLO PUNTO:
          </h2>
          <h3 className="text-2xl md:text-3xl font-semibold text-sky-300 mb-10">
            CAPO → <span className="text-sky-400">CORE</span> → UFFICIO →
            NAVEMASTER → DIREZIONE
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-2xl font-semibold mb-3 text-sky-400">
                1 SOLO INSERIMENTO
              </h3>
              <p className="text-slate-300 text-sm">
                Il Capo inserisce attività, ore e note in modo guidato, senza
                dover riscrivere o improvvisare a fine giornata.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-2xl font-semibold mb-3 text-sky-400">
                0 RISCRITTURE
              </h3>
              <p className="text-slate-300 text-sm">
                L’Ufficio vede il dato così com’è nato, lo controlla e lo
                valida. Non deve più riscriverlo da zero.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-2xl font-semibold mb-3 text-sky-400">
                NUMERI PULITI
              </h3>
              <p className="text-slate-300 text-sm">
                La Direzione riceve numeri coerenti con il cantiere reale,
                senza dover interpretare mille versioni diverse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCCO 3 – COSA FA OGGI */}
      <section className="px-6 md:px-10 py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-10">
            CORE È GIÀ OPERATIVO OGGI.
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-5xl font-bold text-emerald-400 mb-2">✓</div>
              <div className="uppercase text-xs tracking-widest text-slate-400 mb-1">
                RAPPORTINI
              </div>
              <div className="text-slate-200 text-sm">
                Squadre, attività, ore, note di ritorno.
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-5xl font-bold text-emerald-400 mb-2">✓</div>
              <div className="uppercase text-xs tracking-widest text-slate-400 mb-1">
                ARCHIVIO
              </div>
              <div className="text-slate-200 text-sm">
                Storico immediato, consultabile per data, commessa, costr.
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-5xl font-bold text-emerald-400 mb-2">✓</div>
              <div className="uppercase text-xs tracking-widest text-slate-400 mb-1">
                INCA
              </div>
              <div className="text-slate-200 text-sm">
                Tratte, metri, confronto teorico / reale (base già presente).
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-5xl font-bold text-emerald-400 mb-2">✓</div>
              <div className="uppercase text-xs tracking-widest text-slate-400 mb-1">
                ALLINEAMENTO
              </div>
              <div className="text-slate-200 text-sm">
                Campo, Ufficio e Direzione guardano la stessa versione del
                lavoro.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCCO 4 – COME SI TESTA */}
      <section className="px-6 md:px-10 py-20 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-10">
            TEST REALE. RISCHIO ZERO.
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8">
              <div className="text-6xl font-bold text-sky-400 mb-3">1</div>
              <p className="text-slate-200 text-sm">
                Nave, o una parte di nave, scelta da CONIT.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8">
              <div className="text-6xl font-bold text-sky-400 mb-3">0</div>
              <p className="text-slate-200 text-sm">
                Cambiamenti per le squadre sul campo: continuano a lavorare
                come oggi.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8">
              <div className="text-6xl font-bold text-sky-400 mb-3">14</div>
              <p className="text-slate-200 text-sm">
                Giorni di osservazione reale: niente teoria, solo dati concreti.
              </p>
            </div>
          </div>

          <p className="mt-12 text-xl text-slate-300">
            Se{" "}
            <span className="text-emerald-400 font-semibold">
              non toglie lavoro dalle spalle
            </span>
            ,{" "}
            <span className="text-rose-400 font-semibold">si spegne.</span>{" "}
            Punto.
          </p>
        </div>
      </section>

      {/* BLOCCO 5 – RESPONSABILITÀ */}
      <section className="px-6 md:px-10 py-16 border-b border-slate-800">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500 mb-3">
              RESPONSABILITÀ
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              CORE non è un esperimento.
            </h2>
            <p className="text-sm md:text-base text-slate-300">
              Ha responsabilità chiare: tecnica, operativa e di sistema. Non è
              un progetto appoggiato su “buona volontà”, ma uno strumento
              che deve rispondere a standard industriali.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                RESPONSABILITÀ TECNICA
              </div>
              <p className="text-[13px] text-slate-200">
                Garantire che il flusso di inserimento dati sia coerente con il
                lavoro reale del cantiere, senza scorciatoie.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                RESPONSABILITÀ OPERATIVA
              </div>
              <p className="text-[13px] text-slate-200">
                Assicurare che il sistema non crei lavoro doppio, non rallenti
                i Capi e non appesantisca l’Ufficio.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                RESPONSABILITÀ DI SISTEMA
              </div>
              <p className="text-[13px] text-slate-200">
                Garantire stabilità, continuità e tracciabilità dei dati nel
                tempo, senza dipendere da una singola persona.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCCO 6 – STRUTTURA TECNICA */}
      <section className="px-6 md:px-10 py-16 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500 mb-3">
            STRUTTURA TECNICA
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Non interessa la tecnologia, interessa la solidità.
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                DATI STRUTTURATI
              </div>
              <p className="text-[13px] text-slate-200">
                Ogni informazione (squadra, attività, ore, nave, costr, commessa)
                ha una posizione chiara, non esistono “campi liberi” critici.
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                STORICO TRACCIABILE
              </div>
              <p className="text-[13px] text-slate-200">
                Le modifiche vengono registrate. Non c’è cancellazione invisibile:
                ogni variazione lascia una traccia.
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                RUOLI E PERMESSI
              </div>
              <p className="text-[13px] text-slate-200">
                Capo, Ufficio e Direzione non vedono né modificano le stesse
                cose. I permessi sono separati per ruolo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCCO 7 – LIMITI CHIARI */}
      <section className="px-6 md:px-10 py-16 border-b border-slate-800">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500 mb-3">
              LIMITI CHIARI
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Sapere cosa non farà mai è una garanzia.
            </h2>
            <p className="text-sm md:text-base text-slate-300">
              Un sistema serio non dice solo cosa fa. Dice chiaramente cosa non
              farà mai, per non entrare in conflitto con i ruoli esistenti.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-[13px] text-slate-200">
                CORE non sostituisce i sistemi ufficiali di CONIT o Fincantieri.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-[13px] text-slate-200">
                CORE non decide al posto delle persone: non è un sistema di
                valutazione, ma di supporto operativo.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-[13px] text-slate-200">
                CORE non controlla le persone: controlla la coerenza dei dati,
                non il comportamento individuale.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-[13px] text-slate-200">
                CORE non entra nella parte commerciale o contabile: resta sul
                piano operativo del cantiere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCCO 8 – PATTO OPERATIVO */}
      <section className="px-6 md:px-10 py-24 border-t border-slate-800 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500 mb-3">
            PATTO OPERATIVO CON CONIT
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            CORE non chiede fiducia.
          </h2>
          <p className="text-lg text-slate-300 mb-4">
            Chiede solo di essere misurato sul campo, con criteri semplici:
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-left md:text-center mb-10">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                CRITERIO 1
              </div>
              <p className="text-[13px] text-slate-200">
                Meno tempo speso in ricostruzioni e correzioni tra Capo e
                Ufficio.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                CRITERIO 2
              </div>
              <p className="text-[13px] text-slate-200">
                Più chiarezza immediata su ore, costr, commesse e avanzamento.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                CRITERIO 3
              </div>
              <p className="text-[13px] text-slate-200">
                Nessun aumento di carico per le squadre e per l’Ufficio.
              </p>
            </div>
          </div>

          <p className="text-xl text-slate-300">
            Se questi tre criteri non migliorano, CORE non ha motivo di
            esistere. Se migliorano, diventa una base stabile su cui
            costruire il resto.
          </p>
        </div>
      </section>
    </div>
  );
}

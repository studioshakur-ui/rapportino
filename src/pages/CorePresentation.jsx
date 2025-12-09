import React from "react";

export default function CorePresentation() {
  return (
    <div className="min-h-screen bg-[#0a0f14] text-slate-100 px-6 py-14">
      <div className="max-w-7xl mx-auto space-y-28">

        {/* ========================= */}
        {/* HERO */}
        {/* ========================= */}
        <section className="space-y-6">
          <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
            CORE · Direzione
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            Radiografia del flusso reale <br /> cantiere → decisione
          </h1>
          <p className="max-w-3xl text-slate-400 text-sm">
            Confronto tra l’architettura operativa attuale e uno scenario con CORE.
            Nessun marketing. Nessuna promessa. Solo struttura.
          </p>
        </section>

        {/* ========================= */}
        {/* POSIZIONAMENTO SETTORE */}
        {/* ========================= */}
        <section className="space-y-8">
          <h2 className="text-3xl font-semibold">
            Livello di maturità digitale nel settore navale
          </h2>

          <div className="grid md:grid-cols-4 gap-6 text-sm">
            <div className="border border-slate-800 p-5 rounded-xl bg-[#0f1620]">
              <div className="text-slate-500 mb-2">1 · Processi manuali</div>
              <div className="text-slate-300">Dati frammentati, forte interpretazione</div>
            </div>

            <div className="border border-slate-800 p-5 rounded-xl bg-[#0f1620]">
              <div className="text-slate-500 mb-2">2 · Digitalizzazione parziale</div>
              <div className="text-slate-300">Excel locali, inserimenti multipli</div>
            </div>

            <div className="border border-sky-700/40 p-5 rounded-xl bg-sky-950/30">
              <div className="text-sky-400 mb-2">3 · Digitale strutturato</div>
              <div className="text-slate-200">
                Ufficio tecnico centrale, dati consolidati
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Livello attuale dell’azienda
              </div>
            </div>

            <div className="border border-emerald-700/40 p-5 rounded-xl bg-emerald-950/30">
              <div className="text-emerald-400 mb-2">4 · CORE</div>
              <div className="text-slate-200">
                Sincronizzazione diretta campo ↔ decisione
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-sm max-w-4xl">
            CORE non introduce un nuovo modo di lavorare. Rende continua la
            struttura digitale che oggi è già presente.
          </p>
        </section>

        {/* ========================= */}
        {/* RADIOGRAFIA FLUSSO */}
        {/* ========================= */}
        <section className="grid md:grid-cols-2 gap-16 items-start">
          
          {/* FLUSSO AZIENDA */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-slate-300">
              Architettura operativa attuale
            </h2>

            <div className="space-y-4 text-sm text-slate-400">
              <div>CAPO</div>
              <div className="ml-6">↓ Ufficio tecnico</div>
              <div className="ml-12">↓ Sistemi interni / tool</div>
              <div className="ml-20">↓ Elaborazione</div>
              <div className="ml-28">↓ Decisione</div>
            </div>

            <div className="space-y-2 text-[11px] text-amber-400">
              <div>• Inserimenti multipli</div>
              <div>• Interpretazioni locali</div>
              <div>• Ritardi di allineamento</div>
            </div>
          </div>

          {/* FLUSSO CORE */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-emerald-400">
              Scenario con CORE
            </h2>

            <div className="space-y-4 text-sm text-slate-200">
              <div>CAPO</div>
              <div className="ml-6 text-emerald-400">→ CORE</div>
              <div className="ml-12 text-emerald-400">→ INCA</div>
              <div className="ml-20 text-emerald-400">→ Decisione</div>
            </div>

            <div className="space-y-2 text-[11px] text-emerald-400">
              <div>• Inserimento unico</div>
              <div>• Dato nativo strutturato</div>
              <div>• Tracciabilità immediata</div>
            </div>
          </div>

        </section>

        {/* ========================= */}
        {/* FRASE CENTRALE */}
        {/* ========================= */}
        <section className="text-center py-20">
          <p className="text-4xl font-bold text-slate-100">
            Oggi l’informazione viene trasformata per circolare.<br />
            Con CORE l’informazione nasce già per decidere.
          </p>
        </section>

        {/* ========================= */}
        {/* CORE NON FA / CORE FA */}
        {/* ========================= */}
        <section className="grid md:grid-cols-2 gap-20">
          <div>
            <h3 className="text-xl font-semibold text-rose-400 mb-4">
              CORE NON FA
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Non sostituisce i capi</li>
              <li>• Non sostituisce l’ufficio</li>
              <li>• Non è un ERP</li>
              <li>• Non cambia l’organizzazione</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-emerald-400 mb-4">
              CORE FA
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• Riduce la pressione gestionale</li>
              <li>• Elimina conflitti di versione</li>
              <li>• Porta il campo dentro la decisione</li>
              <li>• Rende l’errore visibile subito</li>
            </ul>
          </div>
        </section>

        {/* ========================= */}
        {/* CHIUSURA */}
        {/* ========================= */}
        <section className="text-center pt-32 pb-12">
          <p className="text-3xl font-bold">
            CORE non è un software.<br />
            È un organo operativo.
          </p>
        </section>

      </div>
    </div>
  );
}

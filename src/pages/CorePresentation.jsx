// src/pages/CorePresentation.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const moduleData = [
  { name: "Rapportini", livello: 85 },
  { name: "INCA", livello: 90 },
  { name: "Archivio", livello: 80 },
  { name: "Direzione", livello: 75 },
];

export default function CorePresentation() {
  return (
    <div className="min-h-screen bg-[#050910] text-slate-100 px-4 sm:px-6 py-10 sm:py-14">
      <div className="max-w-7xl mx-auto space-y-20 sm:space-y-24">
        {/* ========================= */}
        {/* HERO */}
        {/* ========================= */}
        <section className="space-y-6">
          <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
            CORE · Direzione
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Radiografia del flusso reale
            <br className="hidden sm:block" /> cantiere → decisione
          </h1>
          <p className="max-w-3xl text-slate-400 text-sm sm:text-[13px] leading-relaxed">
            Confronto tra l’architettura operativa attuale e uno scenario con
            CORE. Nessun marketing. Nessuna promessa. Solo struttura del
            sistema.
          </p>
        </section>

        {/* ========================= */}
        {/* MATURITÀ SETTORE */}
        {/* ========================= */}
        <section className="space-y-8">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            Livello di maturità digitale nel settore navale
          </h2>

          <div className="grid md:grid-cols-4 gap-5 md:gap-6 text-sm">
            <div className="border border-slate-800/80 p-4 sm:p-5 rounded-xl bg-[#0b111b]">
              <div className="text-slate-500 mb-2 text-xs">
                1 · Processi manuali
              </div>
              <div className="text-slate-200">
                Dati frammentati, forte interpretazione locale, poca
                tracciabilità.
              </div>
            </div>

            <div className="border border-slate-800/80 p-4 sm:p-5 rounded-xl bg-[#0b111b]">
              <div className="text-slate-500 mb-2 text-xs">
                2 · Digitalizzazione parziale
              </div>
              <div className="text-slate-200">
                Excel, file locali, inserimenti ripetuti per ufficio e
                decisione.
              </div>
            </div>

            <div className="border border-sky-700/50 p-4 sm:p-5 rounded-xl bg-sky-950/30">
              <div className="text-sky-400 mb-2 text-xs">
                3 · Digitale strutturato
              </div>
              <div className="text-slate-50">
                Ufficio tecnico centrale, sistemi interni strutturati, dati
                consolidati.
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Livello raggiunto dall’azienda: struttura già presente e
                funzionante.
              </div>
            </div>

            <div className="border border-emerald-700/50 p-4 sm:p-5 rounded-xl bg-emerald-950/30">
              <div className="text-emerald-400 mb-2 text-xs">
                4 · CORE come organo operativo
              </div>
              <div className="text-slate-50">
                Colonna centrale che collega cantiere, ufficio, sistemi tecnici
                e Direzione sullo stesso dato nativo.
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-xs sm:text-sm max-w-4xl">
            CORE non sostituisce i sistemi esistenti. Rende continua la
            struttura digitale che oggi è già presente, riducendo
            trasformazioni e riletture dello stesso dato.
          </p>
        </section>

        {/* ========================= */}
        {/* MODULI CORE */}
        {/* ========================= */}
        <section className="space-y-8">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            Moduli operativi di CORE
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            CORE non è un singolo programma, ma un sistema di moduli che
            lavorano sullo stesso dato operativo: dal cantiere, all’ufficio,
            fino alla Direzione.
          </p>

          <div className="grid md:grid-cols-4 gap-4 md:gap-5 text-sm">
            {/* Rapportini */}
            <div className="rounded-xl border border-slate-800 bg-[#0b111b] p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-sky-400">
                Rapportini
              </div>
              <div className="text-slate-50 font-semibold">
                Origine del dato operativo
              </div>
              <p className="text-slate-400 text-xs">
                Qui nasce il dato di campo: ore, attività, squadre. Se è pulito
                qui, è affidabile ovunque.
              </p>
            </div>

            {/* INCA */}
            <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                INCA
              </div>
              <div className="text-slate-50 font-semibold">
                Allineamento esecuzione ↔ lista cavi
              </div>
              <p className="text-slate-400 text-xs">
                Il reale viene messo davanti al teorico: stato cavi,
                avanzamento, coerenza con le liste INCA.
              </p>
            </div>

            {/* Archivio */}
            <div className="rounded-xl border border-violet-800 bg-violet-950/20 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-violet-300">
                Archivio
              </div>
              <div className="text-slate-50 font-semibold">
                Memoria certificata del cantiere
              </div>
              <p className="text-slate-400 text-xs">
                I rapportini storici vengono conservati in modo ordinato,
                consultabili senza toccare l’operativo corrente.
              </p>
            </div>

            {/* Direzione */}
            <div className="rounded-xl border border-amber-700 bg-amber-950/20 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-amber-300">
                Direzione
              </div>
              <div className="text-slate-50 font-semibold">
                Visione sintetica per la decisione
              </div>
              <p className="text-slate-400 text-xs">
                La Direzione non deve ricostruire il dato. Legge una sintesi
                coerente dello stesso dato operativo.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Non esistono quattro strumenti. Esiste un solo dato che attraversa
            quattro funzioni.
          </p>
        </section>

        {/* ========================= */}
        {/* GRAFICO MODULI (RECHARTS + ANIMATION) */}
        {/* ========================= */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            Allineamento dei moduli sul dato reale
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            Valori indicativi per visualizzare quanto ogni modulo lavora in
            profondità sul dato nativo, senza copie o re-inserimenti.
          </p>

          <div className="h-64 w-full rounded-2xl border border-slate-800 bg-[#0b111b] px-3 sm:px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={moduleData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#e5e7eb", fontSize: 11 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={{ stroke: "#334155" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={{ stroke: "#334155" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    fontSize: 11,
                    color: "#e5e7eb",
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Bar
                  dataKey="livello"
                  radius={[6, 6, 0, 0]}
                  fill="#22c55e"
                  barSize={32}
                  // 🎬 Animation A/B : visible, propre, une seule fois
                  isAnimationActive={true}
                  animationDuration={800}
                  animationBegin={250}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ========================= */}
        {/* RADIOGRAFIA FLUSSO */}
        {/* ========================= */}
        <section className="grid md:grid-cols-2 gap-14 md:gap-16 items-start">
          {/* FLUSSO AZIENDA ATTUALE */}
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-200">
              Architettura operativa attuale
            </h2>

            <div className="space-y-3 text-xs sm:text-sm text-slate-400">
              <div>CAPO</div>
              <div className="ml-4">↓ Messaggi · foto · canali interni</div>
              <div className="ml-8">↓ Ufficio tecnico</div>
              <div className="ml-12">↓ Sistemi e strumenti interni</div>
              <div className="ml-16">↓ Decisione</div>
            </div>

            <div className="space-y-1.5 text-[11px] text-amber-400">
              <div>• Inserimenti multipli dello stesso dato</div>
              <div>• Interpretazioni locali legate all’esperienza</div>
              <div>• Allineamenti tra più livelli prima della decisione</div>
            </div>
          </div>

          {/* FLUSSO CON CORE */}
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-emerald-400">
              Scenario con CORE
            </h2>

            <div className="space-y-3 text-xs sm:text-sm text-slate-200">
              <div>CAPO</div>
              <div className="ml-4 text-emerald-400">→ CORE</div>
              <div className="ml-8 text-emerald-400">→ INCA</div>
              <div className="ml-12 text-emerald-400">
                → Sistemi / Decisione
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] text-emerald-400">
              <div>• Inserimento unico del dato operativo</div>
              <div>• Tracciabilità per ruolo, turno e nave</div>
              <div>• La stessa informazione arriva a ufficio e Direzione</div>
            </div>
          </div>
        </section>

        {/* ========================= */}
        {/* ARCHITETTURA TECNICA */}
        {/* ========================= */}
        <section className="space-y-8">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            Architettura tecnica di CORE
          </h2>

          <div className="grid md:grid-cols-4 gap-4 md:gap-5 text-xs sm:text-sm">
            {/* Interfaccia */}
            <div className="rounded-xl border border-slate-800 bg-[#0b111b] p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Interfaccia
              </div>
              <p className="text-slate-200">
                Applicazione web industriale, utilizzabile da ufficio e
                cantiere senza installazioni locali dedicate.
              </p>
            </div>

            {/* Dati */}
            <div className="rounded-xl border border-slate-800 bg-[#0b111b] p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Dati
              </div>
              <p className="text-slate-200">
                Database centrale strutturato: un solo punto di verità, storico
                completo e dato nativo riutilizzabile.
              </p>
            </div>

            {/* Sicurezza & Ruoli */}
            <div className="rounded-xl border border-slate-800 bg-[#0b111b] p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Sicurezza &amp; ruoli
              </div>
              <p className="text-slate-200">
                Accessi separati per CAPO, UFFICIO e DIREZIONE. Ogni profilo
                vede solo ciò che gli compete, con storico delle modifiche.
              </p>
            </div>

            {/* Evoluzione */}
            <div className="rounded-xl border border-slate-800 bg-[#0b111b] p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Evoluzione
              </div>
              <p className="text-slate-200">
                Sistema modulare: si può partire da un solo modulo, gli altri
                si innestano senza rifare l’impianto esistente.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            CORE può crescere senza dover essere rifatto. L’architettura è
            pensata per vivere anche oltre le persone che l’hanno avviata.
          </p>
        </section>

        {/* ========================= */}
        {/* CHIUSURA */}
        {/* ========================= */}
        <section className="text-center pt-12 pb-4">
          <p className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
            CORE non è un software.
            <br className="hidden sm:block" />
            È un organo operativo del cantiere.
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 max-w-xl mx-auto">
            Non sostituisce le persone. Non cambia l’organizzazione. Rende
            visibile e coerente ciò che oggi esiste già, ma è frammentato tra
            livelli e strumenti diversi.
          </p>
        </section>
      </div>
    </div>
  );
}

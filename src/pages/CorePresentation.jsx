// src/pages/CorePresentation.jsx
import React from "react";

/**
 * Page "Radiografia del flusso reale" – Versione Direzione
 *
 * Objectif :
 *  - Très peu de texte
 *  - GROS titres
 *  - Diagrammes colorés simples, à fort impact
 *  - Aucune logique commerciale, ton audit / mission control
 */

export default function CorePresentation() {
  return (
    <div className="space-y-10">
      {/* HERO */}
      <header className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
          CORE · Radiografia organizzativa
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-50">
          Radiografia del flusso reale
        </h1>
        <p className="text-[13px] text-slate-400">
          Cantiere → decisione. Confronto silenzioso tra due architetture di lavoro.
        </p>
      </header>

      {/* DOUBLE COLONNE – ARCHITETTURE */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flusso attuale */}
        <div className="rounded-3xl border border-red-900/70 bg-slate-950/90 p-6 flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-red-400">
                Architettura attuale
              </div>
              <h2 className="text-sm font-semibold text-slate-100">
                Cantiere → messaggi → ufficio → sistemi → ritorno
              </h2>
            </div>
          </div>

          {/* Diagramme de flux simple */}
          <div className="mt-2 space-y-2 text-[11px] text-slate-200">
            <FlowNode tone="red" label="CAPO · campo" />
            <FlowArrow tone="red" label="Messaggi · foto · note vocali" />
            <FlowNode tone="red" label="Ufficio · ricostruzione" />
            <FlowArrow tone="red" label="Riscrittura · interpretazione" />
            <FlowNode tone="red" label="Sistemi tecnici / INCA" />
            <FlowArrow tone="red" label="Decisione in ritardo" />
            <FlowNode tone="red" label="Ritorno al cantiere · correzioni a valle" />
          </div>

          {/* 3 indicateurs géants */}
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <BigMetric
              tone="red"
              label="Latenza"
              value="24–48 h"
            />
            <BigMetric
              tone="red"
              label="Informazione utile"
              value="30–60 %"
            />
            <BigMetric
              tone="red"
              label="Pressione"
              value="Alta"
            />
          </div>
        </div>

        {/* Flusso CORE */}
        <div className="rounded-3xl border border-emerald-800 bg-slate-950/90 p-6 flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-400">
                Architettura con CORE
              </div>
              <h2 className="text-sm font-semibold text-slate-100">
                Cantiere → CORE → sistemi → decisione
              </h2>
            </div>
          </div>

          <div className="mt-2 space-y-2 text-[11px] text-slate-200">
            <FlowNode tone="green" label="CAPO · inserimento unico" />
            <FlowArrow tone="green" label="Dato strutturato · tempo reale" />
            <FlowNode tone="green" label="CORE · consolidamento" />
            <FlowArrow tone="green" label="Tracciabilità · responsabilità chiare" />
            <FlowNode tone="green" label="INCA / sistemi tecnici" />
            <FlowArrow tone="green" label="Stessa informazione per tutti" />
            <FlowNode tone="green" label="Direzione · decisione rapida" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <BigMetric
              tone="green"
              label="Latenza"
              value="5–10 min"
            />
            <BigMetric
              tone="green"
              label="Informazione utile"
              value="95–100 %"
            />
            <BigMetric
              tone="green"
              label="Pressione"
              value="Stabilizzata"
            />
          </div>
        </div>
      </section>

      {/* PHRASE CENTRALE */}
      <section>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/95 px-6 py-6 text-center">
          <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-100 leading-relaxed">
            Oggi l’informazione si degrada per poter circolare.{" "}
            <span className="block sm:inline text-sky-300">
              Con CORE l’informazione nasce già pulita.
            </span>
          </p>
        </div>
      </section>

      {/* DIAGRAMMES COLORÉS – IMPATTO OPERATIVO */}
      <section className="space-y-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Impatto operativo · confronto visivo
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Barres comparatives */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 space-y-4 text-[12px] text-slate-200">
            <ImpactBar
              label="Tempo di latenza"
              currentLabel="Flusso attuale"
              coreLabel="Flusso CORE"
              currentWidth="92%"
              coreWidth="18%"
            />
            <ImpactBar
              label="Correzioni a valle"
              currentLabel="Flusso attuale"
              coreLabel="Flusso CORE"
              currentWidth="85%"
              coreWidth="25%"
            />
            <ImpactBar
              label="Pressione operativa"
              currentLabel="Flusso attuale"
              coreLabel="Flusso CORE"
              currentWidth="80%"
              coreWidth="30%"
            />
            <ImpactBar
              label="Rischio di decisione su dati parziali"
              currentLabel="Flusso attuale"
              coreLabel="Flusso CORE"
              currentWidth="78%"
              coreWidth="22%"
            />
          </div>

          {/* Jauge qualité info + matrice simple */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 space-y-4 text-[12px] text-slate-200">
            {/* Jauge qualité de l'information */}
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Qualità dell’informazione alla decisione
              </div>
              <div className="h-3 rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-400 relative overflow-hidden">
                {/* Curseur flusso attuale */}
                <div className="absolute -top-1 left-[32%] flex flex-col items-center gap-0.5">
                  <div className="h-3 w-px bg-red-200/90" />
                  <span className="text-[9px] text-red-200 whitespace-nowrap">
                    Flusso attuale
                  </span>
                </div>
                {/* Curseur CORE */}
                <div className="absolute -top-1 left-[82%] flex flex-col items-center gap-0.5">
                  <div className="h-3 w-px bg-emerald-200/90" />
                  <span className="text-[9px] text-emerald-200 whitespace-nowrap">
                    CORE
                  </span>
                </div>
              </div>
            </div>

            {/* Matrice risque / visibilité */}
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Rischio vs visibilità
              </div>
              <div className="relative h-32 rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden">
                {/* Axes */}
                <div className="absolute inset-4 border border-slate-800/80 rounded-xl" />
                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-slate-800/70" />
                <div className="absolute top-1/2 left-4 right-4 h-px bg-slate-800/70" />

                {/* Labels axes */}
                <div className="absolute left-5 top-2 text-[9px] text-slate-500">
                  Rischio ↑
                </div>
                <div className="absolute right-3 bottom-2 text-[9px] text-slate-500">
                  Visibilità →
                </div>

                {/* Point flusso attuale */}
                <div className="absolute left-[14%] top-[22%] flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
                  <span className="text-[9px] text-red-200">
                    Flusso attuale
                  </span>
                </div>

                {/* Point CORE */}
                <div className="absolute right-[12%] bottom-[18%] flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                  <span className="text-[9px] text-emerald-200">
                    CORE
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Questi diagrammi non misurano il fatturato. Mostrano solo{" "}
              <span className="text-slate-300">
                dove oggi si concentra la fatica e dove si sposta il controllo
                con CORE.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* CORE NON È / CORE PORTA */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CORE non è */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 text-[12px] text-slate-200 space-y-2.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Cosa CORE non è
          </div>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>CORE non sostituisce i capi.</li>
            <li>CORE non sostituisce l’ufficio.</li>
            <li>CORE non è un ERP pesante.</li>
            <li>CORE non aggiunge burocrazia al cantiere.</li>
            <li>CORE non giudica le persone: descrive un flusso.</li>
          </ul>
        </div>

        {/* CORE porta */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 text-[12px] text-slate-200 space-y-2.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Cosa CORE porta
          </div>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>Accorcia la distanza tra campo e decisione.</li>
            <li>Riduce le versioni parallele degli stessi dati.</li>
            <li>Stabilizza la pressione operativa sulla direzione.</li>
            <li>Trasforma le ricostruzioni a valle in eccezioni.</li>
            <li>
              Rende visibile un rischio che oggi è solo percepito, non misurato.
            </li>
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">
            Se CORE non toglie lavoro e pressione reale, si spegne. E non succede
            nulla.
          </p>
        </div>
      </section>

      {/* PHRASE FINALE */}
      <section className="pb-2">
        <div className="text-center text-sm sm:text-base md:text-lg text-slate-100 font-semibold">
          CORE non è uno strumento IT.
          <br className="hidden sm:block" />
          <span className="text-sky-300">
            CORE è un nuovo organo vitale del cantiere.
          </span>
        </div>
      </section>
    </div>
  );
}

/* ───────────── Composants internes ───────────── */

function FlowNode({ label, tone }) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1";
  const color =
    tone === "red"
      ? "border-red-900/80 bg-red-950/40 text-red-100"
      : "border-emerald-900/80 bg-emerald-950/40 text-emerald-100";

  return (
    <div className={[base, color].join(" ")}>
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
      <span className="text-[11px]">{label}</span>
    </div>
  );
}

function FlowArrow({ label, tone }) {
  const base =
    "ml-5 inline-flex items-center gap-2 rounded-full border px-3 py-0.5";
  const color =
    tone === "red"
      ? "border-red-900/80 bg-red-950/30 text-red-100"
      : "border-emerald-900/80 bg-emerald-950/30 text-emerald-100";

  return (
    <div className={[base, color].join(" ")}>
      <span className="text-[11px]">↓</span>
      <span className="text-[11px]">{label}</span>
    </div>
  );
}

function BigMetric({ label, value, tone }) {
  const accent =
    tone === "red"
      ? "text-red-300"
      : "text-emerald-300";

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className={["text-lg sm:text-2xl font-semibold", accent].join(" ")}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mt-0.5">
        {label}
      </div>
    </div>
  );
}

function ImpactBar({
  label,
  currentLabel,
  coreLabel,
  currentWidth,
  coreWidth,
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] text-slate-300">{label}</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-28 text-[10px] text-slate-500">
            {currentLabel}
          </span>
          <div className="flex-1 h-2 rounded-full bg-red-900/40">
            <div
              className="h-2 rounded-full bg-red-500"
              style={{ width: currentWidth }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-28 text-[10px] text-slate-500">{coreLabel}</span>
          <div className="flex-1 h-2 rounded-full bg-emerald-900/40">
            <div
              className="h-2 rounded-full bg-emerald-400"
              style={{ width: coreWidth }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

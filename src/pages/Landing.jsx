// src/pages/Landing.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  useEffect(() => {
    console.log(
      '%cCORE — a SHAKUR Engineering System',
      'color:#22d3ee;font-weight:bold;font-size:14px;'
    );
    console.log(
      '%cPrecision. Discipline. Zero error.',
      'color:#64748b;font-size:12px;'
    );
  }, []);

  const [openModule, setOpenModule] = useState(null); // 'RAPPORTINO' | 'UFFICIO' | 'ARCHIVIO' | 'PERCORSO' | null

  const renderModuleModal = () => {
    if (!openModule) return null;

    let title = '';
    let subtitle = '';
    let sections = [];
    let accent = {
      border: 'border-emerald-500',
      pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/50',
      tag: 'text-emerald-300',
    };

    if (openModule === 'RAPPORTINO') {
      accent = {
        border: 'border-emerald-500',
        pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/50',
        tag: 'text-emerald-300',
      };
      title = 'Rapportino · Capo — Giornata digitale, zero carta.';
      subtitle =
        'Dal ponte di lavoro al PDF ufficiale in meno di 2 minuti. Pensato per chi chiude davvero la giornata a bordo, non in ufficio.';
      sections = [
        {
          heading: 'Cosa puoi fare',
          points: [
            'Compilare il rapportino con attività, ore, squadre, note e prodotto totale.',
            'Usare modelli preimpostati per nave, zona, commessa e ruolo.',
            'Segnalare extra, fermate, problemi tecnici o interferenze.',
            'Generare un PDF pulito, allineato al cartaceo di bordo e pronto per l’Ufficio.',
          ],
        },
        {
          heading: 'Per chi è pensato',
          points: [
            'Capo squadra / Capo reparto a bordo.',
            'Chi porta la responsabilità di chiudere la giornata con i numeri corretti.',
          ],
        },
        {
          heading: 'Perché ti aiuta',
          points: [
            'Niente più foto di rapportini su WhatsApp o fogli riscritti in baracca.',
            'Meno errori su ore, squadre e commesse.',
            'Giornata sempre allineata con Ufficio e Direzione, senza telefonate infinite.',
          ],
        },
      ];
    } else if (openModule === 'UFFICIO') {
      accent = {
        border: 'border-sky-500',
        pill: 'bg-sky-500/10 text-sky-300 border-sky-500/50',
        tag: 'text-sky-300',
      };
      title = 'Ufficio · Controllo — Una sola plancia per tutti i rapportini.';
      subtitle =
        'Dimentica i fogli sparsi e le foto su WhatsApp: l’Ufficio vede, controlla e approva tutto in un unico punto.';
      sections = [
        {
          heading: 'Cosa puoi fare',
          points: [
            'Vedere tutti i rapportini per data, nave, zona, commessa, Capo.',
            'Filtrare per squadra, ruolo, stato (bozza, inviato, approvato, bloccato).',
            'Aggiungere note di ritorno al Capo e chiedere correzioni mirate.',
            'Chiudere e bloccare giornate per evitare modifiche non autorizzate.',
          ],
        },
        {
          heading: 'Per chi è pensato',
          points: [
            'Ufficio tecnico, produzione, qualità, controllo di gestione.',
            'Chi prepara SAL, report per il cliente o per la Direzione.',
          ],
        },
        {
          heading: 'Perché ti aiuta',
          points: [
            'Riduce il tempo perso a rincorrere rapportini mancanti.',
            'Crea uno storico pulito per audit, sicurezza e qualità.',
            'Ti dà una base dati strutturata per numeri e decisioni.',
          ],
        },
      ];
    } else if (openModule === 'ARCHIVIO') {
      accent = {
        border: 'border-fuchsia-500',
        pill: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/50',
        tag: 'text-fuchsia-300',
      };
      title = 'Archivio · Registro — Il cuore dati del cantiere.';
      subtitle =
        'Ogni giornata, squadra, tratto di cavo e nota operativa: tutto tracciato, ricercabile e pronto per audit e consuntivi.';
      sections = [
        {
          heading: 'Cosa contiene',
          points: [
            'Registro completo delle giornate di lavoro, per nave, zona e commessa.',
            'Squadre, ruoli, ore lavorate, attività, fermate e note operative.',
            'Lista cavi e stati di avanzamento (posato, collegato, testato, ecc.).',
            'Storico delle approvazioni e delle modifiche (Capo, Ufficio, Direzione).',
          ],
        },
        {
          heading: 'Cosa puoi fare',
          points: [
            'Cercare per nave, commessa, cavo, data, Capo o squadra.',
            'Esportare report per SAL, qualità, sicurezza, cliente o RINA.',
            'Ricostruire esattamente “cosa è successo” in una certa data o zona.',
          ],
        },
        {
          heading: 'Perché ti aiuta',
          points: [
            'È la fonte unica di verità: se non è in Archivio, non è successo.',
            'Evita archivi paralleli in Excel, mail e cartelle personali.',
            'Rende il cantiere auditabile, anche anni dopo.',
          ],
        },
      ];
    } else if (openModule === 'PERCORSO') {
      accent = {
        border: 'border-amber-500',
        pill: 'bg-amber-500/10 text-amber-300 border-amber-500/50',
        tag: 'text-amber-300',
      };
      title = 'Percorso · Cavi — Dal disegno al metro posato.';
      subtitle =
        'Il modulo che collega INCA e IPC al lavoro reale di bordo: ogni tratto di cavo, dal modello al ponte.';
      sections = [
        {
          heading: 'Cosa farà (in sviluppo)',
          points: [
            'Visualizzare i percorsi cavo direttamente dalla base dati tecnica (INCA / IPC).',
            'Collegare ogni tratto di cavo ai rapportini giornalieri del Capo.',
            'Segnare cosa è stato posato, cosa manca e dove ci sono blocchi.',
            'Dare una vista chiara dell’avanzamento cavi per nave, zona e commessa.',
          ],
        },
        {
          heading: 'Per chi è pensato',
          points: [
            'Caposquadra che devono sapere dove andare e con quale priorità.',
            'Ufficio che confronta piano teorico e avanzamento reale.',
            'Direzione che vuole individuare zone critiche e ritardi.',
          ],
        },
        {
          heading: 'Nota',
          points: [
            'Modulo in sviluppo: la descrizione non equivale a funzionalità attiva.',
            'Disponibile in anteprima solo su cantieri pilota.',
          ],
        },
      ];
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-950/80 backdrop-blur-sm">
        <div
          className={`relative w-full max-w-3xl rounded-2xl border ${accent.border} bg-slate-950 shadow-[0_0_60px_rgba(15,23,42,1)]`}
        >
          <button
            type="button"
            onClick={() => setOpenModule(null)}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 text-sm font-medium"
          >
            ✕ Chiudi
          </button>
          <div className="px-5 pt-5 pb-4 md:px-7 md:pt-6 md:pb-6">
            <div className="mb-3">
              <div className={`text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1`}>
                Modulo CORE
              </div>
              <h3 className={`text-xl md:text-[20px] font-semibold text-slate-50 mb-1`}>
                {title}
              </h3>
              <p className="text-[14px] text-slate-300 leading-relaxed">{subtitle}</p>
              <div className="mt-2 inline-flex items-center gap-2">
                <span
                  className={`text-[11px] px-2 py-1 rounded-full border font-mono ${accent.pill}`}
                >
                  SHAKUR Engineering · Spec
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px] text-slate-200">
              {sections.map((section) => (
                <div
                  key={section.heading}
                  className="border border-slate-800/70 rounded-lg bg-slate-900/60 px-3 py-3"
                >
                  <div
                    className={`text-[11px] font-semibold uppercase tracking-[0.16em] mb-2 ${accent.tag}`}
                  >
                    {section.heading}
                  </div>
                  <ul className="space-y-1.5 text-[13px] text-slate-200">
                    {section.points.map((p) => (
                      <li key={p} className="flex gap-1.5">
                        <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-slate-500 flex-shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-4 text-[11px] text-slate-500">
              Questa finestra descrive il modulo così come progettato da SHAKUR Engineering.
              Le funzionalità attive possono variare in base alla configurazione del cantiere.
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* HEADER */}
      <header className="w-full border-b border-slate-900/80 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-900/90 text-[12px] uppercase tracking-[0.18em] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              Sistema Centrale di Cantiere
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Engineered by SHAKUR Engineering Labs
            </div>
          </div>

          <Link
            to="/login"
            className="rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-400 px-4 py-2 text-[14px] font-medium"
          >
            Accedi a CORE
          </Link>
        </div>
      </header>

      {/* CONTENU */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-16">
          {/* HERO */}
          <section>
            <h1 className="text-4xl font-semibold text-slate-50 tracking-tight mb-4">
              CORE
              <span className="ml-2 text-slate-400 text-2xl font-normal">
                — controllo totale, precisione navale.
              </span>
            </h1>
            <p className="text-[15px] text-slate-300 max-w-2xl leading-relaxed mb-4">
              Progettato da SHAKUR Engineering per cantieri complessi, crociere e unità
              militari. Una sola piattaforma per rapportini, squadre, cavi, avanzamento e audit.
            </p>
            <p className="text-[14px] text-slate-400 max-w-xl leading-relaxed">
              Nato dall’esperienza reale a bordo: ogni dettaglio è costruito sulla regola
              principale del cantiere navale —{' '}
              <span className="text-slate-200 font-medium">l’errore è fatale</span>.
            </p>
          </section>

          {/* VISUEL NAVI */}
          <section>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden relative">
              {/* Glow décoratif */}
              <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_top,_#22d3ee_0,_transparent_60%),_radial-gradient(circle_at_bottom,_#22c55e_0,_transparent_65%)]" />

              <div className="p-6 relative text-[14px] text-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-3">
                    <span className="px-3 py-1 rounded-full border border-sky-500/60 bg-sky-500/10 text-sky-100 text-[12px] tracking-wide">
                      Cruise Line
                    </span>
                    <span className="px-3 py-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-100 text-[12px] tracking-wide">
                      Military
                    </span>
                  </div>
                  <span className="font-mono text-[12px] text-slate-400">v1 · Early Access</span>
                </div>

                <p className="text-[14px] text-slate-300 mb-6 leading-relaxed max-w-2xl">
                  Un unico motore per cantieri civili e militari: CORE mantiene precisione,
                  tracciabilità e disciplina indipendentemente dalla complessità dell’impianto.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                    <h3 className="text-[14px] font-medium text-slate-200 mb-1">
                      Nave da Crociera
                    </h3>
                    <p className="text-[13px] text-slate-400 leading-snug">
                      Impianti, corridoi, cabine, servizi — gestione ad alto volume con tempi
                      stretti e turni serrati.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
                    <h3 className="text-[14px] font-medium text-slate-200 mb-1">
                      Unità Militare
                    </h3>
                    <p className="text-[13px] text-slate-400 leading-snug">
                      Tracciabilità, sicurezza, audit completi, accessi profilati. Progettato per
                      ambienti dove l’errore non è un’opzione.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* MODULES – cliquables avec popups */}
          <section>
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              Quattro moduli, un’unica plancia
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RAPPORTINO */}
              <button
                type="button"
                onClick={() => setOpenModule('RAPPORTINO')}
                className="text-left rounded-xl p-4 border border-slate-800 bg-slate-900/80 hover:border-emerald-500/60 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold tracking-wider text-slate-200">
                    RAPPORTINO · CAPO
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/40 text-emerald-300">
                    Attivo
                  </span>
                </div>
                <p className="text-[14px] text-slate-300 leading-relaxed mb-1.5">
                  Compilazione in meno di 2 minuti. Squadre, attività, tempi e PDF pulito.
                </p>
                <p className="text-[12px] text-emerald-300">
                  Clicca per capire come funziona il modulo →
                </p>
              </button>

              {/* UFFICIO */}
              <button
                type="button"
                onClick={() => setOpenModule('UFFICIO')}
                className="text-left rounded-xl p-4 border border-slate-800 bg-slate-900/80 hover:border-sky-500/60 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold tracking-wider text-slate-200">
                    UFFICIO · CONTROLLO
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full border bg-sky-500/10 border-sky-500/40 text-sky-300">
                    Attivo
                  </span>
                </div>
                <p className="text-[14px] text-slate-300 leading-relaxed mb-1.5">
                  Verifica, approvazione e storico ufficiale. Zero rapportini persi nei giri mail.
                </p>
                <p className="text-[12px] text-sky-300">
                  Clicca per capire come funziona il modulo →
                </p>
              </button>

              {/* ARCHIVIO */}
              <button
                type="button"
                onClick={() => setOpenModule('ARCHIVIO')}
                className="text-left rounded-xl p-4 border border-slate-800 bg-slate-900/90 hover:border-fuchsia-500/60 hover:bg-slate-900 transition-colors shadow-[0_0_22px_rgba(15,23,42,0.9)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold tracking-wider text-slate-200">
                    ARCHIVIO · REGISTRO
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full border bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-300">
                    Cuore dati
                  </span>
                </div>
                <p className="text-[14px] text-slate-200 leading-relaxed mb-1.5">
                  Single Source of Truth del cantiere. Se non è in archivio, non è successo.
                </p>
                <p className="text-[12px] text-fuchsia-300">
                  Clicca per capire come funziona il modulo →
                </p>
              </button>

              {/* PERCORSO */}
              <button
                type="button"
                onClick={() => setOpenModule('PERCORSO')}
                className="text-left rounded-xl p-4 border border-dashed border-slate-800 bg-slate-900/80 hover:border-amber-500/60 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold tracking-wider text-slate-200">
                    PERCORSO · CAVI
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full border bg-amber-500/10 border-amber-500/40 text-amber-300">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[14px] text-slate-300 leading-relaxed mb-1.5">
                  Dal disegno al metro posato. Sincronizzato con INCA + IPC (spec progettuale).
                </p>
                <p className="text-[12px] text-amber-300">
                  Clicca per vedere la specifica del modulo →
                </p>
              </button>
            </div>
          </section>

          {/* CTA BAS */}
          <section className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-[14px] text-slate-400 max-w-lg">
              CORE è in uso reale su cantiere. Accesso riservato a personale autorizzato.
            </p>
            <Link
              to="/login"
              className="rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-400 px-5 py-2 text-[14px] font-medium"
            >
              Accedi con credenziali interne
            </Link>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-4 text-[12px] text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex justify-between flex-wrap gap-2">
          <span>
            CORE · Sistema centrale di cantiere —{' '}
            <span className="font-mono ml-2 text-slate-400">SHAKUR Engineering</span>
          </span>
          <span className="text-slate-600">
            Trieste · La Spezia · Dakar · Precision. Discipline. Zero error.
          </span>
        </div>
      </footer>

      {/* MODALE MODULES */}
      {renderModuleModal()}
    </div>
  );
}

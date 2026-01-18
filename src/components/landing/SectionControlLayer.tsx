import React, { useMemo, useState } from "react";
import { RevealOnScroll } from "./RevealOnScroll";

type T = {
  s2Title: string;
  s2Subtitle: string;
  s2Cards: {
    c1Title: string;
    c1Body: string;
    c1Example: string;
    c1Cta: string;

    c2Title: string;
    c2Body: string;
    c2Example: string;
    c2Cta: string;

    c3Title: string;
    c3Body: string;
    c3Example: string;
    c3Cta: string;
  };
};

type Props = { t: T };

type CardModel = {
  title: string;
  body: string;
  example: string;
  cta: string;
  badge: string;
};

function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function Card({ m }: { m: CardModel }): JSX.Element {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={cx(
        "relative rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur p-6",
        "shadow-[0_28px_90px_rgba(2,6,23,0.62)]",
        "transition"
      )}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {/* subtle hover halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          backgroundImage: hover
            ? "radial-gradient(520px 240px at 22% 12%, rgba(56,189,248,0.12), transparent 62%)"
            : "radial-gradient(520px 240px at 22% 12%, rgba(56,189,248,0.07), transparent 62%)",
          opacity: 1,
        }}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.24em] text-slate-500">{m.title}</div>
          <div className="mt-3 text-lg text-slate-100">{m.body}</div>
        </div>

        <span className="shrink-0 inline-flex items-center rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{m.badge}</span>
        </span>
      </div>

      {/* tooltip micro-exemple (F1) */}
      <div className="relative z-10 mt-5 flex items-center justify-between">
        <button type="button" className="text-sm text-slate-400 hover:text-slate-200 transition">
          {m.cta} →
        </button>

        <div className="relative">
          <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Esempio</span>

          <div
            className={cx(
              "absolute right-0 mt-2 w-[280px] rounded-xl border border-slate-800 bg-slate-950/80 backdrop-blur px-4 py-3",
              "shadow-[0_26px_70px_rgba(2,6,23,0.72)]",
              hover ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none",
              "transition duration-200"
            )}
          >
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Micro prova</div>
            <div className="mt-2 text-sm text-slate-200">{m.example}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ControlLayerSection({ t }: Props): JSX.Element {
  const cards: CardModel[] = useMemo(
    () => [
      { title: t.s2Cards.c1Title, body: t.s2Cards.c1Body, example: t.s2Cards.c1Example, cta: t.s2Cards.c1Cta, badge: "CORE checked" },
      { title: t.s2Cards.c2Title, body: t.s2Cards.c2Body, example: t.s2Cards.c2Example, cta: t.s2Cards.c2Cta, badge: "Line-proven" },
      { title: t.s2Cards.c3Title, body: t.s2Cards.c3Body, example: t.s2Cards.c3Example, cta: t.s2Cards.c3Cta, badge: "Audit-ready" },
    ],
    [t]
  );

  return (
    <RevealOnScroll className="relative">
      <div className="rounded-3xl border border-slate-800/70 bg-slate-950/25 backdrop-blur p-7 md:p-9">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-100">{t.s2Title}</div>
            <div className="mt-2 text-base text-slate-400 max-w-2xl">{t.s2Subtitle}</div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
            Accesso per ruoli · Tracciabilità completa · Export firmato
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((m) => (
            <Card key={m.title} m={m} />
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}

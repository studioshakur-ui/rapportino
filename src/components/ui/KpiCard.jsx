// src/components/ui/KpiCard.jsx
import React from "react";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

export default function KpiCard({
  title,
  value,
  subline,
  footnote,
  accent = "slate", // slate|sky|fuchsia|emerald|rose
  onClick,
  disabled = false,
}) {
  const accentMap = {
    slate: "border-slate-700/60",
    sky: "border-sky-400/30",
    fuchsia: "border-fuchsia-400/30",
    emerald: "border-emerald-400/30",
    rose: "border-rose-400/30",
  };

  const isButton = typeof onClick === "function" && !disabled;

  const Base = isButton ? "button" : "div";
  const props = isButton
    ? {
        type: "button",
        onClick,
      }
    : {};

  return (
    <Base
      {...props}
      className={cn(
        "group relative rounded-2xl border bg-slate-950/55 px-4 py-3 text-left",
        "ring-1 ring-white/5",
        accentMap[accent] || accentMap.slate,
        isButton
          ? "cursor-pointer transition hover:-translate-y-[1px] hover:bg-slate-900/35 active:translate-y-0 active:scale-[0.995]"
          : "",
        disabled ? "opacity-70 cursor-not-allowed" : "",
        "focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
      )}
    >
      {/* subtle top light to increase legibility */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-2xl bg-gradient-to-b from-white/8 to-transparent opacity-0 group-hover:opacity-100 transition" />

      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{title}</div>

      <div className={cn("mt-1 text-2xl font-semibold", "text-slate-50")}>{value}</div>

      {subline ? <div className="mt-1 text-[11px] text-slate-300/80">{subline}</div> : null}
      {footnote ? <div className="mt-2 text-[11px] text-slate-400">{footnote}</div> : null}

      {isButton ? (
        <div className="pointer-events-none absolute right-3 top-3 text-slate-500 group-hover:text-slate-200 transition">
          →
        </div>
      ) : null}
    </Base>
  );
}

// /src/components/inca/IncaPills.jsx
import React from "react";

/**
 * Shared pills for INCA cockpits (UFFICIO + CAPO)
 * - Apparato pills colorized by P-ratio:
 *    GREEN  -> all P
 *    YELLOW -> some P (mix)
 *    RED    -> 0 P (or total=0)
 * - Codice pill shaped like Apparato pills
 *
 * Scope rule:
 *   computeApparatoPMaps(caviScope) must be called on the CURRENT visible scope
 *   (already filtered by search/chips/percorso).
 */

function norm(v) {
  return String(v ?? "").trim();
}

export function computeApparatoPMaps(caviScope) {
  const da = new Map();
  const a = new Map();

  const rows = Array.isArray(caviScope) ? caviScope : [];

  function bump(map, key, isP) {
    if (!key) return;
    const cur = map.get(key) || { total: 0, pCount: 0, status: "RED" };
    cur.total += 1;
    if (isP) cur.pCount += 1;
    map.set(key, cur);
  }

  for (const r of rows) {
    const appDA = norm(r?.apparato_da);
    const appA = norm(r?.apparato_a);
    const isP = norm(r?.situazione) === "P";
    bump(da, appDA, isP);
    bump(a, appA, isP);
  }

  function finalize(map) {
    for (const [k, v] of map.entries()) {
      const total = v.total || 0;
      const pCount = v.pCount || 0;

      let status = "RED";
      if (total <= 0) status = "RED";
      else if (pCount <= 0) status = "RED";
      else if (pCount === total) status = "GREEN";
      else status = "YELLOW";

      map.set(k, { total, pCount, status });
    }
  }

  finalize(da);
  finalize(a);

  return { da, a };
}

function toneForStatus(status) {
  if (status === "GREEN") {
    return {
      pill: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
      dot: "bg-emerald-400",
    };
  }
  if (status === "YELLOW") {
    return {
      pill: "border-amber-300/25 bg-amber-400/10 text-amber-200",
      dot: "bg-amber-400",
    };
  }
  // RED (default)
  return {
    pill: "border-rose-300/25 bg-rose-400/10 text-rose-200",
    dot: "bg-rose-400",
  };
}

export function ApparatoPill({
  side = "DA",
  value,
  stats, // {total,pCount,status}
  disabled,
  onClick,
  className = "",
}) {
  const v = norm(value);
  const s = stats?.status || (disabled ? "RED" : "RED");
  const { pill, dot } = toneForStatus(s);

  const base =
    "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 " +
    "text-[11px] leading-none select-none focus:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-emerald-300/40";

  const disabledTone = "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed";

  const title =
    !v || disabled
      ? `Apparato ${side} non disponibile`
      : `Apparato ${side} ${v} — P: ${stats?.pCount ?? 0}/${stats?.total ?? 0}`;

  return (
    <button
      type="button"
      title={title}
      onClick={
        disabled
          ? undefined
          : (e) => {
              // Prevent row click selection when clicking the pill
              e.preventDefault();
              e.stopPropagation();
              onClick?.(e);
            }
      }
      disabled={disabled}
      className={[base, disabled ? disabledTone : pill, className].join(" ")}
      aria-label={title}
    >
      <span className={["h-1.5 w-1.5 rounded-full", disabled ? "bg-slate-400" : dot].join(" ")} />
      <span className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-1.5 py-[2px] font-semibold tracking-[0.14em] text-[10px] text-slate-200">
        {side}
      </span>
      <span className="max-w-[210px] truncate font-semibold">{v || "—"}</span>
      <span className="ml-0.5 text-[12px] opacity-70" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

export function CodicePill({
  value,
  dotColor = "#94a3b8",
  onClick,
  className = "",
  title,
}) {
  const v = norm(value);

  const base =
    "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 " +
    "text-[12px] leading-none select-none focus:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-emerald-300/40";

  // Neutral “tech” pill, like apparato geometry, but color comes from dotColor
  const tone = "border-slate-700/70 bg-slate-950/40 text-slate-100";

  return (
    <button
      type="button"
      title={title || v}
      onClick={
        onClick
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick(e);
            }
          : undefined
      }
      className={[base, tone, onClick ? "cursor-pointer" : "cursor-default", className].join(" ")}
      aria-label={title || v}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="font-semibold truncate">{v || "—"}</span>
    </button>
  );
}

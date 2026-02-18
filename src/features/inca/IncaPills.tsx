import React from "react";

/**
 * Shared pills for INCA cockpits (UFFICIO + CAPO)
 *
 * Naval-grade rule:
 * - Apparato pills reflect the REAL apparato status on the FILE scope (all cavi for the file),
 *   never the filtered UI scope (search/chips).
 *
 * Status rule:
 * - GREEN  -> 100% P (for the given side, using per-side logic when available)
 * - RED    -> 0% P (or total=0)
 * - YELLOW -> mix (some P, some not-P)
 *
 * IMPORTANT:
 * - "per-side" logic is applied only if BOTH progress_percent and progress_side are persisted.
 * - Otherwise fallback on INCA global situazione (NULL/"" => NP).
 */

type ProgressSide = "DA" | "A";
type Situazione = "P" | "T" | "R" | "B" | "E" | null;
type ProgressPercent = 50 | 70 | 100 | null;

export type IncaCavoLike = {
  apparato_da?: string | null;
  apparato_a?: string | null;
  situazione?: string | null;
  progress_percent?: number | null;
  progress_side?: string | null;
};

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeKey(raw: unknown) {
  const v = raw == null ? "" : String(raw).trim();
  return v ? v : "NP";
}

function normalizeProgressPercent(raw: unknown): ProgressPercent {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n === 50 || n === 70 || n === 100) return n;
  return null;
}

function normalizeProgressSideNullable(raw: unknown): ProgressSide | null {
  const v = raw == null ? "" : String(raw).trim();
  if (v === "DA" || v === "A") return v;
  return null; // IMPORTANT: no default
}

function situazionePerSide(row: IncaCavoLike, side: ProgressSide) {
  const percent = normalizeProgressPercent(row?.progress_percent);
  const fromSide = normalizeProgressSideNullable(row?.progress_side);

  // Apply "per-side" logic only if both are present (persisted)
  if (percent != null && fromSide) {
    if (percent >= 100) return "P";
    if (percent >= 50) return fromSide === side ? "P" : "T";
  }

  // Fallback: INCA global situazione (NULL/"" => NP)
  const global = normalizeKey(row?.situazione);
  return global === "NP" ? "NP" : global;
}

/**
 * Build apparato maps on the FILE scope.
 * - da: Map(apparato_da -> {total,pCount,status})
 * - a : Map(apparato_a  -> {total,pCount,status})
 */
export function computeApparatoPMaps(caviScope: IncaCavoLike[]) {
  const da = new Map<string, { total: number; pCount: number; status: "GREEN" | "YELLOW" | "RED" }>();
  const a = new Map<string, { total: number; pCount: number; status: "GREEN" | "YELLOW" | "RED" }>();

  const rows = Array.isArray(caviScope) ? caviScope : [];

  function bump(map: Map<string, { total: number; pCount: number; status: "GREEN" | "YELLOW" | "RED" }>, key: string, isP: boolean) {
    if (!key) return;
    const cur = map.get(key) || { total: 0, pCount: 0, status: "RED" as const };
    cur.total += 1;
    if (isP) cur.pCount += 1;
    map.set(key, cur);
  }

  for (const r of rows) {
    const appDA = norm(r?.apparato_da);
    const appA = norm(r?.apparato_a);

    const isP_DA = situazionePerSide(r, "DA") === "P";
    const isP_A = situazionePerSide(r, "A") === "P";

    bump(da, appDA, isP_DA);
    bump(a, appA, isP_A);
  }

  function finalize(map: Map<string, { total: number; pCount: number; status: "GREEN" | "YELLOW" | "RED" }>) {
    for (const [k, v] of map.entries()) {
      const total = v.total || 0;
      const pCount = v.pCount || 0;

      let status: "GREEN" | "YELLOW" | "RED" = "RED";
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

function toneForStatus(status: "GREEN" | "YELLOW" | "RED") {
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
  stats,
  disabled,
  onClick,
  className = "",
}: {
  side?: ProgressSide;
  value?: string | null;
  stats?: { total: number; pCount: number; status: "GREEN" | "YELLOW" | "RED" };
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
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
      : `Apparato ${side} ${v} — P: ${stats?.pCount ?? 0}/${stats?.total ?? 0} (FILE)`;

  return (
    <button
      type="button"
      title={title}
      onClick={
        disabled
          ? undefined
          : (e) => {
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
}: {
  value?: string | null;
  dotColor?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  title?: string;
}) {
  const v = norm(value);

  const base =
    "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 " +
    "text-[12px] leading-none select-none focus:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-emerald-300/40";

  const tone = "border-slate-700/70 bg-slate-950/40 text-slate-100";

  const effectiveTitle = title || v;

  return (
    <button
      type="button"
      title={effectiveTitle}
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
      aria-label={effectiveTitle}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="font-semibold truncate">{v || "—"}</span>
    </button>
  );
}

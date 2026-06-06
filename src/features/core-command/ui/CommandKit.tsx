// src/features/core-command/ui/CommandKit.tsx
// Mobile-first primitives shared across CORE COMMAND screens.
// One language: big tap targets, vertical flow, thumb-reachable, dark terrain UI.
import type { ReactNode } from "react";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

export type Tone = "neutral" | "emerald" | "amber" | "red" | "blue";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-zinc-300",
  emerald: "text-emerald-400",
  amber:   "text-amber-400",
  red:     "text-red-400",
  blue:    "text-blue-400",
};

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-zinc-500",
  emerald: "bg-emerald-500",
  amber:   "bg-amber-400",
  red:     "bg-red-500",
  blue:    "bg-blue-500",
};

const PILL_TONE: Record<Tone, string> = {
  neutral: "text-zinc-300 bg-zinc-800/60 active:bg-zinc-700",
  emerald: "text-emerald-300 bg-emerald-500/10 active:bg-emerald-500/20",
  amber:   "text-amber-300 bg-amber-500/10 active:bg-amber-500/20",
  red:     "text-red-300 bg-red-500/10 active:bg-red-500/20",
  blue:    "text-blue-300 bg-blue-500/10 active:bg-blue-500/20",
};

/** Page container: mobile gutters. The shell handles the bottom-nav offset. */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-3xl px-4 pt-5 pb-8 sm:px-6 sm:pb-12 ${className}`}>
      {children}
    </div>
  );
}

/** Small status chip with a colored dot + count. */
export function Chip({ tone, label, count }: { tone: Tone; label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      <strong className={`tabular-nums font-semibold ${TONE_TEXT[tone]}`}>{count}</strong>
      <span>{label}</span>
    </span>
  );
}

/** Tappable section presented as a card — the core building block on mobile. */
export function SectionCard({
  label, count, tone = "neutral", hint, children, footer,
}: {
  label: string;
  count?: number;
  tone?: Tone;
  hint?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{label}</h2>
        {count != null && (
          <span className={`text-xs font-bold tabular-nums ${TONE_TEXT[tone]}`}>{count}</span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-zinc-600">{hint}</p>}
      {footer}
    </section>
  );
}

/** Cable code pills — always rendered via formatCableDisplay. */
export function CablePills({
  codes, onSelect, tone = "neutral", max,
}: {
  codes: string[];
  onSelect: (code: string) => void;
  tone?: Tone;
  max?: number;
}) {
  const shown = max ? codes.slice(0, max) : codes;
  const extra = max && codes.length > max ? codes.length - max : 0;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((code) => (
        <button
          key={code}
          onClick={() => onSelect(code)}
          className={`font-mono text-[13px] leading-none px-2.5 py-1.5 rounded-lg transition-colors ${PILL_TONE[tone]}`}
        >
          {formatCableDisplay(code)}
        </button>
      ))}
      {extra > 0 && <span className="self-center text-xs text-zinc-600">+{extra}</span>}
    </div>
  );
}

/** Inline link/button at the bottom of a card. */
export function CardLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-2 active:text-zinc-200"
    >
      {children}
    </button>
  );
}

/** Friendly empty / resolved state. */
export function EmptyState({
  icon = "✓", title, hint, action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 px-6 py-12 text-center">
      <span className="text-2xl" aria-hidden>{icon}</span>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="text-xs text-zinc-600 max-w-xs">{hint}</p>}
      {action}
    </div>
  );
}

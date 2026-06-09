import type { ReactNode } from "react";

type Tone = "neutral" | "emerald" | "amber" | "red" | "sky" | "blue" | "violet";

// ─── Screen wrapper ──────────────────────────────────────────────────────────

export function Screen({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 pb-10 pt-6 sm:px-8 lg:px-10 lg:pt-8 ${className}`}>
      {children}
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────

export function AppBar({ title, subtitle, action, kicker }: {
  title: string; subtitle?: ReactNode; action?: ReactNode; kicker?: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0 space-y-1">
        <p className="kicker text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">{kicker ?? "Core Command"}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm leading-6 text-stone-600">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function Section({ title, eyebrow, count, children, className = "" }: {
  title: string; eyebrow?: string; count?: number; children: ReactNode; className?: string;
}): JSX.Element {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="kicker text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">{eyebrow}</p> : null}
          <h2 className="text-lg font-semibold tracking-tight text-stone-950">{title}</h2>
        </div>
        {typeof count === "number" ? (
          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-stone-100 px-2 text-xs font-semibold text-stone-500">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

export function StatCard({ label, value, tone = "neutral", helper }: {
  label: string; value: ReactNode; tone?: Tone; helper?: ReactNode;
}): JSX.Element {
  const isLongString = typeof value === "string" && value.length > 8;
  return (
    <div className={`rounded-[24px] border p-4 shadow-sm ${surfaceByTone(tone)}`}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <div className={`mt-2 font-semibold text-stone-950 ${isLongString ? "text-sm leading-snug" : "text-2xl"}`}>{value}</div>
      {helper ? <p className="mt-1 text-sm text-stone-600">{helper}</p> : null}
    </div>
  );
}

// ─── Pill / Badge ─────────────────────────────────────────────────────────────

export function Pill({ children, tone = "neutral", className = "" }: {
  children: ReactNode; tone?: Tone; className?: string;
}): JSX.Element {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${pillByTone(tone)} ${className}`}>
      {children}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ title, description, icon = "✓", tone = "neutral" }: {
  title: string; description?: ReactNode; icon?: ReactNode; tone?: "neutral" | "emerald" | "amber" | "red";
}): JSX.Element {
  const iconStyles: Record<string, string> = {
    neutral: "border-stone-200 bg-stone-50 text-stone-500",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber:   "border-amber-200 bg-amber-50 text-amber-700",
    red:     "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl ${iconStyles[tone]}`}>
        {icon}
      </div>
      <p className="mt-4 font-semibold text-stone-950">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p> : null}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function Table({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full min-w-0 border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }): JSX.Element {
  return <thead className="border-b border-stone-200 bg-stone-50">{children}</thead>;
}

export function Tbody({ children }: { children: ReactNode }): JSX.Element {
  return <tbody className="divide-y divide-stone-100">{children}</tbody>;
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return <td className={`px-4 py-3 text-sm text-stone-700 ${className}`}>{children}</td>;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = "", onClick }: {
  children: ReactNode; className?: string; onClick?: () => void;
}): JSX.Element {
  const base = "rounded-xl border border-stone-200 bg-white p-4 shadow-sm";
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} w-full text-left transition hover:border-amber-300 hover:shadow-md ${className}`}>
        {children}
      </button>
    );
  }
  return <div className={`${base} ${className}`}>{children}</div>;
}

// ─── Primary button ───────────────────────────────────────────────────────────

export function Btn({ children, onClick, disabled, variant = "primary", className = "" }: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
}): JSX.Element {
  const variants: Record<string, string> = {
    primary:   "bg-stone-900 text-white hover:bg-stone-800 focus-visible:ring-stone-500",
    secondary: "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 focus-visible:ring-stone-400",
    danger:    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    ghost:     "text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, max, tone = "emerald" }: { value: number; max: number; tone?: "emerald" | "amber" | "red" | "stone" }): JSX.Element {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const fill: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber:   "bg-amber-400",
    red:     "bg-red-500",
    stone:   "bg-stone-400",
  };
  return (
    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
      <div style={{ width: `${pct}%` }} className={`h-full rounded-full transition-all ${fill[tone]}`} />
    </div>
  );
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────

function pillByTone(tone: Tone): string {
  const tones: Record<Tone, string> = {
    neutral: "border-stone-200 bg-stone-100 text-stone-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber:   "border-amber-200 bg-amber-50 text-amber-700",
    red:     "border-rose-200 bg-rose-50 text-rose-700",
    sky:     "border-sky-200 bg-sky-50 text-sky-700",
    blue:    "border-blue-200 bg-blue-50 text-blue-700",
    violet:  "border-violet-200 bg-violet-50 text-violet-700",
  };
  return tones[tone];
}

function surfaceByTone(tone: Tone): string {
  const tones: Record<Tone, string> = {
    neutral: "border-stone-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50/70",
    amber:   "border-amber-200 bg-amber-50/75",
    red:     "border-rose-200 bg-rose-50/75",
    sky:     "border-sky-200 bg-sky-50/75",
    blue:    "border-blue-200 bg-blue-50/75",
    violet:  "border-violet-200 bg-violet-50/75",
  };
  return tones[tone];
}

import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type Tone = "neutral" | "emerald" | "amber" | "red" | "sky" | "blue" | "violet";

// ─── Screen wrapper ──────────────────────────────────────────────────────────

export function Screen({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────

export function AppBar({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm leading-6 text-gray-500">{subtitle}</p> : null}
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
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{eyebrow}</p> : null}
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        {typeof count === "number" ? <Pill tone="neutral">{count}</Pill> : null}
      </div>
      {children}
    </section>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

export function StatCard({ label, value, tone = "neutral", helper }: {
  label: string; value: ReactNode; tone?: Tone; helper?: ReactNode;
}): JSX.Element {
  return (
    <div className={`rounded-xl border p-4 ${cardByTone(tone)}`}>
      <p className="text-xs font-medium uppercase tracking-widest text-gray-500">{label}</p>
      <div className={`mt-1 text-3xl font-bold ${valueTone(tone)}`}>{value}</div>
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

// ─── Pill / Badge ─────────────────────────────────────────────────────────────

export function Pill({ children, tone = "neutral", className = "" }: {
  children: ReactNode; tone?: Tone; className?: string;
}): JSX.Element {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${pillByTone(tone)} ${className}`}>
      {children}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ title, description, icon = "○" }: {
  title: string; description?: ReactNode; icon?: ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-2xl shadow-sm">
        {icon}
      </div>
      <p className="mt-4 font-semibold text-gray-900">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p> : null}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function Table({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-0 border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }): JSX.Element {
  return <thead className="border-b border-gray-200 bg-gray-50">{children}</thead>;
}

export function Tbody({ children }: { children: ReactNode }): JSX.Element {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return <td className={`px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = "", onClick }: {
  children: ReactNode; className?: string; onClick?: () => void;
}): JSX.Element {
  const base = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm";
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} w-full text-left transition hover:border-blue-300 hover:shadow-md ${className}`}>
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
    primary:   "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400",
    danger:    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    ghost:     "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
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

// ─── Bottom nav (mobile) ─────────────────────────────────────────────────────

type BottomNavItem = { to: string; label: string };

export function BottomNav({ items }: { items: readonly BottomNavItem[] }): JSX.Element {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-3 py-2 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-xl px-2 py-2 text-center text-xs font-medium transition ${
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, max, tone = "blue" }: { value: number; max: number; tone?: "blue" | "emerald" | "amber" | "red" }): JSX.Element {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const fill: Record<string, string> = {
    blue:    "bg-blue-500",
    emerald: "bg-emerald-500",
    amber:   "bg-amber-400",
    red:     "bg-red-500",
  };
  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div style={{ width: `${pct}%` }} className={`h-full rounded-full transition-all ${fill[tone]}`} />
    </div>
  );
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────

function pillByTone(tone: Tone): string {
  const t: Record<Tone, string> = {
    neutral: "border-gray-200 bg-gray-100 text-gray-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber:   "border-amber-200 bg-amber-50 text-amber-700",
    red:     "border-red-200 bg-red-50 text-red-700",
    sky:     "border-sky-200 bg-sky-50 text-sky-700",
    blue:    "border-blue-200 bg-blue-50 text-blue-700",
    violet:  "border-violet-200 bg-violet-50 text-violet-700",
  };
  return t[tone];
}

function cardByTone(tone: Tone): string {
  const t: Record<Tone, string> = {
    neutral: "border-gray-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50",
    amber:   "border-amber-200 bg-amber-50",
    red:     "border-red-200 bg-red-50",
    sky:     "border-sky-200 bg-sky-50",
    blue:    "border-blue-200 bg-blue-50",
    violet:  "border-violet-200 bg-violet-50",
  };
  return t[tone];
}

function valueTone(tone: Tone): string {
  const t: Record<Tone, string> = {
    neutral: "text-gray-900",
    emerald: "text-emerald-700",
    amber:   "text-amber-700",
    red:     "text-red-700",
    sky:     "text-sky-700",
    blue:    "text-blue-700",
    violet:  "text-violet-700",
  };
  return t[tone];
}

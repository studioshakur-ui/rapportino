import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type Tone = "neutral" | "emerald" | "amber" | "red" | "sky" | "violet";

type ScreenProps = {
  children: ReactNode;
  className?: string;
};

export function Screen({ children, className = "" }: ScreenProps): JSX.Element {
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 pb-10 pt-6 sm:px-8 lg:px-10 lg:pt-8 ${className}`}>
      {children}
    </div>
  );
}

type AppBarProps = {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
};

export function AppBar({ title, subtitle, action }: AppBarProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="kicker text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Core Command</p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm leading-6 text-stone-600">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type BottomNavItem = {
  to: string;
  label: string;
};

type BottomNavProps = {
  items: readonly BottomNavItem[];
};

export function BottomNav({ items }: BottomNavProps): JSX.Element {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/96 px-3 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-2xl px-2 py-2 text-center text-xs font-medium transition ${
                isActive ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
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

type SectionProps = {
  title: string;
  eyebrow?: string;
  count?: number;
  children: ReactNode;
  className?: string;
};

export function Section({ title, eyebrow, count, children, className = "" }: SectionProps): JSX.Element {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="kicker text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">{eyebrow}</p> : null}
          <h2 className="text-base font-semibold text-stone-950">{title}</h2>
        </div>
        {typeof count === "number" ? <Pill tone="neutral">{count}</Pill> : null}
      </div>
      {children}
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: ReactNode;
  tone?: Tone;
  helper?: ReactNode;
};

export function StatCard({ label, value, tone = "neutral", helper }: StatCardProps): JSX.Element {
  return (
    <div className={`rounded-[24px] border p-4 shadow-sm ${surfaceByTone(tone)}`}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-stone-950">{value}</div>
      {helper ? <p className="mt-1 text-sm text-stone-600">{helper}</p> : null}
    </div>
  );
}

type PillProps = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

export function Pill({ children, tone = "neutral", className = "" }: PillProps): JSX.Element {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${pillByTone(tone)} ${className}`}>
      {children}
    </span>
  );
}

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, icon = "✓" }: EmptyStateProps): JSX.Element {
  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-2xl text-emerald-700">
        {icon}
      </div>
      <p className="mt-4 font-semibold text-stone-950">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p> : null}
    </div>
  );
}

function pillByTone(tone: Tone): string {
  const tones: Record<Tone, string> = {
    neutral: "border-stone-200 bg-stone-100 text-stone-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };
  return tones[tone];
}

function surfaceByTone(tone: Tone): string {
  const tones: Record<Tone, string> = {
    neutral: "border-stone-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50/70",
    amber: "border-amber-200 bg-amber-50/75",
    red: "border-rose-200 bg-rose-50/75",
    sky: "border-sky-200 bg-sky-50/75",
    violet: "border-violet-200 bg-violet-50/75",
  };
  return tones[tone];
}

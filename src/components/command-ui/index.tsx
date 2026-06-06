import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type Tone = "neutral" | "emerald" | "amber" | "red" | "sky" | "violet";

type ScreenProps = {
  children: ReactNode;
  className?: string;
};

export function Screen({ children, className = "" }: ScreenProps): JSX.Element {
  return (
    <div className={`mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 lg:pt-8 ${className}`}>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Core Command</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm leading-6 text-zinc-400">{subtitle}</p> : null}
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 px-3 py-2 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-xl px-2 py-2 text-center text-xs font-medium transition ${
                isActive ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
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
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{eyebrow}</p> : null}
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
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
    <div className={`rounded-2xl border p-4 ${surfaceByTone(tone)}`}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {helper ? <p className="mt-1 text-sm text-zinc-400">{helper}</p> : null}
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
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${pillByTone(tone)} ${className}`}>
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
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-2xl shadow-black/20">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-2xl text-emerald-300">
        {icon}
      </div>
      <p className="mt-4 font-semibold text-white">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p> : null}
    </div>
  );
}

function pillByTone(tone: Tone): string {
  const tones: Record<Tone, string> = {
    neutral: "border-zinc-700 bg-zinc-800/80 text-zinc-300",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  };
  return tones[tone];
}

function surfaceByTone(tone: Tone): string {
  const tones: Record<Tone, string> = {
    neutral: "border-zinc-800 bg-zinc-900/80",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    red: "border-red-500/20 bg-red-500/10",
    sky: "border-sky-500/20 bg-sky-500/10",
    violet: "border-violet-500/20 bg-violet-500/10",
  };
  return tones[tone];
}

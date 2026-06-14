import type { CSSProperties, ReactNode } from "react";

type Tone = "neutral" | "emerald" | "amber" | "red" | "sky" | "blue" | "violet" | "stone";

// ─── Screen wrapper ──────────────────────────────────────────────────────────

export function Screen({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`theme-scope theme-token-text mx-auto w-full max-w-7xl px-5 pb-10 pt-6 sm:px-8 lg:px-10 lg:pt-8 ${className}`}>
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
        <p className="theme-appbar-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">{kicker ?? "Core Command"}</p>
        <h1 className="text-2xl font-semibold tracking-tight theme-token-text sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm leading-6 theme-token-muted">{subtitle}</p> : null}
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
          {eyebrow ? <p className="theme-appbar-kicker text-[11px] font-semibold uppercase tracking-[0.2em]">{eyebrow}</p> : null}
          <h2 className="text-lg font-semibold tracking-tight theme-token-text">{title}</h2>
        </div>
        {typeof count === "number" ? (
          <span className="theme-count-badge inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold">
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
  const style = toneStyle(tone);
  return (
    <div className="theme-card-surface rounded-[24px] p-4" style={style}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] theme-token-muted">{label}</p>
      <div className={`mt-2 font-semibold theme-token-text ${isLongString ? "text-sm leading-snug" : "text-2xl"}`}>{value}</div>
      {helper ? <p className="mt-1 text-sm theme-token-muted">{helper}</p> : null}
    </div>
  );
}

// ─── Pill / Badge ─────────────────────────────────────────────────────────────

export function Pill({ children, tone = "neutral", className = "" }: {
  children: ReactNode; tone?: Tone; className?: string;
}): JSX.Element {
  return (
    <span className={`theme-pill px-2.5 py-1 text-xs font-semibold shadow-sm ${className}`} style={toneStyle(tone)}>
      {children}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ title, description, icon = "✓", tone = "neutral" }: {
  title: string; description?: ReactNode; icon?: ReactNode; tone?: "neutral" | "emerald" | "amber" | "red";
}): JSX.Element {
  const style = toneStyle(tone);
  return (
    <div className="theme-card-surface rounded-[28px] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl" style={{
        ...style,
        background: "color-mix(in srgb, var(--tone-color) 14%, var(--surface-2))",
        color: "color-mix(in srgb, var(--tone-color) 86%, var(--text))",
        borderColor: "color-mix(in srgb, var(--tone-color) 32%, var(--border))",
      }}>
        {icon}
      </div>
      <p className="mt-4 font-semibold theme-token-text">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 theme-token-muted">{description}</p> : null}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function Table({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="theme-card-surface overflow-hidden rounded-xl">
      <table className="w-full min-w-0 border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }): JSX.Element {
  return <thead className="border-b theme-token-border theme-token-surface-2">{children}</thead>;
}

export function Tbody({ children }: { children: ReactNode }): JSX.Element {
  return <tbody className="divide-y theme-token-border">{children}</tbody>;
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider theme-token-muted ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  return <td className={`px-4 py-3 text-sm theme-token-muted ${className}`}>{children}</td>;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = "", onClick }: {
  children: ReactNode; className?: string; onClick?: () => void;
}): JSX.Element {
  const base = "theme-card-surface rounded-xl p-4";
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} theme-card-hover w-full text-left transition ${className}`}>
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
    primary: "theme-btn-primary",
    secondary: "theme-btn-secondary",
    danger: "theme-btn-danger",
    ghost: "theme-btn-ghost",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`theme-btn inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, max, tone = "emerald" }: { value: number; max: number; tone?: "emerald" | "amber" | "red" | "stone" }): JSX.Element {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="theme-progress-track h-2 overflow-hidden rounded-full">
      <div style={{ width: `${pct}%`, ...toneStyle(tone), background: "var(--tone-color)" }} className="h-full rounded-full transition-all" />
    </div>
  );
}

function toneStyle(tone: Tone): CSSProperties {
  const tones: Record<Tone, string> = {
    neutral: "var(--text-muted)",
    emerald: "var(--stato-consegnato)",
    amber: "var(--stato-sistemato)",
    red: "var(--stato-bloccato)",
    sky: "var(--stato-posa)",
    blue: "var(--stato-posa)",
    violet: "var(--stato-srtp)",
    stone: "var(--text-faint)",
  };
  return { ["--tone-color" as string]: tones[tone] };
}

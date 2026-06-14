type FunnelMetric = {
  label: string;
  value: number;
  detail: string;
  colorVar: `--${string}`;
};

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function barColor(metric: FunnelMetric): string {
  return metric.value >= 100 ? "var(--stato-consegnato)" : `var(${metric.colorVar})`;
}

function FunnelBarRow({ metric }: { metric: FunnelMetric }): JSX.Element {
  const pct = clampPct(metric.value);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs theme-token-muted">
        <span>{metric.label}</span>
        <span className="font-mono">{pct}% · {metric.detail}</span>
      </div>
      <div className="funnel-bar-track">
        <div className="funnel-bar-fill" style={{ width: `${pct}%`, ["--bar-color" as string]: barColor(metric) }} />
      </div>
    </div>
  );
}

export function FunnelBars({
  posa,
  sistemato,
  collegato,
  className = "",
}: {
  posa: FunnelMetric;
  sistemato: FunnelMetric;
  collegato: FunnelMetric;
  className?: string;
}): JSX.Element {
  return (
    <div className={`funnel-bars ${className}`.trim()}>
      <FunnelBarRow metric={posa} />
      <FunnelBarRow metric={sistemato} />
      <FunnelBarRow metric={collegato} />
    </div>
  );
}

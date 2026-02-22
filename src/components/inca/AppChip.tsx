
type AppChipSide = "DA" | "A";

export type AppChipProps = {
  value?: string | null;
  side?: AppChipSide;
  className?: string;
  titlePrefix?: string;
};

export function AppChip(props: AppChipProps) {
  const { value, side, className, titlePrefix } = props;

  if (!value) {
    return <span className="opacity-40">—</span>;
  }

  const base =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium " +
    "max-w-[240px] overflow-hidden";

  const variant =
    side === "DA"
      ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";

  const label =
    side === "DA" ? "DA" : side === "A" ? "A" : undefined;

  const title = titlePrefix
    ? `${titlePrefix}: ${value}`
    : label
      ? `${label}: ${value}`
      : value;

  return (
    <span className={`${base} ${variant} ${className ?? ""}`} title={title}>
      {label ? (
        <span className="opacity-60 text-[10px] tracking-wide shrink-0">
          {label}
        </span>
      ) : null}
      <span className="truncate">{value}</span>
    </span>
  );
}

export default AppChip;

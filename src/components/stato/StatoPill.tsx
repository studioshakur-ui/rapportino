import { STATO_CONSEGNA, type StatoConsegnaKey } from "../../domain/statoConsegna";

export function StatoPill({
  stato,
  label,
  className = "",
}: {
  stato: StatoConsegnaKey;
  label?: string;
  className?: string;
}): JSX.Element {
  const meta = STATO_CONSEGNA[stato];
  return (
    <span className={`stato-pill ${className}`.trim()} style={{ ["--stato-color" as string]: `var(${meta.varCSS})` }}>
      <span className="stato-pill-dot" aria-hidden />
      <span>{label ?? meta.label}</span>
    </span>
  );
}

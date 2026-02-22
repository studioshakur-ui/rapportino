// src/navemaster/components/ShipSelector.tsx
import type { ShipLite } from "../contracts/navemaster.types";
import { useI18n } from "../../i18n/coreI18n";

export default function ShipSelector(props: {
  ships: ShipLite[];
  value: string | null;
  onChange: (shipId: string) => void;
  disabled?: boolean;
}): JSX.Element {
  const { ships, value, onChange, disabled } = props;
  const { t } = useI18n();

  return (
    <label className="flex flex-col gap-1 min-w-[260px]">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("NM_SHIP_LABEL")}</div>
      <select
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
      >
        <option value="" disabled>
          —
        </option>
        {ships.map((s) => (
          <option key={s.id} value={s.id}>
            {s.code ? `${s.code} — ` : ""}{s.name ?? s.id}
          </option>
        ))}
      </select>
    </label>
  );
}

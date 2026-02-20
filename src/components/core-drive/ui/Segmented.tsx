// /src/components/core-drive/ui/Segmented.jsx
import type { ReactNode } from "react";

type SegmentedOption<T extends string | number> = { value: T; label?: ReactNode };

export default function Segmented<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange?: (value: T | ((prev: T) => T)) => void;
  options: Array<SegmentedOption<T>>;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/60 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange?.(o.value)}
            className={[
              "px-3 py-1 rounded-full text-[12px] transition-colors",
              active ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

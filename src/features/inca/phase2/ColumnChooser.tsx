import { IncaColumn } from "./types";

export default function ColumnChooser({
  columns,
  onToggle
}: {
  columns: IncaColumn[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="p-3 space-y-2">
      {columns.map(col => (
        <label key={col.key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={col.visible}
            onChange={() => onToggle(col.key)}
          />
          {col.label}
        </label>
      ))}
    </div>
  );
}

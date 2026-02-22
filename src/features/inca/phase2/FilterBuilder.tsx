import { useState  } from "react";
import { IncaFilter } from "./types";

export default function FilterBuilder({
  onApply
}: {
  onApply: (filters: IncaFilter[]) => void;
}) {
  const [filters, setFilters] = useState<IncaFilter[]>([]);

  function addFilter() {
    setFilters([...filters, { key: "codice", op: "contains", value: "" }]);
  }

  return (
    <div className="p-3 space-y-2">
      {filters.map((f, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={f.key}
            onChange={e => {
              const copy = [...filters];
              copy[i].key = e.target.value;
              setFilters(copy);
            }}
            className="border px-2"
          />
          <input
            value={f.value}
            onChange={e => {
              const copy = [...filters];
              copy[i].value = e.target.value;
              setFilters(copy);
            }}
            className="border px-2"
          />
        </div>
      ))}
      <button onClick={addFilter}>+ Filtro</button>
      <button onClick={() => onApply(filters)}>Apply</button>
    </div>
  );
}

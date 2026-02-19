import React from "react";
import { IncaColumn } from "./types";

export default function IncaDataGrid({
  rows,
  columns
}: {
  rows: any[];
  columns: IncaColumn[];
}) {
  const visibleCols = columns.filter(c => c.visible);

  return (
    <div className="overflow-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {visibleCols.map(col => (
              <th key={col.key} className="px-3 py-2 text-left border-b">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              {visibleCols.map(col => (
                <td key={col.key} className="px-3 py-2">
                  {row[col.key] ?? row.raw?.[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
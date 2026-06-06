// src/modules/daily-lists/components/DailyListTable.tsx — V2 (post-audit)
// 5 colonnes max. Zéro confiance, zéro APP codes, zéro snake_case.
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { DailyListItemVM, DailyItemStatus } from "../dailyLists.types";
import { STATUS_META } from "../dailyLists.types";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

interface Props { items: DailyListItemVM[] }

const STATUS_ORDER: DailyItemStatus[] = [
  "blocked", "missing", "no_evidence", "to_verify",
  "likely_laid", "confirmed_field", "outside_inca",
];

export default function DailyListTable({ items }: Props) {
  const navigate = useNavigate();
  const [filter,    setFilter]    = useState<DailyItemStatus | "all">("all");
  const [perimeter, setPerimeter] = useState<string>("all");
  const [search,    setSearch]    = useState("");

  const perimeters = useMemo(
    () => Array.from(new Set(items.map((i) => i.perimetro ?? "—"))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    let list = [...items];
    if (filter !== "all")    list = list.filter((i) => i.computed_status === filter);
    if (perimeter !== "all") list = list.filter((i) => (i.perimetro ?? "—") === perimeter);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(
        (i) =>
          i.cable_code_normalized.includes(q) ||
          i.cable_code_raw.toUpperCase().includes(q) ||
          (i.note ?? "").toUpperCase().includes(q) ||
          (i.last_actor ?? "").toUpperCase().includes(q)
      );
    }
    return list.sort(
      (a, b) => STATUS_ORDER.indexOf(a.computed_status) - STATUS_ORDER.indexOf(b.computed_status)
    );
  }, [items, filter, perimeter, search]);

  const statusCounts = useMemo(() => {
    const m = new Map<DailyItemStatus, number>();
    for (const i of items) m.set(i.computed_status, (m.get(i.computed_status) ?? 0) + 1);
    return m;
  }, [items]);

  return (
    <div className="space-y-3">
      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Câble, zone, responsable…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 py-1.5 text-sm placeholder:text-zinc-500 outline-none focus:border-zinc-500 w-52"
        />

        <select
          value={perimeter}
          onChange={(e) => setPerimeter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 py-1.5 text-sm outline-none"
        >
          <option value="all">Toutes les zones</option>
          {perimeters.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              filter === "all"
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            Tous ({items.length})
          </button>
          {STATUS_ORDER.map((s) => {
            const cnt = statusCounts.get(s) ?? 0;
            if (cnt === 0) return null;
            const meta = STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  filter === s
                    ? `${meta.color} ${meta.textColor} ring-1 ring-current`
                    : `${meta.color} ${meta.textColor} opacity-70 hover:opacity-100`
                }`}
              >
                {meta.icon} {cnt}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table — 5 colonnes ── */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-zinc-500 uppercase tracking-wider bg-zinc-900/80">
              <th className="px-4 py-2.5 font-medium">Câble</th>
              <th className="px-4 py-2.5 font-medium">Statut</th>
              <th className="px-4 py-2.5 font-medium">Zone</th>
              <th className="px-4 py-2.5 font-medium">Terrain</th>
              <th className="px-4 py-2.5 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-sm">
                  Aucun câble pour ce filtre.
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const meta = STATUS_META[item.computed_status];
              const ev   = item.evidence[0];
              return (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/command/cable/${encodeURIComponent(item.cable_code_normalized)}`)}
                  className="border-t border-zinc-800 hover:bg-zinc-800/40 cursor-pointer transition"
                >
                  {/* Câble */}
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-white">
                      {formatCableDisplay(item.cable_code_normalized)}
                    </span>
                    {item.progress_percent !== null && item.progress_percent < 100 && (
                      <span className="ml-2 text-xs font-bold text-amber-400">
                        {item.progress_percent}%
                      </span>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${meta.color} ${meta.textColor}`}>
                      {meta.icon} {meta.label}
                    </span>
                  </td>

                  {/* Zone */}
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {item.perimetro ?? "—"}
                  </td>

                  {/* Terrain */}
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {ev ? (
                      <>
                        {ev.actor_label && (
                          <span className="text-zinc-300 font-medium">{ev.actor_label}</span>
                        )}
                        {ev.actor_label && " · "}
                        {new Date(ev.occurred_at).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "2-digit",
                        })}
                      </>
                    ) : "—"}
                  </td>

                  {/* Note */}
                  <td className="px-4 py-3 text-xs text-zinc-500 max-w-[220px] truncate">
                    {item.note ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-zinc-600 text-right">
          {filtered.length} câble{filtered.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

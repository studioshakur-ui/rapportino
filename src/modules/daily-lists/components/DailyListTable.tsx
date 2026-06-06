// src/modules/daily-lists/components/DailyListTable.tsx — V3 mobile shell
// Statut métier inchangé. Câbles via formatCableDisplay(), APP cliquables.
import { useState, useMemo, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { DailyListItemVM, DailyItemStatus } from "../dailyLists.types";
import { STATUS_META } from "../dailyLists.types";
import { EmptyState, Pill } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

interface Props { items: DailyListItemVM[] }

const STATUS_ORDER: DailyItemStatus[] = [
  "blocked", "missing", "no_evidence", "to_verify",
  "likely_laid", "confirmed_field", "outside_inca",
];

const STATUS_TONE: Record<DailyItemStatus, "neutral" | "emerald" | "amber" | "red" | "sky" | "violet"> = {
  confirmed_field: "emerald",
  likely_laid: "sky",
  to_verify: "amber",
  no_evidence: "neutral",
  missing: "red",
  blocked: "red",
  outside_inca: "violet",
};

export default function DailyListTable({ items }: Props): JSX.Element {
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
          (i.app_partenza ?? "").toUpperCase().includes(q) ||
          (i.app_arrivo ?? "").toUpperCase().includes(q) ||
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

  function openCable(code: string) {
    navigate(`/command/cable/${encodeURIComponent(code)}`);
  }

  function openEquipment(event: MouseEvent, code: string | null) {
    event.stopPropagation();
    const clean = code?.trim();
    if (!clean) return;
    navigate(`/command/equipment/${encodeURIComponent(clean)}`);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
          <input
            type="search"
            placeholder="Câble, zone, APP, responsable…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />

          <select
            value={perimeter}
            onChange={(e) => setPerimeter(e.target.value)}
            className="min-h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-zinc-600"
          >
            <option value="all">Toutes les zones</option>
            {perimeters.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
              filter === "all" ? "border-white bg-white text-zinc-950" : "border-zinc-700 bg-zinc-800/80 text-zinc-300"
            }`}
          >
            Tous ({items.length})
          </button>
          {STATUS_ORDER.map((status) => {
            const count = statusCounts.get(status) ?? 0;
            if (count === 0) return null;
            const meta = STATUS_META[status];
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  filter === status ? "border-white bg-white text-zinc-950" : "border-zinc-700 bg-zinc-800/80 text-zinc-300"
                }`}
              >
                {meta.icon} {count}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun câble pour ce filtre" description="Modifier la recherche ou afficher tous les statuts." icon="⌕" />
      ) : null}

      <div className="space-y-3 md:hidden">
        {filtered.map((item) => {
          const meta = STATUS_META[item.computed_status];
          const ev   = item.evidence[0];
          return (
            <article key={item.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
              <button onClick={() => openCable(item.cable_code_normalized)} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-semibold text-white">{formatCableDisplay(item.cable_code_normalized)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.perimetro ?? "—"}</p>
                  </div>
                  <Pill tone={STATUS_TONE[item.computed_status]}>{meta.icon} {meta.label}</Pill>
                </div>
                {item.progress_percent !== null && item.progress_percent < 100 ? (
                  <p className="mt-2 text-xs font-semibold text-amber-300">Progression terrain {item.progress_percent}%</p>
                ) : null}
                {ev ? (
                  <p className="mt-3 text-xs leading-5 text-zinc-400">
                    {ev.actor_label ? <span className="font-medium text-zinc-200">{ev.actor_label}</span> : null}
                    {ev.actor_label ? " · " : ""}
                    {new Date(ev.occurred_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </p>
                ) : null}
                {item.note ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{item.note}</p> : null}
              </button>

              {(item.app_partenza || item.app_arrivo) ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                  <EquipmentButton label="APP-P" code={item.app_partenza} onClick={openEquipment} />
                  <EquipmentButton label="APP-A" code={item.app_arrivo} onClick={openEquipment} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-800 md:block">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-900/80 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 font-medium">Câble</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">APP</th>
              <th className="px-4 py-3 font-medium">Terrain</th>
              <th className="px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const meta = STATUS_META[item.computed_status];
              const ev   = item.evidence[0];
              return (
                <tr
                  key={item.id}
                  onClick={() => openCable(item.cable_code_normalized)}
                  className="cursor-pointer border-t border-zinc-800 transition hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-white">{formatCableDisplay(item.cable_code_normalized)}</span>
                    {item.progress_percent !== null && item.progress_percent < 100 ? (
                      <span className="ml-2 text-xs font-bold text-amber-400">{item.progress_percent}%</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${meta.color} ${meta.textColor}`}>
                      {meta.icon} {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{item.perimetro ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <EquipmentButton label="APP-P" code={item.app_partenza} onClick={openEquipment} />
                      <EquipmentButton label="APP-A" code={item.app_arrivo} onClick={openEquipment} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {ev ? (
                      <>
                        {ev.actor_label ? <span className="font-medium text-zinc-300">{ev.actor_label}</span> : null}
                        {ev.actor_label ? " · " : ""}
                        {new Date(ev.occurred_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                      </>
                    ) : "—"}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs text-zinc-500">{item.note ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 ? (
        <p className="text-right text-xs text-zinc-600">{filtered.length} câble{filtered.length > 1 ? "s" : ""}</p>
      ) : null}
    </div>
  );
}

function EquipmentButton({
  label,
  code,
  onClick,
}: {
  label: string;
  code: string | null;
  onClick: (event: MouseEvent, code: string | null) => void;
}): JSX.Element | null {
  if (!code?.trim()) return null;
  return (
    <button
      type="button"
      onClick={(event) => onClick(event, code)}
      className="w-fit rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-left text-[11px] text-zinc-400 transition hover:border-sky-500/40 hover:text-sky-300"
    >
      <span className="mr-1 text-zinc-600">{label}</span>
      <span className="font-mono text-zinc-200">{code}</span>
    </button>
  );
}

import { Link } from "react-router-dom";
import type { EquipmentLinkedCable } from "../equipment.types";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

export function EquipmentCableList({
  title,
  cables,
}: {
  title: string;
  cables: EquipmentLinkedCable[];
}): JSX.Element {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{title}</h2>
        <span className="text-xs text-zinc-400">{cables.length}</span>
      </div>
      <div className="space-y-2">
        {cables.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucun câble.</p>
        ) : cables.map((cable) => (
          <Link
            key={`${title}-${cable.id}`}
            to={cable.cable_story_path}
            className="block rounded-lg border border-zinc-100 px-3 py-2 text-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono font-semibold">{formatCableDisplay(cable.cable_code_normalized)}</span>
                <span className="ml-2 text-xs text-zinc-400">{cable.inca_status_label}</span>
              </div>
              <span className="text-xs text-zinc-400">{cable.confirmed_by_whatsapp ? "preuve" : "sans preuve"}</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {cable.risk_reasons[0] ?? cable.recommended_action}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

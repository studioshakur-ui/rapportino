import { Link } from "react-router-dom";
import type { EquipmentLinkedCable } from "../equipment.types";
import { EmptyState, Pill, Section } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { translateIncaStatus } from "../../../domain/core-engine/incaStatus";

function statusTone(cable: EquipmentLinkedCable): "neutral" | "emerald" | "amber" | "red" | "sky" {
  const status = translateIncaStatus(cable.inca_status_code);
  if (status.isClosed || cable.confirmed_by_whatsapp) return "emerald";
  if (status.isBlocked || cable.open_blocker_count > 0) return "red";
  if (cable.risk_reasons.length > 0 || cable.open_priority_count > 0) return "amber";
  if (status.status === "POSATO") return "sky";
  return "neutral";
}

export function EquipmentCableList({
  title,
  cables,
}: {
  title: string;
  cables: EquipmentLinkedCable[];
}): JSX.Element {
  return (
    <Section title={title} eyebrow="Cable Story" count={cables.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
      {cables.length === 0 ? (
        <EmptyState title="Nessun cavo" description="Nessun cavo collegato in questa direzione." icon="◌" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {cables.map((cable) => (
            <Link
              key={`${title}-${cable.id}`}
              to={cable.cable_story_path}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm transition hover:border-sky-500/40 hover:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-base font-semibold text-white">{formatCableDisplay(cable.cable_code_normalized)}</span>
                  <div className="mt-1 text-xs text-zinc-500">{cable.perimetro ?? "—"}</div>
                </div>
                <Pill tone={statusTone(cable)}>{cable.confirmed_by_whatsapp ? "Verificato" : "Da verificare"}</Pill>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone="neutral">{cable.inca_status_label}</Pill>
                {cable.open_blocker_count > 0 ? <Pill tone="red">{cable.open_blocker_count} Bloccato</Pill> : null}
                {cable.open_priority_count > 0 ? <Pill tone="amber">{cable.open_priority_count} Priorità</Pill> : null}
              </div>
              <div className="mt-3 text-xs leading-5 text-zinc-400">
                {cable.risk_reasons[0] ?? cable.recommended_action}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}

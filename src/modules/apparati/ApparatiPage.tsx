import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { loadCoreEngineSnapshot } from "../../domain/core-engine";
import { getPendingEvents } from "../../features/core-command/api/coreEvents.api";
import type { CoreEvent } from "../../features/core-command/types";

function closureLabel(status: string): string {
  if (status === "CLOSED") return "CHIUSO";
  if (status === "DA_CONFERMARE") return "DA CONFERMARE";
  if (status === "PARTIAL") return "PARZIALE";
  if (status === "BLOCKED") return "BLOCCATO";
  return "APERTO";
}

// Vérité partagée : un apparato è CHIUSO solo se i cavi sono fatti E confermato
// dal capo. Cavi fatti senza conferma = DA_CONFERMARE (non ancora chiuso).
function effectiveClosure(item: { closure_status: string; confirmed: boolean }): string {
  if (item.closure_status === "CLOSED" && !item.confirmed) return "DA_CONFERMARE";
  return item.closure_status;
}

const EQUIPMENT_PAGE_SIZE = 18;
const SYSTEMS_PAGE_SIZE = 12;

function normalizeEquipmentCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function asPayload(payload: CoreEvent["payload"]): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function buildPendingEventsByEquipment(events: CoreEvent[]): Map<string, CoreEvent[]> {
  const byEquipment = new Map<string, CoreEvent[]>();

  for (const event of events) {
    if (event.event_type !== "FIELD_VERIFIED") continue;

    const payload = asPayload(event.payload);
    const equipmentCodes = [
      normalizeEquipmentCode(payload.app_partenza),
      normalizeEquipmentCode(payload.app_arrivo),
    ].filter(Boolean);

    for (const equipmentCode of new Set(equipmentCodes)) {
      const current = byEquipment.get(equipmentCode) ?? [];
      current.push(event);
      byEquipment.set(equipmentCode, current);
    }
  }

  return byEquipment;
}

function equipmentActionLabel(item: { closure_status: string }, remainingCables: number, pendingEvents: number): string {
  if (pendingEvents > 0) return `${pendingEvents} verifiche in attesa`;
  if (item.closure_status === "BLOCKED") return "Apri blocco";
  if (remainingCables > 0) return `Verificare ${remainingCables} cavi`;
  return "Conferma chiusura";
}

export default function ApparatiPage(): JSX.Element {
  const navigate = useNavigate();
  const [showAllEquipments, setShowAllEquipments] = useState(false);
  const [showAllSystems, setShowAllSystems] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 30_000,
  });

  const { data: pendingEvents = [] } = useQuery({
    queryKey: ["core_events", "pending", "apparati"],
    queryFn: () => getPendingEvents(100),
    staleTime: 10_000,
  });

  const apparatus = data?.apparatus ?? null;
  const pendingEventsByEquipment = buildPendingEventsByEquipment(pendingEvents);
  const apparatusPendingEvents = Array.from(pendingEventsByEquipment.values()).reduce((total, events) => total + events.length, 0);
  const openEquipments = apparatus?.equipments.filter((item) => effectiveClosure(item) !== "CLOSED") ?? [];
  const visibleEquipments = showAllEquipments ? openEquipments : openEquipments.slice(0, EQUIPMENT_PAGE_SIZE);
  const visibleSystems = showAllSystems ? (apparatus?.systems ?? []) : (apparatus?.systems ?? []).slice(0, SYSTEMS_PAGE_SIZE);

  return (
    <Screen className="max-w-6xl space-y-6">
      <AppBar
        title="Apparati"
        subtitle="Solo apparati che contano per la chiusura: chiusi, aperti o bloccati."
      />

      {!isLoading && !apparatus ? (
        <EmptyState
          title="Nessun dato disponibile"
          description="Importa una lista e sincronizza INCA per costruire il grafo apparati."
          icon="⚙"
        />
      ) : null}

      {apparatus ? (
        <>
          <Section title="Apparati da chiudere" eyebrow="Azione" count={openEquipments.length}>
            {openEquipments.length === 0 ? (
              <EmptyState
                title="Nessun apparato aperto"
                description="La lista attiva non richiede azioni apparato."
                icon="✓"
                tone="emerald"
              />
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleEquipments.map((equipment) => {
                    const equipmentPendingEvents = pendingEventsByEquipment.get(normalizeEquipmentCode(equipment.equipment_code)) ?? [];
                    const remainingCables = Math.max(equipment.total_cables - equipment.confirmed_cables, 0);
                    const actionLabel = equipmentActionLabel(equipment, remainingCables, equipmentPendingEvents.length);
                    const hasAiAttention = equipment.ai_validation_required > 0 || equipment.ai_incoherences > 0;

                    return (
                      <button
                        key={equipment.equipment_code}
                        onClick={() => navigate(equipment.route)}
                        className="rounded-[24px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-semibold text-stone-950">{equipment.equipment_code}</p>
                            <p className="mt-1 truncate text-xs text-stone-500">{equipment.equipment_name ?? equipment.zone ?? "ESWBS"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Pill tone={equipment.closure_status === "BLOCKED" ? "red" : effectiveClosure(equipment) === "CLOSED" ? "emerald" : "amber"}>
                              {closureLabel(effectiveClosure(equipment))}
                            </Pill>
                            {equipment.ai_incoherences > 0 ? <Pill tone="red">Incoerenza</Pill> : null}
                            {equipment.ai_validation_required > 0 && equipment.ai_incoherences === 0 ? <Pill tone="amber">Da validare</Pill> : null}
                            {equipmentPendingEvents.length > 0 ? <Pill tone="amber">In attesa</Pill> : null}
                          </div>
                        </div>

                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Mancano</p>
                        <div className="mt-1 text-xs text-stone-500">
                          {equipment.system ?? "—"} · {equipment.zone ?? "Zona non assegnata"}
                        </div>
                        <div className={`mt-2 text-xs ${equipment.closure_status === "BLOCKED" ? "text-red-700" : equipmentPendingEvents.length > 0 ? "text-amber-700" : "text-stone-600"}`}>
                          {equipment.closure_status === "BLOCKED"
                            ? equipment.blocker ?? "Blocco reale"
                            : equipment.ai_incoherences > 0
                              ? "Prove IA contraddittorie: non chiudere senza verifica"
                              : equipment.ai_validation_required > 0
                                ? "Prove IA presenti ma non ancora validate dal capo"
                            : equipmentPendingEvents.length > 0
                              ? "Validazione richiesta prima della chiusura"
                              : effectiveClosure(equipment) === "DA_CONFERMARE"
                                ? "Cavi completati, manca conferma capo"
                                : "Da verificare sul campo"}
                        </div>
                        {hasAiAttention ? (
                          <div className="mt-2 text-xs text-stone-500">
                            {equipment.ai_validation_required > 0 ? `${equipment.ai_validation_required} prove IA da validare` : null}
                            {equipment.ai_validation_required > 0 && equipment.ai_incoherences > 0 ? " · " : null}
                            {equipment.ai_incoherences > 0 ? `${equipment.ai_incoherences} incoerenze da verificare` : null}
                          </div>
                        ) : null}
                        {equipment.critical_path.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {equipment.critical_path.slice(0, 4).map((code) => (
                              <span key={code} className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 font-mono text-[11px] text-stone-700">
                                {formatCableDisplay(code)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div
                          className={`mt-4 inline-flex min-h-9 items-center rounded-xl border px-3 text-xs font-semibold ${
                            equipmentPendingEvents.length > 0
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {actionLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!showAllEquipments && openEquipments.length > EQUIPMENT_PAGE_SIZE && (
                  <button
                    onClick={() => setShowAllEquipments(true)}
                    className="mt-2 w-full rounded-2xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
                  >
                    Mostra tutti ({openEquipments.length})
                  </button>
                )}
              </>
            )}
          </Section>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Sistemi" value={apparatus.systems.length} tone="neutral" />
            <StatCard label="Apparati" value={apparatus.equipments.length} tone="neutral" />
            <StatCard label="Aperti" value={openEquipments.length} tone="amber" />
            <StatCard label="In attesa" value={apparatusPendingEvents} tone="amber" />
            <StatCard label="Bloccati" value={apparatus.equipments.filter((item) => item.closure_status === "BLOCKED").length} tone="red" />
            <StatCard label="Prove IA da validare" value={apparatus.equipments.reduce((total, item) => total + item.ai_validation_required, 0)} tone="amber" />
            <StatCard label="Incoerenze IA" value={apparatus.equipments.reduce((total, item) => total + item.ai_incoherences, 0)} tone={apparatus.equipments.some((item) => item.ai_incoherences > 0) ? "red" : "neutral"} />
          </div>

          <Section title="Chiusure per sistema" eyebrow="Sistema" count={apparatus.systems.length}>
            {apparatus.systems.length === 0 ? (
              <EmptyState
                title="Nessun sistema disponibile"
                description="Non ci sono sistemi aggregati nel snapshot corrente."
                icon="∅"
              />
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleSystems.map((system) => (
                    <article key={system.system} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-950">{system.system}</p>
                          <p className="mt-1 text-xs text-stone-500">{system.zone ?? "Zona non assegnata"}</p>
                        </div>
                        <Pill tone={system.closure_status === "BLOCKED" ? "red" : system.closure_status === "PARTIAL" ? "amber" : "emerald"}>
                          {closureLabel(system.closure_status)}
                        </Pill>
                      </div>
                      <p className="mt-3 text-xs text-stone-600">
                        {system.closed_equipments}/{system.total_equipments} chiusi · {system.blocked_equipments} bloccati
                      </p>
                    </article>
                  ))}
                </div>
                {!showAllSystems && apparatus.systems.length > SYSTEMS_PAGE_SIZE && (
                  <button
                    onClick={() => setShowAllSystems(true)}
                    className="mt-2 w-full rounded-2xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
                  >
                    Mostra tutti ({apparatus.systems.length})
                  </button>
                )}
              </>
            )}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

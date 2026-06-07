import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { loadCoreEngineSnapshot } from "../../domain/core-engine";

export default function ApparatiPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 30_000,
  });

  const apparatus = data?.apparatus ?? null;

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Sistemi" value={apparatus.systems.length} tone="neutral" />
            <StatCard label="Apparati" value={apparatus.equipments.length} tone="neutral" />
            <StatCard label="Aperti" value={apparatus.equipments.filter((item) => item.closure_status !== "CLOSED").length} tone="amber" />
            <StatCard label="Bloccati" value={apparatus.equipments.filter((item) => item.closure_status === "BLOCKED").length} tone="red" />
          </div>

          <Section title="Apparati critici" eyebrow="Chiusura" count={apparatus.equipments.length}>
            {apparatus.equipments.length === 0 ? (
              <EmptyState
                title="Nessun apparato critico"
                description="La lista attiva non lascia apparati aperti o bloccati."
                icon="✓"
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {apparatus.equipments.slice(0, 18).map((equipment) => (
                  <button
                    key={equipment.equipment_code}
                    onClick={() => navigate(equipment.route)}
                    className="rounded-[24px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-stone-950">{equipment.equipment_code}</p>
                        <p className="mt-1 truncate text-xs text-stone-500">{equipment.equipment_name ?? equipment.zone ?? "ESWBS"}</p>
                      </div>
                      <Pill tone={equipment.closure_status === "BLOCKED" ? "red" : equipment.closure_status === "PARTIAL" ? "amber" : "emerald"}>
                        {equipment.closure_status}
                      </Pill>
                    </div>

                    <div className="mt-3 text-xs text-stone-600">
                      {equipment.confirmed_cables}/{equipment.total_cables} cavi confermati
                    </div>
                    <div className="mt-1 text-xs text-stone-500">
                      {equipment.system ?? "SISTEMA NON ASSEGNATO"} · {equipment.zone ?? "Zona non assegnata"}
                    </div>
                    <div className="mt-2 text-xs text-red-700">
                      {equipment.blocker ?? "Nessun blocco aperto"}
                    </div>
                    {equipment.critical_path.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {equipment.critical_path.slice(0, 4).map((code) => (
                          <span key={code} className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 font-mono text-[11px] text-stone-700">
                            {formatCableDisplay(code)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title="Chiusure per sistema" eyebrow="Sistema" count={apparatus.systems.length}>
            {apparatus.systems.length === 0 ? (
              <EmptyState
                title="Nessun sistema disponibile"
                description="Non ci sono sistemi aggregati nel snapshot corrente."
                icon="∅"
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {apparatus.systems.slice(0, 12).map((system) => (
                  <article key={system.system} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-950">{system.system}</p>
                        <p className="mt-1 text-xs text-stone-500">{system.zone ?? "Zona non assegnata"}</p>
                      </div>
                      <Pill tone={system.closure_status === "BLOCKED" ? "red" : system.closure_status === "PARTIAL" ? "amber" : "emerald"}>
                        {system.closure_status}
                      </Pill>
                    </div>
                    <p className="mt-3 text-xs text-stone-600">
                      {system.closed_equipments}/{system.total_equipments} chiusi · {system.blocked_equipments} bloccati
                    </p>
                  </article>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

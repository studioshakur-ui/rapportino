import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { EmptyState, Pill, Screen, Section, StatCard, AppBar } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { loadEquipmentIntelligenceDashboard } from "../../../modules/equipment/equipmentIntelligence.repo";
import type { EquipmentClosureStatus, SystemClosure, TelegramImpact } from "../../../modules/equipment/equipment.types";

function closureTone(status: EquipmentClosureStatus): "emerald" | "amber" | "red" | "neutral" {
  if (status === "CLOSED") return "emerald";
  if (status === "PARTIAL") return "amber";
  if (status === "BLOCKED") return "red";
  return "neutral";
}

export default function CommandCenterPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["equipment_intelligence_dashboard"],
    queryFn: loadEquipmentIntelligenceDashboard,
    staleTime: 30_000,
  });

  if (!isLoading && !data?.import_id) {
    return (
      <Screen>
        <EmptyState
          title="Nessuna lista importata"
          description="Importa la lista del giorno per aprire il cockpit chiusura sistemi."
          icon="📋"
        />
      </Screen>
    );
  }

  const systems = data?.systems ?? [];
  const equipments = data?.equipments ?? [];
  const criticalSystems = systems.filter((system) => system.closure_status !== "CLOSED").slice(0, 6);
  const criticalEquipments = equipments.filter((equipment) => equipment.closure_status !== "CLOSED").slice(0, 8);
  const impacts = data?.telegram_impacts ?? [];

  return (
    <Screen className="max-w-6xl space-y-6">
      <section className="rounded-[32px] border border-stone-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f0e3_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <AppBar
          title="Command Center"
          subtitle="Chiusura sistema prima della percentuale cavo"
          action={
            <Pill tone={data && data.closed_systems === data.total_systems && data.total_systems > 0 ? "emerald" : "amber"}>
              {data?.closed_systems ?? 0}/{data?.total_systems ?? 0} sistemi chiusi
            </Pill>
          }
        />

        <div className="mt-4 flex flex-col gap-2 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span>{data?.file_name ?? "Lista attiva"}</span>
            <span className="mx-2 text-stone-300">·</span>
            <span>{data?.list_date ?? "data sconosciuta"}</span>
          </div>
          <button
            onClick={() => navigate("/command/daily-lists")}
            className="min-h-10 w-fit rounded-2xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
          >
            Apri Liste giornaliere
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sistemi chiusi" value={data?.closed_systems ?? 0} helper={`/ ${data?.total_systems ?? 0}`} tone="emerald" />
          <StatCard label="Sistemi bloccati" value={data?.blocked_systems ?? 0} helper="blocco critico" tone={(data?.blocked_systems ?? 0) > 0 ? "red" : "neutral"} />
          <StatCard label="Apparati chiusi" value={data?.closed_equipments ?? 0} helper={`/ ${data?.total_equipments ?? 0}`} tone="sky" />
          <StatCard label="Apparati aperti" value={criticalEquipments.length} helper="da trattare" tone={criticalEquipments.length > 0 ? "amber" : "neutral"} />
        </div>
      </section>

      {isError ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Caricamento incompleto del motore P4. Le viste di chiusura possono essere parziali.
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-[28px] border border-stone-200 bg-stone-100" />
          ))}
        </div>
      ) : null}

      {!isLoading && criticalSystems.length > 0 ? (
        <Section title="Chiusure critiche" eyebrow="System Closure Engine" count={criticalSystems.length}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {criticalSystems.map((system) => (
              <SystemCard key={system.system} system={system} onOpenEquipment={(code) => navigate(`/command/equipment/${encodeURIComponent(code)}`)} />
            ))}
          </div>
        </Section>
      ) : null}

      {!isLoading && criticalEquipments.length > 0 ? (
        <Section title="Apparati critici" eyebrow="Equipment Intelligence Engine" count={criticalEquipments.length}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {criticalEquipments.map((equipment) => (
              <button
                key={equipment.equipment_code}
                onClick={() => navigate(`/command/equipment/${encodeURIComponent(equipment.equipment_code)}`)}
                className="rounded-[28px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-base font-semibold text-stone-950">{equipment.equipment_code}</p>
                    <p className="mt-1 text-xs text-stone-500">{equipment.system ?? "SISTEMA NON ASSEGNATO"}</p>
                  </div>
                  <Pill tone={closureTone(equipment.closure_status)}>{equipment.closure_status}</Pill>
                </div>
                <p className="mt-3 text-sm font-medium text-stone-900">
                  {equipment.confirmed_cables}/{equipment.total_cables} cavi confermati
                </p>
                <p className="mt-1 text-xs text-stone-600">
                  {equipment.open_cables} restant{equipment.open_cables > 1 ? "i" : "e"}
                  {equipment.blocked_cables > 0 ? ` · ${equipment.blocked_cables} bloccato` : ""}
                </p>
                {equipment.critical_path[0] ? (
                  <p className="mt-3 text-xs leading-5 text-rose-700">
                    Bloccato da {formatCableDisplay(equipment.critical_path[0].cable_code)} · {equipment.critical_path[0].reason}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {!isLoading && impacts.length > 0 ? (
        <Section title="Ultimi impatti Telegram" eyebrow="Telegram Impact Engine" count={impacts.length}>
          <div className="grid gap-3 md:grid-cols-2">
            {impacts.map((impact) => (
              <TelegramImpactCard key={`${impact.message_id}:${impact.cable_code}`} impact={impact} onOpenCable={() => navigate(`/command/cable/${encodeURIComponent(impact.cable_code)}`)} />
            ))}
          </div>
        </Section>
      ) : null}

      {!isLoading && criticalSystems.length === 0 && criticalEquipments.length === 0 ? (
        <EmptyState
          title="Tutti i sistemi visibili sono chiusi"
          description="Il cockpit P4 non rileva sistemi o apparati critici nella lista attiva."
          icon="✓"
        />
      ) : null}
    </Screen>
  );
}

function SystemCard({
  system,
  onOpenEquipment,
}: {
  system: SystemClosure;
  onOpenEquipment: (code: string) => void;
}): JSX.Element {
  return (
    <article className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-950">{system.system}</p>
          <p className="mt-1 text-xs text-stone-500">{system.zone ?? "zona non valorizzata"}</p>
        </div>
        <Pill tone={closureTone(system.closure_status)}>{system.closure_status}</Pill>
      </div>

      <p className="mt-3 text-sm font-medium text-stone-900">
        {system.closed_equipments}/{system.total_equipments} apparati chiusi
      </p>
      <p className="mt-1 text-xs text-stone-600">
        {system.open_equipments} non chiusi
        {system.blocked_equipments > 0 ? ` · ${system.blocked_equipments} bloccati` : ""}
      </p>

      {system.critical_path.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {system.critical_path.slice(0, 3).map((blocker) => (
            <span key={`${system.system}:${blocker.cable_code}`} className="rounded-xl border border-rose-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-rose-700">
              {formatCableDisplay(blocker.cable_code)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {system.equipment_codes.slice(0, 4).map((equipmentCode) => (
          <button
            key={equipmentCode}
            onClick={() => onOpenEquipment(equipmentCode)}
            className="rounded-xl border border-stone-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-stone-700 transition hover:border-sky-300 hover:text-sky-700"
          >
            {equipmentCode}
          </button>
        ))}
      </div>
    </article>
  );
}

function TelegramImpactCard({
  impact,
  onOpenCable,
}: {
  impact: TelegramImpact;
  onOpenCable: () => void;
}): JSX.Element {
  return (
    <article className="rounded-[28px] border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-stone-500">{formatEventDate(impact.message_ts)}</p>
          <button onClick={onOpenCable} className="mt-1 font-mono text-base font-semibold text-stone-950 transition hover:text-sky-700">
            {formatCableDisplay(impact.cable_code)}
          </button>
        </div>
        <Pill tone={impact.system_closed ? "emerald" : "sky"}>{impact.system_closed ? "SISTEMA CHIUSO" : "IMPATTO"}</Pill>
      </div>
      {impact.text ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-700">{impact.text}</p> : null}
      <p className="mt-3 text-sm font-medium text-stone-900">
        Impatto: {impact.before_label}
        {impact.after_label !== impact.before_label ? ` -> ${impact.after_label}` : ""}
      </p>
      <p className="mt-1 text-xs text-stone-600">
        {impact.equipment_codes.join(", ")}
      </p>
    </article>
  );
}

function formatEventDate(value: string | null): string {
  if (!value) return "data sconosciuta";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

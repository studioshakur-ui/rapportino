import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppBar, EmptyState, Pill, Screen, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { loadEquipmentIntelligenceDashboard } from "../equipment/equipmentIntelligence.repo";
import type { EquipmentClosureStatus } from "../equipment/equipment.types";

function closureTone(status: EquipmentClosureStatus): "emerald" | "amber" | "red" | "neutral" {
  if (status === "CLOSED") return "emerald";
  if (status === "PARTIAL") return "amber";
  if (status === "BLOCKED") return "red";
  return "neutral";
}

export default function ApparatiPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["equipment_intelligence_dashboard"],
    queryFn: loadEquipmentIntelligenceDashboard,
    staleTime: 30_000,
  });

  const equipments = data?.equipments ?? [];
  const critical = equipments.filter((equipment) => equipment.closure_status !== "CLOSED");

  return (
    <Screen className="max-w-5xl space-y-6">
      <AppBar
        title="Apparati"
        subtitle="Lettura apparato chiuso / non chiuso prima della percentuale cavo."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Apparati" value={equipments.length} tone="neutral" />
        <StatCard label="Chiusi" value={equipments.filter((equipment) => equipment.closure_status === "CLOSED").length} tone="emerald" />
        <StatCard label="Non chiusi" value={critical.length} tone={critical.length > 0 ? "amber" : "neutral"} />
        <StatCard label="Bloccati" value={equipments.filter((equipment) => equipment.closure_status === "BLOCKED").length} tone={equipments.some((equipment) => equipment.closure_status === "BLOCKED") ? "red" : "neutral"} />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((index) => <div key={index} className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />)}
        </div>
      )}

      {!isLoading && equipments.length === 0 && (
        <EmptyState
          title="Nessun apparato monitorato"
          description="Importa una lista o un segnale di campo per alimentare l'intelligence apparati."
          icon="⚙"
        />
      )}

      {!isLoading && equipments.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Apparato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Chiusura</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Sistema</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Bloccante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {equipments.map((equipment) => (
                <tr
                  key={equipment.equipment_code}
                  onClick={() => navigate(`/command/equipment/${encodeURIComponent(equipment.equipment_code)}`)}
                  className="cursor-pointer transition hover:bg-blue-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-sm font-semibold text-gray-900">{equipment.equipment_code}</span>
                      <span className="text-xs text-gray-500">{equipment.equipment_name ?? equipment.zone ?? "ESWBS"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Pill tone={closureTone(equipment.closure_status)}>{equipment.closure_status}</Pill>
                      <span className="text-xs text-gray-600">{equipment.confirmed_cables}/{equipment.total_cables}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-gray-500 sm:table-cell">
                    {equipment.system ?? "SISTEMA NON ASSEGNATO"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {equipment.critical_path[0]
                      ? `${formatCableDisplay(equipment.critical_path[0].cable_code)} · ${equipment.critical_path[0].reason}`
                      : "nessuno"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}

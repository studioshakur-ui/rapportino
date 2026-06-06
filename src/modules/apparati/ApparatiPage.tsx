// src/modules/apparati/ApparatiPage.tsx
// Module Apparati — suivi de l'évolution terrain par équipement (APP-PARTENZA / APP-ARRIVO).
// Source: snapshots vision des images Telegram + impacts dérivés de la liste active.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { listRecentImports, loadItemsWithEvidence } from "../daily-lists/dailyLists.repo";
import { buildEquipmentImpactsFromDailyItems } from "../equipment/equipment.logic";
import { AppBar, Screen, Pill, EmptyState, StatCard } from "../../components/command-ui";

interface ApparatiSnapshot {
  id: string;
  equipment_code: string;
  occurred_at: string;
  total_cables: number;
  posati: number;
  priorita: number;
  note: string | null;
}

interface EquipmentRow {
  code: string;
  total: number;
  posati: number;
  priorita: number;
  pct: number;
  lastSeen: string | null;
  risk: "low" | "medium" | "high" | "critical";
  fromImage: boolean;
}

async function fetchSnapshots(): Promise<ApparatiSnapshot[]> {
  const { data, error } = await supabase
    .from("apparati_snapshots")
    .select("id, equipment_code, occurred_at, total_cables, posati, priorita, note")
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as ApparatiSnapshot[];
}

export default function ApparatiPage(): JSX.Element {
  const navigate = useNavigate();

  const { data: snapshots, isLoading: loadingSnap } = useQuery({
    queryKey: ["apparati_snapshots"],
    queryFn: fetchSnapshots,
    staleTime: 30_000,
  });

  const { data: imports } = useQuery({
    queryKey: ["daily_list_imports"],
    queryFn: () => listRecentImports(1),
    staleTime: 60_000,
  });
  const latest = imports?.[0] ?? null;

  const { data: items } = useQuery({
    queryKey: ["daily_list_items_vm", latest?.id],
    queryFn: () => loadItemsWithEvidence(latest!.id),
    enabled: Boolean(latest?.id),
    staleTime: 60_000,
  });

  const equipment = useMemo<EquipmentRow[]>(() => {
    const map = new Map<string, EquipmentRow>();

    // 1. Latest snapshot per equipment (from vision images — the freshest field truth)
    const seen = new Set<string>();
    for (const s of snapshots ?? []) {
      if (seen.has(s.equipment_code)) continue; // snapshots are sorted desc → first = latest
      seen.add(s.equipment_code);
      const pct = s.total_cables > 0 ? Math.round((s.posati / s.total_cables) * 100) : 0;
      map.set(s.equipment_code, {
        code: s.equipment_code,
        total: s.total_cables,
        posati: s.posati,
        priorita: s.priorita,
        pct,
        lastSeen: s.occurred_at,
        risk: s.priorita > 0 && pct < 50 ? "critical" : s.priorita > 0 ? "high" : pct < 50 ? "medium" : "low",
        fromImage: true,
      });
    }

    // 2. Merge derived impacts from the active daily list (for equipment not yet seen in images)
    const impacts = items ? buildEquipmentImpactsFromDailyItems(items) : [];
    for (const imp of impacts) {
      if (map.has(imp.equipment_code)) continue;
      const posati = imp.confirmed_by_field;
      const pct = imp.total_cables > 0 ? Math.round((posati / imp.total_cables) * 100) : 0;
      map.set(imp.equipment_code, {
        code: imp.equipment_code,
        total: imp.total_cables,
        posati,
        priorita: imp.blocked,
        pct,
        lastSeen: null,
        risk: imp.risk_level,
        fromImage: false,
      });
    }

    return [...map.values()].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      if (order[a.risk] !== order[b.risk]) return order[a.risk] - order[b.risk];
      return b.total - a.total;
    });
  }, [snapshots, items]);

  const isLoading = loadingSnap;
  const fromImageCount = equipment.filter((e) => e.fromImage).length;
  const criticalCount  = equipment.filter((e) => e.risk === "critical" || e.risk === "high").length;
  const totalPosati    = equipment.reduce((s, e) => s + e.posati, 0);
  const totalCables    = equipment.reduce((s, e) => s + e.total, 0);

  return (
    <Screen className="max-w-5xl space-y-6">
      <AppBar
        title="Apparati"
        subtitle="Évolution terrain par équipement (APP-PARTENZA / APP-ARRIVO) — alimenté par les images Telegram."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Équipements" value={equipment.length} tone="neutral" />
        <StatCard label="Câbles posés" value={totalPosati} helper={`/ ${totalCables}`} tone="emerald" />
        <StatCard label="À risque" value={criticalCount} tone={criticalCount > 0 ? "red" : "neutral"} />
        <StatCard label="Vus en image" value={fromImageCount} helper="source vision" tone={fromImageCount > 0 ? "blue" : "neutral"} />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />)}
        </div>
      )}

      {!isLoading && equipment.length === 0 && (
        <EmptyState
          title="Aucun équipement suivi"
          description="Importez une liste ou envoyez une photo de liste sur Telegram pour démarrer le suivi terrain."
          icon="⚙"
        />
      )}

      {!isLoading && equipment.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Équipement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Avancement</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Câbles</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Risque</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">Dernier signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {equipment.map((eq) => (
                <tr
                  key={eq.code}
                  onClick={() => navigate(`/command/equipment/${encodeURIComponent(eq.code)}`)}
                  className="cursor-pointer transition hover:bg-blue-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">{eq.code}</span>
                      {eq.fromImage && <Pill tone="blue">📷 vision</Pill>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                        <div
                          style={{ width: `${eq.pct}%` }}
                          className={`h-full rounded-full ${eq.pct === 0 ? "bg-gray-200" : eq.pct < 50 ? "bg-amber-400" : eq.pct < 80 ? "bg-blue-500" : "bg-emerald-500"}`}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{eq.pct}%</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-gray-500 sm:table-cell">
                    {eq.posati}/{eq.total}{eq.priorita > 0 && <span className="ml-1 text-red-600">· {eq.priorita} prio</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={eq.risk === "critical" || eq.risk === "high" ? "red" : eq.risk === "medium" ? "amber" : "emerald"}>
                      {eq.risk}
                    </Pill>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-gray-400 md:table-cell">
                    {eq.lastSeen
                      ? new Date(eq.lastSeen).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                      : "liste"}
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

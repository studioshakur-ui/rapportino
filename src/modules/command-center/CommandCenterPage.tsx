// src/modules/command-center/CommandCenterPage.tsx
// Module 1 — Command Center : production aujourd'hui, câbles posés, mètres,
// opérateurs actifs, production vs objectif, avancement global.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, StatCard, Card, Empty, Badge, useSurface } from "../_ui/kit";
import { fetchTodayProduction, fetchGlobalProgress, setDailyTarget } from "./api";
import QuickAddEvent from "./QuickAddEvent";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export default function CommandCenterPage(): JSX.Element {
  const { subtle, isDark, input, btn } = useSurface();
  const qc = useQueryClient();
  const [targetDraft, setTargetDraft] = useState("");
  const today = useQuery({ queryKey: ["production_kpi", "today"], queryFn: fetchTodayProduction });
  const global = useQuery({ queryKey: ["production_kpi", "global"], queryFn: fetchGlobalProgress });

  const saveTarget = useMutation({
    mutationFn: (m: number) => setDailyTarget(m),
    onSuccess: () => {
      setTargetDraft("");
      void qc.invalidateQueries({ queryKey: ["production_kpi"] });
    },
  });

  const t = today.data;
  const g = global.data;
  const objRatio =
    t && t.metersTarget && t.metersTarget > 0 ? Math.min(1, t.metersPosed / t.metersTarget) : null;

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle={`Production du jour · ${new Date().toLocaleDateString("fr-FR")}`}
      />

      {today.isError && <Empty>Erreur de chargement de la production.</Empty>}

      {/* Saisie rapide */}
      <div className="mb-4">
        <QuickAddEvent />
      </div>

      {/* Production du jour */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Câbles posés" value={t ? fmt(t.cablesPosed) : "—"} tone="sky" />
        <StatCard label="Mètres posés" value={t ? fmt(t.metersPosed) : "—"} unit="m" tone="emerald" />
        <StatCard label="Opérateurs actifs" value={t ? fmt(t.activeOperators) : "—"} />
        <StatCard
          label="Objectif jour"
          value={t?.metersTarget != null ? fmt(t.metersTarget) : "—"}
          unit={t?.metersTarget != null ? "m" : undefined}
          hint={objRatio != null ? `${Math.round(objRatio * 100)}% atteint` : "Pas d'objectif défini"}
          tone="amber"
        />
      </div>

      {/* Production vs objectif */}
      {objRatio != null && (
        <Card className="mt-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Production vs objectif</span>
            <Badge tone={objRatio >= 1 ? "emerald" : objRatio >= 0.6 ? "amber" : "rose"}>
              {Math.round(objRatio * 100)}%
            </Badge>
          </div>
          <div className={`h-3 w-full overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
              style={{ width: `${Math.round(objRatio * 100)}%` }}
            />
          </div>
        </Card>
      )}

      {/* Réglage de l'objectif du jour */}
      <Card className="mt-4 flex flex-wrap items-center gap-2 p-4">
        <span className={`text-sm ${subtle}`}>
          {t?.metersTarget != null ? "Modifier l'objectif du jour" : "Définir l'objectif du jour"} (m) :
        </span>
        <input
          className={`${input} w-32`}
          placeholder={t?.metersTarget != null ? String(t.metersTarget) : "ex: 500"}
          inputMode="numeric"
          value={targetDraft}
          onChange={(e) => setTargetDraft(e.target.value)}
          onKeyDown={(e) => {
            const n = Number(targetDraft.replace(",", "."));
            if (e.key === "Enter" && Number.isFinite(n) && n > 0) saveTarget.mutate(n);
          }}
        />
        <button
          type="button"
          className={btn}
          disabled={saveTarget.isPending}
          onClick={() => {
            const n = Number(targetDraft.replace(",", "."));
            if (Number.isFinite(n) && n > 0) saveTarget.mutate(n);
          }}
        >
          {saveTarget.isPending ? "…" : "Enregistrer"}
        </button>
      </Card>

      {/* Avancement global */}
      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide">Avancement global (INCA)</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Câbles total" value={g ? fmt(g.totalCables) : "—"} />
        <StatCard label="Câbles posés" value={g ? fmt(g.cablesPosed) : "—"} tone="sky" />
        <StatCard label="Mètres posés" value={g ? fmt(g.metersPosed) : "—"} unit="m" tone="emerald" />
        <StatCard
          label="Avancement"
          value={g ? `${Math.round(g.ratio * 100)}` : "—"}
          unit={g ? "%" : undefined}
          tone="amber"
        />
      </div>

      {/* Derniers événements du jour */}
      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide">Derniers mouvements</h2>
      <Card className="divide-y divide-slate-700/30">
        {t && t.events.length === 0 && <Empty>Aucun mouvement validé aujourd'hui.</Empty>}
        {t?.events.slice(0, 12).map((e) => (
          <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div className="flex items-center gap-3">
              <Badge
                tone={
                  e.event_type === "posa"
                    ? "emerald"
                    : e.event_type === "blocco"
                      ? "rose"
                      : e.event_type === "anomalia"
                        ? "amber"
                        : "sky"
                }
              >
                {e.event_type}
              </Badge>
              <span className="font-medium">{e.cavo_code ?? "—"}</span>
              {e.zone && <span className={subtle}>· {e.zone}</span>}
            </div>
            <div className={`text-xs ${subtle}`}>
              {e.meters != null ? `${fmt(e.meters)} m · ` : ""}
              {new Date(e.occurred_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// src/modules/priorities/PrioritiesPage.tsx
// Module 2 — Priorities Center : câbles bloquants, riprese, anomalies,
// + WhatsApp events à valider (file de validation Hamidou).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Card, Empty, Badge, useSurface } from "../_ui/kit";
import { useEvents, useEventMutations } from "../../core/events/useEvents";
import { fetchOpenPriorities, resolvePriority } from "./api";
import type { CoreEvent } from "../../core/db/types";

function payloadLine(ev: CoreEvent): string {
  const p = ev.payload ?? {};
  const code = (p.cavo_code ?? p.marca_cavo ?? "") as string;
  const meters = p.meters != null ? `${p.meters} m` : "";
  const zone = (p.zone ?? "") as string;
  return [code, meters, zone].filter(Boolean).join(" · ") || "(détails dans le message)";
}

export default function PrioritiesPage(): JSX.Element {
  const { subtle } = useSurface();
  const qc = useQueryClient();
  const pending = useEvents({ status: "pending", limit: 100 });
  const { validate, reject } = useEventMutations();

  const priorities = useQuery({ queryKey: ["cable_priorities", "open"], queryFn: fetchOpenPriorities });
  const resolve = useMutation({
    mutationFn: resolvePriority,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cable_priorities"] }),
  });

  const pendingEvents = pending.data ?? [];
  const openPriorities = priorities.data ?? [];

  return (
    <div>
      <PageHeader
        title="Priorités"
        subtitle="Événements à valider · câbles bloquants · anomalies"
      />

      {/* File de validation */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">
        À valider {pendingEvents.length > 0 && <Badge tone="rose">{pendingEvents.length}</Badge>}
      </h2>
      <Card className="divide-y divide-slate-700/30">
        {pending.isLoading && <Empty>Chargement…</Empty>}
        {!pending.isLoading && pendingEvents.length === 0 && (
          <Empty>Rien à valider. Tout est à jour. ✓</Empty>
        )}
        {pendingEvents.map((ev) => (
          <div key={ev.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge tone="sky">{ev.source}</Badge>
                <span className="text-sm font-semibold">{ev.event_type}</span>
              </div>
              <div className={`mt-0.5 truncate text-sm ${subtle}`}>{payloadLine(ev)}</div>
              <div className={`text-xs ${subtle}`}>
                {new Date(ev.occurred_at).toLocaleString("fr-FR")}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={validate.isPending}
                onClick={() => validate.mutate(ev.id)}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Valider
              </button>
              <button
                type="button"
                disabled={reject.isPending}
                onClick={() => reject.mutate(ev.id)}
                className="rounded-xl border border-rose-500/40 px-3 py-1.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
              >
                Rejeter
              </button>
            </div>
          </div>
        ))}
      </Card>

      {/* Câbles prioritaires */}
      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide">Câbles prioritaires</h2>
      <Card className="divide-y divide-slate-700/30">
        {priorities.isLoading && <Empty>Chargement…</Empty>}
        {!priorities.isLoading && openPriorities.length === 0 && (
          <Empty>Aucun câble bloquant. ✓</Empty>
        )}
        {openPriorities.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Badge tone={p.reason === "blocco" ? "rose" : p.reason === "anomalia" ? "amber" : "sky"}>
                {p.reason ?? "—"}
              </Badge>
              <span className="text-sm font-semibold">{p.cavo_code}</span>
              <span className={`text-xs ${subtle}`}>prio {p.priority}</span>
            </div>
            <button
              type="button"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate(p.id)}
              className="rounded-xl border border-emerald-500/40 px-3 py-1.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              Résoudre
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// src/features/core-command/cable/CableDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabaseClient";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { Pill, Screen, EmptyState } from "../../../components/command-ui";
import type { CableEvent } from "../types";

// Normalize cable code for DB lookup: "C CS 102" or "CCS102" → "CCS 102"
function normalizeForQuery(raw: string): string {
  const c = raw.replace(/\s+/g, "").replace(/\./g, "").toUpperCase();
  const m = c.match(/^([A-Z])([A-Z]{1,4})(\d{2,5})([A-Z]?)$/);
  if (m) {
    const [, head, letters, digits, suffix] = m;
    return suffix ? `${head}${letters} ${digits} ${suffix}` : `${head}${letters} ${digits}`;
  }
  return c;
}

const KIND_META: Record<string, { label: string; tone: string; dot: string }> = {
  CABLE_POSATO:         { label: "Câble posé",    tone: "text-emerald-300", dot: "bg-emerald-500" },
  CABLE_MENTION:        { label: "Mention",        tone: "text-zinc-400",   dot: "bg-zinc-600"    },
  CABLE_SFILATO:        { label: "Câble retiré",   tone: "text-sky-300",    dot: "bg-sky-500"     },
  CABLE_CORTO:          { label: "Trop court",     tone: "text-amber-300",  dot: "bg-amber-500"   },
  CABLE_MANCANTE:       { label: "Manquant",       tone: "text-red-300",    dot: "bg-red-500"     },
  CABLE_DA_CONTROLLARE: { label: "À vérifier",     tone: "text-amber-300",  dot: "bg-amber-400"   },
  GENERAL_MESSAGE:      { label: "Signal terrain", tone: "text-zinc-400",   dot: "bg-zinc-600"    },
  posa:                 { label: "Câble posé",    tone: "text-emerald-300", dot: "bg-emerald-500" },
  ripresa:              { label: "Reprise",        tone: "text-sky-300",    dot: "bg-sky-500"     },
  blocco:               { label: "Bloqué",         tone: "text-red-300",    dot: "bg-red-500"     },
  anomalia:             { label: "Anomalie",        tone: "text-amber-300",  dot: "bg-amber-500"   },
};

function kindMeta(kind: string) {
  return KIND_META[kind] ?? { label: kind.replace(/_/g, " "), tone: "text-zinc-400", dot: "bg-zinc-600" };
}

async function fetchCableDetail(raw: string) {
  const normalized = normalizeForQuery(raw);
  const compact    = raw.replace(/\s+/g, "").toUpperCase();

  const [eventsRes, listRes, priRes] = await Promise.all([
    supabase
      .from("cable_events")
      .select("*")
      .or([
        `cable_code.eq.${normalized}`,
        `cable_code.eq.${compact}`,
        `cable_code.ilike.%${normalized}%`,
        `cable_code.ilike.%${compact}%`,
      ].join(","))
      .order("occurred_at", { ascending: false })
      .limit(100),

    supabase
      .from("daily_list_items")
      .select("list_number, import_id, daily_list_imports!inner(list_date, file_name)")
      .or(`cable_code_normalized.eq.${normalized},cable_code_normalized.eq.${compact}`)
      .order("import_id"),

    supabase
      .from("cable_priorities")
      .select("id, reason, priority, created_at")
      .or([
        `cable_code.eq.${normalized}`,
        `cable_code.eq.${compact}`,
        `cable_code.ilike.%${normalized}%`,
      ].join(","))
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ]);

  const listItems = (listRes.data ?? []).map((item: any) => ({
    list_date:   item.daily_list_imports?.list_date   ?? null,
    file_name:   item.daily_list_imports?.file_name   ?? "",
    list_number: item.list_number ?? null,
  }));

  return {
    events:    (eventsRes.data ?? []) as CableEvent[],
    listItems,
    priorities: priRes.data ?? [] as Array<{ id: string; reason: string | null; priority: string; created_at: string }>,
  };
}

export default function CableDetailPage() {
  const { code }    = useParams<{ code: string }>();
  const navigate    = useNavigate();
  const cableCode   = code ? decodeURIComponent(code) : "";
  const displayCode = formatCableDisplay(cableCode);

  const { data, isLoading, isError } = useQuery({
    queryKey:  ["cable_detail", cableCode],
    queryFn:   () => fetchCableDetail(cableCode),
    enabled:   !!cableCode,
    staleTime: 15_000,
  });

  const events     = data?.events     ?? [];
  const listItems  = data?.listItems  ?? [];
  const priorities = data?.priorities ?? [];
  const lastEvent  = events[0];
  const isConfirmed = lastEvent?.event_kind === "CABLE_POSATO" || lastEvent?.event_kind === "posa";

  return (
    <Screen className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Câble</p>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-white">
            {displayCode || cableCode || "—"}
          </h1>
          {!isLoading && lastEvent && (
            <p className="text-sm text-zinc-500">
              Dernier signal&nbsp;: {new Date(lastEvent.occurred_at).toLocaleDateString("fr-FR", {
                day: "2-digit", month: "long",
              })} à {new Date(lastEvent.occurred_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
          {!isLoading && (
            isConfirmed ? <Pill tone="emerald">Posé ✓</Pill>
            : events.length > 0 ? <Pill tone="amber">{kindMeta(lastEvent!.event_kind).label}</Pill>
            : null
          )}
          <button
            onClick={() => navigate("/command/inca")}
            className="min-h-9 rounded-lg border border-zinc-800 px-3 text-xs font-medium text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
          >
            INCA →
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          Erreur de chargement. Vérifier la connexion réseau.
        </div>
      )}

      {/* Open priorities */}
      {!isLoading && priorities.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            ⚠ {priorities.length} priorité{priorities.length > 1 ? "s" : ""} ouverte{priorities.length > 1 ? "s" : ""}
          </h2>
          {priorities.map((p: any) => (
            <div key={p.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-amber-200">{p.reason ?? "Problème signalé"}</p>
                <Pill tone="amber">
                  {p.priority === "critical" ? "Critique" : p.priority === "high" ? "Urgent" : "Moyen"}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Daily list membership */}
      {!isLoading && listItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Présent dans les listes
          </h2>
          <div className="flex flex-wrap gap-2">
            {listItems.map((item: any, i: number) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm">
                <span className="text-zinc-300">
                  {item.list_date
                    ? new Date(item.list_date + "T12:00:00").toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "long",
                      })
                    : item.file_name}
                </span>
                {item.list_number && (
                  <span className="ml-2 text-xs text-zinc-600">n°{item.list_number}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && !isError && events.length === 0 && (
        <EmptyState
          title="Aucun événement enregistré"
          description="Ce câble n'a pas encore été signalé dans les messages terrain ni dans INCA."
          icon="○"
        />
      )}

      {/* Event timeline */}
      {!isLoading && events.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Historique — {events.length} événement{events.length > 1 ? "s" : ""}
          </h2>
          <ol className="space-y-0">
            {events.map((e, idx) => {
              const meta = kindMeta(e.event_kind);
              const rawNote = e.note ?? "";
              // Strip "Auteur: " prefix if present
              const note = rawNote.replace(/^[^:]+:\s*/, "").slice(0, 160);
              const isLast = idx === events.length - 1;
              return (
                <li key={e.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    {!isLast && <span className="mt-1 w-px flex-1 bg-zinc-800" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-4">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className={`text-sm font-medium ${meta.tone}`}>{meta.label}</span>
                      <span className="text-xs text-zinc-600">
                        {new Date(e.occurred_at).toLocaleDateString("fr-FR", {
                          weekday: "short", day: "2-digit", month: "short",
                        })}{" "}
                        {new Date(e.occurred_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {note && (
                      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{note}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </Screen>
  );
}

// src/features/core-command/timeline/TimelinePage.tsx — V3 mobile shell
// Journal de chantier groupé par jour. Zéro "confidence", zéro "CORE MEM", zéro snake_case.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCableEvents } from "../hooks/useCableEvents";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { AppBar, EmptyState, Pill, Screen, Section } from "../../../components/command-ui";

// Traduction event_kind → phrase chantier
function humanizeKind(kind: string): { label: string; tone: "neutral" | "emerald" | "amber" | "red" | "sky" | "violet" } {
  const map: Record<string, { label: string; tone: "neutral" | "emerald" | "amber" | "red" | "sky" | "violet" }> = {
    CABLE_POSATO:          { label: "Câble posé",       tone: "emerald" },
    CABLE_SFILATO:         { label: "Câble retiré",     tone: "sky"     },
    CABLE_LASATO:          { label: "Câble lâché",      tone: "sky"     },
    CABLE_CORTO:           { label: "Câble trop court", tone: "amber"   },
    CABLE_MANCANTE:        { label: "Câble manquant",   tone: "red"     },
    CABLE_DA_CONTROLLARE:  { label: "À vérifier",       tone: "amber"   },
    GENERAL_MESSAGE:       { label: "Signal terrain",   tone: "neutral" },
    MATERIAL_REQUEST:      { label: "Demande matériel", tone: "violet"  },
    ATTENDANCE_ABSENCE:    { label: "Absence",          tone: "neutral" },
    PHOTO_EVENT:           { label: "Photo",            tone: "violet"  },
    CABLE_MENTION:         { label: "Mention",          tone: "neutral" },
  };
  return map[kind] ?? { label: kind.replace(/_/g, " "), tone: "neutral" };
}

// Grouper par date
function groupByDay<T extends { occurred_at: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const day = item.occurred_at.slice(0, 10);
    const arr = map.get(day) ?? [];
    arr.push(item);
    map.set(day, arr);
  }
  return map;
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const today = new Date().toISOString().slice(0, 10);
  const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today) return "Aujourd'hui";
  if (iso === yest)  return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
}

export default function TimelinePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: events, isLoading } = useCableEvents({
    cable_code: search.trim() || undefined,
    limit: 400,
  });

  const grouped = groupByDay(events ?? []);
  const days    = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <Screen className="space-y-6">
      <AppBar
        title="Journal chantier"
        subtitle="Lecture par jour des événements validés, avec accès direct aux câbles."
        action={<Pill tone="neutral">{events?.length ?? 0} événement{(events?.length ?? 0) > 1 ? "s" : ""}</Pill>}
      />

      <label className="block">
        <span className="sr-only">Filtrer par câble</span>
        <input
          type="search"
          placeholder="Filtrer par câble…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-900/90"
        />
      </label>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      )}

      {!isLoading && days.length === 0 && (
        <EmptyState title="Aucun événement trouvé" description="Essaie un autre câble ou vide le filtre." icon="⌕" />
      )}

      {!isLoading && days.map((day) => {
        const dayEvents = grouped.get(day)!;

        // Grouper les câbles posés (CABLE_POSATO) pour affichage compact
        const posato = dayEvents.filter((e) => e.event_kind === "CABLE_POSATO");
        const autres  = dayEvents.filter((e) => e.event_kind !== "CABLE_POSATO");

        // Acteurs du jour
        const actors: Map<string, string[]> = new Map();
        for (const e of posato) {
          // note contient l'auteur WhatsApp extrait
          const author = (e.note ?? "").match(/^([^:]+):/)?.[1]?.trim() ?? "Équipe";
          const arr = actors.get(author) ?? [];
          arr.push(e.cable_code);
          actors.set(author, arr);
        }

        return (
          <Section key={day} title={formatDay(day)} count={dayEvents.length}>
            <div className="space-y-3">
              {posato.length > 0 && (
                <article className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Pill tone="emerald">
                      {posato.length} câble{posato.length > 1 ? "s" : ""} posé{posato.length > 1 ? "s" : ""}
                    </Pill>
                  </div>
                  <div className="space-y-3">
                    {actors.size > 0 ? (
                      [...actors.entries()].map(([actor, cables]) => (
                        <div key={actor}>
                          <p className="text-sm font-medium text-zinc-200">{actor}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {cables.map((code) => (
                              <button
                                key={code}
                                onClick={() => navigate(`/command/cable/${encodeURIComponent(code)}`)}
                                className="min-h-9 rounded-xl bg-emerald-500/10 px-3 font-mono text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                              >
                                {formatCableDisplay(code)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {posato.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => navigate(`/command/cable/${encodeURIComponent(e.cable_code)}`)}
                            className="min-h-9 rounded-xl bg-emerald-500/10 px-3 font-mono text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                          >
                            {formatCableDisplay(e.cable_code)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              )}

              {autres.map((e) => {
                const { label, tone } = humanizeKind(e.event_kind);
                if (e.event_kind === "GENERAL_MESSAGE" && !e.note) return null;
                return (
                  <button
                    key={e.id}
                    onClick={() => navigate(`/command/cable/${encodeURIComponent(e.cable_code)}`)}
                    className="min-h-16 w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={tone}>{label}</Pill>
                          <span className="truncate font-mono text-sm font-semibold text-white">{formatCableDisplay(e.cable_code)}</span>
                        </div>
                        {e.note && e.event_kind === "GENERAL_MESSAGE" ? (
                          <p className="line-clamp-2 text-xs leading-5 text-zinc-500 italic">{e.note.slice(0, 100)}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-zinc-600">
                        {new Date(e.occurred_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        );
      })}
    </Screen>
  );
}

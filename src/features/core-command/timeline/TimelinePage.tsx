// src/features/core-command/timeline/TimelinePage.tsx — V2 (post-audit)
// Journal de chantier groupé par jour. Zéro "confidence", zéro "CORE MEM", zéro snake_case.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCableEvents } from "../hooks/useCableEvents";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

// Traduction event_kind → phrase chantier
function humanizeKind(kind: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    CABLE_POSATO:          { label: "Câble posé",         color: "text-emerald-400" },
    CABLE_SFILATO:         { label: "Câble retiré",       color: "text-sky-400"     },
    CABLE_LASATO:          { label: "Câble lâché",        color: "text-teal-400"    },
    CABLE_CORTO:           { label: "Câble trop court",   color: "text-orange-400"  },
    CABLE_MANCANTE:        { label: "Câble manquant",     color: "text-red-400"     },
    CABLE_DA_CONTROLLARE:  { label: "À vérifier",         color: "text-yellow-400"  },
    GENERAL_MESSAGE:       { label: "Signal terrain",     color: "text-zinc-400"    },
    MATERIAL_REQUEST:      { label: "Demande matériel",   color: "text-purple-400"  },
    ATTENDANCE_ABSENCE:    { label: "Absence",            color: "text-zinc-500"    },
    PHOTO_EVENT:           { label: "Photo",              color: "text-indigo-400"  },
    CABLE_MENTION:         { label: "Mention",            color: "text-zinc-500"    },
  };
  return map[kind] ?? { label: kind.replace(/_/g, " "), color: "text-zinc-400" };
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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white">Journal chantier</h1>
        <input
          type="text"
          placeholder="Filtrer par câble…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 py-1.5 text-sm placeholder:text-zinc-500 outline-none focus:border-zinc-500 w-44"
        />
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-900 rounded-2xl border border-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && days.length === 0 && (
        <p className="text-zinc-500 text-sm">Aucun événement trouvé.</p>
      )}

      {days.map((day) => {
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
          <div key={day} className="space-y-2">
            {/* Entête du jour */}
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-white capitalize">{formatDay(day)}</p>
              <div className="flex-1 h-px bg-zinc-800" />
              <p className="text-xs text-zinc-600">{dayEvents.length} événements</p>
            </div>

            {/* Câbles posés — résumé compact */}
            {posato.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  {posato.length} câble{posato.length > 1 ? "s" : ""} posé{posato.length > 1 ? "s" : ""}
                </p>
                {actors.size > 0 ? (
                  [...actors.entries()].map(([actor, cables]) => (
                    <div key={actor}>
                      <p className="text-sm font-medium text-zinc-300">{actor}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cables.map((code) => (
                          <button
                            key={code}
                            onClick={() => navigate(`/command/cable/${encodeURIComponent(code)}`)}
                            className="font-mono text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition"
                          >
                            {formatCableDisplay(code)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {posato.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => navigate(`/command/cable/${encodeURIComponent(e.cable_code)}`)}
                        className="font-mono text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition"
                      >
                        {formatCableDisplay(e.cable_code)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Autres événements */}
            {autres.map((e) => {
              const { label, color } = humanizeKind(e.event_kind);
              if (e.event_kind === "GENERAL_MESSAGE" && !e.note) return null;
              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/command/cable/${encodeURIComponent(e.cable_code)}`)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:bg-zinc-800/60 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-medium ${color}`}>{label}</span>
                      <span className="font-mono text-sm text-white truncate">{formatCableDisplay(e.cable_code)}</span>
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0">
                      {new Date(e.occurred_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {e.note && e.event_kind === "GENERAL_MESSAGE" && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1 italic">{e.note.slice(0, 100)}</p>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

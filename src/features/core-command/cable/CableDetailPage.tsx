// src/features/core-command/cable/CableDetailPage.tsx
// Détail / timeline d'un câble — cible de la recherche du shell (/command/cable/:code).
// INCA en lecture seule, événements depuis cable_events.
import { useParams, Link } from "react-router-dom";
import { useCableTimeline } from "../hooks/useCableEvents";

const KIND_COLOR: Record<string, string> = {
  posa: "bg-emerald-600",
  ripresa: "bg-sky-600",
  blocco: "bg-rose-600",
  anomalia: "bg-amber-600",
};

export default function CableDetailPage() {
  const { code } = useParams<{ code: string }>();
  const cableCode = code ? decodeURIComponent(code) : "";
  const { data, isLoading, isError } = useCableTimeline(cableCode);

  const events = data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">Câble</div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {cableCode || "—"}
          </h1>
        </div>
        <Link
          to="/command/inca"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          INCA
        </Link>
      </div>

      {isLoading && <p className="py-10 text-center text-sm text-zinc-400">Chargement…</p>}
      {isError && <p className="py-10 text-center text-sm text-rose-400">Erreur de chargement.</p>}
      {!isLoading && !isError && events.length === 0 && (
        <p className="py-10 text-center text-sm text-zinc-400">
          Aucun événement pour ce câble.
        </p>
      )}

      <ol className="relative space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span
              className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${
                KIND_COLOR[e.event_kind] ?? "bg-zinc-400"
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold text-white ${
                  KIND_COLOR[e.event_kind] ?? "bg-zinc-500"
                }`}
              >
                {e.event_kind}
              </span>
              {e.previous_status && e.new_status && (
                <span className="text-xs text-zinc-500">
                  {e.previous_status} → {e.new_status}
                </span>
              )}
              {e.note && <span className="text-sm text-zinc-700 dark:text-zinc-300">{e.note}</span>}
              <span className="ml-auto text-xs text-zinc-400">
                {new Date(e.occurred_at).toLocaleString("fr-FR")}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

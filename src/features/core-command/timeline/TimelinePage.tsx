// src/features/core-command/timeline/TimelinePage.tsx — V2
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCoreEvents } from "../hooks/useCoreEvents";
import { useCableEvents } from "../hooks/useCableEvents";
import type { CoreEventFilters } from "../api/coreEvents.api";
import type { ValidationStatus } from "../types";

const STATUS_LABELS: Record<string, string> = {
  pending:   "En attente",
  validated: "Validé",
  rejected:  "Rejeté",
  promoted:  "Promu",
};

const STATUS_DOT: Record<string, string> = {
  pending:   "bg-amber-400",
  validated: "bg-blue-500",
  rejected:  "bg-red-500",
  promoted:  "bg-green-500",
};

const KIND_BADGE: Record<string, string> = {
  CABLE_POSATO:          "bg-green-100 text-green-800",
  CABLE_SFILATO:         "bg-sky-100 text-sky-800",
  CABLE_LASATO:          "bg-teal-100 text-teal-800",
  CABLE_CORTO:           "bg-orange-100 text-orange-800",
  CABLE_MANCANTE:        "bg-red-100 text-red-800",
  CABLE_DA_CONTROLLARE:  "bg-yellow-100 text-yellow-800",
  MATERIAL_REQUEST:      "bg-purple-100 text-purple-800",
  ATTENDANCE_ABSENCE:    "bg-zinc-100 text-zinc-600",
  PHOTO_EVENT:           "bg-indigo-100 text-indigo-700",
  AUDIO_EVENT:           "bg-indigo-100 text-indigo-700",
  CABLE_MENTION:         "bg-zinc-100 text-zinc-600",
  GENERAL_MESSAGE:       "bg-zinc-100 text-zinc-400",
};

type Entry = {
  id: string;
  occurred_at: string;
  cable_code: string;
  kind: string;
  author: string;
  raw_text: string;
  validation_status: string;
  confidence: number;
  source: "core_event" | "cable_event";
};

export default function TimelinePage() {
  const [cableFilter,  setCableFilter]  = useState("");
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | "">("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  const coreFilters: CoreEventFilters = {
    cable_code:        cableFilter.trim() || undefined,
    validation_status: statusFilter       || undefined,
    date_from:         dateFrom           || undefined,
    date_to:           dateTo             || undefined,
    limit:             200,
  };

  const { data: coreEvents,  isLoading: loadC } = useCoreEvents(coreFilters);
  const { data: cableEvents, isLoading: loadE } = useCableEvents({
    cable_code: cableFilter.trim() || undefined,
    date_from:  dateFrom           || undefined,
    date_to:    dateTo             || undefined,
    limit: 200,
  });

  const isLoading = loadC || loadE;

  const entries: Entry[] = [
    ...(coreEvents ?? []).map((e) => ({
      id:                e.id,
      occurred_at:       e.occurred_at,
      cable_code:        e.cable_code_normalized ?? e.cable_code_raw ?? "—",
      kind:              e.event_type,
      author:            (e.payload as Record<string, unknown>)?.["author"] as string ?? "—",
      raw_text:          e.raw_text ?? "",
      validation_status: e.validation_status ?? "pending",
      confidence:        e.confidence,
      source:            "core_event" as const,
    })),
    ...(cableEvents ?? []).map((e) => ({
      id:                `ce-${e.id}`,
      occurred_at:       e.occurred_at,
      cable_code:        e.cable_code,
      kind:              e.event_kind,
      author:            "—",
      raw_text:          e.note ?? "",
      validation_status: "promoted",
      confidence:        e.confidence,
      source:            "cable_event" as const,
    })),
  ].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Timeline chantier</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Code câble (ex: TCC, CCS 574…)"
          value={cableFilter} onChange={(e) => setCableFilter(e.target.value)}
          className="border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent w-52" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ValidationStatus | "")}
          className="border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent">
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent" />
        <span className="self-center text-xs text-zinc-400">→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent" />
        <span className="self-center text-xs text-zinc-500 ml-1">{entries.length} événements</span>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <p className="text-sm text-zinc-400">Chargement…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun événement pour ces filtres.</p>
      ) : (
        <ol className="relative border-l-2 border-zinc-200 dark:border-zinc-700 space-y-0 ml-3">
          {entries.map((e) => (
            <li key={e.id} className="ml-5 py-3 pr-1">
              {/* Dot */}
              <span className={`absolute -left-[9px] mt-2 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${STATUS_DOT[e.validation_status] ?? "bg-zinc-400"}`} />

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                {/* Left */}
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Cable code */}
                    <Link
                      to={`/command/cable/${encodeURIComponent(e.cable_code)}?source=search${e.source === "core_event" ? `&focus=${e.id}` : ""}`}
                      className="font-mono text-sm font-bold text-sky-300 hover:text-sky-200"
                    >
                      {e.cable_code}
                    </Link>
                    {/* Kind badge */}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${KIND_BADGE[e.kind] ?? "bg-zinc-100 text-zinc-500"}`}>
                      {e.kind.replace(/_/g, " ")}
                    </span>
                    {/* Source */}
                    {e.source === "cable_event" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-600 text-white font-semibold">CORE MEM</span>
                    )}
                  </div>
                  {/* Author */}
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium">{e.author}</span>
                    {" · "}conf. {(e.confidence * 100).toFixed(0)}%
                  </p>
                  {/* Raw text */}
                  {e.raw_text && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 italic mt-0.5">
                      {e.raw_text.slice(0, 140)}
                    </p>
                  )}
                </div>

                {/* Right */}
                <div className="shrink-0 text-right space-y-0.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    e.validation_status === "promoted" ? "bg-green-100 text-green-700"
                    : e.validation_status === "validated" ? "bg-blue-100 text-blue-700"
                    : e.validation_status === "rejected"  ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                  }`}>
                    {STATUS_LABELS[e.validation_status] ?? e.validation_status}
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    {new Date(e.occurred_at).toLocaleString("fr-FR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

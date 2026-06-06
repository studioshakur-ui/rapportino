import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadCableStory } from "./cableStory.repo";
import CableStoryTimeline from "./components/CableStoryTimeline";
import CableStorySidebar from "./components/CableStorySidebar";
import { CableStoryAmbiguousState, CableStoryCards, CableStoryHeader } from "./components/CableStorySummary";
import { EmptyState, Screen } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";

export default function CableStoryPage(): JSX.Element {
  const { code = "" } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();

  const focus = searchParams.get("focus");
  const source = searchParams.get("source");
  const selectedCandidateId = searchParams.get("match");

  const decodedCode = useMemo(() => decodeURIComponent(code), [code]);

  const query = useQuery({
    queryKey: ["cable_story", decodedCode, selectedCandidateId],
    queryFn: () => loadCableStory(decodedCode, selectedCandidateId),
    enabled: Boolean(decodedCode.trim()),
    staleTime: 20_000,
  });

  if (!decodedCode.trim()) {
    return (
      <Screen>
        <EmptyState title="Aucun code câble fourni" description="Rechercher un câble depuis le shell pour ouvrir son histoire." icon="⌕" />
      </Screen>
    );
  }

  if (query.isLoading) {
    return (
      <Screen>
        <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 text-sm text-zinc-400">
          <svg className="h-4 w-4 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Chargement de l&apos;histoire câble…
        </div>
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen>
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
          Impossible de charger l&apos;histoire de ce câble.
        </div>
      </Screen>
    );
  }

  if (query.data.kind === "ambiguous") {
    return (
      <Screen className="space-y-4">
        <CableStoryAmbiguousState
          normalizedCode={query.data.normalized_code}
          candidates={query.data.candidates}
          source={source}
        />
      </Screen>
    );
  }

  const { model } = query.data;

  return (
    <Screen className="max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
        <Link to="/command/center" className="hover:text-zinc-300">Command Center</Link>
        <span>/</span>
        <span className="text-zinc-300">Cable Story</span>
        <span>/</span>
        <span className="font-mono text-zinc-100">{formatCableDisplay(model.cable.normalized_code)}</span>
      </div>

      <CableStoryHeader model={model} source={source} />
      <CableStoryCards model={model} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
        <CableStoryTimeline items={model.timeline} focusId={focus} />
        <CableStorySidebar priorities={model.priorities} findings={model.findings} sources={model.sources} />
      </div>
    </Screen>
  );
}

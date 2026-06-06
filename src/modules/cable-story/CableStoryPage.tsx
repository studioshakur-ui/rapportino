import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadCableStory } from "./cableStory.repo";
import CableStoryTimeline from "./components/CableStoryTimeline";
import CableStorySidebar from "./components/CableStorySidebar";
import { CableStoryAmbiguousState, CableStoryCards, CableStoryHeader } from "./components/CableStorySummary";
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
      <div className="p-6 text-sm text-zinc-400">
        Aucun code câble fourni.
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="p-6 text-sm text-zinc-400">
        Chargement de l&apos;histoire câble…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
          Impossible de charger l&apos;histoire de ce câble.
        </div>
      </div>
    );
  }

  if (query.data.kind === "ambiguous") {
    return (
      <div className="p-4 sm:p-6">
        <CableStoryAmbiguousState
          normalizedCode={query.data.normalized_code}
          candidates={query.data.candidates}
          source={source}
        />
      </div>
    );
  }

  const { model } = query.data;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%),linear-gradient(180deg,#09090b_0%,#111114_100%)] text-zinc-50">
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          <Link to="/command/center" className="hover:text-zinc-300">Command Center</Link>
          <span>/</span>
          <span className="text-zinc-300">Cable Story</span>
          <span>/</span>
          <span className="font-mono text-zinc-100">{formatCableDisplay(model.cable.normalized_code)}</span>
        </div>

        <div className="space-y-4">
          <CableStoryHeader model={model} source={source} />
          <CableStoryCards model={model} />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
            <CableStoryTimeline items={model.timeline} focusId={focus} />
            <CableStorySidebar priorities={model.priorities} findings={model.findings} sources={model.sources} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { loadCoreEngineSnapshot } from "../../../domain/core-engine";
import { SituazioneView } from "./SituazioneView";

export default function SituazionePage(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 30_000,
  });

  return (
    <SituazioneView situation={isLoading ? null : data?.situation ?? null} />
  );
}

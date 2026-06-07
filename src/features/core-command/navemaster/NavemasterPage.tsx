import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { EChartsOption } from "echarts";
import ECharts from "../../../components/charts/ECharts";
import { useAuth } from "../../../auth/AuthProvider";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../../components/command-ui";
import { normalizeCableCode } from "../../core-command/agents/normalizer.agent";
import { listRecentTelegramMessages } from "../api/telegramMessages.api";
import { createDailyListImport, fetchEvidenceForCodes, listItemsByImport, listRecentImports } from "../../../modules/daily-lists/dailyLists.repo";
import { parseFile } from "../../../modules/daily-lists/dailyLists.parser";
import { buildNavemasterAiInsights } from "../../../modules/navemaster/navemaster.ai";
import { buildNavemasterDiff, groupNavemasterDiff } from "../../../modules/navemaster/navemaster.diff";
import { getNavemasterLegendGroups, getNavemasterLegendTone } from "../../../modules/navemaster/navemaster.legend";
import { mapIncaRowToNavemasterRow } from "../../../modules/navemaster/navemaster.mapping";
import { parseNavemasterWorkbook } from "../../../modules/navemaster/navemaster.parser";
import { createNavemasterImport, getActiveNavemasterImport, listNavemasterArchives, listNavemasterRowsByImport } from "../../../modules/navemaster/navemaster.repo";
import { buildNavemasterWorklist } from "../../../modules/navemaster/navemaster.worklist";
import type { ParseResult } from "../../../modules/daily-lists/dailyLists.types";
import type { NavemasterParseProgress, NavemasterWorkbookParseResult } from "../../../modules/navemaster/navemaster.types";

const DEFAULT_ANALYSIS_ROW_LIMIT = 120;
type NavemasterTab = "live" | "worklist" | "story" | "import" | "archives";
type WorklistLevelFilter = "all" | "critical" | "high" | "watch";
type WorklistSourceFilter = "all" | "telegram" | "terrain";

interface AuthSession {
  user?: { id?: string };
}

const NAVEMASTER_TABS: Array<{ id: NavemasterTab; label: string }> = [
  { id: "live", label: "Live" },
  { id: "worklist", label: "Liste de travail" },
  { id: "story", label: "Cable Story" },
  { id: "import", label: "Import INCA" },
  { id: "archives", label: "Archives" },
];

function isNavemasterTab(value: string | null): value is NavemasterTab {
  return Boolean(value && NAVEMASTER_TABS.some((tab) => tab.id === value));
}

export default function NavemasterPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth() as { session: AuthSession | null };
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<NavemasterWorkbookParseResult | null>(null);
  const [importState, setImportState] = useState<"idle" | "parsing" | "importing">("idle");
  const [listFileName, setListFileName] = useState("");
  const [listParseResult, setListParseResult] = useState<ParseResult | null>(null);
  const [listImportState, setListImportState] = useState<"idle" | "parsing" | "importing">("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState("all");
  const [selectedPerimeter, setSelectedPerimeter] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState<WorklistLevelFilter>("all");
  const [selectedSource, setSelectedSource] = useState<WorklistSourceFilter>("all");
  const [worklistQuery, setWorklistQuery] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState<NavemasterParseProgress | null>(null);
  const [storyQuery, setStoryQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTab = isNavemasterTab(searchParams.get("tab")) ? searchParams.get("tab") : "live";

  const { data: activeImport, refetch: refetchActiveImport } = useQuery({
    queryKey: ["navemaster_active_import"],
    queryFn: () => getActiveNavemasterImport(),
    staleTime: 30_000,
  });

  const { data: archives, refetch: refetchArchives } = useQuery({
    queryKey: ["navemaster_archives"],
    queryFn: () => listNavemasterArchives(),
    staleTime: 30_000,
  });

  const { data: activeRows, refetch: refetchActiveRows } = useQuery({
    queryKey: ["navemaster_rows", activeImport?.id],
    queryFn: () => listNavemasterRowsByImport(activeImport!.id),
    enabled: Boolean(activeImport?.id),
    staleTime: 30_000,
  });

  const { data: telegramMessages } = useQuery({
    queryKey: ["telegram_live_feed", "navemaster"],
    queryFn: () => listRecentTelegramMessages(80),
    staleTime: 30_000,
  });

  const { data: dailyImports } = useQuery({
    queryKey: ["daily_list_imports", "navemaster"],
    queryFn: () => listRecentImports(20),
    staleTime: 30_000,
  });

  const { data: selectedListItems } = useQuery({
    queryKey: ["navemaster_daily_list_items", selectedListId],
    queryFn: () => listItemsByImport(selectedListId),
    enabled: selectedListId !== "all",
    staleTime: 30_000,
  });

  const previewRows = useMemo(
    () => (parsed?.rows ?? []).map(mapIncaRowToNavemasterRow).filter((row): row is NonNullable<typeof row> => Boolean(row)),
    [parsed]
  );

  const previewAi = useMemo(() => buildNavemasterAiInsights(previewRows), [previewRows]);
  const liveAi = useMemo(() => buildNavemasterAiInsights(activeRows ?? []), [activeRows]);
  const legendGroups = useMemo(() => getNavemasterLegendGroups(), []);
  const previewDiff = useMemo(() => buildNavemasterDiff(activeRows ?? [], previewRows), [activeRows, previewRows]);
  const groupedDiff = useMemo(() => groupNavemasterDiff(previewDiff), [previewDiff]);
  const hasPreview = Boolean(parsed);
  const previewDiffCount = hasPreview ? previewDiff.length : 0;
  const previewInsightCount = hasPreview ? previewAi.insights.length : 0;
  const activeAi = parsed ? previewAi : liveAi;
  const workRows = parsed ? previewRows : (activeRows ?? []);
  const worklistEvidenceCodes = useMemo(() => {
    const codes = new Set<string>();
    activeAi.insights.slice(0, 80).forEach((insight) => codes.add(insight.marcacavo));
    (telegramMessages ?? []).forEach((message) => message.cable_refs.forEach((ref) => codes.add(normalizeCableCode(ref))));
    return Array.from(codes).filter(Boolean).slice(0, 250);
  }, [activeAi.insights, telegramMessages]);

  const { data: terrainEvidence } = useQuery({
    queryKey: ["navemaster_worklist_evidence", worklistEvidenceCodes],
    queryFn: () => fetchEvidenceForCodes(worklistEvidenceCodes),
    enabled: worklistEvidenceCodes.length > 0,
    staleTime: 45_000,
  });

  const worklistModel = useMemo(
    () => buildNavemasterWorklist(workRows, activeAi, telegramMessages ?? [], terrainEvidence ?? new Map()),
    [activeAi, telegramMessages, terrainEvidence, workRows]
  );
  const selectedListCodes = useMemo(() => new Set((selectedListItems ?? []).map((item) => normalizeCableCode(item.cable_code_normalized))), [selectedListItems]);
  const equipmentOptions = useMemo(
    () => Array.from(new Set(worklistModel.items.flatMap((item) => item.apparati))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [worklistModel.items]
  );
  const perimeterOptions = useMemo(
    () => Array.from(new Set(worklistModel.items.map((item) => item.perimetro ?? "Sans perimetro"))).sort((a, b) => a.localeCompare(b)),
    [worklistModel.items]
  );
  const worklist = useMemo(() => {
    const query = worklistQuery.trim().toUpperCase();

    return worklistModel.items.filter((item) => {
      if (item.score < 35) return false;
      if (selectedListId !== "all" && !selectedListCodes.has(normalizeCableCode(item.cableCode))) return false;
      if (selectedEquipment !== "all" && !item.apparati.includes(selectedEquipment)) return false;
      if (selectedPerimeter !== "all" && (item.perimetro ?? "Sans perimetro") !== selectedPerimeter) return false;
      if (selectedLevel !== "all" && item.level !== selectedLevel) return false;
      if (selectedSource === "telegram" && item.telegramMessages.length === 0) return false;
      if (selectedSource === "terrain" && item.terrainEvidence.length === 0) return false;
      if (query && ![item.displayCode, item.cableCode, item.perimetro, ...item.apparati].join(" ").toUpperCase().includes(query)) return false;
      return true;
    });
  }, [selectedEquipment, selectedLevel, selectedListCodes, selectedListId, selectedPerimeter, selectedSource, worklistModel.items, worklistQuery]);
  const perimeterChart = useMemo(() => buildPerimeterChart(worklistModel.perimeters), [worklistModel.perimeters]);
  const equipmentChart = useMemo(() => buildEquipmentChart(worklistModel.equipments), [worklistModel.equipments]);

  function selectTab(tab: NavemasterTab): void {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }

  function openCableStory(event: FormEvent): void {
    event.preventDefault();
    const code = storyQuery.trim();
    if (!code) return;
    navigate(`/cable/${encodeURIComponent(code)}`);
  }

  async function handleWorklistFile(file: File): Promise<void> {
    setListImportState("parsing");
    setListError(null);
    setListFileName(file.name);
    setListParseResult(null);
    try {
      setListParseResult(await parseFile(file));
    } catch (parseError) {
      setListError(parseError instanceof Error ? parseError.message : "Lecture liste impossible");
    } finally {
      setListImportState("idle");
    }
  }

  const listImportMutation = useMutation({
    mutationFn: async () => {
      if (!listParseResult || listParseResult.rows.length === 0) throw new Error("Aucune ligne exploitable dans la liste");
      return createDailyListImport({
        file_name: listFileName,
        list_date: listParseResult.detected_date,
        source_kind: listParseResult.source_kind,
        imported_by: session?.user?.id ?? null,
        rows: listParseResult.rows,
        raw_metadata: { warnings: listParseResult.warnings, source: "navemaster_worklist" },
      });
    },
    onMutate: () => setListImportState("importing"),
    onSuccess: (importId) => {
      setSelectedListId(importId);
      setListParseResult(null);
      setListFileName("");
      void queryClient.invalidateQueries({ queryKey: ["daily_list_imports"] });
      void queryClient.invalidateQueries({ queryKey: ["navemaster_daily_list_items"] });
    },
    onError: (mutationError) => setListError(mutationError instanceof Error ? mutationError.message : "Import liste impossible"),
    onSettled: () => setListImportState("idle"),
  });

  async function handleAnalyze(file: File): Promise<void> {
    setImportState("parsing");
    setError(null);
    setFeedback(null);
    setAnalysisProgress({ phase: "reading", processedRows: 0, totalRows: 0, percent: 0 });
    try {
      const result = await parseNavemasterWorkbook(file, {
        maxRows: DEFAULT_ANALYSIS_ROW_LIMIT,
        onProgress: setAnalysisProgress,
      });
      setParsed(result);
      setFeedback(
        result.isPreview
          ? `Analyse rapide OK : aperçu limité aux ${DEFAULT_ANALYSIS_ROW_LIMIT} premières lignes pour rester fluide.`
          : `Analyse OK : ${result.meta.totalRows} lignes métier détectées dans INCA.`
      );
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Analyse Navemaster impossible");
      setParsed(null);
    } finally {
      setAnalysisProgress(null);
      setImportState("idle");
    }
  }

  async function handleImport(): Promise<void> {
    if (!selectedFile) {
      setError("Choisir un fichier Excel Navemaster");
      return;
    }
    setImportState("importing");
    setError(null);
    setFeedback(null);
    try {
      const workbook = parsed && !parsed.isPreview ? parsed : await parseNavemasterWorkbook(selectedFile);
      const result = await createNavemasterImport(selectedFile, workbook);
      setFeedback(
        result.status === "skipped"
          ? result.reason ?? "Import déjà actif"
          : `Navemaster mis à jour : ${result.rowCount} câbles importés.`
      );
      await Promise.all([refetchActiveImport(), refetchArchives(), refetchActiveRows()]);
      setParsed(workbook);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import Navemaster impossible");
    } finally {
      setImportState("idle");
    }
  }

  return (
    <Screen className="space-y-6">
      <section className="rounded-[32px] border border-stone-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f0e3_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <AppBar
          title="Navemaster"
          subtitle="Le dernier import actif est la vérité. Les versions précédentes restent en archive. L'AI layer lit sans jamais modifier la base métier."
          action={<Pill tone="sky">versionné</Pill>}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <StatCard label="Live" value={activeRows?.length ?? 0} helper="câbles actifs" tone="emerald" />
          <StatCard label="Archives" value={archives?.filter((item) => !item.is_active).length ?? 0} helper="versions précédentes" tone="neutral" />
          <StatCard
            label="Diff preview"
            value={previewDiffCount}
            helper={hasPreview ? "vs version active" : "aucun nouveau fichier analysé"}
            tone={previewDiffCount > 0 ? "amber" : "neutral"}
          />
          <StatCard
            label="AI insights"
            value={previewInsightCount}
            helper={hasPreview ? "câbles à surveiller dans l'aperçu" : "aucun nouveau fichier analysé"}
            tone={previewInsightCount > 0 ? "violet" : "neutral"}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {NAVEMASTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-950"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "import" ? (
      <Section title="Import INCA" eyebrow="Nouvelle vérité" count={parsed?.meta.totalRows ?? 0}>
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
              setParsed(null);
              setFeedback(null);
              setError(null);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-2xl file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-medium"
          />
          <div className="flex flex-wrap gap-3">
            <button onClick={() => selectedFile && handleAnalyze(selectedFile)} disabled={!selectedFile || importState !== "idle"} className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {importState === "parsing" ? "Analyse..." : "Analyser le fichier"}
            </button>
            <button onClick={handleImport} disabled={!selectedFile || importState !== "idle"} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-900 disabled:opacity-50">
              {importState === "importing" ? "Import..." : "Importer comme vérité"}
            </button>
          </div>
          {analysisProgress ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>
                  {analysisProgress.phase === "reading"
                    ? "Lecture du fichier"
                    : analysisProgress.phase === "scanning"
                      ? "Analyse des lignes"
                      : "Terminé"}
                </span>
                <span>{analysisProgress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-stone-900 via-amber-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${analysisProgress.percent}%` }}
                />
              </div>
            </div>
          ) : null}
          {parsed ? (
          <div className="grid gap-3 md:grid-cols-4">
              <StatCard label="Commessa" value={parsed.meta.commessa ?? "—"} tone="neutral" />
              <StatCard label="Costr" value={parsed.meta.costr ?? "—"} tone="neutral" />
              <StatCard label="Lignes métier" value={parsed.meta.totalRows} tone="sky" />
              <StatCard label="Header" value={`L${parsed.meta.headerRowIndex}`} tone="neutral" />
            </div>
          ) : null}
          {parsed?.isPreview ? <p className="text-xs text-stone-500">Aperçu rapide activé. L’import final relit le fichier complet avant écriture.</p> : null}
          {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      </Section>
      ) : null}

      {activeTab === "live" ? (
      <Section title="Légende métier" eyebrow="Règles Navemaster" count={legendGroups.length}>
        <div className="grid gap-3 xl:grid-cols-4">
          {legendGroups.map((group) => (
            <article key={group.key} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-950">{group.title}</h3>
                  <p className="mt-1 text-xs text-stone-500">{group.subtitle}</p>
                </div>
                <Pill tone="neutral">{group.entries.length}</Pill>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.entries.map((entry) => (
                  <div
                    key={`${group.key}-${entry.code}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Pill tone={getNavemasterLegendTone(entry.severity) as "neutral" | "emerald" | "amber" | "red"}>
                        {entry.code}
                      </Pill>
                      <span className="text-xs font-medium text-stone-900">{entry.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-stone-500">{entry.meaning}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>
      ) : null}

      {activeTab === "live" ? (
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Section title="Live" eyebrow="Version active" count={activeRows?.length ?? 0}>
          {activeImport && activeRows ? (
            <div className="space-y-3">
              <article className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="emerald">actif</Pill>
                  <span className="text-sm font-medium text-stone-900">{activeImport.file_name}</span>
                  <span className="text-xs text-stone-500">{formatDate(activeImport.imported_at)}</span>
                </div>
                <p className="mt-3 text-sm text-stone-700">{activeRows.length} câbles dans la vérité Navemaster actuelle.</p>
              </article>
              <div className="grid gap-3 md:grid-cols-2">
                {activeRows.slice(0, 8).map((row) => (
                  <article key={row.marcacavo} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-stone-950">{row.marcacavo}</p>
                        {row.ex_marca_cavo ? <p className="mt-1 text-[11px] text-stone-500">Ancien: {row.ex_marca_cavo}</p> : null}
                      </div>
                      <Pill tone={row.ex_marca_cavo ? "amber" : String(row.payload.problematiche_cavi ?? row.payload.problematiche_collegamenti ?? "").trim() ? "red" : "neutral"}>
                        {row.ex_marca_cavo ? "modifié" : row.stato_cavo ?? "—"}
                      </Pill>
                    </div>
                    <p className="mt-2 text-xs text-stone-600">{row.impianto ?? "—"} · {row.apparato_da ?? "—"} → {row.apparato_a ?? "—"}</p>
                    {row.ex_marca_cavo ? <p className="mt-1 text-xs text-amber-700">Nouveau: {row.marcacavo}</p> : null}
                    {row.payload.note_sviluppo ? <p className="mt-2 text-sm text-stone-700">{String(row.payload.note_sviluppo)}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Aucune version active" description="Importer le premier fichier Navemaster pour établir la vérité métier." icon="🧭" />
          )}
        </Section>

        <Section title="Lecture IA" eyebrow="Cerveau métier" count={activeAi.insights.length}>
          <div className="space-y-3">
            {activeAi.summary.map((line) => (
              <article key={line} className="rounded-[24px] border border-violet-200 bg-violet-50/70 p-4 shadow-sm text-sm text-stone-700">
                {line}
              </article>
            ))}
            {activeAi.insights.slice(0, 6).map((insight) => (
              <article key={insight.marcacavo} className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm font-semibold text-stone-950">{insight.marcacavo}</p>
                  <Pill tone={insight.aiRiskScore >= 60 ? "red" : insight.aiRiskScore >= 30 ? "amber" : "neutral"}>{insight.aiRiskScore}</Pill>
                </div>
                <p className="mt-2 text-sm text-stone-700">{insight.aiSummary}</p>
                <p className="mt-2 text-xs text-stone-600">Action : {insight.aiNextAction ?? "—"}</p>
              </article>
            ))}
          </div>
        </Section>
      </div>
      ) : null}

      {activeTab === "worklist" ? (
        <Section title="Liste de travail" eyebrow="File d'action Navemaster" count={worklist.length}>
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-5">
              <StatCard label="Actions" value={worklist.length} helper="vue filtrée" tone="amber" />
              <StatCard label="Critiques" value={worklistModel.summary.critical} helper="priorité terrain" tone={worklistModel.summary.critical > 0 ? "red" : "neutral"} />
              <StatCard label="Apparati" value={worklistModel.summary.apparatiImpacted} helper="équipements touchés" tone="sky" />
              <StatCard label="Telegram" value={worklistModel.summary.withTelegram} helper="signaux récents" tone="emerald" />
              <StatCard label="Terrain" value={worklistModel.summary.withTerrain} helper="preuves liées" tone="violet" />
            </div>

            <article className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-950">Ajouter une liste chantier</h3>
                  <p className="mt-1 text-xs text-stone-600">PDF ou Excel L1/L2/L3/L4. La liste devient un filtre de travail, Navemaster reste la vérité.</p>
                </div>
                <Pill tone={dailyImports?.length ? "sky" : "neutral"}>{dailyImports?.length ?? 0} liste(s)</Pill>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  disabled={listImportState !== "idle"}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleWorklistFile(file);
                  }}
                  className="block w-full text-sm file:mr-3 file:rounded-2xl file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-medium disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={!listParseResult || listParseResult.rows.length === 0 || listImportState !== "idle"}
                  onClick={() => listImportMutation.mutate()}
                  className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {listImportState === "importing" ? "Import..." : "Importer liste"}
                </button>
              </div>

              {listImportState === "parsing" ? <p className="mt-3 text-xs text-stone-500">Lecture de la liste...</p> : null}
              {listError ? <p className="mt-3 text-sm text-rose-700">{listError}</p> : null}
              {listParseResult ? (
                <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-stone-950">{listFileName}</p>
                    <Pill tone="emerald">{listParseResult.rows.length} lignes</Pill>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">
                    {listParseResult.source_kind.toUpperCase()} · {listParseResult.detected_date ?? "date non détectée"}
                  </p>
                  {listParseResult.warnings.length > 0 ? (
                    <p className="mt-2 text-xs text-amber-700">{listParseResult.warnings.join(" · ")}</p>
                  ) : null}
                </div>
              ) : null}
            </article>

            <article className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-950">Filtres de vue</h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedListId("all");
                    setSelectedEquipment("all");
                    setSelectedPerimeter("all");
                    setSelectedLevel("all");
                    setSelectedSource("all");
                    setWorklistQuery("");
                  }}
                  className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-300 hover:text-stone-950"
                >
                  Réinitialiser
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Liste</span>
                  <select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm">
                    <option value="all">Toutes</option>
                    {(dailyImports ?? []).map((item) => (
                      <option key={item.id} value={item.id}>{item.file_name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Apparato</span>
                  <select value={selectedEquipment} onChange={(event) => setSelectedEquipment(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm">
                    <option value="all">Tous</option>
                    {equipmentOptions.map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Zone</span>
                  <select value={selectedPerimeter} onChange={(event) => setSelectedPerimeter(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm">
                    <option value="all">Toutes</option>
                    {perimeterOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Niveau</span>
                  <select value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value as WorklistLevelFilter)} className="mt-1 min-h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm">
                    <option value="all">Tous</option>
                    <option value="critical">Critique</option>
                    <option value="high">Haut</option>
                    <option value="watch">Veille</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Source</span>
                  <select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value as WorklistSourceFilter)} className="mt-1 min-h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm">
                    <option value="all">Toutes</option>
                    <option value="telegram">Telegram</option>
                    <option value="terrain">Terrain</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Recherche</span>
                  <input
                    value={worklistQuery}
                    onChange={(event) => setWorklistQuery(event.target.value)}
                    placeholder="câble, apparato..."
                    className="mt-1 min-h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-amber-400 focus:bg-white"
                  />
                </label>
              </div>
            </article>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-stone-950">Zones à surveiller</h3>
                  <Pill tone="neutral">{worklistModel.perimeters.length}</Pill>
                </div>
                <ECharts option={perimeterChart} style={{ height: 260, width: "100%" }} />
              </article>

              <article className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-stone-950">Apparati impactés</h3>
                  <Pill tone="neutral">{worklistModel.equipments.length}</Pill>
                </div>
                <ECharts option={equipmentChart} style={{ height: 260, width: "100%" }} />
              </article>
            </div>

            {worklistModel.equipments.length > 0 ? (
              <article className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-stone-950">Top apparati</h3>
                  <Pill tone="sky">{worklistModel.equipments.length}</Pill>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {worklistModel.equipments.slice(0, 6).map((equipment) => (
                    <div key={equipment.code} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-sm font-semibold text-stone-950">{equipment.code}</p>
                        <Pill tone={equipment.maxScore >= 70 ? "red" : "amber"}>{equipment.maxScore}</Pill>
                      </div>
                      <p className="mt-2 text-xs text-stone-600">{equipment.count} câble(s) liés</p>
                      <p className="mt-2 truncate font-mono text-xs text-stone-500">{equipment.cables.slice(0, 4).join(", ")}</p>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {worklist.length > 0 ? (
              worklist.slice(0, 40).map((insight) => (
                <article key={insight.cableCode} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/cable/${encodeURIComponent(insight.cableCode)}`)}
                        className="font-mono text-sm font-semibold text-stone-950 hover:text-sky-700"
                      >
                        {insight.displayCode}
                      </button>
                      <p className="mt-1 text-sm text-stone-700">{insight.nextAction}</p>
                      <p className="mt-2 text-xs text-stone-500">{insight.perimetro ?? "Sans perimetro"} · {insight.apparati.join(" → ") || "apparati incomplets"}</p>
                    </div>
                    <Pill tone={insight.score >= 70 ? "red" : "amber"}>{insight.score}</Pill>
                  </div>
                  {insight.reasons.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {insight.reasons.slice(0, 5).map((reason) => (
                        <span key={reason} className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {(insight.telegramMessages.length > 0 || insight.terrainEvidence.length > 0) ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {insight.telegramMessages.slice(0, 2).map((message) => (
                        <p key={message.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
                          Telegram · {message.sender_name ?? "terrain"} : {message.text ?? "message sans texte"}
                        </p>
                      ))}
                      {insight.terrainEvidence.slice(0, 2).map((evidence) => (
                        <p key={evidence.cable_event_id ?? evidence.core_event_id ?? evidence.occurred_at} className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-5 text-violet-900">
                          Terrain · {evidence.event_kind ?? "signal"} : {evidence.last_message ?? evidence.raw_note ?? "preuve liée"}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <EmptyState title="Aucune action prioritaire" description="Importer ou analyser un fichier Navemaster pour construire la file de travail." icon="✓" />
            )}
          </div>
        </Section>
      ) : null}

      {activeTab === "story" ? (
        <Section title="Cable Story" eyebrow="Mémoire câble" count={0}>
          <form onSubmit={openCableStory} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-stone-700">Code câble</label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={storyQuery}
                onChange={(event) => setStoryQuery(event.target.value)}
                placeholder="Exemple : T VU 001"
                className="min-h-11 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-amber-400 focus:bg-white"
              />
              <button type="submit" className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white">
                Ouvrir la story
              </button>
            </div>
          </form>
        </Section>
      ) : null}

      {activeTab === "archives" || activeTab === "import" ? (
      <Section title="Diff du jour" eyebrow="Nouveau fichier vs live" count={previewDiff.length}>
        {parsed ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(groupedDiff).map(([kind, rows]) => (
              <article key={kind} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-stone-950">{kind}</h3>
                  <Pill tone={rows.length > 0 ? "amber" : "neutral"}>{rows.length}</Pill>
                </div>
                <div className="mt-3 space-y-2">
                  {rows.slice(0, 5).map((row) => (
                    <p key={`${kind}-${row.marcacavo}`} className="font-mono text-xs text-stone-700">{row.marcacavo}</p>
                  ))}
                  {rows.length === 0 ? <p className="text-xs text-stone-500">Aucun changement</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Analyse d'abord le nouveau fichier" description="Le diff apparaît après lecture locale de la prochaine version Excel." icon="Δ" />
        )}
      </Section>
      ) : null}

      {activeTab === "archives" ? (
      <Section title="Archives" eyebrow="Historique versionné" count={archives?.length ?? 0}>
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          {(archives?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {archives?.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-stone-950">{item.file_name}</p>
                    <p className="text-xs text-stone-600">{item.costr ?? "—"} / {item.commessa ?? "—"} · {formatDate(item.imported_at)}</p>
                  </div>
                  <Pill tone={item.is_active ? "emerald" : "neutral"}>{item.is_active ? "active" : "archive"}</Pill>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-600">Aucune archive Navemaster pour l'instant.</p>
          )}
        </div>
      </Section>
      ) : null}
    </Screen>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPerimeterChart(perimeters: Array<{ name: string; count: number; maxScore: number }>): EChartsOption {
  return {
    grid: { left: 8, right: 18, top: 20, bottom: 30, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: perimeters.map((item) => item.name),
      axisLabel: { color: "#57534e", fontSize: 10, interval: 0, rotate: 25 },
    },
    yAxis: { type: "value", axisLabel: { color: "#78716c" }, splitLine: { lineStyle: { color: "#e7e5e4" } } },
    series: [
      {
        type: "bar",
        name: "Actions",
        data: perimeters.map((item) => item.count),
        itemStyle: { color: "#0ea5e9", borderRadius: [6, 6, 0, 0] },
      },
      {
        type: "line",
        name: "Score max",
        data: perimeters.map((item) => item.maxScore),
        smooth: true,
        lineStyle: { color: "#dc2626", width: 2 },
        itemStyle: { color: "#dc2626" },
      },
    ],
  };
}

function buildEquipmentChart(equipments: Array<{ code: string; count: number; maxScore: number }>): EChartsOption {
  return {
    grid: { left: 8, right: 20, top: 20, bottom: 20, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: { type: "value", axisLabel: { color: "#78716c" }, splitLine: { lineStyle: { color: "#e7e5e4" } } },
    yAxis: {
      type: "category",
      data: equipments.slice(0, 8).map((item) => item.code),
      axisLabel: { color: "#57534e", fontSize: 10 },
    },
    series: [
      {
        type: "bar",
        name: "Câbles",
        data: equipments.slice(0, 8).map((item) => item.count),
        itemStyle: { color: "#f59e0b", borderRadius: [0, 6, 6, 0] },
      },
    ],
  };
}

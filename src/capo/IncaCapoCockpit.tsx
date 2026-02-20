// /src/capo/IncaCapoCockpit.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "../lib/supabaseClient";
import LoadingScreen from "../components/LoadingScreen";
import ApparatoCaviPopover from "../features/inca/ApparatoCaviPopover";
import { ApparatoPill, CodicePill, computeApparatoPMaps } from "../features/inca/IncaPills";
import { useI18n } from "../i18n/CoreI18n";

type ShipRow = {
  id: string;
  code?: string | null;
  name?: string | null;
  costr?: string | null;
  commessa?: string | null;
} | null;

type IncaFileRow = {
  id: string;
  costr: string | null;
  commessa: string | null;
  file_name: string | null;
  uploaded_at: string | null;
};

type IncaCavoRow = {
  id: string;
  inca_file_id: string;
  costr: string | null;
  commessa: string | null;
  codice: string | null;
  rev_inca?: string | null;
  descrizione?: string | null;
  impianto?: string | null;
  tipo?: string | null;
  sezione?: string | null;
  zona_da?: string | null;
  zona_a?: string | null;
  apparato_da?: string | null;
  apparato_a?: string | null;
  descrizione_da?: string | null;
  descrizione_a?: string | null;
  metri_teo?: number | string | null;
  metri_dis?: number | string | null;
  metri_totali?: number | string | null;
  marca_cavo?: string | null;
  livello?: string | null;
  wbs?: string | null;
  situazione?: string | null;
  data_posa?: string | null;
  capo_label?: string | null;
};

type DistribItem = {
  code: string;
  label: string;
  count: number;
};

type HistoryFilter = "all" | "with" | "without";

const SITUAZIONI_ORDER = ["NP", "T", "P", "R", "B", "E"] as const;

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function localeFromLang(lang: string): string {
  if (lang === "fr") return "fr-FR";
  if (lang === "en") return "en-US";
  return "it-IT";
}

function formatMeters(locale: string, v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
}

function formatDate(locale: string, value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function formatPct(locale: string, value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function colorForSituazione(code: string): string {
  switch (code) {
    case "P":
      return "#34d399";
    case "T":
      return "#38bdf8";
    case "R":
      return "#fbbf24";
    case "B":
      return "#e879f9";
    case "E":
      return "#fb7185";
    case "NP":
    default:
      return "#a855f7";
  }
}

function tipoCavoLabel(r: IncaCavoRow): string {
  const t = norm(r?.tipo);
  if (t) return t;
  const m = norm(r?.marca_cavo);
  if (m) return m;
  return "—";
}

function hasHistory(r: IncaCavoRow): boolean {
  return Boolean(r?.data_posa) || Boolean(r?.capo_label);
}

function getSituazioneBucket(situazione: unknown): (typeof SITUAZIONI_ORDER)[number] {
  const s = norm(situazione);
  // Canon: L is stored as NULL; NP bucket for cockpit KPI is L+T+B+R.
  // For the chart we still keep separate codes when present.
  if (!s) return "NP";
  if ((SITUAZIONI_ORDER as readonly string[]).includes(s)) return s as any;
  return "NP";
}

function isNPBucket(situazione: unknown): boolean {
  const s = norm(situazione);
  // NP = L (NULL) + T + B + R
  return !s || s === "T" || s === "B" || s === "R";
}

export default function IncaCapoCockpit(): JSX.Element {
  const { shipId } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const locale = useMemo(() => localeFromLang(lang), [lang]);

  // Ship context
  const [ship, setShip] = useState<ShipRow>(null);
  const [defaultCostr, setDefaultCostr] = useState<string>("");
  const [defaultCommessa, setDefaultCommessa] = useState<string>("");

  // File selection
  const [files, setFiles] = useState<IncaFileRow[]>([]);
  const [fileId, setFileId] = useState<string>("");

  // Display labels
  const [costr, setCostr] = useState<string>("");
  const [commessa, setCommessa] = useState<string>("");

  // Filters
  const [query, setQuery] = useState<string>("");
  const [onlyP, setOnlyP] = useState<boolean>(false);
  const [onlyNP, setOnlyNP] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  // Data
  const [cavi, setCavi] = useState<IncaCavoRow[]>([]);

  // Loading / errors
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedCable, setSelectedCable] = useState<IncaCavoRow | null>(null);

  // UI — chart modal
  const [isDistribModalOpen, setIsDistribModalOpen] = useState<boolean>(false);

  // UI — apparato popover
  const [apparatoPopoverOpen, setApparatoPopoverOpen] = useState<boolean>(false);
  const [apparatoPopoverSide, setApparatoPopoverSide] = useState<"DA" | "A">("DA");
  const [apparatoPopoverName, setApparatoPopoverName] = useState<string>("");
  const [apparatoAnchorRect, setApparatoAnchorRect] = useState<DOMRect | null>(null);

  // Batched loading rules (pageSize <= 1000 to defeat PostgREST caps)
  const loadInfo = useMemo(() => ({ pageSize: 1000, maxPages: 200 }), []);

  // 0) Resolve ship -> default COSTR/COMMESSA (CAPO)
  useEffect(() => {
    let alive = true;

    async function loadShip() {
      setError(null);
      try {
        if (!shipId) return;
        const { data: sRow, error: sErr } = await supabase.from("ships").select("*").eq("id", shipId).single();
        if (!alive) return;
        if (!sErr && sRow) {
          setShip(sRow as any);
          setDefaultCostr(norm((sRow as any).costr) || "");
          setDefaultCommessa(norm((sRow as any).commessa) || "");
        } else {
          setShip(null);
          setDefaultCostr(norm(shipId));
          setDefaultCommessa("");
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[IncaCapoCockpit] loadShip error:", e);
        if (!alive) return;
        setShip(null);
        setDefaultCostr(norm(shipId));
        setDefaultCommessa("");
      }
    }

    void loadShip();
    return () => {
      alive = false;
    };
  }, [shipId]);

  // 1) Load files
  useEffect(() => {
    let alive = true;

    async function loadFiles() {
      setLoadingFiles(true);
      setError(null);

      try {
        const { data, error: e } = await supabase
          .from("inca_files")
          .select("id,costr,commessa,file_name,uploaded_at")
          .order("uploaded_at", { ascending: false })
          .limit(200);

        if (e) throw e;
        if (!alive) return;

        const list = Array.isArray(data) ? (data as any as IncaFileRow[]) : [];
        setFiles(list);

        const initialCostr = defaultCostr || list[0]?.costr || "";
        const initialCommessa = defaultCommessa || list[0]?.commessa || "";

        setCostr(norm(initialCostr));
        setCommessa(norm(initialCommessa));

        const firstMatching = list.find(
          (f) => norm(f.costr) === norm(initialCostr) && norm(f.commessa) === norm(initialCommessa)
        );

        const initialFileId = firstMatching?.id || list[0]?.id || "";
        setFileId(initialFileId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[IncaCapoCockpit] loadFiles error:", err);
        if (!alive) return;
        setFiles([]);
        setError(t("inca.capo.errors.files"));
      } finally {
        if (!alive) return;
        setLoadingFiles(false);
      }
    }

    void loadFiles();
    return () => {
      alive = false;
    };
  }, [defaultCostr, defaultCommessa, t]);

  // 2) Load cavi (batched, no 1000 ceiling)
  // IMPORTANT: source is VIEW inca_cavi_with_last_posa_and_capo_v3 (adds data_posa + capo_label)
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    async function loadCavi() {
      if (!fileId) return;

      setLoading(true);
      setError(null);
      setSelectedCable(null);

      try {
        const all: IncaCavoRow[] = [];
        let page = 0;

        while (page < loadInfo.maxPages) {
          const from = page * loadInfo.pageSize;
          const to = from + loadInfo.pageSize - 1;

          const { data, error: e } = await supabase
            .from("inca_cavi_with_last_posa_and_capo_v3")
            .select(
              [
                "id",
                "inca_file_id",
                "costr",
                "commessa",
                "codice",
                "rev_inca",
                "descrizione",
                "impianto",
                "tipo",
                "sezione",
                "zona_da",
                "zona_a",
                "apparato_da",
                "apparato_a",
                "descrizione_da",
                "descrizione_a",
                "metri_teo",
                "metri_dis",
                "metri_totali",
                "marca_cavo",
                "livello",
                "wbs",
                "situazione",
                "data_posa",
                "capo_label",
              ].join(",")
            )
            .eq("inca_file_id", fileId)
            .order("codice", { ascending: true })
            .range(from, to)
            .abortSignal(ac.signal);

          if (e) throw e;

          const chunk = Array.isArray(data) ? (data as any as IncaCavoRow[]) : [];
          all.push(...chunk);

          if (chunk.length === 0) break;
          if (chunk.length < loadInfo.pageSize) break;
          page++;
        }

        if (!alive) return;

        setCavi(all);

        const chosenFile = (files || []).find((x) => x.id === fileId);
        if (chosenFile) {
          setCostr(norm(chosenFile.costr));
          setCommessa(norm(chosenFile.commessa));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[IncaCapoCockpit] loadCavi error:", err);
        if (!alive) return;
        setCavi([]);
        setError(t("inca.capo.errors.cavi"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    void loadCavi();
    return () => {
      alive = false;
      ac.abort();
    };
  }, [fileId, loadInfo.maxPages, loadInfo.pageSize, files, t]);

  const historyStats = useMemo(() => {
    const total = (cavi || []).length;
    const withHist = (cavi || []).reduce((acc, r) => acc + (hasHistory(r) ? 1 : 0), 0);
    const withoutHist = Math.max(0, total - withHist);
    const coverage = total > 0 ? (withHist / total) * 100 : 0;
    return { total, withHist, withoutHist, coverage };
  }, [cavi]);

  const filteredCavi = useMemo(() => {
    const q = (query || "").trim().toLowerCase();

    return (cavi || []).filter((r) => {
      const situ = norm(r.situazione);
      const isP = situ === "P";
      const isNP = isNPBucket(situ);

      if (onlyP && !isP) return false;
      if (onlyNP && !isNP) return false;

      if (historyFilter === "with" && !hasHistory(r)) return false;
      if (historyFilter === "without" && hasHistory(r)) return false;

      if (!q) return true;

      const hay = [
        r.codice,
        r.descrizione,
        r.impianto,
        r.tipo,
        r.sezione,
        r.zona_da,
        r.zona_a,
        r.apparato_da,
        r.apparato_a,
        r.descrizione_da,
        r.descrizione_a,
        r.marca_cavo,
        r.livello,
        r.wbs,
        r.data_posa,
        r.capo_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [cavi, query, onlyP, onlyNP, historyFilter]);

  // Apparato P-ratio maps computed on FILE scope
  const apparatoPMaps = useMemo(() => computeApparatoPMaps(cavi as any), [cavi]);

  // Metrics on visible scope
  const totalMetri = useMemo(() => {
    return (filteredCavi || []).reduce((acc, r) => {
      const m = safeNum(r.metri_totali) || safeNum(r.metri_teo) || safeNum(r.metri_dis) || 0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const totalMetriPosati = useMemo(() => {
    return (filteredCavi || []).reduce((acc, r) => {
      const s = norm(r.situazione);
      if (s !== "P") return acc;
      const m = safeNum(r.metri_totali) || safeNum(r.metri_dis) || safeNum(r.metri_teo) || 0;
      return acc + m;
    }, 0);
  }, [filteredCavi]);

  const distrib: DistribItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const code of SITUAZIONI_ORDER) map.set(code, 0);

    for (const r of filteredCavi) {
      const key = getSituazioneBucket(r.situazione);
      map.set(key, (map.get(key) || 0) + 1);
    }

    return SITUAZIONI_ORDER.map((k) => ({
      code: k,
      label: t(`inca.situazioni.${k}`),
      count: map.get(k) || 0,
    }));
  }, [filteredCavi, t]);

  const totalCavi = filteredCavi.length;

  const doneCount = useMemo(() => {
    return filteredCavi.reduce((acc, r) => acc + (norm(r.situazione) === "P" ? 1 : 0), 0);
  }, [filteredCavi]);

  const prodPercent = useMemo(() => {
    if (!totalCavi) return 0;
    return (doneCount / totalCavi) * 100;
  }, [doneCount, totalCavi]);

  function openApparatoPopover(e: React.MouseEvent, side: "DA" | "A", apparatoName: unknown) {
    const name = String(apparatoName || "").trim();
    if (!name) return;

    const rect = (e.currentTarget as any)?.getBoundingClientRect ? (e.currentTarget as any).getBoundingClientRect() : null;
    setApparatoAnchorRect(rect);
    setApparatoPopoverSide(side);
    setApparatoPopoverName(name);
    setApparatoPopoverOpen(true);
  }

  const headerTitle = useMemo(() => {
    const c = norm(costr) || "—";
    const m = norm(commessa) || "—";
    return `${t("inca.capo.header.costr")} ${c} · ${t("inca.capo.header.commessa")} ${m}`;
  }, [costr, commessa, t]);

  const historyChip = (kind: HistoryFilter, count: number) => {
    const active = historyFilter === kind;
    const base = "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] transition-colors";
    const cls = active
      ? "border-slate-600 bg-slate-900/70 text-slate-50"
      : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900/40";

    const label =
      kind === "all"
        ? t("inca.filters.all")
        : kind === "with"
          ? t("inca.filters.withHistory")
          : t("inca.filters.withoutHistory");

    return (
      <button
        type="button"
        className={`${base} ${cls}`}
        onClick={() => setHistoryFilter(kind)}
        aria-pressed={active}
      >
        <span className="font-semibold">{label}</span>
        <span className="text-slate-400 tabular-nums">{count}</span>
      </button>
    );
  };

  function renderHistoryCell(r: IncaCavoRow): JSX.Element {
    const capo = norm(r.capo_label);
    const date = formatDate(locale, r.data_posa);

    if (!capo && !date) {
      return (
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-slate-200">{t("inca.history.noneTitle")}</div>
          <div className="text-[11px] text-slate-500" title={t("inca.history.tooltipNoHist")}>
            {t("inca.history.noneSubtitle")}
          </div>
        </div>
      );
    }

    return (
      <div className="min-w-0">
        {date ? (
          <div className="text-[12px] text-slate-200 tabular-nums">{date}</div>
        ) : (
          <div className="text-[12px] text-slate-300">{t("inca.history.capoOnlySubtitle")}</div>
        )}

        {capo ? (
          <div className="text-[11px] text-slate-400 truncate">
            <span className="text-slate-500">{t("inca.history.capoLabel")}</span> {capo}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* CAPO Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("inca.capo.header.kicker")}</div>
            <div className="text-2xl font-semibold text-slate-50 leading-tight truncate">{headerTitle}</div>
            <div className="text-[12px] text-slate-400 mt-1">
              {ship ? (
                <>
                  {t("inca.capo.header.ship")}{" "}
                  <span className="text-slate-100 font-semibold">{norm((ship as any)?.code) || "—"}</span> ·{" "}
                  <span className="text-slate-200">{norm((ship as any)?.name) || "—"}</span>
                </>
              ) : (
                <>
                  {t("inca.capo.header.ship")} —
                </>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="shrink-0 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
            >
              {t("inca.capo.actions.back")}
            </button>

            <div className="text-right text-[11px]">
              {loadingFiles ? (
                <span className="text-slate-400">{t("inca.capo.loading.files")}</span>
              ) : (
                <span className="text-slate-400">
                  {t("inca.capo.meta.files")}: <span className="text-slate-200 font-semibold">{files?.length || 0}</span>
                </span>
              )}
              <div className="mt-1">
                {loading ? (
                  <span className="text-slate-400">{t("inca.capo.loading.cavi")}</span>
                ) : (
                  <span className="text-slate-400">
                    {t("inca.capo.meta.visibleCables")}: <span className="text-slate-200 font-semibold">{totalCavi}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History KPI band (Objective B) */}
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("inca.kpi.headCables")}</div>
              <div className="text-[14px] font-semibold text-slate-50 tabular-nums">{historyStats.total}</div>
            </div>

            <button
              type="button"
              onClick={() => setHistoryFilter("with")}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-left hover:bg-slate-900/40"
              title={t("inca.filters.withHistory")}
            >
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("inca.kpi.withHistory")}</div>
              <div className="text-[14px] font-semibold text-slate-50 tabular-nums">{historyStats.withHist}</div>
            </button>

            <button
              type="button"
              onClick={() => setHistoryFilter("without")}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-left hover:bg-slate-900/40"
              title={t("inca.filters.withoutHistory")}
            >
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("inca.kpi.withoutHistory")}</div>
              <div className="text-[14px] font-semibold text-slate-50 tabular-nums">{historyStats.withoutHist}</div>
            </button>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("inca.kpi.coverage")}</div>
              <div className="text-[14px] font-semibold text-slate-50 tabular-nums">{formatPct(locale, historyStats.coverage)}%</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {historyChip("all", historyStats.total)}
            {historyChip("with", historyStats.withHist)}
            {historyChip("without", historyStats.withoutHist)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3">
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">{t("inca.capo.filters.title")}</div>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-slate-400 block mb-1">{t("inca.capo.filters.file")}</label>
              <select
                value={fileId}
                onChange={(e) => {
                  const v = e.target.value;
                  setFileId(v);
                  const f = (files || []).find((x) => x.id === v);
                  if (f) {
                    setCostr(norm(f.costr));
                    setCommessa(norm(f.commessa));
                  }
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
              >
                {(files || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {(norm(f.costr) || "—") + " · " + (norm(f.commessa) || "—") + " · " + (norm(f.file_name) || "file")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] text-slate-400 block mb-1">{t("inca.capo.filters.searchLabel")}</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("inca.capo.filters.searchPlaceholder")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-[12px] text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyP}
                  onChange={(e) => {
                    setOnlyP(e.target.checked);
                    if (e.target.checked) setOnlyNP(false);
                  }}
                />
                {t("inca.capo.filters.onlyP")}
              </label>

              <label className="inline-flex items-center gap-2 text-[12px] text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyNP}
                  onChange={(e) => {
                    setOnlyNP(e.target.checked);
                    if (e.target.checked) setOnlyP(false);
                  }}
                />
                {t("inca.capo.filters.onlyNP")}
              </label>

              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOnlyP(false);
                  setOnlyNP(false);
                  setHistoryFilter("all");
                }}
                className="ml-auto rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
              >
                {t("inca.capo.actions.reset")}
              </button>
            </div>

            {error ? (
              <div className="rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-[12px] text-amber-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        {/* KPIs + Chart */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">{t("inca.capo.overview.title")}</div>
              <div className="text-[11px] text-slate-400">{t("inca.capo.overview.subtitle")}</div>
            </div>

            <div className="text-right text-[11px]">
              <div className="text-slate-400">
                {t("inca.capo.overview.cables")}:{" "}
                <span className="text-slate-100 font-semibold">{totalCavi}</span>
              </div>
              <div className="text-slate-400">
                {t("inca.capo.overview.metersTheoretical")}:{" "}
                <span className="text-slate-100 font-semibold">{formatMeters(locale, totalMetri)}</span>
              </div>
              <div className="text-slate-400">
                {t("inca.capo.overview.metersPosati")}:{" "}
                <span className="text-emerald-200 font-semibold">{formatMeters(locale, totalMetriPosati)}</span>
              </div>
            </div>
          </div>

          {/* Barometer */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>{t("inca.capo.overview.production")}</span>
                <span className="text-sky-300 font-semibold">{formatPct(locale, prodPercent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, prodPercent)}%`, backgroundColor: colorForSituazione("P") }}
                />
              </div>
            </div>
          </div>

          {distrib.length > 0 ? (
            <div
              className="h-28 mt-3 rounded-xl border border-slate-800 bg-slate-950/40 cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => setIsDistribModalOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setIsDistribModalOpen(true);
              }}
              title={t("inca.capo.overview.openChart")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distrib}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="code" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(2,6,23,0.92)",
                      border: "1px solid rgba(51,65,85,0.8)",
                      borderRadius: 12,
                      color: "#e2e8f0",
                      fontSize: 12,
                    }}
                    formatter={(value: any) => [`${value}`, t("inca.capo.overview.tooltipCables")]}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {distrib.map((d) => (
                      <Cell key={d.code} fill={colorForSituazione(d.code)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-800">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            {t("inca.capo.table.title")} ({filteredCavi.length})
          </div>
          <div className="text-[11px] text-slate-500">{t("inca.capo.table.hint")}</div>
        </div>

        {loading ? (
          <div className="p-4">
            <LoadingScreen message={t("inca.capo.loading.caviShort")} />
          </div>
        ) : (
          <div className="max-h-[62vh] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-950/90 backdrop-blur border-b border-slate-800">
                <tr className="text-left text-[11px] text-slate-500">
                  <th className="px-3 py-2">{t("inca.capo.table.col.codice")}</th>
                  <th className="px-3 py-2">{t("inca.capo.table.col.history")}</th>
                  <th className="px-3 py-2">{t("inca.capo.table.col.daA")}</th>
                  <th className="px-3 py-2">{t("inca.capo.table.col.tipo")}</th>
                  <th className="px-3 py-2">{t("inca.capo.table.col.situazione")}</th>
                  <th className="px-3 py-2 text-right">{t("inca.capo.table.col.metri")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredCavi.map((r) => {
                  const situ = getSituazioneBucket(r.situazione);

                  const appDA = norm(r.apparato_da);
                  const appA = norm(r.apparato_a);

                  const statDA = appDA ? (apparatoPMaps.da.get(appDA) || { total: 0, pCount: 0, status: "RED" }) : null;
                  const statA = appA ? (apparatoPMaps.a.get(appA) || { total: 0, pCount: 0, status: "RED" }) : null;

                  const hist = hasHistory(r);

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-900/80 cursor-pointer"
                      onClick={() => setSelectedCable(r)}
                    >
                      <td className="px-3 py-2">
                        <CodicePill value={r.codice as any} dotColor={colorForSituazione(situ)} />
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <span
                            className={
                              "mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
                              (hist
                                ? "border-slate-700 bg-slate-950/60 text-slate-200"
                                : "border-slate-800 bg-slate-950/40 text-slate-500")
                            }
                            title={hist ? t("inca.badges.hist") : t("inca.badges.noHist")}
                          >
                            {hist ? t("inca.badges.hist") : t("inca.badges.noHist")}
                          </span>
                          {renderHistoryCell(r)}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <ApparatoPill
                            side="DA"
                            value={appDA || "—"}
                            stats={statDA}
                            disabled={!appDA}
                            onClick={(e: any) => openApparatoPopover(e, "DA", appDA)}
                          />
                          <span className="hidden md:inline text-slate-600" aria-hidden="true">
                            →
                          </span>
                          <ApparatoPill
                            side="A"
                            value={appA || "—"}
                            stats={statA}
                            disabled={!appA}
                            onClick={(e: any) => openApparatoPopover(e, "A", appA)}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-300">{tipoCavoLabel(r)}</td>

                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[11px]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForSituazione(situ) }} />
                          <span className="text-slate-200 font-semibold">{situ}</span>
                        </span>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-200 text-right">
                        {formatMeters(locale, r.metri_teo || r.metri_dis)}
                      </td>
                    </tr>
                  );
                })}

                {filteredCavi.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-[12px] text-slate-500">
                      {t("inca.capo.table.empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details panel */}
      {selectedCable ? (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wide">{t("inca.capo.details.title")}</div>
              <div className="text-lg font-semibold text-slate-50">{norm(selectedCable.codice) || "—"}</div>
              <div className="text-[12px] text-slate-400">{norm(selectedCable.descrizione) || "—"}</div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCable(null)}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
            >
              {t("inca.capo.actions.close")}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">{t("inca.capo.details.lastPosa")}</div>
              <div className="text-[13px] text-slate-100 font-semibold">
                {hasHistory(selectedCable)
                  ? (formatDate(locale, selectedCable.data_posa) || t("inca.history.capoOnlySubtitle"))
                  : t("inca.history.noneTitle")}
              </div>
              {norm(selectedCable.capo_label) ? (
                <div className="text-[12px] text-slate-400">
                  <span className="text-slate-500">{t("inca.history.capoLabel")}</span> {norm(selectedCable.capo_label)}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">{t("inca.capo.details.meters")}</div>
              <div className="text-[13px] text-slate-100 font-semibold">
                {formatMeters(locale, selectedCable.metri_teo || selectedCable.metri_dis)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">{t("inca.capo.details.type")}</div>
              <div className="text-[13px] text-slate-100 font-semibold">{tipoCavoLabel(selectedCable)}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Chart modal */}
      {isDistribModalOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 backdrop-blur-md p-2"
          role="dialog"
          aria-modal="true"
          aria-label={t("inca.capo.modal.aria")}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsDistribModalOpen(false);
          }}
        >
          <div className="w-[min(98vw,1400px)] h-[92vh] overflow-auto rounded-2xl border border-slate-700 bg-slate-950/80 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-950/75 px-4 py-3 backdrop-blur">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">{t("inca.capo.modal.kicker")}</div>
                <div className="text-lg font-semibold text-slate-50 leading-tight">{t("inca.capo.modal.title")}</div>
                <div className="text-[12px] text-slate-400 mt-1">
                  {t("inca.capo.modal.total")}: <span className="text-slate-100 font-semibold">{totalCavi}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDistribModalOpen(false)}
                className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-[12px] text-slate-200"
              >
                {t("inca.capo.actions.close")}
              </button>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3">
                <div className="h-[520px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distrib}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="code" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(2,6,23,0.92)",
                          border: "1px solid rgba(51,65,85,0.8)",
                          borderRadius: 12,
                          color: "#e2e8f0",
                          fontSize: 13,
                        }}
                        formatter={(value: any) => [`${value}`, t("inca.capo.overview.tooltipCables")]}
                        labelFormatter={(label: any) => t(`inca.situazioni.${label}`)}
                      />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                        {distrib.map((d) => (
                          <Cell key={d.code} fill={colorForSituazione(d.code)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Apparato popover */}
      <ApparatoCaviPopover
        open={apparatoPopoverOpen}
        side={apparatoPopoverSide}
        apparatoName={apparatoPopoverName}
        anchorRect={apparatoAnchorRect}
        onClose={() => setApparatoPopoverOpen(false)}
        onSelect={(name) => {
          // quickest UX: selecting an apparato injects into the search box
          setQuery(name);
        }}
        maps={apparatoPMaps as any}
      />
    </div>
  );
}
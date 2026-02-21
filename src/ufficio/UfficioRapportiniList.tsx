// src/ufficio/UfficioRapportiniList.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  VALIDATED_CAPO: "In verifica",
  APPROVED_UFFICIO: "Archiviato",
  RETURNED: "Rimandato",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: "badge-neutral",
  VALIDATED_CAPO: "badge-warning",
  APPROVED_UFFICIO: "badge-success",
  RETURNED: "badge-danger",
};

// Priorità lavoro (front-only)
const STATUS_RANK: Record<string, number> = {
  RETURNED: 0,
  VALIDATED_CAPO: 1,
  APPROVED_UFFICIO: 2,
  DRAFT: 3,
};

function formatDate(value: any): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
}

function toDateValue(row: any): number {
  const v = row?.report_date;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatNumberIt(v: any, maxFrac = 2): string {
  const n = safeNum(v);
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFrac }).format(n);
}

function normalizeKey(s: any): string {
  return (s ?? "").toString().trim().toUpperCase();
}

/**
 * KPI rule (naval-grade):
 * - For ELETTRICISTA, KPI production excludes informational lines.
 * - Only STESURA + RIPRESA are KPI; FASCETTATURA (and others) must not enter KPI totals.
 * - For non-ELETTRICISTA roles, keep legacy behavior (all lines).
 */
function isElectricistaRole(crewRole: any): boolean {
  return String(crewRole || "").trim().toUpperCase() === "ELETTRICISTA";
}

function isKpiDescrizione(descrizione: any): boolean {
  const d = normalizeKey(descrizione);
  if (!d || d === "—") return false;
  if (d === "STESURA") return true;
  if (d === "RIPRESA CAVI") return true;
  // tolerant legacy
  if (d.startsWith("RIPRESA")) return true;
  return false;
}

function isSuperseded(row: any): boolean {
  return !!row?.superseded_by_rapportino_id;
}

function isCorrection(row: any): boolean {
  return !!row?.supersedes_rapportino_id;
}

/**
 * Canonique métier:
 * - On n'affiche pas "Prodotto total" unique.
 * - On affiche "Produzioni" = breakdown par descrizione (count + top items).
 *
 * Naval-grade rectificatif/versionning:
 * - Par défaut: n'afficher que les rapports "attivi" (non supersedés)
 * - Toggle: afficher aussi l'historique (supersedés)
 * - Badges: SOSTITUITO / RETTIFICA
 */
export default function UfficioRapportiniList(): JSX.Element {
  const { profile, loading: authLoading } = useAuth();

  const [rapportini, setRapportini] = useState<any[]>([]);
  const [rowsAggByRap, setRowsAggByRap] = useState<Record<string, any>>({});
  // { [rapportino_id]: { descrizioniCount, top: [{descrizione, prodotto_sum}], sommaKpi, sommaAll, isKpiFiltered } }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [capoFilter, setCapoFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // NEW: show/hide historique (supersedés)
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      setError("Devi effettuare il login.");
      setLoading(false);
      return;
    }

    const appRole = profile?.app_role ?? "";
    if (!["UFFICIO", "DIREZIONE", "MANAGER", "ADMIN"].includes(appRole)) {
      setError("Non sei autorizzato ad accedere alla sezione Ufficio.");
      setLoading(false);
      return;
    }

    const fetchRapportini = async () => {
      setLoading(true);
      setError(null);

      /**
       * Canon sources (ordre de préférence):
       * - public.ufficio_rapportini_list_v1 (vue dédiée, contient aussi les champs de rettifica/versioning)
       * - public.rapportini_with_capo_v1 (vue canonique, enrichit capo_display_name)
       * - public.rapportini (legacy)
       */
      const candidates: Array<{ table: string; select: string }> = [
        {
          table: "ufficio_rapportini_list_v1",
          select: [
            "id",
            "report_date",
            "status",
            "capo_id",
            "crew_role",
            "commessa",
            "created_at",
            "updated_at",
            "supersedes_rapportino_id",
            "superseded_by_rapportino_id",
            "correction_reason",
            "correction_created_by",
            "correction_created_at",
            "capo_display_name",
          ].join(","),
        },
        {
          table: "rapportini_with_capo_v1",
          select: [
            "id",
            "report_date",
            "status",
            "capo_id",
            "capo_name",
            "crew_role",
            "commessa",
            "created_at",
            "updated_at",
            "capo_display_name",
          ].join(","),
        },
        {
          table: "rapportini",
          select: [
            "id",
            "report_date",
            "status",
            "capo_id",
            "capo_name",
            "crew_role",
            "commessa",
            "created_at",
            "updated_at",
          ].join(","),
        },
      ];

      let data: any[] | null = null;
      let err: any = null;
      let usedTable: string | null = null;

      for (const c of candidates) {
        const res = await supabase
          .from(c.table)
          .select(c.select)
          .order("report_date", { ascending: false })
          .limit(500);

        if (!res.error) {
          data = res.data;
          err = null;
          usedTable = c.table;
          break;
        }

        err = res.error;
      }

      if (err) {
        console.error("[UFFICIO LIST] Errore caricando i rapportini:", err);
        setError("Errore durante il caricamento dei rapportini.");
        setRapportini([]);
        setRowsAggByRap({});
        setLoading(false);
        return;
      }

      const list = (data || []).map((r) => {
        // Normalisation (legacy safety)
        const capoDisplay = r?.capo_display_name ?? r?.capo_name ?? null;
        return { ...r, capo_display_name: capoDisplay };
      });

      if (usedTable !== "ufficio_rapportini_list_v1") {
        console.info("[UFFICIO LIST] Loaded from:", usedTable);
      }

      setRapportini(list);

      const crewRoleByRapId = new Map<string, string>();
      (list || []).forEach((r) => {
        if (r?.id) crewRoleByRapId.set(String(r.id), r?.crew_role || "");
      });

      // Aggregazione descrizione/prodotto per tutti gli IDs (1 query)
      const ids = list.map((r) => r.id).filter(Boolean);

      if (!ids.length) {
        setRowsAggByRap({});
        setLoading(false);
        return;
      }

      const { data: aggRows, error: aggErr } = await supabase
        .from("rapportino_rows")
        .select("rapportino_id, descrizione, prodotto")
        .in("rapportino_id", ids);

      if (aggErr) {
        console.warn("[UFFICIO LIST] Impossibile caricare breakdown righe:", aggErr);
        setRowsAggByRap({});
        setLoading(false);
        return;
      }

      // Build aggregate (KPI-aware for electricians)
      const map = new Map<string, any>(); // rid -> { descrMapKpi, descrMapAll, sommaKpi, sommaAll, isKpiFiltered }
      (aggRows || []).forEach((r: any) => {
        const rid = r?.rapportino_id;
        if (!rid) return;

        const rapCrewRole = crewRoleByRapId.get(String(rid)) || "";
        const kpiFiltered = isElectricistaRole(rapCrewRole);

        const obj =
          map.get(String(rid)) ||
          {
            descrMapKpi: new Map<string, number>(),
            descrMapAll: new Map<string, number>(),
            sommaKpi: 0,
            sommaAll: 0,
            isKpiFiltered: kpiFiltered,
          };

        const key = (r?.descrizione ?? "—").toString().trim() || "—";

        // Secondary: full sum (audit/informative)
        obj.descrMapAll.set(key, (obj.descrMapAll.get(key) || 0) + safeNum(r?.prodotto));
        obj.sommaAll += safeNum(r?.prodotto);

        // Primary KPI sum for electricians only
        const isKpi = !kpiFiltered || isKpiDescrizione(key);
        if (isKpi) {
          obj.descrMapKpi.set(key, (obj.descrMapKpi.get(key) || 0) + safeNum(r?.prodotto));
          obj.sommaKpi += safeNum(r?.prodotto);
        }

        map.set(String(rid), obj);
      });

      const out: Record<string, any> = {};
      map.forEach((v, rid) => {
        // Prefer KPI map for electricians, otherwise full map.
        const activeMap: Map<string, number> = v.isKpiFiltered ? v.descrMapKpi : v.descrMapAll;
        const items = Array.from(activeMap.entries()).map(([descrizione, prodotto_sum]) => ({ descrizione, prodotto_sum }));
        items.sort((a, b) => b.prodotto_sum - a.prodotto_sum);

        out[rid] = {
          descrizioniCount: items.length,
          top: items.slice(0, 2),
          sommaKpi: v.sommaKpi,
          sommaAll: v.sommaAll,
          isKpiFiltered: v.isKpiFiltered,
        };
      });

      setRowsAggByRap(out);
      setLoading(false);
    };

    fetchRapportini();
  }, [authLoading, profile]);

  const filteredRapportini = useMemo(() => {
    const q = capoFilter.trim().toLowerCase();

    return (rapportini || []).filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (roleFilter !== "ALL" && r.crew_role !== roleFilter) return false;

      if (!showHistory && isSuperseded(r)) return false;

      if (q) {
        const searchable = String(r?.capo_display_name || "").toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [rapportini, statusFilter, capoFilter, roleFilter, showHistory]);

  const sortedRapportini = useMemo(() => {
    const rows = [...(filteredRapportini || [])];
    rows.sort((a: any, b: any) => {
      const ra = STATUS_RANK[a.status] ?? 99;
      const rb = STATUS_RANK[b.status] ?? 99;
      if (ra !== rb) return ra - rb;

      const da = toDateValue(a);
      const db = toDateValue(b);
      return db - da;
    });
    return rows;
  }, [filteredRapportini]);

  if (authLoading || loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-slate-400">Caricamento rapportini Ufficio…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col text-xs min-w-[160px]">
          <label className="mb-1 font-medium theme-text-muted">Stato</label>
          <select
            className="rounded-md px-2 py-1 text-xs theme-input focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tutti</option>
            <option value="RETURNED">Rimandati</option>
            <option value="VALIDATED_CAPO">In verifica</option>
            <option value="APPROVED_UFFICIO">Archiviati</option>
            <option value="DRAFT">Bozze</option>
          </select>
        </div>

        <div className="flex flex-col text-xs min-w-[180px]">
          <label className="mb-1 font-medium theme-text-muted">Ruolo</label>
          <select
            className="rounded-md px-2 py-1 text-xs theme-input focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Tutti</option>
            <option value="ELETTRICISTA">ELETTRICISTA</option>
            <option value="CARPENTIERE">CARPENTIERE</option>
            <option value="TUBISTA">TUBISTA</option>
            <option value="SALDATORE">SALDATORE</option>
          </select>
        </div>

        <div className="flex flex-col text-xs min-w-[180px]">
          <label className="mb-1 font-medium theme-text-muted">Storico</label>
          <div>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={[
                "px-3 py-1.5 rounded-md border text-xs font-medium transition",
                showHistory
                  ? "theme-border theme-text bg-[var(--panel2)] hover:bg-[var(--panel)]"
                  : "theme-border theme-text-muted bg-[var(--panel2)] hover:bg-[var(--panel)]",
              ].join(" ")}
              title={showHistory ? "Nascondi versioni storiche" : "Mostra versioni storiche (supersedute)"}
            >
              {showHistory ? "Storico: ON" : "Storico: OFF"}
            </button>
          </div>
        </div>

        <div className="flex flex-col text-xs min-w-[180px]">
          <label className="mb-1 font-medium theme-text-muted">Capo</label>
          <input
            type="text"
            placeholder="Nome…"
            className="rounded-md px-2 py-1 text-xs theme-input placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            value={capoFilter}
            onChange={(e) => setCapoFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl theme-table">
        <table className="min-w-full text-xs">
          <thead className="theme-table-head">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Data</th>
              <th className="px-3 py-2 text-left font-medium">Capo</th>
              <th className="px-3 py-2 text-left font-medium">Squadra</th>
              <th className="px-3 py-2 text-left font-medium">Commessa</th>
              <th className="px-3 py-2 text-left font-medium">Produzioni</th>
              <th className="px-3 py-2 text-left font-medium">Stato</th>
              <th className="px-3 py-2 text-right font-medium">Apri</th>
            </tr>
          </thead>

          <tbody>
            {sortedRapportini.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-xs theme-text-muted">
                  Nessun risultato.
                </td>
              </tr>
            )}

            {sortedRapportini.map((r: any) => {
              const statusLabel = STATUS_LABELS[r.status] || r.status;
              const badgeClass = STATUS_BADGE_CLASS[r.status] || "bg-slate-700/80 text-slate-200";

              const capoResolved = r?.capo_display_name ?? (r?.capo_id ? "Profil mancante" : "—");
              const isArchived = r.status === "APPROVED_UFFICIO";

              const superseded = isSuperseded(r);
              const correction = isCorrection(r);

              const agg = rowsAggByRap[r.id] || null;
              const descrCount = agg?.descrizioniCount ?? 0;
              const top = agg?.top ?? [];
              const sommaKpi = agg?.sommaKpi ?? 0;
              const sommaAll = agg?.sommaAll ?? 0;
              const isKpiFiltered = !!agg?.isKpiFiltered;

              const topLine = top.length
                ? top
                    .map((x: any) => {
                      const label = normalizeKey(x.descrizione);
                      const v = formatNumberIt(x.prodotto_sum);
                      return `${label} ${v}`;
                    })
                    .join(" · ")
                : "—";

              const moreCount = Math.max(0, descrCount - top.length);
              const rowTone = superseded ? "opacity-50" : isArchived ? "opacity-70" : "hover:bg-[var(--panel2)]";

              return (
                <tr
                  key={r.id}
                  className={["border-b theme-border transition-colors", rowTone].join(" ")}
                  title={superseded ? "Versione superseduta (sostituita da rettifica)" : ""}
                >
                  <td className="px-3 py-2 whitespace-nowrap theme-text">{formatDate(r.report_date)}</td>

                  <td className="px-3 py-2 whitespace-nowrap theme-text">
                    <div className="flex items-center gap-2">
                      <span>{capoResolved}</span>

                      {correction && (
                        <span className="px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.14em] badge-info">
                          RETTIFICA
                        </span>
                      )}

                      {superseded && (
                        <span className="px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.14em] badge-neutral">
                          SOSTITUITO
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap theme-text">{r.crew_role || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap theme-text">{r.commessa || "—"}</td>

                  <td className="px-3 py-2 theme-text">
                    <div className="flex flex-col">
                      <div className="theme-text">
                        <span className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full border text-[11px] uppercase tracking-[0.12em] badge-neutral">
                            {descrCount || 0} descr.
                          </span>
                          <span className="text-[11px] theme-text-muted">
                            somma KPI: <span className="theme-text">{formatNumberIt(sommaKpi)}</span>
                          </span>
                          <span className="text-[11px] theme-text-muted">somma righe: {formatNumberIt(sommaAll)}</span>
                        </span>
                      </div>

                      <div className="mt-1 text-[11px] theme-text-muted">
                        {topLine}
                        {moreCount > 0 ? <span className="theme-text-muted"> · +{moreCount}</span> : null}
                      </div>

                      <div className="mt-1 text-[10px] theme-text-muted">
                        {isKpiFiltered
                          ? "ELETTRICISTA: KPI = STESURA + RIPRESA (FASCETTATURA esclusa)."
                          : "Produzione mostrata per descrizione (no KPI totale unico)."}
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={[
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-[0.14em] font-medium",
                        badgeClass,
                      ].join(" ")}
                    >
                      {statusLabel}
                      {isArchived && (
                        <span className="ml-1.5 text-[10px] tracking-[0.14em]">· BLOCCATO</span>
                      )}
                    </span>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <Link
                      to={`/ufficio/rapportini/${r.id}`}
                      className="text-xs text-[color:var(--accent-ink)] hover:text-[color:var(--accent)] hover:underline"
                    >
                      Apri
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11px] theme-text-muted">
        {showHistory ? (
          <span>Stai visualizzando anche versioni storiche (supersedute).</span>
        ) : (
          <span>Per default sono visibili solo le versioni attive (non supersedute).</span>
        )}
      </div>
    </div>
  );
}

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
  DRAFT: "bg-slate-700/80 text-slate-200",
  VALIDATED_CAPO: "bg-amber-500/15 text-amber-200 border border-amber-400/60",
  APPROVED_UFFICIO: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/60",
  RETURNED: "bg-rose-500/15 text-rose-200 border border-rose-400/60",
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

    if (!["UFFICIO", "DIREZIONE", "MANAGER", "ADMIN"].includes(profile.app_role)) {
      setError("Non sei autorizzato ad accedere alla sezione Ufficio.");
      setLoading(false);
      return;
    }

    const fetchRapportini = async () => {
      setLoading(true);
      setError(null);

      const baseSelect = [
        "id",
        "report_date",
        "capo_id",
        "capo_display_name",
        "crew_role",
        "costr",
        "commessa",
        "status",
        "created_at",
        "updated_at",
        // versioning (defensive)
        "supersedes_rapportino_id",
        "superseded_by_rapportino_id",
      ].join(",");

      async function runQuery(selectStr: string) {
        return await supabase
          .from("rapportini")
          .select(selectStr)
          .order("report_date", { ascending: false })
          .limit(500);
      }

      let data: any[] | null = null;
      let err: any = null;

      const r1 = await runQuery(baseSelect);
      data = r1.data;
      err = r1.error;

      // Fallback si colonnes versioning pas encore présentes
      if (err) {
        const minimalSelect = [
          "id",
          "report_date",
          "capo_id",
          "capo_display_name",
          "crew_role",
          "costr",
          "commessa",
          "status",
          "created_at",
          "updated_at",
        ].join(",");

        const r2 = await runQuery(minimalSelect);
        data = r2.data;
        err = r2.error;
      }

      if (err) {
        console.error("[UFFICIO LIST] Errore caricando i rapportini:", err);
        setError("Errore durante il caricamento dei rapportini.");
        setRapportini([]);
        setRowsAggByRap({});
        setLoading(false);
        return;
      }

      const list = data || [];
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
          <label className="mb-1 font-medium text-slate-300">Stato</label>
          <select
            className="border border-slate-700 rounded-md px-2 py-1 text-xs bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
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
          <label className="mb-1 font-medium text-slate-300">Ruolo</label>
          <select
            className="border border-slate-700 rounded-md px-2 py-1 text-xs bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
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
          <label className="mb-1 font-medium text-slate-300">Storico</label>
          <div>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={[
                "px-3 py-1.5 rounded-md border text-xs font-medium transition",
                showHistory
                  ? "border-slate-600 text-slate-100 bg-slate-900/70 hover:bg-slate-900/90"
                  : "border-slate-800 text-slate-300 bg-slate-950/50 hover:bg-slate-900/70",
              ].join(" ")}
              title={showHistory ? "Nascondi versioni storiche" : "Mostra versioni storiche (supersedute)"}
            >
              {showHistory ? "Storico: ON" : "Storico: OFF"}
            </button>
          </div>
        </div>

        <div className="flex flex-col text-xs min-w-[180px]">
          <label className="mb-1 font-medium text-slate-300">Capo</label>
          <input
            type="text"
            placeholder="Nome…"
            className="border border-slate-700 rounded-md px-2 py-1 text-xs bg-slate-900/70 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            value={capoFilter}
            onChange={(e) => setCapoFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-[0_0_0_1px_rgba(15,23,42,0.7)]">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Data</th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Capo</th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Squadra</th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Commessa</th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Produzioni</th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Stato</th>
              <th className="px-3 py-2 text-right font-medium text-slate-300">Apri</th>
            </tr>
          </thead>

          <tbody>
            {sortedRapportini.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-500">
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
              const rowTone = superseded ? "opacity-50" : isArchived ? "opacity-70" : "hover:bg-slate-900/80";

              return (
                <tr
                  key={r.id}
                  className={["border-b border-slate-800 transition-colors", rowTone].join(" ")}
                  title={superseded ? "Versione superseduta (sostituita da rettifica)" : ""}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">{formatDate(r.report_date)}</td>

                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                    <div className="flex items-center gap-2">
                      <span>{capoResolved}</span>

                      {correction && (
                        <span className="px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-950/30 text-[10px] uppercase tracking-[0.14em] text-sky-200">
                          RETTIFICA
                        </span>
                      )}

                      {superseded && (
                        <span className="px-2 py-0.5 rounded-full border border-slate-600 bg-slate-900/60 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                          SOSTITUITO
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">{r.crew_role || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-100">{r.commessa || "—"}</td>

                  <td className="px-3 py-2 text-slate-100">
                    <div className="flex flex-col">
                      <div className="text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full border border-slate-700 bg-slate-950/70 text-[11px] uppercase tracking-[0.12em] text-slate-300">
                            {descrCount || 0} descr.
                          </span>
                          <span className="text-[11px] text-slate-300">
                            somma KPI: <span className="text-slate-100">{formatNumberIt(sommaKpi)}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">somma righe: {formatNumberIt(sommaAll)}</span>
                        </span>
                      </div>

                      <div className="mt-1 text-[11px] text-slate-300">
                        {topLine}
                        {moreCount > 0 ? <span className="text-slate-500"> · +{moreCount}</span> : null}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
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
                        <span className="ml-1.5 text-[10px] tracking-[0.14em] text-emerald-200/90">· BLOCCATO</span>
                      )}
                    </span>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <Link to={`/ufficio/rapportini/${r.id}`} className="text-xs text-sky-300 hover:text-sky-200 hover:underline">
                      Apri
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11px] text-slate-500">
        {showHistory ? (
          <span>Stai visualizzando anche versioni storiche (supersedute).</span>
        ) : (
          <span>Per default sono visibili solo le versioni attive (non supersedute).</span>
        )}
      </div>
    </div>
  );
}

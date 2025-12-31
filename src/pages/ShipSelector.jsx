// /src/pages/ShipSelector.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import { supabase } from "../lib/supabaseClient";
import { useShip } from "../context/ShipContext";
import { corePills } from "../ui/designSystem";
import { useI18n } from "../i18n/I18nProvider";

/* -----------------------------
   Utils dates / numbers
----------------------------- */
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function localeFromLang(lang) {
  if (lang === "fr") return "fr-FR";
  if (lang === "en") return "en-GB";
  return "it-IT";
}

function formatDateByLang(dateISO, lang) {
  if (!dateISO) return "—";
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(localeFromLang(lang));
}

function safeNum(x) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : 0;
}

function roundInt(n) {
  return Math.round(safeNum(n));
}

/* -----------------------------
   Donut INCA
----------------------------- */
function IncaDonut({ summary, loading, cablesLabel, loadingLabel, notAvailableLabel }) {
  if (loading) {
    return (
      <div className="h-[88px] w-[88px] rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-[11px] text-slate-400">
        {loadingLabel}
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <div className="h-[88px] w-[88px] rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center text-[10px] text-slate-400">
        <span>INCA</span>
        <span className="text-slate-500">{notAvailableLabel}</span>
      </div>
    );
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: ({ name, value }) => `${name}: ${value}`,
    },
    series: [
      {
        type: "pie",
        radius: ["62%", "82%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: [
          { name: "P", value: summary.p, itemStyle: { color: "#34d399" } },
          { name: "T", value: summary.t, itemStyle: { color: "#38bdf8" } },
          { name: "B", value: summary.b, itemStyle: { color: "#f59e0b" } },
          { name: "NP", value: summary.np, itemStyle: { color: "#64748b" } },
        ].filter((d) => d.value > 0),
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "center",
        style: {
          text: String(summary.total),
          fill: "#e5e7eb",
          fontSize: 14,
          fontWeight: 700,
        },
      },
      {
        type: "text",
        left: "center",
        top: "56%",
        style: {
          text: cablesLabel,
          fill: "#94a3b8",
          fontSize: 10,
        },
      },
    ],
  };

  return (
    <div className="h-[88px] w-[88px]">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
    </div>
  );
}

/* -----------------------------
   Normalisation row (si fallback view)
----------------------------- */
function normalizeShipRow(r) {
  if (!r || typeof r !== "object") return null;

  const id = r.id ?? r.ship_id ?? r.ship_uuid ?? null;
  const code = r.code ?? r.ship_code ?? r.costr ?? r.costr_code ?? null;
  const name = r.name ?? r.ship_name ?? r.nome ?? (code ? `COSTR ${code}` : null);
  const yard = r.yard ?? r.cantiere ?? r.site ?? r.location ?? null;

  if (!id || !code) return null;

  return {
    id: String(id),
    code: String(code),
    name: String(name || code),
    yard: yard ? String(yard) : null,
  };
}

/* -----------------------------
   Page
----------------------------- */
export default function ShipSelector() {
  const navigate = useNavigate();
  const { currentShip, setCurrentShip } = useShip();
  const { lang, t } = useI18n();

  const [ships, setShips] = useState([]);
  const [incaByCostr, setIncaByCostr] = useState({});
  const [etaByCostr, setEtaByCostr] = useState({});
  const [loadingShips, setLoadingShips] = useState(true);
  const [loadingInca, setLoadingInca] = useState(true);
  const [loadingEta, setLoadingEta] = useState(true);
  const [error, setError] = useState("");

  const todayISO = useMemo(() => toISODate(new Date()), []);

  /* -----------------------------
     Load ships (source of truth = RPC)
     1) RPC capo_my_ships_v1()
     2) Fallback view capo_my_team_v1 (best-effort)
  ----------------------------- */
  useEffect(() => {
    let alive = true;

    async function loadShips() {
      setLoadingShips(true);
      setError("");

      // 1) RPC
      try {
        const { data, error: rpcErr } = await supabase.rpc("capo_my_ships_v1");
        if (rpcErr) throw rpcErr;

        const rows = Array.isArray(data) ? data : [];
        if (alive) {
          setShips(rows);
          setLoadingShips(false);
        }
        console.info(`[ShipSelector] ships source=rpc.capo_my_ships_v1 count=${rows.length}`);
        return;
      } catch (e) {
        console.warn("[ShipSelector] RPC capo_my_ships_v1 failed:", String(e?.message || e || ""));
      }

      // 2) Fallback view
      try {
        const { data, error: qErr } = await supabase.from("capo_my_team_v1").select("*");
        if (qErr) throw qErr;

        const rows = (Array.isArray(data) ? data : []).map(normalizeShipRow).filter(Boolean);

        if (alive) {
          setShips(rows);
          setLoadingShips(false);
        }
        console.info(`[ShipSelector] ships source=capo_my_team_v1 count=${rows.length}`);
      } catch (e) {
        console.error("[ShipSelector] fallback view capo_my_team_v1 failed:", e);
        if (alive) {
          setShips([]);
          setError(t("CAPO_SHIP_DB_ERROR"));
          setLoadingShips(false);
        }
      }
    }

    loadShips();
    return () => {
      alive = false;
    };
  }, [t]);

  /* -----------------------------
     INCA donut summary via EXACT COUNTS
     (same logic as your working file)
  ----------------------------- */
  useEffect(() => {
    if (!ships.length) {
      setLoadingInca(false);
      return;
    }

    let alive = true;

    async function loadCounts() {
      setLoadingInca(true);

      try {
        const tasks = ships.map(async (ship) => {
          const costr = ship.code;

          const qTotal = supabase
            .from("inca_cavi")
            .select("id", { count: "exact", head: true })
            .eq("costr", costr);

          const qP = supabase
            .from("inca_cavi")
            .select("id", { count: "exact", head: true })
            .eq("costr", costr)
            .eq("situazione", "P");

          const qT = supabase
            .from("inca_cavi")
            .select("id", { count: "exact", head: true })
            .eq("costr", costr)
            .eq("situazione", "T");

          const qB = supabase
            .from("inca_cavi")
            .select("id", { count: "exact", head: true })
            .eq("costr", costr)
            .eq("situazione", "B");

          const qNP = supabase
            .from("inca_cavi")
            .select("id", { count: "exact", head: true })
            .eq("costr", costr)
            .is("situazione", null);

          const [rTotal, rP, rT, rB, rNP] = await Promise.all([qTotal, qP, qT, qB, qNP]);

          if (rTotal.error) {
            console.warn("[ShipSelector] INCA count error for", costr, rTotal.error);
            return [costr, null];
          }

          const total = safeNum(rTotal.count);
          const p = safeNum(rP.count);
          const tCount = safeNum(rT.count);
          const b = safeNum(rB.count);
          const np = safeNum(rNP.count);

          return [costr, { total, p, t: tCount, b, np }];
        });

        const pairs = await Promise.all(tasks);
        const map = {};
        for (const [costr, summary] of pairs) {
          if (summary) map[costr] = summary;
        }

        if (alive) setIncaByCostr(map);
      } catch (e) {
        console.error("[ShipSelector] load INCA counts error:", e);
      } finally {
        if (alive) setLoadingInca(false);
      }
    }

    loadCounts();
    return () => {
      alive = false;
    };
  }, [ships]);

  /* -----------------------------
     ETA estimate (same logic as your working file)
  ----------------------------- */
  useEffect(() => {
    if (!ships.length) {
      setLoadingEta(false);
      return;
    }

    let alive = true;

    async function loadEta() {
      setLoadingEta(true);

      try {
        const fromISO = addDaysISO(todayISO, -6);

        const tasks = ships.map(async (ship) => {
          const costr = ship.code;

          const totalRes = await supabase
            .from("inca_cavi")
            .select("metri_teo.sum()")
            .eq("costr", costr)
            .maybeSingle();

          if (totalRes.error) {
            console.warn("[ShipSelector] total_m error for", costr, totalRes.error);
            return [costr, null];
          }

          const total_m = safeNum(totalRes.data?.sum ?? totalRes.data?.["metri_teo.sum"] ?? 0);

          const doneRes = await supabase
            .from("rapportino_inca_cavi")
            .select("metri_posati.sum()")
            .eq("costr_cache", costr)
            .maybeSingle();

          if (doneRes.error) {
            console.warn("[ShipSelector] done_m error for", costr, doneRes.error);
            return [
              costr,
              { total_m, done_m: 0, rem_m: total_m, rate_m_per_day: 0, eta_days: null, deadline_est: null },
            ];
          }

          const done_m = safeNum(doneRes.data?.sum ?? doneRes.data?.["metri_posati.sum"] ?? 0);

          const last7RowsRes = await supabase
            .from("rapportino_inca_cavi")
            .select("report_date_cache, metri_posati")
            .eq("costr_cache", costr)
            .gte("report_date_cache", fromISO);

          if (last7RowsRes.error) {
            console.warn("[ShipSelector] last7 rows error for", costr, last7RowsRes.error);
            const rem_m = Math.max(total_m - done_m, 0);
            return [costr, { total_m, done_m, rem_m, rate_m_per_day: 0, eta_days: null, deadline_est: null }];
          }

          const rows = Array.isArray(last7RowsRes.data) ? last7RowsRes.data : [];

          let last7_m = 0;
          const days = new Set();
          for (const r of rows) {
            const m = safeNum(r.metri_posati);
            if (m > 0 && r.report_date_cache) {
              last7_m += m;
              days.add(r.report_date_cache);
            }
          }

          const workingDays = days.size;
          const rate_m_per_day = workingDays > 0 ? last7_m / workingDays : 0;

          const rem_m = Math.max(total_m - done_m, 0);

          if (rate_m_per_day <= 0 || rem_m <= 0 || total_m <= 0) {
            return [
              costr,
              {
                total_m,
                done_m,
                rem_m,
                rate_m_per_day,
                eta_days: rem_m <= 0 && total_m > 0 ? 0 : null,
                deadline_est: rem_m <= 0 && total_m > 0 ? todayISO : null,
              },
            ];
          }

          const eta_days = Math.ceil(rem_m / rate_m_per_day);
          const deadline_est = addDaysISO(todayISO, eta_days);

          return [costr, { total_m, done_m, rem_m, rate_m_per_day, eta_days, deadline_est }];
        });

        const pairs = await Promise.all(tasks);
        const map = {};
        for (const [costr, eta] of pairs) {
          if (eta) map[costr] = eta;
        }
        if (alive) setEtaByCostr(map);
      } catch (e) {
        console.error("[ShipSelector] load ETA error:", e);
      } finally {
        if (alive) setLoadingEta(false);
      }
    }

    loadEta();
    return () => {
      alive = false;
    };
  }, [ships, todayISO]);

  const handleSelectShip = (ship) => {
    setCurrentShip(ship);
    navigate(`/app/ship/${ship.id}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-1 mb-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {t("CAPO_SHIP_KICKER")}
        </span>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
          {t("CAPO_SHIP_TITLE")}
        </h1>

        <p className="text-sm text-slate-400 max-w-2xl">
          {t("CAPO_SHIP_DESC")}
        </p>

        {currentShip && ships.some((s) => String(s.id) === String(currentShip.id)) && (
          <div className="mt-1 text-xs text-slate-500">
            {t("CAPO_SHIP_CURRENT")}{" "}
            <span className="font-semibold text-slate-200">
              {currentShip.code} · {currentShip.name}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-100 px-3 py-2">
          {error}
        </div>
      )}

      {!loadingShips && ships.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          {t("CAPO_SHIP_NONE_ASSIGNED")}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loadingShips
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 h-[170px]" />
            ))
          : ships.map((ship) => {
              const summary = incaByCostr[ship.code];
              const eta = etaByCostr[ship.code];
              const incaConnected = !!summary && summary.total > 0;

              const deadlineText = eta?.deadline_est ? formatDateByLang(eta.deadline_est, lang) : "—";
              const rateText = eta && eta.rate_m_per_day > 0 ? `${roundInt(eta.rate_m_per_day)} m/g` : null;
              const remText = eta && eta.total_m > 0 ? `${roundInt(eta.rem_m)} m` : null;

              return (
                <button
                  key={ship.id}
                  type="button"
                  aria-label={`${t("CAPO_SHIP_ARIA_SELECT")} ${ship.code}`}
                  onClick={() => handleSelectShip(ship)}
                  className={[
                    "group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all",
                    "bg-slate-950/70 border-slate-800 hover:border-sky-500/70 hover:bg-slate-900/80",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-sky-300 mb-1">
                        {t("CAPO_SHIP_LABEL_SHIP")} {ship.code}
                      </div>

                      <div className="text-lg font-semibold text-slate-50 truncate">{ship.name}</div>

                      <div className="text-xs text-slate-400">
                        {t("CAPO_SHIP_YARD")}{" "}
                        <span className="text-slate-200">{ship.yard ?? "—"}</span>
                      </div>

                      <div className="mt-2">
                        <span
                          className={corePills(true, incaConnected ? "emerald" : "neutral", "text-[10px] px-2 py-0.5")}
                          title={incaConnected ? t("CAPO_SHIP_INCA_TOOLTIP_CONNECTED") : t("CAPO_SHIP_INCA_TOOLTIP_MISSING")}
                        >
                          {incaConnected ? t("CAPO_SHIP_INCA_CONNECTED") : t("CAPO_SHIP_INCA_NOT_AVAILABLE")}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500">
                        {t("CAPO_SHIP_DEADLINE_EST")}{" "}
                        <span className="text-slate-300">{deadlineText}</span>
                      </div>

                      <div className="mt-1 text-[11px] text-slate-600">
                        {loadingEta ? (
                          <span>{t("CAPO_SHIP_PROD_CALC")}</span>
                        ) : eta && eta.total_m > 0 ? (
                          <span className="text-slate-500">
                            {t("CAPO_SHIP_METERS_REMAIN")} {remText ?? "—"}
                            <span className="text-slate-700"> · </span>
                            <span className="text-slate-500">
                              {t("CAPO_SHIP_DELTA_7D")} {rateText ?? "—"}
                            </span>
                          </span>
                        ) : (
                          <span>{t("CAPO_SHIP_PROD_NOT_AVAILABLE")}</span>
                        )}
                      </div>
                    </div>

                    <IncaDonut
                      summary={summary}
                      loading={loadingInca}
                      cablesLabel={t("CAPO_SHIP_CABLES_LABEL")}
                      loadingLabel={t("CAPO_SHIP_INCA_LOADING")}
                      notAvailableLabel={t("CAPO_SHIP_INCA_NOT_AVAILABLE")}
                    />
                  </div>
                </button>
              );
            })}
      </div>
    </div>
  );
}

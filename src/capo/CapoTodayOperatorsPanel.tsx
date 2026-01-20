// /src/capo/CapoTodayOperatorsPanel.tsx
// Capo - Today operators panel (drag source)
// UX upgrade (no regression): visual intelligence for "present in report" + worked hours.
// Reads a lightweight summary written by RapportinoPage in localStorage.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n/I18nProvider";
import { formatHumanName } from "../utils/formatHuman";

type Mode = "expanded" | "collapsed";

type TeamItem = {
  id: string | null;
  name: string;
  position: number | null;
  raw: unknown;
};

type Props = {
  mode?: Mode;
  onOperatorDragStart?: (it: { id: string | null; name: string }) => void;
};

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function isValidIsoDateParam(v: unknown): boolean {
  const s = String(v || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [yy, mm, dd] = s.split("-").map((x) => Number(x));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  return dt.getUTCFullYear() === yy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd;
}

function getDateFromSearch(search: string): string | null {
  try {
    const sp = new URLSearchParams(String(search || ""));
    const d = sp.get("date");
    if (isValidIsoDateParam(d)) return String(d);
    return null;
  } catch {
    return null;
  }
}

function getTodayISO(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function guessOperatorName(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const r: any = row;
  const candidates: Array<string | null | undefined> = [
    r.operator_display_name,
    r.operator_name,
    r.display_name,
    r.full_name,
    r.name,
    r.operator,
    r.nome,
    r.cognome ? `${r.nome} ${r.cognome}` : null,
  ];
  const raw = candidates.filter(Boolean)[0] ? String(candidates.filter(Boolean)[0]) : "";
  return raw.trim();
}

function guessOperatorId(row: unknown): string | null {
  if (!row || typeof row !== "object") return null;
  const r: any = row;
  const candidates = [r.operator_id, r.id, r.operator_uuid, r.member_id].filter(Boolean);
  const v = candidates[0] || null;
  return v == null ? null : String(v);
}

function guessOperatorPosition(row: unknown): number | null {
  if (!row || typeof row !== "object") return null;
  const r: any = row;
  const candidates = [r.operator_position, r.position, r.pos].filter((v: any) => v !== undefined && v !== null);
  const v = candidates.length ? candidates[0] : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pillBase(isSelected: boolean): string {
  return [
    "w-full rounded-xl border px-3 py-2",
    "text-[12px] font-semibold",
    "border-slate-800 bg-slate-950/40 text-slate-100 hover:bg-slate-900/35",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    "cursor-grab active:cursor-grabbing",
    "select-none",
    isSelected ? "ring-2 ring-sky-500/30" : "",
  ].join(" ");
}

function readHoursSummary(shipId: string | null, reportDate: string): Record<string, number> {
  if (!shipId) return {};
  const key = `core-rapportino-hours::${shipId}::${reportDate}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    const by = obj?.byOperatorId;
    if (!by || typeof by !== "object") return {};
    const out: Record<string, number> = {};
    Object.keys(by).forEach((k) => {
      const n = Number((by as any)[k]);
      if (Number.isFinite(n) && n >= 0) out[String(k)] = n;
    });
    return out;
  } catch {
    return {};
  }
}

function readPlannedHours(shipId: string | null, reportDate: string): Record<string, number> {
  if (!shipId) return {};
  const key = `core-rapportino-planned-hours::${shipId}::${reportDate}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    const by = obj?.byOperatorId;
    if (!by || typeof by !== "object") return {};
    const out: Record<string, number> = {};
    Object.keys(by).forEach((k) => {
      const n = Number((by as any)[k]);
      if (Number.isFinite(n) && n > 0) out[String(k)] = Math.round(n * 10) / 10;
    });
    return out;
  } catch {
    return {};
  }
}

function formatHoursBadge(h: number | null): string {
  if (h == null) return "-";
  const n = Math.round(h * 10) / 10;
  if (Math.abs(n - Math.round(n)) < 1e-9) return `${Math.round(n)}h`;
  return `${n}h`;
}

function statusFromHours(hours: number | null, targetHours: number): "ABSENT" | "INCOMPLETE" | "COMPLETE" | "OVER" {
  if (hours == null || hours <= 0) return "ABSENT";
  if (hours < targetHours) return "INCOMPLETE";
  if (hours > targetHours) return "OVER";
  return "COMPLETE";
}

function statusBadgeLabel(st: "ABSENT" | "INCOMPLETE" | "COMPLETE" | "OVER"): string {
  if (st === "COMPLETE") return "OK";
  if (st === "INCOMPLETE") return "PARZ";
  if (st === "OVER") return "OVER";
  return "ABS";
}

export default function CapoTodayOperatorsPanel({ mode = "expanded", onOperatorDragStart }: Props): JSX.Element {
  const { authReady, uid } = useAuth();
  const { t } = useI18n();
  const { shipId } = useParams();
  const location = useLocation();

  const reportDate = useMemo(() => getDateFromSearch(location.search) || getTodayISO(), [location.search]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<TeamItem[]>([]);

  const [selected, setSelected] = useState<{ id: string | null; name: string } | null>(null);

  const [hoursById, setHoursById] = useState<Record<string, number>>({});
  const [plannedById, setPlannedById] = useState<Record<string, number>>({});

  const isCollapsed = mode === "collapsed";
  const DEFAULT_TARGET_HOURS = 8;

  const refreshHours = useCallback(() => {
    setHoursById(readHoursSummary(shipId ?? null, reportDate));
  }, [shipId, reportDate]);

  const refreshPlanned = useCallback(() => {
    setPlannedById(readPlannedHours(shipId ?? null, reportDate));
  }, [shipId, reportDate]);

  useEffect(() => {
    refreshHours();
    refreshPlanned();
    function onEvt() {
      refreshHours();
      refreshPlanned();
    }
    window.addEventListener("core:rapportino-hours-updated", onEvt as EventListener);
    window.addEventListener("core:rapportino-planned-hours-updated", onEvt as EventListener);
    window.addEventListener("storage", onEvt as EventListener);
    return () => {
      window.removeEventListener("core:rapportino-hours-updated", onEvt as EventListener);
      window.removeEventListener("core:rapportino-planned-hours-updated", onEvt as EventListener);
      window.removeEventListener("storage", onEvt as EventListener);
    };
  }, [refreshHours, refreshPlanned]);

  const load = useCallback(async () => {
    if (!authReady || !uid) {
      setLoading(false);
      setErr("");
      setItems([]);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase.rpc("capo_my_team_for_date_v1", { p_plan_date: reportDate });
      if (error) throw error;

      const raw = Array.isArray(data) ? data : [];
      const mapped: TeamItem[] = raw
        .map((r: any) => {
          const name = formatHumanName(guessOperatorName(r));
          const id = guessOperatorId(r);
          const position = guessOperatorPosition(r);
          return name ? { id, name, position, raw: r } : null;
        })
        .filter(Boolean) as TeamItem[];

      mapped.sort((a, b) => {
        const ap = a.position;
        const bp = b.position;
        const aHas = ap !== null && ap !== undefined;
        const bHas = bp !== null && bp !== undefined;

        if (aHas && bHas && ap !== bp) return ap - bp;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });

      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const dedup: TeamItem[] = [];

      for (const it of mapped) {
        const idKey = it.id ? String(it.id) : "";
        const nameKey = String(it.name || "").trim().toLowerCase();
        if (idKey) {
          if (seenIds.has(idKey)) continue;
          seenIds.add(idKey);
        } else {
          if (seenNames.has(nameKey)) continue;
          seenNames.add(nameKey);
        }
        dedup.push(it);
      }

      setItems(dedup);
    } catch (e: any) {
      setErr(String(e?.message || e || "Errore"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authReady, uid, reportDate]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => String(it.name || "").toLowerCase().includes(qq));
  }, [items, q]);

  const count = filtered.length;

  if (isCollapsed) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("CAPO_TODAY_OPERATORS")}</div>
          <div className="rounded-full border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
            {loading ? "..." : count}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("CAPO_TODAY_OPERATORS")}</div>
          <div className="mt-1 text-[12px] text-slate-400">{t("CAPO_TODAY_HINT")}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className={cn(
              "rounded-xl border px-3 py-2 text-[12px] font-semibold",
              "border-slate-800 bg-slate-950/40 text-slate-100 hover:bg-slate-900/35",
              "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
            )}
            title={t("CAPO_TODAY_RELOAD")}
          >
            {t("CAPO_TODAY_RELOAD")}
          </button>

          <div className="rounded-full border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
            {loading ? "..." : count}
          </div>
        </div>
      </div>

      {!authReady ? (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
          {t("CAPO_TODAY_SESSION_START")}
        </div>
      ) : null}

      <div className="mt-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("CAPO_TODAY_SEARCH")}
          className={[
            "w-full rounded-xl border",
            "border-slate-800 bg-slate-950/40",
            "px-3 py-2 text-[12px] text-slate-100",
            "placeholder:text-slate-600",
            "outline-none focus:ring-2 focus:ring-sky-500/35",
          ].join(" ")}
        />
      </div>

      <div className="mt-3">
        {err ? (
          <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
            {err}
          </div>
        ) : null}

        <div className="mt-2 max-h-[40vh] overflow-auto pr-1 space-y-2">
          {loading ? (
            <div className="text-[12px] text-slate-400">{t("CAPO_TODAY_LOADING")}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
              {t("CAPO_TODAY_EMPTY")}
            </div>
          ) : (
            filtered.map((it) => {
              const hours = it.id ? (hoursById[String(it.id)] ?? null) : null;
              const targetHoursRaw = it.id ? plannedById[String(it.id)] : undefined;
              const targetHours =
                Number.isFinite(Number(targetHoursRaw)) && Number(targetHoursRaw) > 0 ? Number(targetHoursRaw) : DEFAULT_TARGET_HOURS;

              const st = statusFromHours(hours, targetHours);

              const tone =
                st === "COMPLETE"
                  ? "border-emerald-400/25 bg-emerald-500/10"
                  : st === "INCOMPLETE"
                  ? "border-amber-400/25 bg-amber-500/10"
                  : st === "OVER"
                  ? "border-rose-400/25 bg-rose-500/10"
                  : "border-sky-400/25 bg-sky-500/10";

              const isSelected =
                (selected?.id && it.id && String(selected.id) === String(it.id)) || (!selected?.id && selected?.name === it.name);

              return (
                <div
                  key={it.id || it.name}
                  draggable
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected({ id: it.id, name: it.name })}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer.setData("application/json", JSON.stringify({ id: it.id, name: it.name }));
                      e.dataTransfer.setData("text/plain", it.name);
                      e.dataTransfer.setData("text/core-operator-name", it.name);
                      if (it.id) e.dataTransfer.setData("text/core-operator-id", String(it.id));
                      e.dataTransfer.effectAllowed = "copy";
                    } catch {}
                    onOperatorDragStart?.({ id: it.id, name: it.name });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  className={cn(pillBase(isSelected), tone)}
                  title={t("CAPO_TODAY_DRAG_HINT")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-extrabold leading-4 whitespace-normal break-words">{it.name}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5",
                            "text-[10px] font-extrabold tracking-[0.14em]",
                            "uppercase",
                            "border-slate-800 bg-slate-950/40 text-slate-100"
                          )}
                          title="Stato calcolato da ore rapportino vs ore pianificate (se disponibili)"
                        >
                          {statusBadgeLabel(st)}
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] font-semibold text-slate-200">Selezionato</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Clicca per vedere le ore</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5",
                          "text-[11px] font-extrabold",
                          "border-slate-800 bg-slate-950/40 text-slate-100"
                        )}
                        title={
                          it.id
                            ? `Ore dal rapportino: ${formatHoursBadge(hours)} · Pianificate: ${formatHoursBadge(targetHours)}`
                            : "Ore non disponibili (legacy)"
                        }
                      >
                        {`${formatHoursBadge(hours)}/${formatHoursBadge(targetHours)}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selected ? (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Operatore selezionato</div>
                <div className="mt-1 text-[12px] font-extrabold text-slate-100 whitespace-normal break-words">
                  {selected.name}
                </div>
                <div className="mt-1 text-[12px] text-slate-300">
                  Ore:{" "}
                  <span className="font-extrabold text-slate-100">
                    {formatHoursBadge(selected.id ? (hoursById[String(selected.id)] ?? null) : null)}
                  </span>{" "}
                  <span className="text-slate-500">/</span>{" "}
                  <span className="font-extrabold text-slate-100">
                    {formatHoursBadge(
                      selected.id
                        ? Number.isFinite(Number(plannedById[String(selected.id)])) && Number(plannedById[String(selected.id)]) > 0
                          ? Number(plannedById[String(selected.id)])
                          : DEFAULT_TARGET_HOURS
                        : DEFAULT_TARGET_HOURS
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className={cn(
                  "rounded-full border px-2.5 py-1",
                  "text-[11px] font-semibold",
                  "border-slate-800 bg-slate-950/40 text-slate-100 hover:bg-slate-900/35",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
                )}
                title="Fermer"
              >
                ×
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-400">
              Suggerimento: trascina la pill su una riga del rapport per aggiungerlo.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
// /src/capo/CapoTodayOperatorsPanel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n/I18nProvider";
import { formatHumanName } from "../utils/formatHuman";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function guessOperatorName(row) {
  if (!row || typeof row !== "object") return "";
  const candidates = [
    row.operator_display_name,
    row.operator_name,
    row.display_name,
    row.full_name,
    row.name,
    row.operator,
    row.nome,
    row.cognome ? `${row.nome} ${row.cognome}` : null,
  ].filter(Boolean);

  const raw = candidates[0] ? String(candidates[0]) : "";
  return raw.trim();
}

function guessOperatorId(row) {
  if (!row || typeof row !== "object") return null;
  const candidates = [row.operator_id, row.id, row.operator_uuid, row.member_id].filter(Boolean);
  return candidates[0] || null;
}

function guessOperatorPosition(row) {
  if (!row || typeof row !== "object") return null;
  const candidates = [row.operator_position, row.position, row.pos].filter((v) => v !== undefined && v !== null);
  const v = candidates.length ? candidates[0] : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pillBase() {
  return [
    "w-full rounded-xl border px-3 py-2",
    "text-[12px] font-semibold",
    "border-slate-800 bg-slate-950/40 text-slate-100 hover:bg-slate-900/35",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    "cursor-grab active:cursor-grabbing",
    "select-none",
  ].join(" ");
}

export default function CapoTodayOperatorsPanel({ mode = "expanded", onOperatorDragStart }) {
  const { authReady, uid } = useAuth();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);

  const isCollapsed = mode === "collapsed";

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
      const { data, error } = await supabase.from("capo_my_team_v1").select("*");
      if (error) throw error;

      const raw = Array.isArray(data) ? data : [];
      const mapped = raw
        .map((r) => {
          const name = formatHumanName(guessOperatorName(r));
          const id = guessOperatorId(r);
          const position = guessOperatorPosition(r);
          return name ? { id, name, position, raw: r } : null;
        })
        .filter(Boolean);

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

      const seenIds = new Set();
      const seenNames = new Set();
      const dedup = [];
      for (const it of mapped) {
        if (it.id) {
          const k = String(it.id);
          if (seenIds.has(k)) continue;
          seenIds.add(k);
          dedup.push(it);
          continue;
        }
        const nk = (it.name || "").toLowerCase();
        if (!nk) continue;
        if (seenNames.has(nk)) continue;
        seenNames.add(nk);
        dedup.push(it);
      }

      setItems(dedup);
    } catch (e) {
      console.error("[CapoTodayOperatorsPanel] load error:", e);
      setErr(t("CAPO_TODAY_LOAD_ERROR"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authReady, uid]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const filtered = useMemo(() => {
    const qq = (q || "").trim().toLowerCase();
    if (!qq) return items;
    return items.filter((x) => (x.name || "").toLowerCase().includes(qq));
  }, [items, q]);

  const count = items.length;

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn("w-full rounded-2xl border p-2", "border-slate-800 bg-slate-950/20")}
          title={t("CAPO_TODAY_TITLE")}
        >
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-200">
                O
              </div>
              <div className="absolute -top-1.5 -right-1.5 rounded-full border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-slate-100">
                {loading ? "…" : count}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("CAPO_TODAY_TITLE")}</div>
          <div className="mt-1 text-[12px] text-slate-300">{t("CAPO_TODAY_SUB")}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              "border-slate-800 bg-slate-950/40 text-slate-100 hover:bg-slate-900/35",
              "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
            )}
            title={t("CAPO_TODAY_RELOAD")}
          >
            {t("CAPO_TODAY_RELOAD")}
          </button>

          <div className="rounded-full border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
            {loading ? "…" : count}
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
            filtered.map((it) => (
              <div
                key={it.id || it.name}
                draggable
                role="button"
                tabIndex={0}
                onDragStart={(e) => {
                  try {
                    e.dataTransfer.setData("text/core-operator-name", it.name);
                    if (it.id) e.dataTransfer.setData("text/core-operator-id", String(it.id));
                    e.dataTransfer.effectAllowed = "copy";
                  } catch {}
                  onOperatorDragStart?.(it);
                }}
                onKeyDown={(e) => {
                  // no-op: we don't "select" on Enter; we drag. keep accessible focus.
                  if (e.key === "Enter") e.preventDefault();
                }}
                className={pillBase()}
                title={t("CAPO_TODAY_DRAG_HINT")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{it.name}</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400/80" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

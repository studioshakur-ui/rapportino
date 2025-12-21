// src/pages/Evoluzione.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  CORE_CURRENT_VERSION,
  CORE_VERSIONS,
  getEntriesForVersion,
  statusText,
  pickLang,
  pickLangArray,
} from "../data/coreEvolution";

import {
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  getStoredLang,
  storeLang,
  t as tUI,
} from "../data/i18nEvoluzione";

/* =========================
   Theme helper (read localStorage)
   ========================= */
function getTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const t = window.localStorage.getItem("core-theme");
    if (t === "dark" || t === "light") return t;
  } catch {}
  return "dark";
}

/* =========================
   UI utils
   ========================= */
function pillTone(tone, isDark) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]";
  const map = {
    emerald: isDark
      ? "border-emerald-500/40 bg-emerald-950/25 text-emerald-200"
      : "border-emerald-300 bg-emerald-50 text-emerald-800",
    amber: isDark
      ? "border-amber-500/35 bg-amber-950/20 text-amber-200"
      : "border-amber-300 bg-amber-50 text-amber-800",
    sky: isDark
      ? "border-sky-500/35 bg-sky-950/20 text-sky-200"
      : "border-sky-300 bg-sky-50 text-sky-800",
    violet: isDark
      ? "border-violet-500/35 bg-violet-950/20 text-violet-200"
      : "border-violet-300 bg-violet-50 text-violet-800",
    rose: isDark
      ? "border-rose-500/35 bg-rose-950/20 text-rose-200"
      : "border-rose-300 bg-rose-50 text-rose-800",
    slate: isDark
      ? "border-slate-800 bg-slate-950/25 text-slate-300"
      : "border-slate-200 bg-white text-slate-700",
  };
  return [base, map[tone] || map.slate].join(" ");
}

function typePill(type, isDark) {
  const t = String(type || "").toUpperCase();
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]";
  const styles = {
    FIX: isDark
      ? "border-sky-500/35 bg-sky-950/25 text-sky-200"
      : "border-sky-300 bg-sky-50 text-sky-800",
    FEATURE: isDark
      ? "border-emerald-500/35 bg-emerald-950/25 text-emerald-200"
      : "border-emerald-300 bg-emerald-50 text-emerald-800",
    UX: isDark
      ? "border-violet-500/35 bg-violet-950/20 text-violet-200"
      : "border-violet-300 bg-violet-50 text-violet-800",
    PERF: isDark
      ? "border-amber-500/35 bg-amber-950/20 text-amber-200"
      : "border-amber-300 bg-amber-50 text-amber-800",
    SECURITY: isDark
      ? "border-rose-500/35 bg-rose-950/20 text-rose-200"
      : "border-rose-300 bg-rose-50 text-rose-800",
    DB: isDark
      ? "border-slate-700 bg-slate-950/35 text-slate-200"
      : "border-slate-300 bg-slate-50 text-slate-800",
  };
  return [base, styles[t] || styles.DB].join(" ");
}

function impactDot(impact) {
  const i = String(impact || "").toUpperCase();
  if (i === "CRITICAL") return "bg-rose-400";
  if (i === "MEDIUM") return "bg-amber-400";
  return "bg-emerald-400";
}

function langButtonClass(on, isDark) {
  const base =
    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition";
  if (on) {
    return isDark
      ? `${base} border-sky-500/60 bg-sky-950/20 text-sky-200 shadow-[0_10px_30px_rgba(56,189,248,0.14)]`
      : `${base} border-sky-300 bg-sky-50 text-sky-800`;
  }
  return isDark
    ? `${base} border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35`
    : `${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
}

export default function Evoluzione() {
  const [theme, setTheme] = useState(getTheme());
  const isDark = theme === "dark";

  // Language: IT default, persisted
  const [lang, setLang] = useState(() => getStoredLang() || DEFAULT_LANG);
  const ui = useMemo(() => tUI(lang), [lang]);

  // Keep theme in sync if user toggles in shell
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = getTheme();
      setTheme((cur) => (cur === t ? cur : t));
    }, 600);
    return () => window.clearInterval(id);
  }, []);

  // Persist language
  useEffect(() => {
    storeLang(lang);
  }, [lang]);

  const [active, setActive] = useState(CORE_VERSIONS[0]?.key || "CORE 1.0");

  const activeVersion = useMemo(() => {
    return CORE_VERSIONS.find((v) => v.key === active) || CORE_VERSIONS[0];
  }, [active]);

  const entries = useMemo(() => getEntriesForVersion(active), [active]);

  const counts = useMemo(() => {
    const critical = entries.filter(
      (e) => String(e.impact).toUpperCase() === "CRITICAL"
    ).length;
    const db = entries.filter((e) => String(e.type).toUpperCase() === "DB").length;
    return { entries: entries.length, critical, db };
  }, [entries]);

  const activeLabel = useMemo(() => {
    return pickLang(activeVersion?.label, lang) || active;
  }, [activeVersion, lang, active]);

  const activeStatusText = useMemo(() => {
    const k = activeVersion?.status || "";
    return statusText(k, lang);
  }, [activeVersion, lang]);

  const activeSummary = useMemo(() => {
    return pickLangArray(activeVersion?.summary, lang);
  }, [activeVersion, lang]);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
            {ui.pageKicker}
          </div>
          <div
            className={
              isDark
                ? "text-2xl font-semibold text-slate-50"
                : "text-2xl font-semibold text-slate-900"
            }
          >
            {ui.pageTitle}
          </div>
          <div
            className={
              isDark
                ? "text-[13px] text-slate-400 max-w-3xl leading-relaxed"
                : "text-[13px] text-slate-600 max-w-3xl leading-relaxed"
            }
          >
            {ui.pageSubtitle}
          </div>
          <div className={isDark ? "text-[12px] text-slate-500" : "text-[12px] text-slate-500"}>
            {ui.scopeFrozenRule}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Language switch */}
          <span className={pillTone("slate", isDark)}>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {ui.language}
          </span>

          <div className="flex items-center gap-2" aria-label={ui.language}>
            {SUPPORTED_LANGS.map((code) => (
              <button
                key={code}
                type="button"
                className={langButtonClass(lang === code, isDark)}
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                title={code.toUpperCase()}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Current version */}
          <span className={pillTone("slate", isDark)}>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {ui.currentVersion}:&nbsp;
            <span className="font-semibold tracking-[0.18em]">
              {CORE_CURRENT_VERSION}
            </span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2" aria-label={ui.tabsAria}>
        {CORE_VERSIONS.map((v) => {
          const on = v.key === active;
          const base =
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition";
          const off = isDark
            ? "border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
          const onCls = isDark
            ? "border-sky-500/55 bg-sky-950/20 text-sky-200 shadow-[0_16px_60px_rgba(56,189,248,0.14)]"
            : "border-sky-300 bg-sky-50 text-sky-800";

          const label = pickLang(v.label, lang) || v.key;
          const status = statusText(v.status, lang);

          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setActive(v.key)}
              className={[base, on ? onCls : off].join(" ")}
              aria-current={on ? "page" : undefined}
            >
              <span className={pillTone(v.tone || "slate", isDark)} style={{ padding: "2px 8px" }}>
                {status}
              </span>
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Active version summary */}
      <div
        className={
          isDark
            ? "rounded-3xl border border-slate-800 bg-[#050910] p-4 sm:p-5"
            : "rounded-3xl border border-slate-200 bg-white p-4 sm:p-5"
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div
              className={
                isDark ? "text-lg font-semibold text-slate-50" : "text-lg font-semibold text-slate-900"
              }
            >
              {activeLabel || ui.activeVersionTitleFallback}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={pillTone(activeVersion?.tone || "slate", isDark)}>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {ui.statusLabel}:&nbsp;
                <span className="font-semibold">{activeStatusText}</span>
              </span>
            </div>

            <ul
              className={
                isDark
                  ? "mt-2 text-[13px] text-slate-400 space-y-1"
                  : "mt-2 text-[13px] text-slate-600 space-y-1"
              }
            >
              {(activeSummary || []).map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={
              isDark
                ? "rounded-2xl border border-slate-800 bg-slate-950/25 p-3"
                : "rounded-2xl border border-slate-200 bg-slate-50 p-3"
            }
          >
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              {ui.counters}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div
                className={
                  isDark
                    ? "rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2"
                }
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  {ui.entries}
                </div>
                <div className={isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-900"}>
                  {counts.entries}
                </div>
              </div>

              <div
                className={
                  isDark
                    ? "rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2"
                }
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  {ui.critical}
                </div>
                <div className={isDark ? "text-lg font-semibold text-rose-200" : "text-lg font-semibold text-rose-700"}>
                  {counts.critical}
                </div>
              </div>

              <div
                className={
                  isDark
                    ? "rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2"
                }
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  {ui.db}
                </div>
                <div className={isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-900"}>
                  {counts.db}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Journal */}
      <div
        className={
          isDark
            ? "rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden"
            : "rounded-3xl border border-slate-200 bg-white overflow-hidden"
        }
      >
        <div className={isDark ? "px-4 py-3 border-b border-slate-800" : "px-4 py-3 border-b border-slate-200"}>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {ui.journal}
          </div>
          <div className={isDark ? "text-[12px] text-slate-400" : "text-[12px] text-slate-600"}>
            {ui.journalSubtitle}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {entries.length === 0 ? (
            <div className={isDark ? "text-[13px] text-slate-500" : "text-[13px] text-slate-600"}>
              {ui.empty}
            </div>
          ) : (
            entries.map((e) => {
              const title = pickLang(e.title, lang) || "";
              const details = pickLangArray(e.details, lang);

              return (
                <div
                  key={e.id}
                  className={
                    isDark
                      ? "rounded-2xl border border-slate-800 bg-slate-950/20 p-4"
                      : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  }
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={typePill(e.type, isDark)}>
                          {String(e.type || "").toUpperCase()}
                        </span>
                        <span className={isDark ? "text-[11px] text-slate-400" : "text-[11px] text-slate-600"}>
                          {e.module || "—"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          • {e.date}
                        </span>
                      </div>

                      <div className={isDark ? "text-[15px] font-semibold text-slate-100" : "text-[15px] font-semibold text-slate-900"}>
                        {title}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={
                          isDark
                            ? "inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/30 px-3 py-1 text-[11px] text-slate-400"
                            : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600"
                        }
                        title={`Impact: ${e.impact}`}
                      >
                        <span className={["h-1.5 w-1.5 rounded-full", impactDot(e.impact)].join(" ")} />
                        <span className="uppercase tracking-[0.18em]">
                          {e.impact}
                        </span>
                      </span>
                    </div>
                  </div>

                  {details.length > 0 ? (
                    <ul className={isDark ? "mt-3 text-[13px] text-slate-400 space-y-1" : "mt-3 text-[13px] text-slate-600 space-y-1"}>
                      {details.map((d, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-slate-500" />
                          <span className="min-w-0">{d}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={isDark ? "text-[11px] text-slate-600" : "text-[11px] text-slate-500"}>
        {ui.note}
      </div>
    </div>
  );
}

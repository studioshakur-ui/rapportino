// src/components/shell/LangSwitcher.jsx
import React from "react";
import { useI18n } from "../../i18n/I18nProvider";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

export default function LangSwitcher({ compact = false }) {
  const { lang, setLang, t } = useI18n();

  const btnBase =
    "select-none rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] transition " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-offset-0";

  const wrap = compact ? "flex items-center gap-1" : "flex items-center gap-2";

  const label = (
    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mr-2">
      {t("LANG")}
    </div>
  );

  const mk = (code) => {
    const active = lang === code;
    return (
      <button
        type="button"
        onClick={() => setLang(code)}
        className={cn(
          btnBase,
          active
            ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_0_18px_rgba(16,185,129,0.18)]"
            : "border-slate-700/80 bg-slate-950/40 text-slate-300 hover:bg-slate-900/40 hover:text-slate-100"
        )}
        aria-pressed={active}
      >
        {code.toUpperCase()}
      </button>
    );
  };

  return (
    <div className={wrap}>
      {!compact ? label : null}
      {mk("it")}
      {mk("fr")}
      {mk("en")}
    </div>
  );
}

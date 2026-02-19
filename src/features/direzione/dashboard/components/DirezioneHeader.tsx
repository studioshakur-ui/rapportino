// src/features/direzione/dashboard/components/DirezioneHeader.tsx


import LangSwitcher from "../../../../components/shell/LangSwitcher";

export type DirezioneHeaderProps = {
  kicker: string;
  title: string;
  readOnlyLabel: string;
};

export default function DirezioneHeader({ kicker, title, readOnlyLabel }: DirezioneHeaderProps): JSX.Element {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">{kicker}</div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">{title}</h1>
      </div>

      <div className="flex flex-col items-end gap-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full border border-emerald-400/70 bg-emerald-500/12 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.14)]">
            {readOnlyLabel}
          </span>
          <LangSwitcher compact />
        </div>
      </div>
    </header>
  );
}

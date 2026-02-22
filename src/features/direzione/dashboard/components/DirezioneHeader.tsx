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
        <div className="kicker mb-1">{kicker}</div>
        <h1 className="text-2xl md:text-3xl font-semibold theme-text">{title}</h1>
      </div>

      <div className="flex flex-col items-end gap-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="chip chip-success">
            {readOnlyLabel}
          </span>
          <LangSwitcher compact />
        </div>
      </div>
    </header>
  );
}

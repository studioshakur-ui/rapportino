// src/components/shell/CNCSTopbar.tsx
import React from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function CNCSTopbar(props: {
  isDark: boolean; // kept for compatibility; visuals are token-driven now
  kickerLeft?: React.ReactNode;
  title: React.ReactNode;
  right?: React.ReactNode;
}): JSX.Element {
  const { kickerLeft, title, right } = props;

  return (
    <header className={cn("no-print sticky top-0 z-30", "rounded-2xl backdrop-blur", "px-3 py-2", "theme-scope theme-topbar")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {kickerLeft ? <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">{kickerLeft}</div> : null}
          <div className="text-sm font-semibold truncate">{title}</div>
        </div>

        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
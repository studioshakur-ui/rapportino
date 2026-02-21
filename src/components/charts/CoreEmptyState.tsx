// src/components/charts/CoreEmptyState.tsx
// CORE / CNCS — Standard Empty / Loading states for charts (light-safe)

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function CoreLoading({
  label = "Caricamento…",
  isDark = true,
}: {
  label?: string;
  isDark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[220px] items-center justify-center rounded-xl border",
        "theme-scope",
        isDark ? "border-slate-800 bg-slate-950/40 text-slate-300" : "theme-panel-2 theme-border theme-text-muted"
      )}
    >
      <div className="text-[12px]">{label}</div>
    </div>
  );
}

export function CoreEmpty({
  label = "Nessun dato",
  hint,
  isDark = true,
}: {
  label?: string;
  hint?: string;
  isDark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[220px] items-center justify-center rounded-xl border px-3",
        "theme-scope",
        isDark ? "border-slate-800 bg-slate-950/40 text-slate-400" : "theme-panel-2 theme-border theme-text-muted"
      )}
    >
      <div className="text-center">
        <div className={cn("text-[12px] font-medium", isDark ? "text-slate-200" : "theme-text")}>{label}</div>
        {hint ? <div className="mt-1 text-[11px] opacity-80">{hint}</div> : null}
      </div>
    </div>
  );
}
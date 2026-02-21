// src/components/ThemeSwitcher.tsx
import { useTheme } from "../hooks/useTheme";

export default function ThemeSwitcher(): JSX.Element {
  const { mode, theme, setAuto, setTheme } = useTheme();
  const isAuto = mode === "auto";

  return (
    <div className="inline-flex items-center rounded-full border theme-border bg-[var(--panel2)] p-1">
      <button
        type="button"
        onClick={setAuto}
        className={[
          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
          isAuto ? "accent-soft" : "theme-text-muted hover:bg-[var(--panel)]",
        ].join(" ")}
        aria-pressed={isAuto}
      >
        Auto
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={[
          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
          !isAuto && theme === "dark" ? "accent-soft" : "theme-text-muted hover:bg-[var(--panel)]",
        ].join(" ")}
        aria-pressed={!isAuto && theme === "dark"}
      >
        Dark
      </button>

      <button
        type="button"
        onClick={() => setTheme("light")}
        className={[
          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
          !isAuto && theme === "light" ? "accent-soft" : "theme-text-muted hover:bg-[var(--panel)]",
        ].join(" ")}
        aria-pressed={!isAuto && theme === "light"}
      >
        Light
      </button>
    </div>
  );
}

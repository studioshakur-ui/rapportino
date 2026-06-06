// src/shells/CommandBottomNav.tsx
// Mobile-first bottom navigation for CORE COMMAND.
// Fixed, thumb-reachable, safe-area aware. Hidden on desktop (md+).
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const ICON = "h-5 w-5";

const NAV: NavItem[] = [
  {
    to: "/command/center",
    label: "Aujourd'hui",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: "/command/daily-lists",
    label: "Listes",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h12" /><path d="M8 12h12" /><path d="M8 18h12" /><path d="M3.5 6h.01" /><path d="M3.5 12h.01" /><path d="M3.5 18h.01" />
      </svg>
    ),
  },
  {
    to: "/command/problems",
    label: "Problèmes",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    ),
  },
  {
    to: "/command/timeline",
    label: "Journal",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

export default function CommandBottomNav() {
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition-colors ${
                isActive ? "text-white" : "text-zinc-600 active:text-zinc-300"
              }`
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

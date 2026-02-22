// src/navemaster/NavemasterHub.tsx
import { useMemo, useState } from "react";

type IconProps = { className?: string };

function IconBox({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7l9 4 9-4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconChart({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <path d="M4 19V5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 15v-4M12 15V9M16 15V7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconDiff({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <path d="M7 7h10M7 12h10M7 17h10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 7l2-2 2 2M20 17l-2 2-2-2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconAlert({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconUpload({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <path d="M12 16V4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

import NavemasterImportModal from "./NavemasterImportModal";
import ShipSelector from "./components/ShipSelector";
import { useNavemasterAccess } from "./hooks/useNavemasterContext";
import { useNavemasterShips } from "./hooks/useNavemasterShips";
import NavemasterCockpitPage from "./pages/NavemasterCockpitPage";
import NavemasterDiffPage from "./pages/NavemasterDiffPage";
import NavemasterAlertsPage from "./pages/NavemasterAlertsPage";

type TabId = "cockpit" | "alerts" | "diff";

const tabs: Array<{ id: TabId; label: string; icon: (p: IconProps) => JSX.Element }> = [
  { id: "cockpit", label: "Cockpit", icon: IconChart },
  { id: "alerts", label: "Alerts", icon: IconAlert },
  { id: "diff", label: "Diff", icon: IconDiff },
];

export default function NavemasterHub(): JSX.Element {
  const access = useNavemasterAccess();
  const { ships, loading: shipsLoading } = useNavemasterShips();

  const [shipId, setShipId] = useState<string>("");
  const [tab, setTab] = useState<TabId>("cockpit");
  const [importOpen, setImportOpen] = useState(false);

  const selectedShip = useMemo(() => ships.find((s) => s.id === shipId) ?? null, [ships, shipId]);
  const selectedShipId = selectedShip?.id ?? null;

  if (!access.canRead) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
          <div className="text-sm text-slate-200">Access denied.</div>
          <div className="mt-1 text-xs text-slate-400">NAVEMASTER is available for UFFICIO/ADMIN/DIREZIONE/MANAGER and CAPO (read-only).</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/30">
              <IconBox className="text-slate-200" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">CNCS · NAVEMASTER</div>
              <div className="text-xl font-semibold text-slate-100">Audit-ready truth layer</div>
            </div>
          </div>
          <div className="mt-2 text-sm text-slate-400">
            INCA baseline + CORE proofs (rapportini approved) + UFFICIO signals — with Excel-grade filters, but index-backed and defensible.
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-end gap-3">
            {access.isReadOnly ? (
              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-[11px] text-slate-200">
                Read-only
              </span>
            ) : null}
            <ShipSelector ships={ships} value={shipId} onChange={(id) => setShipId(id)} disabled={shipsLoading} />
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              disabled={!access.canImport || !selectedShipId}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconUpload />
              Import
            </button>
          </div>
          <div className="text-xs text-slate-500">Ship selection is scoped by RLS.</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm " +
                (active
                  ? "border-slate-700 bg-slate-900 text-slate-100"
                  : "border-slate-800 bg-slate-950/30 text-slate-300 hover:bg-slate-900/50")
              }
            >
              <Icon />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        {tab === "cockpit" ? <NavemasterCockpitPage ship={selectedShip} /> : null}
        {tab === "alerts" ? <NavemasterAlertsPage shipId={selectedShipId} /> : null}
        {tab === "diff" ? <NavemasterDiffPage ship={selectedShip} /> : null}
      </div>

      <NavemasterImportModal open={importOpen} onClose={() => setImportOpen(false)} ship={selectedShip} />
    </div>
  );
}

// src/navemaster/NavemasterHub.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useI18n } from "../i18n/coreI18n";

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
import NavemasterAlertsPage from "./pages/NavemasterAlertsPage";

type TabId = "cockpit" | "alerts";

const tabs: Array<{ id: TabId; label: string; icon: (p: IconProps) => JSX.Element }> = [
  { id: "cockpit", label: "Cockpit", icon: IconChart },
  { id: "alerts", label: "Alerts", icon: IconAlert },
];

export default function NavemasterHub(): JSX.Element {
  const { t } = useI18n();
  const access = useNavemasterAccess();
  const { ships, loading: shipsLoading } = useNavemasterShips();

  const [shipId, setShipId] = useState<string>("");
  const [tab, setTab] = useState<TabId>("cockpit");
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasRun, setHasRun] = useState<boolean | null>(null);
  const [runMeta, setRunMeta] = useState<{ frozen_at: string | null } | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const selectedShip = useMemo(() => ships.find((s) => s.id === shipId) ?? null, [ships, shipId]);
  const selectedShipId = selectedShip?.id ?? null;

  useEffect(() => {
    let mounted = true;
    async function loadLatestRun(): Promise<void> {
      if (!selectedShipId) {
        setHasRun(null);
        setRunMeta(null);
        setRunError(null);
        return;
      }

      setRunLoading(true);
      setRunError(null);
      try {
        const { data, error } = await supabase
          .from("navemaster_latest_run_v2")
          .select("id, frozen_at")
          .eq("ship_id", selectedShipId)
          .maybeSingle();
        if (!mounted) return;
        if (error) {
          setRunError(error.message || "run lookup error");
          setHasRun(false);
          setRunMeta(null);
          return;
        }
        if (!data) {
          setHasRun(false);
          setRunMeta(null);
          return;
        }
        setHasRun(true);
        setRunMeta({ frozen_at: (data as any).frozen_at ?? null });
      } finally {
        if (!mounted) return;
        setRunLoading(false);
      }
    }

    void loadLatestRun();

    return () => {
      mounted = false;
    };
  }, [selectedShipId, refreshKey]);

  async function computeRun(): Promise<void> {
    if (!selectedShipId || !access.canImport) return;
    setRunLoading(true);
    setRunError(null);
    const { error } = await supabase.rpc("navemaster_compute_run_v2", {
      p_ship_id: selectedShipId,
      p_inca_file_id: null,
      p_approved_from: null,
      p_approved_to: null,
      p_freeze: true,
    });
    if (error) {
      setRunError(error.message || "compute run failed");
      setRunLoading(false);
      return;
    }
    setRefreshKey((x) => x + 1);
    setRunLoading(false);
  }

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
    <div className="w-full px-8 py-8">
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
              onClick={computeRun}
              disabled={!access.canImport || !selectedShipId || runLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              title={t("NM_COMPUTE_RUN")}
            >
              {t("NM_COMPUTE_RUN")}
            </button>
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
          <div className="text-xs text-slate-500">
            {t("NM_RLS_NOTE")}
            {runLoading ? " · checking run…" : null}
            {hasRun === true && runMeta?.frozen_at ? ` · last run: ${new Date(runMeta.frozen_at).toLocaleString()}` : null}
          </div>
          {runError ? <div className="text-xs text-rose-300">{runError}</div> : null}
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
        {tab === "cockpit" ? <NavemasterCockpitPage shipId={selectedShipId} hasRun={hasRun} refreshKey={refreshKey} /> : null}
        {tab === "alerts" ? <NavemasterAlertsPage shipId={selectedShipId} hasRun={hasRun} refreshKey={refreshKey} /> : null}
      </div>

      <NavemasterImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        ship={selectedShip}
        onImported={() => {
          setRefreshKey((x) => x + 1);
          void computeRun();
        }}
        role={access.role}
      />
    </div>
  );
}

// src/navemaster/NavemasterCockpitModal.tsx
import { useEffect, useMemo, useState } from "react";

type IconProps = { className?: string };

function IconAlert({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconCheck({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconClock({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconInfo({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconXCircle({ className = "" }: IconProps) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

import { supabase } from "../lib/supabaseClient";

type ShipLite = {
  id: string;
  code: string | null;
  name: string | null;
  costr: string | null;
  commessa: string | null;
};

type CockpitKpi = {
  ship_id: string;
  import_id: string;
  imported_at: string;
  total: number;
  cnt_p: number;
  cnt_t: number;
  cnt_r: number;
  cnt_l: number;
  cnt_b: number;
  cnt_e: number;
  cnt_np: number;
  metri_ref_sum: number | null;
  metri_posati_sum: number | null;
  delta_sum: number | null;
  progress_ratio: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  ship: ShipLite | null;
};

function pct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v * 1000) / 10}%`;
}

function fmtNum(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);
}

export function NavemasterCockpitModal(props: Props): JSX.Element | null {
  const { open, onClose, ship } = props;
  const shipId = ship?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<CockpitKpi | null>(null);

  useEffect(() => {
    if (!open || !shipId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from("navemaster_kpi_live_v1")
          .select(
            "ship_id, import_id, imported_at, total, cnt_p, cnt_t, cnt_r, cnt_l, cnt_b, cnt_e, cnt_np, metri_ref_sum, metri_posati_sum, delta_sum, progress_ratio"
          )
          .eq("ship_id", shipId)
          .maybeSingle();

        if (qErr) throw qErr;
        if (!mounted) return;
        setKpi((data as CockpitKpi) ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Unable to load cockpit");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, shipId]);

  const verdict = useMemo(() => {
    // Minimal heuristic: BLOCK if any B, WARN if any R, otherwise OK
    if (!kpi) return { label: "—", tone: "muted" as const, Icon: IconInfo };
    if (kpi.cnt_b > 0) return { label: "BLOCK", tone: "danger" as const, Icon: IconXCircle };
    if (kpi.cnt_r > 0) return { label: "WARN", tone: "warn" as const, Icon: IconAlert };
    return { label: "OK", tone: "ok" as const, Icon: IconCheck };
  }, [kpi]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-6">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">NAVEMASTER · Cockpit</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {ship?.code ?? "—"} · {ship?.name ?? "Ship"}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Baseline INCA + proofs CORE (rapportini APPROVED_UFFICIO) · Audit-ready summary
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-300">
              <IconClock /> Loading…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>
          ) : !kpi ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-sm text-slate-300">
              No NAVEMASTER import found for this ship.
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/20 p-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Run</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-800 bg-slate-950/30 px-2.5 py-1 text-[12px] text-slate-200">
                      imported_at: {new Date(kpi.imported_at).toLocaleString()}
                    </span>
                    <span className="rounded-full border border-slate-800 bg-slate-950/30 px-2.5 py-1 text-[12px] text-slate-200">
                      total: {fmtNum(kpi.total)}
                    </span>
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <span
                    className={
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] " +
                      (verdict.tone === "danger"
                        ? "border-red-900/50 bg-red-950/40 text-red-200"
                        : verdict.tone === "warn"
                          ? "border-amber-900/50 bg-amber-950/30 text-amber-200"
                          : verdict.tone === "ok"
                            ? "border-emerald-900/40 bg-emerald-950/25 text-emerald-200"
                            : "border-slate-800 bg-slate-950/20 text-slate-200")
                    }
                  >
                    <verdict.Icon /> {verdict.label}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Progress</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-100">{pct(kpi.progress_ratio)}</div>
                  <div className="mt-1 text-sm text-slate-400">Σ posati / Σ ref</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Ref (m)</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-100">{fmtNum(kpi.metri_ref_sum)}</div>
                  <div className="mt-1 text-sm text-slate-400">baseline</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Posati (m)</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-100">{fmtNum(kpi.metri_posati_sum)}</div>
                  <div className="mt-1 text-sm text-slate-400">approved proofs</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Δ (m)</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-100">{fmtNum(kpi.delta_sum)}</div>
                  <div className="mt-1 text-sm text-slate-400">remaining</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Status counts</div>
                <div className="mt-3 grid gap-2 md:grid-cols-7">
                  {(
                    [
                      ["P", kpi.cnt_p],
                      ["T", kpi.cnt_t],
                      ["R", kpi.cnt_r],
                      ["L", kpi.cnt_l],
                      ["B", kpi.cnt_b],
                      ["E", kpi.cnt_e],
                      ["NP", kpi.cnt_np],
                    ] as const
                  ).map(([label, count]) => (
                    <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-100">{fmtNum(count)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// src/manager/components/SlotsWorkspaceModal.jsx
import React, { useMemo, useState } from "react";
import NamePill from "./NamePill";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function modalWrapClass() {
  return "fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center";
}

function modalOverlayClass() {
  return "absolute inset-0 bg-black/70";
}

function panelUltraWide() {
  return cn(
    "relative w-full sm:w-[min(1400px,98vw)]",
    "rounded-t-3xl sm:rounded-3xl border border-slate-800",
    "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
    "px-4 pb-4 pt-4"
  );
}

function btnGhost() {
  return cn(
    "inline-flex items-center justify-center rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

function pillTab(active) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold leading-none";
  return cn(
    base,
    active
      ? "border-sky-400/65 bg-slate-50/10 text-slate-50"
      : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/45",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
  );
}

export default function SlotsWorkspaceModal({
  isOpen,
  onClose,
  isDark = true,
  plan,
  slots,
  membersBySlotId,
}) {
  const [mode, setMode] = useState("GLOBAL"); // GLOBAL | TEAM
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const slotsSafe = Array.isArray(slots) ? slots : [];
  const selected = useMemo(() => {
    if (!selectedSlotId) return slotsSafe[0] || null;
    return slotsSafe.find((s) => s.id === selectedSlotId) || slotsSafe[0] || null;
  }, [slotsSafe, selectedSlotId]);

  const headerPlan = useMemo(() => {
    if (!plan?.id) return "Nessun piano";
    const p = String(plan?.period_type || "").toUpperCase();
    if (p === "DAY") return `Piano giorno · ${plan.plan_date || "—"}`;
    if (p === "WEEK") return `Piano settimana · ${plan.year_iso}-W${plan.week_iso}`;
    return `Piano · ${plan.id.slice(0, 8)}`;
  }, [plan]);

  if (!isOpen) return null;

  return (
    <div
      className={modalWrapClass()}
      role="dialog"
      aria-modal="true"
      aria-label="Vista globale squadre"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={modalOverlayClass()} />

      <div className={panelUltraWide()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">MANAGER · WORKSPACE</div>
            <div className="mt-1 text-[15px] font-semibold text-slate-50 truncate">Vista globale squadre</div>
            <div className="mt-1 text-[12px] text-slate-500">{headerPlan}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={pillTab(mode === "GLOBAL")} onClick={() => setMode("GLOBAL")}>
              Globale
            </button>
            <button type="button" className={pillTab(mode === "TEAM")} onClick={() => setMode("TEAM")}>
              Per CAPO
            </button>
            <button type="button" onClick={onClose} className={btnGhost()}>
              Chiudi
            </button>
          </div>
        </div>

        {slotsSafe.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-300">
            Nessun capo presente in questo piano.
          </div>
        ) : mode === "GLOBAL" ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
              <div className="col-span-3 text-slate-200">CAPO</div>
              <div className="col-span-9 text-slate-200">SQUADRA (operatori)</div>
            </div>

            <div className="divide-y divide-slate-800 max-h-[72vh] overflow-auto">
              {slotsSafe.map((s) => {
                const members = membersBySlotId?.get?.(s.id) || [];
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotId(s.id);
                      setMode("TEAM");
                    }}
                    className="w-full text-left px-3 py-3 hover:bg-slate-900/20 focus:outline-none focus:bg-slate-900/20"
                    title="Apri dettaglio CAPO"
                  >
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-3 min-w-0">
                        <NamePill isDark={isDark} tone="emerald">
                          {s.capo_name || "—"}
                        </NamePill>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {members.length} operatori
                        </div>
                      </div>

                      <div className="col-span-9">
                        {members.length === 0 ? (
                          <div className="text-[12px] text-slate-500">—</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {members.map((m) => (
                              <NamePill key={m.id} isDark={isDark} tone="sky">
                                {m.operator_name || "—"}
                              </NamePill>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left: list capi */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                CAPO ({slotsSafe.length})
              </div>
              <div className="max-h-[72vh] overflow-auto">
                {slotsSafe.map((s) => {
                  const members = membersBySlotId?.get?.(s.id) || [];
                  const active = selected?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSlotId(s.id)}
                      className={cn(
                        "w-full text-left px-3 py-3 border-b border-slate-800 last:border-b-0",
                        "hover:bg-slate-900/25 focus:outline-none",
                        active ? "bg-slate-900/25" : ""
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <NamePill isDark={isDark} tone="emerald">
                          {s.capo_name || "—"}
                        </NamePill>
                        <div className="text-[12px] text-slate-400">
                          <span className="text-slate-200 font-semibold">{members.length}</span>
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 truncate">
                        Slot {String(s.id || "").slice(0, 8)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: selected capo team */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                DETTAGLIO SQUADRA
              </div>

              {!selected ? (
                <div className="px-3 py-4 text-[13px] text-slate-400">—</div>
              ) : (
                <div className="px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <NamePill isDark={isDark} tone="emerald" className="text-[12px]">
                      {selected.capo_name || "—"}
                    </NamePill>
                    <div className="text-[12px] text-slate-400">
                      {((membersBySlotId?.get?.(selected.id) || []).length) || 0} operatori
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(membersBySlotId?.get?.(selected.id) || []).length === 0 ? (
                      <div className="text-[13px] text-slate-500">Nessun operatore assegnato.</div>
                    ) : (
                      (membersBySlotId?.get?.(selected.id) || []).map((m) => (
                        <NamePill key={m.id} isDark={isDark} tone="sky">
                          {m.operator_name || "—"}
                        </NamePill>
                      ))
                    )}
                  </div>

                  <div className="mt-3 text-[12px] text-slate-500">
                    Nota: questa vista è “read-only” e serve come Excel globale. Le modifiche restano nella pagina principale (DnD / rimozione).
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 text-[12px] text-slate-500">
          Suggerimento: usa “Globale” per vedere tutto in un colpo (stile Excel), poi clicca un CAPO per entrare nel dettaglio.
        </div>
      </div>
    </div>
  );
}

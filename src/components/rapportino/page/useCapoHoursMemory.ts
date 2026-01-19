// src/components/rapportino/page/useCapoHoursMemory.ts
import { useEffect } from "react";
import { parseNumeric } from "../../../rapportinoUtils";

type Row = any;

function computeHoursAndLeader(rows: Row[]): { byOperatorId: Record<string, number>; leaderOperatorId: string | null } {
  const out: Record<string, number> = {};
  const arr = Array.isArray(rows) ? rows : [];
  let leaderOperatorId: string | null = null;

  function add(opId: unknown, hours: unknown) {
    const k = String(opId || "").trim();
    if (!k) return;
    const n = Number(hours);
    if (!Number.isFinite(n) || n <= 0) return;
    out[k] = (Number(out[k]) || 0) + n;
  }

  for (const r of arr) {
    const items = Array.isArray(r?.operator_items) ? r.operator_items : [];
    if (!items.length) continue;

    for (const it of items) {
      const opId = it?.operator_id;
      // Leader rule (explicit): the very first operator appearing in the report is the leader.
      if (!leaderOperatorId) {
        const k = String(opId || "").trim();
        if (k) leaderOperatorId = k;
      }
      const h =
        it?.tempo_hours != null && Number.isFinite(Number(it?.tempo_hours))
          ? Number(it.tempo_hours)
          : it?.tempo_raw
          ? parseNumeric(String(it.tempo_raw))
          : 0;
      add(opId, h);
    }
  }

  // stable UX: 0.1h
  Object.keys(out).forEach((k) => {
    const v = Number(out[k]);
    out[k] = Math.round(v * 10) / 10;
  });

  return { byOperatorId: out, leaderOperatorId };
}

export function useCapoHoursMemory({
  shipId,
  reportDate,
  rows,
}: {
  shipId: unknown;
  reportDate: unknown;
  rows: Row[];
}): void {
  useEffect(() => {
    if (!shipId || !reportDate) return;

    try {
      const { byOperatorId, leaderOperatorId } = computeHoursAndLeader(rows);
      const key = `core-rapportino-hours::${String(shipId)}::${String(reportDate)}`;
      const payload = {
        shipId: String(shipId),
        reportDate: String(reportDate),
        updatedAt: Date.now(),
        byOperatorId,
        leaderOperatorId,
      };

      window.localStorage.setItem(key, JSON.stringify(payload));
      window.dispatchEvent(new Event("core:rapportino-hours-updated"));
    } catch {
      // UX only: never break capo flow
    }
  }, [shipId, reportDate, rows]);
}

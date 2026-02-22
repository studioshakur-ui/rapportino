// /src/components/ApparatoCaviPopover.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/**
 * APPARATO CAVI — Popover (CORE 1.0) — naval-grade status
 *
 * FIXES:
 * - Header dot MUST reflect real content status, not "filtered vs total".
 *   GREEN  -> all cables are P for the chosen side
 *   YELLOW -> mix (some P, some not-P)
 *   RED    -> 0 P (or 0 rows)
 *
 * IMPORTANT:
 * - "per-side" logic only if BOTH progress_percent and progress_side are persisted.
 * - Otherwise fallback on INCA global situazione (NULL => NP).
 */

function badgeClass(s: unknown): string {
  switch (s) {
    case "P":
      return "chip chip-success";
    case "T":
      return "chip chip-info";
    case "R":
      return "chip chip-alert";
    case "B":
      return "chip chip-danger";
    case "E":
      return "chip chip-danger";
    default:
      return "chip chip-status";
  }
}

function labelSituazione(s: unknown): string {
  const v = s == null ? "" : String(s).trim();
  return v ? v : "NP";
}

function normalizeKey(raw: unknown): string {
  const v = raw == null ? "" : String(raw).trim();
  return v ? v : "NP";
}

function normalizeProgressPercent(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n === 50 || n === 70 || n === 100) return n;
  return null;
}

function normalizeProgressSideNullable(raw: unknown): "DA" | "A" | null {
  const v = raw == null ? "" : String(raw).trim();
  if (v === "DA" || v === "A") return v;
  return null; // IMPORTANT: no default
}

type IncaCavoRow = Record<string, unknown> & {
  id?: string | number;
  codice?: string;
  tipo?: string;
  marca_cavo?: string;
  pagina_pdf?: string | number | null;
  metri_teo?: string | number | null;
  situazione?: string | null;
  progress_percent?: number | string | null;
  progress_side?: string | null;
};

function situazionePerSide(row: IncaCavoRow, side: "DA" | "A"): string {
  const percent = normalizeProgressPercent(row?.progress_percent);
  const fromSide = normalizeProgressSideNullable(row?.progress_side);

  // Apply "per-side" logic only if both are present (persisted)
  if (percent != null && fromSide) {
    if (percent >= 100) return "P";
    if (percent >= 50) return fromSide === side ? "P" : "T";
  }

  // Fallback: INCA global situazione
  const global = normalizeKey(row?.situazione);
  return global === "NP" ? "NP" : global;
}

export default function ApparatoCaviPopover({
  open,
  anchorRect, // kept for API compatibility (optional)
  incaFileId,
  side, // "DA" | "A"
  apparato,
  onClose,
}: {
  open: boolean;
  anchorRect?: DOMRect | null;
  incaFileId?: string | null;
  side: "DA" | "A";
  apparato?: string | null;
  onClose?: () => void;
}) {
  void anchorRect;
  const [loading, setLoading] = useState<boolean>(false);
  const [rows, setRows] = useState<IncaCavoRow[]>([]);
  const [q, setQ] = useState<string>("");
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    if (!open || !incaFileId || !apparato) return;

    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const field = side === "A" ? "apparato_a" : "apparato_da";

        const { data, error } = await supabase
          .from("inca_cavi")
          .select("id,marca_cavo,codice,situazione,metri_teo,pagina_pdf,progress_percent,progress_side,tipo")
          .eq("inca_file_id", incaFileId)
          .eq(field, apparato)
          .order("codice", { ascending: true });

        if (error) throw error;
        if (alive) setRows(Array.isArray(data) ? (data as IncaCavoRow[]) : []);
      } catch (e) {
        console.error("[ApparatoCaviPopover] load error:", e);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [open, incaFileId, apparato, side]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (rows || []).filter((r) => {
      const s = situazionePerSide(r, side);

      if (filter && s !== filter) return false;
      if (!qq) return true;

      return `${r.tipo || ""} ${r.marca_cavo || ""} ${r.codice || ""} ${r.pagina_pdf || ""}`
        .toLowerCase()
        .includes(qq);
    });
  }, [rows, q, filter, side]);

  const total = rows.length;
  const visible = filtered.length;

  // Real status dot (based on ALL rows, not only filtered)
  const headerStatus = useMemo(() => {
    if (loading) return "YELLOW";
    if (total <= 0) return "RED";

    let pCount = 0;
    for (const r of rows) {
      const s = situazionePerSide(r, side);
      if (s === "P") pCount += 1;
    }

    if (pCount <= 0) return "RED";
    if (pCount === total) return "GREEN";
    return "YELLOW";
  }, [loading, total, rows, side]);

  const statusDot =
    headerStatus === "GREEN" ? "dot-good" : headerStatus === "YELLOW" ? "dot-warn" : "dot-bad";

  const sideLabel = side === "DA" ? "APP PARTENZA" : "APP ARRIVO";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div
        className="absolute inset-0 theme-overlay backdrop-blur-md"
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      />

      <div
        className={[
          "relative w-[min(760px,calc(100vw-24px))] max-h-[90vh]",
          "rounded-2xl theme-panel shadow-2xl",
          "flex flex-col overflow-hidden",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
      >
        {/* header */}
        <div className="px-4 py-3 flex justify-between items-start border-b theme-border theme-panel-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">{sideLabel}</span>
              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
              <span className="text-[11px] theme-text-muted">
                <span className="theme-text font-semibold">{visible}</span> / {total}
              </span>
            </div>
            <div className="text-lg font-semibold theme-text mt-0.5 truncate">{apparato}</div>
          </div>

          <button
            onClick={onClose}
            className={[
              "btn-instrument rounded-xl",
              "px-3 py-2 text-[12px] font-semibold",
              "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
            ].join(" ")}
          >
            Chiudi
          </button>
        </div>

        {/* controls */}
        <div className="px-4 py-3 border-b theme-border theme-panel-2 flex flex-col sm:flex-row gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca…"
            className={[
              "flex-1 rounded-xl theme-input",
              "px-3 py-2 text-[13px]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
            ].join(" ")}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={[
              "w-full sm:w-[160px] rounded-xl theme-input",
              "px-3 py-2 text-[13px]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
            ].join(" ")}
          >
            <option value="">Tutte</option>
            <option value="P">P</option>
            <option value="NP">NP</option>
            <option value="T">T</option>
            <option value="R">R</option>
            <option value="B">B</option>
            <option value="E">E</option>
          </select>
        </div>

        {/* list */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <tbody className="divide-y theme-border">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 theme-text-muted">Caricamento…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 theme-text-muted">Nessun cavo visibile</td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const s = situazionePerSide(r, side);
                  // In UI we show "Tipo cavo" if present, else fallback to codice
                  const title = r.tipo || r.marca_cavo || r.codice || "—";
                  const metri = r.metri_teo ?? "—";
                  const pagina = r.pagina_pdf ? `p.${r.pagina_pdf}` : "—";

                  return (
                    <tr key={r.id} className="hover:bg-[var(--accent-soft)]/40">
                      <td className="px-4 py-3 theme-text">
                        <div className="font-semibold truncate">{title}</div>
                        {r.codice && title !== r.codice ? (
                          <div className="mt-0.5 text-[12px] theme-text-muted truncate">{r.codice}</div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex rounded-lg border px-2 py-[2px] font-semibold",
                            badgeClass(s === "NP" ? null : s),
                          ].join(" ")}
                        >
                          {labelSituazione(s === "NP" ? null : s)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right theme-text tabular-nums">
                        <div>{metri}</div>
                        <div className="text-[12px] theme-text-muted">{pagina}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

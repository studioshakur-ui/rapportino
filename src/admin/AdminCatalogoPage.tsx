// src/admin/AdminCatalogoPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAdminConsole, type AdminSearchItem } from "./AdminConsoleContext";

type ActivityType = "QUANTITATIVE" | "FORFAIT" | "QUALITATIVE";
type ActivityUnit = "MT" | "MQ" | "PZ" | "COEFF" | "NONE";

type Ship = {
  id: string;
  code: string | null;
  name: string | null;
  costr: string | null;
  commessa: string | null;
  is_active: boolean | null;
};

type CatalogoAttivita = {
  id: string;
  categoria: string;
  descrizione: string;
  activity_type: ActivityType;
  unit: ActivityUnit;
  previsto_value: number | null;
  is_active: boolean;
  synonyms: string[] | null;
  created_at: string;
  updated_at: string;
};

type CatalogoShipCommessaRow = {
  id: string;
  ship_id: string;
  commessa: string;
  activity_id: string;
  previsto_value: number | null;
  unit_override: ActivityUnit | null;
  is_active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
};

type DraftEntry = {
  is_active: boolean;
  previsto_value: number | null;
  unit_override: ActivityUnit | "";
  note: string;
};

type UpsertScopeOpts = {
  toast?: boolean;
};

function cn(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(" ");
}

function safeText(v: unknown): string {
  return (v == null ? "" : String(v)).trim();
}

function lowerTrim(v: unknown): string {
  return safeText(v).toLowerCase();
}

function fmtNum(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function parseNumOrNull(v: unknown): number | null {
  const s = safeText(v);
  if (!s) return null;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const UNIT_OPTIONS: ActivityUnit[] = ["MT", "MQ", "PZ", "COEFF", "NONE"];

export default function AdminCatalogoPage(): JSX.Element {
  const { setConfig, resetConfig, registerSearchItems, clearSearchItems, setRecentItems } = useAdminConsole();
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string>(""); // `${activity_id}`
  const [err, setErr] = useState<string>("");

  // context
  const [ships, setShips] = useState<Ship[]>([]);
  const [shipId, setShipId] = useState<string>("");
  const [commessa, setCommessa] = useState<string>("");

  // data
  const [globalActs, setGlobalActs] = useState<CatalogoAttivita[]>([]);
  const [scopeRows, setScopeRows] = useState<CatalogoShipCommessaRow[]>([]); // rows from catalogo_ship_commessa_attivita
  const scopeByActivityId = useMemo(() => {
    const m = new Map<string, CatalogoShipCommessaRow>();
    for (const r of scopeRows) m.set(String(r.activity_id), r);
    return m;
  }, [scopeRows]);

  // ui
  const [q, setQ] = useState<string>("");
  const [onlyScoped, setOnlyScoped] = useState<boolean>(false);
  const [onlyActive, setOnlyActive] = useState<boolean>(true);

  // draft edits stored by activity_id
  const [draft, setDraft] = useState<Record<string, DraftEntry>>({}); // { [activityId]: {is_active, previsto_value, unit_override, note} }

  const effectiveShip = useMemo(() => {
    return ships.find((s) => String(s.id) === String(shipId)) || null;
  }, [ships, shipId]);

  const canScope = !!shipId && !!safeText(commessa);

  async function loadAll(): Promise<void> {
    setLoading(true);
    setErr("");
    try {
      const [{ data: shipsData, error: shipsErr }, { data: actsData, error: actsErr }] = await Promise.all([
        supabase.from("ships").select("id,code,name,costr,commessa,is_active").order("code", { ascending: true }),
        supabase
          .from("catalogo_attivita")
          .select("id,categoria,descrizione,activity_type,unit,previsto_value,is_active,synonyms,created_at,updated_at")
          .order("categoria", { ascending: true })
          .order("descrizione", { ascending: true }),
      ]);

      if (shipsErr) throw shipsErr;
      if (actsErr) throw actsErr;

      setShips(Array.isArray(shipsData) ? (shipsData as Ship[]) : []);
      setGlobalActs(Array.isArray(actsData) ? (actsData as CatalogoAttivita[]) : []);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[AdminCatalogoPage] loadAll error:", e);
      setErr(e?.message || "Impossibile caricare i dati.");
    } finally {
      setLoading(false);
    }
  }

  async function loadScope(shipIdArg: string, commessaArg: string): Promise<void> {
    const sid = String(shipIdArg || "");
    const c = safeText(commessaArg);
    if (!sid || !c) {
      setScopeRows([]);
      setDraft({});
      return;
    }

    setErr("");
    try {
      const { data, error } = await supabase
        .from("catalogo_ship_commessa_attivita")
        .select("id,ship_id,commessa,activity_id,previsto_value,unit_override,is_active,note,created_at,updated_at,created_by")
        .eq("ship_id", sid)
        .eq("commessa", c);

      if (error) throw error;

      const rows = Array.isArray(data) ? (data as CatalogoShipCommessaRow[]) : [];
      setScopeRows(rows);

      const nextDraft: Record<string, DraftEntry> = {};
      for (const r of rows) {
        const aid = String(r.activity_id);
        nextDraft[aid] = {
          is_active: !!r.is_active,
          previsto_value: r.previsto_value ?? null,
          unit_override: (r.unit_override || "") as ActivityUnit | "",
          note: r.note || "",
        };
      }
      setDraft(nextDraft);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[AdminCatalogoPage] loadScope error:", e);
      setErr(e?.message || "Impossibile caricare il catalogo per Ship/Commessa.");
      setScopeRows([]);
      setDraft({});
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const searchItems = useMemo<AdminSearchItem[]>(() => {
    return globalActs.map((a) => ({
      id: String(a.id),
      entity: "Catalogo",
      title: safeText(a.descrizione) || "—",
      subtitle: safeText(a.categoria) || undefined,
      route: "/admin/catalogo",
      tokens: [a.categoria, a.descrizione, ...(Array.isArray(a.synonyms) ? a.synonyms : [])]
        .filter(Boolean)
        .join(" "),
      updatedAt: a.updated_at || a.created_at || null,
      badge: a.is_active ? "ACTIVE" : "OFF",
      badgeTone: a.is_active ? "emerald" : "slate",
    }));
  }, [globalActs]);

  const recent = useMemo(() => {
    const sorted = [...globalActs].sort((a, b) =>
      String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""))
    );
    return sorted.slice(0, 5).map((a) => ({
      id: String(a.id),
      title: safeText(a.descrizione) || "—",
      subtitle: safeText(a.categoria) || undefined,
      route: "/admin/catalogo",
      timeLabel: a.updated_at || a.created_at || undefined,
    }));
  }, [globalActs]);

  useEffect(() => {
    setConfig({ title: "Catalogo", searchPlaceholder: "Cerca attività, categorie, sinonimi…" });
    return () => resetConfig();
  }, [setConfig, resetConfig]);

  useEffect(() => {
    registerSearchItems("Catalogo", searchItems);
    return () => clearSearchItems("Catalogo");
  }, [registerSearchItems, clearSearchItems, searchItems]);

  useEffect(() => {
    setRecentItems(recent);
    return () => setRecentItems([]);
  }, [setRecentItems, recent]);

  useEffect(() => {
    loadScope(shipId, commessa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, commessa]);

  const filtered = useMemo(() => {
    const qq = lowerTrim(q);
    const rows = Array.isArray(globalActs) ? globalActs : [];
    return rows.filter((a) => {
      if (!a?.id) return false;

      if (onlyActive) {
        const scoped = scopeByActivityId.get(String(a.id));
        const active = scoped ? !!scoped.is_active : !!a.is_active;
        if (!active) return false;
      }

      if (onlyScoped) {
        if (!scopeByActivityId.has(String(a.id))) return false;
      }

      if (!qq) return true;

      const cat = lowerTrim(a.categoria);
      const desc = lowerTrim(a.descrizione);
      const syn = Array.isArray(a.synonyms) ? a.synonyms : [];
      const hay = [cat, desc, ...syn.map((s) => lowerTrim(s))].join(" ");
      return hay.includes(qq);
    });
  }, [globalActs, q, onlyScoped, onlyActive, scopeByActivityId]);

  function getDraftFor(activityId: string): DraftEntry {
    const aid = String(activityId);
    if (draft[aid]) return draft[aid];

    const scoped = scopeByActivityId.get(aid);
    if (scoped) {
      return {
        is_active: !!scoped.is_active,
        previsto_value: scoped.previsto_value ?? null,
        unit_override: (scoped.unit_override || "") as ActivityUnit | "",
        note: scoped.note || "",
      };
    }

    return {
      is_active: true,
      previsto_value: null,
      unit_override: "",
      note: "",
    };
  }

  function setDraftFor(activityId: string, patch: Partial<DraftEntry>): void {
    const aid = String(activityId);
    setDraft((prev) => {
      const curr = prev[aid] || getDraftFor(aid);
      return {
        ...prev,
        [aid]: { ...curr, ...patch },
      };
    });
  }

  async function upsertScope(activity: CatalogoAttivita, opts: UpsertScopeOpts = {}): Promise<void> {
    const sid = String(shipId || "");
    const c = safeText(commessa);
    const aid = String(activity?.id || "");
    if (!sid || !c || !aid) return;

    const d = getDraftFor(aid);

    const payload = {
      ship_id: sid,
      commessa: c,
      activity_id: aid,
      is_active: d.is_active !== false,
      previsto_value: parseNumOrNull(d.previsto_value),
      unit_override: safeText(d.unit_override) ? (safeText(d.unit_override) as ActivityUnit) : null,
      note: safeText(d.note) ? safeText(d.note) : null,
    };

    setSavingKey(aid);
    setErr("");
    try {
      const { error } = await supabase.from("catalogo_ship_commessa_attivita").upsert(payload, {
        onConflict: "ship_id,commessa,activity_id",
      });

      if (error) throw error;

      await loadScope(sid, c);

      if (opts?.toast) {
        // intentionally minimal
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[AdminCatalogoPage] upsertScope error:", e);
      setErr(e?.message || "Errore salvataggio catalogo (Ship/Commessa).");
    } finally {
      setSavingKey("");
    }
  }

  async function deactivateScope(activity: CatalogoAttivita): Promise<void> {
    const sid = String(shipId || "");
    const c = safeText(commessa);
    const aid = String(activity?.id || "");
    if (!sid || !c || !aid) return;

    setDraftFor(aid, { is_active: false });
    await upsertScope(activity);
  }

  function applyGlobalPrevisto(activity: CatalogoAttivita): void {
    const aid = String(activity?.id || "");
    const pv = activity?.previsto_value ?? null;
    setDraftFor(aid, { previsto_value: pv });
  }

  function applyGlobalUnit(activity: CatalogoAttivita): void {
    const aid = String(activity?.id || "");
    const u = safeText(activity?.unit);
    setDraftFor(aid, { unit_override: "" });
    if (u) {
      // keep override blank; effective = global
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl theme-panel-2 p-4">
        <div className="text-[12px] theme-text-muted">Caricamento…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl theme-panel-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="kicker">Catalogo · Ship + Commessa</div>
            <div className="mt-1 text-[14px] font-semibold theme-text">Gestione catalogo operativo (scopato)</div>
            <div className="mt-1 text-[12px] theme-text-muted">
              Regola canonica: il Capo vede solo le attività attive per <span className="theme-text">Ship</span> e{" "}
              <span className="theme-text">Commessa</span>.
            </div>
          </div>

          <button
            type="button"
            onClick={loadAll}
            className="rounded-full border theme-border bg-[var(--panel2)] px-3 py-2 text-[12px] font-semibold theme-text hover:bg-[var(--panel)]"
          >
            Ricarica
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_240px_240px] gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.20em] theme-text-muted mb-2">Ship</div>
            <select
              value={shipId}
              onChange={(e) => setShipId(e.target.value)}
              className={cn(
                "w-full rounded-2xl border theme-border bg-[var(--panel2)]",
                "px-3 py-3 text-[13px] theme-text",
                "outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              )}
            >
              <option value="">Seleziona Ship…</option>
              {ships.map((s) => {
                const label = `${safeText(s.code)} · ${safeText(s.name) || "Ship"}${
                  safeText(s.costr) ? ` (COSTR ${safeText(s.costr)})` : ""
                }`;
                return (
                  <option key={String(s.id)} value={String(s.id)}>
                    {label}
                  </option>
                );
              })}
            </select>
            {effectiveShip ? (
              <div className="mt-2 text-[11px] theme-text-muted">
                Selezionato:{" "}
                <span className="theme-text font-semibold">
                  {safeText(effectiveShip.code)} · {safeText(effectiveShip.name)}
                </span>{" "}
                {safeText(effectiveShip.commessa) ? (
                  <span className="theme-text-muted">· ships.commessa={safeText(effectiveShip.commessa)}</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.20em] theme-text-muted mb-2">Commessa</div>
            <input
              value={commessa}
              onChange={(e) => setCommessa(e.target.value)}
              placeholder="Es: SDC"
              className={cn(
                "w-full rounded-2xl border theme-border bg-[var(--panel2)]",
                "px-3 py-3 text-[13px] theme-text",
                "outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              )}
            />
            <div className="mt-2 text-[11px] theme-text-muted">
              Commessa è un contesto operativo del rapportino (es: SDC). Non dipende dal campo ships.commessa.
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              disabled={!canScope}
              onClick={() => loadScope(shipId, commessa)}
              className={cn(
                "w-full rounded-2xl border px-3 py-3 text-[13px] font-semibold",
                canScope
                  ? "theme-border bg-[var(--panel2)] theme-text hover:bg-[var(--panel)]"
                  : "theme-border bg-[var(--panel2)] theme-text-muted cursor-not-allowed"
              )}
            >
              Carica scope
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-3 rounded-2xl border border-[var(--role-danger-border)] bg-[var(--role-danger-soft)] px-3 py-2 text-[12px] text-[var(--role-danger-ink)]">
            {err}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl theme-panel-2 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.20em] theme-text-muted mb-2">Filtro</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca categoria / descrizione / sinonimi…"
              className={cn(
                "w-full rounded-2xl border theme-border bg-[var(--panel2)]",
                "px-3 py-3 text-[13px] theme-text",
                "outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-[12px] theme-text-muted">
              <input
                type="checkbox"
                checked={onlyScoped}
                onChange={(e) => setOnlyScoped(e.target.checked)}
                className="h-4 w-4 rounded theme-border bg-[var(--panel2)]"
              />
              Solo scoped
            </label>

            <label className="flex items-center gap-2 text-[12px] theme-text-muted">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="h-4 w-4 rounded theme-border bg-[var(--panel2)]"
              />
              Solo attivi
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border theme-border">
          <table className="min-w-[1100px] w-full text-left">
            <thead className="theme-table-head">
              <tr className="text-[11px] uppercase tracking-[0.18em]">
                <th className="px-3 py-3">Categoria</th>
                <th className="px-3 py-3">Attività</th>
                <th className="px-3 py-3">Stato</th>
                <th className="px-3 py-3">Previsto</th>
                <th className="px-3 py-3">Unit</th>
                <th className="px-3 py-3">Nota</th>
                <th className="px-3 py-3 text-right">Azioni</th>
              </tr>
            </thead>

            <tbody className="divide-y theme-border">
              {filtered.map((a) => {
                const aid = String(a.id);
                const scoped = scopeByActivityId.get(aid) || null;
                const d = getDraftFor(aid);

                const effectiveActive = scoped ? !!scoped.is_active : !!a.is_active;
                const effectiveUnit = safeText(d.unit_override) ? safeText(d.unit_override) : safeText(a.unit);
                const effectivePrevisto = d.previsto_value ?? null;

                const isScoped = !!scoped;
                const rowDisabled = !canScope;

                return (
                  <tr key={aid} className={cn("text-[13px]", rowDisabled ? "opacity-60" : "")}>
                    <td className="px-3 py-3 theme-text-muted whitespace-nowrap">{safeText(a.categoria)}</td>
                    <td className="px-3 py-3 theme-text">{safeText(a.descrizione)}</td>

                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
                          effectiveActive ? "badge-success" : "badge-neutral"
                        )}
                      >
                        {effectiveActive ? "ACTIVE" : "OFF"}
                      </span>
                      {isScoped ? (
                        <span className="ml-2 text-[11px] theme-text-muted">scoped</span>
                      ) : (
                        <span className="ml-2 text-[11px] theme-text-muted">global</span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <input
                        value={fmtNum(effectivePrevisto)}
                        onChange={(e) => setDraftFor(aid, { previsto_value: parseNumOrNull(e.target.value) })}
                        disabled={rowDisabled}
                        className={cn(
                          "w-[120px] rounded-xl px-2 py-2 text-[13px] outline-none theme-input",
                          "focus:ring-2 focus:ring-[var(--accent)]/30",
                          rowDisabled ? "cursor-not-allowed" : ""
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => applyGlobalPrevisto(a)}
                        disabled={rowDisabled}
                        className={cn(
                          "ml-2 rounded-xl border px-2 py-2 text-[12px] font-semibold",
                          "theme-border bg-[var(--panel2)] theme-text hover:bg-[var(--panel)]",
                          rowDisabled ? "cursor-not-allowed" : ""
                        )}
                      >
                        =Global
                      </button>
                    </td>

                    <td className="px-3 py-3">
                      <select
                        value={safeText(d.unit_override) ? safeText(d.unit_override) : ""}
                        onChange={(e) => setDraftFor(aid, { unit_override: (e.target.value as ActivityUnit) || "" })}
                        disabled={rowDisabled}
                        className={cn(
                          "w-[140px] rounded-xl px-2 py-2 text-[13px] outline-none theme-input",
                          "focus:ring-2 focus:ring-[var(--accent)]/30",
                          rowDisabled ? "cursor-not-allowed" : ""
                        )}
                      >
                        <option value="">(default: {safeText(a.unit)})</option>
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => applyGlobalUnit(a)}
                        disabled={rowDisabled}
                        className={cn(
                          "ml-2 rounded-xl border px-2 py-2 text-[12px] font-semibold",
                          "theme-border bg-[var(--panel2)] theme-text hover:bg-[var(--panel)]",
                          rowDisabled ? "cursor-not-allowed" : ""
                        )}
                      >
                        =Global
                      </button>

                      <div className="mt-1 text-[11px] theme-text-muted">eff: {safeText(effectiveUnit)}</div>
                    </td>

                    <td className="px-3 py-3">
                      <input
                        value={d.note || ""}
                        onChange={(e) => setDraftFor(aid, { note: e.target.value })}
                        disabled={rowDisabled}
                        placeholder="Nota…"
                        className={cn(
                          "w-[260px] rounded-xl px-2 py-2 text-[13px] outline-none theme-input",
                          "focus:ring-2 focus:ring-[var(--accent)]/30",
                          rowDisabled ? "cursor-not-allowed" : ""
                        )}
                      />
                    </td>

                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => upsertScope(a)}
                        disabled={rowDisabled || savingKey === aid}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                          "theme-border bg-[var(--panel2)] theme-text hover:bg-[var(--panel)]",
                          rowDisabled || savingKey === aid ? "cursor-not-allowed opacity-60" : ""
                        )}
                      >
                        {savingKey === aid ? "Salvo…" : "Salva"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deactivateScope(a)}
                        disabled={rowDisabled || savingKey === aid}
                        className={cn(
                          "ml-2 rounded-xl border px-3 py-2 text-[12px] font-semibold",
                          "theme-border bg-[var(--panel2)] theme-text hover:bg-[var(--panel)]",
                          rowDisabled || savingKey === aid ? "cursor-not-allowed opacity-60" : ""
                        )}
                      >
                        OFF
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[12px] theme-text-muted">
                    Nessun risultato.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// src/admin/AdminPerimetersPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import { getInitialLang, t } from "../i18n/coreI18n";
import { useAdminConsole } from "./AdminConsoleContext";

/**
 * ADMIN · PERIMETRI
 *
 * Goal (CANONICAL):
 * - An operator created in Admin MUST be linked to a ship perimeter
 *   to become visible in Manager → Assegnazioni.
 *
 * Chain of truth:
 * - Admin creates operator in "operators" (identity mandatory: cognome, nome, birth_date)
 * - Admin links operator to a ship via "ship_operators" (active=true)
 * - Manager pool reads only perimeter operators: ship_managers → ship_operators
 */

type Lang = "it" | "fr" | "en";

type Ship = {
  ship_id: string;
  code: string;
  name: string;
  costr: string;
  commessa: string;
};

type PerimOperator = {
  operator_id: string;
  display_name: string;
  roles: string[];
  active: boolean;
  role_tag: string | null;
  created_at?: string | null;
};

type OperatorPick = {
  id: string;
  display_name: string;
  roles: string[];
  identity_ok: boolean;
};

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function cardClass(): string {
  return cn("rounded-2xl theme-panel");
}

function btnBase(): string {
  return cn(
    "inline-flex items-center justify-center rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

function btnGhost(): string {
  return cn(btnBase(), "theme-border theme-text bg-[var(--panel2)] hover:bg-[var(--panel)]");
}

function btnPrimary(): string {
  return cn(btnBase(), "accent-soft");
}

function inputClass(): string {
  return cn(
    "w-full rounded-2xl px-3 py-2.5 text-[13px]",
    "theme-input placeholder:theme-text-muted",
    "outline-none focus:ring-2 focus:ring-sky-500/35"
  );
}

function pill(tone: "sky" | "emerald" | "amber" | "slate"): string {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-[0.16em]";
  if (tone === "emerald") return cn(base, "badge-success");
  if (tone === "amber") return cn(base, "badge-warning");
  if (tone === "sky") return cn(base, "badge-info");
  return cn(base, "badge-neutral");
}

function safeText(v: unknown): string {
  return (v == null ? "" : String(v)).trim();
}

function dedupRoles(roles: string[]): string[] {
  const s = new Set<string>();
  roles.forEach((r) => {
    const x = safeText(r).toUpperCase();
    if (x) s.add(x);
  });
  return Array.from(s.values()).sort((a, b) => a.localeCompare(b));
}

function formatSupabaseError(e: unknown): { short: string; debug: any } {
  const x: any = e ?? {};
  const message = safeText(x?.message) || safeText(x?.error_description) || safeText(x?.hint) || safeText(x?.details);
  const code = safeText(x?.code);
  const status = x?.status != null ? String(x.status) : "";
  const parts = [message, code ? `code=${code}` : "", status ? `status=${status}` : ""].filter(Boolean);
  return { short: parts.join(" · ") || "Errore sconosciuto.", debug: x };
}

export default function AdminPerimetersPage({ isDark = true }: { isDark?: boolean }): JSX.Element {
  void isDark;
  const [lang] = useState<Lang>(() => getInitialLang() as Lang);
  const { setConfig, resetConfig, registerSearchItems, clearSearchItems, setRecentItems } = useAdminConsole();

  const [ships, setShips] = useState<Ship[]>([]);
  const [selectedShipId, setSelectedShipId] = useState<string>("");
  const [loadingShips, setLoadingShips] = useState(false);

  const [perimOps, setPerimOps] = useState<PerimOperator[]>([]);
  const [loadingPerimOps, setLoadingPerimOps] = useState(false);

  const [operatorPool, setOperatorPool] = useState<OperatorPick[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);

  // Add operator UI
  const [opQuery, setOpQuery] = useState<string>("");
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [roleTag, setRoleTag] = useState<string>("");
  const [busyAdd, setBusyAdd] = useState(false);

  // Feedback
  const [err, setErr] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<number | null>(null);

  const clearToastSoon = () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 1800);
  };

  const setToastSoft = (msg: string) => {
    setToast(msg);
    clearToastSoon();
  };

  const scopeLabel = useMemo(() => {
    const s = ships.find((x) => x.ship_id === selectedShipId);
    if (!s) return "—";
    return `${safeText(s.commessa)} · ${safeText(s.code)}`;
  }, [ships, selectedShipId]);

  // ===== Load ships =====
  const loadShips = async () => {
    setLoadingShips(true);
    setErr("");
    try {
      // IMPORTANT:
      // Supabase/PostgREST in this deployment rejects some multi-column `order=...` payloads (400).
      // We keep the server query minimal and sort deterministically client-side.
      // NOTE:
      // The canonical ships schema in this repo is: id, code, name, costr, commessa, is_active
      // Other Admin pages (Catalogo, ShipContext) rely on `code` and `name`.
      // Using `ship_code/ship_name` causes PostgREST 400 (unknown columns) and blocks the entire Admin UI.
      const { data, error } = await supabase.from("ships").select("id, code, name, costr, commessa");
      if (error) throw error;

      const list: Ship[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        ship_id: r.id,
        code: safeText(r.code),
        name: safeText(r.name),
        costr: safeText(r.costr),
        commessa: safeText(r.commessa),
      }));

      list.sort((a, b) => {
        const ca = safeText(a.commessa);
        const cb = safeText(b.commessa);
        const c1 = ca.localeCompare(cb);
        if (c1 !== 0) return c1;
        const sa = safeText(a.code);
        const sb = safeText(b.code);
        return sa.localeCompare(sb);
      });

      setShips(list);
      if (!selectedShipId && list.length > 0) setSelectedShipId(list[0].ship_id);
    } catch (e) {
      const fe = formatSupabaseError(e);
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] loadShips error:", fe.debug);
      setShips([]);
      setErr(`Impossibile caricare elenco navi. ${fe.short}`);
    } finally {
      setLoadingShips(false);
    }
  };

  // ===== Load operator pool (for selection) =====
  const loadOperatorPool = async () => {
    setLoadingPool(true);
    setErr("");
    try {
      // Use the Admin list view (already used in AdminOperatorsPage)
      const { data, error } = await supabase
        .from("operators_admin_list_v1")
        .select("id, display_name, roles, is_identity_incomplete")
        .order("display_name", { ascending: true })
        .limit(2000);
      if (error) throw error;

      const list: OperatorPick[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        id: r.id,
        display_name: safeText(r.display_name) || "—",
        roles: Array.isArray(r.roles) ? dedupRoles(r.roles) : [],
        identity_ok: !r.is_identity_incomplete,
      }));

      setOperatorPool(list);
    } catch (e) {
      const fe = formatSupabaseError(e);
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] loadOperatorPool error:", fe.debug);
      setOperatorPool([]);
      setErr(`Impossibile caricare pool operatori (view operators_admin_list_v1). ${fe.short}`);
    } finally {
      setLoadingPool(false);
    }
  };

  // ===== Load perimeter operators for selected ship =====
  const loadPerimeterOperators = async (shipId: string) => {
    if (!shipId) {
      setPerimOps([]);
      return;
    }

    setLoadingPerimOps(true);
    setErr("");
    try {
      const { data, error } = await supabase
        .from("ship_operators")
        .select(
          `
          operator_id,
          active,
          role_tag,
          created_at,
          operators:operator_id (
            id,
            cognome,
            nome,
            name,
            roles
          )
        `
        )
        .eq("ship_id", shipId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const list: PerimOperator[] = (Array.isArray(data) ? data : []).map((r: any) => {
        const o = r?.operators;
        const display = safeText(`${safeText(o?.cognome)} ${safeText(o?.nome)}`) || safeText(o?.name) || "—";
        return {
          operator_id: r.operator_id,
          display_name: display,
          roles: Array.isArray(o?.roles) ? dedupRoles(o.roles) : [],
          active: r.active !== false,
          role_tag: r.role_tag ?? null,
          created_at: r.created_at ?? null,
        };
      });

      setPerimOps(list);
    } catch (e) {
      const fe = formatSupabaseError(e);
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] loadPerimeterOperators error:", fe.debug);
      setPerimOps([]);
      setErr(`Impossibile caricare operatori del perimetro (ship_operators). ${fe.short}`);
    } finally {
      setLoadingPerimOps(false);
    }
  };

  useEffect(() => {
    loadShips();
    loadOperatorPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchItems = useMemo(() => {
    const shipItems = ships.map((s) => ({
      id: `ship-${s.ship_id}`,
      entity: "Perimetri",
      title: `${safeText(s.commessa)} · ${safeText(s.code)}`,
      subtitle: safeText(s.name) || undefined,
      route: "/admin/perimetri",
      tokens: [s.commessa, s.code, s.name, s.costr].filter(Boolean).join(" "),
    }));

    const perimItems = perimOps.map((o) => ({
      id: `perim-${o.operator_id}`,
      entity: "Perimetri",
      title: o.display_name || "—",
      subtitle: o.roles.length ? o.roles.join(", ") : undefined,
      route: "/admin/perimetri",
      tokens: [o.display_name, o.role_tag, o.roles.join(" ")].filter(Boolean).join(" "),
      updatedAt: o.created_at || null,
      badge: o.active ? "ACTIVE" : "OFF",
      badgeTone: o.active ? "emerald" : "amber",
    }));

    return [...shipItems, ...perimItems];
  }, [ships, perimOps]);

  const recent = useMemo(() => {
    const sorted = [...perimOps].sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
    );
    return sorted.slice(0, 5).map((o) => ({
      id: o.operator_id,
      title: o.display_name || "—",
      subtitle: o.role_tag || "Perimetro",
      route: "/admin/perimetri",
      timeLabel: o.created_at || undefined,
    }));
  }, [perimOps]);

  useEffect(() => {
    setConfig({ title: "Perimetri", searchPlaceholder: "Cerca navi, operatori, perimetri…" });
    return () => resetConfig();
  }, [setConfig, resetConfig]);

  useEffect(() => {
    registerSearchItems("Perimetri", searchItems);
    return () => clearSearchItems("Perimetri");
  }, [registerSearchItems, clearSearchItems, searchItems]);

  useEffect(() => {
    setRecentItems(recent);
    return () => setRecentItems([]);
  }, [setRecentItems, recent]);

  useEffect(() => {
    if (!selectedShipId) return;
    loadPerimeterOperators(selectedShipId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShipId]);

  // ===== UI derived =====
  const selectedShip = useMemo(() => ships.find((s) => s.ship_id === selectedShipId) || null, [ships, selectedShipId]);
  const selectedOp = useMemo(
    () => operatorPool.find((o) => o.id === selectedOperatorId) || null,
    [operatorPool, selectedOperatorId]
  );

  const suggestList = useMemo(() => {
    const q = safeText(opQuery).toLowerCase();
    const base = operatorPool;
    if (!q) return base.slice(0, 12);
    return base.filter((o) => safeText(o.display_name).toLowerCase().includes(q)).slice(0, 12);
  }, [operatorPool, opQuery]);

  const alreadyInPerimeter = useMemo(() => {
    if (!selectedOperatorId) return false;
    return perimOps.some((x) => x.operator_id === selectedOperatorId && x.active);
  }, [perimOps, selectedOperatorId]);

  // ===== Mutations =====
  const addToPerimeter = async () => {
    if (!selectedShipId) {
      setErr("Seleziona una nave.");
      return;
    }
    if (!selectedOperatorId) {
      setErr("Seleziona un operatore dal pool.");
      return;
    }
    if (!selectedOp?.identity_ok) {
      setErr("Identità incompleta: completa Cognome/Nome/Data nascita in Admin → Operatori.");
      return;
    }
    if (alreadyInPerimeter) {
      setErr("Operatore già presente nel perimetro.");
      return;
    }

    setBusyAdd(true);
    setErr("");
    try {
      const payload: any = {
        ship_id: selectedShipId,
        operator_id: selectedOperatorId,
        active: true,
      };
      const rt = safeText(roleTag);
      if (rt) payload.role_tag = rt;

      const { error } = await supabase.from("ship_operators").upsert(payload, { onConflict: "ship_id,operator_id" });
      if (error) throw error;

      setToastSoft("Perimetro aggiornato.");
      setOpQuery("");
      setSelectedOperatorId("");
      setRoleTag("");
      await loadPerimeterOperators(selectedShipId);
    } catch (e) {
      const fe = formatSupabaseError(e);
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] addToPerimeter error:", fe.debug);
      setErr(`Impossibile aggiungere al perimetro. ${fe.short}`);
    } finally {
      setBusyAdd(false);
    }
  };

  const setActive = async (operatorId: string, nextActive: boolean) => {
    if (!selectedShipId || !operatorId) return;
    setErr("");
    try {
      const { error } = await supabase
        .from("ship_operators")
        .update({ active: nextActive })
        .eq("ship_id", selectedShipId)
        .eq("operator_id", operatorId);
      if (error) throw error;
      await loadPerimeterOperators(selectedShipId);
      setToastSoft(nextActive ? "Attivato." : "Disattivato.");
    } catch (e) {
      const fe = formatSupabaseError(e);
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] setActive error:", fe.debug);
      setErr(`Impossibile aggiornare stato perimetro. ${fe.short}`);
    }
  };

  return (
    <div className="min-h-screen theme-bg">
      <div className="space-y-4">
        <div className={cardClass() + " p-4"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.26em] theme-text-muted">ADMIN · PERIMETRI</div>
              <div className="mt-1 text-[14px] font-semibold theme-text truncate">
                {t(lang, "perimeters.title", "Perimetri operatori")}
              </div>
              <div className="mt-1 text-[12px] theme-text-muted">
                {t(
                  lang,
                  "perimeters.hint",
                  "Collega operatori (creati in Admin) al perimetro nave. Solo così il Manager les voit dans Assegnazioni."
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.26em] theme-text-muted">SCOPE</div>
              <div className="mt-1 text-[12px] font-semibold theme-text">{scopeLabel}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left: ship selector */}
            <div className="lg:col-span-4 rounded-2xl border theme-border bg-[var(--panel2)] p-3">
              <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">Nave</div>

              <select
                value={selectedShipId}
                onChange={(e) => setSelectedShipId(e.target.value)}
                className={cn(inputClass(), "mt-2")}
                disabled={loadingShips}
              >
                {ships.map((s) => (
                  <option key={s.ship_id} value={s.ship_id}>
                    {safeText(s.commessa)} · {safeText(s.code)}
                    {s.name ? ` · ${safeText(s.name)}` : ""}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex items-center gap-2">
                <button type="button" className={btnGhost()} disabled={loadingShips} onClick={loadShips}>
                  {loadingShips ? "Carico…" : "Ricarica navi"}
                </button>
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={!selectedShipId || loadingPerimOps}
                  onClick={() => loadPerimeterOperators(selectedShipId)}
                >
                  {loadingPerimOps ? "Carico…" : "Ricarica perimetro"}
                </button>
              </div>

              {selectedShip ? (
                <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel2)] px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">Dettagli</div>
                  <div className="mt-1 text-[12px] theme-text-muted">
                    Commessa:{" "}
                    <span className="theme-text font-semibold">{safeText(selectedShip.commessa) || "—"}</span>
                  </div>
                  <div className="mt-1 text-[12px] theme-text-muted">
                    Ship: <span className="theme-text font-semibold">{safeText(selectedShip.code) || "—"}</span>
                  </div>
                  <div className="mt-1 text-[12px] theme-text-muted">
                    Costr: <span className="theme-text font-semibold">{safeText(selectedShip.costr) || "—"}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right: add operator */}
            <div className="lg:col-span-8 rounded-2xl border theme-border bg-[var(--panel2)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">Perim add op</div>
                  <div className="mt-1 text-[12px] theme-text-muted">
                    Seleziona un operatore esistente (Admin → Operatori) e collegalo alla nave.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={btnGhost()} disabled={loadingPool} onClick={loadOperatorPool}>
                    {loadingPool ? "Carico…" : "Ricarica pool"}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-7">
                  <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">Operatore (ricerca)</div>
                  <input
                    value={opQuery}
                    onChange={(e) => {
                      setOpQuery(e.target.value);
                      setSelectedOperatorId("");
                    }}
                    placeholder="Cerca per nome…"
                    className={cn(inputClass(), "mt-1")}
                  />

                  {/* Suggestions */}
                  <div className="mt-2 rounded-2xl border theme-border bg-[var(--panel2)] overflow-hidden">
                    <div className="px-3 py-2 border-b theme-border bg-[var(--panel2)] text-[11px] theme-text-muted">
                      Suggerimenti ({loadingPool ? "…" : suggestList.length})
                    </div>
                    <div className="max-h-56 overflow-auto">
                      {loadingPool ? (
                        <div className="px-3 py-4 text-[13px] theme-text-muted">Caricamento…</div>
                      ) : suggestList.length === 0 ? (
                        <div className="px-3 py-4 text-[13px] theme-text-muted">Nessun risultato.</div>
                      ) : (
                        suggestList.map((o) => {
                          const selected = o.id === selectedOperatorId;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              className={cn(
                                "w-full text-left px-3 py-2 border-b theme-border last:border-b-0",
                                "hover:bg-[var(--panel)]",
                                selected ? "bg-[var(--panel)]" : "bg-transparent"
                              )}
                              onClick={() => {
                                setSelectedOperatorId(o.id);
                                setOpQuery(o.display_name);
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold theme-text truncate">{o.display_name}</div>
                                  <div className="text-[11px] theme-text-muted truncate">
                                    Roles: {o.roles.length ? o.roles.join(", ") : "—"}
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  <span className={pill(o.identity_ok ? "emerald" : "amber")}>
                                    {o.identity_ok ? "OK" : "IDENTITY KO"}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">Role tag (opzionale)</div>
                  <input
                    value={roleTag}
                    onChange={(e) => setRoleTag(e.target.value)}
                    placeholder="Es. ELETTRICISTA"
                    className={cn(inputClass(), "mt-1")}
                  />

                  <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel2)] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] theme-text-muted">Selezionato</div>
                    <div className="mt-1 text-[12px] theme-text font-semibold truncate">{selectedOp?.display_name || "—"}</div>
                    <div className="mt-1 text-[11px] theme-text-muted truncate">
                      Roles: {selectedOp?.roles?.length ? selectedOp.roles.join(", ") : "—"}
                    </div>
                    <div className="mt-2">
                      {selectedOp ? (
                        <span className={pill(selectedOp.identity_ok ? "emerald" : "amber")}>
                          {selectedOp.identity_ok ? "IDENTITY OK" : "IDENTITY KO"}
                        </span>
                      ) : (
                        <span className={pill("slate")}>—</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="button"
                    className={btnPrimary() + " w-full"}
                    disabled={
                      busyAdd || !selectedShipId || !selectedOperatorId || !selectedOp?.identity_ok || alreadyInPerimeter
                    }
                    onClick={addToPerimeter}
                    title={alreadyInPerimeter ? "Già presente" : "Aggiungi al perimetro"}
                  >
                    {busyAdd ? "…" : "Perim Add"}
                  </button>
                </div>
              </div>

              {alreadyInPerimeter ? (
                <div className="mt-3 rounded-xl px-3 py-2 text-[13px] badge-warning">
                  Operatore già presente nel perimetro attivo.
                </div>
              ) : null}

              {err ? (
                <div className="mt-3 rounded-xl px-3 py-2 text-[13px] badge-danger">
                  {err}
                </div>
              ) : null}

              {toast ? (
                <div className="mt-3 rounded-xl px-3 py-2 text-[13px] badge-success">
                  {toast}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Perimeter operators list */}
        <div className={cardClass() + " p-4"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] theme-text-muted">PERIM OPS</div>
              <div className="mt-1 text-[12px] theme-text-muted">Operatori collegati alla nave selezionata.</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.26em] theme-text-muted">Perim status</div>
              <div className="mt-1 text-[12px] theme-text font-semibold">
                {loadingPerimOps ? "…" : `Elenco · ${perimOps.filter((x) => x.active).length} attivi`}
              </div>
            </div>
          </div>

        <div className="mt-3 rounded-2xl border theme-border bg-[var(--panel2)] overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b theme-border bg-[var(--panel2)] text-[11px] theme-text-muted">
              <div className="col-span-5 theme-text">Nome</div>
              <div className="col-span-3 theme-text">Ruoli</div>
              <div className="col-span-2 theme-text">Perim Status</div>
              <div className="col-span-2 text-right theme-text">Actions</div>
            </div>

            <div className="divide-y theme-border">
              {loadingPerimOps ? (
                <div className="px-3 py-4 text-[13px] theme-text-muted">Caricamento…</div>
              ) : perimOps.length === 0 ? (
                <div className="px-3 py-4 text-[13px] theme-text-muted">Nessun operatore nel perimetro.</div>
              ) : (
                perimOps.map((o) => (
                  <div key={o.operator_id} className="px-3 py-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 min-w-0">
                        <div className="text-[13px] font-semibold theme-text truncate">{o.display_name}</div>
                        <div className="text-[11px] theme-text-muted truncate">Tag: {safeText(o.role_tag) || "—"}</div>
                      </div>
                      <div className="col-span-3 text-[12px] theme-text-muted truncate">
                        {o.roles.length ? o.roles.join(", ") : "—"}
                      </div>
                      <div className="col-span-2">
                        <span className={pill(o.active ? "emerald" : "amber")}>{o.active ? "Perim Active" : "Perim OFF"}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <button type="button" className={btnGhost()} onClick={() => setActive(o.operator_id, !o.active)}>
                          {o.active ? "Disattiva" : "Attiva"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




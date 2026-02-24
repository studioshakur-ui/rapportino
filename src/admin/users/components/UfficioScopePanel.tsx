// src/admin/users/components/UfficioScopePanel.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { cn, formatDateShort } from "./ui";

type ScopeRow = {
  id: string;
  ufficio_id: string;
  capo_id: string;
  ship_id?: string | null;
  costr: string;
  active: boolean;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
  note: string | null;
};

type ProfileLite = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  app_role: string | null;
};

type ShipLite = {
  id: string;
  code: string | null;
  name: string | null;
  costr: string | null;
  commessa: string | null;
};

function bestName(p: Partial<ProfileLite> | null | undefined): string {
  const d = String(p?.display_name || "").trim();
  const f = String(p?.full_name || "").trim();
  const e = String(p?.email || "").trim();
  return d || f || e || "—";
}

export default function UfficioScopePanel(props: {
  ufficioUserId: string;
  ufficioAllowedCantieri?: string[] | null;
}): JSX.Element {
  const { ufficioUserId, ufficioAllowedCantieri } = props;

  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [scopes, setScopes] = useState<ScopeRow[]>([]);
  const [capos, setCapos] = useState<ProfileLite[]>([]);
  const [ships, setShips] = useState<ShipLite[]>([]);

  const [capoId, setCapoId] = useState<string>("");
  const [costr, setCostr] = useState<string>("");
  const [shipId, setShipId] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const cantieriOptions = useMemo(() => {
    const raw = (ufficioAllowedCantieri || [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(raw));
    return uniq.length ? uniq : [];
  }, [ufficioAllowedCantieri]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sc, cp, sh] = await Promise.all([
        supabase
          .from("ufficio_capo_scopes")
          .select("id,ufficio_id,capo_id,ship_id,costr,active,created_by,created_at,revoked_at,note")
          .eq("ufficio_id", ufficioUserId)
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("id,full_name,display_name,email,app_role")
          .eq("app_role", "CAPO")
          .order("display_name", { ascending: true }),
        supabase
          .from("ships")
          .select("id,code,name,costr,commessa")
          .order("code", { ascending: true }),
      ]);

      if (sc.error) throw sc.error;
      if (cp.error) throw cp.error;
      if (sh.error) throw sh.error;

      setScopes((sc.data || []) as ScopeRow[]);
      setCapos((cp.data || []) as ProfileLite[]);
      setShips((sh.data || []) as ShipLite[]);

      if (!costr && cantieriOptions.length === 1) setCostr(cantieriOptions[0]);
      if (!shipId && (sh.data || []).length === 1) setShipId((sh.data as ShipLite[])[0].id);
    } catch (e: any) {
      console.error("[UfficioScopePanel] load error:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [ufficioUserId, costr, cantieriOptions]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const capoLabelById = useMemo(() => {
    const m = new Map<string, string>();
    capos.forEach((c) => m.set(c.id, bestName(c)));
    return m;
  }, [capos]);

  const createScope = useCallback(async () => {
    const capo_id = capoId.trim();
    const c = costr.trim().toUpperCase();
    const s = shipId.trim();
    if (!capo_id) {
      setError("Seleziona un CAPO");
      return;
    }
    if (!c) {
      setError("Seleziona COSTR");
      return;
    }
    if (!s) {
      setError("Seleziona NAVE");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const createdBy = auth?.user?.id || null;
      if (!createdBy) {
        setError("Utente non autenticato");
        setBusy(false);
        return;
      }
      const res = await supabase
        .from("ufficio_capo_scopes")
        .upsert(
          {
            ufficio_id: ufficioUserId,
            capo_id,
            ship_id: s,
            costr: c,
            active: true,
            note: note.trim() || null,
            created_by: createdBy,
          } as any,
          { onConflict: "ufficio_id,capo_id,costr" }
        )
        .select("id")
        .single();

      if (res.error) throw res.error;
      setCapoId("");
      setNote("");
      await loadAll();
    } catch (e: any) {
      console.error("[UfficioScopePanel] create scope error:", e);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [capoId, costr, shipId, note, ufficioUserId, loadAll]);

  const setActive = useCallback(
    async (scopeId: string, active: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const patch: any = { active };
        patch.revoked_at = active ? null : new Date().toISOString();
        const res = await supabase.from("ufficio_capo_scopes").update(patch).eq("id", scopeId);
        if (res.error) throw res.error;
        await loadAll();
      } catch (e: any) {
        console.error("[UfficioScopePanel] toggle error:", e);
        setError(e?.message || String(e));
      } finally {
        setBusy(false);
      }
    },
    [loadAll]
  );

  return (
    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Deleghe CAPO · Scope S2</div>
          <div className="mt-1 text-[12px] text-slate-300">
            S2 = <span className="text-slate-100 font-semibold">CAPO + COSTR</span>. UFFICIO può creare/modificare solo
            <span className="text-slate-100 font-semibold"> DRAFT</span> entro questo perimetro.
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-12 gap-2">
        <div className="col-span-12">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Nuova delega</div>
        </div>

        <div className="col-span-12">
          <select
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-[12px]",
              "border-slate-800 bg-slate-950/70 text-slate-100"
            )}
            value={capoId}
            onChange={(e) => setCapoId(e.target.value)}
            disabled={busy || loading}
          >
            <option value="">Seleziona CAPO…</option>
            {capos.map((c) => (
              <option key={c.id} value={c.id}>
                {bestName(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-6">
          <select
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-[12px]",
              "border-slate-800 bg-slate-950/70 text-slate-100"
            )}
            value={costr}
            onChange={(e) => setCostr(e.target.value)}
            disabled={busy || loading}
          >
            <option value="">COSTR…</option>
            {(cantieriOptions.length ? cantieriOptions : ["COMM-001"]).map((c) => (
              <option key={c} value={c}>
                {String(c).toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-6">
          <select
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-[12px]",
              "border-slate-800 bg-slate-950/70 text-slate-100"
            )}
            value={shipId}
            onChange={(e) => setShipId(e.target.value)}
            disabled={busy || loading}
          >
            <option value="">NAVE…</option>
            {ships.map((s) => (
              <option key={s.id} value={s.id}>
                {String(s.code || s.name || s.id).trim()}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-6">
          <input
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-[12px]",
              "border-slate-800 bg-slate-950/70 text-slate-100"
            )}
            placeholder="Note (opzionale)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy || loading}
          />
        </div>

        <div className="col-span-12">
          <button
            type="button"
            onClick={() => void createScope()}
            disabled={busy || loading}
            className={cn(
              "w-full rounded-xl border px-4 py-2 text-[12px] font-semibold",
              busy || loading
                ? "border-slate-800 bg-slate-950/40 text-slate-500"
                : "border-emerald-500/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
            )}
          >
            Conferma delega
          </button>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Deleghe attive / storiche</div>

        {loading ? <div className="mt-2 text-[12px] text-slate-400">Caricamento…</div> : null}
        {!loading && !scopes.length ? <div className="mt-2 text-[12px] text-slate-400">Nessuna delega.</div> : null}

        <div className="mt-2 space-y-2">
          {scopes.map((s) => {
            const capoLabel = capoLabelById.get(s.capo_id) || s.capo_id;
            const shipLabel =
              ships.find((x) => x.id === s.ship_id)?.code ||
              ships.find((x) => x.id === s.ship_id)?.name ||
              (s.ship_id ? String(s.ship_id).slice(0, 8) : "—");
            const tone = s.active ? "border-slate-800 bg-slate-950/40" : "border-slate-800 bg-slate-950/20 opacity-75";

            return (
              <div key={s.id} className={cn("rounded-xl border p-3", tone)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-100 truncate">{capoLabel}</div>
                    <div className="mt-1 text-[12px] text-slate-400">
                      COSTR: <span className="text-slate-200 font-semibold">{String(s.costr).toUpperCase()}</span>
                      <span className="text-slate-500"> · NAVE: {shipLabel}</span>
                      {s.note ? <span className="text-slate-500"> · {s.note}</span> : null}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Creato: {formatDateShort(s.created_at)}
                      {s.revoked_at ? <span> · Revocato: {formatDateShort(s.revoked_at)}</span> : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void setActive(s.id, !s.active)}
                    disabled={busy}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                      busy
                        ? "border-slate-800 bg-slate-950/40 text-slate-500"
                        : s.active
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                        : "border-emerald-500/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                    )}
                  >
                    {s.active ? "Revoca" : "Riattiva"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

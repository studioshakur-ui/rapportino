// src/pages/CapoTeamOrganizerPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useShip } from "../context/ShipContext";
import { useAuth } from "../auth/AuthProvider";
import { corePills } from "../ui/designSystem";

type TeamDayRow = {
  id: string;
  capo_id: string;
  ship_id: string;
  plan_date: string;
  status: "DRAFT" | "LOCKED" | string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type TeamRow = {
  id: string;
  team_day_id: string;
  name: string;
  position: number;
  deck: string | null;
  zona: string | null;
  activity_code: string | null;
  note: string | null;
};

type TeamMemberRow = {
  id: string;
  team_id: string;
  operator_id: string;
  planned_minutes: number;
  position: number;
  role_tag: string | null;
};

type TeamWithMembers = TeamRow & { members: TeamMemberRow[] };

type CapoTeamDayPayload = {
  day: TeamDayRow | null;
  teams: TeamWithMembers[];
};

type OperatorRow = {
  id: string;
  name?: string | null;
  nome?: string | null;
  cognome?: string | null;
};

function safeStr(x: unknown): string {
  if (x === null || x === undefined) return "";
  return String(x);
}

function localDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesToHoursLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function buildOperatorLabel(op: OperatorRow | null | undefined, fallbackId: string): string {
  if (!op) return fallbackId;
  const name = safeStr(op.name).trim();
  if (name) return name;
  const nome = safeStr(op.nome).trim();
  const cognome = safeStr(op.cognome).trim();
  const full = `${nome} ${cognome}`.trim();
  return full || fallbackId;
}

async function rpcGetTeamDay(shipId: string, planDate: string): Promise<CapoTeamDayPayload> {
  const { data, error } = await supabase.rpc("capo_get_team_day_v1", {
    p_ship_id: shipId,
    p_plan_date: planDate,
  });
  if (error) throw error;

  const payload = (data ?? null) as any;
  if (!payload || typeof payload !== "object") return { day: null, teams: [] };

  const day = payload.day ?? null;
  const teams = Array.isArray(payload.teams) ? payload.teams : [];
  return { day, teams } as CapoTeamDayPayload;
}

export default function CapoTeamOrganizerPage(): JSX.Element {
  const navigate = useNavigate();
  const { shipId } = useParams();
  const { uid } = useAuth();
  const { currentShip, ships, setCurrentShip, refreshShips } = useShip();

  const [planDate, setPlanDate] = useState<string>(() => localDateISO(new Date()));
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [payload, setPayload] = useState<CapoTeamDayPayload>({ day: null, teams: [] });

  const [operatorSearch, setOperatorSearch] = useState<string>("");
  const [operatorLoading, setOperatorLoading] = useState<boolean>(false);
  const [operatorResults, setOperatorResults] = useState<OperatorRow[]>([]);
  const [operatorsById, setOperatorsById] = useState<Map<string, OperatorRow>>(new Map());

  const resolvedShip = useMemo(() => {
    if (!shipId) return null;
    const sid = String(shipId);
    return ships.find((s) => String(s.id) === sid) || currentShip || null;
  }, [shipId, ships, currentShip]);

  useEffect(() => {
    refreshShips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!resolvedShip) return;
    // Keep ShipContext aligned (KPI, other modules depend on it)
    setCurrentShip(resolvedShip);
  }, [resolvedShip, setCurrentShip]);

  const load = useCallback(async () => {
    if (!shipId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await rpcGetTeamDay(String(shipId), planDate);
      setPayload(res);

      // Best-effort: resolve operator labels for members
      const ids = Array.from(
        new Set(
          (res.teams || [])
            .flatMap((t) => (Array.isArray(t.members) ? t.members : []))
            .map((m) => safeStr(m.operator_id))
            .filter(Boolean)
        )
      );
      if (ids.length > 0) {
        const { data, error } = await supabase.from("operators").select("id, name, nome, cognome").in("id", ids);
        if (!error) {
          const ops = (Array.isArray(data) ? data : []) as OperatorRow[];
          const map = new Map<string, OperatorRow>(ops.map((o) => [String(o.id), o]));
          setOperatorsById(map);
        }
      }
    } catch (e: any) {
      console.error("[CapoTeamOrganizer] load error:", e);
      setError("Impossibile caricare l'organizzazione del giorno.");
      setPayload({ day: null, teams: [] });
    } finally {
      setLoading(false);
    }
  }, [shipId, planDate]);

  useEffect(() => {
    load();
  }, [load]);

  const ensureDayAndDefaults = useCallback(async (): Promise<string> => {
    if (!shipId) throw new Error("missing shipId");
    if (!uid) throw new Error("missing uid");

    setSaving(true);
    try {
      // 1) Upsert day (canonical owner = uid)
      const { data: dayRows, error: dayErr } = await supabase
        .from("capo_team_days")
        .upsert(
          {
            capo_id: uid,
            ship_id: String(shipId),
            plan_date: planDate,
            status: "DRAFT",
          },
          { onConflict: "capo_id,ship_id,plan_date" }
        )
        .select("id")
        .limit(1);
      if (dayErr) throw dayErr;
      const dayId = String((dayRows as any)?.[0]?.id || "");
      if (!dayId) throw new Error("day_id_not_returned");

      // 2) If no teams, create defaults A/B
      const { data: teamCheck, error: teamCheckErr } = await supabase
        .from("capo_teams")
        .select("id")
        .eq("team_day_id", dayId)
        .limit(1);
      if (teamCheckErr) throw teamCheckErr;

      const hasTeams = Array.isArray(teamCheck) && teamCheck.length > 0;
      if (!hasTeams) {
        const { error: insErr } = await supabase.from("capo_teams").insert([
          { team_day_id: dayId, name: "Equipe A", position: 1 },
          { team_day_id: dayId, name: "Equipe B", position: 2 },
        ]);
        if (insErr) throw insErr;
      }

      return dayId;
    } finally {
      setSaving(false);
    }
  }, [shipId, uid, planDate]);

  const createToday = useCallback(async () => {
    setError(null);
    try {
      await ensureDayAndDefaults();
      await load();
    } catch (e: any) {
      console.error("[CapoTeamOrganizer] createToday error:", e);
      setError("Impossibile creare l'organizzazione del giorno.");
    }
  }, [ensureDayAndDefaults, load]);

  const addTeam = useCallback(async () => {
    setError(null);
    try {
      const dayId = payload.day?.id || (await ensureDayAndDefaults());
      const nextPos = Math.max(0, ...payload.teams.map((t) => Number(t.position) || 0)) + 1;
      const { error } = await supabase.from("capo_teams").insert({
        team_day_id: dayId,
        name: `Equipe ${nextPos}`,
        position: nextPos,
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      console.error("[CapoTeamOrganizer] addTeam error:", e);
      setError("Impossibile aggiungere una squadra.");
    }
  }, [ensureDayAndDefaults, load, payload.day?.id, payload.teams]);

  const updateTeamMeta = useCallback(
    async (teamId: string, patch: Partial<Pick<TeamRow, "name" | "deck" | "zona" | "activity_code" | "note">>) => {
      setError(null);
      try {
        const { error } = await supabase.from("capo_teams").update(patch).eq("id", teamId);
        if (error) throw error;
        await load();
      } catch (e: any) {
        console.error("[CapoTeamOrganizer] updateTeamMeta error:", e);
        setError("Impossibile aggiornare la squadra.");
      }
    },
    [load]
  );

  const removeTeam = useCallback(
    async (teamId: string) => {
      setError(null);
      try {
        const { error } = await supabase.from("capo_teams").delete().eq("id", teamId);
        if (error) throw error;
        await load();
      } catch (e: any) {
        console.error("[CapoTeamOrganizer] removeTeam error:", e);
        setError("Impossibile eliminare la squadra.");
      }
    },
    [load]
  );

  const addMember = useCallback(
    async (teamId: string, operatorId: string) => {
      setError(null);
      try {
        const team = payload.teams.find((t) => t.id === teamId);
        const nextPos = (team?.members?.length ?? 0) + 1;
        const { error } = await supabase.from("capo_team_members").insert({
          team_id: teamId,
          operator_id: operatorId,
          planned_minutes: 480,
          position: nextPos,
        });
        if (error) throw error;
        await load();
      } catch (e: any) {
        console.error("[CapoTeamOrganizer] addMember error:", e);
        setError("Impossibile aggiungere operatore.");
      }
    },
    [load, payload.teams]
  );

  const updateMemberMinutes = useCallback(
    async (memberId: string, minutes: number) => {
      setError(null);
      try {
        const planned = Number.isFinite(minutes) ? Math.max(0, Math.min(24 * 60, minutes)) : 0;
        const { error } = await supabase.from("capo_team_members").update({ planned_minutes: planned }).eq("id", memberId);
        if (error) throw error;
        await load();
      } catch (e: any) {
        console.error("[CapoTeamOrganizer] updateMemberMinutes error:", e);
        setError("Impossibile aggiornare le ore.");
      }
    },
    [load]
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      setError(null);
      try {
        const { error } = await supabase.from("capo_team_members").delete().eq("id", memberId);
        if (error) throw error;
        await load();
      } catch (e: any) {
        console.error("[CapoTeamOrganizer] removeMember error:", e);
        setError("Impossibile rimuovere operatore.");
      }
    },
    [load]
  );

  const runOperatorSearch = useCallback(async () => {
    const q = operatorSearch.trim();
    if (q.length < 2) {
      setOperatorResults([]);
      return;
    }

    setOperatorLoading(true);
    try {
      // Best-effort OR across common fields
      const { data, error } = await supabase
        .from("operators")
        .select("id, name, nome, cognome")
        .or(`name.ilike.%${q}%,nome.ilike.%${q}%,cognome.ilike.%${q}%`)
        .limit(25);
      if (error) throw error;
      const list = (Array.isArray(data) ? data : []) as OperatorRow[];
      setOperatorResults(list);

      // merge into local cache
      setOperatorsById((prev) => {
        const next = new Map(prev);
        for (const op of list) next.set(String(op.id), op);
        return next;
      });
    } catch (e: any) {
      console.error("[CapoTeamOrganizer] operator search error:", e);
      setOperatorResults([]);
    } finally {
      setOperatorLoading(false);
    }
  }, [operatorSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      runOperatorSearch();
    }, 300);
    return () => clearTimeout(t);
  }, [runOperatorSearch]);

  const totalPlannedMinutes = useMemo(() => {
    return (payload.teams || []).reduce((acc, t) => {
      const m = Array.isArray(t.members) ? t.members : [];
      return acc + m.reduce((a, it) => a + (Number(it.planned_minutes) || 0), 0);
    }, 0);
  }, [payload.teams]);

  const shipLabel = useMemo(() => {
    const s = resolvedShip;
    if (s?.name) return s.name;
    if (s?.code) return String(s.code);
    return shipId ? String(shipId) : "Nave";
  }, [resolvedShip, shipId]);

  const goBack = (): void => {
    navigate(`/app/ship/${shipId}`);
  };

  const goRapportino = (): void => {
    navigate(`/app/ship/${shipId}/rapportino/role`, { state: { planDate } });
  };

  const isEmpty = !payload.day;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Nave {shipLabel} · Squadre</div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">Organizzazione del giorno</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={corePills(true, "violet", "text-[10px] px-2 py-0.5")}>CAPO</span>
            <span className={corePills(true, payload.day ? "emerald" : "slate", "text-[10px] px-2 py-0.5")}>
              {payload.day ? payload.day.status : "NON CREATO"}
            </span>
            <span className={corePills(true, "slate", "text-[10px] px-2 py-0.5")}>
              Totale ore: {minutesToHoursLabel(totalPlannedMinutes)}
            </span>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={goBack}
            className="rounded-xl border border-slate-700/60 bg-slate-950/40 hover:bg-slate-950/65 px-3 py-2 text-sm text-slate-200"
          >
            Indietro
          </button>
          <button
            type="button"
            onClick={goRapportino}
            className="rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/15 px-3 py-2 text-sm text-slate-50"
          >
            Apri Rapportino
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300" htmlFor="planDate">
            Data
          </label>
          <input
            id="planDate"
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            className="rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div className="flex-1" />

        {isEmpty ? (
          <button
            type="button"
            onClick={createToday}
            disabled={saving || loading}
            className="rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/15 px-4 py-2 text-sm text-slate-50 disabled:opacity-50"
          >
            Crea organizzazione (A/B)
          </button>
        ) : (
          <button
            type="button"
            onClick={addTeam}
            disabled={saving || loading}
            className="rounded-xl border border-slate-700/60 bg-slate-950/40 hover:bg-slate-950/65 px-4 py-2 text-sm text-slate-50 disabled:opacity-50"
          >
            Aggiungi squadra
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-500">Caricamento…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: operator search */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">Operatori</div>
                <div className="text-xs text-slate-500">Cerca e aggiungi nelle squadre.</div>
              </div>
              <span className={corePills(true, "slate", "text-[10px] px-2 py-0.5")}>Picker</span>
            </div>

            <input
              type="text"
              value={operatorSearch}
              onChange={(e) => setOperatorSearch(e.target.value)}
              placeholder="Cerca (min 2 caratteri)…"
              className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />

            {operatorLoading ? <div className="text-xs text-slate-500">Ricerca…</div> : null}

            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {operatorResults.map((op) => {
                const label = buildOperatorLabel(op, String(op.id));
                return (
                  <div
                    key={String(op.id)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-slate-100 truncate">{label}</div>
                      <div className="text-[11px] text-slate-500 truncate">{String(op.id)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {payload.teams.slice(0, 2).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => addMember(t.id, String(op.id))}
                          disabled={!payload.day || saving}
                          className="rounded-lg border border-slate-700/60 bg-slate-950/40 hover:bg-slate-950/65 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50"
                        >
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!operatorLoading && operatorSearch.trim().length >= 2 && operatorResults.length === 0 ? (
                <div className="text-xs text-slate-500">Nessun operatore trovato.</div>
              ) : null}
              {operatorSearch.trim().length < 2 ? (
                <div className="text-xs text-slate-500">Scrivi almeno 2 caratteri per cercare.</div>
              ) : null}
            </div>
          </div>

          {/* Center: teams */}
          <div className="lg:col-span-8 space-y-4">
            {payload.teams.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 text-sm text-slate-400">
                Nessuna squadra per questa data.
              </div>
            ) : null}

            {payload.teams
              .slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((team) => {
                const members = Array.isArray(team.members)
                  ? team.members.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  : [];
                const total = members.reduce((acc, m) => acc + (Number(m.planned_minutes) || 0), 0);

                return (
                  <div key={team.id} className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={team.name}
                            onChange={(e) => updateTeamMeta(team.id, { name: e.target.value })}
                            className="w-full max-w-[320px] rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                          />
                          <span className={corePills(true, "slate", "text-[10px] px-2 py-0.5")}>
                            {minutesToHoursLabel(total)}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={team.deck ?? ""}
                            onChange={(e) => updateTeamMeta(team.id, { deck: e.target.value || null })}
                            placeholder="Ponte"
                            className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600"
                          />
                          <input
                            type="text"
                            value={team.zona ?? ""}
                            onChange={(e) => updateTeamMeta(team.id, { zona: e.target.value || null })}
                            placeholder="Zona"
                            className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600"
                          />
                          <input
                            type="text"
                            value={team.activity_code ?? ""}
                            onChange={(e) => updateTeamMeta(team.id, { activity_code: e.target.value || null })}
                            placeholder="Attivita (codice)"
                            className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => removeTeam(team.id)}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
                        >
                          Elimina
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {members.length === 0 ? (
                        <div className="text-xs text-slate-500">Nessun operatore in questa squadra.</div>
                      ) : null}

                      {members.map((m) => {
                        const op = operatorsById.get(String(m.operator_id));
                        const label = buildOperatorLabel(op, String(m.operator_id));
                        return (
                          <div
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm text-slate-100 truncate">{label}</div>
                              <div className="text-[11px] text-slate-500 truncate">{String(m.operator_id)}</div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={24}
                                step={0.5}
                                value={(Number(m.planned_minutes) || 0) / 60}
                                onChange={(e) => {
                                  const hours = Number(e.target.value);
                                  const mins = Number.isFinite(hours) ? Math.round(hours * 60) : 0;
                                  updateMemberMinutes(m.id, mins);
                                }}
                                className="w-[96px] rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-100"
                              />
                              <span className={corePills(true, "slate", "text-[10px] px-2 py-0.5")}>
                                {minutesToHoursLabel(Number(m.planned_minutes) || 0)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMember(m.id)}
                                className="rounded-xl border border-slate-700/60 bg-slate-950/40 hover:bg-slate-950/65 px-3 py-2 text-xs text-slate-200"
                              >
                                Rimuovi
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
// src/capo/simple/CapoPresencePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../auth/AuthProvider";

type ExpectedOperator = {
  operator_id: string;
  operator_name: string | null;
  operator_code: string | null;
};

type ShipRow = {
  id: string;
  code: string | null;
  name: string | null;
  costr: string | null;
  commessa: string | null;
};

type AttendanceState = {
  status: "PRESENT" | "ABSENT";
  reason: string | null;
  note: string;
};

function cn(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(" ");
}

function localIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const ABSENCE_REASONS = [
  { key: "concordato", label: "Concordato" },
  { key: "ferie", label: "Ferie" },
  { key: "malattia", label: "Malattia" },
  { key: "senza_avvisare", label: "Senza avvisare" },
  { key: "imprevisto", label: "Imprevisto" },
  { key: "paternita", label: "Paternità" },
  { key: "congedo_parentale", label: "Congedo parentale" },
  { key: "altro", label: "Altro" },
] as const;

export default function CapoPresencePage(): JSX.Element {
  const nav = useNavigate();
  const { shipId } = useParams();

  /**
   * IMPORTANT:
   * - RLS on presence tables is based on auth.uid().
   * - Therefore we MUST use session.user.id as capo_id, not profile.id, not any derived uid.
   */
  const { session } = useAuth();
  const authUid = session?.user?.id || null;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [shipWarn, setShipWarn] = useState<string>("");
  const [ship, setShip] = useState<ShipRow | null>(null);
  const [expected, setExpected] = useState<ExpectedOperator[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceState>>({});

  // NEW: assignment is informational (soft), not blocking.
  const [assignedToday, setAssignedToday] = useState<boolean | null>(null);
  const [allowUnassignedProceed, setAllowUnassignedProceed] = useState(false);

  const today = useMemo(() => localIsoDate(), []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr("");
      setShipWarn("");
      setShip(null);
      setExpected([]);
      setAttendance({});
      setAssignedToday(null);
      setAllowUnassignedProceed(false);

      try {
        // If auth is not available, force user back to login.
        if (!authUid || !session) {
          nav("/login", { replace: true });
          return;
        }

        if (!shipId) {
          nav("/app", { replace: true });
          return;
        }

        // 1) Assignment check (SOFT): do not block page if missing.
        try {
          const { data: assigned, error: aErr } = await supabase
            .from("capo_today_ship_assignments_v1")
            .select("ship_id")
            .eq("plan_date", today)
            .eq("ship_id", shipId)
            .maybeSingle();

          if (aErr) {
            // eslint-disable-next-line no-console
            console.error("[CapoPresencePage] assignment check error:", aErr);
            if (mounted) {
              setAssignedToday(null);
              setShipWarn(
                "Impossibile verificare assegnazione di oggi (view/RLS/connessione). Puoi continuare, ma la conferma potrebbe fallire."
              );
            }
          } else if (!assigned?.ship_id) {
            if (mounted) {
              setAssignedToday(false);
              setShipWarn(
                "Attenzione: questo ship non risulta assegnato oggi. Puoi continuare, ma per confermare la presenza potrebbe essere necessario che il Manager aggiorni il piano."
              );
            }
          } else {
            if (mounted) setAssignedToday(true);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[CapoPresencePage] assignment check unexpected error:", e);
          if (mounted) {
            setAssignedToday(null);
            setShipWarn(
              "Impossibile verificare assegnazione di oggi. Puoi continuare, ma la conferma potrebbe fallire."
            );
          }
        }

        // 2) Ship info: DO NOT BLOCK the page if ship row is not visible (RLS) or missing
        const { data: s, error: sErr } = await supabase
          .from("ships")
          .select("id, code, name, costr, commessa")
          .eq("id", shipId)
          .maybeSingle();

        if (sErr) {
          // Keep page functional even if ship lookup fails
          // eslint-disable-next-line no-console
          console.error("[CapoPresencePage] ships load error:", sErr);
          if (mounted) {
            setShip(null);
            setShipWarn((prev) =>
              prev ? prev : "Ship non visibile (RLS) o non presente. La presenza resta utilizzabile."
            );
          }
        } else {
          if (mounted) setShip((s || null) as ShipRow | null);
          if (!s && mounted) {
            setShipWarn((prev) =>
              prev ? prev : "Ship non trovato o non visibile (RLS). La presenza resta utilizzabile."
            );
          }
        }

        // 3) Expected operators
        const { data: rows, error: eErr } = await supabase
          .from("capo_expected_operators_today_v1")
          .select("operator_id, operator_name, operator_code")
          .eq("plan_date", today)
          .eq("ship_id", shipId)
          .order("operator_name", { ascending: true });

        if (eErr) throw eErr;

        if (!mounted) return;

        const list = (Array.isArray(rows) ? rows : []) as ExpectedOperator[];
        setExpected(list);

        const next: Record<string, AttendanceState> = {};
        for (const r of list) {
          next[r.operator_id] = { status: "PRESENT", reason: null, note: "" };
        }
        setAttendance(next);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[CapoPresencePage] load error:", e);
        if (!mounted) return;
        setErr("Impossibile caricare presenza / operatori attesi (verifica view/RLS).");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [shipId, today, nav, authUid, session]);

  const setOperator = (operatorId: string, patch: Partial<AttendanceState>) => {
    setAttendance((prev) => {
      const cur = prev[operatorId] || { status: "PRESENT", reason: null, note: "" };
      return { ...prev, [operatorId]: { ...cur, ...patch } };
    });
  };

  const blockingIssues = useMemo(() => {
    const issues: Array<{ operator_id: string; msg: string }> = [];
    for (const op of expected) {
      const a = attendance[op.operator_id];
      if (!a) continue;
      if (a.status === "ABSENT") {
        if (!a.reason) {
          issues.push({ operator_id: op.operator_id, msg: "Motivo obbligatorio" });
          continue;
        }
        if (a.reason === "altro") {
          const note = String(a.note || "").trim();
          if (note.length < 5) {
            issues.push({ operator_id: op.operator_id, msg: "Altro: nota obbligatoria (min 5)" });
          }
        }
      }
    }
    return issues;
  }, [expected, attendance]);

  const mustConfirmUnassignedProceed = assignedToday === false && !allowUnassignedProceed;

  const confirmPresence = async () => {
    setErr("");
    if (!shipId) return;

    // MUST use auth uid (RLS is auth.uid based)
    const capoAuthUid = session?.user?.id || null;

    if (!capoAuthUid || !session) {
      setErr("Sessione non valida. Esegui di nuovo il login.");
      nav("/login", { replace: true });
      return;
    }

    if (mustConfirmUnassignedProceed) {
      setErr("Questo ship non risulta assegnato oggi. Premi “Procedi comunque” per continuare.");
      return;
    }

    if (blockingIssues.length > 0) {
      setErr("Completa i motivi di assenza prima di confermare.");
      return;
    }

    try {
      const { error: capoErr } = await supabase.from("capo_ship_attendance").upsert(
        {
          plan_date: today,
          ship_id: shipId,
          capo_id: capoAuthUid, // ✅ RLS expects auth.uid()
          status: "PRESENT",
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "plan_date,ship_id,capo_id" }
      );

      if (capoErr) throw capoErr;

      const payload = expected.map((op) => {
        const a = attendance[op.operator_id] || { status: "PRESENT", reason: null, note: "" };
        return {
          plan_date: today,
          ship_id: shipId,
          operator_id: op.operator_id,
          status: a.status,
          reason: a.status === "ABSENT" ? a.reason : null,
          note: a.status === "ABSENT" ? (String(a.note || "").trim() || null) : null,
          reported_at: new Date().toISOString(),
        };
      });

      if (payload.length > 0) {
        const { error: opErr } = await supabase
          .from("operator_ship_attendance")
          .upsert(payload, { onConflict: "plan_date,ship_id,operator_id" });

        if (opErr) throw opErr;
      }

      nav(`/app/ship/${shipId}/rapportino`, { replace: true });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[CapoPresencePage] confirmPresence error:", e);
      const msg = String((e as any)?.message || "").toLowerCase();

      if (msg.includes("row-level security") || msg.includes("rls")) {
        setErr(
          "Errore RLS: accesso negato. Verifica che ship_capos contenga questo auth.uid() come capo_id per questo ship."
        );
        return;
      }
      if (msg.includes("refresh token")) {
        setErr("Sessione scaduta o corrotta. Esegui logout/login e riprova.");
        return;
      }
      setErr("Errore durante conferma presenza (verifica RLS/constraint).");
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">
          Caricamento presenza…
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 space-y-1">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">PRESENZA · {today}</div>
        <div className="text-[16px] font-semibold">
          {ship ? `${ship.code || "—"} · ${ship.name || "Ship"}` : "Ship"}
        </div>
        {ship ? (
          <div className="text-[12px] text-slate-400">
            COSTR {ship.costr || "—"} · COMMESSA {ship.commessa || "—"}
          </div>
        ) : null}
      </div>

      {shipWarn ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-100 space-y-2">
          <div className="text-[13px]">{shipWarn}</div>
          <div className="flex flex-wrap items-center gap-2">
            {assignedToday === false ? (
              <button
                type="button"
                onClick={() => setAllowUnassignedProceed(true)}
                className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-[12px] font-semibold text-amber-100 hover:bg-amber-500/15"
              >
                Procedi comunque
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => nav("/app/ship-selector")}
              className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-[12px] font-semibold text-slate-100"
            >
              Selettore cantieri
            </button>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-100">{err}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-[12px] font-semibold text-slate-100">Operatori attesi</div>
        <div className="mt-3 space-y-3">
          {expected.length === 0 ? (
            <div className="text-[12px] text-slate-400">
              Nessun operatore assegnato dal Manager per oggi (ship). Contatta il Manager.
            </div>
          ) : null}

          {expected.map((op) => {
            const a = attendance[op.operator_id] || { status: "PRESENT", reason: null, note: "" };
            const issue = blockingIssues.find((x) => x.operator_id === op.operator_id);

            return (
              <div key={op.operator_id} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-50 truncate">
                      {op.operator_name || op.operator_code || "Operatore"}
                    </div>
                    <div className="text-[12px] text-slate-400">
                      {op.operator_code ? `Code: ${op.operator_code}` : "—"}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOperator(op.operator_id, { status: "PRESENT", reason: null, note: "" })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold",
                        a.status === "PRESENT"
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                          : "border-slate-700 bg-slate-950/60 text-slate-200"
                      )}
                    >
                      Presente
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperator(op.operator_id, { status: "ABSENT" })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold",
                        a.status === "ABSENT"
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                          : "border-slate-700 bg-slate-950/60 text-slate-200"
                      )}
                    >
                      Assente
                    </button>
                  </div>
                </div>

                {a.status === "ABSENT" ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Motivo (obbligatorio)</div>
                    <div className="flex flex-wrap gap-2">
                      {ABSENCE_REASONS.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => setOperator(op.operator_id, { reason: r.key })}
                          className={cn(
                            "rounded-full border px-3 py-1 text-[11px] font-semibold",
                            a.reason === r.key
                              ? "border-sky-400/40 bg-sky-500/10 text-sky-100"
                              : "border-slate-700 bg-slate-950/60 text-slate-200"
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>

                    {a.reason === "altro" ? (
                      <div className="mt-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          Nota (obbligatoria min 5)
                        </div>
                        <input
                          value={a.note || ""}
                          onChange={(e) => setOperator(op.operator_id, { note: e.target.value })}
                          placeholder="Scrivi breve nota…"
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-100 outline-none"
                        />
                      </div>
                    ) : null}

                    {issue ? <div className="text-[12px] text-rose-200">{issue.msg}</div> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-[12px] font-semibold text-slate-100"
        >
          Indietro
        </button>

        <button
          type="button"
          onClick={confirmPresence}
          disabled={blockingIssues.length > 0 || mustConfirmUnassignedProceed}
          className={cn(
            "rounded-full border px-4 py-2 text-[12px] font-semibold",
            blockingIssues.length > 0 || mustConfirmUnassignedProceed
              ? "border-slate-800 bg-slate-950/40 text-slate-500"
              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
          )}
        >
          Conferma presenza
        </button>
      </div>
    </div>
  );
}
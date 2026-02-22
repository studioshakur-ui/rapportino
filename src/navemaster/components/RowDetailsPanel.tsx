// src/navemaster/components/RowDetailsPanel.tsx
import { useI18n } from "../../i18n/coreI18n";
import { cardSurface, corePills } from "../../ui/designSystem";
import { useNavemasterRowDetails } from "../hooks/useNavemasterDetails";
import { formatIt } from "../contracts/navemaster.logic";

function JsonBox(props: { value: unknown }): JSX.Element {
  return (
    <pre className="max-h-[320px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
      {JSON.stringify(props.value ?? null, null, 2)}
    </pre>
  );
}

export default function RowDetailsPanel(props: { rowId: string | null }): JSX.Element {
  const { rowId } = props;
  const { t } = useI18n();
  const { row, alerts, events, loading, error } = useNavemasterRowDetails(rowId);

  const stateSource = (() => {
    if (!row) return "—";
    if (row.stato_nav === "P" && (row.metri_posati_ref ?? 0) > 0) return "PROOF (APPROVED_UFFICIO)";
    if (["E", "B", "R", "L"].includes(String(row.stato_nav)) && events.length > 0) return "EVENT (UFFICIO)";
    return "INCA BASELINE";
  })();

  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#050910] ${cardSurface(true)} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={corePills.kicker}>{t("NM_DETAILS_TITLE")}</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{row?.codice ?? "—"}</div>
          <div className="mt-1 text-xs text-slate-500">{loading ? "…" : row?.descrizione ?? ""}</div>
        </div>
      </div>

      {error ? <div className="mt-3 text-xs text-rose-300">{error}</div> : null}

      <div className="mt-4">
        <div className={corePills.kicker}>{t("NM_DETAILS_META")}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-400">stato_nav</div>
          <div className="text-slate-200">{row?.stato_nav ?? "—"}</div>

          <div className="text-slate-400">sezione</div>
          <div className="text-slate-200">{row?.sezione ?? "—"}</div>

          <div className="text-slate-400">zona_da</div>
          <div className="text-slate-200">{row?.zona_da ?? "—"}</div>

          <div className="text-slate-400">zona_a</div>
          <div className="text-slate-200">{row?.zona_a ?? "—"}</div>

          <div className="text-slate-400">apparato_da</div>
          <div className="text-slate-200">{row?.apparato_da ?? "—"}</div>

          <div className="text-slate-400">apparato_a</div>
          <div className="text-slate-200">{row?.apparato_a ?? "—"}</div>

          <div className="text-slate-400">impianto</div>
          <div className="text-slate-200">{row?.impianto ?? "—"}</div>

          <div className="text-slate-400">coverage</div>
          <div className="text-slate-200">{row?.coverage ?? "—"}</div>

          <div className="text-slate-400">last_proof_at</div>
          <div className="text-slate-200">{formatIt(row?.last_proof_at)}</div>

          <div className="text-slate-400">last_rapportino_id</div>
          <div className="text-slate-200">{row?.last_rapportino_id ?? "—"}</div>

          <div className="text-slate-400">source</div>
          <div className="text-slate-200">{stateSource}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className={corePills.kicker}>EVENTS (UFFICIO)</div>
        <div className="mt-2 space-y-2">
          {events.slice(0, 12).map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{e.event_type}</div>
                <div className="text-xs text-slate-500">{formatIt(e.event_at)}</div>
              </div>
              {e.blocco_locale_id ? <div className="mt-1 text-xs text-slate-400">blocco: {e.blocco_locale_id}</div> : null}
              {e.note ? <div className="mt-1 text-xs text-slate-300">{e.note}</div> : null}
            </div>
          ))}
          {events.length === 0 ? <div className="text-sm text-slate-500">—</div> : null}
        </div>
      </div>

      <div className="mt-4">
        <div className={corePills.kicker}>ALLARMI (questa MARCA)</div>
        <div className="mt-2 space-y-2">
          {alerts.slice(0, 12).map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{a.severity}</div>
                <div className="text-xs text-slate-500">{formatIt(a.created_at)}</div>
              </div>
              <div className="mt-1 text-sm text-slate-200">{a.type}</div>
              <div className="mt-2">
                <JsonBox value={a.evidence} />
              </div>
            </div>
          ))}
          {alerts.length === 0 ? <div className="text-sm text-slate-500">—</div> : null}
        </div>
      </div>

      <div className="mt-4">
        <div className={corePills.kicker}>{t("NM_DETAILS_PAYLOAD")}</div>
        <div className="mt-2">
          <JsonBox value={row?.payload ?? null} />
        </div>
      </div>
    </div>
  );
}

// src/navemaster/components/ImportMetaBar.tsx
import { useI18n } from "../../i18n/coreI18n";
import type { NavemasterLatestImportV1 } from "../contracts/navemaster.types";
import { corePills } from "../../ui/designSystem";
import { formatIt } from "../contracts/navemaster.logic";

export default function ImportMetaBar(props: { latest: NavemasterLatestImportV1 | null }): JSX.Element {
  const { latest } = props;
  const { t } = useI18n();

  if (!latest) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
        <div className={corePills.kicker}>{t("NM_IMPORT_ACTIVE")}</div>
        <div className="mt-1 text-sm text-slate-400">{t("NM_IMPORT_NONE")}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <div className={corePills.kicker}>{t("NM_IMPORT_ACTIVE")}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-100 font-medium">{latest.file_name ?? "—"}</span>
        <span className="text-slate-500">·</span>
        <span className="text-slate-300">{formatIt(latest.imported_at)}</span>
        {latest.source_sha256 ? (
          <>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 font-mono text-xs">{latest.source_sha256.slice(0, 12)}…</span>
          </>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        costr: <span className="text-slate-400">{latest.costr ?? "—"}</span> · commessa:{" "}
        <span className="text-slate-400">{latest.commessa ?? "—"}</span>
      </div>
    </div>
  );
}

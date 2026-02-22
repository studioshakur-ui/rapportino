// src/navemaster/components/EmptyState.tsx
import { useI18n } from "../../i18n/coreI18n";
import { cardSurface, corePills } from "../../ui/designSystem";

export default function EmptyState(): JSX.Element {
  const { t } = useI18n();
  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#050910] p-6 ${cardSurface(true)}`}>
      <div className={corePills.kicker}>{t("NM_TITLE")}</div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{t("NM_EMPTY_TITLE")}</div>
      <div className="mt-1 text-sm text-slate-400">{t("NM_EMPTY_BODY")}</div>
    </div>
  );
}

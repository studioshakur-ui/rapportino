// src/navemaster/components/AccessDenied.tsx
import { useI18n } from "../../i18n/coreI18n";
import { cardSurface } from "../../ui/designSystem";

export default function AccessDenied(): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="p-4 sm:p-6">
      <div className={`rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 text-rose-200 ${cardSurface(true)}`}>
        <div className="text-xs uppercase tracking-[0.18em]">{t("NM_ACCESS_DENIED_TITLE")}</div>
        <div className="mt-1 text-sm text-rose-100">{t("NM_ACCESS_DENIED_BODY")}</div>
      </div>
    </div>
  );
}

// src/components/rapportino/page/rapportinoPageUtils.ts

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

export function isValidIsoDateParam(v: unknown): boolean {
  const s = safeStr(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;

  const [yy, mm, dd] = s.split("-").map((x) => Number(x));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;

  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  return dt.getUTCFullYear() === yy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd;
}

export function getDateFromSearch(search: unknown): string | null {
  try {
    const sp = new URLSearchParams(String(search || ""));
    const d = sp.get("date");
    if (isValidIsoDateParam(d)) return String(d);
    return null;
  } catch {
    return null;
  }
}

export function setDateInSearch(search: unknown, nextDate: unknown): string {
  const sp = new URLSearchParams(String(search || ""));
  if (nextDate && isValidIsoDateParam(nextDate)) {
    sp.set("date", String(nextDate));
  } else {
    sp.delete("date");
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function hasAnyMeaningfulContent({
  costr,
  commessa,
  rows,
}: {
  costr: unknown;
  commessa: unknown;
  rows: any[];
}): boolean {
  if (safeStr(costr) || safeStr(commessa)) return true;

  const arr = Array.isArray(rows) ? rows : [];
  return arr.some((r) => {
    const descr = safeStr(r?.descrizione_attivita ?? r?.descrizione);
    const cat = safeStr(r?.categoria);
    const note = safeStr(r?.note);
    const opLegacy = safeStr(r?.operatori);
    const tempoLegacy = safeStr(r?.tempo);
    const previsto = r?.previsto;
    const prodotto = r?.prodotto;

    const canon = Array.isArray(r?.operator_items) ? r.operator_items : [];
    const hasCanonOps = canon.some((it: any) => safeStr(it?.label) || safeStr(it?.tempo_raw));

    return (
      descr ||
      cat ||
      note ||
      opLegacy ||
      tempoLegacy ||
      hasCanonOps ||
      (previsto !== null && previsto !== undefined && safeStr(previsto) !== "") ||
      (prodotto !== null && prodotto !== undefined && safeStr(prodotto) !== "")
    );
  });
}

export function buildAutoSaveSignature({
  profileId,
  crewRole,
  reportDate,
  costr,
  commessa,
  rows,
  status,
}: {
  profileId: unknown;
  crewRole: unknown;
  reportDate: unknown;
  costr: unknown;
  commessa: unknown;
  rows: any[];
  status: unknown;
}): string {
  const arr = Array.isArray(rows) ? rows : [];
  const compactRows = arr.map((r) => ({
    categoria: safeStr(r?.categoria),
    descrizione: safeStr(r?.descrizione_attivita ?? r?.descrizione),
    operatori: safeStr(r?.operatori),
    tempo: safeStr(r?.tempo),
    previsto: r?.previsto ?? null,
    prodotto: r?.prodotto ?? null,
    note: safeStr(r?.note),
    activity_id: r?.activity_id ? String(r.activity_id) : null,
    operator_items: Array.isArray(r?.operator_items)
      ? r.operator_items.map((it: any) => ({
          operator_id: it?.operator_id ? String(it.operator_id) : "",
          label: safeStr(it?.label),
          tempo_raw: safeStr(it?.tempo_raw),
          tempo_hours: it?.tempo_hours ?? null,
          line_index: typeof it?.line_index === "number" ? it.line_index : null,
        }))
      : [],
  }));

  return JSON.stringify({
    profileId: profileId ? String(profileId) : "",
    crewRole: crewRole ? String(crewRole) : "",
    reportDate: reportDate ? String(reportDate) : "",
    status: status ? String(status) : "",
    costr: safeStr(costr),
    commessa: safeStr(commessa),
    rows: compactRows,
  });
}

// Only messages owned by TARGHETTI are shown verbatim. Transport/library errors
// use an Italian fallback so the interface never exposes untranslated errors.
export class TarghettiError extends Error {}

export function italianError(error: unknown, fallback = "Operazione non riuscita. Riprova."): string {
  if (error instanceof TarghettiError) return error.message;
  const message = error instanceof Error ? error.message : "";
  if (message === "Type d’événement non pris en charge.") return "Tipo di evento non supportato.";
  if (message === "Événement déjà traité ou inaccessible.") return "Evento già elaborato o non accessibile.";
  return fallback;
}

export function italianSourceIssue(issue: string): string {
  const missing = issue.match(/^Marque PDF sans DATI : (.+)$/);
  if (missing) return `Marca cavo presente nel PDF ma assente dal foglio DATI: ${missing[1]}`;
  return "Segnalazione da verificare nei documenti originali.";
}

export function equipmentDescription(description: string): string {
  if (description === "Appareil relevé sur le PDF") return "Apparecchio rilevato dal PDF";
  if (description === "Référence PDF · câbles à rapprocher") return "Riferimento PDF · cavi da associare";
  return description;
}

export function sourceFieldLabel(key: string): string {
  return ({ "PAGE PDF": "PAGINA PDF", SOURCE: "FONTE" } as Record<string, string>)[key] ?? key;
}

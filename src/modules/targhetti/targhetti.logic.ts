import { TarghettiError } from "./targhetti.locale";
import { projectAutomaticPositions, SDC_AUTOMATIC_POLICY, type ResolutionPacket } from "./targhetti.resolution";
import type { EndpointState, LabelKind, TarghettiCatalogue, TarghettiEvent, PositionChange, DiagramPage, ManualConnection, TarghettiEndpoint } from "./targhetti.types";

// Preserve exact source marks; starred cables are excluded as whole rows.
export const normalizeMark = (value: string): string => value.toUpperCase().replace(/\s+/g, "");
export const normalizeEquipment = (value: string): string => value.toUpperCase().replace(/[.\s]/g, "");
export const isPrintableMark = (mark: string): boolean => !mark.includes("*");
export const printableEndpoints = <T extends { cableMark: string }>(rows: T[]): T[] => rows.filter(e => isPrintableMark(e.cableMark));
export const internalPosition = (row: EndpointState): string => row.confirmedPosition?.trim() || "";
export const hasInternalLabel = (row: EndpointState): boolean => Boolean(internalPosition(row) || row.internalDirect);
export const internalLabel = (row: EndpointState): string => internalPosition(row) ? `${row.cableMark} - ${internalPosition(row)}` : row.cableMark;

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function validateCatalogue(value: unknown): TarghettiCatalogue {
  const c = asRecord(value);
  if (c.schema !== "core.targhetti.v1" || typeof c.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(c.id) || typeof c.createdAt !== "string" || !Number.isFinite(Date.parse(c.createdAt)) || !Array.isArray(c.endpoints) || !Array.isArray(c.pages)) throw new TarghettiError("Fascicolo TARGHETTI non valido.");
  if (!c.endpoints.length || c.endpoints.length > 100_000 || !c.pages.length || c.pages.length > 2_000) throw new TarghettiError("Numero di cavi o pagine non valido.");
  const validBox = (value: unknown) => {
    const b = asRecord(value);
    return ["x", "y", "width", "height"].every(k => typeof b[k] === "number" && Number.isFinite(b[k])) && Number(b.width) >= 0 && Number(b.height) >= 0;
  };
  const ids = new Set<string>();
  for (const raw of c.endpoints) {
    const e = asRecord(raw);
    if (typeof e.id !== "string" || ids.has(e.id) || typeof e.equipmentCode !== "string" || !e.equipmentCode || typeof e.cableMark !== "string" || !e.cableMark.trim() || !Array.isArray(e.candidates) || !["partenza", "arrivo"].includes(String(e.side)) || !Number.isInteger(e.sourceRow)) throw new TarghettiError("Estremità del cavo non valida o duplicata.");
    ids.add(e.id);
    if (!["description", "local", "cableType", "otherEquipmentCode", "otherLocal", "sourceSheet"].every(k => typeof e[k] === "string") || !e.details || Array.isArray(e.details) || typeof e.details !== "object" || Object.values(e.details).some(v => v !== null && typeof v !== "string" && typeof v !== "boolean" && (typeof v !== "number" || !Number.isFinite(v)))) throw new TarghettiError("Dettagli della riga originale non validi.");
    for (const candidate of e.candidates) {
      const p = asRecord(candidate);
      if (typeof p.position !== "string" || !p.position.trim() || typeof p.method !== "string" || !validBox(p.box) || !Number.isInteger(p.page) || Number(p.page) < 1 || Number(p.page) > c.pages.length) throw new TarghettiError("Riferimento PDF non valido.");
    }
  }
  for (let index = 0; index < c.pages.length; index++) {
    const p = asRecord(c.pages[index]);
    if (p.number !== index + 1 || typeof p.text !== "string" || typeof p.title !== "string" || (p.annex !== null && typeof p.annex !== "string") || (p.revision !== null && typeof p.revision !== "string") || !Array.isArray(p.words) || p.words.some(w => typeof asRecord(w).text !== "string" || !validBox(w)) || !Array.isArray(p.equipmentCodes) || p.equipmentCodes.some(v => typeof v !== "string") || !Array.isArray(p.cableMarks) || p.cableMarks.some(v => typeof v !== "string") || typeof p.width !== "number" || !Number.isFinite(p.width) || p.width <= 0 || typeof p.height !== "number" || !Number.isFinite(p.height) || p.height <= 0) throw new TarghettiError("Pagina PDF non valida.");
  }
  for (const key of ["pdf", "excel"]) {
    const file = asRecord(c[key]);
    if (typeof file.name !== "string" || !file.name || typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(file.sha256) || !Number.isInteger(file.size) || Number(file.size) <= 0) throw new TarghettiError("Riferimento del documento originale non valido.");
  }
  if (!Array.isArray(c.issues) || c.issues.some(v => typeof v !== "string")) throw new TarghettiError("Segnalazioni del documento originale non valide.");
  return value as TarghettiCatalogue;
}

export function projectEndpoints(catalogue: TarghettiCatalogue, events: TarghettiEvent[], ownerId: string, resolution?: ResolutionPacket | null): EndpointState[] {
  const initial = catalogue.endpoints.map(e => ({ ...e, confirmedPosition: null, confirmedPage: null, printedMetal: false, printedInternal: false } as EndpointState));
  const prepared = resolution ? projectAutomaticPositions(initial, resolution, catalogue, SDC_AUTOMATIC_POLICY) : initial;
  const rows = new Map(prepared.map(e => [e.id, e]));
  const ordered = [...events].sort((a, b) => (a.validated_at ?? a.created_at).localeCompare(b.validated_at ?? b.created_at) || a.id.localeCompare(b.id));
  for (const event of ordered) {
    const p = asRecord(event.payload);
    if (event.validation_status !== "validated" || event.validated_by !== ownerId || p.owner_id !== ownerId || p.catalogueId !== catalogue.id) continue;
    if (event.event_type === "targhetti.endpoints" && Array.isArray(p.endpoints) && p.endpoints.length) {
      try {
        const additions = validateCatalogue({ ...catalogue, endpoints: p.endpoints }).endpoints;
        if (additions.some(e => [...rows.values()].some(existing => existing.id !== e.id && existing.equipmentCode === e.equipmentCode && normalizeMark(existing.cableMark) === normalizeMark(e.cableMark)))) continue;
        for (const e of additions) {
          if (e.sourceSheet === "PDF" && e.id.startsWith("PDF:") && !rows.has(e.id)) rows.set(e.id, { ...e, confirmedPosition: null, confirmedPage: null, printedMetal: false, printedInternal: false });
        }
      } catch { continue; }
    }
    if (["targhetti.positions", "targhetti.endpoints"].includes(event.event_type) && Array.isArray(p.changes)) {
      for (const raw of p.changes) {
        const change = asRecord(raw);
        const e = rows.get(String(change.endpointId));
        if (!e || typeof change.position !== "string" || !change.position.trim()) continue;
        // An amended connector invalidates the previous internal printing status.
        if (e.internalDirect || e.confirmedPosition !== change.position.trim()) e.printedInternal = false;
        e.internalDirect = false;
        e.decisionMode = "owner";
        e.explicitSourceTBD = false;
        e.resolutionStatus = "resolved";
        e.resolutionEvidence = [];
        e.confirmedPosition = change.position.trim();
        e.confirmedPage = Number.isInteger(change.page) ? Number(change.page) : null;
      }
    }
    if (event.event_type === "targhetti.printed" && Array.isArray(p.labels)) {
      for (const raw of p.labels) {
        const label = asRecord(raw), e = rows.get(String(label.endpointId));
        if (!e || label.cableMark !== e.cableMark) continue;
        if (label.kind === "metal") e.printedMetal = true;
        if (label.kind === "internal" && hasInternalLabel(e) && label.position === (internalPosition(e) || null)) e.printedInternal = true;
      }
    }
  }
  return printableEndpoints([...rows.values()]);
}

export function positionChanges(rows: EndpointState[], edits: Record<string, string>, page: number | null): PositionChange[] {
  return printableEndpoints(rows).map(e => {
    const values = [...new Set(e.candidates.map(c => c.position))];
    const position = (edits[e.id] ?? e.confirmedPosition ?? (e.internalDirect ? "" : values.length === 1 ? values[0] : "")).trim();
    const match = e.candidates.find(c => c.position === position);
    return { endpointId: e.id, position, page: match?.page ?? (position === e.confirmedPosition ? e.confirmedPage : page) };
  }).filter(e => Boolean(e.position));
}

export function labelRows(rows: EndpointState[], kind: LabelKind): { metal: string[]; internal: string[] } {
  rows = printableEndpoints(rows);
  if (!rows.length) throw new TarghettiError("Seleziona almeno un cavo.");
  const missing = rows.filter(e => !hasInternalLabel(e)).length;
  if (kind !== "metal" && missing) throw new TarghettiError(`Collegamenti non ancora estratti per ${missing} cavi.`);
  return { metal: rows.map(e => e.cableMark), internal: kind === "metal" ? [] : rows.map(internalLabel) };
}

export function equipmentGroups(rows: EndpointState[], pagine: DiagramPage[] = []) {
  const groups = new Map<string, { code: string; description: string; local: string; count: number; confirmed: number }>();
  for (const e of printableEndpoints(rows)) {
    const group = groups.get(e.equipmentCode) ?? { code: e.equipmentCode, description: e.description, local: e.local, count: 0, confirmed: 0 };
    group.count++; if (e.confirmedPosition) group.confirmed++;
    groups.set(e.equipmentCode, group);
  }
  for (const page of pagine) {
    for (const code of page.equipmentCodes) {
      if (!groups.has(code)) groups.set(code, { code, description: "Riferimento PDF · cavi da associare", local: "", count: 0, confirmed: 0 });
    }
  }
  return [...groups.values()].sort((a, b) => Number(b.count > 0) - Number(a.count > 0) || a.code.localeCompare(b.code));
}

export function manualConnection(catalogue: TarghettiCatalogue, rows: EndpointState[], input: ManualConnection, id: string): { endpoints: TarghettiEndpoint[]; changes: PositionChange[] } {
  const mark = input.cableMark.trim(), from = normalizeEquipment(input.fromCode), to = normalizeEquipment(input.toCode);
  if (!isPrintableMark(mark)) throw new TarghettiError("I cavi contenenti * sono esclusi da TARGHETTI.");
  if (!mark || !from || !to || !Number.isInteger(input.page) || input.page < 1 || input.page > catalogue.pages.length) throw new TarghettiError("Inserisci la marca cavo, i due apparecchi e la pagina di riferimento.");
  if (rows.some(e => normalizeMark(e.cableMark) === normalizeMark(mark) && [from, to].includes(e.equipmentCode))) throw new TarghettiError("Questa marca cavo è già associata a un apparecchio selezionato. Verifica la riga esistente.");
  const endpoints: TarghettiEndpoint[] = ["partenza", "arrivo"].map(side => {
    const start = side === "partenza", equipment = start ? from : to, position = (start ? input.fromPosition : input.toPosition).trim();
    return { id: `PDF:${id}:${side}`, equipmentCode: equipment, description: rows.find(e => e.equipmentCode === equipment)?.description ?? "Apparecchio rilevato dal PDF", local: (start ? input.fromLocal : input.toLocal).trim(), cableMark: mark, cableType: input.cableType.trim(), otherEquipmentCode: start ? to : from, otherLocal: (start ? input.toLocal : input.fromLocal).trim(), side: side as "partenza" | "arrivo", sourceRow: input.page, sourceSheet: "PDF", details: { "MARCA CAVO": mark, "APP PARTENZA": from, "APP ARRIVO": to, "TIPO CAVO": input.cableType.trim(), "PAGE PDF": input.page, "SOURCE": catalogue.pdf.name }, candidates: position ? [{ position, page: input.page, box: { x: 0, y: 0, width: 0, height: 0 }, method: "Rilevamento manuale dal disegno" }] : [] };
  });
  validateCatalogue({ ...catalogue, endpoints });
  return { endpoints, changes: endpoints.filter(e => e.candidates.length).map(e => ({ endpointId: e.id, position: e.candidates[0].position, page: input.page })) };
}

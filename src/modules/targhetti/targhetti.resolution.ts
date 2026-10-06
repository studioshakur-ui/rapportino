import type { EndpointState, SourceBox, TarghettiCatalogue } from "./targhetti.types";
const normalizeMark = (value: string) => value.toUpperCase().replace(/\s+/g, "");
const normalizeEquipment = (value: string) => value.toUpperCase().replace(/[.\s]/g, "");

export interface ResolutionToken { text: string; box: SourceBox }
export interface ResolutionEvidence {
  page: number;
  cable: ResolutionToken;
  equipment: ResolutionToken;
  equipmentMatch?: "equipment_code" | "catalogue_description" | "approved_alias";
  port: ResolutionToken | null;
  equipmentFrame?: SourceBox;
  contact?: { x: number; y: number };
  unlabelledTerminal?: true;
  path: { method: "vector_path" | "connector_table" | "vector-terminal-frame-v1" | "power-terminal-path-v1" | "vector-direct-terminal-v1"; points: { x: number; y: number }[] };
}
export interface CertifiedResolution {
  endpointId: string; cableMark: string; equipmentCode: string;
  position: string | null;
  status: "resolved" | "direct" | "explicit_source_tbd" | "unresolved" | "ambiguous";
  evidence: ResolutionEvidence[];
}
export interface ResolutionPacket {
  schema: "core.targhetti.resolution.v1";
  documentSha256: string; extractorVersion: string; policyVersion: string;
  resolutions: CertifiedResolution[];
}
export interface AutomaticResolutionPolicy {
  documentSha256: string; extractorVersion: string; policyVersion: string;
  equipmentAliases?: Readonly<Record<string, readonly string[]>>;
}
export const SDC_AUTOMATIC_POLICY: Readonly<AutomaticResolutionPolicy> = Object.freeze({
  documentSha256: "740e28d9b7d43e8442776cac462a1f9470a6b2657e624d30e10c96c6746e31a6",
  extractorVersion: "vector-terminal-frame-v1",
  policyVersion: "unique-path-frame-port-v1",
});
export interface AutomaticallyResolvedEndpoint extends EndpointState {
  internalDirect: boolean;
  resolutionStatus: CertifiedResolution["status"] | "unresolved";
  explicitSourceTBD: boolean;
  resolutionEvidence: ResolutionEvidence[];
  decisionMode: "automatic" | "owner" | "unresolved";
}

const asRecord = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const sourceTBD = (value: string) => value.trim().toUpperCase() === "TBD";

/** Certifies a source-specific package; absence of a port never becomes TBD. */
export function validateResolutionPacket(value: unknown, catalogue: TarghettiCatalogue, policy: AutomaticResolutionPolicy): ResolutionPacket {
  const packet = asRecord(value);
  if (packet.schema !== "core.targhetti.resolution.v1" || packet.documentSha256 !== catalogue.pdf.sha256 || packet.documentSha256 !== policy.documentSha256 || packet.extractorVersion !== policy.extractorVersion || packet.policyVersion !== policy.policyVersion || !policy.extractorVersion || !policy.policyVersion || !Array.isArray(packet.resolutions)) throw new Error("Paquet de résolution hors politique ou source différente.");
  const endpoints = new Map(catalogue.endpoints.map(row => [row.id, row]));
  if (packet.resolutions.length !== endpoints.size) throw new Error("Paquet de résolution incomplet.");
  const seen = new Set<string>();
  const token = (value: unknown, pageNumber: number): ResolutionToken => {
    const item = asRecord(value), box = asRecord(item.box), page = catalogue.pages[pageNumber - 1];
    if (typeof item.text !== "string" || !item.text.trim() || ["x", "y", "width", "height"].some(key => typeof box[key] !== "number" || !Number.isFinite(box[key])) || Number(box.x) < 0 || Number(box.y) < 0 || Number(box.width) <= 0 || Number(box.height) <= 0 || Number(box.x) + Number(box.width) > page.width + 1 || Number(box.y) + Number(box.height) > page.height + 1) throw new Error("Preuve géométrique de résolution invalide.");
    return item as unknown as ResolutionToken;
  };
  for (const value of packet.resolutions) {
    const row = asRecord(value), endpoint = endpoints.get(String(row.endpointId));
    if (!endpoint || seen.has(endpoint.id) || row.cableMark !== endpoint.cableMark || normalizeEquipment(String(row.equipmentCode)) !== normalizeEquipment(endpoint.equipmentCode) || !["resolved", "direct", "explicit_source_tbd", "unresolved", "ambiguous"].includes(String(row.status)) || !Array.isArray(row.evidence)) throw new Error("Résolution sans extrémité source unique.");
    seen.add(endpoint.id);
    const ready = row.status === "resolved" || row.status === "explicit_source_tbd";
    const direct = row.status === "direct";
    if (direct && !row.evidence.length) throw new Error("Raccordement direct sans preuve.");
    if (ready && (typeof row.position !== "string" || !row.position.trim() || !row.evidence.length)) throw new Error("Résolution sans position et preuves complètes.");
    if (!ready && row.position !== null) throw new Error("Une position incertaine ne peut pas être opérationnelle.");
    if (ready && sourceTBD(String(row.position)) !== (row.status === "explicit_source_tbd")) throw new Error("TBD doit être explicitement présent dans la source.");
    for (const rawEvidence of row.evidence) {
      const evidence = asRecord(rawEvidence), pageNumber = Number(evidence.page);
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > catalogue.pages.length) throw new Error("Page de preuve invalide.");
      const cable = token(evidence.cable, pageNumber), equipment = token(evidence.equipment, pageNumber), port = direct ? null : token(evidence.port, pageNumber);
      const path = asRecord(evidence.path), page = catalogue.pages[pageNumber - 1];
      const equipmentMatch = evidence.equipmentMatch ?? "equipment_code";
      const equipmentMatches = equipmentMatch === "equipment_code" ? normalizeEquipment(equipment.text) === normalizeEquipment(endpoint.equipmentCode)
        : equipmentMatch === "catalogue_description" ? Boolean(endpoint.description.trim()) && normalizeMark(equipment.text) === normalizeMark(endpoint.description)
        : equipmentMatch === "approved_alias" ? (policy.equipmentAliases?.[endpoint.equipmentCode] ?? []).some(alias => normalizeMark(alias) === normalizeMark(equipment.text)) : false;
      if (normalizeMark(cable.text) !== normalizeMark(endpoint.cableMark) || !equipmentMatches || (ready && port?.text.trim() !== String(row.position).trim()) || !["vector_path", "connector_table", "vector-terminal-frame-v1", "power-terminal-path-v1", "vector-direct-terminal-v1"].includes(String(path.method)) || !Array.isArray(path.points) || path.points.length < 2 || path.points.some(raw => { const point = asRecord(raw); return typeof point.x !== "number" || typeof point.y !== "number" || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || point.x > page.width || point.y > page.height; })) throw new Error("Association câble, appareil et port non certifiée.");
      if (direct) {
        const frame = asRecord(evidence.equipmentFrame), contact = asRecord(evidence.contact);
        if (evidence.port !== null || evidence.unlabelledTerminal !== true || path.method !== "vector-direct-terminal-v1" || ["x", "y", "width", "height"].some(key => typeof frame[key] !== "number" || !Number.isFinite(frame[key])) || Number(frame.width) <= 0 || Number(frame.height) <= 0 || Number(frame.x) < 0 || Number(frame.y) < 0 || Number(frame.x) + Number(frame.width) > page.width + 1 || Number(frame.y) + Number(frame.height) > page.height + 1 || typeof contact.x !== "number" || typeof contact.y !== "number" || !Number.isFinite(contact.x) || !Number.isFinite(contact.y)) throw new Error("Raccordement direct sans contour et contact prouvés.");
        const x = Number(frame.x), y = Number(frame.y), right = x + Number(frame.width), bottom = y + Number(frame.height), cx = contact.x, cy = contact.y;
        const onBorder = cx >= x - 2 && cx <= right + 2 && cy >= y - 2 && cy <= bottom + 2 && Math.min(Math.abs(cx - x), Math.abs(cx - right), Math.abs(cy - y), Math.abs(cy - bottom)) <= 2;
        const equipmentX = equipment.box.x + equipment.box.width / 2, equipmentY = equipment.box.y + equipment.box.height / 2;
        if (!onBorder || equipmentX < x || equipmentX > right || equipmentY < y || equipmentY > bottom || !path.points.some(raw => { const point = asRecord(raw); return Math.hypot(Number(point.x) - cx, Number(point.y) - cy) <= 2; })) throw new Error("Contact direct hors contour de l’appareil.");
      } else if (path.method === "vector-direct-terminal-v1") throw new Error("Méthode directe incompatible avec une position.");
    }
    if (ready && new Set(row.evidence.map(raw => asRecord(asRecord(raw).port).text)).size !== 1) throw new Error("Preuves de position contradictoires.");
  }
  return value as ResolutionPacket;
}

/** Pure projection: caller must obtain the packet through the event bus activation. */
export function projectAutomaticPositions(rows: EndpointState[], packet: ResolutionPacket, catalogue: TarghettiCatalogue, policy: AutomaticResolutionPolicy): AutomaticallyResolvedEndpoint[] {
  validateResolutionPacket(packet, catalogue, policy);
  const resolutions = new Map(packet.resolutions.map(row => [row.endpointId, row]));
  return rows.map(row => {
    const resolution = resolutions.get(row.id);
    if (row.confirmedPosition) return { ...row, internalDirect: false, resolutionStatus: "resolved", explicitSourceTBD: resolution?.status === "explicit_source_tbd" && resolution.position === row.confirmedPosition, resolutionEvidence: resolution?.position === row.confirmedPosition ? resolution.evidence : [], decisionMode: "owner" };
    const ready = resolution?.status === "resolved" || resolution?.status === "explicit_source_tbd";
    const direct = resolution?.status === "direct";
    return { ...row, internalDirect: direct, confirmedPosition: ready ? resolution.position : null, confirmedPage: ready || direct ? resolution!.evidence[0].page : null, resolutionStatus: resolution?.status ?? "unresolved", explicitSourceTBD: resolution?.status === "explicit_source_tbd", resolutionEvidence: resolution?.evidence ?? [], decisionMode: ready || direct ? "automatic" : "unresolved" };
  });
}

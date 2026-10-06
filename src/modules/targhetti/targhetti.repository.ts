import { TarghettiError } from "./targhetti.locale";
import { supabase } from "../../lib/supabaseClient";
import { createEventBus } from "../../core/events/eventBus";
import { asRecord, hasInternalLabel, internalPosition, manualConnection, printableEndpoints, validateCatalogue } from "./targhetti.logic";
import { SDC_AUTOMATIC_POLICY, validateResolutionPacket, type ResolutionPacket } from "./targhetti.resolution";
import type { TarghettiCatalogue, TarghettiEvent, TarghettiImportPayload, PositionChange, EndpointState, LabelKind, ManualConnection } from "./targhetti.types";

const bucket = () => supabase.storage.from("core-drive");
export async function requireOwner(): Promise<string> {
  const [{ data: auth, error: authError }, { data: owner, error }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("core_command_is_owner")]);
  if (authError || error || !auth.user || !owner) throw new TarghettiError("Accedi con l’account di Hamidou per utilizzare TARGHETTI.");
  return auth.user.id;
}
export const targhettiBus = createEventBus({
  owner: requireOwner,
  async insert(event) {
    const { data, error } = await supabase.from("core_events").insert(event).select().single();
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await supabase.from("core_events").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async transition(id, status, ownerId) {
    const { data, error } = await supabase.from("core_events").update({ validation_status: status, validated_at: new Date().toISOString(), validated_by: ownerId }).eq("id", id).eq("validation_status", "pending").eq("payload->>owner_id", ownerId).select().single();
    if (error) throw error;
    return data;
  },
});

export async function listTarghettiEvents(): Promise<TarghettiEvent[]> {
  const owner = await requireOwner(), all: TarghettiEvent[] = [];
  // Range pagination avoids Supabase's default 1,000-row ceiling.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("core_events").select("id,event_type,validation_status,created_at,validated_at,validated_by,payload").eq("source", "targhetti").eq("payload->>owner_id", owner).order("created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 499);
    if (error) throw error;
    all.push(...data);
    if (data.length < 500) return all;
  }
}
export function importPayload(event: TarghettiEvent): TarghettiImportPayload {
  const p = asRecord(event.payload);
  if (event.event_type !== "targhetti.import" || !["catalogueId", "cataloguePath", "pdfPath", "excelPath", "pdfName", "excelName"].every(k => typeof p[k] === "string") || !Number.isInteger(p.endpointCount) || !Number.isInteger(p.pageCount)) throw new TarghettiError("Importazione TARGHETTI incompleta.");
  return p as unknown as TarghettiImportPayload;
}
async function checkPath(path: string): Promise<void> {
  const owner = await requireOwner();
  if (!path.startsWith(`targhetti/${owner}/`) || path.includes("..")) throw new TarghettiError("Documento originale non accessibile.");
}
export async function downloadSource(path: string): Promise<Blob> {
  await checkPath(path);
  const { data, error } = await bucket().download(path);
  if (error) throw error;
  return data;
}
const cache = new Map<string, TarghettiCatalogue>();
const resolutionCache = new Map<string, ResolutionPacket>();
export async function loadAutomaticResolution(catalogue: TarghettiCatalogue, events: TarghettiEvent[], ownerId: string): Promise<ResolutionPacket | null> {
  const matching = events.filter(event => {
    const p = asRecord(event.payload);
    return event.event_type === "targhetti.auto_resolution" && event.validation_status === "validated" && event.validated_by === ownerId && p.owner_id === ownerId && p.catalogueId === catalogue.id && p.decisionMode === "automatic" && p.documentSha256 === catalogue.pdf.sha256 && p.documentSha256 === SDC_AUTOMATIC_POLICY.documentSha256 && p.extractorVersion === SDC_AUTOMATIC_POLICY.extractorVersion && p.policyVersion === SDC_AUTOMATIC_POLICY.policyVersion;
  }).sort((a,b)=>a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const event = matching[matching.length - 1];
  if (!event) return null;
  const p = asRecord(event.payload);
  if (typeof p.resolutionPath !== "string" || typeof p.resolutionSha256 !== "string" || !/^[a-f0-9]{64}$/.test(p.resolutionSha256)) throw new TarghettiError("Archivio dei collegamenti non valido.");
  const key = `${p.resolutionPath}:${p.resolutionSha256}`;
  if (resolutionCache.has(key)) return validateResolutionPacket(resolutionCache.get(key),catalogue,SDC_AUTOMATIC_POLICY);
  const blob = await downloadSource(p.resolutionPath);
  if (await sha256(blob) !== p.resolutionSha256) throw new TarghettiError("Archivio dei collegamenti non corrispondente alla fonte.");
  const packet = validateResolutionPacket(JSON.parse(await blob.text()),catalogue,SDC_AUTOMATIC_POLICY);
  resolutionCache.set(key,packet);
  return packet;
}
export async function loadCatalogue(event: TarghettiEvent): Promise<TarghettiCatalogue> {
  const p = importPayload(event);
  await checkPath(p.cataloguePath);
  if (cache.has(p.cataloguePath)) return cache.get(p.cataloguePath)!;
  const blob = await downloadSource(p.cataloguePath);
  const catalogue = validateCatalogue(JSON.parse(await blob.text()));
  if (catalogue.id !== p.catalogueId || catalogue.endpoints.length !== p.endpointCount || catalogue.pages.length !== p.pageCount) throw new TarghettiError("Il fascicolo non corrisponde all’importazione.");
  cache.set(p.cataloguePath, catalogue);
  return catalogue;
}
export async function sha256(file: Blob): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))].map(x => x.toString(16).padStart(2, "0")).join("");
}
export async function proposeImport(catalogueFile: File, pdf: File, excel: File) {
  if ([catalogueFile, pdf, excel].some(f => f.size > 49 * 1024 * 1024)) throw new TarghettiError("Un file supera 49 MB.");
  const catalogue = validateCatalogue(JSON.parse(await catalogueFile.text()));
  const hashes = await Promise.all([sha256(pdf), sha256(excel)]);
  if (hashes[0] !== catalogue.pdf.sha256 || hashes[1] !== catalogue.excel.sha256) throw new TarghettiError("I documenti PDF/Excel non corrispondono al fascicolo.");
  const existing = await listTarghettiEvents();
  if (existing.some(e => e.event_type === "targhetti.import" && e.validation_status !== "rejected" && asRecord(e.payload).catalogueId === catalogue.id)) throw new TarghettiError("Questo fascicolo è già stato importato.");
  return targhettiBus.propose("targhetti.import", async owner => {
    const base = `targhetti/${owner}/${catalogue.id}/${crypto.randomUUID()}`;
    const cataloguePath = `${base}/catalogue.json`, pdfPath = `${base}/source.pdf`, excelPath = `${base}/source.xlsx`;
    for (const [path, file, contentType] of [[cataloguePath, catalogueFile, "application/json"], [pdfPath, pdf, "application/pdf"], [excelPath, excel, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]] as const) {
      const { error } = await bucket().upload(path, file, { contentType, upsert: false });
      if (error) throw error;
    }
    return { catalogueId: catalogue.id, cataloguePath, pdfPath, excelPath, pdfName: pdf.name, excelName: excel.name, endpointCount: catalogue.endpoints.length, pageCount: catalogue.pages.length };
  });
}
export function proposePositions(catalogueId: string, changes: PositionChange[]) {
  if (!changes.length) throw new TarghettiError("Inserisci almeno un collegamento.");
  return targhettiBus.propose("targhetti.positions", async () => ({ catalogueId, changes }));
}
export function proposeManualConnection(catalogue: TarghettiCatalogue, rows: EndpointState[], input: ManualConnection) {
  const data = manualConnection(catalogue, rows, input, crypto.randomUUID());
  return targhettiBus.propose("targhetti.endpoints", async () => ({ catalogueId: catalogue.id, ...data }));
}
export function proposePrinted(catalogueId: string, rows: EndpointState[], kind: LabelKind) {
  rows = printableEndpoints(rows);
  if (!rows.length) throw new TarghettiError("Seleziona almeno un cavo.");
  if (kind !== "metal" && rows.some(e => !hasInternalLabel(e))) throw new TarghettiError("Collegamenti interni non ancora completi.");
  return targhettiBus.propose("targhetti.printed", async () => ({ catalogueId, labels: rows.flatMap(e => [
    ...(kind !== "internal" ? [{ endpointId: e.id, cableMark: e.cableMark, position: null, kind: "metal" }] : []),
    ...(kind !== "metal" ? [{ endpointId: e.id, cableMark: e.cableMark, position: internalPosition(e) || null, kind: "internal" }] : []),
  ]) }));
}

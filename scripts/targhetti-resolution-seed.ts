// Server-only, source-specific automatic resolution authorized by Hamidou.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createEventBus } from "../src/core/events/eventBus";
import { validateCatalogue } from "../src/modules/targhetti/targhetti.logic";
import { SDC_AUTOMATIC_POLICY, validateResolutionPacket } from "../src/modules/targhetti/targhetti.resolution";
import type { Database } from "../src/types/supabase.generated";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function main() {
  const [cataloguePath, packetPath] = process.argv.slice(2);
  if (!cataloguePath || !packetPath) throw new Error("Usage: targhetti-resolution-seed <catalogue.json> <resolution.json>");
  const [catalogueText, packetBytes] = await Promise.all([readFile(cataloguePath,"utf8"),readFile(packetPath)]);
  const catalogue = validateCatalogue(JSON.parse(catalogueText));
  const packet = validateResolutionPacket(JSON.parse(packetBytes.toString("utf8")),catalogue,SDC_AUTOMATIC_POLICY);
  const inherited = new Set(Object.keys(process.env));
  for (const file of [".env",".env.local"]) {
    let text: string;
    try { text = await readFile(file,"utf8"); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") continue; throw error; }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (match && !inherited.has(match[1])) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g,"");
    }
  }
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration serveur manquante.");
  const client = createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:owners,error:ownerError} = await client.from("profiles").select("id").eq("is_core_owner",true);
  if (ownerError || owners?.length !== 1) throw new Error("Propriétaire unique requis.");
  const owner = owners[0].id;
  const {data:imports,error:importError} = await client.from("core_events").select("id").eq("event_type","targhetti.import").eq("validation_status","validated").eq("validated_by",owner).eq("payload->>owner_id",owner).eq("payload->>catalogueId",catalogue.id);
  if (importError || imports?.length !== 1) throw new Error("Import source validé unique requis.");
  const {data:bucket,error:bucketError} = await client.storage.getBucket("core-drive");
  if (bucketError || !bucket || bucket.public) throw new Error("Stockage privé requis.");
  const packetSha256 = hash(packetBytes);
  const storagePath = `targhetti/${owner}/${catalogue.id}/resolutions/${packetSha256}.json`;
  const storage = client.storage.from("core-drive");
  const bus = createEventBus({
    owner: async()=>owner,
    async insert(event) { const {data,error} = await client.from("core_events").insert(event).select().single(); if (error || !data) throw new Error("Création événement échouée."); return data; },
    async get(id) { const {data,error} = await client.from("core_events").select().eq("id",id).single(); if (error || !data) throw new Error("Événement inaccessible."); return data; },
    async transition(id,status,ownerId) { const {data,error} = await client.from("core_events").update({validation_status:status,validated_by:ownerId,validated_at:new Date().toISOString()}).eq("id",id).eq("validation_status","pending").eq("payload->>owner_id",ownerId).select().single(); if (error || !data) throw new Error("Activation échouée."); return data; },
  });
  const verifyArchive = async () => {
    const {data,error} = await storage.download(storagePath);
    if (error || !data) throw new Error("Archive de résolution inaccessible.");
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (hash(bytes) !== packetSha256) throw new Error("Empreinte de résolution incorrecte.");
    validateResolutionPacket(JSON.parse(new TextDecoder().decode(bytes)),catalogue,SDC_AUTOMATIC_POLICY);
  };
  const {data:existing,error:existingError} = await client.from("core_events").select("id,validation_status,payload").eq("event_type","targhetti.auto_resolution").eq("payload->>owner_id",owner).eq("payload->>catalogueId",catalogue.id).eq("payload->>resolutionSha256",packetSha256).neq("validation_status","rejected");
  if (existingError || (existing && existing.length > 1)) throw new Error("Résolution non unique.");
  const counts = {resolved:0,direct:0,explicit_source_tbd:0,unresolved:0,ambiguous:0};
  for (const row of packet.resolutions) if (!row.cableMark.includes("*")) counts[row.status]++;
  let event = existing?.[0];
  if (!event) {
    const proposed = await bus.propose("targhetti.auto_resolution",async()=>{
      await storage.upload(storagePath,packetBytes,{contentType:"application/json",upsert:false});
      await verifyArchive();
      return {catalogueId:catalogue.id,documentSha256:packet.documentSha256,extractorVersion:packet.extractorVersion,policyVersion:packet.policyVersion,resolutionPath:storagePath,resolutionSha256:packetSha256,counts,decisionMode:"automatic",authorization:"Hamidou requested complete internal positions without human verification for this PDF"};
    });
    event = proposed;
  }
  await verifyArchive();
  if (event.validation_status === "pending") await bus.activateAutomaticResolution(event.id,async current=>{
    const p = record(current.payload);
    if (p.catalogueId !== catalogue.id || p.documentSha256 !== SDC_AUTOMATIC_POLICY.documentSha256 || p.resolutionSha256 !== packetSha256 || p.resolutionPath !== storagePath || p.policyVersion !== SDC_AUTOMATIC_POLICY.policyVersion || p.extractorVersion !== SDC_AUTOMATIC_POLICY.extractorVersion) throw new Error("Activation hors politique.");
    await verifyArchive();
  });
  const verified = await busTransportRead(event.id);
  if (verified.validation_status !== "validated" || verified.validated_by !== owner || record(verified.payload).decisionMode !== "automatic") throw new Error("Vérification activation échouée.");
  console.log(JSON.stringify({eventId:event.id,counts,decisionMode:"automatic",status:verified.validation_status}));
  async function busTransportRead(id:string) { const {data,error} = await client.from("core_events").select().eq("id",id).single(); if (error || !data) throw new Error("Résolution inaccessible."); return data; }
}
main().catch(error=>{console.error(error instanceof Error && !/https?:\/\/|eyJ/.test(error.message) ? error.message : "Résolution automatique échouée.");process.exitCode=1;});

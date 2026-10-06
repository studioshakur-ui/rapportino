// Run only on the workstation: the service key never enters the Vite bundle.
// This command proposes an import; it cannot validate business state.
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase.generated";
import { createEventBus } from "../src/core/events/eventBus";
import { validateCatalogue } from "../src/modules/targhetti/targhetti.logic";

async function main() {
  const [cataloguePath, pdfPath, excelPath] = process.argv.slice(2);
  if (!cataloguePath || !pdfPath || !excelPath) throw new Error("Usage: targhetti-seed <catalogue.core.json> <source.pdf> <source.xlsx>");
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables serveur Supabase manquantes.");
  const buffers = await Promise.all([readFile(cataloguePath), readFile(pdfPath), readFile(excelPath)]);
  const catalogue = validateCatalogue(JSON.parse(buffers[0].toString("utf8")));
  const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
  if (hash(buffers[1]) !== catalogue.pdf.sha256 || hash(buffers[2]) !== catalogue.excel.sha256) throw new Error("Empreintes des sources différentes du catalogue.");
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: owners, error: ownerError } = await client.from("profiles").select("id").eq("is_core_owner", true);
  if (ownerError || owners?.length !== 1) throw new Error("Un propriétaire CORE unique est nécessaire.");
  const owner = owners[0].id;
  const { data: existing, error: existingError } = await client.from("core_events").select("id,validation_status").eq("source", "targhetti").eq("event_type", "targhetti.import").eq("payload->>owner_id", owner).eq("payload->>catalogueId", catalogue.id).neq("validation_status", "rejected").limit(1);
  if (existingError) throw existingError;
  if (existing?.length) { console.log(JSON.stringify({ alreadyImported: true, eventId: existing[0].id, status: existing[0].validation_status })); return; }
  const { data: bucket, error: bucketError } = await client.storage.getBucket("core-drive");
  if (bucketError || !bucket || bucket.public) throw new Error("Bucket core-drive privé requis.");
  const bus = createEventBus({
    owner: async () => owner,
    async insert(event) { const { data, error } = await client.from("core_events").insert(event).select().single(); if (error) throw error; return data; },
    async get() { throw new Error("Seed : lecture d’événement non utilisée."); },
    async transition() { throw new Error("Seed : validation interdite. Contrôler dans CORE."); },
  });
  const event = await bus.propose("targhetti.import", async () => {
    const base = `targhetti/${owner}/${catalogue.id}/${randomUUID()}`;
    const paths = [`${base}/catalogue.json`, `${base}/source.pdf`, `${base}/source.xlsx`];
    const contentTypes = ["application/json", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    for (let index = 0; index < paths.length; index++) {
      const { error } = await client.storage.from("core-drive").upload(paths[index], buffers[index], { contentType: contentTypes[index], upsert: false });
      if (error) throw error;
    }
    return { catalogueId: catalogue.id, cataloguePath: paths[0], pdfPath: paths[1], excelPath: paths[2], pdfName: catalogue.pdf.name, excelName: catalogue.excel.name, endpointCount: catalogue.endpoints.length, pageCount: catalogue.pages.length };
  });
  console.log(JSON.stringify({ eventId: event.id, status: event.validation_status, catalogueId: catalogue.id, endpoints: catalogue.endpoints.length, pages: catalogue.pages.length }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error?.message ?? "Import échoué")); process.exitCode = 1; });

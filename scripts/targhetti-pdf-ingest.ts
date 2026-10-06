// Server-only archival ingestion. All events remain pending; no connector is confirmed.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase.generated";
import { createEventBus } from "../src/core/events/eventBus";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const hash = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(record(value)).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
};

async function loadServerEnvironment() {
  const inherited = new Set(Object.keys(process.env));
  for (const file of [".env", ".env.local"]) {
    let content: string;
    try { content = await readFile(file, "utf8"); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw new Error("Impossible de lire la configuration serveur.");
    }
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || inherited.has(match[1])) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      else value = value.replace(/\s+#.*$/, "");
      process.env[match[1]] = value;
    }
  }
}

async function main() {
  const [sourcePath, indexPath] = process.argv.slice(2);
  if (!sourcePath || !indexPath) throw new Error("Usage: targhetti-pdf-ingest <source.pdf> <index.json>");
  const [source, indexText] = await Promise.all([readFile(sourcePath), readFile(indexPath, "utf8")]);
  const index = record(JSON.parse(indexText));
  const document = { ...record(index.source), ...record(index.document) };
  const pages = index.pages;
  const extractorVersion = index.extractorVersion ?? document.extractorVersion ?? record(index.extractor).version;
  if (typeof extractorVersion !== "string" || !/^[a-zA-Z0-9._-]{1,100}$/.test(extractorVersion)) throw new Error("Version extracteur invalide.");
  if (typeof document.name !== "string" || !document.name || document.sha256 !== hash(source) || document.size !== source.length || !Array.isArray(pages) || !pages.length || document.pageCount !== pages.length) throw new Error("Document, empreinte ou nombre de pages incohérent.");
  if (source.subarray(0, 5).toString() !== "%PDF-") throw new Error("Source PDF invalide.");
  for (let i = 0; i < pages.length; i++) {
    const page = record(pages[i]);
    if (page.number !== i + 1 || typeof page.text !== "string" || !Array.isArray(page.words)) throw new Error(`Page ${i + 1} invalide ou manquante.`);
    if (gzipSync(Buffer.from(canonical(page), "utf8")).length > 49 * 1024 * 1024) throw new Error(`Archive page ${i + 1} dépasse 49 Mo.`);
  }
  await loadServerEnvironment();
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration serveur Supabase manquante.");
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: owners, error: ownerError } = await client.from("profiles").select("id").eq("is_core_owner", true);
  if (ownerError || owners?.length !== 1) throw new Error("Un propriétaire CORE unique est nécessaire.");
  const owner = owners[0].id;
  const storage = client.storage.from("core-drive");
  const { data: bucket, error: bucketError } = await client.storage.getBucket("core-drive");
  if (bucketError || !bucket || bucket.public) throw new Error("Bucket core-drive privé requis.");
  const base = `targhetti/${owner}/pdf/${document.sha256}`;
  const sourceStoragePath = `${base}/source.pdf`;
  const bus = createEventBus({
    owner: async () => owner,
    async insert(event) { const { data, error } = await client.from("core_events").insert(event).select().single(); if (error || !data) throw new Error("Écriture événement échouée."); return data; },
    async get() { throw new Error("Lecture opérationnelle interdite dans l'ingestion documentaire."); },
    async transition() { throw new Error("Validation opérationnelle interdite dans l'ingestion documentaire."); },
  });
  const existing = async (type: string, pageNumber?: number) => {
    let query = client.from("core_events").select("id,payload").eq("source", "targhetti").eq("event_type", type).eq("payload->>owner_id", owner).eq("payload->>documentSha256", String(document.sha256)).eq("payload->>extractorVersion", extractorVersion).neq("validation_status", "rejected");
    if (pageNumber !== undefined) query = query.eq("payload->>pageNumber", String(pageNumber));
    const { data, error } = await query.limit(2);
    if (error || (data && data.length > 1)) throw new Error("Lecture ou unicité des événements documentaires échouée.");
    return data?.[0];
  };
  const storeVerified = async (path: string, bytes: Uint8Array, contentType: string) => {
    const { error: uploadError } = await storage.upload(path, bytes, { contentType, upsert: false });
    // A previous interrupted run may already have uploaded this immutable object.
    const { data: downloaded, error } = await storage.download(path);
    if (error || !downloaded || hash(new Uint8Array(await downloaded.arrayBuffer())) !== hash(bytes)) throw new Error(uploadError ? "Archivage source échoué." : "Vérification Storage échouée.");
  };
  const pageEventIds: string[] = [];
  for (const rawPage of pages) {
    const page = record(rawPage), pageNumber = Number(page.number);
    const pageJson = canonical(page), pageSha256 = hash(pageJson);
    const archiveBytes = gzipSync(Buffer.from(pageJson, "utf8")), archiveSha256 = hash(archiveBytes);
    let event = await existing("targhetti.pdf_page", pageNumber);
    if (event && record(event.payload).pageSha256 !== pageSha256) throw new Error(`Extraction divergente page ${pageNumber} : changer la version extracteur.`);
    if (!event) {
      const created = await bus.propose("targhetti.pdf_page", async () => {
        if (pageNumber === 1) await storeVerified(sourceStoragePath, source, "application/pdf");
        const common = { documentSha256: document.sha256, extractorVersion, pageNumber, pageSha256, archiveSha256, encoding: "gzip", archiveSize: archiveBytes.length, wordCount: (page.words as unknown[]).length, drawingCount: Array.isArray(page.drawings) ? page.drawings.length : 0, textLength: String(page.text).length };
        const pagePath = `${base}/${extractorVersion}/page-${pageNumber}-${pageSha256}.json.gz`;
        await storeVerified(pagePath, archiveBytes, "application/gzip");
        return { ...common, pagePath };
      });
      event = { id: created.id, payload: created.payload };
    }
    const verified = await existing("targhetti.pdf_page", pageNumber);
    if (!verified || verified.id !== event.id || record(verified.payload).pageSha256 !== pageSha256) throw new Error(`Vérification événement page ${pageNumber} échouée.`);
    const payload = record(verified.payload);
    if (typeof payload.pagePath !== "string" || !payload.pagePath.startsWith(`${base}/${extractorVersion}/`)) throw new Error(`Archive page ${pageNumber} manquante.`);
    {
      const { data, error } = await storage.download(payload.pagePath);
      if (error || !data || payload.encoding !== "gzip") throw new Error(`Archive page ${pageNumber} inaccessible.`);
      const downloadedBytes = new Uint8Array(await data.arrayBuffer());
      if (hash(downloadedBytes) !== payload.archiveSha256 || hash(gunzipSync(downloadedBytes)) !== pageSha256) throw new Error(`Archive page ${pageNumber} corrompue.`);
    }
    pageEventIds.push(event.id);
  }
  const manifest = await existing("targhetti.pdf_index");
  if (manifest) {
    const payload = record(manifest.payload);
    if (payload.totalCount !== pages.length || JSON.stringify(payload.pageEventIds) !== JSON.stringify(pageEventIds)) throw new Error("Manifest existant divergent.");
  }
  const manifestId = manifest?.id ?? (await bus.propose("targhetti.pdf_index", async () => {
    await storeVerified(sourceStoragePath, source, "application/pdf");
    const audit = record(index.audit);
    const compactAudit = Object.fromEntries(Object.entries(audit).filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value)));
    return { documentSha256: document.sha256, extractorVersion, extractor: record(index.extractor), audit: compactAudit, document, sourcePath: sourceStoragePath, pageEventIds, totalCount: pages.length, indexSha256: hash(indexText), purpose: "documentary_index_only" };
  })).id;
  const verifiedManifest = await existing("targhetti.pdf_index");
  if (!verifiedManifest || verifiedManifest.id !== manifestId || record(verifiedManifest.payload).totalCount !== pages.length) throw new Error("Vérification finale du manifest échouée.");
  const { data: archivedSource, error: sourceError } = await storage.download(sourceStoragePath);
  if (sourceError || !archivedSource || hash(new Uint8Array(await archivedSource.arrayBuffer())) !== document.sha256) throw new Error("Vérification finale du PDF échouée.");
  console.log(JSON.stringify({ manifestId, documentSha256: document.sha256, extractorVersion, verifiedPages: pageEventIds.length, status: "pending", sourceArchived: true }));
}
main().catch(error => { console.error(error instanceof Error && !/https?:\/\/|eyJ/.test(error.message) ? error.message : "Ingestion documentaire échouée."); process.exitCode = 1; });

// src/features/core-command/terrain-images/TerrainImagesPage.tsx
// Images terrain — captures de liste reçues sur Telegram, analysées par GPT-4o Vision.
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabaseClient";
import { AppBar, Screen, Pill, EmptyState, StatCard } from "../../../components/command-ui";

const BUCKET = "terrain-images";

interface ImageMsg {
  id: string;
  sender_name: string | null;
  message_ts: string;
  image_path: string;
  vision_processed: boolean;
  vision_result: VisionResult | null;
}

interface VisionResult {
  list_number: string | null;
  list_date: string | null;
  rows_count: number;
  apparati: number;
  posato: number;
  priority: number;
  annotations: string[];
  parsed_at: string;
}

interface ParseResponse {
  ok: boolean;
  dry_run?: boolean;
  processed: number;
  snapshots_created: number;
  results: Array<{
    message_id: string;
    rows_found: number;
    apparati: number;
    posato: number;
    priority: number;
    annotations: string[];
  }>;
  errors: string[];
}

async function fetchImages(): Promise<ImageMsg[]> {
  const { data, error } = await supabase
    .from("incoming_messages")
    .select("id, sender_name, message_ts, image_path, vision_processed, vision_result")
    .not("image_path", "is", null)
    .order("message_ts", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as ImageMsg[];
}

async function callParse(opts: { dryRun?: boolean; messageId?: string }): Promise<ParseResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Non authentifié");
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const resp = await fetch(`${base}/functions/v1/parse-terrain-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
    body: JSON.stringify({ dry_run: opts.dryRun ?? false, message_id: opts.messageId, limit: 5 }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }
  return resp.json();
}

function ThumbImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (!active) return;
      if (data?.signedUrl) setUrl(data.signedUrl); else setErr(true);
    }).catch(() => active && setErr(true));
    return () => { active = false; };
  }, [path]);

  if (err) return <div className="flex h-32 w-full items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">image indisponible</div>;
  if (!url) return <div className="h-32 w-full animate-pulse rounded-lg bg-gray-100" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="capture liste terrain" className="h-32 w-full rounded-lg border border-gray-200 object-cover transition hover:opacity-90" />
    </a>
  );
}

export default function TerrainImagesPage(): JSX.Element {
  const [running, setRunning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: images, isLoading, refetch } = useQuery({
    queryKey: ["terrain_images"],
    queryFn: fetchImages,
    staleTime: 10_000,
  });

  const all = images ?? [];
  const unparsed = all.filter((i) => !i.vision_processed).length;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setError(null);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `manual/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: rec, error: insErr } = await supabase
        .from("incoming_messages")
        .insert({
          source: "manual-upload",
          sender_name: "Import manuel",
          message_ts: new Date().toISOString(),
          message_type: "media",
          image_path: path,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      void refetch();
      await run(false, rec.id);
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  }

  async function run(dryRun: boolean, messageId?: string) {
    setRunning(true); setError(null); setResult(null);
    try {
      const res = await callParse({ dryRun, messageId });
      setResult(res);
      if (!dryRun) refetch();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Screen className="max-w-5xl space-y-6">
      <AppBar
        title="Images terrain"
        subtitle="Captures de liste Telegram. Vert = posé, rose = priorité. Analysées par GPT-4o Vision."
        action={<Pill tone={unparsed > 0 ? "amber" : "emerald"}>{unparsed} à analyser</Pill>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Images reçues" value={all.length} tone="neutral" />
        <StatCard label="Non analysées" value={unparsed} tone={unparsed > 0 ? "amber" : "neutral"} helper={unparsed > 0 ? "prêtes pour la vision" : "tout à jour"} />
        <StatCard label="Analysées" value={all.length - unparsed} tone="emerald" />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => run(false)}
          disabled={running || uploading || unparsed === 0}
          className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
        >
          {running ? "Analyse en cours…" : `Analyser ${unparsed} image${unparsed > 1 ? "s" : ""} avec Vision`}
        </button>
        <button
          onClick={() => run(true)}
          disabled={running || uploading || unparsed === 0}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Aperçu (dry run)
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={running || uploading}
          className="min-h-11 rounded-lg border border-blue-300 bg-blue-50 px-5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
        >
          {uploading ? "Importation…" : "Importer une image"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className={`rounded-xl border p-4 text-sm ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <p className="font-semibold text-gray-900">{result.dry_run ? "Aperçu (aucune écriture)" : "Analyse terminée"}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
            <span>{result.processed} image(s)</span>
            <span className="text-blue-700">{result.snapshots_created} apparati mis à jour</span>
          </div>
          {result.results.map((r) => (
            <div key={r.message_id} className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
              <span className="text-gray-700">{r.rows_found} lignes · {r.apparati} apparati · </span>
              <span className="text-emerald-700">{r.posato} lignes vertes</span>
              <span className="text-gray-400"> · </span>
              <span className="text-red-700">{r.priority} priorités</span>
              {r.annotations.length > 0 && <p className="mt-1 italic text-gray-500">{r.annotations.join(" · ")}</p>}
            </div>
          ))}
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-amber-700">{result.errors.length} erreur(s)</summary>
              <ul className="mt-1 space-y-0.5">
                {result.errors.map((e, i) => <li key={i} className="font-mono text-xs text-red-600">{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />)}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          title="Aucune image reçue"
          description="Les captures de liste envoyées sur Telegram apparaîtront ici pour analyse."
          icon="📷"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((img) => (
            <div key={img.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <ThumbImage path={img.image_path} />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-700">{img.sender_name ?? "?"}</span>
                {img.vision_processed
                  ? <Pill tone="emerald">analysée</Pill>
                  : <Pill tone="amber">en attente</Pill>}
              </div>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {new Date(img.message_ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </p>
              {img.vision_result && (
                <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-gray-500">{img.vision_result.rows_count} lignes · {img.vision_result.apparati} apparati</span>
                    {img.vision_result.posato > 0 && <span className="text-emerald-700">{img.vision_result.posato} vertes</span>}
                    {img.vision_result.priority > 0 && <span className="text-red-700">{img.vision_result.priority} prio</span>}
                  </div>
                  {img.vision_result.annotations.length > 0 && (
                    <p className="italic text-gray-500">{img.vision_result.annotations.join(" · ")}</p>
                  )}
                </div>
              )}
              {!img.vision_processed && (
                <button
                  onClick={() => run(false, img.id)}
                  disabled={running}
                  className="mt-2 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
                >
                  Analyser cette image
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}

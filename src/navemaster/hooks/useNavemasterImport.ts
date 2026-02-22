// src/navemaster/hooks/useNavemasterImport.ts
import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type ImportPhase = "IDLE" | "UPLOADING" | "CALLING_BACKEND" | "DONE" | "ERROR";

type BackendMode = "DRY_RUN" | "COMMIT" | "FORCE_REPLACE";

export type NavemasterImportResult = {
  ok: boolean;
  message?: string;
  meta?: Record<string, unknown>;
  // backend can return anything; keep it opaque but stable
  raw?: unknown;
};

function normalizeError(e: unknown): string {
  if (!e) return "Errore sconosciuto";
  if (typeof e === "string") return e;
  const anyE = e as any;
  if (anyE.message) return String(anyE.message);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function uploadToStorage(params: { bucket: string; shipId: string; file: File }): Promise<{ path: string; file_name: string }> {
  const { bucket, shipId, file } = params;
  const safeName = String(file?.name || "NAVEMASTER.xlsx").replace(/[^\w.\-]+/g, "_");
  const path = `ships/${shipId}/navemaster/${nowStamp()}_${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file?.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  if (error) throw error;
  return { path, file_name: safeName };
}

async function callBackendFunction(payload: Record<string, unknown>): Promise<unknown> {
  // keep same endpoint as existing system
  const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
  const base = isLocal ? "http://localhost:8888" : "";
  const url = `${base}/.netlify/functions/navemaster-import`;

  const { data: auth } = await supabase.auth.getSession();
  const token = auth?.session?.access_token;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      // anon key is public; backend may require it. keep same behavior.
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { ok: false, message: text };
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

export function useNavemasterImport(): {
  loading: boolean;
  phase: ImportPhase;
  error: string | null;
  result: NavemasterImportResult | null;
  reset: () => void;

  dryRun: (args: { shipId: string; costr: string; commessa: string; note?: string; bucket: string; file: File }) => Promise<void>;
  commit: (args: { shipId: string; costr: string; commessa: string; note?: string; bucket: string; file: File }) => Promise<void>;
  forceReplace: (args: { shipId: string; costr: string; commessa: string; note?: string; bucket: string; file: File }) => Promise<void>;
} {
  const [phase, setPhase] = useState<ImportPhase>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NavemasterImportResult | null>(null);

  const reset = useCallback(() => {
    setPhase("IDLE");
    setError(null);
    setResult(null);
  }, []);

  const run = useCallback(
    async (mode: BackendMode, args: { shipId: string; costr: string; commessa: string; note?: string; bucket: string; file: File }) => {
      try {
        setPhase("UPLOADING");
        setError(null);
        setResult(null);

        const up = await uploadToStorage({ bucket: args.bucket, shipId: args.shipId, file: args.file });

        setPhase("CALLING_BACKEND");

        const payload = {
          mode,
          ship_id: args.shipId,
          costr: args.costr,
          commessa: args.commessa,
          note: args.note || "",
          file_bucket: args.bucket,
          file_path: up.path,
          file_name: up.file_name,
        };

        const out = await callBackendFunction(payload);
        setResult({ ok: true, raw: out, meta: { mode } });
        setPhase("DONE");
      } catch (e) {
        setError(normalizeError(e));
        setResult({ ok: false, message: normalizeError(e), raw: e });
        setPhase("ERROR");
      }
    },
    []
  );

  return {
    loading: phase === "UPLOADING" || phase === "CALLING_BACKEND",
    phase,
    error,
    result,
    reset,

    dryRun: (args) => run("DRY_RUN", args),
    commit: (args) => run("COMMIT", args),
    forceReplace: (args) => run("FORCE_REPLACE", args),
  };
}
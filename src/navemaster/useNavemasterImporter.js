import { useCallback, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function normalizeError(e) {
  if (!e) return "Erreur inconnue";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(
    d.getSeconds()
  )}`;
}

async function uploadToStorage({ bucket, shipId, file }) {
  const safeName = String(file?.name || "NAVEMASTER.xlsx").replace(/[^\w.\-]+/g, "_");
  const path = `ships/${shipId}/navemaster/${nowStamp()}_${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file?.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  if (error) throw error;
  return { path, file_name: safeName };
}

async function callBackendFunction(payload) {
  const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
  const base = isLocal ? "http://localhost:8888" : "";
  const url = `${base}/.netlify/functions/navemaster-import`;

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error("Session manquante (access_token).");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let jsonBody = null;
  try {
    jsonBody = text ? JSON.parse(text) : null;
  } catch {
    jsonBody = { ok: false, error: "invalid_json_response", raw: text };
  }

  // Gestion propre des erreurs HTTP (dont 409 one-shot)
  if (!res.ok) {
    const msg =
      jsonBody?.message ||
      jsonBody?.details ||
      jsonBody?.error ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = jsonBody;
    throw err;
  }

  return jsonBody;
}

export function useNavemasterImporter() {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | uploading | calling | done | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const reset = useCallback(() => {
    setLoading(false);
    setPhase("idle");
    setError(null);
    setResult(null);
  }, []);

  const dryRun = useCallback(async ({ ship_id, costr, commessa, file, note, bucket = "navemaster" }) => {
    setLoading(true);
    setPhase("uploading");
    setError(null);
    setResult(null);

    try {
      const up = await uploadToStorage({ bucket, shipId: ship_id, file });
      setPhase("calling");

      const payload = {
        mode: "DRY_RUN",
        ship_id,
        costr: costr || null,
        commessa: commessa || null,
        bucket,
        path: up.path,
        file_name: up.file_name,
        note: note || null,
      };

      const res = await callBackendFunction(payload);
      setResult(res);
      setPhase("done");
      return res;
    } catch (e) {
      setPhase("error");
      setError(normalizeError(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const commit = useCallback(async ({ ship_id, costr, commessa, file, note, bucket = "navemaster" }) => {
    setLoading(true);
    setPhase("uploading");
    setError(null);
    setResult(null);

    try {
      const up = await uploadToStorage({ bucket, shipId: ship_id, file });
      setPhase("calling");

      const payload = {
        mode: "COMMIT",
        ship_id,
        costr: costr || null,
        commessa: commessa || null,
        bucket,
        path: up.path,
        file_name: up.file_name,
        note: note || null,
      };

      const res = await callBackendFunction(payload);
      setResult(res);
      setPhase("done");
      return res;
    } catch (e) {
      // cas one-shot: 409 => message métier plus clair (sans casser le debug)
      if (e?.status === 409 && e?.payload?.error === "navemaster_already_initialized") {
        setError("NAVEMASTER est déjà initialisé pour ce navire (one-shot). COMMIT refusé.");
      } else {
        setError(normalizeError(e));
      }
      setPhase("error");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const forceCommit = useCallback(async ({ ship_id, costr, commessa, file, note, bucket = "navemaster" }) => {
    setLoading(true);
    setPhase("uploading");
    setError(null);
    setResult(null);

    try {
      const up = await uploadToStorage({ bucket, shipId: ship_id, file });
      setPhase("calling");

      const payload = {
        mode: "FORCE_REPLACE",
        ship_id,
        costr: costr || null,
        commessa: commessa || null,
        bucket,
        path: up.path,
        file_name: up.file_name,
        note: note || null,
      };

      const res = await callBackendFunction(payload);
      setResult(res);
      setPhase("done");
      return res;
    } catch (e) {
      setPhase("error");
      setError(normalizeError(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { dryRun, commit, forceCommit, loading, phase, error, result, reset };
}

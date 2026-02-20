import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ADMIN-only password reset / set endpoint.
// P0 hardening:
// - CORS allowlist parity with other admin functions (ADMIN_ALLOWED_ORIGINS)
// - Fix front/back mismatch by generating a strong password server-side when not provided
// - CNCS-grade append-only audit in public.admin_actions_audit

const corsHeadersBase = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
} as const;

function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowlist = parseAllowlist(Deno.env.get("ADMIN_ALLOWED_ORIGINS"));

  // Secure by configuration: if allowlist is provided, enforce it strictly.
  if (allowlist.length > 0) {
    const allowed = allowlist.includes(origin);
    return {
      ...corsHeadersBase,
      "Access-Control-Allow-Origin": allowed ? origin : "null",
    };
  }

  // Dev default: reflect Origin if present, else '*'
  return {
    ...corsHeadersBase,
    "Access-Control-Allow-Origin": origin || "*",
  };
}

function okPreflight(req: Request) {
  return new Response(null, { status: 204, headers: corsHeadersFor(req) });
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeadersFor(req),
    },
  });
}

function getBearerToken(req: Request): string {
  const h = req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function randomPassword(len: number): string {
  // Strong-enough random password generator (no ambiguous chars)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function requireAdmin(req: Request, adminClient: ReturnType<typeof createClient>) {
  const token = getBearerToken(req);
  if (!token) return { ok: false as const, status: 401, error: "Missing bearer token" };

  const { data: caller, error: callerErr } = await adminClient.auth.getUser(token);
  if (callerErr || !caller?.user?.id) return { ok: false as const, status: 401, error: "Unauthorized" };

  const callerId = caller.user.id;

  const { data: prof, error: profErr } = await adminClient
    .from("profiles")
    .select("app_role,email")
    .eq("id", callerId)
    .single();

  if (profErr || prof?.app_role !== "ADMIN") return { ok: false as const, status: 403, error: "Forbidden" };

  return { ok: true as const, callerId, callerEmail: prof?.email ?? null };
}

async function insertAdminAudit(
  admin: ReturnType<typeof createClient>,
  row: {
    actor_id: string;
    actor_email: string | null;
    action: string;
    target_user_id: string;
    target_email: string | null;
    mode?: string | null;
    reason: string | null;
    meta: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("admin_actions_audit").insert({
    actor_id: row.actor_id,
    actor_email: row.actor_email,
    action: row.action,
    target_user_id: row.target_user_id,
    target_email: row.target_email,
    mode: row.mode ?? null,
    reason: row.reason,
    meta: row.meta,
  });
  if (error) throw new Error(`Admin audit insert failed: ${error.message}`);
}

serve(async (req) => {
  // 1) Preflight FIRST
  if (req.method === "OPTIONS") return okPreflight(req);

  // 2) Method guard
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(req, 500, { ok: false, error: "Missing server env" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Access control (ADMIN only)
    const gate = await requireAdmin(req, admin);
    if (!gate.ok) return json(req, gate.status, { ok: false, error: gate.error });

    // Payload
    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();
    const rawPassword = String(body.password || "").trim();
    const reason = String(body.reason || "").trim() || null;

    if (!userId || !isUuid(userId)) return json(req, 400, { ok: false, error: "Invalid user_id" });

    // If password is not provided, generate one server-side (fixes front/back mismatch).
    const generated = !rawPassword;
    const password = rawPassword || randomPassword(16);
    if (!password || password.length < 10) return json(req, 400, { ok: false, error: "Invalid password" });

    // Load target profile email for audit/banner
    const { data: targetProfile, error: tpErr } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (tpErr) return json(req, 500, { ok: false, error: "Profile lookup failed" });

    // Update AUTH password
    const { error: pwdErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (pwdErr) return json(req, 500, { ok: false, error: pwdErr.message });

    // Force onboarding: user must change password on next login
    const { error: flagErr } = await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);

    if (flagErr) return json(req, 500, { ok: false, error: "Profile update failed" });

    // CNCS-grade: write immutable admin audit (append-only)
    await insertAdminAudit(admin, {
      actor_id: gate.callerId,
      actor_email: gate.callerEmail,
      action: "user.set_password",
      target_user_id: userId,
      target_email: targetProfile?.email ?? null,
      reason,
      meta: { generated },
    });

    // Backward compatible with existing UI expectations
    return json(req, 200, { ok: true, password, email: targetProfile?.email ?? null, generated });
  } catch (e) {
    console.error("[admin-set-password] fatal:", e);
    return json(req, 500, { ok: false, error: "Internal error" });
  }
});
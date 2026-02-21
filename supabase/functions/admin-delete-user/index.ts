// supabase/functions/admin-delete-user/index.ts
// CNCS-grade user disable/reactivate/hard-delete (ADMIN-only)
// - CORS via shared helper
// - Bearer token required (caller must be ADMIN)
// - mode:
//   - "suspend": bans auth user + sets profiles.disabled_at = now()
//   - "reactivate": unbans auth user + sets profiles.disabled_at = null
//   - "hard_delete": deletes auth user + deletes profiles row (irreversible)
// - Audit best-effort in public.admin_actions_audit (never blocks the action)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

type Json = Record<string, unknown>;

function json(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function safeText(v: unknown, maxLen = 240): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  if (!e) return null;
  if (!e.includes("@") || e.length > 254) return null;
  return e;
}

function normalizeMode(v: unknown): "suspend" | "reactivate" | "hard_delete" | null {
  if (typeof v !== "string") return null;
  const m = v.trim().toLowerCase();
  if (m === "suspend" || m === "reactivate" || m === "hard_delete") return m;
  return null;
}

type Gate = { ok: true; callerId: string } | { ok: false; status: number; error: string };

async function requireAdmin(admin: ReturnType<typeof createClient>, req: Request): Promise<Gate> {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, error: "Missing bearer token" };

  const { data: userRes, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !userRes?.user?.id) return { ok: false, status: 401, error: "Invalid token" };

  const callerId = userRes.user.id;

  const { data: prof, error: pErr } = await admin
    .from("profiles")
    .select("id, app_role")
    .eq("id", callerId)
    .maybeSingle();

  if (pErr || !prof?.id) return { ok: false, status: 403, error: "Profile not found" };
  if (String(prof.app_role || "").toUpperCase() !== "ADMIN") return { ok: false, status: 403, error: "ADMIN only" };

  return { ok: true, callerId };
}

type AuditInsert = {
  actor_id: string;
  actor_email: string | null;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  reason: string | null;
  meta: Json | null;
};

async function insertAdminAudit(admin: ReturnType<typeof createClient>, row: AuditInsert) {
  try {
    await admin.from("admin_actions_audit").insert({
      actor_id: row.actor_id,
      actor_email: row.actor_email,
      action: row.action,
      target_user_id: row.target_user_id,
      target_email: row.target_email,
      reason: row.reason,
      meta: row.meta,
    });
  } catch {
    // never block core action on audit insert
  }
}

async function resolveTargetUserId(
  admin: ReturnType<typeof createClient>,
  input: { user_id?: unknown; email?: unknown }
): Promise<{ userId: string | null; email: string | null; error?: string }> {
  const userId = typeof input.user_id === "string" && input.user_id.trim() ? input.user_id.trim() : null;
  const email = normalizeEmail(input.email);

  if (userId) {
    // best effort: try to load email from profiles for audit/readability
    const { data: prof } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
    return { userId, email: (prof?.email as string | null) ?? email };
  }

  if (email) {
    const { data: prof, error } = await admin.from("profiles").select("id,email").eq("email", email).maybeSingle();
    if (error) return { userId: null, email, error: "Profile lookup failed" };
    if (!prof?.id) return { userId: null, email, error: "User not found" };
    return { userId: String(prof.id), email: String(prof.email ?? email) };
  }

  return { userId: null, email: null, error: "Missing user_id or email" };
}

serve(async (req) => {
  // CORS preflight first
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { ok: false, error: "Server misconfigured" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const gate = await requireAdmin(admin, req);
    if (!gate.ok) return json(gate.status, { ok: false, error: gate.error });

    const payload = (await req.json().catch(() => null)) as Json | null;
    if (!payload) return json(400, { ok: false, error: "Invalid JSON body" });

    const mode = normalizeMode(payload.mode);
    if (!mode) return json(400, { ok: false, error: "Invalid mode" });

    const actorEmail = typeof payload.actor_email === "string" ? payload.actor_email : null;
    const reason = safeText(payload.reason, 240);

    const resolved = await resolveTargetUserId(admin, { user_id: payload.user_id, email: payload.email });
    if (resolved.error) return json(400, { ok: false, error: resolved.error });

    const targetUserId = resolved.userId!;
    const targetEmail = resolved.email;

    // CNCS: never allow self hard-delete
    if (mode === "hard_delete" && targetUserId === gate.callerId) {
      return json(409, { ok: false, error: "Refusing to hard_delete current ADMIN session user" });
    }

    // Safety: ensure auth user exists before acting (except hard_delete can still attempt)
    const { data: authUser, error: getAuthErr } = await admin.auth.admin.getUserById(targetUserId);
    if (getAuthErr || !authUser?.user?.id) {
      if (mode === "hard_delete") {
        // proceed to clean profile row if any
        await admin.from("profiles").delete().eq("id", targetUserId);
        await insertAdminAudit(admin, {
          actor_id: gate.callerId,
          actor_email: actorEmail,
          action: "user.hard_delete",
          target_user_id: targetUserId,
          target_email: targetEmail,
          reason,
          meta: { note: "auth user missing; profile cleanup attempted" },
        });
        return json(200, { ok: true, mode: "hard_delete", user_id: targetUserId, email: targetEmail });
      }
      return json(404, { ok: false, error: "Auth user not found" });
    }

    if (mode === "suspend") {
      // Ban user for a very long time (effectively suspended).
      // Using "876000h" (~100 years) is a common pattern.
      const { error: banErr } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration: "876000h" as any });
      if (banErr) return json(500, { ok: false, error: banErr.message || "Suspend failed" });

      // Best effort profile flag
      await admin.from("profiles").update({ disabled_at: new Date().toISOString() }).eq("id", targetUserId);

      await insertAdminAudit(admin, {
        actor_id: gate.callerId,
        actor_email: actorEmail,
        action: "user.suspend",
        target_user_id: targetUserId,
        target_email: targetEmail,
        reason,
        meta: { ban_duration: "876000h" },
      });

      return json(200, { ok: true, mode: "suspend", user_id: targetUserId, email: targetEmail });
    }

    if (mode === "reactivate") {
      // Unban: set ban duration to 0h.
      const { error: unbanErr } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration: "0h" as any });
      if (unbanErr) return json(500, { ok: false, error: unbanErr.message || "Reactivate failed" });

      // Best effort profile flag
      await admin.from("profiles").update({ disabled_at: null }).eq("id", targetUserId);

      await insertAdminAudit(admin, {
        actor_id: gate.callerId,
        actor_email: actorEmail,
        action: "user.reactivate",
        target_user_id: targetUserId,
        target_email: targetEmail,
        reason,
        meta: { ban_duration: "0h" },
      });

      return json(200, { ok: true, mode: "reactivate", user_id: targetUserId, email: targetEmail });
    }

    // hard_delete
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) return json(500, { ok: false, error: delErr.message || "Hard delete failed" });

    // Best effort profile cleanup
    await admin.from("profiles").delete().eq("id", targetUserId);

    await insertAdminAudit(admin, {
      actor_id: gate.callerId,
      actor_email: actorEmail,
      action: "user.hard_delete",
      target_user_id: targetUserId,
      target_email: targetEmail,
      reason,
      meta: { irreversible: true },
    });

    return json(200, { ok: true, mode: "hard_delete", user_id: targetUserId, email: targetEmail });
  } catch (e) {
    console.error("[admin-delete-user] fatal:", e);
    return json(500, { ok: false, error: "Internal error" });
  }
});
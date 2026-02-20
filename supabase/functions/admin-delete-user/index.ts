// supabase/functions/admin-delete-user/index.ts
// ADMIN-only user removal endpoint
// Modes:
// - "suspend" (recommended): bans the Auth user (primary enforcement), tries to set profiles.disabled_at if exists
// - "hard_delete": deletes Auth user, then tries to delete profiles row; if blocked by FK -> anonymizes profile (audit-safe fallback)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Mode = "suspend" | "hard_delete";

type Payload = {
  user_id: string;
  mode?: Mode;
  reason?: string | null;
};

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

function normText(raw: unknown, maxLen: number): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
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
    mode: string;
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
    mode: row.mode,
    reason: row.reason,
    meta: row.meta,
  });
  if (error) throw new Error(`Admin audit insert failed: ${error.message}`);
}

async function trySetDisabledAt(admin: ReturnType<typeof createClient>, userId: string) {
  // We don't assume the column exists; we try. If missing, we ignore and rely on Auth ban.
  try {
    const { error } = await admin.from("profiles").update({ disabled_at: new Date().toISOString() }).eq("id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}

async function tryBanAuthUser(admin: ReturnType<typeof createClient>, userId: string) {
  // Supabase Auth / GoTrue supports ban functionality; supabase-js may accept ban_duration.
  // We attempt ban via updateUserById; if the property is not supported, we return a controlled failure.
  try {
    const payload: Record<string, unknown> = {
      // 100 years in hours (approx): 100 * 365 * 24 = 876000h
      ban_duration: "876000h",
    };

    // @ts-ignore (ban_duration is not always typed in supabase-js)
    const { data, error } = await admin.auth.admin.updateUserById(userId, payload as any);

    if (error) return { ok: false as const, error: error.message, data: null };
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: String(e), data: null };
  }
}

async function tryDeleteProfileRow(admin: ReturnType<typeof createClient>, userId: string) {
  try {
    const { error } = await admin.from("profiles").delete().eq("id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}

async function anonymizeProfile(admin: ReturnType<typeof createClient>, userId: string) {
  // Audit-safe fallback if we cannot delete due to FK constraints.
  // We do NOT assume nullable constraints. We provide deterministic "deleted+<id>" email.
  const deletedEmail = `deleted+${userId}@deleted.local`;

  const patch: Record<string, unknown> = {
    email: deletedEmail,
    full_name: null,
    display_name: "[DELETED]",
    // Keep a non-privileged role
    app_role: "CAPO",
    role: "CAPO",
    must_change_password: true,
    updated_at: new Date().toISOString(),
  };

  // Try to set disabled_at as well if available
  try {
    patch["disabled_at"] = new Date().toISOString();
  } catch {
    // ignore
  }

  try {
    const { error } = await admin.from("profiles").update(patch).eq("id", userId);
    if (error) return { ok: false as const, error: error.message, deletedEmail };
    return { ok: true as const, deletedEmail };
  } catch (e) {
    return { ok: false as const, error: String(e), deletedEmail };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return okPreflight(req);
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(req, 500, { ok: false, error: "Missing server env" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const gate = await requireAdmin(req, admin);
    if (!gate.ok) return json(req, gate.status, { ok: false, error: gate.error });

    const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
    const userId = normText(body.user_id, 80);
    const mode = (body.mode ?? "suspend") as Mode;
    const reason = normText(body.reason, 200) || null;

    if (!userId || !isUuid(userId)) return json(req, 400, { ok: false, error: "Invalid user_id" });
    if (mode !== "suspend" && mode !== "hard_delete") return json(req, 400, { ok: false, error: "Invalid mode" });

    // Load target profile email for audit logs / confirmation
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id,email,app_role,display_name")
      .eq("id", userId)
      .maybeSingle();

    if (mode === "suspend") {
      // Primary enforcement: Auth ban
      const banRes = await tryBanAuthUser(admin, userId);

      // Secondary: mark disabled_at if column exists (best effort)
      const disRes = await trySetDisabledAt(admin, userId);

      await insertAdminAudit(admin, {
        actor_id: gate.callerId,
        actor_email: gate.callerEmail,
        action: "user.suspend",
        target_user_id: userId,
        target_email: targetProfile?.email ?? null,
        mode: "suspend",
        reason,
        meta: { auth_banned_ok: banRes.ok, profiles_disabled_at_ok: disRes.ok },
      });

      // If Auth ban failed AND we couldn't mark disabled in DB, we should fail loudly
      if (!banRes.ok && !disRes.ok) {
        return json(req, 500, {
          ok: false,
          error: "Suspend failed (auth ban + profiles disable both failed)",
          details: { auth: banRes.error, profiles: disRes.error },
        });
      }

      return json(req, 200, {
        ok: true,
        mode: "suspend",
        user_id: userId,
        target_email: targetProfile?.email ?? null,
        auth_banned_ok: banRes.ok,
        profiles_disabled_at_ok: disRes.ok,
      });
    }

    // hard_delete
    // 1) Delete Auth user
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      console.error("[admin-delete-user] delete auth failed:", delAuthErr);
      return json(req, 500, { ok: false, error: "Auth delete failed", details: delAuthErr.message });
    }

    // 2) Try delete profiles row
    const delProf = await tryDeleteProfileRow(admin, userId);

    let profileOutcome: Record<string, unknown> = { deleted: delProf.ok };
    if (!delProf.ok) {
      // FK constraints likely: fallback to anonymization (audit-safe)
      const anon = await anonymizeProfile(admin, userId);
      profileOutcome = { deleted: false, anonymized: anon.ok, deleted_email: anon.deletedEmail, error: anon.ok ? null : anon.error };
    }

    await insertAdminAudit(admin, {
      actor_id: gate.callerId,
      actor_email: gate.callerEmail,
      action: "user.hard_delete",
      target_user_id: userId,
      target_email: targetProfile?.email ?? null,
      mode: "hard_delete",
      reason,
      meta: { profile_outcome: profileOutcome },
    });

    return json(req, 200, {
      ok: true,
      mode: "hard_delete",
      user_id: userId,
      target_email: targetProfile?.email ?? null,
      profile_outcome: profileOutcome,
    });
  } catch (e) {
    console.error("[admin-delete-user] fatal:", e);
    return json(req, 500, { ok: false, error: "Internal error" });
  }
});
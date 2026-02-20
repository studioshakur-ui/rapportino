// supabase/functions/admin-create-user/index.ts
// Modern & secure user provisioning (ADMIN-only)
// - Bearer token required
// - Must be ADMIN (profiles.app_role)
// - Idempotent: if email already exists in profiles, repairs/upserts profile
// - New users are provisioned via invite (no password in transit)
// - Ensures profiles.app_role and profiles.role are always synced (DB constraint)
// - CNCS P0+: invite redirect hardened (never localhost) via ADMIN_INVITE_REDIRECT_TO/SITE_URL fallback
// - CNCS P0+: append-only admin audit (public.admin_actions_audit)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type AppRole = "CAPO" | "UFFICIO" | "MANAGER" | "DIREZIONE" | "ADMIN";

type CreateUserPayload = {
  email: string;
  app_role: AppRole;
  full_name?: string | null;
  display_name?: string | null;
  default_costr?: string | null;
  default_commessa?: string | null;
  allowed_cantieri?: string[] | null;
};

const ROLE_SET = new Set<AppRole>(["CAPO", "UFFICIO", "MANAGER", "DIREZIONE", "ADMIN"]);

const corsHeadersBase = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
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

  // Backward compatible default (dev/local): reflect Origin if present, else '*'.
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

function normalizeEmail(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function normText(raw: unknown, maxLen: number): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isValidEmail(email: string): boolean {
  // Conservative sanity check (Auth validates deeper)
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toAllowedCantieri(raw: unknown): string[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, 200);
}

function normalizeRedirectUrl(raw: string | null | undefined): string | null {
  const v = (raw || "").trim();
  if (!v) return null;

  // Must be absolute https URL
  if (!/^https:\/\//i.test(v)) return null;

  // No localhost in prod-grade redirect
  if (/^https?:\/\/localhost\b/i.test(v)) return null;

  return v;
}

async function requireAdmin(req: Request, adminClient: ReturnType<typeof createClient>) {
  const token = getBearerToken(req);
  if (!token) return { ok: false as const, status: 401, error: "Missing bearer token" };

  // Identify caller (Admin session)
  const { data: caller, error: callerErr } = await adminClient.auth.getUser(token);
  if (callerErr || !caller?.user?.id) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const callerId = caller.user.id;

  // Enforce ADMIN role via profiles table (source of truth)
  const { data: prof, error: profErr } = await adminClient.from("profiles").select("app_role").eq("id", callerId).single();

  if (profErr || prof?.app_role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, callerId };
}

async function insertAdminAudit(
  admin: ReturnType<typeof createClient>,
  row: {
    actor_id: string;
    actor_email: string | null;
    action: string;
    target_user_id: string;
    target_email: string | null;
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
    reason: row.reason,
    meta: row.meta,
  });
  if (error) throw new Error(`Admin audit insert failed: ${error.message}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return okPreflight(req);
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(req, 500, { ok: false, error: "Missing server env" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // 1) Access control (ADMIN only)
    const gate = await requireAdmin(req, admin);
    if (!gate.ok) return json(req, gate.status, { ok: false, error: gate.error });

    // Fetch actor email for audit (best effort)
    const { data: actorProfile } = await admin.from("profiles").select("email").eq("id", gate.callerId).maybeSingle();
    const actorEmail = actorProfile?.email ?? null;

    // 2) Parse & validate payload
    const body = (await req.json().catch(() => ({}))) as Partial<CreateUserPayload>;

    const email = normalizeEmail(body.email);
    const app_role = String(body.app_role ?? "") as AppRole;
    const full_name = normText(body.full_name, 120) || null;
    const display_name = normText(body.display_name ?? full_name ?? email, 120) || null;
    const default_costr = normText(body.default_costr, 60) || null;
    const default_commessa = normText(body.default_commessa, 60) || null;
    const allowed_cantieri = toAllowedCantieri(body.allowed_cantieri);

    if (!isValidEmail(email)) return json(req, 400, { ok: false, error: "Invalid email" });
    if (!ROLE_SET.has(app_role)) return json(req, 400, { ok: false, error: "Invalid app_role" });
    if (!display_name) return json(req, 400, { ok: false, error: "Missing display_name" });

    // 3) Idempotence fast-path: lookup by profiles.email
    const { data: existingProfile, error: profByEmailErr } = await admin
      .from("profiles")
      .select("id,email,app_role,display_name")
      .eq("email", email)
      .maybeSingle();

    if (profByEmailErr) {
      return json(req, 500, { ok: false, error: "Profile lookup failed" });
    }

    const upsertProfile = async (userId: string) => {
      const { error: upErr } = await admin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email,
            full_name,
            display_name,
            app_role,
            role: app_role, // enum app_role — must match app_role text (DB constraint)
            default_costr,
            default_commessa,
            allowed_cantieri,
            must_change_password: false,
          },
          { onConflict: "id" },
        );
      return upErr;
    };

    if (existingProfile?.id) {
      const userId = String(existingProfile.id);
      const upErr = await upsertProfile(userId);
      if (upErr) return json(req, 500, { ok: false, error: "Profile upsert failed" });

      await insertAdminAudit(admin, {
        actor_id: gate.callerId,
        actor_email: actorEmail,
        action: "user.create",
        target_user_id: userId,
        target_email: email,
        reason: null,
        meta: { mode: "updated_existing", app_role },
      });

      // IMPORTANT: This branch does NOT send an invite email (user already exists in profiles).
      // If you want resend-invite behavior for existing users, implement admin-resend-invite
      // or add a force_resend flag.
      return json(req, 200, { ok: true, mode: "updated_existing", user_id: userId, email });
    }

    // 4) Modern provisioning: invite user by email (email is sent by Supabase)
    // Redirect is hardened to avoid localhost or protocol-less values.
    const redirectTo =
      normalizeRedirectUrl(Deno.env.get("ADMIN_INVITE_REDIRECT_TO")) ||
      normalizeRedirectUrl(Deno.env.get("SITE_URL")) ||
      "https://core.cncs.systems";

    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: full_name ?? undefined,
        display_name: display_name ?? undefined,
        app_role,
      },
    });

    if (invErr || !invited?.user?.id) {
      console.error("[admin-create-user] invite failed:", invErr?.message || invErr);
      return json(req, 500, { ok: false, error: "Invite failed" });
    }

    const newUserId = invited.user.id;

    // 5) Force profile coherence (overrides handle_new_user() default CAPO)
    const upErr = await upsertProfile(newUserId);
    if (upErr) {
      console.error("[admin-create-user] profile upsert failed after invite:", upErr);
      return json(req, 500, { ok: false, error: "Profile upsert failed" });
    }

    await insertAdminAudit(admin, {
      actor_id: gate.callerId,
      actor_email: actorEmail,
      action: "user.create",
      target_user_id: newUserId,
      target_email: email,
      reason: null,
      meta: { mode: "invited_new", app_role, redirectTo },
    });

    // Front expects data.ok
    return json(req, 200, { ok: true, mode: "invited_new", user_id: newUserId, email });
  } catch (e) {
    console.error("[admin-create-user] fatal:", e);
    return json(req, 500, { ok: false, error: "Internal error" });
  }
});
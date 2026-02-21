// supabase/functions/admin-create-user/index.ts
// Modern & secure user provisioning (ADMIN-only)
// - Bearer token required
// - Must be ADMIN (profiles.app_role)
// - Idempotent: if email already exists in profiles, repairs/upserts profile
// - New users are provisioned via Admin createUser (NO email sent; avoids Supabase email rate limits)
// - OPTION B (CNCS): generate initial password at creation (server-side) and return it to Admin UI
// - Enforces profiles.app_role and profiles.role are always synced (DB constraint)
// - Harden invite redirect (never localhost) via ADMIN_INVITE_REDIRECT_TO/SITE_URL fallback
// - CNCS-grade append-only admin audit (public.admin_actions_audit)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Json = Record<string, unknown>;

function json(_req: Request, status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
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

function randomPassword(len = 16) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  if (!e) return null;
  // minimal sanity (CNCS: do not over-validate here)
  if (!e.includes("@") || e.length > 254) return null;
  return e;
}

function normalizeRole(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const r = v.trim().toUpperCase();
  if (!r) return null;
  const allowed = new Set(["CAPO", "UFFICIO", "MANAGER", "ADMIN", "DIREZIONE"]);
  return allowed.has(r) ? r : null;
}

function safeText(v: unknown, maxLen = 120): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeRedirectUrl(v: string | undefined | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    // CNCS: never allow localhost or insecure origins in redirect
    if (u.protocol !== "https:") return null;
    if (u.hostname === "localhost" || u.hostname.endsWith(".local")) return null;
    return u.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
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
  // CNCS: append-only log; do not throw hard here (avoid blocking provisioning on audit failure)
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
    // swallow
  }
}

serve(async (req) => {
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "Method not allowed" });

  const url = new URL(req.url);
  if (url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(req, 500, { ok: false, error: "Server misconfigured" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const gate = await requireAdmin(admin, req);
    if (!gate.ok) return json(req, gate.status, { ok: false, error: gate.error });

    const payload = (await req.json().catch(() => null)) as Json | null;
    if (!payload) return json(req, 400, { ok: false, error: "Invalid JSON body" });

    const email = normalizeEmail(payload.email);
    const app_role = normalizeRole(payload.app_role);
    const full_name = safeText(payload.full_name, 120);
    const display_name = safeText(payload.display_name, 80);

    if (!email) return json(req, 400, { ok: false, error: "Invalid email" });
    if (!app_role) return json(req, 400, { ok: false, error: "Invalid app_role" });

    const actorEmail = typeof payload.actor_email === "string" ? payload.actor_email : null;

    // CNCS: redirect must be stable and safe; fallback to production base.
    // NOTE: kept for audit continuity even though we no longer send invite emails.
    const base =
      normalizeRedirectUrl(Deno.env.get("ADMIN_INVITE_REDIRECT_TO")) ||
      normalizeRedirectUrl(Deno.env.get("SITE_URL")) ||
      "https://core.cncs.systems";

    const redirectTo = `${base.replace(/\/+$/, "")}/auth/confirm`;

    // OPTION B: always create an initial password server-side (do NOT audit/store the password itself)
    const password = randomPassword(16);

    // Helper: set AUTH password + flag onboarding
    const setAuthPasswordAndFlag = async (userId: string) => {
      const { error: pwdErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (pwdErr) return { ok: false as const, error: pwdErr.message || "Auth password update failed" };

      const { error: flagErr } = await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
      if (flagErr) return { ok: false as const, error: "Profile update failed" };

      return { ok: true as const };
    };

    // Helper: profile upsert enforcing role coherence
    const upsertProfile = async (userId: string, mustChangePassword: boolean) => {
      const { error } = await admin.from("profiles").upsert(
        {
          id: userId,
          email,
          full_name,
          display_name,
          app_role,
          role: app_role, // keep legacy compatibility if role column mirrors app_role
          must_change_password: mustChangePassword,
        },
        { onConflict: "id" }
      );
      return error ? error.message || "Profile upsert failed" : null;
    };

    // 1) Check if profile already exists for this email (idempotent behavior)
    const { data: existingProfile, error: profErr } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (profErr) {
      console.error("[admin-create-user] profile lookup failed:", profErr);
      return json(req, 500, { ok: false, error: "Profile lookup failed" });
    }

    // 4) If profile exists, repair + set new password (Option B behavior)
    if (existingProfile?.id) {
      const userId = String(existingProfile.id);

      // Safety: ensure auth user exists for this profile id.
      const { data: authUser, error: getAuthErr } = await admin.auth.admin.getUserById(userId);
      if (getAuthErr || !authUser?.user?.id) {
        // CNCS: refuse to silently create a second auth user for the same email (would corrupt references).
        return json(req, 409, {
          ok: false,
          error:
            "Profile exists but Auth user is missing for this id. Hard delete the profile/user (or repair auth) then recreate.",
        });
      }

      // Upsert profile (keep coherence) and force onboarding
      const upErr = await upsertProfile(userId, true);
      if (upErr) return json(req, 500, { ok: false, error: "Profile upsert failed" });

      // Set initial password now
      const setRes = await setAuthPasswordAndFlag(userId);
      if (!setRes.ok) return json(req, 500, { ok: false, error: setRes.error });

      await insertAdminAudit(admin, {
        actor_id: gate.callerId,
        actor_email: actorEmail,
        action: "user.create",
        target_user_id: userId,
        target_email: email,
        reason: null,
        meta: { mode: "updated_existing", app_role, redirectTo, password_generated: true },
      });

      await insertAdminAudit(admin, {
        actor_id: gate.callerId,
        actor_email: actorEmail,
        action: "user.set_password",
        target_user_id: userId,
        target_email: email,
        reason: "create_user_option_b",
        meta: { generated: true, method: "updateUserById" },
      });

      return json(req, 200, {
        ok: true,
        mode: "updated_existing",
        user_id: userId,
        email,
        password, // returned to ADMIN UI banner (shown once)
      });
    }

    // 5) New provisioning: create user directly (NO email is sent)
    // This avoids Supabase Auth email rate limits (invites / confirmations / magic links / reset).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name ?? undefined,
        display_name: display_name ?? undefined,
        app_role,
      },
    });

    if (createErr || !created?.user?.id) {
      console.error("[admin-create-user] createUser failed:", createErr?.message || createErr);
      return json(req, 500, { ok: false, error: "Create user failed" });
    }

    const newUserId = created.user.id;

    // 6) Force profile coherence + onboarding flag
    const upErr = await upsertProfile(newUserId, true);
    if (upErr) {
      console.error("[admin-create-user] profile upsert failed after createUser:", upErr);
      return json(req, 500, { ok: false, error: "Profile upsert failed" });
    }

    // 7) OPTION B: password already set at createUser; enforce onboarding flag
    const { error: flagErrNew } = await admin.from("profiles").update({ must_change_password: true }).eq("id", newUserId);
    if (flagErrNew) {
      console.error("[admin-create-user] profile flag update failed after createUser:", flagErrNew);
      return json(req, 500, { ok: false, error: "Profile update failed" });
    }

    await insertAdminAudit(admin, {
      actor_id: gate.callerId,
      actor_email: actorEmail,
      action: "user.create",
      target_user_id: newUserId,
      target_email: email,
      reason: null,
      meta: { mode: "created_direct_no_email", app_role, email_confirm: true, password_generated: true },
    });

    await insertAdminAudit(admin, {
      actor_id: gate.callerId,
      actor_email: actorEmail,
      action: "user.set_password",
      target_user_id: newUserId,
      target_email: email,
      reason: "create_user_option_b",
      meta: { generated: true, method: "createUser" },
    });

    // Front expects data.ok + (optional) password to show banner
    return json(req, 200, {
      ok: true,
      mode: "created_direct_no_email",
      user_id: newUserId,
      email,
      password, // returned to ADMIN UI banner (shown once)
    });
  } catch (e) {
    console.error("[admin-create-user] fatal:", e);
    return json(req, 500, { ok: false, error: "Internal error" });
  }
});
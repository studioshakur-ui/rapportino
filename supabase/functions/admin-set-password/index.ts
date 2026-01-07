import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOW_ORIGIN = "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

function okPreflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  // 1) Preflight FIRST
  if (req.method === "OPTIONS") return okPreflight();

  // 2) Method guard
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(500, { ok: false, error: "Missing server env" });
    }

    // Bearer token from caller (ADMIN session)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json(401, { ok: false, error: "Missing bearer token" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Identify caller
    const { data: caller, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller?.user?.id) return json(401, { ok: false, error: "Unauthorized" });

    // Enforce ADMIN
    const { data: callerProfile, error: profErr } = await admin
      .from("profiles")
      .select("app_role")
      .eq("id", caller.user.id)
      .single();

    if (profErr || callerProfile?.app_role !== "ADMIN") {
      return json(403, { ok: false, error: "Forbidden" });
    }

    // Payload
    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || "").trim();
    const password = String(body.password || "").trim();

    if (!user_id) return json(400, { ok: false, error: "Missing user_id" });
    if (!password || password.length < 8) return json(400, { ok: false, error: "Invalid password" });

    // Update AUTH password
    const { error: pwdErr } = await admin.auth.admin.updateUserById(user_id, { password });
    if (pwdErr) return json(500, { ok: false, error: pwdErr.message });

    // Flag onboarding (choose ONE behavior)
    // If this is "test password", you probably want must_change_password = true
    const { error: flagErr } = await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", user_id);

    if (flagErr) return json(500, { ok: false, error: "Profile update failed" });

    return json(200, { ok: true });
  } catch (e) {
    console.error("[admin-set-password] fatal:", e);
    return json(500, { ok: false, error: "Internal error" });
  }
});

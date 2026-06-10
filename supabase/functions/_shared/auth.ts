// supabase/functions/_shared/auth.ts
// Authentifie l'appelant d'une edge function IA.
//
// Deux modes :
//  - "system" : l'appel vient du cron (pg_cron + pg_net) qui présente la
//    SERVICE_ROLE_KEY en Bearer. Pas d'utilisateur → on traite en mode système.
//  - "user"   : l'appel vient du frontend (bouton manuel) avec le JWT de session.
//    On valide l'utilisateur comme avant.
//
// INCA reste read-only quel que soit le mode : ces fonctions n'écrivent jamais
// dans inca_cavi.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type CallerMode = "system" | "user";

export interface AuthResult {
  ok: boolean;
  mode: CallerMode | null;
  status: number;     // code à renvoyer si !ok
  error: string | null;
}

/** Lit le claim `role` d'un JWT (la signature est déjà validée par la gateway). */
function jwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

/**
 * Détermine le mode d'appel et valide l'autorisation.
 * - service-role en Bearer  → system (cron)
 * - JWT utilisateur valide   → user (bouton manuel)
 * - sinon                    → 401
 */
export async function authenticateCaller(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceKey: string,
): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!bearer) {
    return { ok: false, mode: null, status: 401, error: "Missing Authorization" };
  }

  // Mode système : le cron présente la service-role key. On accepte soit l'égalité
  // directe, soit le claim role=service_role (la gateway a déjà validé la signature),
  // pour être robuste aux variantes de clé service-role du projet.
  if (bearer === serviceKey || jwtRole(bearer) === "service_role") {
    return { ok: true, mode: "system", status: 200, error: null };
  }

  // Mode utilisateur : on valide le JWT de session.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return { ok: false, mode: null, status: 401, error: "Invalid session" };
  }
  return { ok: true, mode: "user", status: 200, error: null };
}

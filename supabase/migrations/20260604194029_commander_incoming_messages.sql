-- ============================================================================
-- COMMANDER — Live Meta WhatsApp webhook ingestion buffer.
--
-- COMMANDER is a passive field sensor: it writes inbound WhatsApp messages into
-- this table (via the Supabase service_role), the Memory Engine consumes them
-- downstream and promotes them into core_events.
--
-- Règles respectées (CORE COMMAND):
--   - Aucune référence à inca_cavi / inca_files → INCA reste STRICTEMENT read-only.
--     (FK uniquement vers public.core_events, déjà présent dans CORE Memory.)
--   - Idempotent : IF NOT EXISTS partout + wamid UNIQUE (Meta rejoue le même
--     message → upsert ON CONFLICT (wamid) DO NOTHING côté backend).
--   - RLS ACTIVÉE : lock complet pour anon ; lecture seule pour le single owner
--     (profiles.is_core_owner) ; le backend COMMANDER écrit via service_role qui
--     bypass RLS implicitement (aucune écriture autorisée pour anon/authenticated).
--   - Aucun trigger n'écrit dans inca_cavi.
-- ============================================================================

BEGIN;

-- pgcrypto (gen_random_uuid) — idempotent, déjà présent via core_command_init.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incoming_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source         text        NOT NULL DEFAULT 'commander',
  wamid          text        UNIQUE,                  -- Meta message id (idempotency)
  sender         text,                                -- WhatsApp wa_id (phone)
  sender_name    text,
  message_ts     timestamptz,
  message_type   text,                                -- text | image | audio | ...
  text           text,
  cable_refs     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  classification jsonb       NOT NULL DEFAULT '{}'::jsonb,
  raw_payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  processed      boolean     NOT NULL DEFAULT false,  -- consumed by Memory Engine?
  core_event_id  uuid        REFERENCES public.core_events(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Queue de traitement Memory Engine : seuls les messages non traités.
CREATE INDEX IF NOT EXISTS idx_incoming_messages_unprocessed
  ON public.incoming_messages (created_at)
  WHERE processed = false;

-- Timeline par expéditeur.
CREATE INDEX IF NOT EXISTS idx_incoming_messages_sender_ts
  ON public.incoming_messages (sender, message_ts DESC);

-- ---------------------------------------------------------------------------
-- RLS — adaptée au backend service_role
--   service_role  → bypass RLS (ingestion COMMANDER, Memory Engine).
--   anon          → aucun accès.
--   authenticated → SELECT uniquement si single owner (cockpit read-only).
-- ---------------------------------------------------------------------------
ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;

-- Verrouillage des privilèges de table : pas d'écriture client.
REVOKE ALL ON public.incoming_messages FROM anon;
REVOKE ALL ON public.incoming_messages FROM authenticated;
GRANT SELECT ON public.incoming_messages TO authenticated;
GRANT ALL ON public.incoming_messages TO service_role;

-- Lecture seule pour le propriétaire unique CORE COMMAND (même garde que INCA).
DROP POLICY IF EXISTS "incoming_messages_owner_read" ON public.incoming_messages;
CREATE POLICY "incoming_messages_owner_read"
ON public.incoming_messages
AS permissive
FOR SELECT
TO authenticated
USING (public.core_command_is_owner());

-- Aucune policy INSERT/UPDATE/DELETE pour authenticated → écritures réservées
-- au service_role (COMMANDER backend) qui bypass RLS.

COMMIT;

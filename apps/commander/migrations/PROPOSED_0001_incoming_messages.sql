-- ============================================================================
-- SUPERSEDED — APPLIED as supabase/migrations/20260604120000_commander_incoming_messages.sql
-- (which additionally enables RLS hardened for the service_role backend).
-- Kept for historical reference only. Do NOT run this file directly.
--
-- Original note (PROPOSED — NOT APPLIED):
-- Live Meta webhook ingestion buffer for COMMANDER (passive sensor).
--
-- This is a PROPOSAL. Do NOT run automatically. Review, then apply via the
-- normal migration flow (move into supabase/migrations + `supabase db push`)
-- or the SQL editor.
--
-- Rules respected:
--   - No reference to inca_cavi / inca_files (INCA stays read-only).
--   - Idempotent (IF NOT EXISTS).
--   - wamid UNIQUE → idempotent ingestion (Meta retries the same message).
--   - RLS left disabled in dev (cockpit single-user); harden before prod.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.incoming_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source         text        NOT NULL DEFAULT 'commander',
  wamid          text        UNIQUE,                 -- Meta message id (idempotency)
  sender         text,                               -- WhatsApp wa_id
  sender_name    text,
  message_ts     timestamptz,
  message_type   text,                               -- text | image | audio | ...
  text           text,
  cable_refs     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  classification jsonb       NOT NULL DEFAULT '{}'::jsonb,
  raw_payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  processed      boolean     NOT NULL DEFAULT false, -- consumed by Memory Engine?
  core_event_id  uuid        REFERENCES public.core_events(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incoming_messages_unprocessed
  ON public.incoming_messages (created_at)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_incoming_messages_sender_ts
  ON public.incoming_messages (sender, message_ts DESC);

COMMIT;


CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.incoming_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source         text        NOT NULL DEFAULT 'commander',
  wamid          text        UNIQUE,
  sender         text,
  sender_name    text,
  message_ts     timestamptz,
  message_type   text,
  text           text,
  cable_refs     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  classification jsonb       NOT NULL DEFAULT '{}'::jsonb,
  raw_payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  processed      boolean     NOT NULL DEFAULT false,
  core_event_id  uuid        REFERENCES public.core_events(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incoming_messages_unprocessed
  ON public.incoming_messages (created_at) WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_incoming_messages_sender_ts
  ON public.incoming_messages (sender, message_ts DESC);

ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.incoming_messages FROM anon;
REVOKE ALL ON public.incoming_messages FROM authenticated;
GRANT SELECT ON public.incoming_messages TO authenticated;
GRANT ALL ON public.incoming_messages TO service_role;

DROP POLICY IF EXISTS "incoming_messages_owner_read" ON public.incoming_messages;
CREATE POLICY "incoming_messages_owner_read"
ON public.incoming_messages AS permissive FOR SELECT TO authenticated
USING (public.core_command_is_owner());
;

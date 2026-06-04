-- ============================================================================
-- CORE COMMAND — Migration initiale P0
-- Tables: core_operators, whatsapp_imports, whatsapp_messages, core_events,
--         cable_events, cable_priorities, agent_findings, production_daily_kpis
--
-- Règles:
--   - Aucune modification d'objets legacy (ships, capo_*, rapportini, etc.)
--   - inca_cavi = lecture seule depuis CORE COMMAND (FK SET NULL uniquement)
--   - Aucun trigger écrivant dans inca_cavi
--   - RLS désactivée en P0 (dev single-user)
--   - Préfixe cc_* sur helper functions pour isolation namespace
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions (idempotent)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger (namespaced cc_ pour éviter collision avec
-- le set_updated_at legacy existant)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cc_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. core_operators
--    Renommé (collision avec public.operators legacy actif dans src/)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_operators (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    text        NOT NULL,
  whatsapp_name   text,
  whatsapp_number text,
  aliases         text[]      NOT NULL DEFAULT '{}',
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_core_operators_updated_at
  BEFORE UPDATE ON public.core_operators
  FOR EACH ROW EXECUTE FUNCTION public.cc_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. whatsapp_imports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_imports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name     text,
  group_name    text,
  imported_at   timestamptz NOT NULL DEFAULT now(),
  message_count integer     NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'imported', 'failed')),
  raw_metadata  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. whatsapp_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id          uuid        NOT NULL
                                 REFERENCES public.whatsapp_imports(id)
                                 ON DELETE CASCADE,
  message_ts         timestamptz NOT NULL,
  author             text,
  author_operator_id uuid        REFERENCES public.core_operators(id)
                                 ON DELETE SET NULL,
  raw_message        text,
  media_type         text,
  media_filename     text,
  message_hash       text        UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. core_events  (CORE Memory — vérité opérationnelle)
--    FK inca_cavo_id → inca_cavi(id) ON DELETE SET NULL :
--      - lie l'event à la vérité technique INCA quand le câble est résolu
--      - SET NULL = un re-import INCA ne détruit pas les events
--      - aucun trigger ne modifie inca_cavi en retour
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_events (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type            text        NOT NULL,
  occurred_at           timestamptz NOT NULL,
  source                text        NOT NULL,
  source_message_id     uuid        REFERENCES public.whatsapp_messages(id)
                                    ON DELETE SET NULL,
  operator_id           uuid        REFERENCES public.core_operators(id)
                                    ON DELETE SET NULL,
  inca_cavo_id          uuid        REFERENCES public.inca_cavi(id)
                                    ON DELETE SET NULL,
  cable_code_raw        text,
  cable_code_normalized text,
  commessa              text,
  zone                  text,
  status                text,
  confidence            numeric     NOT NULL DEFAULT 0,
  validation_status     text        NOT NULL DEFAULT 'pending'
                                    CHECK (validation_status IN (
                                      'pending', 'validated', 'rejected', 'promoted'
                                    )),
  payload               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  raw_text              text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  validated_at          timestamptz,
  validated_by          uuid
);

-- ---------------------------------------------------------------------------
-- 5. cable_events  (événements validés sur câble — promotion depuis core_events)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cable_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  core_event_id     uuid        NOT NULL
                                REFERENCES public.core_events(id)
                                ON DELETE CASCADE,
  occurred_at       timestamptz NOT NULL,
  inca_cavo_id      uuid        REFERENCES public.inca_cavi(id)
                                ON DELETE SET NULL,
  cable_code        text        NOT NULL,
  event_kind        text        NOT NULL,
  previous_status   text,
  new_status        text,
  operator_id       uuid        REFERENCES public.core_operators(id)
                                ON DELETE SET NULL,
  source_message_id uuid        REFERENCES public.whatsapp_messages(id)
                                ON DELETE SET NULL,
  confidence        numeric     NOT NULL DEFAULT 0,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. cable_priorities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cable_priorities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inca_cavo_id    uuid        REFERENCES public.inca_cavi(id)
                              ON DELETE SET NULL,
  cable_code      text        NOT NULL,
  priority        text        NOT NULL
                              CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reason          text,
  status          text        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'closed')),
  source_event_id uuid        REFERENCES public.core_events(id)
                              ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz
);

-- ---------------------------------------------------------------------------
-- 7. agent_findings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_findings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name     text        NOT NULL,
  finding_type   text        NOT NULL,
  severity       text        NOT NULL
                             CHECK (severity IN ('info', 'warn', 'block')),
  confidence     numeric     NOT NULL DEFAULT 0,
  entity_type    text,
  entity_id      text,
  core_event_id  uuid        REFERENCES public.core_events(id)
                             ON DELETE SET NULL,
  message        text        NOT NULL,
  recommendation text,
  status         text        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'resolved', 'ignored')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- 8. production_daily_kpis
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production_daily_kpis (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  day                    date        NOT NULL,
  commessa               text,
  cables_count           integer     NOT NULL DEFAULT 0,
  meters_done            numeric     NOT NULL DEFAULT 0,
  active_operators_count integer     NOT NULL DEFAULT 0,
  open_priorities_count  integer     NOT NULL DEFAULT 0,
  open_anomalies_count   integer     NOT NULL DEFAULT 0,
  payload                jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE(day, commessa) avec gestion des NULL :
-- Postgres ne considère pas deux NULL comme égaux dans un index UNIQUE standard.
CREATE UNIQUE INDEX IF NOT EXISTS uq_prod_kpis_day_commessa
  ON public.production_daily_kpis (day, commessa)
  WHERE commessa IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_prod_kpis_day_null_commessa
  ON public.production_daily_kpis (day)
  WHERE commessa IS NULL;

CREATE OR REPLACE TRIGGER trg_production_daily_kpis_updated_at
  BEFORE UPDATE ON public.production_daily_kpis
  FOR EACH ROW EXECUTE FUNCTION public.cc_set_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Timeline câble (via inca_cavo_id résolu + cable_code brut)
CREATE INDEX IF NOT EXISTS idx_core_events_inca_cavo_occurred
  ON public.core_events (inca_cavo_id, occurred_at DESC)
  WHERE inca_cavo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_events_cable_norm_occurred
  ON public.core_events (cable_code_normalized, occurred_at DESC)
  WHERE cable_code_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cable_events_inca_cavo_occurred
  ON public.cable_events (inca_cavo_id, occurred_at DESC)
  WHERE inca_cavo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cable_events_cable_code_occurred
  ON public.cable_events (cable_code, occurred_at DESC);

-- Timeline opérateur / zone / commessa / jour
CREATE INDEX IF NOT EXISTS idx_core_events_operator_occurred
  ON public.core_events (operator_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_core_events_zone_occurred
  ON public.core_events (zone, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_core_events_commessa_occurred
  ON public.core_events (commessa, occurred_at DESC);

-- occurred_at::date n'est pas IMMUTABLE (timezone-dependent) — index sur timestamptz brut.
-- Requêtes jour : WHERE occurred_at >= 'YYYY-MM-DD' AND occurred_at < 'YYYY-MM-DD'::date + 1
CREATE INDEX IF NOT EXISTS idx_core_events_day
  ON public.core_events (occurred_at DESC);

-- WhatsApp recherche
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_import_ts
  ON public.whatsapp_messages (import_id, message_ts);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_author_ts
  ON public.whatsapp_messages (author, message_ts DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_raw_trgm
  ON public.whatsapp_messages USING gin (raw_message gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_core_events_source_message
  ON public.core_events (source_message_id)
  WHERE source_message_id IS NOT NULL;

-- Pending validations
CREATE INDEX IF NOT EXISTS idx_core_events_pending
  ON public.core_events (validation_status, occurred_at DESC)
  WHERE validation_status = 'pending';

-- Priorities ouvertes
CREATE INDEX IF NOT EXISTS idx_cable_priorities_open
  ON public.cable_priorities (status, priority, created_at DESC)
  WHERE status = 'open';

-- Agent findings ouverts
CREATE INDEX IF NOT EXISTS idx_agent_findings_open
  ON public.agent_findings (status, severity, created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_agent_findings_entity
  ON public.agent_findings (entity_type, entity_id);

-- KPI jour
CREATE INDEX IF NOT EXISTS idx_production_daily_kpis_day
  ON public.production_daily_kpis (day DESC);

-- ============================================================================
-- RLS — NON ACTIVÉE EN P0 (dev single-user)
-- À appliquer en migration séparée avant prod :
--
--   ALTER TABLE public.core_operators           ADD COLUMN owner_id uuid NOT NULL DEFAULT auth.uid();
--   -- (idem 7 autres tables)
--   ALTER TABLE public.core_operators           ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY core_operators_owner_all ON public.core_operators
--     FOR ALL TO authenticated
--     USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--   -- service_role bypass RLS implicite → Edge Functions (WhatsApp intake, agents)
-- ============================================================================

COMMIT;

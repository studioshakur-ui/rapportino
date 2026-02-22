-- NAVEMASTER V2 (RUN-based, INCA baseline + APPROVED proofs + UFFICIO events)
-- Goal: replace Excel-navemaster import with an auditable, index-heavy system.
--
-- Key rules (CNCS-grade):
-- - P (posato) comes ONLY from rapportini APPROVED_UFFICIO proofs (rapportino_inca_cavi).
-- - E keeps the cable visible but forces metri_ref = 0.
-- - B is driven by structured blocchi_locali.
-- - UFFICIO writes are append-only (navemaster_events).

begin;

-- 0) Ensure nav_status supports 'L' (Libero)
-- Existing baseline enum has P/R/T/B/E/NP. INCA already allows L in situazione.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'nav_status'
      AND e.enumlabel = 'L'
  ) THEN
    ALTER TYPE public.nav_status ADD VALUE 'L';
  END IF;
END$$;

-- 1) New enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='navemaster_coverage') THEN
    CREATE TYPE public.navemaster_coverage AS ENUM ('INCA_ONLY','CORE_ONLY','BOTH');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='navemaster_alert_type') THEN
    CREATE TYPE public.navemaster_alert_type AS ENUM (
      'MISSING_IN_CORE',
      'EXTRA_IN_CORE',
      'DUPLICATE_IN_INCA',
      'STATUS_CONFLICT',
      'METRI_MISMATCH',
      'BLOCKED_IMPACT'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='navemaster_alert_status') THEN
    CREATE TYPE public.navemaster_alert_status AS ENUM ('OPEN','ACK','RESOLVED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='navemaster_run_verdict') THEN
    CREATE TYPE public.navemaster_run_verdict AS ENUM ('OK','WARN','BLOCK');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='navemaster_event_type') THEN
    -- R/L/B/E are operational states that UFFICIO can set as append-only events.
    -- NOTE is an informational event.
    CREATE TYPE public.navemaster_event_type AS ENUM ('R','L','B','E','NOTE');
  END IF;
END$$;

-- 2) NAVEMASTER V2 core tables

-- 2.1 Runs (immutable compute artifacts)
CREATE TABLE IF NOT EXISTS public.navemaster_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id uuid NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  costr text NOT NULL,
  commessa text NOT NULL,
  inca_file_id uuid NOT NULL REFERENCES public.inca_files(id) ON DELETE RESTRICT,
  approved_from date,
  approved_to date,
  verdict public.navemaster_run_verdict DEFAULT 'OK'::public.navemaster_run_verdict NOT NULL,
  drivers jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  frozen_at timestamptz
);

CREATE INDEX IF NOT EXISTS navemaster_runs_ship_created_at_idx ON public.navemaster_runs (ship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS navemaster_runs_ship_frozen_at_idx ON public.navemaster_runs (ship_id, frozen_at DESC);
CREATE INDEX IF NOT EXISTS navemaster_runs_inca_file_idx ON public.navemaster_runs (inca_file_id);

COMMENT ON TABLE public.navemaster_runs IS 'NAVEMASTER V2 runs: immutable snapshots computed from INCA baseline + APPROVED proofs + UFFICIO events.';

-- 2.2 State rows (1 per cable per run)
CREATE TABLE IF NOT EXISTS public.navemaster_state_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.navemaster_runs(id) ON DELETE CASCADE,
  ship_id uuid NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  inca_file_id uuid NOT NULL REFERENCES public.inca_files(id) ON DELETE RESTRICT,

  -- Identifiers
  codice text NOT NULL,
  codice_norm text GENERATED ALWAYS AS (replace(replace(trim(codice), ' ', ''), '*', '')) STORED,
  is_modified boolean GENERATED ALWAYS AS (position('*' in codice) > 0) STORED,

  -- Status
  stato_nav public.nav_status NOT NULL DEFAULT 'NP'::public.nav_status,

  -- Metrics
  metri_teo numeric,
  metri_dis numeric,
  metri_totali numeric,
  metri_ref numeric NOT NULL DEFAULT 0,
  metri_posati_ref numeric NOT NULL DEFAULT 0,
  delta_metri numeric NOT NULL DEFAULT 0,

  -- Topology / filters (mirrors INCA columns where present)
  descrizione text,
  impianto text,
  tipo text,
  sezione text,
  livello text,
  zona_da text,
  zona_a text,
  apparato_da text,
  apparato_a text,
  descrizione_da text,
  descrizione_a text,
  wbs text,

  -- Evidence
  last_proof_at timestamptz,
  last_rapportino_id uuid,

  -- Coverage
  coverage public.navemaster_coverage NOT NULL DEFAULT 'INCA_ONLY'::public.navemaster_coverage,

  created_at timestamptz DEFAULT now() NOT NULL
);

-- Uniqueness: one row per (run, codice_norm)
CREATE UNIQUE INDEX IF NOT EXISTS navemaster_state_rows_run_codice_norm_ux ON public.navemaster_state_rows (run_id, codice_norm);

-- Index-heavy (Excel-grade filters)
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_status_idx ON public.navemaster_state_rows (run_id, stato_nav);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_cov_idx ON public.navemaster_state_rows (run_id, coverage);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_modified_idx ON public.navemaster_state_rows (run_id, is_modified);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_delta_idx ON public.navemaster_state_rows (run_id, delta_metri);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_ref_idx ON public.navemaster_state_rows (run_id, metri_ref);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_pos_idx ON public.navemaster_state_rows (run_id, metri_posati_ref);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_last_proof_idx ON public.navemaster_state_rows (run_id, last_proof_at DESC);

CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_livello_idx ON public.navemaster_state_rows (run_id, livello);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_sezione_idx ON public.navemaster_state_rows (run_id, sezione);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_tipo_idx ON public.navemaster_state_rows (run_id, tipo);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_zona_da_idx ON public.navemaster_state_rows (run_id, zona_da);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_zona_a_idx ON public.navemaster_state_rows (run_id, zona_a);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_apparato_da_idx ON public.navemaster_state_rows (run_id, apparato_da);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_run_apparato_a_idx ON public.navemaster_state_rows (run_id, apparato_a);
CREATE INDEX IF NOT EXISTS navemaster_state_rows_codice_norm_idx ON public.navemaster_state_rows (codice_norm);

COMMENT ON TABLE public.navemaster_state_rows IS 'NAVEMASTER V2 computed state per cable (per run). Maximised for filtering and audit.';

-- 2.3 Structured blocchi locali (drives B)
CREATE TABLE IF NOT EXISTS public.blocchi_locali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id uuid NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  costr text NOT NULL,
  commessa text NOT NULL,
  deck text,
  zona text,
  locale_code text NOT NULL,
  reason_code text,
  reason_text text,
  severity public.nav_severity DEFAULT 'MAJOR'::public.nav_severity NOT NULL,
  blocked_at timestamptz DEFAULT now() NOT NULL,
  unblocked_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS blocchi_locali_ship_commessa_blocked_idx ON public.blocchi_locali (ship_id, commessa, blocked_at DESC);
CREATE INDEX IF NOT EXISTS blocchi_locali_ship_commessa_open_idx ON public.blocchi_locali (ship_id, commessa) WHERE unblocked_at IS NULL;
CREATE INDEX IF NOT EXISTS blocchi_locali_locale_idx ON public.blocchi_locali (locale_code);

COMMENT ON TABLE public.blocchi_locali IS 'Blocchi locali strutturati. UFFICIO can create/update (unblock) to drive NAV status B.';

-- 2.4 Append-only events (UFFICIO)
CREATE TABLE IF NOT EXISTS public.navemaster_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id uuid NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  costr text NOT NULL,
  commessa text NOT NULL,
  codice text NOT NULL,
  codice_norm text GENERATED ALWAYS AS (replace(replace(trim(codice), ' ', ''), '*', '')) STORED,
  event_type public.navemaster_event_type NOT NULL,
  event_at timestamptz DEFAULT now() NOT NULL,
  blocco_locale_id uuid REFERENCES public.blocchi_locali(id) ON DELETE SET NULL,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT navemaster_events_blocco_required_if_B CHECK ((event_type <> 'B'::public.navemaster_event_type) OR (blocco_locale_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS navemaster_events_ship_commessa_at_idx ON public.navemaster_events (ship_id, commessa, event_at DESC);
CREATE INDEX IF NOT EXISTS navemaster_events_codice_norm_at_idx ON public.navemaster_events (codice_norm, event_at DESC);
CREATE INDEX IF NOT EXISTS navemaster_events_type_idx ON public.navemaster_events (event_type);

COMMENT ON TABLE public.navemaster_events IS 'Append-only NAVEMASTER events (UFFICIO). Used to override baseline state: R/L/B/E + NOTE.';

-- 2.5 Alerts (append-only for a run)
CREATE TABLE IF NOT EXISTS public.navemaster_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.navemaster_runs(id) ON DELETE CASCADE,
  ship_id uuid NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  costr text NOT NULL,
  commessa text NOT NULL,
  codice text,
  codice_norm text,
  type public.navemaster_alert_type NOT NULL,
  severity public.nav_severity NOT NULL DEFAULT 'MAJOR'::public.nav_severity,
  evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
  status public.navemaster_alert_status NOT NULL DEFAULT 'OPEN'::public.navemaster_alert_status,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS navemaster_alerts_run_sev_idx ON public.navemaster_alerts (run_id, severity);
CREATE INDEX IF NOT EXISTS navemaster_alerts_run_type_idx ON public.navemaster_alerts (run_id, type);
CREATE INDEX IF NOT EXISTS navemaster_alerts_status_idx ON public.navemaster_alerts (status);
CREATE INDEX IF NOT EXISTS navemaster_alerts_codice_norm_idx ON public.navemaster_alerts (codice_norm);

COMMENT ON TABLE public.navemaster_alerts IS 'NAVEMASTER V2 alerts generated per run (typed, severity, evidence).';

-- 3) RLS (CNCS-grade)

ALTER TABLE public.navemaster_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navemaster_state_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocchi_locali ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navemaster_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navemaster_alerts ENABLE ROW LEVEL SECURITY;

-- Read policies: ADMIN / DIREZIONE / UFFICIO (navemaster_can_manage)
DROP POLICY IF EXISTS navemaster_runs_read_v2 ON public.navemaster_runs;
CREATE POLICY navemaster_runs_read_v2 ON public.navemaster_runs
  FOR SELECT
  USING (public.navemaster_can_manage());

DROP POLICY IF EXISTS navemaster_state_rows_read_v2 ON public.navemaster_state_rows;
CREATE POLICY navemaster_state_rows_read_v2 ON public.navemaster_state_rows
  FOR SELECT
  USING (public.navemaster_can_manage());

DROP POLICY IF EXISTS blocchi_locali_read_v2 ON public.blocchi_locali;
CREATE POLICY blocchi_locali_read_v2 ON public.blocchi_locali
  FOR SELECT
  USING (public.navemaster_can_manage());

DROP POLICY IF EXISTS navemaster_events_read_v2 ON public.navemaster_events;
CREATE POLICY navemaster_events_read_v2 ON public.navemaster_events
  FOR SELECT
  USING (public.navemaster_can_manage());

DROP POLICY IF EXISTS navemaster_alerts_read_v2 ON public.navemaster_alerts;
CREATE POLICY navemaster_alerts_read_v2 ON public.navemaster_alerts
  FOR SELECT
  USING (public.navemaster_can_manage());

-- Write policies: UFFICIO/ADMIN only (use navemaster_can_manage but we tighten to UFFICIO+ADMIN)
-- Reuse existing is_ufficio()/is_admin() helpers if present, otherwise fall back to profiles check.
CREATE OR REPLACE FUNCTION public.navemaster_is_ufficio_or_admin() RETURNS boolean
LANGUAGE sql STABLE
AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role in ('ADMIN','UFFICIO')
  );
$$;

DROP POLICY IF EXISTS navemaster_runs_write_v2 ON public.navemaster_runs;
CREATE POLICY navemaster_runs_write_v2 ON public.navemaster_runs
  FOR INSERT
  WITH CHECK (public.navemaster_is_ufficio_or_admin());

-- State rows are written only by SECURITY DEFINER compute function
DROP POLICY IF EXISTS navemaster_state_rows_write_v2 ON public.navemaster_state_rows;
CREATE POLICY navemaster_state_rows_write_v2 ON public.navemaster_state_rows
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS navemaster_alerts_write_v2 ON public.navemaster_alerts;
CREATE POLICY navemaster_alerts_write_v2 ON public.navemaster_alerts
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS blocchi_locali_write_v2 ON public.blocchi_locali;
CREATE POLICY blocchi_locali_write_v2 ON public.blocchi_locali
  FOR INSERT
  WITH CHECK (public.navemaster_is_ufficio_or_admin());

DROP POLICY IF EXISTS blocchi_locali_update_v2 ON public.blocchi_locali;
CREATE POLICY blocchi_locali_update_v2 ON public.blocchi_locali
  FOR UPDATE
  USING (public.navemaster_is_ufficio_or_admin())
  WITH CHECK (public.navemaster_is_ufficio_or_admin());

DROP POLICY IF EXISTS navemaster_events_write_v2 ON public.navemaster_events;
CREATE POLICY navemaster_events_write_v2 ON public.navemaster_events
  FOR INSERT
  WITH CHECK (public.navemaster_is_ufficio_or_admin());

-- Prevent UPDATE/DELETE on events and alerts (append-only)
DROP POLICY IF EXISTS navemaster_events_no_update_v2 ON public.navemaster_events;
CREATE POLICY navemaster_events_no_update_v2 ON public.navemaster_events
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS navemaster_events_no_delete_v2 ON public.navemaster_events;
CREATE POLICY navemaster_events_no_delete_v2 ON public.navemaster_events
  FOR DELETE
  USING (false);

DROP POLICY IF EXISTS navemaster_alerts_no_update_v2 ON public.navemaster_alerts;
CREATE POLICY navemaster_alerts_no_update_v2 ON public.navemaster_alerts
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS navemaster_alerts_no_delete_v2 ON public.navemaster_alerts;
CREATE POLICY navemaster_alerts_no_delete_v2 ON public.navemaster_alerts
  FOR DELETE
  USING (false);

-- 4) Compute function (SECURITY DEFINER)
-- Creates a run from INCA baseline and computes state rows using:
-- - baseline inca_cavi (for selected inca_file)
-- - proofs from rapportino_inca_cavi joined to rapportini with status APPROVED_UFFICIO
-- - latest UFFICIO event overrides (R/L/B/E)
--
-- This function intentionally writes state_rows and alerts with full evidence.

CREATE OR REPLACE FUNCTION public.navemaster_compute_run_v2(
  p_ship_id uuid,
  p_inca_file_id uuid DEFAULT NULL,
  p_approved_from date DEFAULT NULL,
  p_approved_to date DEFAULT NULL,
  p_freeze boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inca_file_id uuid;
  v_costr text;
  v_commessa text;
  v_run_id uuid;
BEGIN
  -- auth gate
  IF NOT public.navemaster_is_ufficio_or_admin() THEN
    RAISE EXCEPTION 'navemaster_compute_run_v2: not allowed';
  END IF;

  -- resolve inca_file_id (latest XLSX for ship)
  IF p_inca_file_id IS NULL THEN
    SELECT a.inca_file_id INTO v_inca_file_id
    FROM public.navemaster_active_inca_file_v1 a
    WHERE a.ship_id = p_ship_id;
  ELSE
    v_inca_file_id := p_inca_file_id;
  END IF;

  IF v_inca_file_id IS NULL THEN
    RAISE EXCEPTION 'navemaster_compute_run_v2: no INCA file found for ship_id=%', p_ship_id;
  END IF;

  SELECT f.costr, f.commessa INTO v_costr, v_commessa
  FROM public.inca_files f
  WHERE f.id = v_inca_file_id;

  IF v_costr IS NULL OR v_commessa IS NULL THEN
    -- Fallback to ship perimeter
    SELECT s.costr, s.commessa INTO v_costr, v_commessa
    FROM public.ships s
    WHERE s.id = p_ship_id;
  END IF;

  IF v_costr IS NULL OR v_commessa IS NULL THEN
    RAISE EXCEPTION 'navemaster_compute_run_v2: cannot resolve costr/commessa for ship_id=% inca_file_id=%', p_ship_id, v_inca_file_id;
  END IF;

  -- create run
  INSERT INTO public.navemaster_runs (ship_id, costr, commessa, inca_file_id, approved_from, approved_to, created_by, frozen_at)
  VALUES (
    p_ship_id,
    v_costr,
    v_commessa,
    v_inca_file_id,
    p_approved_from,
    p_approved_to,
    auth.uid(),
    CASE WHEN p_freeze THEN now() ELSE NULL END
  )
  RETURNING id INTO v_run_id;

  -- Latest UFFICIO event per codice
  WITH latest_evt AS (
    SELECT DISTINCT ON (e.codice_norm)
      e.codice_norm,
      e.event_type,
      e.blocco_locale_id,
      e.event_at
    FROM public.navemaster_events e
    WHERE e.ship_id = p_ship_id
      AND e.commessa = v_commessa
    ORDER BY e.codice_norm, e.event_at DESC, e.created_at DESC
  ),
  proofs AS (
    SELECT
      c.codice AS codice,
      replace(replace(trim(c.codice), ' ', ''), '*', '') AS codice_norm,
      sum(coalesce(ric.metri_posati,0))::numeric AS metri_posati_ref,
      max(r.approved_by_ufficio_at) AS last_proof_at,
      max(r.id) FILTER (WHERE r.approved_by_ufficio_at IS NOT NULL) AS last_rapportino_id
    FROM public.inca_cavi c
    JOIN public.rapportino_inca_cavi ric ON ric.inca_cavo_id = c.id
    JOIN public.rapportini r ON r.id = ric.rapportino_id
    WHERE c.inca_file_id = v_inca_file_id
      AND r.status = 'APPROVED_UFFICIO'
      AND (p_approved_from IS NULL OR r.report_date >= p_approved_from)
      AND (p_approved_to IS NULL OR r.report_date <= p_approved_to)
    GROUP BY c.codice
  )
  INSERT INTO public.navemaster_state_rows (
    run_id, ship_id, inca_file_id,
    codice, stato_nav,
    metri_teo, metri_dis, metri_totali, metri_ref,
    metri_posati_ref, delta_metri,
    descrizione, impianto, tipo, sezione, livello,
    zona_da, zona_a, apparato_da, apparato_a, descrizione_da, descrizione_a, wbs,
    last_proof_at, last_rapportino_id,
    coverage
  )
  SELECT
    v_run_id,
    p_ship_id,
    v_inca_file_id,
    c.codice,
    -- status precedence:
    --   1) E (latest event)
    --   2) B (latest event)
    --   3) P (any approved proof)
    --   4) R/L (latest event)
    --   5) baseline INCA situazione via nav_status_from_text
    COALESCE(
      CASE
        WHEN le.event_type = 'E'::public.navemaster_event_type THEN 'E'::public.nav_status
        WHEN le.event_type = 'B'::public.navemaster_event_type THEN 'B'::public.nav_status
        WHEN pr.metri_posati_ref IS NOT NULL AND pr.metri_posati_ref > 0 THEN 'P'::public.nav_status
        WHEN le.event_type = 'R'::public.navemaster_event_type THEN 'R'::public.nav_status
        WHEN le.event_type = 'L'::public.navemaster_event_type THEN 'L'::public.nav_status
        ELSE NULL
      END,
      public.nav_status_from_text(c.situazione)
    ) AS stato_nav,

    c.metri_teo,
    c.metri_dis,
    c.metri_totali,

    -- metri_ref: baseline reference length
    -- Rule: if status is E, keep cable but force ref length to 0.
    CASE
      WHEN le.event_type = 'E'::public.navemaster_event_type THEN 0
      ELSE COALESCE(
        NULLIF(c.metri_totali, 0),
        GREATEST(COALESCE(c.metri_teo,0), COALESCE(c.metri_dis,0)),
        0
      )
    END AS metri_ref,

    COALESCE(pr.metri_posati_ref, 0) AS metri_posati_ref,

    -- delta (positive means remaining)
    (CASE
      WHEN le.event_type = 'E'::public.navemaster_event_type THEN 0
      ELSE COALESCE(
        NULLIF(c.metri_totali, 0),
        GREATEST(COALESCE(c.metri_teo,0), COALESCE(c.metri_dis,0)),
        0
      )
    END - COALESCE(pr.metri_posati_ref, 0)) AS delta_metri,

    c.descrizione,
    c.impianto,
    c.tipo,
    c.sezione,
    c.livello,
    c.zona_da,
    c.zona_a,
    c.apparato_da,
    c.apparato_a,
    c.descrizione_da,
    c.descrizione_a,
    c.wbs,

    pr.last_proof_at,
    pr.last_rapportino_id,

    CASE
      WHEN pr.metri_posati_ref IS NOT NULL THEN 'BOTH'::public.navemaster_coverage
      ELSE 'INCA_ONLY'::public.navemaster_coverage
    END AS coverage

  FROM public.inca_cavi c
  LEFT JOIN proofs pr ON pr.codice_norm = replace(replace(trim(c.codice), ' ', ''), '*', '')
  LEFT JOIN latest_evt le ON le.codice_norm = replace(replace(trim(c.codice), ' ', ''), '*', '')
  WHERE c.inca_file_id = v_inca_file_id;

  -- Alerts: MISSING_IN_CORE (no proofs)
  INSERT INTO public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  SELECT
    v_run_id,
    p_ship_id,
    v_costr,
    v_commessa,
    s.codice,
    s.codice_norm,
    'MISSING_IN_CORE'::public.navemaster_alert_type,
    'MAJOR'::public.nav_severity,
    jsonb_build_object(
      'reason','no_approved_proof',
      'metri_ref', s.metri_ref,
      'stato_nav', s.stato_nav
    )
  FROM public.navemaster_state_rows s
  WHERE s.run_id = v_run_id
    AND s.metri_posati_ref = 0
    AND s.stato_nav <> 'E'::public.nav_status;

  -- Alerts: BLOCKED_IMPACT (status B)
  INSERT INTO public.navemaster_alerts (run_id, ship_id, costr, commessa, codice, codice_norm, type, severity, evidence)
  SELECT
    v_run_id,
    p_ship_id,
    v_costr,
    v_commessa,
    s.codice,
    s.codice_norm,
    'BLOCKED_IMPACT'::public.navemaster_alert_type,
    'CRITICAL'::public.nav_severity,
    jsonb_build_object(
      'reason','status_B',
      'metri_ref', s.metri_ref,
      'delta_metri', s.delta_metri
    )
  FROM public.navemaster_state_rows s
  WHERE s.run_id = v_run_id
    AND s.stato_nav = 'B'::public.nav_status;

  -- verdict: BLOCK if any CRITICAL alert, WARN if any MAJOR, else OK
  UPDATE public.navemaster_runs r
  SET verdict = (
      CASE
        WHEN EXISTS (SELECT 1 FROM public.navemaster_alerts a WHERE a.run_id = v_run_id AND a.severity = 'CRITICAL') THEN 'BLOCK'::public.navemaster_run_verdict
        WHEN EXISTS (SELECT 1 FROM public.navemaster_alerts a WHERE a.run_id = v_run_id AND a.severity = 'MAJOR') THEN 'WARN'::public.navemaster_run_verdict
        ELSE 'OK'::public.navemaster_run_verdict
      END
    ),
    drivers = (
      SELECT jsonb_build_object(
        'alerts', jsonb_build_object(
          'critical', (SELECT count(*) FROM public.navemaster_alerts a WHERE a.run_id = v_run_id AND a.severity='CRITICAL'),
          'major',    (SELECT count(*) FROM public.navemaster_alerts a WHERE a.run_id = v_run_id AND a.severity='MAJOR'),
          'info',     (SELECT count(*) FROM public.navemaster_alerts a WHERE a.run_id = v_run_id AND a.severity='INFO')
        ),
        'coverage', jsonb_build_object(
          'inca_only', (SELECT count(*) FROM public.navemaster_state_rows s WHERE s.run_id=v_run_id AND s.coverage='INCA_ONLY'),
          'both',      (SELECT count(*) FROM public.navemaster_state_rows s WHERE s.run_id=v_run_id AND s.coverage='BOTH')
        )
      )
    )
  WHERE r.id = v_run_id;

  RETURN v_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.navemaster_compute_run_v2(uuid,uuid,date,date,boolean) TO authenticated;

-- 5) Views (live v2 + KPI rollups)

-- latest frozen run per ship
CREATE OR REPLACE VIEW public.navemaster_latest_run_v2 AS
SELECT DISTINCT ON (r.ship_id)
  r.*
FROM public.navemaster_runs r
WHERE r.frozen_at IS NOT NULL
ORDER BY r.ship_id, r.frozen_at DESC, r.created_at DESC;

-- live rows: latest frozen run + state rows
CREATE OR REPLACE VIEW public.navemaster_live_v2 AS
SELECT
  lr.ship_id,
  lr.costr,
  lr.commessa,
  lr.id AS run_id,
  lr.inca_file_id,
  lr.created_at AS run_created_at,
  lr.frozen_at,
  lr.verdict,
  s.*
FROM public.navemaster_latest_run_v2 lr
JOIN public.navemaster_state_rows s
  ON s.run_id = lr.id;

COMMENT ON VIEW public.navemaster_live_v2 IS 'NAVEMASTER V2 live (latest frozen run per ship).';

-- KPI summary per ship (latest frozen run)
CREATE OR REPLACE VIEW public.navemaster_kpi_v2 AS
SELECT
  lr.ship_id,
  lr.costr,
  lr.commessa,
  lr.id AS run_id,
  lr.frozen_at,
  lr.verdict,
  count(*) AS total,
  count(*) FILTER (WHERE s.stato_nav='P') AS cnt_p,
  count(*) FILTER (WHERE s.stato_nav='T') AS cnt_t,
  count(*) FILTER (WHERE s.stato_nav='R') AS cnt_r,
  count(*) FILTER (WHERE s.stato_nav='L') AS cnt_l,
  count(*) FILTER (WHERE s.stato_nav='B') AS cnt_b,
  count(*) FILTER (WHERE s.stato_nav='E') AS cnt_e,
  count(*) FILTER (WHERE s.stato_nav='NP') AS cnt_np,
  sum(s.metri_ref) AS metri_ref_sum,
  sum(s.metri_posati_ref) AS metri_posati_sum,
  sum(s.delta_metri) AS delta_sum,
  (sum(s.metri_posati_ref) / NULLIF(sum(s.metri_ref),0)) AS progress_ratio
FROM public.navemaster_latest_run_v2 lr
JOIN public.navemaster_state_rows s ON s.run_id = lr.id
GROUP BY lr.ship_id, lr.costr, lr.commessa, lr.id, lr.frozen_at, lr.verdict;

COMMENT ON VIEW public.navemaster_kpi_v2 IS 'NAVEMASTER V2 KPI rollup (latest frozen run).';

-- Apply RLS-like guard at view usage via security_invoker views if needed later.

commit;
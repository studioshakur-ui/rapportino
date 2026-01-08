-- supabase/migrations/20260107213000_ships_select_perimeter.sql
-- Fix RLS: allow CAPO + MANAGER to SELECT ships in their perimeter
-- Robust version: auto-detect schemas + validate required columns + optional is_active

BEGIN;

DO $$
DECLARE
  ships_schema         text;
  profiles_schema      text;
  ship_capos_schema    text;
  ship_managers_schema text;

  has_is_active boolean;
  active_cond   text := '';

  missing_cols text;
BEGIN
  /* 1) Locate tables (prefer public if duplicates exist) */
  SELECT n.nspname INTO ships_schema
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'ships'
    AND c.relkind IN ('r','p')  -- table/partitioned table
  ORDER BY (n.nspname = 'public') DESC
  LIMIT 1;

  IF ships_schema IS NULL THEN
    RAISE EXCEPTION 'RLS migration: table "ships" not found in any schema.';
  END IF;

  SELECT n.nspname INTO profiles_schema
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'profiles'
    AND c.relkind IN ('r','p')
  ORDER BY (n.nspname = 'public') DESC
  LIMIT 1;

  IF profiles_schema IS NULL THEN
    RAISE EXCEPTION 'RLS migration: table "profiles" not found in any schema.';
  END IF;

  SELECT n.nspname INTO ship_capos_schema
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'ship_capos'
    AND c.relkind IN ('r','p')
  ORDER BY (n.nspname = 'public') DESC
  LIMIT 1;

  IF ship_capos_schema IS NULL THEN
    RAISE EXCEPTION 'RLS migration: table "ship_capos" not found in any schema.';
  END IF;

  SELECT n.nspname INTO ship_managers_schema
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'ship_managers'
    AND c.relkind IN ('r','p')
  ORDER BY (n.nspname = 'public') DESC
  LIMIT 1;

  IF ship_managers_schema IS NULL THEN
    RAISE EXCEPTION 'RLS migration: table "ship_managers" not found in any schema.';
  END IF;

  /* 2) Validate required columns */
  -- profiles: id, app_role
  SELECT string_agg(col, ', ') INTO missing_cols
  FROM (
    SELECT 'id' AS col
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = profiles_schema AND table_name = 'profiles' AND column_name = 'id'
    )
    UNION ALL
    SELECT 'app_role'
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = profiles_schema AND table_name = 'profiles' AND column_name = 'app_role'
    )
  ) t;

  IF missing_cols IS NOT NULL THEN
    RAISE EXCEPTION 'RLS migration: missing column(s) on %.profiles: %', profiles_schema, missing_cols;
  END IF;

  -- ship_capos: ship_id, capo_id
  SELECT string_agg(col, ', ') INTO missing_cols
  FROM (
    SELECT 'ship_id' AS col
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ship_capos_schema AND table_name = 'ship_capos' AND column_name = 'ship_id'
    )
    UNION ALL
    SELECT 'capo_id'
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ship_capos_schema AND table_name = 'ship_capos' AND column_name = 'capo_id'
    )
  ) t;

  IF missing_cols IS NOT NULL THEN
    RAISE EXCEPTION 'RLS migration: missing column(s) on %.ship_capos: %', ship_capos_schema, missing_cols;
  END IF;

  -- ship_managers: ship_id, manager_id
  SELECT string_agg(col, ', ') INTO missing_cols
  FROM (
    SELECT 'ship_id' AS col
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ship_managers_schema AND table_name = 'ship_managers' AND column_name = 'ship_id'
    )
    UNION ALL
    SELECT 'manager_id'
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ship_managers_schema AND table_name = 'ship_managers' AND column_name = 'manager_id'
    )
  ) t;

  IF missing_cols IS NOT NULL THEN
    RAISE EXCEPTION 'RLS migration: missing column(s) on %.ship_managers: %', ship_managers_schema, missing_cols;
  END IF;

  /* 3) Optional ships.is_active condition */
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = ships_schema AND table_name = 'ships' AND column_name = 'is_active'
  ) INTO has_is_active;

  IF has_is_active THEN
    active_cond := ' AND ships.is_active = true';
  ELSE
    active_cond := '';
  END IF;

  /* 4) Apply RLS + policies on the located ships table */
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', ships_schema, 'ships');

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', 'ships_manager_select_perimeter', ships_schema, 'ships');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', 'ships_capo_select_assigned',  ships_schema, 'ships');

  -- MANAGER policy
  EXECUTE format($POL$
    CREATE POLICY %I
    ON %I.%I
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM %I.%I p
        WHERE p.id = auth.uid()
          AND p.app_role = 'MANAGER'
      )
      %s
      AND EXISTS (
        SELECT 1
        FROM %I.%I sm
        WHERE sm.ship_id = ships.id
          AND sm.manager_id = auth.uid()
      )
    );
  $POL$,
    'ships_manager_select_perimeter',
    ships_schema, 'ships',
    profiles_schema, 'profiles',
    active_cond,
    ship_managers_schema, 'ship_managers'
  );

  -- CAPO policy
  EXECUTE format($POL$
    CREATE POLICY %I
    ON %I.%I
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM %I.%I p
        WHERE p.id = auth.uid()
          AND p.app_role = 'CAPO'
      )
      %s
      AND EXISTS (
        SELECT 1
        FROM %I.%I sc
        WHERE sc.ship_id = ships.id
          AND sc.capo_id = auth.uid()
      )
    );
  $POL$,
    'ships_capo_select_assigned',
    ships_schema, 'ships',
    profiles_schema, 'profiles',
    active_cond,
    ship_capos_schema, 'ship_capos'
  );

  RAISE NOTICE 'RLS migration OK. ships=%.ships, profiles=%.profiles, ship_capos=%.ship_capos, ship_managers=%.ship_managers, is_active=%',
    ships_schema, profiles_schema, ship_capos_schema, ship_managers_schema, has_is_active;

END $$;

COMMIT;
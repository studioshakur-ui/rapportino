-- supabase/migrations/20260113180000_inca_versioning_and_import_runs.sql
-- INCA: versioning + resoconto import (diff) for continuous updates.
-- Canon intent: INCA is never stable; we store immutable snapshots and compute a diff vs previous.

BEGIN;

-- 1) Extend inca_files to support grouping + hashing + lineage.
ALTER TABLE IF EXISTS public.inca_files
  ADD COLUMN IF NOT EXISTS group_key text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS previous_inca_file_id uuid,
  ADD COLUMN IF NOT EXISTS import_run_id uuid;

-- 2) Import runs: immutable audit record with diff.
CREATE TABLE IF NOT EXISTS public.inca_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key text NOT NULL,
  costr text,
  commessa text,
  project_code text,
  mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  previous_inca_file_id uuid,
  new_inca_file_id uuid,
  content_hash text,
  summary jsonb,
  diff jsonb
);

COMMENT ON TABLE public.inca_import_runs IS 'Audit: each INCA import run (dry/commit/enrich) with diff vs previous snapshot.';

-- 3) FKs (deferred until table exists).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inca_files_previous_inca_file_id_fkey'
  ) THEN
    ALTER TABLE public.inca_files
      ADD CONSTRAINT inca_files_previous_inca_file_id_fkey
      FOREIGN KEY (previous_inca_file_id) REFERENCES public.inca_files(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inca_files_import_run_id_fkey'
  ) THEN
    ALTER TABLE public.inca_files
      ADD CONSTRAINT inca_files_import_run_id_fkey
      FOREIGN KEY (import_run_id) REFERENCES public.inca_import_runs(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inca_import_runs_previous_inca_file_id_fkey'
  ) THEN
    ALTER TABLE public.inca_import_runs
      ADD CONSTRAINT inca_import_runs_previous_inca_file_id_fkey
      FOREIGN KEY (previous_inca_file_id) REFERENCES public.inca_files(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inca_import_runs_new_inca_file_id_fkey'
  ) THEN
    ALTER TABLE public.inca_import_runs
      ADD CONSTRAINT inca_import_runs_new_inca_file_id_fkey
      FOREIGN KEY (new_inca_file_id) REFERENCES public.inca_files(id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- 4) Indexes for fast latest-by-group queries.
CREATE INDEX IF NOT EXISTS inca_files_group_key_uploaded_at_idx
  ON public.inca_files (group_key, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS inca_import_runs_group_key_created_at_idx
  ON public.inca_import_runs (group_key, created_at DESC);

COMMIT;

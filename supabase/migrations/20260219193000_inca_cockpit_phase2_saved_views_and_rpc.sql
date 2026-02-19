-- ===============================
-- PHASE 2 – SAVED VIEWS + RPC
-- ===============================

-- 1) RAW column (no-loss guarantee)
ALTER TABLE public.inca_cavi
ADD COLUMN IF NOT EXISTS raw jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS inca_cavi_raw_gin
ON public.inca_cavi
USING gin (raw jsonb_path_ops);

-- 2) SAVED VIEWS
CREATE TABLE IF NOT EXISTS public.inca_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_scope text,
  name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('standard','audit')),
  columns jsonb NOT NULL,
  filters jsonb NOT NULL,
  sort jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inca_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY inca_saved_views_owner_policy
ON public.inca_saved_views
FOR ALL
USING (auth.uid() = owner_user_id);

-- 3) RPC QUERY
CREATE OR REPLACE FUNCTION public.inca_cockpit_query_v1(
  p_inca_file_id uuid,
  p_filters jsonb DEFAULT '[]',
  p_sort jsonb DEFAULT '[]',
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_offset int := (p_page - 1) * p_page_size;
  v_result jsonb;
BEGIN
  WITH base AS (
    SELECT *
    FROM public.inca_cavi_with_last_posa_and_capo_v2
    WHERE inca_file_id = p_inca_file_id
  )
  SELECT jsonb_build_object(
    'rows', (
      SELECT jsonb_agg(b)
      FROM (
        SELECT *
        FROM base
        LIMIT p_page_size OFFSET v_offset
      ) b
    ),
    'total', (SELECT count(*) FROM base)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;
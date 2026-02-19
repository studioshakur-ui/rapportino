-- supabase/migrations/20260219193500_inca_views_v2_with_raw_and_locali.sql
--
-- INCA Views v2 — RAW exposed + stable Posa/Capo across imports
--
-- Fixes:
-- 1) DISTINCT ON requires ORDER BY to start with DISTINCT ON expressions (42P10)
-- 2) Avoid duplicate "raw" column (42701): c.* already includes raw
--
-- Recreates:
--   - public.inca_cavi_with_last_posa_and_capo_v2

BEGIN;

DROP VIEW IF EXISTS public.inca_cavi_with_last_posa_and_capo_v2;

CREATE OR REPLACE VIEW public.inca_cavi_with_last_posa_and_capo_v2 AS
WITH posa AS (
  SELECT DISTINCT ON (ric.codice_cache, ric.costr_cache, ric.commessa_cache)
    ric.codice_cache,
    ric.costr_cache,
    ric.commessa_cache,
    r.data AS data_posa,
    p.full_name AS capo_label
  FROM public.rapportino_inca_cavi ric
  JOIN public.rapportini r
    ON r.id = ric.rapportino_id
  LEFT JOIN public.profiles p
    ON p.id = r.user_id
  WHERE
    ric.step_type = 'POSA'::public.cavo_step_type
    AND r.data IS NOT NULL
    AND ric.codice_cache IS NOT NULL
    AND ric.costr_cache IS NOT NULL
    AND ric.commessa_cache IS NOT NULL
  ORDER BY
    ric.codice_cache,
    ric.costr_cache,
    ric.commessa_cache,
    r.data DESC,
    r.updated_at DESC,
    ric.updated_at DESC
)
SELECT
  c.*,
  posa.data_posa,
  posa.capo_label
FROM public.inca_cavi c
LEFT JOIN posa
  ON posa.codice_cache = c.codice
  AND posa.costr_cache = c.costr
  AND posa.commessa_cache = c.commessa;

COMMENT ON VIEW public.inca_cavi_with_last_posa_and_capo_v2 IS
  'INCA cables + last POSA date + capo label (stable across INCA re-imports via caches). RAW is included via c.*.';

-- Align grants with prior behavior (adjust if your RLS model expects different).
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO anon;
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO authenticated;
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO service_role;

COMMIT;
-- Refresh INCA cockpit views to expose newly added INCA date columns
-- NOTE: c.* in view captures columns at CREATE time; this migration refreshes v3/v2.

BEGIN;

-- Drop v2 first (depends on v3)
DROP VIEW IF EXISTS public.inca_cavi_with_last_posa_and_capo_v2;
DROP VIEW IF EXISTS public.inca_cavi_with_last_posa_and_capo_v3;

CREATE OR REPLACE VIEW public.inca_cavi_with_last_posa_and_capo_v3 AS
WITH posa AS (
  SELECT DISTINCT ON (
    regexp_replace(trim(replace(ric.codice_cache, chr(160), ' ')), '\s+', ' ', 'g'),
    ric.costr_cache,
    ric.commessa_cache
  )
    regexp_replace(trim(replace(ric.codice_cache, chr(160), ' ')), '\s+', ' ', 'g') AS codice_norm,
    ric.costr_cache,
    ric.commessa_cache,
    ric.posa_date AS posa_date,
    COALESCE(
      p_capo.display_name,
      p_capo.full_name,
      p_user.display_name,
      p_user.full_name,
      r.capo_name
    ) AS capo_label
  FROM public.rapportino_inca_cavi ric
  JOIN public.rapportini r
    ON r.id = ric.rapportino_id
  LEFT JOIN public.profiles p_capo
    ON p_capo.id = r.capo_id
  LEFT JOIN public.profiles p_user
    ON p_user.id = r.user_id
  WHERE
    ric.step_type = 'POSA'::public.cavo_step_type
    AND ric.posa_date IS NOT NULL
    AND ric.codice_cache IS NOT NULL
    AND ric.costr_cache IS NOT NULL
    AND ric.commessa_cache IS NOT NULL
  ORDER BY
    regexp_replace(trim(replace(ric.codice_cache, chr(160), ' ')), '\s+', ' ', 'g'),
    ric.costr_cache,
    ric.commessa_cache,
    ric.posa_date DESC,
    r.updated_at DESC,
    ric.updated_at DESC
)
SELECT
  c.*,
  CASE WHEN c.situazione = 'P' THEN posa.posa_date ELSE NULL END AS data_posa,
  CASE WHEN c.situazione = 'P' THEN posa.capo_label ELSE NULL END AS capo_label
FROM public.inca_cavi c
LEFT JOIN posa
  ON posa.codice_norm = regexp_replace(trim(replace(c.codice, chr(160), ' ')), '\s+', ' ', 'g')
  AND posa.costr_cache = c.costr
  AND posa.commessa_cache = c.commessa;

COMMENT ON VIEW public.inca_cavi_with_last_posa_and_capo_v3 IS
  'INCA cables + last POSA date (ric.posa_date) + capo label (via rapportini.capo_id) stable across INCA re-imports via caches; strict chantier: outputs masked unless situazione = P.';

-- Backward-compatible alias
CREATE OR REPLACE VIEW public.inca_cavi_with_last_posa_and_capo_v2 AS
SELECT * FROM public.inca_cavi_with_last_posa_and_capo_v3;

COMMENT ON VIEW public.inca_cavi_with_last_posa_and_capo_v2 IS
  'Alias to v3 (strict chantier masking; capo via capo_id; posa_date from rapportino_inca_cavi).';

GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v3 TO anon;
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v3 TO authenticated;
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v3 TO service_role;

GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO anon;
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO authenticated;
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO service_role;

COMMIT;

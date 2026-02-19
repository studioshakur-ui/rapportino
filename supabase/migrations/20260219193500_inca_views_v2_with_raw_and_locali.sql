-- ==========================================
-- VIEW V2 – Posa/Capo stable + RAW exposed
-- ==========================================

CREATE OR REPLACE VIEW public.inca_cavi_with_last_posa_and_capo_v2 AS
WITH posa AS (
  SELECT DISTINCT ON (ric.codice_cache, ric.costr_cache, ric.commessa_cache)
    ric.codice_cache,
    ric.costr_cache,
    ric.commessa_cache,
    r.data AS data_posa,
    p.full_name AS capo_label
  FROM public.rapportino_inca_cavi ric
  JOIN public.rapportini r ON r.id = ric.rapportino_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  ORDER BY ric.codice_cache, r.data DESC
)
SELECT
  c.*,
  posa.data_posa,
  posa.capo_label,
  c.raw
FROM public.inca_cavi c
LEFT JOIN posa
  ON posa.codice_cache = c.codice
  AND posa.costr_cache = c.costr
  AND posa.commessa_cache = c.commessa;
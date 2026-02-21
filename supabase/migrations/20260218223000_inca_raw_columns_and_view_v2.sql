- 20260218223000_inca_raw_columns_and_view_v2.sql
-- CORE / INCA hardening: preserve *all* XLSX columns + stable posa/capo join across imports.
--
-- Non negotiable invariants:
-- - Never lose columns: store raw row as JSONB on inca_cavi.
-- - Never lose posa/capo when re-importing a new INCA: view join must be stable across inca_cavi IDs.
-- - Respect RLS: views must be SECURITY INVOKER.

BEGIN;

-- 1) Preserve full XLSX row payload (naval-grade audit).
ALTER TABLE public.inca_cavi
  ADD COLUMN IF NOT EXISTS raw jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.inca_cavi.raw IS 'Raw canonicalized XLSX row (all columns preserved as JSONB).';

-- 2) v2 view: last posa + capo must survive new imports.
--    Root cause: old view joined rapportino_inca_cavi by inca_cavo_id only.
--    After re-import, inca_cavi ids change -> posa_date/capo disappear.
--
--    Fix strategy:
--    - Prefer join by inca_cavo_id when it matches.
--    - Fallback join by caches (codice_cache + costr_cache + commessa_cache) using a normalized key.
--      (Caches are hydrated by fn_hydrate_rapportino_inca_cavi_caches).

DROP VIEW IF EXISTS public.inca_cavi_with_last_posa_and_capo_v2;

CREATE VIEW public.inca_cavi_with_last_posa_and_capo_v2
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.inca_file_id,
  c.costr,
  c.commessa,
  c.codice,
  c.descrizione,
  c.impianto,
  c.tipo,
  c.sezione,
  c.zona_da,
  c.zona_a,
  c.apparato_da,
  c.apparato_a,
  c.descrizione_da,
  c.descrizione_a,
  c.metri_teo,
  c.metri_dis,
  c.metri_sit_cavo,
  c.metri_sit_tec,
  c.pagina_pdf,
  c.rev_inca,
  c.stato_inca,
  c.created_at,
  c.updated_at,
  c.situazione,
  c.from_file_id,
  c.metri_previsti,
  c.metri_posati_teorici,
  c.metri_totali,
  c.marca_cavo,
  c.livello,
  c.metri_sta,
  c.stato_tec,
  c.stato_cantiere,
  c.situazione_cavo,
  c.livello_disturbo,
  c.wbs,
  c.codice_inca,
  c.progress_percent,
  c.progress_side,
  c.raw,
  lp.data_posa,
  r.capo_id,
  COALESCE(
    NULLIF(TRIM(BOTH FROM p.display_name), ''),
    NULLIF(TRIM(BOTH FROM p.full_name), ''),
    NULLIF(TRIM(BOTH FROM r.capo_name), '')
  ) AS capo_label
FROM
  public.inca_cavi c
  LEFT JOIN LATERAL (
    SELECT
      ric.posa_date AS data_posa,
      ric.rapportino_id
    FROM public.rapportino_inca_cavi ric
    WHERE
      ric.posa_date IS NOT NULL
      AND ric.step_type = 'POSA'::public.cavo_step_type
      AND (
        -- Strong match: same inca_cavo_id
        ric.inca_cavo_id = c.id
        OR (
          -- Stable match across imports (IDs change): use caches
          ric.codice_cache IS NOT NULL
          AND ric.costr_cache IS NOT NULL
          AND ric.commessa_cache IS NOT NULL
          AND upper(regexp_replace(trim(ric.codice_cache), '\\s+', ' ', 'g')) = upper(regexp_replace(trim(c.codice), '\\s+', ' ', 'g'))
          AND upper(trim(ric.costr_cache)) = upper(trim(c.costr))
          AND upper(trim(ric.commessa_cache)) = upper(trim(c.commessa))
        )
      )
    ORDER BY ric.posa_date DESC, ric.updated_at DESC
    LIMIT 1
  ) lp ON true
  LEFT JOIN public.rapportini r ON r.id = lp.rapportino_id
  LEFT JOIN public.profiles p ON p.id = r.capo_id;

COMMENT ON VIEW public.inca_cavi_with_last_posa_and_capo_v2 IS
  'INCA cables + last posa + capo label. v2 preserves posa/capo across new INCA imports by joining via caches (codice_cache/costr_cache/commessa_cache) when IDs change.';

-- Keep grants aligned with v1 behavior.
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO anon;
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO authenticated;
GRANT ALL ON TABLE public.inca_cavi_with_last_posa_and_capo_v2 TO service_role;

COMMIT;

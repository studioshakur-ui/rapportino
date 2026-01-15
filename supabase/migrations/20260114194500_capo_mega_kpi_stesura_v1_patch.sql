set check_function_bodies = off;

-- Patch: fix date_from NULL (BETWEEN NULL issue) + robust costr/commessa matching
-- + fix INCA column name (situazione)

CREATE OR REPLACE FUNCTION public.fn_capo_mega_kpi_kind(p_descr text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN p_descr IS NULL OR btrim(p_descr) = '' THEN 'OTHER'
      WHEN lower(p_descr) LIKE '%fascett%' THEN 'FASCETTATURA'
      WHEN lower(p_descr) LIKE '%ripresa%' THEN 'RIPRESA'
      WHEN lower(p_descr) LIKE '%stesura%' THEN 'STESURA'
      ELSE 'OTHER'
    END;
$$;

CREATE OR REPLACE FUNCTION public.capo_mega_kpi_stesura_v1(
  p_costr text,
  p_commessa text DEFAULT NULL,
  p_inca_file_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH
capo_ctx AS (
  SELECT auth.uid()::uuid AS capo_id
),
norm AS (
  SELECT
    NULLIF(lower(btrim(p_costr)), '') AS costr_norm,
    NULLIF(lower(btrim(p_commessa)), '') AS commessa_norm
),
inca_pick AS (
  SELECT
    COALESCE(
      p_inca_file_id,
      (
        SELECT f.id
        FROM public.inca_files f
        JOIN norm n ON true
        WHERE (n.costr_norm IS NULL OR lower(btrim(f.costr)) = n.costr_norm)
          AND (n.commessa_norm IS NULL OR lower(btrim(f.commessa)) = n.commessa_norm)
        ORDER BY f.uploaded_at DESC
        LIMIT 1
      )
    ) AS inca_file_id
),
d0 AS (
  SELECT
    MIN(COALESCE(r.report_date, r.data)) AS d0_date
  FROM public.rapportini r
  JOIN capo_ctx c ON true
  JOIN norm n ON true
  WHERE r.capo_id = c.capo_id
    AND (n.costr_norm IS NULL OR lower(btrim(r.costr::text)) = n.costr_norm)
    AND (n.commessa_norm IS NULL OR lower(btrim(r.commessa::text)) = n.commessa_norm)
    AND (r.superseded_by_rapportino_id IS NULL)
),
range_ctx AS (
  SELECT
    COALESCE(
      p_date_from,
      (SELECT d0_date FROM d0),
      (CURRENT_DATE - INTERVAL '45 days')::date
    ) AS date_from,
    COALESCE(p_date_to, CURRENT_DATE) AS date_to
),
inca_scope AS (
  SELECT
    ip.inca_file_id,
    COALESCE(SUM(c.metri_teo), 0)::numeric AS metri_teo_total,
    COALESCE(
      SUM(
        CASE
          WHEN c.situazione = 'P' THEN
            CASE
              WHEN c.metri_dis IS NOT NULL AND c.metri_dis > 0 THEN c.metri_dis
              ELSE COALESCE(c.metri_teo, 0)
            END
          ELSE 0
        END
      ),
      0
    )::numeric AS offset_m
  FROM inca_pick ip
  LEFT JOIN public.inca_cavi c
    ON c.inca_file_id = ip.inca_file_id
  GROUP BY ip.inca_file_id
),
rows_base AS (
  SELECT
    COALESCE(r.report_date, r.data) AS report_date,
    rr.prodotto::numeric AS prodotto,
    COALESCE(ca.descrizione, rr.descrizione) AS descrizione_eff
  FROM public.rapportini r
  JOIN capo_ctx c ON true
  JOIN norm n ON true
  JOIN range_ctx rg ON true
  JOIN public.rapportino_rows rr
    ON rr.rapportino_id = r.id
  LEFT JOIN public.catalogo_attivita ca
    ON ca.id = rr.activity_id
  WHERE r.capo_id = c.capo_id
    AND (n.costr_norm IS NULL OR lower(btrim(r.costr::text)) = n.costr_norm)
    AND (n.commessa_norm IS NULL OR lower(btrim(r.commessa::text)) = n.commessa_norm)
    AND (r.superseded_by_rapportino_id IS NULL)
    AND COALESCE(r.report_date, r.data) BETWEEN rg.date_from AND rg.date_to
    AND rr.prodotto IS NOT NULL
),
daily AS (
  SELECT
    report_date::date AS date,
    COALESCE(SUM(CASE WHEN public.fn_capo_mega_kpi_kind(descrizione_eff) = 'STESURA' THEN prodotto ELSE 0 END), 0)::numeric AS stesura_m,
    COALESCE(SUM(CASE WHEN public.fn_capo_mega_kpi_kind(descrizione_eff) = 'RIPRESA' THEN prodotto ELSE 0 END), 0)::numeric AS ripresa_m,
    COALESCE(SUM(CASE WHEN public.fn_capo_mega_kpi_kind(descrizione_eff) = 'FASCETTATURA' THEN prodotto ELSE 0 END), 0)::numeric AS fascettatura_m
  FROM rows_base
  GROUP BY report_date::date
),
daily2 AS (
  SELECT
    d.date,
    d.stesura_m,
    d.ripresa_m,
    (d.stesura_m + d.ripresa_m)::numeric AS stesura_giorno_m,
    d.fascettatura_m
  FROM daily d
),
daily_cum AS (
  SELECT
    d.*,
    (SELECT s.offset_m FROM inca_scope s) +
      SUM(d.stesura_giorno_m) OVER (ORDER BY d.date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      AS stesura_cum_m
  FROM daily2 d
),
headline AS (
  SELECT
    (SELECT date_to FROM range_ctx)::date AS today_date,
    (SELECT COALESCE(stesura_m,0) FROM daily2 WHERE date = (SELECT date_to FROM range_ctx)::date) AS today_stesura_m,
    (SELECT COALESCE(ripresa_m,0) FROM daily2 WHERE date = (SELECT date_to FROM range_ctx)::date) AS today_ripresa_m,
    (SELECT COALESCE(stesura_giorno_m,0) FROM daily2 WHERE date = (SELECT date_to FROM range_ctx)::date) AS today_stesura_giorno_m,
    (SELECT fascettatura_m FROM daily2 WHERE date = (SELECT date_to FROM range_ctx)::date) AS today_fascettatura_m,
    (SELECT COALESCE(stesura_cum_m, (SELECT offset_m FROM inca_scope)) FROM daily_cum ORDER BY date DESC LIMIT 1) AS stesura_cum_m
)
SELECT jsonb_build_object(
  'meta', jsonb_build_object(
    'costr', p_costr,
    'commessa', p_commessa,
    'from', (SELECT date_from FROM range_ctx),
    'to', (SELECT date_to FROM range_ctx),
    'scope', jsonb_build_object(
      'inca_file_id', (SELECT inca_file_id FROM inca_scope),
      'metri_teo_total', (SELECT metri_teo_total FROM inca_scope),
      'offset_m', (SELECT offset_m FROM inca_scope)
    ),
    'rules', jsonb_build_object(
      'stesura_giorno_includes', jsonb_build_array('STESURA','RIPRESA'),
      'excluded', jsonb_build_array('FASCETTATURA'),
      'unit', 'm'
    )
  ),
  'headline', jsonb_build_object(
    'today', jsonb_build_object(
      'date', (SELECT today_date FROM headline),
      'stesura_m', (SELECT today_stesura_m FROM headline),
      'ripresa_m', (SELECT today_ripresa_m FROM headline),
      'stesura_giorno_m', (SELECT today_stesura_giorno_m FROM headline),
      'fascettatura_m', (SELECT today_fascettatura_m FROM headline)
    ),
    'cumulative', jsonb_build_object(
      'stesura_cum_m', (SELECT stesura_cum_m FROM headline),
      'progress_pct',
        CASE
          WHEN (SELECT metri_teo_total FROM inca_scope) > 0
            THEN ROUND(((SELECT stesura_cum_m FROM headline) / (SELECT metri_teo_total FROM inca_scope) * 100.0)::numeric, 4)
          ELSE NULL
        END
    )
  ),
  'series', jsonb_build_object(
    'daily', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'date', d.date,
            'stesura_m', d.stesura_m,
            'ripresa_m', d.ripresa_m,
            'stesura_giorno_m', d.stesura_giorno_m,
            'fascettatura_m', d.fascettatura_m,
            'stesura_cum_m', d.stesura_cum_m
          )
          ORDER BY d.date
        )
        FROM daily_cum d
      ),
      '[]'::jsonb
    ),
    'events', jsonb_build_array()
  ),
  'drilldown', jsonb_build_object(
    'available', true,
    'note', 'La funzione applica STESURA+RIPRESA come posa. Fascettatura è esclusa.'
  )
);
$$;

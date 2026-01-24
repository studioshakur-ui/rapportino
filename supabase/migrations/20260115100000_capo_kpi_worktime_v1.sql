set check_function_bodies = off;

-- KPI #4 (CAPO): Worktime cockpit
-- Perimetro: rapportini firmati dal Capo (auth.uid())
-- Scopo: ore totali + straordinario deterministico (max(ore_giorno - 8, 0) Lun–Ven)

CREATE OR REPLACE FUNCTION public.capo_kpi_worktime_v1(
  p_costr text,
  p_commessa text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH
capo_ctx AS (
  SELECT auth.uid()::uuid AS capo_id
),
guard AS (
  SELECT
    CASE
      WHEN (SELECT capo_id FROM capo_ctx) IS NULL THEN
        (SELECT jsonb_build_object(
          'error', 'AUTH_REQUIRED',
          'message', 'auth.uid() is NULL. Call as authenticated user.',
          'meta', jsonb_build_object('costr', p_costr, 'commessa', p_commessa)
        ))
      ELSE NULL
    END AS err
),
norm AS (
  SELECT
    NULLIF(lower(btrim(p_costr)), '') AS costr_norm,
    NULLIF(lower(btrim(p_commessa)), '') AS commessa_norm
),
-- default range = current week Mon..Fri (clamped to today)
week_bounds AS (
  SELECT
    (date_trunc('week', CURRENT_DATE)::date) AS week_mon,
    (date_trunc('week', CURRENT_DATE)::date + 4) AS week_fri,
    CURRENT_DATE AS today
),
range_ctx AS (
  SELECT
    COALESCE(p_date_from, (SELECT week_mon FROM week_bounds))::date AS date_from,
    COALESCE(p_date_to, LEAST((SELECT week_fri FROM week_bounds), (SELECT today FROM week_bounds)))::date AS date_to
),
base AS (
  SELECT
    COALESCE(r.report_date, r.data)::date AS report_date,
    rro.operator_id,
    COALESCE(rro.tempo_hours, 0)::numeric AS tempo_hours
  FROM public.rapportini r
  JOIN capo_ctx c ON true
  JOIN norm n ON true
  JOIN range_ctx rg ON true
  JOIN public.rapportino_rows rr ON rr.rapportino_id = r.id
  JOIN public.rapportino_row_operators rro ON rro.rapportino_row_id = rr.id
  WHERE r.capo_id = c.capo_id
    AND (n.costr_norm IS NULL OR lower(btrim(r.costr::text)) = n.costr_norm)
    AND (n.commessa_norm IS NULL OR lower(btrim(r.commessa::text)) = n.commessa_norm)
    AND (r.superseded_by_rapportino_id IS NULL)
    AND COALESCE(r.report_date, r.data)::date BETWEEN rg.date_from AND rg.date_to
    -- firmati = almeno validati dal Capo (et approvati ufficio)
    AND r.status IN ('VALIDATED_CAPO', 'APPROVED_UFFICIO')
),
daily_by_operator AS (
  SELECT
    b.report_date,
    b.operator_id,
    COALESCE(SUM(b.tempo_hours), 0)::numeric AS hours
  FROM base b
  GROUP BY b.report_date, b.operator_id
),
daily_total AS (
  SELECT
    d.report_date AS date,
    COALESCE(SUM(d.hours), 0)::numeric AS hours,
    -- straordinario deterministico: max(ore_giorno - 8, 0) per operatore (Lun–Ven)
    COALESCE(
      SUM(
        CASE
          WHEN EXTRACT(ISODOW FROM d.report_date) BETWEEN 1 AND 5 THEN GREATEST(d.hours - 8, 0)
          ELSE 0
        END
      ),
      0
    )::numeric AS overtime_hours
  FROM daily_by_operator d
  GROUP BY d.report_date
  ORDER BY d.report_date
),
headline_today AS (
  SELECT
    CURRENT_DATE::date AS date,
    COALESCE((SELECT hours FROM daily_total WHERE date = CURRENT_DATE::date), 0)::numeric AS hours,
    COALESCE((SELECT overtime_hours FROM daily_total WHERE date = CURRENT_DATE::date), 0)::numeric AS overtime_hours
),
headline_week AS (
  SELECT
    (SELECT date_from FROM range_ctx) AS date_from,
    (SELECT date_to FROM range_ctx) AS date_to,
    COALESCE(SUM(dt.hours), 0)::numeric AS hours,
    COALESCE(SUM(dt.overtime_hours), 0)::numeric AS overtime_hours
  FROM daily_total dt
),
json_out AS (
  SELECT jsonb_build_object(
    'meta', jsonb_build_object(
      'date_from', (SELECT date_from FROM range_ctx),
      'date_to', (SELECT date_to FROM range_ctx),
      'scope', jsonb_build_object('costr', p_costr, 'commessa', p_commessa)
    ),
    'headline', jsonb_build_object(
      'today', (SELECT jsonb_build_object('date', date, 'hours', hours, 'overtime_hours', overtime_hours) FROM headline_today),
      'week', (SELECT jsonb_build_object('date_from', date_from, 'date_to', date_to, 'hours', hours, 'overtime_hours', overtime_hours) FROM headline_week)
    ),
    'series', jsonb_build_object(
      'daily', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'date', dt.date,
              'hours', dt.hours,
              'overtime_hours', dt.overtime_hours
            )
            ORDER BY dt.date
          )
          FROM daily_total dt
        ),
        '[]'::jsonb
      )
    )
  ) AS payload
)
SELECT
  COALESCE((SELECT err FROM guard), (SELECT payload FROM json_out));
$$;

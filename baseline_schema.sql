


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."activity_type" AS ENUM (
    'QUANTITATIVE',
    'FORFAIT',
    'QUALITATIVE'
);


ALTER TYPE "public"."activity_type" OWNER TO "postgres";


CREATE TYPE "public"."activity_unit" AS ENUM (
    'MT',
    'PZ',
    'COEFF',
    'NONE'
);


ALTER TYPE "public"."activity_unit" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'CAPO',
    'UFFICIO',
    'MANAGER',
    'ADMIN',
    'DIREZIONE'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."attachment_kind" AS ENUM (
    'PHOTO',
    'EXCEL'
);


ALTER TYPE "public"."attachment_kind" OWNER TO "postgres";


CREATE TYPE "public"."cavo_step_type" AS ENUM (
    'POSA',
    'RIPRESA'
);


ALTER TYPE "public"."cavo_step_type" OWNER TO "postgres";


CREATE TYPE "public"."core_current_profile_type" AS (
	"user_id" "uuid",
	"app_role" "text",
	"allowed_cantieri" "text"[]
);


ALTER TYPE "public"."core_current_profile_type" OWNER TO "postgres";


CREATE TYPE "public"."crew_role" AS ENUM (
    'ELETTRICISTA',
    'CARPENTERIA',
    'MONTAGGIO'
);


ALTER TYPE "public"."crew_role" OWNER TO "postgres";


CREATE TYPE "public"."doc_categoria" AS ENUM (
    'RAPPORTINO_PDF',
    'RAPPORTINO_ATTACHMENT',
    'INCA_SRC',
    'INCA_ATTACHMENT',
    'CONTRATTO',
    'HR',
    'RECLAMO',
    'AUDIT',
    'ALTRO'
);


ALTER TYPE "public"."doc_categoria" OWNER TO "postgres";


CREATE TYPE "public"."doc_origine" AS ENUM (
    'CAPO',
    'UFFICIO',
    'DIREZIONE',
    'SYSTEM',
    'ADMIN'
);


ALTER TYPE "public"."doc_origine" OWNER TO "postgres";


CREATE TYPE "public"."doc_stato" AS ENUM (
    'BOZZA',
    'VALIDO_INTERNO',
    'CONTRATTUALE',
    'ANNULLATO'
);


ALTER TYPE "public"."doc_stato" OWNER TO "postgres";


CREATE TYPE "public"."inca_change_severity" AS ENUM (
    'INFO',
    'WARN',
    'BLOCK'
);


ALTER TYPE "public"."inca_change_severity" OWNER TO "postgres";


CREATE TYPE "public"."inca_change_type" AS ENUM (
    'NEW_CABLE',
    'SITUAZIONE_CHANGED',
    'METRI_DIS_CHANGED',
    'METRI_TEO_CHANGED',
    'FLAGGED_BY_SOURCE',
    'ELIMINATED',
    'REINSTATED_FROM_ELIMINATED',
    'REWORK_TO_LIBERO',
    'REWORK_TO_BLOCCATO',
    'FORBIDDEN_TRANSITION',
    'DISAPPEARED_ALLOWED',
    'DISAPPEARED_UNEXPECTED',
    'REAPPEARED'
);


ALTER TYPE "public"."inca_change_type" OWNER TO "postgres";


CREATE TYPE "public"."kpi_period" AS ENUM (
    'DAY',
    'WEEK'
);


ALTER TYPE "public"."kpi_period" OWNER TO "postgres";


CREATE TYPE "public"."nav_severity" AS ENUM (
    'CRITICAL',
    'MAJOR',
    'INFO'
);


ALTER TYPE "public"."nav_severity" OWNER TO "postgres";


CREATE TYPE "public"."nav_status" AS ENUM (
    'P',
    'R',
    'T',
    'B',
    'E',
    'NP'
);


ALTER TYPE "public"."nav_status" OWNER TO "postgres";


CREATE TYPE "public"."percorso_lot_status" AS ENUM (
    'PROPOSTO',
    'VALID_CAPO',
    'VALIDO',
    'RIFIUTATO'
);


ALTER TYPE "public"."percorso_lot_status" OWNER TO "postgres";


CREATE TYPE "public"."percorso_sviluppo_by" AS ENUM (
    'CAPO',
    'UFFICIO'
);


ALTER TYPE "public"."percorso_sviluppo_by" OWNER TO "postgres";


CREATE TYPE "public"."plan_period_type" AS ENUM (
    'DAY',
    'WEEK'
);


ALTER TYPE "public"."plan_period_type" OWNER TO "postgres";


CREATE TYPE "public"."plan_status" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'FROZEN'
);


ALTER TYPE "public"."plan_status" OWNER TO "postgres";


CREATE TYPE "public"."rapportino_status" AS ENUM (
    'DRAFT',
    'VALIDATED_CAPO',
    'APPROVED_UFFICIO',
    'RETURNED'
);


ALTER TYPE "public"."rapportino_status" OWNER TO "postgres";


CREATE TYPE "public"."report_status" AS ENUM (
    'DRAFT',
    'VALIDATED_CAPO',
    'APPROVED_UFFICIO',
    'RETURNED'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'CAPO',
    'UFFICIO',
    'DIREZIONE'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_manager_for_capo"("p_capo_id" "uuid", "p_manager_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  is_admin boolean;
  capo_ok boolean;
  manager_ok boolean;
begin
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'ADMIN'
  ) into is_admin;

  if not is_admin then
    return json_build_object('ok', false, 'error', 'not_admin');
  end if;

  -- Validate CAPO
  select exists (
    select 1
    from public.profiles p
    where p.id = p_capo_id
      and p.app_role = 'CAPO'
  ) into capo_ok;

  if not capo_ok then
    return json_build_object('ok', false, 'error', 'capo_not_found_or_not_capo');
  end if;

  -- Unassign
  if p_manager_id is null then
    delete from public.manager_capo_assignments a
    where a.capo_id = p_capo_id;

    return json_build_object('ok', true, 'mode', 'UNASSIGN', 'capo_id', p_capo_id);
  end if;

  -- Validate MANAGER
  select exists (
    select 1
    from public.profiles p
    where p.id = p_manager_id
      and p.app_role = 'MANAGER'
  ) into manager_ok;

  if not manager_ok then
    return json_build_object('ok', false, 'error', 'manager_not_found_or_not_manager');
  end if;

  -- Upsert (1:1 via PK capo_id)
  insert into public.manager_capo_assignments (capo_id, manager_id, active, created_by)
  values (p_capo_id, p_manager_id, true, auth.uid())
  on conflict (capo_id)
  do update set
    manager_id = excluded.manager_id,
    active = true,
    created_by = excluded.created_by;

  return json_build_object(
    'ok', true,
    'mode', 'UPSERT',
    'capo_id', p_capo_id,
    'manager_id', p_manager_id
  );
end;
$$;


ALTER FUNCTION "public"."admin_set_manager_for_capo"("p_capo_id" "uuid", "p_manager_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_operator_identity"("p_operator_id" "uuid", "p_cognome" "text", "p_nome" "text", "p_birth_date" "date", "p_operator_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_cognome text;
  v_nome text;
  v_code text;
begin
  -- Auth
  if not public.core_is_admin() then
    raise exception using errcode = '42501', message = 'Not authorized (ADMIN only)';
  end if;

  if p_operator_id is null then
    raise exception using errcode = '22004', message = 'p_operator_id is required';
  end if;

  v_cognome := nullif(trim(both from coalesce(p_cognome, '')), '');
  v_nome := nullif(trim(both from coalesce(p_nome, '')), '');
  v_code := nullif(trim(both from coalesce(p_operator_code, '')), '');

  -- Respect du trigger trg_operators_require_identity() : cognome/nome/birth_date obligatoires
  if v_cognome is null then
    raise exception using errcode = 'P0001', message = 'operators.cognome is required';
  end if;
  if v_nome is null then
    raise exception using errcode = 'P0001', message = 'operators.nome is required';
  end if;
  if p_birth_date is null then
    raise exception using errcode = 'P0001', message = 'operators.birth_date is required';
  end if;

  update public.operators o
  set
    cognome = v_cognome,
    nome = v_nome,
    birth_date = p_birth_date,
    operator_code = v_code,
    updated_at = now()
  where o.id = p_operator_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'operator_not_found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;


ALTER FUNCTION "public"."admin_set_operator_identity"("p_operator_id" "uuid", "p_cognome" "text", "p_nome" "text", "p_birth_date" "date", "p_operator_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_can_write_assigned_ship"("p_plan_date" "date", "p_ship_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    (public.core_current_profile()).app_role = 'CAPO'::text
    and exists (
      select 1
      from public.capo_ship_assignments a
      where a.capo_id = auth.uid()
        and a.plan_date = p_plan_date
        and a.ship_id = p_ship_id
    );
$$;


ALTER FUNCTION "public"."capo_can_write_assigned_ship"("p_plan_date" "date", "p_ship_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_can_write_ship_attendance"("p_plan_date" "date", "p_ship_id" "uuid", "p_capo_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    (public.core_current_profile()).app_role = 'CAPO'::text
    and p_capo_id = auth.uid()
    and exists (
      select 1
      from public.capo_ship_assignments a
      where a.capo_id = auth.uid()
        and a.plan_date = p_plan_date
        and a.ship_id = p_ship_id
    );
$$;


ALTER FUNCTION "public"."capo_can_write_ship_attendance"("p_plan_date" "date", "p_ship_id" "uuid", "p_capo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_get_team_day_v1"("p_ship_id" "uuid", "p_plan_date" "date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
with day_row as (
  select d.*
  from public.capo_team_days d
  where d.capo_id = auth.uid()
    and d.ship_id = p_ship_id
    and d.plan_date = p_plan_date
  limit 1
),
teams as (
  select
    t.*,
    (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'operator_id', m.operator_id,
          'planned_minutes', m.planned_minutes,
          'position', m.position,
          'role_tag', m.role_tag
        )
        order by m.position
      ), '[]'::jsonb)
      from public.capo_team_members m
      where m.team_id = t.id
    ) as members
  from public.capo_teams t
  join day_row d on d.id = t.team_day_id
  order by t.position
)
select jsonb_build_object(
  'day', (select to_jsonb(d) from day_row d),
  'teams', coalesce((select jsonb_agg(to_jsonb(teams)) from teams), '[]'::jsonb)
);
$$;


ALTER FUNCTION "public"."capo_get_team_day_v1"("p_ship_id" "uuid", "p_plan_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_kpi_worktime_v1"("p_costr" "text", "p_commessa" "text" DEFAULT NULL::"text", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
with
capo_ctx as (
  select auth.uid()::uuid as capo_id
),
guard as (
  select
    case
      when (select capo_id from capo_ctx) is null then
        jsonb_build_object(
          'error','AUTH_REQUIRED',
          'message','auth.uid() is NULL. Call as authenticated user.',
          'meta', jsonb_build_object('costr', p_costr, 'commessa', p_commessa)
        )
      else null
    end as err
),
norm as (
  select
    nullif(lower(btrim(p_costr)), '') as costr_norm,
    nullif(lower(btrim(p_commessa)), '') as commessa_norm
),
week_bounds as (
  select
    (date_trunc('week', current_date)::date) as week_mon,
    (date_trunc('week', current_date)::date + 4) as week_fri,
    current_date as today
),
range_ctx as (
  select
    coalesce(p_date_from, (select week_mon from week_bounds))::date as date_from,
    coalesce(p_date_to, least((select week_fri from week_bounds), (select today from week_bounds)))::date as date_to
),
base as (
  select
    coalesce(r.report_date, r.data)::date as report_date,
    rro.operator_id,
    coalesce(rro.tempo_hours, 0)::numeric as tempo_hours
  from public.rapportini r
  join capo_ctx c on true
  join norm n on true
  join range_ctx rg on true
  join public.rapportino_rows rr on rr.rapportino_id = r.id
  join public.rapportino_row_operators rro on rro.rapportino_row_id = rr.id
  where r.capo_id = c.capo_id
    and (n.costr_norm is null or lower(btrim(r.costr::text)) = n.costr_norm)
    and (n.commessa_norm is null or lower(btrim(r.commessa::text)) = n.commessa_norm)
    and (r.superseded_by_rapportino_id is null)
    and coalesce(r.report_date, r.data)::date between rg.date_from and rg.date_to
    and r.status in ('VALIDATED_CAPO','APPROVED_UFFICIO')
),
daily_by_operator as (
  select
    b.report_date,
    b.operator_id,
    coalesce(sum(b.tempo_hours), 0)::numeric as hours
  from base b
  group by b.report_date, b.operator_id
),
daily_total as (
  select
    d.report_date as date,
    coalesce(sum(d.hours), 0)::numeric as hours,
    coalesce(
      sum(
        case
          when extract(isodow from d.report_date) between 1 and 5 then greatest(d.hours - 8, 0)
          else 0
        end
      ),
      0
    )::numeric as overtime_hours
  from daily_by_operator d
  group by d.report_date
  order by d.report_date
),
headline_today as (
  select
    current_date::date as date,
    coalesce((select hours from daily_total where date = current_date::date), 0)::numeric as hours,
    coalesce((select overtime_hours from daily_total where date = current_date::date), 0)::numeric as overtime_hours
),
headline_week as (
  select
    (select date_from from range_ctx) as date_from,
    (select date_to from range_ctx) as date_to,
    coalesce(sum(dt.hours), 0)::numeric as hours,
    coalesce(sum(dt.overtime_hours), 0)::numeric as overtime_hours
  from daily_total dt
),
json_out as (
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'date_from', (select date_from from range_ctx),
      'date_to', (select date_to from range_ctx),
      'scope', jsonb_build_object('costr', p_costr, 'commessa', p_commessa)
    ),
    'headline', jsonb_build_object(
      'today', (select jsonb_build_object('date', date, 'hours', hours, 'overtime_hours', overtime_hours) from headline_today),
      'week', (select jsonb_build_object('date_from', date_from, 'date_to', date_to, 'hours', hours, 'overtime_hours', overtime_hours) from headline_week)
    ),
    'series', jsonb_build_object(
      'daily', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'date', dt.date,
              'hours', dt.hours,
              'overtime_hours', dt.overtime_hours
            )
            order by dt.date
          )
          from daily_total dt
        ),
        '[]'::jsonb
      )
    )
  ) as payload
)
select coalesce((select err from guard), (select payload from json_out));
$$;


ALTER FUNCTION "public"."capo_kpi_worktime_v1"("p_costr" "text", "p_commessa" "text", "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_mega_kpi_stesura_v1"("p_costr" "text", "p_commessa" "text" DEFAULT NULL::"text", "p_inca_file_id" "uuid" DEFAULT NULL::"uuid", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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
SELECT
  COALESCE(
    (SELECT err FROM guard),
    jsonb_build_object(
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
    )
  );
$$;


ALTER FUNCTION "public"."capo_mega_kpi_stesura_v1"("p_costr" "text", "p_commessa" "text", "p_inca_file_id" "uuid", "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_my_ships_v1"() RETURNS TABLE("id" "uuid", "code" "text", "name" "text", "yard" "text", "is_active" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    s.id,
    s.code,
    s.name,
    s.yard,
    s.is_active
  from public.manager_capo_assignments mca
  join public.ship_managers sm
    on sm.manager_id = mca.manager_id
  join public.ships s
    on s.id = sm.ship_id
  where mca.active is true
    and mca.capo_id = auth.uid()
    and s.is_active is true
  order by s.code asc;
$$;


ALTER FUNCTION "public"."capo_my_ships_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_my_team_for_date_v1"("p_plan_date" "date") RETURNS TABLE("operator_id" "uuid", "capo_id" "uuid", "plan_id" "uuid", "operator_name" "text", "operator_position" integer, "slot_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    m.operator_id,
    s.capo_id,
    p.id as plan_id,
    o.name as operator_name,
    m.position as operator_position,
    s.id as slot_id
  from public.manager_plans p
  join public.plan_capo_slots s
    on s.plan_id = p.id
  join public.plan_slot_members m
    on m.slot_id = s.id
  join public.operators o
    on o.id = m.operator_id
  where p.period_type = 'DAY'::public.plan_period_type
    and p.plan_date = p_plan_date
    and p.status = any (array['PUBLISHED'::public.plan_status, 'FROZEN'::public.plan_status])
    and s.capo_id = auth.uid();
$$;


ALTER FUNCTION "public"."capo_my_team_for_date_v1"("p_plan_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."capo_my_team_for_date_v1"("p_plan_date" "date") IS 'CAPO: operators assigned by Manager for a specific DAY plan date (PUBLISHED/FROZEN). Avoids CURRENT_DATE timezone ambiguity.';



CREATE OR REPLACE FUNCTION "public"."capo_owns_rapportino_row"("p_row_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.rapportino_rows rr
    join public.rapportini r on r.id = rr.rapportino_id
    where rr.id = p_row_id and r.capo_id = auth.uid()
  )
$$;


ALTER FUNCTION "public"."capo_owns_rapportino_row"("p_row_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_returned_summary"("p_role" "text") RETURNS TABLE("returned_count" bigint, "last_id" "uuid", "last_report_date" "date", "last_costr" "text", "last_commessa" "text", "last_updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
with base as (
  select id, report_date, costr, commessa, updated_at
  from rapportini
  where capo_id = auth.uid()
    and crew_role = p_role
    and status = 'RETURNED'
),
last_one as (
  select id, report_date, costr, commessa, updated_at
  from base
  order by updated_at desc
  limit 1
)
select
  (select count(*) from base) as returned_count,
  l.id as last_id,
  l.report_date as last_report_date,
  l.costr as last_costr,
  l.commessa as last_commessa,
  l.updated_at as last_updated_at
from last_one l

union all

select
  (select count(*) from base) as returned_count,
  null::uuid,
  null::date,
  null::text,
  null::text,
  null::timestamptz
where not exists (select 1 from last_one);
$$;


ALTER FUNCTION "public"."capo_returned_summary"("p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_returned_summary_debug"("p_capo_id" "uuid", "p_role" "text") RETURNS TABLE("returned_count" bigint, "last_id" "uuid", "last_report_date" "date", "last_costr" "text", "last_commessa" "text", "last_updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
with base as (
  select id, report_date, costr, commessa, updated_at
  from rapportini
  where capo_id = p_capo_id
    and crew_role = p_role
    and status = 'RETURNED'
),
last_one as (
  select id, report_date, costr, commessa, updated_at
  from base
  order by updated_at desc
  limit 1
)
select
  (select count(*) from base) as returned_count,
  l.id as last_id,
  l.report_date as last_report_date,
  l.costr as last_costr,
  l.commessa as last_commessa,
  l.updated_at as last_updated_at
from last_one l

union all

select
  (select count(*) from base) as returned_count,
  null::uuid,
  null::date,
  null::text,
  null::text,
  null::timestamptz
where not exists (select 1 from last_one);
$$;


ALTER FUNCTION "public"."capo_returned_summary_debug"("p_capo_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capo_team_days_fill_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Priorité: capo_id déjà fourni
  if new.capo_id is not null then
    return new;
  end if;

  -- Si created_by est fourni, on l'utilise
  if new.created_by is not null then
    new.capo_id := new.created_by;
    return new;
  end if;

  -- Sinon, tenter auth.uid() (si dispo)
  new.capo_id := auth.uid();
  return new;
end;
$$;


ALTER FUNCTION "public"."capo_team_days_fill_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_inca_tables"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from public.inca_percorsi;
  delete from public.inca_cavi;
end $$;


ALTER FUNCTION "public"."clear_inca_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    nullif((select p.app_role::text from public.profiles p where p.id = auth.uid()), ''),
    nullif((select p.role::text     from public.profiles p where p.id = auth.uid()), ''),
    'CAPO'
  );
$$;


ALTER FUNCTION "public"."core_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_app_role_upper"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select upper(public.core_app_role());
$$;


ALTER FUNCTION "public"."core_app_role_upper"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_apply_rapportino_inca_progress"("p_rapportino_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  /*
    Business rules:
    - If rapportino_inca_cavi.progress_percent is not null:
        -> write into inca_cavi.progress_percent (int)
        -> write inca_cavi.progress_side (DA/A), default DA if missing
        -> if progress_percent >= 50 then set inca_cavi.situazione = 'P'
    - RIPRESA forces 100 + P.
    - Idempotent.
  */

  -- POSA: apply 50/70/100
  update public.inca_cavi ic
  set
    progress_percent = ric.progress_percent::int,
    progress_side    = coalesce(nullif(trim(ric.progress_side), ''), ic.progress_side, 'DA'),
    situazione       = case
                        when ric.progress_percent is not null and ric.progress_percent >= 50 then 'P'
                        else ic.situazione
                      end,
    updated_at       = now()
  from public.rapportino_inca_cavi ric
  where ric.rapportino_id = p_rapportino_id
    and ric.inca_cavo_id = ic.id
    and ric.step_type = 'POSA'::public.cavo_step_type
    and ric.progress_percent is not null;

  -- RIPRESA: force 100 + P (defensive; DB already constrains to 100)
  update public.inca_cavi ic
  set
    progress_percent = 100,
    progress_side    = coalesce(nullif(trim(ric.progress_side), ''), ic.progress_side, 'DA'),
    situazione       = 'P',
    updated_at       = now()
  from public.rapportino_inca_cavi ric
  where ric.rapportino_id = p_rapportino_id
    and ric.inca_cavo_id = ic.id
    and ric.step_type = 'RIPRESA'::public.cavo_step_type;

end;
$$;


ALTER FUNCTION "public"."core_apply_rapportino_inca_progress"("p_rapportino_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_current_profile"() RETURNS "public"."core_current_profile_type"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select coalesce(
    (
      select (p.id, p.app_role, p.allowed_cantieri)::public.core_current_profile_type
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    (
      select (auth.uid(), null::text, array[]::text[])::public.core_current_profile_type
    )
  );
$$;


ALTER FUNCTION "public"."core_current_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_db_version"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select db_version
  from public.core_meta
  where key = 'CORE_DB';
$$;


ALTER FUNCTION "public"."core_db_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_drive_append_event"("p_file_id" "uuid", "p_event_type" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_note" "text" DEFAULT NULL::"text", "p_prev_event_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
begin
  insert into public.core_drive_events(file_id, event_type, payload, note, prev_event_id)
  values (p_file_id, p_event_type, coalesce(p_payload, '{}'::jsonb), p_note, p_prev_event_id)
  returning id into v_event_id;

  return v_event_id;
end;
$$;


ALTER FUNCTION "public"."core_drive_append_event"("p_file_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_note" "text", "p_prev_event_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."core_drive_append_event"("p_file_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_note" "text", "p_prev_event_id" "uuid") IS 'CORE Drive — append-only: ajoute un event dans core_drive_events et retourne son id.';



CREATE OR REPLACE FUNCTION "public"."core_drive_assert_role"("allowed" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r text;
begin
  r := public.core_drive_current_role();
  if r is null then
    raise exception 'Not authenticated';
  end if;

  if not (r = any(allowed)) then
    raise exception 'Forbidden (role=%)', r;
  end if;
end;
$$;


ALTER FUNCTION "public"."core_drive_assert_role"("allowed" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."core_drive_assert_role"("allowed" "text"[]) IS 'CORE Drive — bloque si le rôle courant n''est pas dans la liste.';



CREATE OR REPLACE FUNCTION "public"."core_drive_current_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(p.app_role, (p.role)::text)
  from public.profiles p
  where p.id = auth.uid();
$$;


ALTER FUNCTION "public"."core_drive_current_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."core_drive_current_role"() IS 'CORE Drive — rôle courant (TEXT) via coalesce(profiles.app_role, profiles.role::text).';



CREATE OR REPLACE FUNCTION "public"."core_drive_emit_upload_event"("p_file_id" "uuid", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.core_drive_assert_role(array['CAPO','UFFICIO','MANAGER','DIREZIONE','ADMIN']);

  -- Respect naval-grade: si déjà gelé => aucune mutation de registre (sauf lecture)
  if exists (
    select 1 from public.core_files f
    where f.id = p_file_id and f.frozen_at is not null
  ) then
    raise exception 'File is frozen';
  end if;

  return public.core_drive_append_event(p_file_id, 'UPLOAD', coalesce(p_payload, '{}'::jsonb), null, null);
end;
$$;


ALTER FUNCTION "public"."core_drive_emit_upload_event"("p_file_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."core_drive_emit_upload_event"("p_file_id" "uuid", "p_payload" "jsonb") IS 'CORE Drive — enregistre un event UPLOAD (appelé par le front après création core_files).';



CREATE OR REPLACE FUNCTION "public"."core_drive_events_block_mutations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception 'core_drive_events is append-only: update/delete forbidden';
end;
$$;


ALTER FUNCTION "public"."core_drive_events_block_mutations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_drive_freeze_file"("p_file_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_now timestamptz := now();
  v_event_id uuid;
begin
  perform public.core_drive_assert_role(array['DIREZIONE','ADMIN']);

  -- On set frozen_at uniquement si null. Ensuite, ton trigger trg_prevent_frozen_update bloque toute mutation.
  update public.core_files
  set frozen_at = coalesce(frozen_at, v_now)
  where id = p_file_id;

  if not found then
    raise exception 'File not found';
  end if;

  v_event_id := public.core_drive_append_event(
    p_file_id,
    'FREEZE',
    jsonb_build_object('reason', p_reason, 'at', v_now),
    null,
    null
  );

  return v_event_id;
end;
$$;


ALTER FUNCTION "public"."core_drive_freeze_file"("p_file_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."core_drive_freeze_file"("p_file_id" "uuid", "p_reason" "text") IS 'CORE Drive — freeze inviolable: set core_files.frozen_at + event FREEZE.';



CREATE OR REPLACE FUNCTION "public"."core_drive_soft_delete_file"("p_file_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_now timestamptz := now();
  v_event_id uuid;
begin
  perform public.core_drive_assert_role(array['UFFICIO','DIREZIONE','ADMIN']);

  -- Freeze inviolable: si frozen_at déjà set => aucune mutation
  if exists (
    select 1 from public.core_files f
    where f.id = p_file_id and f.frozen_at is not null
  ) then
    raise exception 'File is frozen';
  end if;

  update public.core_files
  set deleted_at = coalesce(deleted_at, v_now)
  where id = p_file_id;

  if not found then
    raise exception 'File not found';
  end if;

  v_event_id := public.core_drive_append_event(
    p_file_id,
    'SOFT_DELETE',
    jsonb_build_object('reason', p_reason, 'at', v_now),
    null,
    null
  );

  return v_event_id;
end;
$$;


ALTER FUNCTION "public"."core_drive_soft_delete_file"("p_file_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."core_drive_soft_delete_file"("p_file_id" "uuid", "p_reason" "text") IS 'CORE Drive — soft delete: set core_files.deleted_at (jamais Storage remove) + event SOFT_DELETE.';



CREATE OR REPLACE FUNCTION "public"."core_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'ADMIN'
  );
$$;


ALTER FUNCTION "public"."core_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_parse_tempo_hours"("p_raw" "text") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
declare
  s text;
  n numeric;
begin
  if p_raw is null then
    return null;
  end if;

  s := btrim(p_raw);

  if s = '' then
    return null;
  end if;

  -- refuse explicit
  if s = '.' then
    return null;
  end if;

  -- normalise virgule -> point
  s := replace(s, ',', '.');

  -- must be numeric-only (simple)
  -- allow digits, optional single dot, optional leading +? (no)
  if s !~ '^[0-9]+(\.[0-9]+)?$' then
    return null;
  end if;

  n := s::numeric;

  if n < 0 then
    return null;
  end if;

  return n;
exception when others then
  return null;
end;
$_$;


ALTER FUNCTION "public"."core_parse_tempo_hours"("p_raw" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_profiles_public_by_ids"("p_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "display_name" "text", "full_name" "text", "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Must be logged in
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Role gate (reuse your canonical profile function)
  IF (core_current_profile()).app_role NOT IN ('UFFICIO','MANAGER','DIREZIONE','ADMIN') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Defensive: empty input => empty result
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.full_name,
    p.email
  FROM public.profiles p
  WHERE p.id = ANY(p_ids);

END;
$$;


ALTER FUNCTION "public"."core_profiles_public_by_ids"("p_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."core_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_status_text"("v" "anyelement") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select trim(both from (v::text));
$$;


ALTER FUNCTION "public"."core_status_text"("v" "anyelement") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."core_status_text"("v" "anyelement") IS 'Return text representation of a status value (works for TEXT or ENUM), trimmed.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "app_role" "text" DEFAULT 'CAPO'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "role" "public"."app_role" DEFAULT 'CAPO'::"public"."app_role" NOT NULL,
    "display_name" "text",
    "default_costr" "text",
    "default_commessa" "text",
    "allowed_cantieri" "text"[] DEFAULT ARRAY[]::"text"[],
    "must_change_password" boolean DEFAULT false NOT NULL,
    "capo_ui_mode" "text" DEFAULT 'simple'::"text" NOT NULL,
    CONSTRAINT "profiles_app_role_check" CHECK (("app_role" = ANY (ARRAY['CAPO'::"text", 'UFFICIO'::"text", 'MANAGER'::"text", 'DIREZIONE'::"text", 'ADMIN'::"text"]))),
    CONSTRAINT "profiles_capo_ui_mode_check" CHECK (("capo_ui_mode" = ANY (ARRAY['simple'::"text", 'rich'::"text"]))),
    CONSTRAINT "profiles_role_app_role_sync_check" CHECK (("app_role" = ("role")::"text"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_profile"() RETURNS "public"."profiles"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.*
  from public.profiles p
  where p.id = auth.uid();
$$;


ALTER FUNCTION "public"."current_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_whoami"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select jsonb_build_object(
    'uid', auth.uid(),
    'jwt_sub', current_setting('request.jwt.claim.sub', true),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  );
$$;


ALTER FUNCTION "public"."debug_whoami"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_capo_mega_kpi_kind"("p_descr" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
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


ALTER FUNCTION "public"."fn_capo_mega_kpi_kind"("p_descr" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_consolidate_inca_on_rapportino_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- uniquement sur changement effectif vers APPROVED_UFFICIO
  if (tg_op = 'UPDATE')
     and (new.status = 'APPROVED_UFFICIO')
     and (coalesce(old.status, '') is distinct from 'APPROVED_UFFICIO') then

    -- RIPRESA -> 100% + P
    update public.inca_cavi ic
    set
      progress_percent = 100,
      situazione = 'P',
      updated_at = now()
    from public.rapportino_inca_cavi ric
    where ric.rapportino_id = new.id
      and ric.inca_cavo_id = ic.id
      and ric.step_type = 'RIPRESA';

    -- POSA -> si progress_percent présent (>=50), copier + P
    update public.inca_cavi ic
    set
      progress_percent = ric.progress_percent::int,
      situazione = 'P',
      updated_at = now()
    from public.rapportino_inca_cavi ric
    where ric.rapportino_id = new.id
      and ric.inca_cavo_id = ic.id
      and ric.step_type = 'POSA'
      and ric.progress_percent is not null
      and ric.progress_percent::numeric >= 50;

    -- POSA sans progress_percent -> P (si tu veux éviter ça, commente ce bloc)
    update public.inca_cavi ic
    set
      situazione = 'P',
      updated_at = now()
    from public.rapportino_inca_cavi ric
    where ric.rapportino_id = new.id
      and ric.inca_cavo_id = ic.id
      and ric.step_type = 'POSA'
      and ric.progress_percent is null;

  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_consolidate_inca_on_rapportino_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_fill_plan_id_on_slot_member"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_plan uuid;
begin
  select s.plan_id into v_plan
  from public.plan_capo_slots s
  where s.id = new.slot_id;

  new.plan_id = v_plan;
  return new;
end;
$$;


ALTER FUNCTION "public"."fn_fill_plan_id_on_slot_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_hydrate_rapportino_inca_cavi_caches"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_codice text;
  v_costr text;
  v_commessa text;
  v_report_date date;
begin
  -- codice depuis inca_cavi
  if new.inca_cavo_id is not null then
    select c.codice
      into v_codice
    from public.inca_cavi c
    where c.id = new.inca_cavo_id;

    new.codice_cache := v_codice;
  end if;

  -- costr/commessa/report_date depuis rapportini
  if new.rapportino_id is not null then
    select r.costr, r.commessa, coalesce(r.report_date, r.data)
      into v_costr, v_commessa, v_report_date
    from public.rapportini r
    where r.id = new.rapportino_id;

    new.costr_cache := v_costr;
    new.commessa_cache := v_commessa;
    new.report_date_cache := v_report_date;
  end if;

  return new;
end $$;


ALTER FUNCTION "public"."fn_hydrate_rapportino_inca_cavi_caches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_hydrate_rapportino_rows_previsto"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_commessa text;
  v_ship_id uuid;

  v_desc text;
  v_desc_u text;

  v_activity_id uuid;
  v_categoria text;

  v_previsto numeric;
begin
  -- Parent rapportino context (commessa)
  select r.commessa
    into v_commessa
  from public.rapportini r
  where r.id = new.rapportino_id;

  -- Resolve ship_id without assuming column names
  v_ship_id := public.fn_resolve_ship_id_from_commessa(v_commessa);

  -- Hydrate activity_id if missing (descrizione OR synonyms)
  if new.activity_id is null then
    v_desc := nullif(btrim(coalesce(new.descrizione, '')), '');
    if v_desc is not null then
      v_desc_u := upper(v_desc);

      select ca.id, ca.categoria
        into v_activity_id, v_categoria
      from public.catalogo_attivita ca
      where ca.is_active is true
        and (
          upper(ca.descrizione) = v_desc_u
          or exists (
            select 1
            from unnest(coalesce(ca.synonyms, array[]::text[])) syn
            where upper(btrim(syn)) = v_desc_u
          )
        )
      order by ca.created_at asc
      limit 1;

      if v_activity_id is not null then
        new.activity_id := v_activity_id;

        if nullif(btrim(coalesce(new.categoria, '')), '') is null
           and v_categoria is not null then
          new.categoria := v_categoria;
        end if;
      end if;
    end if;
  end if;

  -- Hydrate previsto if missing
  if new.previsto is null and new.activity_id is not null then
    v_previsto := null;

    -- 1) Ship+Commessa override
    if v_ship_id is not null
       and v_commessa is not null
       and btrim(v_commessa) <> '' then
      select c.previsto_value
        into v_previsto
      from public.catalogo_ship_commessa_attivita c
      where c.is_active is true
        and c.ship_id = v_ship_id
        and c.commessa = v_commessa
        and c.activity_id = new.activity_id
      limit 1;
    end if;

    -- 2) Fallback global
    if v_previsto is null then
      select ca.previsto_value
        into v_previsto
      from public.catalogo_attivita ca
      where ca.is_active is true
        and ca.id = new.activity_id
      limit 1;
    end if;

    if v_previsto is not null then
      new.previsto := v_previsto;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_hydrate_rapportino_rows_previsto"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_normalize_commessa_upper"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.commessa is not null then
    new.commessa := upper(trim(new.commessa));
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."fn_normalize_commessa_upper"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_operator_auto_normalize"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.cognome is not null
     and new.nome is not null
     and new.birth_date is not null then
    new.is_normalized := true;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_operator_auto_normalize"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_operator_identity_required"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT'
     and new.is_normalized = true
     and (new.cognome is null or new.nome is null or new.birth_date is null) then
    raise exception
      'Operator normalized must have cognome, nome and birth_date';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."fn_operator_identity_required"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_operator_key"("cognome" "text", "birth_date" "date") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select
    case
      when cognome is null or length(trim(cognome)) = 0 or birth_date is null then null
      else lower(trim(cognome)) || '_' || to_char(birth_date, 'YYYYMMDD')
    end
$$;


ALTER FUNCTION "public"."fn_operator_key"("cognome" "text", "birth_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_rapportino_apply_product"("p_rapportino_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count integer := 0;
begin
  -- 2A) Normaliser progress_side si progress_percent existe mais side est NULL
  update public.inca_cavi ic
     set progress_side = 'DA'
   where ic.id in (
          select ric.inca_cavo_id
            from public.rapportino_inca_cavi ric
           where ric.rapportino_id = p_rapportino_id
        )
     and ic.progress_percent is not null
     and ic.progress_side is null;

  get diagnostics v_count = row_count;

  -- 2B) Garantir la règle "P dès 50%" côté DB (même si le front oublie)
  update public.inca_cavi ic
     set situazione = 'P'
   where ic.id in (
          select ric.inca_cavo_id
            from public.rapportino_inca_cavi ric
           where ric.rapportino_id = p_rapportino_id
        )
     and ic.progress_percent is not null
     and ic.progress_percent >= 50
     and (ic.situazione is distinct from 'P');

  -- Optionnel: tu peux logger plus tard dans une table d’audit si besoin.
end;
$$;


ALTER FUNCTION "public"."fn_rapportino_apply_product"("p_rapportino_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_rapportino_apply_product"("p_rapportino_id" "uuid") IS 'Consolidate minimal INCA "product" (situazione=P if progress>=50, default DA side) for cables linked to a rapportino.';



CREATE OR REPLACE FUNCTION "public"."fn_resolve_ship_id_from_commessa"("p_commessa" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_commessa text := nullif(btrim(coalesce(p_commessa, '')), '');
  v_ship_id uuid;
  v_col record;
  v_sql text;
begin
  if v_commessa is null then
    return null;
  end if;

  -- First: if there is a direct column match somewhere (scan text-ish columns)
  for v_col in
    select c.column_name, c.data_type, c.udt_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'ships'
      and (
        c.data_type in ('text', 'character varying', 'character')
        or c.udt_name in ('text', 'varchar', 'bpchar')
      )
      and c.column_name not in ('id') -- avoid useless checks
    order by c.ordinal_position
  loop
    v_sql := format(
      'select s.id from public.ships s where upper(btrim(s.%I::text)) = upper($1) limit 1',
      v_col.column_name
    );

    execute v_sql into v_ship_id using v_commessa;

    if v_ship_id is not null then
      return v_ship_id;
    end if;
  end loop;

  return null;
end;
$_$;


ALTER FUNCTION "public"."fn_resolve_ship_id_from_commessa"("p_commessa" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_profiles_capo_ui_mode_v1"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- Only guard the sensitive column
  if new.capo_ui_mode is distinct from old.capo_ui_mode then
    if auth.uid() is null then
      raise exception 'not authenticated';
    end if;

    if public.is_admin(auth.uid()) then
      return new;
    end if;

    if exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and actor.app_role in ('MANAGER', 'ADMIN')
    )
    and exists (
      select 1
      from public.manager_capo_assignments mca
      where mca.manager_id = auth.uid()
        and mca.capo_id = new.id
        and mca.active = true
    ) then
      return new;
    end if;

    raise exception 'forbidden: capo_ui_mode can only be changed by manager/admin';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_profiles_capo_ui_mode_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, display_name, app_role, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'CAPO',
    'CAPO'::public.app_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inca_increment_eliminated"("p_inca_file_id" "uuid", "p_codes" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.inca_cavi
  set eliminated_count = eliminated_count + 1,
      last_eliminated_at = now()
  where inca_file_id = p_inca_file_id
    and codice = any(p_codes);
end $$;


ALTER FUNCTION "public"."inca_increment_eliminated"("p_inca_file_id" "uuid", "p_codes" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inca_increment_reinstated"("p_inca_file_id" "uuid", "p_codes" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.inca_cavi
  set reinstated_count = reinstated_count + 1,
      last_reinstated_at = now()
  where inca_file_id = p_inca_file_id
    and codice = any(p_codes);
end $$;


ALTER FUNCTION "public"."inca_increment_reinstated"("p_inca_file_id" "uuid", "p_codes" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inca_increment_rework"("p_inca_file_id" "uuid", "p_codes" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.inca_cavi
  set rework_count = rework_count + 1,
      last_rework_at = now()
  where inca_file_id = p_inca_file_id
    and codice = any(p_codes);
end $$;


ALTER FUNCTION "public"."inca_increment_rework"("p_inca_file_id" "uuid", "p_codes" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inca_search_cavi_by_nodes"("p_inca_file_id" "uuid", "p_nodes" "text"[]) RETURNS TABLE("id" "uuid")
    LANGUAGE "sql" STABLE
    AS $$
  select c.id
  from public.inca_cavi c
  where c.inca_file_id = p_inca_file_id
    and (
      p_nodes is null
      or cardinality(p_nodes) = 0
      or not exists (
        select 1
        from unnest(p_nodes) as n(node)
        where not exists (
          select 1
          from public.inca_percorsi p
          where p.inca_cavo_id = c.id
            and upper(btrim(p.nodo)) = upper(btrim(n.node))
        )
      )
    );
$$;


ALTER FUNCTION "public"."inca_search_cavi_by_nodes"("p_inca_file_id" "uuid", "p_nodes" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'ADMIN'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("p_uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = p_uid
      and app_role = 'ADMIN'
  );
$$;


ALTER FUNCTION "public"."is_admin"("p_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_rapportino_approved"("p_rapportino_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.rapportini r
    where r.id = p_rapportino_id
      and r.status = 'APPROVED_UFFICIO'
  );
$$;


ALTER FUNCTION "public"."is_rapportino_approved"("p_rapportino_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_role"("role_text" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and upper(pr.app_role::text) = upper(role_text)
  );
$$;


ALTER FUNCTION "public"."is_role"("role_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_ufficio"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.app_role = 'UFFICIO'::text
  )
$$;


ALTER FUNCTION "public"."is_ufficio"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_core_file_action"("p_core_file_id" "uuid", "p_action" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.core_file_audit (
    core_file_id,
    action,
    performed_by,
    performed_role,
    ip_address,
    user_agent,
    note
  )
  select
    p_core_file_id,
    p_action,
    auth.uid(),
    p.app_role,
    inet_client_addr()::text,
    current_setting('request.headers', true),
    p_note
  from public.profiles p
  where p.id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."log_core_file_action"("p_core_file_id" "uuid", "p_action" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manager_apply_week_to_days_v1"("p_week_plan_id" "uuid", "p_overwrite" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  w public.manager_plans%rowtype;
  monday date;
  d date;
  day_plan_id uuid;
  i integer;
  wslot record;
  day_slot_id uuid;
  copied_slots integer := 0;
  skipped_slots integer := 0;
  day_plans_created integer := 0;
  day_plans_reused integer := 0;
begin
  select * into w
  from public.manager_plans
  where id = p_week_plan_id;

  if not found then
    raise exception 'manager_apply_week_to_days_v1: week plan not found (%).', p_week_plan_id;
  end if;

  if w.period_type <> 'WEEK'::public.plan_period_type then
    raise exception 'manager_apply_week_to_days_v1: plan % is not WEEK.', p_week_plan_id;
  end if;

  if w.manager_id <> auth.uid() then
    raise exception 'manager_apply_week_to_days_v1: not allowed.';
  end if;

  if w.year_iso is null or w.week_iso is null then
    raise exception 'manager_apply_week_to_days_v1: week plan missing year_iso/week_iso.';
  end if;

  -- ISO Monday for (IYYY, IW)
  monday := to_date(lpad(w.year_iso::text, 4, '0') || lpad(w.week_iso::text, 2, '0') || '1', 'IYYYIWID');

  for i in 0..4 loop
    d := monday + i;

    -- Create or reuse DAY plan
    insert into public.manager_plans (
      manager_id,
      period_type,
      plan_date,
      status,
      note,
      created_by
    ) values (
      w.manager_id,
      'DAY'::public.plan_period_type,
      d,
      w.status,
      w.note,
      auth.uid()
    )
    on conflict (manager_id, plan_date) where (period_type = 'DAY'::public.plan_period_type)
    do update set
      note = excluded.note,
      updated_at = now()
    returning id into day_plan_id;

    -- Detect whether we created or reused (best-effort)
    if exists(
      select 1 from public.manager_plans p
      where p.id = day_plan_id and p.created_at > now() - interval '3 seconds'
    ) then
      day_plans_created := day_plans_created + 1;
    else
      day_plans_reused := day_plans_reused + 1;
    end if;

    -- Ensure capo slots exist for this DAY plan (mirror WEEK slots)
    insert into public.plan_capo_slots (
      plan_id,
      capo_id,
      position,
      note,
      created_by
    )
    select
      day_plan_id,
      s.capo_id,
      s.position,
      s.note,
      auth.uid()
    from public.plan_capo_slots s
    where s.plan_id = w.id
    on conflict (plan_id, capo_id)
    do update set
      position = excluded.position,
      note = excluded.note,
      updated_at = now();

    -- Copy members per capo slot
    for wslot in
      select ws.id as week_slot_id, ws.capo_id
      from public.plan_capo_slots ws
      where ws.plan_id = w.id
      order by ws.position asc
    loop
      select ds.id into day_slot_id
      from public.plan_capo_slots ds
      where ds.plan_id = day_plan_id
        and ds.capo_id = wslot.capo_id
      limit 1;

      if day_slot_id is null then
        continue;
      end if;

      if not p_overwrite then
        if exists(select 1 from public.plan_slot_members x where x.slot_id = day_slot_id limit 1) then
          skipped_slots := skipped_slots + 1;
          continue;
        end if;
      else
        delete from public.plan_slot_members x where x.slot_id = day_slot_id;
      end if;

      insert into public.plan_slot_members (
        slot_id,
        operator_id,
        position,
        role_tag,
        note,
        created_by,
        plan_id
      )
      select
        day_slot_id,
        m.operator_id,
        m.position,
        m.role_tag,
        m.note,
        auth.uid(),
        day_plan_id
      from public.plan_slot_members m
      where m.slot_id = wslot.week_slot_id
      order by m.position asc;

      copied_slots := copied_slots + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'week_plan_id', w.id,
    'manager_id', w.manager_id,
    'monday', monday,
    'overwrite', p_overwrite,
    'day_plans_created', day_plans_created,
    'day_plans_reused', day_plans_reused,
    'slots_copied', copied_slots,
    'slots_skipped', skipped_slots
  );
end;
$$;


ALTER FUNCTION "public"."manager_apply_week_to_days_v1"("p_week_plan_id" "uuid", "p_overwrite" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."manager_apply_week_to_days_v1"("p_week_plan_id" "uuid", "p_overwrite" boolean) IS 'MANAGER: materialize WEEK plan into DAY plans for Mon-Fri. Default is non-destructive (preserve day overrides unless overwrite=true).';



CREATE OR REPLACE FUNCTION "public"."manager_my_capi"() RETURNS TABLE("capo_id" "uuid", "display_name" "text", "email" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  with me as (
    select p.id, p.app_role
    from public.profiles p
    where p.id = auth.uid()
    limit 1
  )
  select
    mca.capo_id,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), ''), nullif(trim(p.email), ''), '—') as display_name,
    p.email
  from public.manager_capo_assignments mca
  join public.profiles p on p.id = mca.capo_id
  join me on me.id = mca.manager_id
  where mca.manager_id = auth.uid()
    and mca.active is true
    and (
      -- autorise MANAGER (usage normal) + ADMIN (debug/support)
      me.app_role in ('MANAGER','ADMIN')
    )
  order by mca.created_at asc;
$$;


ALTER FUNCTION "public"."manager_my_capi"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."manager_my_capi"() IS 'SECURITY DEFINER: retourne la liste des CAPO assignés au manager (auth.uid), avec display_name/email. Conçu pour bypass RLS profiles côté MANAGER en lecture strictement limitée au mapping manager_capo_assignments.';



CREATE OR REPLACE FUNCTION "public"."manager_my_capi_ui_modes_v1"() RETURNS TABLE("capo_id" "uuid", "display_name" "text", "email" "text", "capo_ui_mode" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p.id as capo_id,
    p.display_name,
    p.email,
    p.capo_ui_mode
  from public.profiles p
  where
    (
      public.is_admin(auth.uid())
      and p.app_role = 'CAPO'
    )
    or
    (
      exists (
        select 1
        from public.profiles actor
        where actor.id = auth.uid()
          and actor.app_role in ('MANAGER', 'ADMIN')
      )
      and exists (
        select 1
        from public.manager_capo_assignments mca
        where mca.manager_id = auth.uid()
          and mca.capo_id = p.id
          and mca.active = true
      )
    )
  order by
    coalesce(p.display_name, p.email, p.id::text);
$$;


ALTER FUNCTION "public"."manager_my_capi_ui_modes_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manager_my_capi_v1"() RETURNS TABLE("capo_id" "uuid", "display_name" "text", "email" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    a.capo_id,
    coalesce(nullif(p.display_name, ''), nullif(p.full_name, ''), p.email, '—') as display_name,
    p.email
  from public.manager_capo_assignments a
  join public.profiles p
    on p.id = a.capo_id
  where a.manager_id = auth.uid()
    and a.active = true
    and p.app_role = 'CAPO'
  order by a.created_at asc;
$$;


ALTER FUNCTION "public"."manager_my_capi_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manager_my_operators_v1"() RETURNS TABLE("operator_id" "uuid", "operator_name" "text", "operator_roles" "text"[], "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    x.operator_id,
    x.operator_name,
    x.operator_roles,
    x.created_at
  from (
    select distinct on (so.operator_id)
      so.operator_id,
      od.display_name as operator_name,
      coalesce(od.roles, array[]::text[]) as operator_roles,
      od.created_at
    from public.ship_managers sm
    join public.ship_operators so
      on so.ship_id = sm.ship_id
     and so.active is true
    join public.operators_display_v1 od
      on od.id = so.operator_id
    where sm.manager_id = auth.uid()
    order by so.operator_id, od.display_name asc
  ) x
  order by x.operator_name asc;
$$;


ALTER FUNCTION "public"."manager_my_operators_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manager_my_ships_v1"() RETURNS TABLE("ship_id" "uuid", "ship_code" "text", "ship_name" "text", "is_active" boolean, "assigned_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    sm.ship_id,
    s.code as ship_code,
    s.name as ship_name,
    s.is_active,
    sm.created_at as assigned_at
  from public.ship_managers sm
  join public.ships s on s.id = sm.ship_id
  where sm.manager_id = auth.uid()
  order by sm.created_at desc;
$$;


ALTER FUNCTION "public"."manager_my_ships_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manager_set_capo_ui_mode_v1"("p_capo_id" "uuid", "p_mode" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_capo_id is null then
    raise exception 'capo_id is required';
  end if;

  if p_mode is null or p_mode not in ('simple', 'rich') then
    raise exception 'invalid capo_ui_mode: %', p_mode;
  end if;

  -- Admin can always update
  if public.is_admin(auth.uid()) then
    update public.profiles
      set capo_ui_mode = p_mode,
          updated_at = now()
    where id = p_capo_id;

    if not found then
      raise exception 'capo not found: %', p_capo_id;
    end if;

    return;
  end if;

  -- Manager perimeter check (active=true)
  if not exists (
    select 1
    from public.profiles actor
    where actor.id = auth.uid()
      and actor.app_role in ('MANAGER', 'ADMIN')
  ) then
    raise exception 'forbidden: actor is not manager/admin';
  end if;

  if not exists (
    select 1
    from public.manager_capo_assignments mca
    where mca.manager_id = auth.uid()
      and mca.capo_id = p_capo_id
      and mca.active = true
  ) then
    raise exception 'forbidden: capo not in manager perimeter';
  end if;

  update public.profiles
    set capo_ui_mode = p_mode,
        updated_at = now()
  where id = p_capo_id;

  if not found then
    raise exception 'capo not found: %', p_capo_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."manager_set_capo_ui_mode_v1"("p_capo_id" "uuid", "p_mode" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manager_set_week_status_v1"("p_week_plan_id" "uuid", "p_next_status" "public"."plan_status", "p_overwrite" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  w public.manager_plans%rowtype;
  monday date;
  next_status public.plan_status;
  frozen_ts timestamptz;
  updated_days integer := 0;
begin
  select * into w
  from public.manager_plans
  where id = p_week_plan_id;

  if not found then
    raise exception 'manager_set_week_status_v1: week plan not found (%).', p_week_plan_id;
  end if;

  if w.period_type <> 'WEEK'::public.plan_period_type then
    raise exception 'manager_set_week_status_v1: plan % is not WEEK.', p_week_plan_id;
  end if;

  if w.manager_id <> auth.uid() then
    raise exception 'manager_set_week_status_v1: not allowed.';
  end if;

  next_status := p_next_status;
  if next_status not in ('DRAFT'::public.plan_status, 'PUBLISHED'::public.plan_status, 'FROZEN'::public.plan_status) then
    next_status := 'DRAFT'::public.plan_status;
  end if;

  if w.year_iso is null or w.week_iso is null then
    raise exception 'manager_set_week_status_v1: week plan missing year_iso/week_iso.';
  end if;

  monday := to_date(lpad(w.year_iso::text, 4, '0') || lpad(w.week_iso::text, 2, '0') || '1', 'IYYYIWID');

  -- Ensure DAY plans exist and are updated (template -> days)
  perform public.manager_apply_week_to_days_v1(p_week_plan_id, p_overwrite);

  frozen_ts := case when next_status = 'FROZEN'::public.plan_status then now() else null end;

  -- Update WEEK plan
  update public.manager_plans
  set status = next_status,
      frozen_at = coalesce(frozen_ts, frozen_at),
      updated_at = now()
  where id = w.id;

  -- Update DAY plans Mon-Fri
  if next_status = 'FROZEN'::public.plan_status then
    update public.manager_plans
    set status = next_status,
        frozen_at = now(),
        updated_at = now()
    where manager_id = w.manager_id
      and period_type = 'DAY'::public.plan_period_type
      and plan_date between monday and (monday + 4);

    get diagnostics updated_days = row_count;
  else
    update public.manager_plans
    set status = next_status,
        updated_at = now()
    where manager_id = w.manager_id
      and period_type = 'DAY'::public.plan_period_type
      and plan_date between monday and (monday + 4)
      and status <> 'FROZEN'::public.plan_status;

    get diagnostics updated_days = row_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'week_plan_id', w.id,
    'manager_id', w.manager_id,
    'monday', monday,
    'next_status', next_status,
    'day_plans_updated', updated_days,
    'overwrite', p_overwrite
  );
end;
$$;


ALTER FUNCTION "public"."manager_set_week_status_v1"("p_week_plan_id" "uuid", "p_next_status" "public"."plan_status", "p_overwrite" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."manager_set_week_status_v1"("p_week_plan_id" "uuid", "p_next_status" "public"."plan_status", "p_overwrite" boolean) IS 'MANAGER: set WEEK status and propagate to Mon-Fri DAY plans. Calls manager_apply_week_to_days_v1 first.';



CREATE OR REPLACE FUNCTION "public"."nav_status_from_text"("x" "text") RETURNS "public"."nav_status"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case upper(trim(coalesce(x, '')))
    when 'P'  then 'P'::public.nav_status
    when 'R'  then 'R'::public.nav_status
    when 'T'  then 'T'::public.nav_status
    when 'B'  then 'B'::public.nav_status
    when 'E'  then 'E'::public.nav_status
    when 'NP' then 'NP'::public.nav_status
    else 'NP'::public.nav_status
  end
$$;


ALTER FUNCTION "public"."nav_status_from_text"("x" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."navemaster_can_manage"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.app_role in ('ADMIN','DIREZIONE','UFFICIO'))
  );
$$;


ALTER FUNCTION "public"."navemaster_can_manage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_inca_situazione"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select
    case
      when p is null then null
      else
        case
          when upper(trim(p)) in ('P','T','R','B','E') then upper(trim(p))
          when upper(trim(p)) like '%ELIMIN%' then 'E'
          when upper(trim(p)) like '%RICH%' then 'R'
          when upper(trim(p)) like '%TAGLI%' then 'T'
          when upper(trim(p)) like '%POSA%' or upper(trim(p)) like '%POSATO%' or upper(trim(p)) like '%COLLEG%' then 'P'
          when upper(trim(p)) like '%BLOCC%' or upper(trim(p)) like '%NON PRONTO%' then 'B'
          else null
        end
    end;
$$;


ALTER FUNCTION "public"."normalize_inca_situazione"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."percorso_propose_lots"("p_document_id" "uuid", "p_min_core_segments" integer, "p_min_cables" integer, "p_max_lots" integer, "p_dry_run" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_doc_exists boolean;
  v_cables integer;
  v_segments integer;
begin
  -- 1) document existe ?
  select exists(
    select 1 from public.percorso_documents d where d.id = p_document_id
  ) into v_doc_exists;

  if not v_doc_exists then
    return jsonb_build_object(
      'ok', false,
      'error', 'document_not_found',
      'document_id', p_document_id
    );
  end if;

  -- 2) compter câbles
  select count(*) into v_cables
  from public.percorso_cables
  where document_id = p_document_id;

  -- 3) compter segments
  select count(*) into v_segments
  from public.percorso_cable_segments s
  join public.percorso_cables c on c.id = s.cable_id
  where c.document_id = p_document_id;

  return jsonb_build_object(
    'ok', true,
    'document_id', p_document_id,
    'dry_run', p_dry_run,
    'params', jsonb_build_object(
      'min_core_segments', p_min_core_segments,
      'min_cables', p_min_cables,
      'max_lots', p_max_lots
    ),
    'counts', jsonb_build_object(
      'cables', v_cables,
      'segments', v_segments
    )
  );
end;
$$;


ALTER FUNCTION "public"."percorso_propose_lots"("p_document_id" "uuid", "p_min_core_segments" integer, "p_min_cables" integer, "p_max_lots" integer, "p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ping"() RETURNS "jsonb"
    LANGUAGE "sql"
    AS $$
  select jsonb_build_object('ok', true, 'ts', now());
$$;


ALTER FUNCTION "public"."ping"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_update_on_frozen_files"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if old.frozen_at is not null then
    raise exception 'Document gelé juridiquement. Aucune modification autorisée.';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_update_on_frozen_files"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_operator_kpi_snapshot"("p_operator_id" "uuid", "p_period" "public"."kpi_period", "p_ref_date" "date", "p_year_iso" integer, "p_week_iso" integer, "p_actor" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_hours_worked numeric(10,2);
  v_hours_theo numeric(10,2);
  v_meters numeric(14,2);
  v_defects int;
  v_rework int;
  v_productivity numeric(6,2);
  v_quality numeric(6,2);
  v_rework_rate numeric(6,2);
begin
  select
    coalesce(sum(hours_worked),0),
    coalesce(sum(hours_theoretical),0),
    coalesce(sum(meters_installed),0),
    coalesce(sum(defects_count),0)::int,
    coalesce(sum(rework_count),0)::int
  into v_hours_worked, v_hours_theo, v_meters, v_defects, v_rework
  from public.operator_kpi_facts f
  where f.operator_id = p_operator_id
    and f.period = p_period
    and (
      (p_period = 'DAY' and f.ref_date = p_ref_date)
      or
      (p_period = 'WEEK' and f.year_iso = p_year_iso and f.week_iso = p_week_iso)
    );

  v_productivity := case
    when v_hours_theo <= 0 then 0
    else round((v_hours_worked / v_hours_theo) * 100.0, 2)
  end;

  v_quality := greatest(0, round(100.0 - (v_defects * 2.0) - (v_rework * 1.0), 2));

  v_rework_rate := case
    when v_hours_worked <= 0 then 0
    else round((v_rework::numeric / v_hours_worked) * 100.0, 2)
  end;

  insert into public.operator_kpi_snapshots (
    operator_id, period, ref_date, year_iso, week_iso,
    productivity_pct, quality_score, rework_rate_pct,
    total_hours_worked, total_hours_theoretical, total_meters_installed,
    total_defects, total_rework,
    computed_at, computed_by
  )
  values (
    p_operator_id, p_period, p_ref_date, p_year_iso, p_week_iso,
    v_productivity, v_quality, v_rework_rate,
    v_hours_worked, v_hours_theo, v_meters,
    v_defects, v_rework,
    now(), p_actor
  )
  on conflict (operator_id, period, ref_date, year_iso, week_iso)
  do update set
    productivity_pct = excluded.productivity_pct,
    quality_score = excluded.quality_score,
    rework_rate_pct = excluded.rework_rate_pct,
    total_hours_worked = excluded.total_hours_worked,
    total_hours_theoretical = excluded.total_hours_theoretical,
    total_meters_installed = excluded.total_meters_installed,
    total_defects = excluded.total_defects,
    total_rework = excluded.total_rework,
    computed_at = excluded.computed_at,
    computed_by = excluded.computed_by;

end;
$$;


ALTER FUNCTION "public"."recompute_operator_kpi_snapshot"("p_operator_id" "uuid", "p_period" "public"."kpi_period", "p_ref_date" "date", "p_year_iso" integer, "p_week_iso" integer, "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_core_file_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.version_of is not null then
    update public.core_files
    set stato_doc = 'ANNULLATO',
        updated_at = now()
    where id = new.version_of;

    new.version_num := (
      select coalesce(max(version_num), 0) + 1
      from public.core_files
      where id = new.version_of
         or version_of = new.version_of
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."replace_core_file_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profile_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_profile_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_rapportini_capo_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.capo_id IS NULL THEN
    NEW.capo_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_rapportini_capo_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_rapportino_row_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_rapportino_row_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_rapportino_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_rapportino_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_capo_id_from_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.capo_id IS NULL THEN
    NEW.capo_id := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_capo_id_from_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    -- If role is missing, derive it from app_role (app_role is NOT NULL)
    if new.role is null then
      new.role := new.app_role::public.app_role;
    end if;

    -- Always mirror to app_role from role (canonical)
    new.app_role := new.role::text;
    return new;
  end if;

  -- UPDATE
  if (new.role is distinct from old.role) and (new.app_role is not distinct from old.app_role) then
    -- role changed => mirror to app_role
    new.app_role := new.role::text;

  elsif (new.app_role is distinct from old.app_role) and (new.role is not distinct from old.role) then
    -- app_role changed => mirror to role
    new.role := new.app_role::public.app_role;

  else
    -- both changed or neither changed => enforce canonical equality
    if new.role is null then
      new.role := new.app_role::public.app_role;
    end if;
    new.app_role := new.role::text;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_profile_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_archive_on_rapportino_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'archive'
    AS $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'APPROVED_UFFICIO'
     and old.status is distinct from new.status
  then
    -- =========================
    -- HEADER (archive.rapportini)
    -- =========================
    delete from archive.rapportini
    where id = new.id;

    -- Explicit column list to prevent schema drift breaking approval.
    insert into archive.rapportini (
      id,
      data,
      capo_id,
      capo_name,
      status,
      cost,
      commessa,
      totale_prodotto,
      ufficio_note,
      validated_by_capo_at,
      approved_by_ufficio_at,
      approved_by_ufficio,
      returned_by_ufficio_at,
      returned_by_ufficio,
      created_at,
      updated_at,
      user_id,
      crew_role,
      report_date,
      prodotto_tot,
      note_ufficio,
      costr,
      prodotto_totale,

      -- Versioning / rettifica
      supersedes_rapportino_id,
      superseded_by_rapportino_id,
      correction_reason,
      correction_created_by,
      correction_created_at
    )
    select
      r.id,
      r.data,
      r.capo_id,
      r.capo_name,
      r.status,
      r.cost,
      r.commessa,
      r.totale_prodotto,
      r.ufficio_note,
      r.validated_by_capo_at,
      r.approved_by_ufficio_at,
      r.approved_by_ufficio,
      r.returned_by_ufficio_at,
      r.returned_by_ufficio,
      r.created_at,
      r.updated_at,
      r.user_id,
      r.crew_role,
      r.report_date,
      r.prodotto_tot,
      r.note_ufficio,
      r.costr,
      r.prodotto_totale,

      r.supersedes_rapportino_id,
      r.superseded_by_rapportino_id,
      r.correction_reason,
      r.correction_created_by,
      r.correction_created_at
    from public.rapportini r
    where r.id = new.id;

    -- =========================
    -- RIGHE (archive.rapportino_righe)
    -- =========================
    delete from archive.rapportino_righe
    where rapportino_id = new.id;

    insert into archive.rapportino_righe (
      rapportino_id,
      idx,
      categoria,
      descrizione,
      previsto,
      prodotto,
      note,
      operai,
      created_at,
      updated_at
    )
    select
      pr.rapportino_id,
      pr.row_index,
      pr.categoria,
      pr.descrizione,
      pr.previsto,
      pr.prodotto,
      pr.note,
      jsonb_build_object('text', pr.operatori),
      pr.created_at,
      pr.updated_at
    from public.rapportino_rows pr
    where pr.rapportino_id = new.id;

    -- =========================
    -- CAVI (archive.rapportino_cavi)
    -- =========================
    delete from archive.rapportino_cavi
    where rapportino_id = new.id;

    insert into archive.rapportino_cavi (
      rapportino_id,
      codice,
      descrizione,
      metri_totali,
      percentuale,
      metri_posati,
      created_at,
      updated_at,
      inca_cavo_id
    )
    select
      v.rapportino_id,
      v.codice,
      v.descrizione,
      coalesce(v.metri_totali, 0),
      coalesce(v.percentuale, 0),
      coalesce(v.metri_posati, 0),
      coalesce(v.created_at, now()),
      coalesce(v.updated_at, now()),
      v.inca_cavo_id
    from public.archive_rapportino_cavi_v1 v
    where v.rapportino_id = new.id;

  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_archive_on_rapportino_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_auto_tp_from_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_metri_teo numeric;
begin
  -- si pas de cavo, on sort
  if new.inca_cavo_id is null then
    return new;
  end if;

  -- récupérer metri_teo
  select c.metri_teo into v_metri_teo
  from public.inca_cavi c
  where c.id = new.inca_cavo_id;

  if v_metri_teo is null or v_metri_teo <= 0 then
    return new;
  end if;

  -- calcul: si mètres posés >= 50% du théorique
  if coalesce(new.metri_posati, 0) >= (v_metri_teo * 0.5) then
    -- mise à jour globale INCA, seulement de T -> P
    update public.inca_cavi
      set situazione = 'P'
    where id = new.inca_cavo_id
      and situazione = 'T';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_auto_tp_from_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fill_rapportino_inca_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  c RECORD;
  r RECORD;
BEGIN
  -- Récupération câble INCA
  SELECT codice, costr, commessa
  INTO c
  FROM inca_cavi
  WHERE id = NEW.inca_cavo_id;

  -- Récupération rapportino
  SELECT report_date
  INTO r
  FROM rapportini
  WHERE id = NEW.rapportino_id;

  -- Remplissage cache
  NEW.codice_cache   := c.codice;
  NEW.costr_cache    := c.costr;
  NEW.commessa_cache := c.commessa;
  NEW.posa_date      := r.report_date;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_fill_rapportino_inca_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_operators_require_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if auth.role() in ('service_role', 'postgres') then
    return new;
  end if;

  if new.cognome is null or btrim(new.cognome) = '' then
    raise exception 'operators.cognome is required';
  end if;

  if new.nome is null or btrim(new.nome) = '' then
    raise exception 'operators.nome is required';
  end if;

  if new.birth_date is null then
    raise exception 'operators.birth_date is required';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_operators_require_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_operators_set_operator_key"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.operator_key := public.fn_operator_key(new.cognome, new.birth_date);
  return new;
end
$$;


ALTER FUNCTION "public"."trg_operators_set_operator_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_rapportini_apply_inca_progress_on_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status in (
       'VALIDATED_CAPO',
       'APPROVED_UFFICIO'
     )
  then
    perform public.core_apply_rapportino_inca_progress(new.id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_rapportini_apply_inca_progress_on_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_rapportini_on_status_product"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  old_s text;
  new_s text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  old_s := public.core_status_text(old.status);
  new_s := public.core_status_text(new.status);

  -- Si status inchangé: no-op
  if old_s = new_s then
    return new;
  end if;

  -- Déclenchement sur les statuts "finalisants"
  if new_s in ('VALIDATED_CAPO', 'APPROVED_UFFICIO') then
    perform public.fn_rapportino_apply_product(new.id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_rapportini_on_status_product"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trg_rapportini_on_status_product"() IS 'After rapportini.status change, apply minimal INCA consolidation on VALIDATED_CAPO / APPROVED_UFFICIO. Avoid enum/text comparison issues.';



CREATE OR REPLACE FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_ufficio() then
    raise exception 'not allowed';
  end if;

  update public.rapportini
  set
    status = 'APPROVED_UFFICIO',
    approved_by_ufficio = auth.uid(),
    approved_by_ufficio_at = now()
  where id = p_rapportino_id
    and status = 'VALIDATED_CAPO';
end;
$$;


ALTER FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_role public.app_role;
  v_status public.report_status;
  v_updated_cavi integer := 0;
begin
  -- 1) Role guard (authoritative)
  v_role := (public.core_current_profile()).app_role;

  if v_role not in ('UFFICIO'::public.app_role, 'DIREZIONE'::public.app_role, 'ADMIN'::public.app_role) then
    raise exception 'Not authorized (role=%).', v_role
      using errcode = '42501';
  end if;

  -- 2) Lock rapportino row + status check
  select r.status
    into v_status
  from public.rapportini r
  where r.id = p_rapportino_id
  for update;

  if not found then
    raise exception 'Rapportino not found.'
      using errcode = 'P0002';
  end if;

  if v_status <> 'VALIDATED_CAPO'::public.report_status then
    raise exception 'Invalid status for approval (status=%). Must be VALIDATED_CAPO.', v_status
      using errcode = 'P0001';
  end if;

  -- 3) Approve (archive / freeze)
  update public.rapportini r
  set
    status = 'APPROVED_UFFICIO'::public.report_status,
    approved_by_ufficio = auth.uid(),
    approved_by_ufficio_at = now(),
    ufficio_note = nullif(trim(p_note), ''),
    note_ufficio = nullif(trim(p_note), '')
  where r.id = p_rapportino_id;

  -- 4) Certification INCA: any linked cable with RAP progress >= 50 => Posato (P)
  update public.inca_cavi ic
  set situazione = 'P'
  where ic.id in (
    select ric.inca_cavo_id
    from public.rapportino_inca_cavi ric
    where ric.rapportino_id = p_rapportino_id
      and ric.inca_cavo_id is not null
      and ric.progress_percent is not null
      and ric.progress_percent >= 50
  );

  get diagnostics v_updated_cavi = row_count;

  return jsonb_build_object(
    'ok', true,
    'rapportino_id', p_rapportino_id,
    'updated_cavi', v_updated_cavi
  );
end;
$$;


ALTER FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ufficio_create_correction_rapportino"("p_rapportino_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_uid uuid;
  v_role text;

  v_old public.rapportini%rowtype;
  v_new_id uuid;
  v_now timestamptz := now();

  v_reason text := coalesce(nullif(trim(p_reason), ''), null);

  -- dynamic copy for rapportino_inca_cavi
  v_inca_exists boolean := false;
  v_inca_has_created_at boolean := false;
  v_inca_has_updated_at boolean := false;
  v_inca_cols text := '';
  v_inca_select_cols text := '';
  v_sql text;

  v_copied_rows int := 0;
  v_copied_inca int := 0;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select p.app_role into v_role
  from public.profiles p
  where p.id = v_uid;

  if v_role is null then
    raise exception 'Profile not found';
  end if;

  if v_role not in ('UFFICIO', 'ADMIN') then
    raise exception 'Not authorized (role=%)', v_role;
  end if;

  if v_reason is null then
    raise exception 'Motivo della rettifica obbligatorio';
  end if;

  -- Lock old rapportino
  select *
  into v_old
  from public.rapportini
  where id = p_rapportino_id
  for update;

  if not found then
    raise exception 'Rapportino not found';
  end if;

  if v_old.status <> 'APPROVED_UFFICIO' then
    raise exception 'Rettifica consentita solo per documenti archiviati (status=APPROVED_UFFICIO)';
  end if;

  if v_old.superseded_by_rapportino_id is not null then
    raise exception 'Documento già sostituito da una rettifica (%).', v_old.superseded_by_rapportino_id;
  end if;

  -- Create new rapportino id
  v_new_id := gen_random_uuid();

  -- Insert new rapportino (status RETURNED: correction workflow)
  -- NOTE:
  -- - colonne NOT NULL: id, data, capo_name, status, totale_prodotto, created_at, updated_at
  -- - On fixe data = coalesce(report_date, data) pour stabilité.
  insert into public.rapportini (
    id,
    data,
    capo_id,
    capo_name,
    status,
    cost,
    commessa,
    totale_prodotto,
    ufficio_note,
    validated_by_capo_at,
    approved_by_ufficio_at,
    approved_by_ufficio,
    returned_by_ufficio_at,
    returned_by_ufficio,
    created_at,
    updated_at,
    user_id,
    crew_role,
    report_date,
    prodotto_tot,
    note_ufficio,
    costr,
    prodotto_totale,
    supersedes_rapportino_id,
    superseded_by_rapportino_id,
    correction_reason,
    correction_created_by,
    correction_created_at
  )
  values (
    v_new_id,
    coalesce(v_old.report_date, v_old.data),
    v_old.capo_id,
    v_old.capo_name,
    'RETURNED',
    v_old.cost,
    v_old.commessa,
    v_old.totale_prodotto,
    -- note Ufficio -> Capo (cause correction)
    v_reason,
    null, -- validated_by_capo_at
    null, -- approved_by_ufficio_at
    null, -- approved_by_ufficio
    v_now, -- returned_by_ufficio_at
    v_uid, -- returned_by_ufficio
    v_now, -- created_at
    v_now, -- updated_at
    v_old.user_id,
    v_old.crew_role,
    v_old.report_date,
    v_old.prodotto_tot,
    v_reason,
    v_old.costr,
    v_old.prodotto_totale,
    -- versionning
    v_old.id, -- supersedes_rapportino_id (new -> old)
    null,     -- superseded_by_rapportino_id (new not superseded)
    v_reason,
    v_uid,
    v_now
  );

  -- Copy rapportino_rows
  insert into public.rapportino_rows (
    id,
    rapportino_id,
    row_index,
    categoria,
    descrizione,
    operatori,
    tempo,
    previsto,
    prodotto,
    note,
    created_at,
    updated_at,
    activity_id
  )
  select
    gen_random_uuid(),
    v_new_id,
    r.row_index,
    r.categoria,
    r.descrizione,
    r.operatori,
    r.tempo,
    r.previsto,
    r.prodotto,
    r.note,
    v_now,
    v_now,
    r.activity_id
  from public.rapportino_rows r
  where r.rapportino_id = v_old.id
  order by r.row_index;

  get diagnostics v_copied_rows = row_count;

  -- Copy rapportino_inca_cavi (DEFENSIVE)
  -- We don't know exact schema, so we build a dynamic insert that:
  -- - detects presence of table public.rapportino_inca_cavi
  -- - copies all columns except (id, rapportino_id)
  -- - if created_at/updated_at exist: set them to now()
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rapportino_inca_cavi'
  ) into v_inca_exists;

  if v_inca_exists then
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='rapportino_inca_cavi' and column_name='created_at'
    ) into v_inca_has_created_at;

    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='rapportino_inca_cavi' and column_name='updated_at'
    ) into v_inca_has_updated_at;

    -- Build list of columns to copy (excluding id, rapportino_id)
    -- We'll also manage created_at/updated_at if present by overriding to now()
    with cols as (
      select
        c.column_name
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'rapportino_inca_cavi'
        and c.column_name not in ('id', 'rapportino_id', 'created_at', 'updated_at')
      order by c.ordinal_position
    )
    select
      string_agg(format('%I', column_name), ', ') as ins_cols,
      string_agg(format('s.%I', column_name), ', ') as sel_cols
    into v_inca_cols, v_inca_select_cols
    from cols;

    -- Compose dynamic SQL
    v_sql := 'insert into public.rapportino_inca_cavi (rapportino_id';

    if v_inca_cols is not null and v_inca_cols <> '' then
      v_sql := v_sql || ', ' || v_inca_cols;
    end if;

    if v_inca_has_created_at then
      v_sql := v_sql || ', created_at';
    end if;

    if v_inca_has_updated_at then
      v_sql := v_sql || ', updated_at';
    end if;

    v_sql := v_sql || ') select $1::uuid';

    if v_inca_select_cols is not null and v_inca_select_cols <> '' then
      v_sql := v_sql || ', ' || v_inca_select_cols;
    end if;

    if v_inca_has_created_at then
      v_sql := v_sql || ', $2::timestamptz';
    end if;

    if v_inca_has_updated_at then
      v_sql := v_sql || ', $2::timestamptz';
    end if;

    v_sql := v_sql || ' from public.rapportino_inca_cavi s where s.rapportino_id = $3::uuid';

    execute v_sql using v_new_id, v_now, v_old.id;
    get diagnostics v_copied_inca = row_count;
  end if;

  -- Link versionning: old -> new
  update public.rapportini
  set
    superseded_by_rapportino_id = v_new_id,
    updated_at = v_now
  where id = v_old.id;

  -- Audit row
  insert into public.rapportini_corrections_audit (
    old_rapportino_id,
    new_rapportino_id,
    reason,
    created_by,
    created_at
  ) values (
    v_old.id,
    v_new_id,
    v_reason,
    v_uid,
    v_now
  );

  return jsonb_build_object(
    'new_rapportino_id', v_new_id,
    'message', 'Rettifica creata (nuova versione) in status RETURNED',
    'copied_rows', v_copied_rows,
    'copied_inca_links', v_copied_inca
  );
end;
$_$;


ALTER FUNCTION "public"."ufficio_create_correction_rapportino"("p_rapportino_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manager_capo_assignments" (
    "capo_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."manager_capo_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."manager_capo_assignments" IS 'Assignation CAPO -> MANAGER (1:1). Source de vérité pour le périmètre Manager.';



CREATE OR REPLACE VIEW "public"."admin_capo_manager_v1" AS
 SELECT "c"."id" AS "capo_id",
    "c"."email" AS "capo_email",
    "c"."display_name" AS "capo_display_name",
    "a"."manager_id",
    "m"."email" AS "manager_email",
    "m"."display_name" AS "manager_display_name",
    "a"."active",
    "a"."created_at",
    "a"."created_by"
   FROM (("public"."profiles" "c"
     LEFT JOIN "public"."manager_capo_assignments" "a" ON (("a"."capo_id" = "c"."id")))
     LEFT JOIN "public"."profiles" "m" ON (("m"."id" = "a"."manager_id")))
  WHERE ("c"."app_role" = 'CAPO'::"text");


ALTER VIEW "public"."admin_capo_manager_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ship_managers" (
    "ship_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ship_managers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "costr" "text" NOT NULL,
    "commessa" "text" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "yard" "text",
    "deadline_date" "date",
    "progress_inca" numeric DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recent_reports" integer DEFAULT 0
);


ALTER TABLE "public"."ships" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_manager_perimeter_v1" AS
 SELECT "sm"."manager_id",
    "p"."email" AS "manager_email",
    "sm"."ship_id",
    "s"."code" AS "ship_code",
    "s"."name" AS "ship_name",
    "sm"."created_at"
   FROM (("public"."ship_managers" "sm"
     JOIN "public"."profiles" "p" ON (("p"."id" = "sm"."manager_id")))
     JOIN "public"."ships" "s" ON (("s"."id" = "sm"."ship_id")));


ALTER VIEW "public"."admin_manager_perimeter_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manager_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "period_type" "public"."plan_period_type" NOT NULL,
    "plan_date" "date",
    "week_iso" integer,
    "year_iso" integer,
    "status" "public"."plan_status" DEFAULT 'DRAFT'::"public"."plan_status" NOT NULL,
    "note" "text",
    "frozen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "locked_at" timestamp with time zone,
    "locked_by" "uuid",
    "unlocked_at" timestamp with time zone,
    "unlocked_by" "uuid"
);


ALTER TABLE "public"."manager_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_capo_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_capo_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_slot_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slot_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "role_tag" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan_id" "uuid"
);


ALTER TABLE "public"."plan_slot_members" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_planning_overview_v1" AS
 SELECT "p"."id" AS "plan_id",
    "p"."manager_id",
    "p"."period_type",
    "p"."plan_date",
    "p"."year_iso",
    "p"."week_iso",
    "p"."status",
    "p"."created_at",
    "p"."updated_at",
    "s"."id" AS "slot_id",
    "s"."capo_id",
    "s"."position" AS "capo_position",
    "m"."operator_id",
    "m"."position" AS "operator_position"
   FROM (("public"."manager_plans" "p"
     JOIN "public"."plan_capo_slots" "s" ON (("s"."plan_id" = "p"."id")))
     LEFT JOIN "public"."plan_slot_members" "m" ON (("m"."slot_id" = "s"."id")));


ALTER VIEW "public"."admin_planning_overview_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_planning_overview_v1" IS 'Admin global planning overview: Plan -> CAPO slots -> Operators. Join to profiles/operators for labels in UI.';



CREATE TABLE IF NOT EXISTS "public"."ship_capos" (
    "ship_id" "uuid" NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."ship_capos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_ship_capos_v1" AS
 SELECT "sc"."ship_id",
    "s"."code" AS "ship_code",
    "s"."name" AS "ship_name",
    "sc"."capo_id",
    "p"."email" AS "capo_email",
    "p"."display_name" AS "capo_name",
    "sc"."created_at"
   FROM (("public"."ship_capos" "sc"
     JOIN "public"."ships" "s" ON (("s"."id" = "sc"."ship_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "sc"."capo_id")));


ALTER VIEW "public"."admin_ship_capos_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "roles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cognome" "text",
    "nome" "text",
    "birth_date" "date",
    "operator_key" "text",
    "operator_code" "text",
    "is_normalized" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."operators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ship_operators" (
    "ship_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ship_operators" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_ship_operators_v1" AS
 SELECT "so"."ship_id",
    "s"."code" AS "ship_code",
    "s"."name" AS "ship_name",
    "so"."operator_id",
    "o"."name" AS "operator_name",
    "o"."roles" AS "operator_roles",
    "so"."active",
    "so"."created_at",
    "so"."created_by"
   FROM (("public"."ship_operators" "so"
     JOIN "public"."ships" "s" ON (("s"."id" = "so"."ship_id")))
     JOIN "public"."operators" "o" ON (("o"."id" = "so"."operator_id")));


ALTER VIEW "public"."admin_ship_operators_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rapportini" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "data" "date" DEFAULT CURRENT_DATE NOT NULL,
    "capo_id" "uuid",
    "capo_name" "text" DEFAULT 'CAPO SCONOSCIUTO'::"text" NOT NULL,
    "status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "cost" "text",
    "commessa" "text",
    "totale_prodotto" numeric DEFAULT 0 NOT NULL,
    "ufficio_note" "text",
    "validated_by_capo_at" timestamp with time zone,
    "approved_by_ufficio_at" timestamp with time zone,
    "approved_by_ufficio" "uuid",
    "returned_by_ufficio_at" timestamp with time zone,
    "returned_by_ufficio" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "crew_role" "text",
    "report_date" "date",
    "prodotto_tot" numeric,
    "note_ufficio" "text",
    "costr" "text",
    "prodotto_totale" numeric,
    "supersedes_rapportino_id" "uuid",
    "superseded_by_rapportino_id" "uuid",
    "correction_reason" "text",
    "correction_created_by" "uuid",
    "correction_created_at" timestamp with time zone,
    CONSTRAINT "rapportini_no_self_supersede" CHECK (((("supersedes_rapportino_id" IS NULL) OR ("supersedes_rapportino_id" <> "id")) AND (("superseded_by_rapportino_id" IS NULL) OR ("superseded_by_rapportino_id" <> "id")))),
    CONSTRAINT "rapportini_versioning_one_direction" CHECK ((NOT (("supersedes_rapportino_id" IS NOT NULL) AND ("superseded_by_rapportino_id" IS NOT NULL))))
);


ALTER TABLE "public"."rapportini" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."rapportini_norm_v1" AS
 SELECT "id" AS "rapportino_id",
    "report_date",
    "status",
    "capo_id",
    NULLIF(TRIM(BOTH FROM "costr"), ''::"text") AS "costr_raw",
    NULLIF(TRIM(BOTH FROM "commessa"), ''::"text") AS "commessa_raw",
    NULLIF(NULLIF(TRIM(BOTH FROM "commessa"), ''::"text"), '-'::"text") AS "commessa_norm",
    NULLIF(TRIM(BOTH FROM "costr"), ''::"text") AS "costr_norm"
   FROM "public"."rapportini" "r";


ALTER VIEW "public"."rapportini_norm_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."rapportini_norm_v1" IS 'Rapportini normalisés (commessa ''-'' ou vide => NULL).';



CREATE OR REPLACE VIEW "public"."ships_norm_v1" AS
 SELECT "id" AS "ship_id",
    NULLIF(TRIM(BOTH FROM "costr"), ''::"text") AS "costr_raw",
    NULLIF(TRIM(BOTH FROM "commessa"), ''::"text") AS "commessa_raw",
    NULLIF(NULLIF(TRIM(BOTH FROM "commessa"), ''::"text"), '-'::"text") AS "commessa_norm",
    NULLIF(TRIM(BOTH FROM "costr"), ''::"text") AS "costr_norm",
    "code" AS "ship_code",
    "name" AS "ship_name",
    "is_active",
    "created_at"
   FROM "public"."ships" "s";


ALTER VIEW "public"."ships_norm_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."ships_norm_v1" IS 'Ships normalisés (commessa ''-'' ou vide => NULL). Source canonique pour la résolution ship.';



CREATE OR REPLACE VIEW "public"."rapportini_ship_resolution_v1" AS
 WITH "rap" AS (
         SELECT "r"."rapportino_id",
            "r"."report_date",
            "r"."status",
            "r"."capo_id",
            "r"."costr_raw",
            "r"."commessa_raw",
            "r"."commessa_norm",
            "r"."costr_norm"
           FROM "public"."rapportini_norm_v1" "r"
          WHERE ("r"."report_date" IS NOT NULL)
        ), "strict_candidates" AS (
         SELECT "rap_1"."rapportino_id",
            "sn"."ship_id",
            "sn"."ship_code",
            "sn"."ship_name"
           FROM ("rap" "rap_1"
             JOIN "public"."ships_norm_v1" "sn" ON ((("sn"."costr_norm" = "rap_1"."costr_norm") AND ((("sn"."commessa_norm" IS NULL) AND ("rap_1"."commessa_norm" IS NULL)) OR ("sn"."commessa_norm" = "rap_1"."commessa_norm")))))
        ), "strict_ranked" AS (
         SELECT "sc"."rapportino_id",
            "sc"."ship_id",
            "sc"."ship_code",
            "sc"."ship_name",
            "count"(*) OVER (PARTITION BY "sc"."rapportino_id") AS "strict_n"
           FROM "strict_candidates" "sc"
        ), "strict_one" AS (
         SELECT "strict_ranked"."rapportino_id",
            "strict_ranked"."ship_id",
            "strict_ranked"."ship_code",
            "strict_ranked"."ship_name",
            "strict_ranked"."strict_n"
           FROM "strict_ranked"
          WHERE ("strict_ranked"."strict_n" = 1)
        ), "costr_active_candidates" AS (
         SELECT "rap_1"."rapportino_id",
            "sn"."ship_id",
            "sn"."ship_code",
            "sn"."ship_name"
           FROM ("rap" "rap_1"
             JOIN "public"."ships_norm_v1" "sn" ON ((("sn"."costr_norm" = "rap_1"."costr_norm") AND ("sn"."is_active" = true))))
        ), "costr_ranked" AS (
         SELECT "cac"."rapportino_id",
            "cac"."ship_id",
            "cac"."ship_code",
            "cac"."ship_name",
            "count"(*) OVER (PARTITION BY "cac"."rapportino_id") AS "costr_active_n"
           FROM "costr_active_candidates" "cac"
        ), "costr_one" AS (
         SELECT "costr_ranked"."rapportino_id",
            "costr_ranked"."ship_id",
            "costr_ranked"."ship_code",
            "costr_ranked"."ship_name",
            "costr_ranked"."costr_active_n"
           FROM "costr_ranked"
          WHERE ("costr_ranked"."costr_active_n" = 1)
        ), "counts" AS (
         SELECT "rap_1"."rapportino_id",
            COALESCE("max"("sr"."strict_n"), (0)::bigint) AS "strict_n",
            COALESCE("max"("cr"."costr_active_n"), (0)::bigint) AS "costr_active_n"
           FROM (("rap" "rap_1"
             LEFT JOIN "strict_ranked" "sr" ON (("sr"."rapportino_id" = "rap_1"."rapportino_id")))
             LEFT JOIN "costr_ranked" "cr" ON (("cr"."rapportino_id" = "rap_1"."rapportino_id")))
          GROUP BY "rap_1"."rapportino_id"
        )
 SELECT "rap"."rapportino_id",
    "rap"."report_date",
    "rap"."status",
    "rap"."capo_id",
    "rap"."costr_raw" AS "costr",
    "rap"."commessa_raw" AS "commessa",
    "rap"."costr_norm",
    "rap"."commessa_norm",
    COALESCE("so"."ship_id", "co"."ship_id") AS "ship_id",
    COALESCE("so"."ship_code", "co"."ship_code") AS "ship_code",
    COALESCE("so"."ship_name", "co"."ship_name") AS "ship_name",
        CASE
            WHEN ("c"."strict_n" = 1) THEN 'STRICT'::"text"
            WHEN (("c"."strict_n" = 0) AND ("c"."costr_active_n" = 1)) THEN 'COSTR_ONLY'::"text"
            WHEN ("c"."strict_n" > 1) THEN 'AMBIGUOUS_STRICT'::"text"
            WHEN (("c"."strict_n" = 0) AND ("c"."costr_active_n" > 1)) THEN 'AMBIGUOUS_COSTR'::"text"
            WHEN (("c"."strict_n" = 0) AND ("c"."costr_active_n" = 0)) THEN 'NOT_FOUND'::"text"
            ELSE 'UNKNOWN'::"text"
        END AS "ship_match_mode",
    "c"."strict_n",
    "c"."costr_active_n"
   FROM ((("rap"
     LEFT JOIN "strict_one" "so" ON (("so"."rapportino_id" = "rap"."rapportino_id")))
     LEFT JOIN "costr_one" "co" ON (("co"."rapportino_id" = "rap"."rapportino_id")))
     LEFT JOIN "counts" "c" ON (("c"."rapportino_id" = "rap"."rapportino_id")));


ALTER VIEW "public"."rapportini_ship_resolution_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."rapportini_ship_resolution_v1" IS 'Résolution ship en 2 passes (STRICT puis COSTR_ONLY non ambigu). Expose ship_match_mode + counts.';



CREATE OR REPLACE VIEW "public"."admin_ship_resolution_anomalies_v1" AS
 SELECT "report_date",
    "rapportino_id",
    "status",
    "capo_id",
    "costr",
    "commessa",
    "ship_match_mode",
    "strict_n",
    "costr_active_n"
   FROM "public"."rapportini_ship_resolution_v1" "r"
  WHERE (("ship_id" IS NULL) OR ("ship_match_mode" = ANY (ARRAY['AMBIGUOUS_STRICT'::"text", 'AMBIGUOUS_COSTR'::"text", 'NOT_FOUND'::"text", 'UNKNOWN'::"text"])));


ALTER VIEW "public"."admin_ship_resolution_anomalies_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_ship_resolution_anomalies_v1" IS 'Anomalies de résolution ship (ambiguous/not_found). Source Admin/Manager pour correction data.';



CREATE OR REPLACE VIEW "public"."archive_rapportini_v1" AS
 SELECT "id",
    "data",
    "capo_id",
    "capo_name",
    "status",
    "cost",
    "commessa",
    "totale_prodotto",
    "ufficio_note",
    "validated_by_capo_at",
    "approved_by_ufficio_at",
    "approved_by_ufficio",
    "returned_by_ufficio_at",
    "returned_by_ufficio",
    "created_at",
    "updated_at",
    "user_id",
    "crew_role",
    "report_date",
    "prodotto_tot",
    "note_ufficio",
    "costr",
    "prodotto_totale"
   FROM "archive"."rapportini";


ALTER VIEW "public"."archive_rapportini_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."archive_rapportino_cavi_v1" AS
 SELECT "id",
    "rapportino_id",
    "codice",
    "descrizione",
    "metri_totali",
    "percentuale",
    "metri_posati",
    "created_at",
    "updated_at",
    "inca_cavo_id"
   FROM "archive"."rapportino_cavi";


ALTER VIEW "public"."archive_rapportino_cavi_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inca_cavi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inca_file_id" "uuid",
    "costr" "text",
    "commessa" "text",
    "codice" "text" NOT NULL,
    "descrizione" "text",
    "impianto" "text",
    "tipo" "text",
    "sezione" "text",
    "zona_da" "text",
    "zona_a" "text",
    "apparato_da" "text",
    "apparato_a" "text",
    "descrizione_da" "text",
    "descrizione_a" "text",
    "metri_teo" numeric,
    "metri_dis" numeric,
    "metri_sit_cavo" numeric,
    "metri_sit_tec" numeric,
    "pagina_pdf" integer,
    "rev_inca" "text",
    "stato_inca" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "situazione" "text",
    "from_file_id" "uuid",
    "metri_previsti" numeric,
    "metri_posati_teorici" numeric,
    "metri_totali" numeric DEFAULT 0,
    "marca_cavo" "text",
    "livello" "text",
    "metri_sta" numeric,
    "stato_tec" "text",
    "stato_cantiere" "text",
    "situazione_cavo" "text",
    "livello_disturbo" "text",
    "wbs" "text",
    "codice_inca" "text",
    "progress_percent" integer,
    "progress_side" "text",
    "last_import_id" "uuid",
    "last_seen_in_import_at" timestamp with time zone,
    "flag_changed_in_source" boolean DEFAULT false NOT NULL,
    "missing_in_latest_import" boolean DEFAULT false NOT NULL,
    "rework_count" integer DEFAULT 0 NOT NULL,
    "eliminated_count" integer DEFAULT 0 NOT NULL,
    "reinstated_count" integer DEFAULT 0 NOT NULL,
    "last_rework_at" timestamp with time zone,
    "last_eliminated_at" timestamp with time zone,
    "last_reinstated_at" timestamp with time zone,
    CONSTRAINT "inca_cavi_progress_percent_check" CHECK ((("progress_percent" IS NULL) OR ("progress_percent" = ANY (ARRAY[50, 70, 100])))),
    CONSTRAINT "inca_cavi_progress_side_check" CHECK ((("progress_side" IS NULL) OR ("progress_side" = ANY (ARRAY['DA'::"text", 'A'::"text"])))),
    CONSTRAINT "inca_cavi_situazione_check" CHECK ((("situazione" IS NULL) OR ("situazione" = ANY (ARRAY['L'::"text", 'T'::"text", 'P'::"text", 'R'::"text", 'B'::"text", 'E'::"text"]))))
);


ALTER TABLE "public"."inca_cavi" OWNER TO "postgres";


COMMENT ON TABLE "public"."inca_cavi" IS 'Cavi (ligne par ligne) importés depuis INCA.';



COMMENT ON COLUMN "public"."inca_cavi"."codice" IS 'Codice cavo INCA.';



COMMENT ON COLUMN "public"."inca_cavi"."situazione" IS 'L=libero (disponibile), R=richiesta, T=tagliato, B=bloccato, P=posato, E=eliminato. NULL legacy (NP).';



COMMENT ON COLUMN "public"."inca_cavi"."from_file_id" IS 'Fichier INCA d’origine (inca_files.id).';



COMMENT ON COLUMN "public"."inca_cavi"."metri_previsti" IS 'Metri previsti pour ce cavo (copie de metri_totali).';



COMMENT ON COLUMN "public"."inca_cavi"."metri_posati_teorici" IS 'Metri considérés comme posés selon INCA (100% si P, 0 si T, etc.).';



COMMENT ON COLUMN "public"."inca_cavi"."metri_totali" IS 'MLF / Metri totali du cavo.';



CREATE TABLE IF NOT EXISTS "public"."rapportino_inca_cavi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rapportino_id" "uuid" NOT NULL,
    "inca_cavo_id" "uuid" NOT NULL,
    "metri_posati" numeric(12,2) DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "progress_percent" numeric DEFAULT 100 NOT NULL,
    "step_type" "public"."cavo_step_type" DEFAULT 'POSA'::"public"."cavo_step_type",
    "codice_cache" "text",
    "costr_cache" "text",
    "commessa_cache" "text",
    "report_date_cache" "date",
    "posa_date" "date",
    "progress_side" "text" DEFAULT 'DA'::"text" NOT NULL,
    CONSTRAINT "rapportino_inca_cavi_posa_allowed_values" CHECK ((("step_type" <> 'POSA'::"public"."cavo_step_type") OR ("progress_percent" IS NULL) OR ("progress_percent" = ANY (ARRAY[(50)::numeric, (70)::numeric, (100)::numeric])))),
    CONSTRAINT "rapportino_inca_cavi_progress_side_check" CHECK ((("progress_side" IS NULL) OR ("progress_side" = ANY (ARRAY['DA'::"text", 'A'::"text"])))),
    CONSTRAINT "rapportino_inca_cavi_ripresa_must_be_100" CHECK ((("step_type" <> 'RIPRESA'::"public"."cavo_step_type") OR ("progress_percent" = (100)::numeric))),
    CONSTRAINT "rapportino_inca_ripresa_100_check" CHECK ((("step_type" <> 'RIPRESA'::"public"."cavo_step_type") OR ("progress_percent" = (100)::numeric))),
    CONSTRAINT "rapportino_inca_step_check" CHECK (("step_type" = ANY (ARRAY['POSA'::"public"."cavo_step_type", 'RIPRESA'::"public"."cavo_step_type"])))
);


ALTER TABLE "public"."rapportino_inca_cavi" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rapportino_inca_cavi"."step_type" IS 'Step del cavo nel rapportino. Può essere NULL al momento del collegamento; viene valorizzato in fase di compilazione.';



CREATE OR REPLACE VIEW "public"."archive_rapportino_inca_cavi_v1" AS
 SELECT "ric"."id" AS "link_id",
    "ric"."rapportino_id",
    "r"."status",
    "r"."report_date",
    "r"."costr",
    "r"."commessa",
    "ric"."step_type",
    "ric"."progress_percent",
    "ric"."metri_posati",
    "ric"."posa_date",
    "ric"."note",
    "ric"."codice_cache",
    "ric"."costr_cache",
    "ric"."commessa_cache",
    "ric"."report_date_cache",
    "ric"."inca_cavo_id",
    "c"."inca_file_id",
    "c"."codice",
    "c"."descrizione",
    "c"."zona_da",
    "c"."zona_a",
    "c"."apparato_da",
    "c"."apparato_a",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."situazione",
    "c"."marca_cavo"
   FROM (("public"."rapportino_inca_cavi" "ric"
     JOIN "public"."rapportini" "r" ON (("r"."id" = "ric"."rapportino_id")))
     LEFT JOIN "public"."inca_cavi" "c" ON (("c"."id" = "ric"."inca_cavo_id")));


ALTER VIEW "public"."archive_rapportino_inca_cavi_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalogo_attivita" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "categoria" "text" NOT NULL,
    "descrizione" "text" NOT NULL,
    "activity_type" "public"."activity_type" NOT NULL,
    "unit" "public"."activity_unit" DEFAULT 'NONE'::"public"."activity_unit" NOT NULL,
    "previsto_value" numeric,
    "is_active" boolean DEFAULT true NOT NULL,
    "synonyms" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_kpi" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."catalogo_attivita" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalogo_ship_commessa_attivita" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "commessa" "text" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "previsto_value" numeric,
    "unit_override" "public"."activity_unit",
    "is_active" boolean DEFAULT true NOT NULL,
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalogo_ship_commessa_attivita" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rapportino_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rapportino_id" "uuid" NOT NULL,
    "row_index" integer DEFAULT 0 NOT NULL,
    "categoria" "text",
    "descrizione" "text",
    "operatori" "text",
    "tempo" "text",
    "previsto" numeric,
    "prodotto" numeric,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activity_id" "uuid",
    "position" integer
);


ALTER TABLE "public"."rapportino_rows" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."archive_rapportino_rows_v1" AS
 SELECT "rr"."id",
    "rr"."rapportino_id",
    "rr"."row_index",
    "rr"."categoria",
    "rr"."descrizione",
    "rr"."operatori",
    "rr"."tempo",
    COALESCE("rr"."previsto", "csca"."previsto_value", "ca"."previsto_value") AS "previsto",
    "rr"."prodotto",
    "rr"."note",
    "rr"."created_at",
    "rr"."updated_at",
    "rr"."activity_id",
    COALESCE("ca"."activity_type", "ca_global"."activity_type") AS "activity_type",
    COALESCE("ca"."unit", "ca_global"."unit") AS "unit",
    COALESCE("csca"."previsto_value", "ca_global"."previsto_value") AS "previsto_catalog_value",
    COALESCE("csca"."is_active", "ca_global"."is_active", false) AS "catalog_is_active"
   FROM ((((("public"."rapportino_rows" "rr"
     JOIN "public"."rapportini" "r" ON (("r"."id" = "rr"."rapportino_id")))
     LEFT JOIN LATERAL ( SELECT "sh"."id" AS "ship_id"
           FROM "public"."ships" "sh"
          WHERE (("sh"."costr" = "r"."costr") AND ("sh"."commessa" = "r"."commessa"))
          ORDER BY "sh"."is_active" DESC, "sh"."created_at" DESC
         LIMIT 1) "s" ON (true))
     LEFT JOIN "public"."catalogo_ship_commessa_attivita" "csca" ON ((("csca"."ship_id" = "s"."ship_id") AND ("csca"."commessa" = "r"."commessa") AND ("csca"."activity_id" = "rr"."activity_id"))))
     LEFT JOIN "public"."catalogo_attivita" "ca_global" ON (("ca_global"."id" = "rr"."activity_id")))
     LEFT JOIN "public"."catalogo_attivita" "ca" ON (("ca"."id" = "rr"."activity_id")));


ALTER VIEW "public"."archive_rapportino_rows_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."capo_ship_expected_operators" (
    "plan_date" "date" NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."capo_ship_expected_operators" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."capo_expected_operators_today_v1" AS
 SELECT "e"."plan_date",
    "e"."ship_id",
    "e"."operator_id",
    COALESCE(NULLIF(TRIM(BOTH FROM "concat_ws"(' '::"text", "o"."nome", "o"."cognome")), ''::"text"), NULLIF(TRIM(BOTH FROM "o"."name"), ''::"text"), "o"."operator_code") AS "operator_name",
    "o"."operator_code"
   FROM ("public"."capo_ship_expected_operators" "e"
     JOIN "public"."operators" "o" ON (("o"."id" = "e"."operator_id")))
  WHERE ("e"."capo_id" = "auth"."uid"());


ALTER VIEW "public"."capo_expected_operators_today_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."capo_my_team_v1" AS
 SELECT "m"."operator_id",
    "s"."capo_id",
    "p"."id" AS "plan_id",
    "o"."name" AS "operator_name",
    "m"."position" AS "operator_position",
    "s"."id" AS "slot_id"
   FROM ((("public"."manager_plans" "p"
     JOIN "public"."plan_capo_slots" "s" ON (("s"."plan_id" = "p"."id")))
     JOIN "public"."plan_slot_members" "m" ON (("m"."slot_id" = "s"."id")))
     JOIN "public"."operators" "o" ON (("o"."id" = "m"."operator_id")))
  WHERE (("p"."period_type" = 'DAY'::"public"."plan_period_type") AND ("p"."plan_date" = CURRENT_DATE) AND ("p"."status" = ANY (ARRAY['PUBLISHED'::"public"."plan_status", 'FROZEN'::"public"."plan_status"])) AND ("s"."capo_id" = "auth"."uid"()));


ALTER VIEW "public"."capo_my_team_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."capo_my_team_v1" IS 'CAPO: operators assigned by Manager for today (DAY plan) for statuses PUBLISHED or FROZEN.';



CREATE OR REPLACE VIEW "public"."operators_display_v1" AS
 SELECT "id",
    "name" AS "legacy_name",
    "roles",
    "cognome",
    "nome",
    "birth_date",
    "operator_code",
    COALESCE(NULLIF(TRIM(BOTH FROM "concat_ws"(' '::"text", "cognome", "nome")), ''::"text"), NULLIF(TRIM(BOTH FROM "name"), ''::"text"), '—'::"text") AS "display_name",
    "created_by",
    "created_at",
    "updated_at"
   FROM "public"."operators" "o";


ALTER VIEW "public"."operators_display_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."operators_display_v1" IS 'Operators canonical display: prefer cognome+nome; fallback name. operator_code expected as cognome_YYYYMMDD (manual).';



CREATE OR REPLACE VIEW "public"."capo_my_team_v2" AS
 SELECT "m"."operator_id",
    "s"."capo_id",
    "p"."id" AS "plan_id",
    "od"."display_name" AS "operator_display_name",
    "od"."cognome",
    "od"."nome",
    "m"."position" AS "operator_position",
    "s"."id" AS "slot_id"
   FROM ((("public"."manager_plans" "p"
     JOIN "public"."plan_capo_slots" "s" ON (("s"."plan_id" = "p"."id")))
     JOIN "public"."plan_slot_members" "m" ON (("m"."slot_id" = "s"."id")))
     JOIN "public"."operators_display_v1" "od" ON (("od"."id" = "m"."operator_id")))
  WHERE (("p"."period_type" = 'DAY'::"public"."plan_period_type") AND ("p"."plan_date" = CURRENT_DATE) AND ("p"."status" = ANY (ARRAY['PUBLISHED'::"public"."plan_status", 'FROZEN'::"public"."plan_status"])) AND ("s"."capo_id" = "auth"."uid"()));


ALTER VIEW "public"."capo_my_team_v2" OWNER TO "postgres";


COMMENT ON VIEW "public"."capo_my_team_v2" IS 'CAPO perimeter: operators assigned today (manager plan), canonical operator_id + display_name; filtered by auth.uid() = capo_id.';



CREATE OR REPLACE VIEW "public"."capo_returned_inbox_v1" AS
 SELECT "id",
    "capo_id",
    "crew_role",
    "report_date",
    "costr",
    "commessa",
    "updated_at"
   FROM "public"."rapportini"
  WHERE ("status" = 'RETURNED'::"text");


ALTER VIEW "public"."capo_returned_inbox_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."capo_ship_assignments" (
    "plan_date" "date" NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "position" smallint DEFAULT 1 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "capo_ship_assignments_position_check" CHECK (("position" = ANY (ARRAY[1, 2])))
);


ALTER TABLE "public"."capo_ship_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."capo_ship_attendance" (
    "plan_date" "date" NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "capo_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "status" "text" DEFAULT 'PRESENT'::"text" NOT NULL,
    "note" "text",
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "capo_ship_attendance_status_check" CHECK (("status" = ANY (ARRAY['PRESENT'::"text", 'ABSENT'::"text", 'LATE'::"text"])))
);


ALTER TABLE "public"."capo_ship_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."capo_team_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "plan_date" "date" NOT NULL,
    "source_plan_id" "uuid",
    "status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "capo_team_days_status_chk" CHECK (("status" = ANY (ARRAY['DRAFT'::"text", 'LOCKED'::"text"])))
);


ALTER TABLE "public"."capo_team_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."capo_team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "planned_minutes" integer DEFAULT 480 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "role_tag" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "capo_team_members_minutes_chk" CHECK ((("planned_minutes" >= 0) AND ("planned_minutes" <= (24 * 60))))
);


ALTER TABLE "public"."capo_team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."capo_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_day_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "deck" "text",
    "zona" "text",
    "activity_code" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."capo_teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."capo_team_day_full_v1" AS
 SELECT "d"."id" AS "team_day_id",
    "d"."capo_id",
    "d"."ship_id",
    "d"."plan_date",
    "d"."status",
    "d"."note" AS "day_note",
    "d"."created_at" AS "day_created_at",
    "d"."updated_at" AS "day_updated_at",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "t"."position" AS "team_position",
    "t"."deck" AS "team_deck",
    "t"."zona" AS "team_zona",
    "t"."activity_code" AS "team_activity_code",
    "t"."note" AS "team_note",
    "m"."id" AS "member_id",
    "m"."operator_id",
    "m"."planned_minutes",
    "m"."position" AS "member_position",
    "m"."role_tag" AS "member_role_tag"
   FROM (("public"."capo_team_days" "d"
     LEFT JOIN "public"."capo_teams" "t" ON (("t"."team_day_id" = "d"."id")))
     LEFT JOIN "public"."capo_team_members" "m" ON (("m"."team_id" = "t"."id")));


ALTER VIEW "public"."capo_team_day_full_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."capo_today_ship_assignments_v1" AS
 SELECT CURRENT_DATE AS "plan_date",
    "sc"."ship_id",
    "s"."costr",
    "s"."commessa",
    "s"."code" AS "ship_code",
    "s"."name" AS "ship_name",
    ("row_number"() OVER (PARTITION BY "sc"."capo_id" ORDER BY "sc"."created_at", "sc"."ship_id"))::smallint AS "position"
   FROM ("public"."ship_capos" "sc"
     JOIN "public"."ships" "s" ON (("s"."id" = "sc"."ship_id")))
  WHERE ("sc"."capo_id" = "auth"."uid"());


ALTER VIEW "public"."capo_today_ship_assignments_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."capo_today_ship_assignments_v1" IS 'CAPO ships for UI "today": derived from persistent ship_capos; plan_date is always CURRENT_DATE for front compatibility.';



CREATE OR REPLACE VIEW "public"."catalogo_ship_commessa_attivita_public_v1" AS
 SELECT "csca"."id" AS "catalogo_item_id",
    "csca"."ship_id",
    "s"."code" AS "ship_code",
    "s"."name" AS "ship_name",
    "csca"."commessa",
    "csca"."activity_id",
    "ca"."categoria",
    "ca"."descrizione",
    "ca"."activity_type",
    "ca"."unit" AS "unit_default",
    "csca"."unit_override",
    COALESCE("csca"."unit_override", "ca"."unit") AS "unit_effective",
    "csca"."previsto_value",
    "csca"."is_active",
    "csca"."note",
    "csca"."created_at",
    "csca"."updated_at"
   FROM (("public"."catalogo_ship_commessa_attivita" "csca"
     JOIN "public"."catalogo_attivita" "ca" ON (("ca"."id" = "csca"."activity_id")))
     JOIN "public"."ships" "s" ON (("s"."id" = "csca"."ship_id")));


ALTER VIEW "public"."catalogo_ship_commessa_attivita_public_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cncs_signal_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rapportino_id" "uuid" NOT NULL,
    "scope" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "request_id" "uuid",
    "validated" boolean DEFAULT true NOT NULL,
    "warn_count" integer DEFAULT 0 NOT NULL,
    "block_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "cncs_signal_runs_scope_check" CHECK (("scope" = ANY (ARRAY['CAPO_VALIDATION'::"text", 'UFFICIO_APPROVAL'::"text", 'MANUAL'::"text"])))
);


ALTER TABLE "public"."cncs_signal_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cncs_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "rapportino_id" "uuid" NOT NULL,
    "scope" "text" NOT NULL,
    "code" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "row_ids" "uuid"[],
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cncs_signals_scope_check" CHECK (("scope" = ANY (ARRAY['CAPO_VALIDATION'::"text", 'UFFICIO_APPROVAL'::"text", 'MANUAL'::"text"]))),
    CONSTRAINT "cncs_signals_severity_check" CHECK (("severity" = ANY (ARRAY['INFO'::"text", 'WARN'::"text", 'BLOCK'::"text"])))
);


ALTER TABLE "public"."cncs_signals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_drive_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "file_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "note" "text",
    "request_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prev_event_id" "uuid",
    CONSTRAINT "core_drive_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['UPLOAD'::"text", 'SOFT_DELETE'::"text", 'FREEZE'::"text", 'NOTE'::"text", 'TAG'::"text"])))
);


ALTER TABLE "public"."core_drive_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."core_drive_events" IS 'CORE Drive — registre canonique append-only (naval-grade).';



COMMENT ON COLUMN "public"."core_drive_events"."event_type" IS 'Exemples: UPLOAD, SOFT_DELETE, RESTORE, FREEZE, UNFREEZE, TAG, NOTE, MOVE, SIGNED_URL_ISSUED.';



CREATE TABLE IF NOT EXISTS "public"."core_file_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "core_file_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "performed_by" "uuid",
    "performed_role" "text",
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "note" "text"
);


ALTER TABLE "public"."core_file_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "storage_bucket" "text" DEFAULT 'core-drive'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "sha256" "text",
    "cantiere" "text" NOT NULL,
    "commessa" "text",
    "categoria" "public"."doc_categoria" NOT NULL,
    "origine" "public"."doc_origine" DEFAULT 'SYSTEM'::"public"."doc_origine" NOT NULL,
    "stato_doc" "public"."doc_stato" DEFAULT 'BOZZA'::"public"."doc_stato" NOT NULL,
    "rapportino_id" "uuid",
    "inca_file_id" "uuid",
    "inca_cavo_id" "uuid",
    "operator_id" "uuid",
    "deck" "text",
    "zona" "text",
    "settimana_iso" integer,
    "kpi_ref" "text",
    "note" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "version_num" integer DEFAULT 1,
    "version_of" "uuid",
    "frozen_at" timestamp with time zone,
    "retention_until" timestamp with time zone,
    "anomaly_code" "text",
    "claim_id" "text"
);


ALTER TABLE "public"."core_files" OWNER TO "postgres";


COMMENT ON COLUMN "public"."core_files"."kpi_ref" IS 'Référence KPI Direction';



COMMENT ON COLUMN "public"."core_files"."version_num" IS 'Version du document (1,2,3…)';



COMMENT ON COLUMN "public"."core_files"."version_of" IS 'Référence vers la version précédente';



COMMENT ON COLUMN "public"."core_files"."frozen_at" IS 'Date de gel juridique (plus aucune modification)';



COMMENT ON COLUMN "public"."core_files"."retention_until" IS 'Date minimum de conservation légale';



COMMENT ON COLUMN "public"."core_files"."anomaly_code" IS 'Code anomalie qualité';



COMMENT ON COLUMN "public"."core_files"."claim_id" IS 'Identifiant réclamation / extra';



CREATE TABLE IF NOT EXISTS "public"."core_meta" (
    "key" "text" DEFAULT 'CORE_DB'::"text" NOT NULL,
    "db_version" "text" NOT NULL,
    "note" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."core_meta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inca_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "costr" "text",
    "commessa" "text",
    "project_code" "text",
    "file_name" "text" NOT NULL,
    "file_type" "text" DEFAULT 'PDF'::"text" NOT NULL,
    "note" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_path" "text",
    "ship_id" "uuid",
    "group_key" "text",
    "content_hash" "text",
    "previous_inca_file_id" "uuid",
    "import_run_id" "uuid",
    CONSTRAINT "inca_files_file_type_check" CHECK (("file_type" = ANY (ARRAY['PDF'::"text", 'XLSX'::"text"])))
);


ALTER TABLE "public"."inca_files" OWNER TO "postgres";


COMMENT ON TABLE "public"."inca_files" IS 'Fichiers INCA importés (PDF/Excel/photo).';



COMMENT ON COLUMN "public"."inca_files"."costr" IS 'Costruttore / nave (ex: 1234).';



COMMENT ON COLUMN "public"."inca_files"."commessa" IS 'Commessa (ex: COMM-001).';



COMMENT ON COLUMN "public"."inca_files"."file_name" IS 'Nom du fichier original (ex: rapportino_20251124.pdf)';



COMMENT ON COLUMN "public"."inca_files"."file_type" IS 'Type MIME (application/pdf, application/vnd.ms-excel, image/png, …)';



COMMENT ON COLUMN "public"."inca_files"."uploaded_at" IS 'Date/heure import INCA.';



COMMENT ON COLUMN "public"."inca_files"."file_path" IS 'Chemin dans le storage Supabase.';



CREATE OR REPLACE VIEW "public"."direzione_inca_teorico" AS
 WITH "base" AS (
         SELECT "f"."id" AS "inca_file_id",
            "f"."file_name" AS "nome_file",
            "f"."uploaded_at" AS "caricato_il",
            "f"."costr",
            "f"."commessa",
            "c"."id" AS "cavo_id",
            "c"."codice" AS "codice_cavo",
            "c"."situazione",
            (NULLIF(TRIM(BOTH FROM ("c"."metri_teo")::"text"), ''::"text"))::numeric AS "metri_teo_n",
            (NULLIF(TRIM(BOTH FROM ("c"."metri_dis")::"text"), ''::"text"))::numeric AS "metri_dis_n"
           FROM ("public"."inca_files" "f"
             JOIN "public"."inca_cavi" "c" ON (("c"."inca_file_id" = "f"."id")))
        ), "agg" AS (
         SELECT "base"."inca_file_id",
            "base"."nome_file",
            "base"."caricato_il",
            "base"."costr",
            "base"."commessa",
            (COALESCE("sum"("base"."metri_teo_n"), (0)::numeric))::numeric(14,2) AS "metri_previsti_totali",
            (COALESCE("sum"("base"."metri_dis_n"), (0)::numeric))::numeric(14,2) AS "metri_realizzati",
            (COALESCE("sum"(
                CASE
                    WHEN ("base"."situazione" = 'P'::"text") THEN "base"."metri_dis_n"
                    ELSE (0)::numeric
                END), (0)::numeric))::numeric(14,2) AS "metri_posati",
            ("count"(*))::integer AS "cavi_totali",
            ("count"(*) FILTER (WHERE ("base"."metri_teo_n" IS NOT NULL)))::integer AS "cavi_con_metri_previsti",
            ("count"(*) FILTER (WHERE ("base"."metri_dis_n" IS NOT NULL)))::integer AS "cavi_con_metri_realizzati",
            ("count"(*) FILTER (WHERE (("base"."situazione" = 'P'::"text") AND ("base"."metri_dis_n" IS NOT NULL))))::integer AS "cavi_posati_con_metri",
                CASE
                    WHEN ("count"(*) = 0) THEN (0)::numeric
                    ELSE "round"(((100.0 * ("count"(*) FILTER (WHERE ("base"."metri_teo_n" IS NOT NULL)))::numeric) / ("count"(*))::numeric), 2)
                END AS "pct_previsti_compilati",
                CASE
                    WHEN ("count"(*) = 0) THEN (0)::numeric
                    ELSE "round"(((100.0 * ("count"(*) FILTER (WHERE ("base"."metri_dis_n" IS NOT NULL)))::numeric) / ("count"(*))::numeric), 2)
                END AS "pct_realizzati_compilati"
           FROM "base"
          GROUP BY "base"."inca_file_id", "base"."nome_file", "base"."caricato_il", "base"."costr", "base"."commessa"
        )
 SELECT "inca_file_id",
    "nome_file",
    "caricato_il",
    "costr",
    "commessa",
    "metri_previsti_totali",
    "metri_realizzati",
    "metri_posati",
    "cavi_totali",
    "cavi_con_metri_previsti",
    "cavi_con_metri_realizzati",
    "cavi_posati_con_metri",
    "pct_previsti_compilati",
    "pct_realizzati_compilati"
   FROM "agg";


ALTER VIEW "public"."direzione_inca_teorico" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_inca_teorico" IS 'Direzione: agrégation INCA par fichier (previsti/realizzati/posati) + indicateurs de complétude. Source: inca_files + inca_cavi.';



CREATE OR REPLACE VIEW "public"."direzione_inca_vs_rapportini" AS
 SELECT "c"."id" AS "inca_cavo_id",
    "c"."codice" AS "codice_cavo",
    "c"."descrizione" AS "descrizione_cavo",
    "c"."metri_previsti",
    "c"."situazione",
    "c"."metri_posati_teorici",
    COALESCE("sum"("rc"."metri_posati"), (0)::numeric) AS "metri_posati_da_rapportini",
    (COALESCE("sum"("rc"."metri_posati"), (0)::numeric) - COALESCE("c"."metri_posati_teorici", (0)::numeric)) AS "delta_campo_vs_inca"
   FROM ("public"."inca_cavi" "c"
     LEFT JOIN "archive"."rapportino_cavi" "rc" ON (("rc"."inca_cavo_id" = "c"."id")))
  GROUP BY "c"."id", "c"."codice", "c"."descrizione", "c"."metri_previsti", "c"."situazione", "c"."metri_posati_teorici";


ALTER VIEW "public"."direzione_inca_vs_rapportini" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_inca_vs_rapportini" IS 'Comparaison INCA (teorico/posato) vs metri posati remontés par les rapportini (rapportino_cavi).';



CREATE TABLE IF NOT EXISTS "public"."rapportino_row_operators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rapportino_row_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "line_index" integer NOT NULL,
    "tempo_raw" "text",
    "tempo_hours" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rapportino_row_operators" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."direzione_operator_facts_v3" AS
 WITH "rap" AS (
         SELECT "r"."id" AS "rapportino_id",
            "r"."report_date",
            "r"."status",
            "r"."capo_id",
            NULLIF(TRIM(BOTH FROM "r"."costr"), ''::"text") AS "costr",
            NULLIF(TRIM(BOTH FROM "r"."commessa"), ''::"text") AS "commessa",
            NULLIF(TRIM(BOTH FROM "r"."costr"), ''::"text") AS "costr_norm",
            NULLIF(TRIM(BOTH FROM "r"."commessa"), ''::"text") AS "commessa_norm"
           FROM "public"."rapportini" "r"
          WHERE (("r"."status" = 'APPROVED_UFFICIO'::"text") AND ("r"."report_date" IS NOT NULL))
        ), "righe" AS (
         SELECT "rr_1"."id" AS "rapportino_row_id",
            "rr_1"."rapportino_id",
            "rr_1"."row_index",
            NULLIF(TRIM(BOTH FROM "rr_1"."categoria"), ''::"text") AS "categoria",
            NULLIF(TRIM(BOTH FROM "rr_1"."descrizione"), ''::"text") AS "descrizione",
            "rr_1"."previsto",
            "rr_1"."prodotto"
           FROM "public"."rapportino_rows" "rr_1"
        ), "ships_k" AS (
         SELECT "s"."id" AS "ship_id",
            NULLIF(TRIM(BOTH FROM "s"."costr"), ''::"text") AS "costr_norm",
            NULLIF(TRIM(BOTH FROM "s"."commessa"), ''::"text") AS "commessa_norm",
            "s"."code" AS "ship_code",
            "s"."name" AS "ship_name",
            "s"."is_active"
           FROM "public"."ships" "s"
        ), "ship_candidates" AS (
         SELECT "r"."rapportino_id",
            "r"."costr_norm",
            "r"."commessa_norm",
            "sk"."ship_id",
            "sk"."ship_code",
            "sk"."ship_name",
            "sk"."commessa_norm" AS "ship_commessa_norm",
                CASE
                    WHEN (("sk"."commessa_norm" IS NOT NULL) AND ("sk"."commessa_norm" = "r"."commessa_norm")) THEN 2
                    WHEN (("sk"."commessa_norm" IS NULL) OR ("sk"."commessa_norm" = ANY (ARRAY['-'::"text", ''::"text"]))) THEN 1
                    ELSE 0
                END AS "match_rank"
           FROM ("rap" "r"
             JOIN "ships_k" "sk" ON ((("sk"."is_active" = true) AND ("sk"."costr_norm" = "r"."costr_norm"))))
        ), "ship_stats" AS (
         SELECT "ship_candidates"."rapportino_id",
            "ship_candidates"."costr_norm",
            "ship_candidates"."commessa_norm",
            "count"(*) FILTER (WHERE ("ship_candidates"."match_rank" = 2)) AS "strict_n",
            "count"(*) FILTER (WHERE ("ship_candidates"."match_rank" >= 1)) AS "candidate_n",
            "count"(*) AS "costr_active_n"
           FROM "ship_candidates"
          GROUP BY "ship_candidates"."rapportino_id", "ship_candidates"."costr_norm", "ship_candidates"."commessa_norm"
        ), "ship_pick" AS (
         SELECT "c"."rapportino_id",
            ("min"(("c"."ship_id")::"text") FILTER (WHERE (("st"."strict_n" = 1) AND ("c"."match_rank" = 2))))::"uuid" AS "strict_ship_id",
            "min"("c"."ship_code") FILTER (WHERE (("st"."strict_n" = 1) AND ("c"."match_rank" = 2))) AS "strict_ship_code",
            "min"("c"."ship_name") FILTER (WHERE (("st"."strict_n" = 1) AND ("c"."match_rank" = 2))) AS "strict_ship_name",
            ("min"(("c"."ship_id")::"text") FILTER (WHERE (("st"."strict_n" = 0) AND ("st"."candidate_n" = 1) AND ("c"."match_rank" = 1))))::"uuid" AS "wildcard_ship_id",
            "min"("c"."ship_code") FILTER (WHERE (("st"."strict_n" = 0) AND ("st"."candidate_n" = 1) AND ("c"."match_rank" = 1))) AS "wildcard_ship_code",
            "min"("c"."ship_name") FILTER (WHERE (("st"."strict_n" = 0) AND ("st"."candidate_n" = 1) AND ("c"."match_rank" = 1))) AS "wildcard_ship_name",
            "max"("st"."strict_n") AS "strict_n",
            "max"("st"."candidate_n") AS "candidate_n",
            "max"("st"."costr_active_n") AS "costr_active_n"
           FROM ("ship_candidates" "c"
             JOIN "ship_stats" "st" ON ((("st"."rapportino_id" = "c"."rapportino_id") AND ("st"."costr_norm" = "c"."costr_norm") AND ("st"."commessa_norm" = "c"."commessa_norm"))))
          GROUP BY "c"."rapportino_id"
        ), "rap_with_ship" AS (
         SELECT "r"."rapportino_id",
            "r"."report_date",
            "r"."status",
            "r"."capo_id",
            "r"."costr",
            "r"."commessa",
            "sp"."strict_n",
            "sp"."candidate_n",
            "sp"."costr_active_n",
                CASE
                    WHEN ("sp"."strict_n" = 1) THEN "sp"."strict_ship_id"
                    WHEN (("sp"."strict_n" = 0) AND ("sp"."candidate_n" = 1)) THEN "sp"."wildcard_ship_id"
                    ELSE NULL::"uuid"
                END AS "ship_id",
                CASE
                    WHEN ("sp"."strict_n" = 1) THEN "sp"."strict_ship_code"
                    WHEN (("sp"."strict_n" = 0) AND ("sp"."candidate_n" = 1)) THEN "sp"."wildcard_ship_code"
                    ELSE NULL::"text"
                END AS "ship_code",
                CASE
                    WHEN ("sp"."strict_n" = 1) THEN "sp"."strict_ship_name"
                    WHEN (("sp"."strict_n" = 0) AND ("sp"."candidate_n" = 1)) THEN "sp"."wildcard_ship_name"
                    ELSE NULL::"text"
                END AS "ship_name",
                CASE
                    WHEN ("sp"."strict_n" = 1) THEN 'STRICT'::"text"
                    WHEN (("sp"."strict_n" = 0) AND ("sp"."candidate_n" = 1)) THEN 'COSTR_ONLY'::"text"
                    WHEN ("sp"."candidate_n" > 1) THEN 'AMBIGUOUS_COSTR'::"text"
                    ELSE 'NO_SHIP'::"text"
                END AS "ship_match_mode"
           FROM ("rap" "r"
             LEFT JOIN "ship_pick" "sp" ON (("sp"."rapportino_id" = "r"."rapportino_id")))
        ), "ship_mgr" AS (
         SELECT "sm"."ship_id",
            "sm"."manager_id"
           FROM "public"."ship_managers" "sm"
        ), "attivita" AS (
         SELECT "ca"."id" AS "attivita_id",
            "lower"(TRIM(BOTH FROM "ca"."categoria")) AS "cat_key",
            "lower"(TRIM(BOTH FROM "ca"."descrizione")) AS "desc_key",
            "ca"."activity_type",
            "ca"."unit"
           FROM "public"."catalogo_attivita" "ca"
          WHERE ("ca"."is_active" = true)
        ), "ops" AS (
         SELECT "ro"."id" AS "op_row_id",
            "ro"."rapportino_row_id",
            "ro"."operator_id",
            "ro"."line_index",
            "ro"."tempo_hours"
           FROM "public"."rapportino_row_operators" "ro"
        ), "line_hours" AS (
         SELECT "o_1"."rapportino_row_id",
            "sum"("o_1"."tempo_hours") FILTER (WHERE (("o_1"."tempo_hours" IS NOT NULL) AND ("o_1"."tempo_hours" > (0)::numeric))) AS "sum_line_hours",
            "count"(*) AS "n_tokens_total",
            "count"(*) FILTER (WHERE ("o_1"."tempo_hours" IS NULL)) AS "n_tokens_invalid",
            "count"(*) FILTER (WHERE ("o_1"."tempo_hours" = (0)::numeric)) AS "n_tokens_zero"
           FROM "ops" "o_1"
          GROUP BY "o_1"."rapportino_row_id"
        )
 SELECT "rws"."report_date",
    "rws"."rapportino_id",
    "rws"."capo_id",
    "rws"."costr",
    "rws"."commessa",
    "rws"."ship_id",
    "rws"."ship_code",
    "rws"."ship_name",
    "rws"."ship_match_mode",
    "mgr"."manager_id",
    "rr"."rapportino_row_id",
    "rr"."row_index",
    "rr"."categoria",
    "rr"."descrizione",
    "a"."attivita_id",
    "a"."activity_type",
    "a"."unit",
    "o"."operator_id",
    "o"."line_index",
    "o"."tempo_hours",
    "lh"."sum_line_hours",
    "lh"."n_tokens_total",
    "lh"."n_tokens_invalid",
    "lh"."n_tokens_zero",
    "rr"."previsto" AS "previsto_row",
    "rr"."prodotto" AS "prodotto_row",
        CASE
            WHEN ("rr"."prodotto" IS NULL) THEN NULL::numeric
            WHEN (("lh"."sum_line_hours" IS NULL) OR ("lh"."sum_line_hours" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("o"."tempo_hours" IS NULL) OR ("o"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("rr"."prodotto" * ("o"."tempo_hours" / "lh"."sum_line_hours"))
        END AS "prodotto_alloc",
        CASE
            WHEN ("rr"."previsto" IS NULL) THEN NULL::numeric
            WHEN (("lh"."sum_line_hours" IS NULL) OR ("lh"."sum_line_hours" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("o"."tempo_hours" IS NULL) OR ("o"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("rr"."previsto" * ("o"."tempo_hours" / "lh"."sum_line_hours"))
        END AS "previsto_alloc"
   FROM ((((("rap_with_ship" "rws"
     JOIN "righe" "rr" ON (("rr"."rapportino_id" = "rws"."rapportino_id")))
     LEFT JOIN "attivita" "a" ON ((("lower"(TRIM(BOTH FROM "rr"."categoria")) = "a"."cat_key") AND ("lower"(TRIM(BOTH FROM "rr"."descrizione")) = "a"."desc_key"))))
     JOIN "ops" "o" ON (("o"."rapportino_row_id" = "rr"."rapportino_row_id")))
     LEFT JOIN "line_hours" "lh" ON (("lh"."rapportino_row_id" = "rr"."rapportino_row_id")))
     LEFT JOIN "ship_mgr" "mgr" ON (("mgr"."ship_id" = "rws"."ship_id")));


ALTER VIEW "public"."direzione_operator_facts_v3" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."direzione_operator_facts_v2" AS
 SELECT "report_date",
    "rapportino_id",
    "capo_id",
    "costr",
    "commessa",
    "ship_id",
    "ship_code",
    "ship_name",
    "ship_match_mode",
    "manager_id",
    "rapportino_row_id",
    "row_index",
    "categoria",
    "descrizione",
    "attivita_id",
    "activity_type",
    "unit",
    "operator_id",
    "line_index",
    NULL::"text" AS "tempo_raw",
    "tempo_hours",
    "sum_line_hours",
    "n_tokens_total",
    "n_tokens_invalid",
    "n_tokens_zero",
    "previsto_row",
    "prodotto_row",
    "prodotto_alloc",
    "previsto_alloc"
   FROM "public"."direzione_operator_facts_v3";


ALTER VIEW "public"."direzione_operator_facts_v2" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_facts_v2" IS 'Facts opérateurs (alloc produit+previsto prorata tempo). Résolution ship via rapportini_ship_resolution_v1 (STRICT/COSTR_ONLY/non ambigu).';



CREATE OR REPLACE VIEW "public"."direzione_operator_daily_v3" AS
 SELECT "report_date",
    "operator_id",
    "capo_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "unit",
    "sum"("previsto_alloc") AS "previsto_sum",
    "sum"("prodotto_alloc") AS "prodotto_sum",
    "count"(*) AS "tokens_total",
    "count"(*) FILTER (WHERE ("tempo_hours" IS NULL)) AS "tokens_invalid",
    "count"(*) FILTER (WHERE ("tempo_hours" = (0)::numeric)) AS "tokens_zero",
    "count"(*) FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) AS "tokens_ok",
        CASE
            WHEN (("sum"("previsto_alloc") IS NULL) OR ("sum"("previsto_alloc") <= (0)::numeric)) THEN NULL::numeric
            ELSE (("sum"("prodotto_alloc") / "sum"("previsto_alloc")) * (100)::numeric)
        END AS "productivity_pct"
   FROM "public"."direzione_operator_facts_v2" "f"
  WHERE ("unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
  GROUP BY "report_date", "operator_id", "capo_id", "manager_id", "ship_id", "costr", "commessa", "unit";


ALTER VIEW "public"."direzione_operator_daily_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_daily_v3" IS 'Daily opérateur: somme des allocs (previsto_alloc/prodotto_alloc) + productivity_pct. Ship résolu en v2.';



CREATE OR REPLACE VIEW "public"."direzione_operator_facts_v1" AS
 WITH "rap" AS (
         SELECT "r"."id" AS "rapportino_id",
            "r"."report_date",
            "r"."status",
            "r"."capo_id",
            NULLIF(TRIM(BOTH FROM "r"."costr"), ''::"text") AS "costr",
            NULLIF(TRIM(BOTH FROM "r"."commessa"), ''::"text") AS "commessa"
           FROM "public"."rapportini" "r"
          WHERE (("r"."status" = 'APPROVED_UFFICIO'::"text") AND ("r"."report_date" IS NOT NULL))
        ), "righe" AS (
         SELECT "rr_1"."id" AS "rapportino_row_id",
            "rr_1"."rapportino_id",
            "rr_1"."row_index",
            NULLIF(TRIM(BOTH FROM "rr_1"."categoria"), ''::"text") AS "categoria",
            NULLIF(TRIM(BOTH FROM "rr_1"."descrizione"), ''::"text") AS "descrizione",
            "rr_1"."prodotto"
           FROM "public"."rapportino_rows" "rr_1"
        ), "ships_k" AS (
         SELECT "s"."id" AS "ship_id",
            NULLIF(TRIM(BOTH FROM "s"."costr"), ''::"text") AS "costr",
            NULLIF(TRIM(BOTH FROM "s"."commessa"), ''::"text") AS "commessa",
            "s"."code" AS "ship_code",
            "s"."name" AS "ship_name"
           FROM "public"."ships" "s"
        ), "rap_with_ship" AS (
         SELECT "rap"."rapportino_id",
            "rap"."report_date",
            "rap"."status",
            "rap"."capo_id",
            "rap"."costr",
            "rap"."commessa",
            "sk"."ship_id",
            "sk"."ship_code",
            "sk"."ship_name"
           FROM ("rap"
             LEFT JOIN "ships_k" "sk" ON ((("sk"."costr" = "rap"."costr") AND (("sk"."commessa" = "rap"."commessa") OR ((COALESCE("sk"."commessa", ''::"text") = ANY (ARRAY[''::"text", '-'::"text"])) AND (COALESCE("rap"."commessa", ''::"text") = ANY (ARRAY[''::"text", '-'::"text"])))))))
        ), "ship_mgr" AS (
         SELECT "sm"."ship_id",
            "sm"."manager_id"
           FROM "public"."ship_managers" "sm"
        ), "attivita" AS (
         SELECT "ca"."id" AS "attivita_id",
            "lower"(TRIM(BOTH FROM "ca"."categoria")) AS "cat_key",
            "lower"(TRIM(BOTH FROM "ca"."descrizione")) AS "desc_key",
            "ca"."activity_type",
            "ca"."unit"
           FROM "public"."catalogo_attivita" "ca"
          WHERE ("ca"."is_active" = true)
        ), "ops" AS (
         SELECT "ro"."id" AS "op_row_id",
            "ro"."rapportino_row_id",
            "ro"."operator_id",
            "ro"."line_index",
            "ro"."tempo_hours"
           FROM "public"."rapportino_row_operators" "ro"
        ), "line_hours" AS (
         SELECT "o_1"."rapportino_row_id",
            "sum"("o_1"."tempo_hours") FILTER (WHERE (("o_1"."tempo_hours" IS NOT NULL) AND ("o_1"."tempo_hours" > (0)::numeric))) AS "sum_line_hours",
            "count"(*) AS "n_tokens_total",
            "count"(*) FILTER (WHERE ("o_1"."tempo_hours" IS NULL)) AS "n_tokens_invalid",
            "count"(*) FILTER (WHERE (("o_1"."tempo_hours" IS NOT NULL) AND ("o_1"."tempo_hours" = (0)::numeric))) AS "n_tokens_zero"
           FROM "ops" "o_1"
          GROUP BY "o_1"."rapportino_row_id"
        )
 SELECT "rws"."report_date",
    "rws"."rapportino_id",
    "rws"."capo_id",
    "rws"."costr",
    "rws"."commessa",
    "rws"."ship_id",
    "rws"."ship_code",
    "rws"."ship_name",
    "mgr"."manager_id",
    "rr"."rapportino_row_id",
    "rr"."row_index",
    "rr"."categoria",
    "rr"."descrizione",
    "a"."attivita_id",
    "a"."activity_type",
    "a"."unit",
    "o"."operator_id",
    "o"."line_index",
    "o"."tempo_hours",
    "lh"."sum_line_hours",
    "lh"."n_tokens_total",
    "lh"."n_tokens_invalid",
    "lh"."n_tokens_zero",
    "rr"."prodotto" AS "prodotto_row",
        CASE
            WHEN ("rr"."prodotto" IS NULL) THEN NULL::numeric
            WHEN (("lh"."sum_line_hours" IS NULL) OR ("lh"."sum_line_hours" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("o"."tempo_hours" IS NULL) OR ("o"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("rr"."prodotto" * ("o"."tempo_hours" / "lh"."sum_line_hours"))
        END AS "prodotto_alloc"
   FROM ((((("rap_with_ship" "rws"
     JOIN "righe" "rr" ON (("rr"."rapportino_id" = "rws"."rapportino_id")))
     LEFT JOIN "attivita" "a" ON ((("lower"(TRIM(BOTH FROM "rr"."categoria")) = "a"."cat_key") AND ("lower"(TRIM(BOTH FROM "rr"."descrizione")) = "a"."desc_key"))))
     JOIN "ops" "o" ON (("o"."rapportino_row_id" = "rr"."rapportino_row_id")))
     LEFT JOIN "line_hours" "lh" ON (("lh"."rapportino_row_id" = "rr"."rapportino_row_id")))
     LEFT JOIN "ship_mgr" "mgr" ON (("mgr"."ship_id" = "rws"."ship_id")));


ALTER VIEW "public"."direzione_operator_facts_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_facts_v1" IS 'Direction operator facts: approved rapportini -> rows -> row_operators; prodotto_alloc prorata tempo_hours; ship via ships(costr,commessa); manager via ship_managers(ship_id).';



CREATE OR REPLACE VIEW "public"."direzione_operator_facts_v4" AS
 WITH "rap" AS (
         SELECT "r"."id" AS "rapportino_id",
            "r"."report_date",
            "r"."status",
            "r"."capo_id",
            NULLIF(TRIM(BOTH FROM "r"."costr"), ''::"text") AS "costr_raw",
            NULLIF(TRIM(BOTH FROM "r"."commessa"), ''::"text") AS "commessa_raw"
           FROM "public"."rapportini" "r"
          WHERE (("r"."report_date" IS NOT NULL) AND ("r"."status" = 'APPROVED_UFFICIO'::"text"))
        ), "rap_norm" AS (
         SELECT "rap"."rapportino_id",
            "rap"."report_date",
            "rap"."status",
            "rap"."capo_id",
            NULLIF(TRIM(BOTH FROM "rap"."costr_raw"), ''::"text") AS "costr_norm",
                CASE
                    WHEN ("rap"."commessa_raw" IS NULL) THEN NULL::"text"
                    WHEN (TRIM(BOTH FROM "rap"."commessa_raw") = ANY (ARRAY[''::"text", '-'::"text"])) THEN NULL::"text"
                    ELSE TRIM(BOTH FROM "rap"."commessa_raw")
                END AS "commessa_norm"
           FROM "rap"
        ), "righe" AS (
         SELECT "rr_1"."id" AS "rapportino_row_id",
            "rr_1"."rapportino_id",
            "rr_1"."row_index",
            NULLIF(TRIM(BOTH FROM "rr_1"."categoria"), ''::"text") AS "categoria",
            NULLIF(TRIM(BOTH FROM "rr_1"."descrizione"), ''::"text") AS "descrizione",
            "rr_1"."previsto",
            "rr_1"."prodotto"
           FROM "public"."rapportino_rows" "rr_1"
        ), "attivita" AS (
         SELECT "ca"."id" AS "attivita_id",
            "lower"(TRIM(BOTH FROM "ca"."categoria")) AS "cat_key",
            "lower"(TRIM(BOTH FROM "ca"."descrizione")) AS "desc_key",
            "ca"."activity_type",
            "ca"."unit"
           FROM "public"."catalogo_attivita" "ca"
          WHERE ("ca"."is_active" = true)
        ), "ops" AS (
         SELECT "ro"."id" AS "op_row_id",
            "ro"."rapportino_row_id",
            "ro"."operator_id",
            "ro"."line_index",
            "ro"."tempo_hours"
           FROM "public"."rapportino_row_operators" "ro"
        ), "line_hours" AS (
         SELECT "o_1"."rapportino_row_id",
            "sum"("o_1"."tempo_hours") FILTER (WHERE (("o_1"."tempo_hours" IS NOT NULL) AND ("o_1"."tempo_hours" > (0)::numeric))) AS "sum_line_hours",
            "count"(*) AS "n_tokens_total",
            "count"(*) FILTER (WHERE ("o_1"."tempo_hours" IS NULL)) AS "n_tokens_invalid",
            "count"(*) FILTER (WHERE ("o_1"."tempo_hours" = (0)::numeric)) AS "n_tokens_zero"
           FROM "ops" "o_1"
          GROUP BY "o_1"."rapportino_row_id"
        ), "ships_active" AS (
         SELECT "s"."id" AS "ship_id",
            NULLIF(TRIM(BOTH FROM "s"."costr"), ''::"text") AS "costr_norm",
                CASE
                    WHEN ("s"."commessa" IS NULL) THEN NULL::"text"
                    WHEN (TRIM(BOTH FROM "s"."commessa") = ANY (ARRAY[''::"text", '-'::"text"])) THEN NULL::"text"
                    ELSE TRIM(BOTH FROM "s"."commessa")
                END AS "commessa_norm",
            "s"."code" AS "ship_code",
            "s"."name" AS "ship_name"
           FROM "public"."ships" "s"
          WHERE ("s"."is_active" = true)
        ), "ship_stats" AS (
         SELECT "rn"."rapportino_id",
            "rn"."costr_norm",
            "rn"."commessa_norm",
            "count"(*) FILTER (WHERE (("sa"."costr_norm" = "rn"."costr_norm") AND (NOT ("sa"."commessa_norm" IS DISTINCT FROM "rn"."commessa_norm")))) AS "strict_n",
            "count"(*) FILTER (WHERE ("sa"."costr_norm" = "rn"."costr_norm")) AS "costr_active_n",
            ("array_agg"("sa"."ship_id" ORDER BY "sa"."ship_id") FILTER (WHERE (("sa"."costr_norm" = "rn"."costr_norm") AND (NOT ("sa"."commessa_norm" IS DISTINCT FROM "rn"."commessa_norm")))))[1] AS "strict_ship_id",
            ("array_agg"("sa"."ship_id" ORDER BY "sa"."ship_id") FILTER (WHERE ("sa"."costr_norm" = "rn"."costr_norm")))[1] AS "costr_only_ship_id"
           FROM ("rap_norm" "rn"
             LEFT JOIN "ships_active" "sa" ON (("sa"."costr_norm" = "rn"."costr_norm")))
          GROUP BY "rn"."rapportino_id", "rn"."costr_norm", "rn"."commessa_norm"
        ), "rap_with_ship" AS (
         SELECT "rn"."rapportino_id",
            "rn"."report_date",
            "rn"."capo_id",
            "rn"."costr_norm" AS "costr",
            "rn"."commessa_norm" AS "commessa",
                CASE
                    WHEN ("ss"."strict_n" = 1) THEN "ss"."strict_ship_id"
                    WHEN (("ss"."strict_n" = 0) AND ("ss"."costr_active_n" = 1)) THEN "ss"."costr_only_ship_id"
                    ELSE NULL::"uuid"
                END AS "ship_id",
                CASE
                    WHEN ("ss"."strict_n" = 1) THEN 'STRICT'::"text"
                    WHEN (("ss"."strict_n" = 0) AND ("ss"."costr_active_n" = 1)) THEN 'COSTR_ONLY'::"text"
                    WHEN (("ss"."costr_active_n" IS NULL) OR ("ss"."costr_active_n" = 0)) THEN 'NO_SHIP'::"text"
                    ELSE 'AMBIGUOUS_COSTR'::"text"
                END AS "ship_match_mode"
           FROM ("rap_norm" "rn"
             LEFT JOIN "ship_stats" "ss" ON (("ss"."rapportino_id" = "rn"."rapportino_id")))
        ), "ship_dim" AS (
         SELECT "ships_active"."ship_id",
            "ships_active"."ship_code",
            "ships_active"."ship_name"
           FROM "ships_active"
        ), "ship_mgr" AS (
         SELECT "sm"."ship_id",
            "sm"."manager_id"
           FROM "public"."ship_managers" "sm"
        )
 SELECT "rws"."report_date",
    "rws"."rapportino_id",
    "rws"."capo_id",
    "rws"."costr",
    "rws"."commessa",
    "rws"."ship_id",
    "sd"."ship_code",
    "sd"."ship_name",
    "rws"."ship_match_mode",
    "mgr"."manager_id",
    "rr"."rapportino_row_id",
    "rr"."row_index",
    "rr"."categoria",
    "rr"."descrizione",
    "a"."attivita_id",
    "a"."activity_type",
    "a"."unit",
    "o"."operator_id",
    "o"."line_index",
    "o"."tempo_hours",
    "lh"."sum_line_hours",
    "lh"."n_tokens_total",
    "lh"."n_tokens_invalid",
    "lh"."n_tokens_zero",
    "rr"."previsto" AS "previsto_row",
    "rr"."prodotto" AS "prodotto_row",
        CASE
            WHEN ("rr"."prodotto" IS NULL) THEN NULL::numeric
            WHEN (("lh"."sum_line_hours" IS NULL) OR ("lh"."sum_line_hours" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("o"."tempo_hours" IS NULL) OR ("o"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("rr"."prodotto" * ("o"."tempo_hours" / "lh"."sum_line_hours"))
        END AS "prodotto_alloc",
        CASE
            WHEN ("rr"."previsto" IS NULL) THEN NULL::numeric
            WHEN (("lh"."sum_line_hours" IS NULL) OR ("lh"."sum_line_hours" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("o"."tempo_hours" IS NULL) OR ("o"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("rr"."previsto" * ("o"."tempo_hours" / "lh"."sum_line_hours"))
        END AS "previsto_alloc"
   FROM (((((("rap_with_ship" "rws"
     JOIN "righe" "rr" ON (("rr"."rapportino_id" = "rws"."rapportino_id")))
     LEFT JOIN "attivita" "a" ON ((("lower"(TRIM(BOTH FROM "rr"."categoria")) = "a"."cat_key") AND ("lower"(TRIM(BOTH FROM "rr"."descrizione")) = "a"."desc_key"))))
     JOIN "ops" "o" ON (("o"."rapportino_row_id" = "rr"."rapportino_row_id")))
     LEFT JOIN "line_hours" "lh" ON (("lh"."rapportino_row_id" = "rr"."rapportino_row_id")))
     LEFT JOIN "ship_dim" "sd" ON (("sd"."ship_id" = "rws"."ship_id")))
     LEFT JOIN "ship_mgr" "mgr" ON (("mgr"."ship_id" = "rws"."ship_id")));


ALTER VIEW "public"."direzione_operator_facts_v4" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_facts_v4" IS 'Facts v4: ship matching strict + fallback safe; alloc prodotto/previsto prorata tempo_hours.';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_day_v1" AS
 WITH "op_line" AS (
         SELECT "f"."report_date",
            "f"."operator_id",
            "f"."manager_id",
            "f"."ship_id",
            "f"."costr",
            "f"."commessa",
            "f"."capo_id",
            "f"."unit",
            "f"."rapportino_row_id",
            "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "hours_valid",
            "sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))) AS "prodotto_alloc_sum",
            "max"("f"."n_tokens_invalid") AS "n_tokens_invalid",
            "max"("f"."n_tokens_zero") AS "n_tokens_zero",
            "max"("f"."n_tokens_total") AS "n_tokens_total"
           FROM "public"."direzione_operator_facts_v1" "f"
          WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
          GROUP BY "f"."report_date", "f"."operator_id", "f"."manager_id", "f"."ship_id", "f"."costr", "f"."commessa", "f"."capo_id", "f"."unit", "f"."rapportino_row_id"
        )
 SELECT "report_date",
    "operator_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "capo_id",
    "unit",
    "sum"("hours_valid") AS "hours_valid",
    "sum"("prodotto_alloc_sum") AS "prodotto_alloc_sum",
        CASE
            WHEN ("sum"("hours_valid") <= (0)::numeric) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc_sum") / "sum"("hours_valid"))
        END AS "productivity_index",
    "sum"("n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("n_tokens_zero") AS "tempo_zero_tokens",
    "sum"("n_tokens_total") AS "tempo_total_tokens"
   FROM "op_line"
  GROUP BY "report_date", "operator_id", "manager_id", "ship_id", "costr", "commessa", "capo_id", "unit";


ALTER VIEW "public"."direzione_operator_kpi_day_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_day_v1" IS 'Direction KPI day per operator with quality counters; unit MT/PZ only; n_tokens de-duplicated per line.';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_day_v2" AS
 WITH "op_line" AS (
         SELECT "f"."report_date",
            "f"."operator_id",
            "f"."manager_id",
            "f"."ship_id",
            "f"."costr",
            "f"."commessa",
            "f"."capo_id",
            "f"."unit",
            "f"."rapportino_row_id",
            "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "hours_valid",
            "sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))) AS "prodotto_alloc_sum",
            "max"("f"."n_tokens_invalid") AS "n_tokens_invalid",
            "max"("f"."n_tokens_zero") AS "n_tokens_zero",
            "max"("f"."n_tokens_total") AS "n_tokens_total",
            "max"("o"."cognome") AS "cognome",
            "max"("o"."nome") AS "nome",
            "max"("o"."operator_code") AS "operator_code",
            "max"("o"."operator_key") AS "operator_key",
            "max"(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE("o"."cognome", ''::"text") || ' '::"text") || COALESCE("o"."nome", ''::"text"))), ''::"text"), NULLIF("o"."name", ''::"text"))) AS "operator_name"
           FROM ("public"."direzione_operator_facts_v1" "f"
             LEFT JOIN "public"."operators" "o" ON (("o"."id" = "f"."operator_id")))
          WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
          GROUP BY "f"."report_date", "f"."operator_id", "f"."manager_id", "f"."ship_id", "f"."costr", "f"."commessa", "f"."capo_id", "f"."unit", "f"."rapportino_row_id"
        )
 SELECT "report_date",
    "operator_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "capo_id",
    "unit",
    "sum"("hours_valid") AS "hours_valid",
    "sum"("prodotto_alloc_sum") AS "prodotto_alloc_sum",
        CASE
            WHEN ("sum"("hours_valid") <= (0)::numeric) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc_sum") / "sum"("hours_valid"))
        END AS "productivity_index",
    "sum"("n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("n_tokens_zero") AS "tempo_zero_tokens",
    "sum"("n_tokens_total") AS "tempo_total_tokens",
    "max"("operator_name") AS "operator_name",
    "max"("cognome") AS "cognome",
    "max"("nome") AS "nome",
    "max"("operator_code") AS "operator_code",
    "max"("operator_key") AS "operator_key"
   FROM "op_line"
  GROUP BY "report_date", "operator_id", "manager_id", "ship_id", "costr", "commessa", "capo_id", "unit";


ALTER VIEW "public"."direzione_operator_kpi_day_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_day_v3" AS
 WITH "f" AS (
         SELECT "direzione_operator_facts_v4"."report_date",
            "direzione_operator_facts_v4"."operator_id",
            "direzione_operator_facts_v4"."capo_id",
            "direzione_operator_facts_v4"."manager_id",
            "direzione_operator_facts_v4"."ship_id",
            "direzione_operator_facts_v4"."costr",
            "direzione_operator_facts_v4"."commessa",
            "direzione_operator_facts_v4"."unit",
            "direzione_operator_facts_v4"."tempo_hours",
            "direzione_operator_facts_v4"."previsto_alloc",
            "direzione_operator_facts_v4"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v4"
          WHERE ("direzione_operator_facts_v4"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "tokens" AS (
         SELECT "f"."report_date",
            "f"."operator_id",
            "f"."capo_id",
            "f"."manager_id",
            "f"."ship_id",
            "f"."costr",
            "f"."commessa",
            "f"."unit",
            "count"(*) AS "tokens_total",
            "count"(*) FILTER (WHERE ("f"."tempo_hours" IS NULL)) AS "tokens_invalid",
            "count"(*) FILTER (WHERE ("f"."tempo_hours" = (0)::numeric)) AS "tokens_zero",
            "count"(*) FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "tokens_ok",
            "sum"("f"."previsto_alloc") FILTER (WHERE (("f"."previsto_alloc" IS NOT NULL) AND ("f"."previsto_alloc" > (0)::numeric) AND ("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "previsto_sum",
            "sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric) AND ("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "prodotto_sum",
            "sum"(((("f"."prodotto_alloc" / NULLIF("f"."previsto_alloc", (0)::numeric)) * (100)::numeric) * "f"."tempo_hours")) FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric) AND ("f"."previsto_alloc" IS NOT NULL) AND ("f"."previsto_alloc" > (0)::numeric) AND ("f"."prodotto_alloc" IS NOT NULL))) AS "pct_weighted_sum",
            "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric) AND ("f"."previsto_alloc" IS NOT NULL) AND ("f"."previsto_alloc" > (0)::numeric) AND ("f"."prodotto_alloc" IS NOT NULL))) AS "pct_weight"
           FROM "f"
          GROUP BY "f"."report_date", "f"."operator_id", "f"."capo_id", "f"."manager_id", "f"."ship_id", "f"."costr", "f"."commessa", "f"."unit"
        )
 SELECT "report_date",
    "operator_id",
    "capo_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "unit",
    "previsto_sum",
    "prodotto_sum",
    "tokens_total",
    "tokens_invalid",
    "tokens_zero",
    "tokens_ok",
        CASE
            WHEN (("pct_weight" IS NULL) OR ("pct_weight" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("pct_weighted_sum" / "pct_weight")
        END AS "productivity_pct"
   FROM "tokens";


ALTER VIEW "public"."direzione_operator_kpi_day_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_day_v3" IS 'KPI Day v3: productivity_pct = moyenne pondérée (tempo_hours) des pct token (prodotto_alloc/previsto_alloc), pas ratio des sommes.';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_day_v3_manager_safe" AS
 WITH "base" AS (
         SELECT "f"."report_date",
            "f"."operator_id",
            "f"."capo_id",
            "f"."manager_id",
            "f"."ship_id",
            "f"."ship_code",
            "f"."ship_name",
            "f"."ship_match_mode",
            "f"."costr",
            "f"."commessa",
            "f"."unit",
            "f"."tempo_hours",
            "f"."n_tokens_total",
            "f"."n_tokens_invalid",
            "f"."n_tokens_zero",
            "f"."previsto_alloc",
            "f"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v3" "f"
        )
 SELECT "report_date",
    "operator_id",
    "capo_id",
    "manager_id",
    "ship_id",
    "ship_code",
    "ship_name",
    "ship_match_mode",
    "costr",
    "commessa",
    "unit",
    "sum"("n_tokens_total") AS "tokens_total",
    "sum"("n_tokens_invalid") AS "tokens_invalid",
    "sum"("n_tokens_zero") AS "tokens_zero",
    (("sum"("n_tokens_total") - "sum"("n_tokens_invalid")) - "sum"("n_tokens_zero")) AS "tokens_ok",
    "sum"("tempo_hours") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) AS "hours_valid",
    "sum"("prodotto_alloc") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) AS "prodotto_alloc_sum",
    "sum"("previsto_alloc") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) AS "previsto_alloc_sum",
        CASE
            WHEN (("sum"("tempo_hours") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) IS NULL) OR ("sum"("tempo_hours") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) = (0)::numeric)) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) / NULLIF("sum"("tempo_hours") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))), (0)::numeric))
        END AS "productivity_index",
        CASE
            WHEN (("sum"("previsto_alloc") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) IS NULL) OR ("sum"("previsto_alloc") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) = (0)::numeric)) THEN NULL::numeric
            ELSE ((100)::numeric * ("sum"("prodotto_alloc") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))) / NULLIF("sum"("previsto_alloc") FILTER (WHERE (("tempo_hours" IS NOT NULL) AND ("tempo_hours" > (0)::numeric))), (0)::numeric)))
        END AS "productivity_pct"
   FROM "base" "b"
  GROUP BY "report_date", "operator_id", "capo_id", "manager_id", "ship_id", "ship_code", "ship_name", "ship_match_mode", "costr", "commessa", "unit";


ALTER VIEW "public"."direzione_operator_kpi_day_v3_manager_safe" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_day_v3_manager_safe" IS 'DIREZIONE KPI DAY V3 (manager-safe). Group by unit pour éviter tout mélange (MT vs PZ). Expose capo_id et manager_id.';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_day_v4_manager_safe" AS
 SELECT "report_date",
    "operator_id",
    "capo_id",
    "manager_id",
    "ship_id",
    "ship_code",
    "ship_name",
    "ship_match_mode",
    "costr",
    "commessa",
    "unit",
    "tokens_total",
    "tokens_invalid",
    "tokens_zero",
    "tokens_ok",
    "hours_valid",
    "prodotto_alloc_sum",
    "previsto_alloc_sum",
    "productivity_index",
    "productivity_pct",
        CASE
            WHEN (("previsto_alloc_sum" IS NULL) OR ("previsto_alloc_sum" = (0)::numeric)) THEN NULL::numeric
            WHEN ("prodotto_alloc_sum" IS NULL) THEN NULL::numeric
            ELSE ("prodotto_alloc_sum" / NULLIF("previsto_alloc_sum", (0)::numeric))
        END AS "ratio_vs_previsto",
        CASE
            WHEN (("previsto_alloc_sum" IS NULL) OR ("previsto_alloc_sum" = (0)::numeric)) THEN NULL::numeric
            WHEN ("prodotto_alloc_sum" IS NULL) THEN NULL::numeric
            ELSE (("prodotto_alloc_sum" / NULLIF("previsto_alloc_sum", (0)::numeric)) - (1)::numeric)
        END AS "delta_vs_previsto",
        CASE
            WHEN (("previsto_alloc_sum" IS NULL) OR ("previsto_alloc_sum" = (0)::numeric)) THEN NULL::numeric
            WHEN ("prodotto_alloc_sum" IS NULL) THEN NULL::numeric
            ELSE ((100)::numeric * (("prodotto_alloc_sum" / NULLIF("previsto_alloc_sum", (0)::numeric)) - (1)::numeric))
        END AS "delta_vs_previsto_pct_points"
   FROM "public"."direzione_operator_kpi_day_v3_manager_safe" "v3";


ALTER VIEW "public"."direzione_operator_kpi_day_v4_manager_safe" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_day_v4_manager_safe" IS 'DIREZIONE KPI DAY V4 (manager-safe). Ajoute ratio_vs_previsto + delta centré (ratio-1) sans casser V3.';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_month_v1" AS
 WITH "base" AS (
         SELECT ("date_trunc"('month'::"text", ("f"."report_date")::timestamp with time zone))::"date" AS "month_start",
            (("date_trunc"('month'::"text", ("f"."report_date")::timestamp with time zone) + '1 mon -1 days'::interval))::"date" AS "month_end",
            "f"."report_date",
            "f"."rapportino_id",
            "f"."capo_id",
            "f"."costr",
            "f"."commessa",
            "f"."ship_id",
            "f"."ship_code",
            "f"."ship_name",
            "f"."manager_id",
            "f"."rapportino_row_id",
            "f"."row_index",
            "f"."categoria",
            "f"."descrizione",
            "f"."attivita_id",
            "f"."activity_type",
            "f"."unit",
            "f"."operator_id",
            "f"."line_index",
            "f"."tempo_hours",
            "f"."sum_line_hours",
            "f"."n_tokens_total",
            "f"."n_tokens_invalid",
            "f"."n_tokens_zero",
            "f"."prodotto_row",
            "f"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v1" "f"
          WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "op_line" AS (
         SELECT "base"."month_start",
            "base"."month_end",
            "base"."operator_id",
            "base"."manager_id",
            "base"."ship_id",
            "base"."costr",
            "base"."commessa",
            "base"."capo_id",
            "base"."unit",
            "base"."rapportino_row_id",
            "sum"("base"."tempo_hours") FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "hours_valid",
            "sum"("base"."prodotto_alloc") FILTER (WHERE (("base"."prodotto_alloc" IS NOT NULL) AND ("base"."prodotto_alloc" > (0)::numeric))) AS "prodotto_alloc_sum",
            "max"("base"."n_tokens_invalid") AS "n_tokens_invalid",
            "max"("base"."n_tokens_zero") AS "n_tokens_zero",
            "max"("base"."n_tokens_total") AS "n_tokens_total"
           FROM "base"
          GROUP BY "base"."month_start", "base"."month_end", "base"."operator_id", "base"."manager_id", "base"."ship_id", "base"."costr", "base"."commessa", "base"."capo_id", "base"."unit", "base"."rapportino_row_id"
        )
 SELECT "month_start",
    "month_end",
    "operator_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "capo_id",
    "unit",
    "sum"("hours_valid") AS "hours_valid",
    "sum"("prodotto_alloc_sum") AS "prodotto_alloc_sum",
        CASE
            WHEN ("sum"("hours_valid") <= (0)::numeric) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc_sum") / "sum"("hours_valid"))
        END AS "productivity_index",
    "sum"("n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("n_tokens_zero") AS "tempo_zero_tokens",
    "sum"("n_tokens_total") AS "tempo_total_tokens"
   FROM "op_line"
  GROUP BY "month_start", "month_end", "operator_id", "manager_id", "ship_id", "costr", "commessa", "capo_id", "unit";


ALTER VIEW "public"."direzione_operator_kpi_month_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_month_v1" IS 'Direction KPI month (civil) per operator; unit MT/PZ only; n_tokens de-duplicated per line.';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_month_v2" AS
 WITH "base" AS (
         SELECT ("date_trunc"('month'::"text", ("f"."report_date")::timestamp with time zone))::"date" AS "month_start",
            (("date_trunc"('month'::"text", ("f"."report_date")::timestamp with time zone) + '1 mon -1 days'::interval))::"date" AS "month_end",
            "f"."report_date",
            "f"."rapportino_id",
            "f"."capo_id",
            "f"."costr",
            "f"."commessa",
            "f"."ship_id",
            "f"."ship_code",
            "f"."ship_name",
            "f"."manager_id",
            "f"."rapportino_row_id",
            "f"."row_index",
            "f"."categoria",
            "f"."descrizione",
            "f"."attivita_id",
            "f"."activity_type",
            "f"."unit",
            "f"."operator_id",
            "f"."line_index",
            "f"."tempo_hours",
            "f"."sum_line_hours",
            "f"."n_tokens_total",
            "f"."n_tokens_invalid",
            "f"."n_tokens_zero",
            "f"."prodotto_row",
            "f"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v1" "f"
          WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "op_line" AS (
         SELECT "b"."month_start",
            "b"."month_end",
            "b"."operator_id",
            "b"."manager_id",
            "b"."ship_id",
            "b"."costr",
            "b"."commessa",
            "b"."capo_id",
            "b"."unit",
            "b"."rapportino_row_id",
            "sum"("b"."tempo_hours") FILTER (WHERE (("b"."tempo_hours" IS NOT NULL) AND ("b"."tempo_hours" > (0)::numeric))) AS "hours_valid",
            "sum"("b"."prodotto_alloc") FILTER (WHERE (("b"."prodotto_alloc" IS NOT NULL) AND ("b"."prodotto_alloc" > (0)::numeric))) AS "prodotto_alloc_sum",
            "max"("b"."n_tokens_invalid") AS "n_tokens_invalid",
            "max"("b"."n_tokens_zero") AS "n_tokens_zero",
            "max"("b"."n_tokens_total") AS "n_tokens_total",
            "max"("o"."cognome") AS "cognome",
            "max"("o"."nome") AS "nome",
            "max"("o"."operator_code") AS "operator_code",
            "max"("o"."operator_key") AS "operator_key",
            "max"(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE("o"."cognome", ''::"text") || ' '::"text") || COALESCE("o"."nome", ''::"text"))), ''::"text"), NULLIF("o"."name", ''::"text"))) AS "operator_name"
           FROM ("base" "b"
             LEFT JOIN "public"."operators" "o" ON (("o"."id" = "b"."operator_id")))
          GROUP BY "b"."month_start", "b"."month_end", "b"."operator_id", "b"."manager_id", "b"."ship_id", "b"."costr", "b"."commessa", "b"."capo_id", "b"."unit", "b"."rapportino_row_id"
        )
 SELECT "month_start",
    "month_end",
    "operator_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "capo_id",
    "unit",
    "sum"("hours_valid") AS "hours_valid",
    "sum"("prodotto_alloc_sum") AS "prodotto_alloc_sum",
        CASE
            WHEN ("sum"("hours_valid") <= (0)::numeric) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc_sum") / "sum"("hours_valid"))
        END AS "productivity_index",
    "sum"("n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("n_tokens_zero") AS "tempo_zero_tokens",
    "sum"("n_tokens_total") AS "tempo_total_tokens",
    "max"("operator_name") AS "operator_name",
    "max"("cognome") AS "cognome",
    "max"("nome") AS "nome",
    "max"("operator_code") AS "operator_code",
    "max"("operator_key") AS "operator_key"
   FROM "op_line"
  GROUP BY "month_start", "month_end", "operator_id", "manager_id", "ship_id", "costr", "commessa", "capo_id", "unit";


ALTER VIEW "public"."direzione_operator_kpi_month_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_month_v3" AS
 WITH "base" AS (
         SELECT ("date_trunc"('month'::"text", ("direzione_operator_facts_v4"."report_date")::timestamp without time zone))::"date" AS "month_start",
            (("date_trunc"('month'::"text", ("direzione_operator_facts_v4"."report_date")::timestamp without time zone) + '1 mon -1 days'::interval))::"date" AS "month_end",
            "direzione_operator_facts_v4"."report_date",
            "direzione_operator_facts_v4"."operator_id",
            "direzione_operator_facts_v4"."capo_id",
            "direzione_operator_facts_v4"."manager_id",
            "direzione_operator_facts_v4"."ship_id",
            "direzione_operator_facts_v4"."costr",
            "direzione_operator_facts_v4"."commessa",
            "direzione_operator_facts_v4"."unit",
            "direzione_operator_facts_v4"."tempo_hours",
            "direzione_operator_facts_v4"."previsto_alloc",
            "direzione_operator_facts_v4"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v4"
          WHERE ("direzione_operator_facts_v4"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "agg" AS (
         SELECT "base"."month_start",
            "base"."month_end",
            "base"."operator_id",
            "base"."capo_id",
            "base"."manager_id",
            "base"."ship_id",
            "base"."costr",
            "base"."commessa",
            "base"."unit",
            "count"(*) AS "tokens_total",
            "count"(*) FILTER (WHERE ("base"."tempo_hours" IS NULL)) AS "tokens_invalid",
            "count"(*) FILTER (WHERE ("base"."tempo_hours" = (0)::numeric)) AS "tokens_zero",
            "count"(*) FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "tokens_ok",
            "sum"("base"."previsto_alloc") FILTER (WHERE (("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "previsto_sum",
            "sum"("base"."prodotto_alloc") FILTER (WHERE (("base"."prodotto_alloc" IS NOT NULL) AND ("base"."prodotto_alloc" > (0)::numeric) AND ("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "prodotto_sum",
            "sum"(((("base"."prodotto_alloc" / NULLIF("base"."previsto_alloc", (0)::numeric)) * (100)::numeric) * "base"."tempo_hours")) FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric) AND ("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."prodotto_alloc" IS NOT NULL))) AS "pct_weighted_sum",
            "sum"("base"."tempo_hours") FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric) AND ("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."prodotto_alloc" IS NOT NULL))) AS "pct_weight"
           FROM "base"
          GROUP BY "base"."month_start", "base"."month_end", "base"."operator_id", "base"."capo_id", "base"."manager_id", "base"."ship_id", "base"."costr", "base"."commessa", "base"."unit"
        )
 SELECT "month_start",
    "month_end",
    "operator_id",
    "capo_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "unit",
    "previsto_sum",
    "prodotto_sum",
    "tokens_total",
    "tokens_invalid",
    "tokens_zero",
    "tokens_ok",
        CASE
            WHEN (("pct_weight" IS NULL) OR ("pct_weight" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("pct_weighted_sum" / "pct_weight")
        END AS "productivity_pct"
   FROM "agg";


ALTER VIEW "public"."direzione_operator_kpi_month_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_month_v3" IS 'KPI Month v3: moyenne pondérée tempo_hours des pct token (pas ratio des sommes).';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_week_v1" AS
 WITH "base" AS (
         SELECT ("date_trunc"('week'::"text", ("f"."report_date")::timestamp with time zone))::"date" AS "week_start",
            (("date_trunc"('week'::"text", ("f"."report_date")::timestamp with time zone))::"date" + 6) AS "week_end",
            (EXTRACT(isodow FROM "f"."report_date") = (6)::numeric) AS "is_saturday",
            "f"."report_date",
            "f"."rapportino_id",
            "f"."capo_id",
            "f"."costr",
            "f"."commessa",
            "f"."ship_id",
            "f"."ship_code",
            "f"."ship_name",
            "f"."manager_id",
            "f"."rapportino_row_id",
            "f"."row_index",
            "f"."categoria",
            "f"."descrizione",
            "f"."attivita_id",
            "f"."activity_type",
            "f"."unit",
            "f"."operator_id",
            "f"."line_index",
            "f"."tempo_hours",
            "f"."sum_line_hours",
            "f"."n_tokens_total",
            "f"."n_tokens_invalid",
            "f"."n_tokens_zero",
            "f"."prodotto_row",
            "f"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v1" "f"
          WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "op_line" AS (
         SELECT "base"."week_start",
            "base"."week_end",
            "base"."operator_id",
            "base"."manager_id",
            "base"."ship_id",
            "base"."costr",
            "base"."commessa",
            "base"."capo_id",
            "base"."unit",
            "base"."rapportino_row_id",
            "sum"("base"."tempo_hours") FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "hours_valid",
            "sum"("base"."prodotto_alloc") FILTER (WHERE (("base"."prodotto_alloc" IS NOT NULL) AND ("base"."prodotto_alloc" > (0)::numeric))) AS "prodotto_alloc_sum",
            "sum"("base"."tempo_hours") FILTER (WHERE ("base"."is_saturday" AND ("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "saturday_hours",
            "sum"("base"."prodotto_alloc") FILTER (WHERE ("base"."is_saturday" AND ("base"."prodotto_alloc" IS NOT NULL) AND ("base"."prodotto_alloc" > (0)::numeric))) AS "saturday_prodotto",
            "max"("base"."n_tokens_invalid") AS "n_tokens_invalid",
            "max"("base"."n_tokens_zero") AS "n_tokens_zero",
            "max"("base"."n_tokens_total") AS "n_tokens_total"
           FROM "base"
          GROUP BY "base"."week_start", "base"."week_end", "base"."operator_id", "base"."manager_id", "base"."ship_id", "base"."costr", "base"."commessa", "base"."capo_id", "base"."unit", "base"."rapportino_row_id"
        )
 SELECT "week_start",
    "week_end",
    "operator_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "capo_id",
    "unit",
    "sum"("hours_valid") AS "hours_valid",
    "sum"("prodotto_alloc_sum") AS "prodotto_alloc_sum",
    "sum"("saturday_hours") AS "saturday_hours",
    "sum"("saturday_prodotto") AS "saturday_prodotto",
        CASE
            WHEN ("sum"("hours_valid") <= (0)::numeric) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc_sum") / "sum"("hours_valid"))
        END AS "productivity_index",
    "sum"("n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("n_tokens_zero") AS "tempo_zero_tokens",
    "sum"("n_tokens_total") AS "tempo_total_tokens"
   FROM "op_line"
  GROUP BY "week_start", "week_end", "operator_id", "manager_id", "ship_id", "costr", "commessa", "capo_id", "unit";


ALTER VIEW "public"."direzione_operator_kpi_week_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_week_v1" IS 'Direction KPI week (Mon-Sun) per operator + Saturday breakdown; unit MT/PZ only; n_tokens de-duplicated per line.';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_week_v2" AS
 WITH "base" AS (
         SELECT ("date_trunc"('week'::"text", ("f"."report_date")::timestamp with time zone))::"date" AS "week_start",
            (("date_trunc"('week'::"text", ("f"."report_date")::timestamp with time zone))::"date" + 6) AS "week_end",
            (EXTRACT(isodow FROM "f"."report_date") = (6)::numeric) AS "is_saturday",
            "f"."report_date",
            "f"."rapportino_id",
            "f"."capo_id",
            "f"."costr",
            "f"."commessa",
            "f"."ship_id",
            "f"."ship_code",
            "f"."ship_name",
            "f"."manager_id",
            "f"."rapportino_row_id",
            "f"."row_index",
            "f"."categoria",
            "f"."descrizione",
            "f"."attivita_id",
            "f"."activity_type",
            "f"."unit",
            "f"."operator_id",
            "f"."line_index",
            "f"."tempo_hours",
            "f"."sum_line_hours",
            "f"."n_tokens_total",
            "f"."n_tokens_invalid",
            "f"."n_tokens_zero",
            "f"."prodotto_row",
            "f"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v1" "f"
          WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "op_line" AS (
         SELECT "b"."week_start",
            "b"."week_end",
            "b"."operator_id",
            "b"."manager_id",
            "b"."ship_id",
            "b"."costr",
            "b"."commessa",
            "b"."capo_id",
            "b"."unit",
            "b"."rapportino_row_id",
            "sum"("b"."tempo_hours") FILTER (WHERE (("b"."tempo_hours" IS NOT NULL) AND ("b"."tempo_hours" > (0)::numeric))) AS "hours_valid",
            "sum"("b"."prodotto_alloc") FILTER (WHERE (("b"."prodotto_alloc" IS NOT NULL) AND ("b"."prodotto_alloc" > (0)::numeric))) AS "prodotto_alloc_sum",
            "sum"("b"."tempo_hours") FILTER (WHERE ("b"."is_saturday" AND ("b"."tempo_hours" IS NOT NULL) AND ("b"."tempo_hours" > (0)::numeric))) AS "saturday_hours",
            "sum"("b"."prodotto_alloc") FILTER (WHERE ("b"."is_saturday" AND ("b"."prodotto_alloc" IS NOT NULL) AND ("b"."prodotto_alloc" > (0)::numeric))) AS "saturday_prodotto",
            "max"("b"."n_tokens_invalid") AS "n_tokens_invalid",
            "max"("b"."n_tokens_zero") AS "n_tokens_zero",
            "max"("b"."n_tokens_total") AS "n_tokens_total",
            "max"("o"."cognome") AS "cognome",
            "max"("o"."nome") AS "nome",
            "max"("o"."operator_code") AS "operator_code",
            "max"("o"."operator_key") AS "operator_key",
            "max"(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE("o"."cognome", ''::"text") || ' '::"text") || COALESCE("o"."nome", ''::"text"))), ''::"text"), NULLIF("o"."name", ''::"text"))) AS "operator_name"
           FROM ("base" "b"
             LEFT JOIN "public"."operators" "o" ON (("o"."id" = "b"."operator_id")))
          GROUP BY "b"."week_start", "b"."week_end", "b"."operator_id", "b"."manager_id", "b"."ship_id", "b"."costr", "b"."commessa", "b"."capo_id", "b"."unit", "b"."rapportino_row_id"
        )
 SELECT "week_start",
    "week_end",
    "operator_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "capo_id",
    "unit",
    "sum"("hours_valid") AS "hours_valid",
    "sum"("prodotto_alloc_sum") AS "prodotto_alloc_sum",
    "sum"("saturday_hours") AS "saturday_hours",
    "sum"("saturday_prodotto") AS "saturday_prodotto",
        CASE
            WHEN ("sum"("hours_valid") <= (0)::numeric) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc_sum") / "sum"("hours_valid"))
        END AS "productivity_index",
    "sum"("n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("n_tokens_zero") AS "tempo_zero_tokens",
    "sum"("n_tokens_total") AS "tempo_total_tokens",
    "max"("operator_name") AS "operator_name",
    "max"("cognome") AS "cognome",
    "max"("nome") AS "nome",
    "max"("operator_code") AS "operator_code",
    "max"("operator_key") AS "operator_key"
   FROM "op_line"
  GROUP BY "week_start", "week_end", "operator_id", "manager_id", "ship_id", "costr", "commessa", "capo_id", "unit";


ALTER VIEW "public"."direzione_operator_kpi_week_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_week_v3" AS
 WITH "base" AS (
         SELECT ("date_trunc"('week'::"text", ("direzione_operator_facts_v4"."report_date")::timestamp without time zone))::"date" AS "week_start",
            (("date_trunc"('week'::"text", ("direzione_operator_facts_v4"."report_date")::timestamp without time zone))::"date" + 6) AS "week_end",
            "direzione_operator_facts_v4"."report_date",
            "direzione_operator_facts_v4"."operator_id",
            "direzione_operator_facts_v4"."capo_id",
            "direzione_operator_facts_v4"."manager_id",
            "direzione_operator_facts_v4"."ship_id",
            "direzione_operator_facts_v4"."costr",
            "direzione_operator_facts_v4"."commessa",
            "direzione_operator_facts_v4"."unit",
            "direzione_operator_facts_v4"."tempo_hours",
            "direzione_operator_facts_v4"."previsto_alloc",
            "direzione_operator_facts_v4"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v4"
          WHERE ("direzione_operator_facts_v4"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "agg" AS (
         SELECT "base"."week_start",
            "base"."week_end",
            "base"."operator_id",
            "base"."capo_id",
            "base"."manager_id",
            "base"."ship_id",
            "base"."costr",
            "base"."commessa",
            "base"."unit",
            "count"(*) AS "tokens_total",
            "count"(*) FILTER (WHERE ("base"."tempo_hours" IS NULL)) AS "tokens_invalid",
            "count"(*) FILTER (WHERE ("base"."tempo_hours" = (0)::numeric)) AS "tokens_zero",
            "count"(*) FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "tokens_ok",
            "sum"("base"."previsto_alloc") FILTER (WHERE (("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "previsto_sum",
            "sum"("base"."prodotto_alloc") FILTER (WHERE (("base"."prodotto_alloc" IS NOT NULL) AND ("base"."prodotto_alloc" > (0)::numeric) AND ("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "prodotto_sum",
            "sum"(((("base"."prodotto_alloc" / NULLIF("base"."previsto_alloc", (0)::numeric)) * (100)::numeric) * "base"."tempo_hours")) FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric) AND ("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."prodotto_alloc" IS NOT NULL))) AS "pct_weighted_sum",
            "sum"("base"."tempo_hours") FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric) AND ("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."prodotto_alloc" IS NOT NULL))) AS "pct_weight"
           FROM "base"
          GROUP BY "base"."week_start", "base"."week_end", "base"."operator_id", "base"."capo_id", "base"."manager_id", "base"."ship_id", "base"."costr", "base"."commessa", "base"."unit"
        )
 SELECT "week_start",
    "week_end",
    "operator_id",
    "capo_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "unit",
    "previsto_sum",
    "prodotto_sum",
    "tokens_total",
    "tokens_invalid",
    "tokens_zero",
    "tokens_ok",
        CASE
            WHEN (("pct_weight" IS NULL) OR ("pct_weight" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("pct_weighted_sum" / "pct_weight")
        END AS "productivity_pct"
   FROM "agg";


ALTER VIEW "public"."direzione_operator_kpi_week_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_week_v3" IS 'KPI Week v3: moyenne pondérée tempo_hours des pct token (pas ratio des sommes).';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_year_v1" AS
 WITH "base" AS (
         SELECT (EXTRACT(year FROM "f"."report_date"))::integer AS "year",
            "f"."report_date",
            "f"."rapportino_id",
            "f"."capo_id",
            "f"."costr",
            "f"."commessa",
            "f"."ship_id",
            "f"."ship_code",
            "f"."ship_name",
            "f"."manager_id",
            "f"."rapportino_row_id",
            "f"."row_index",
            "f"."categoria",
            "f"."descrizione",
            "f"."attivita_id",
            "f"."activity_type",
            "f"."unit",
            "f"."operator_id",
            "f"."line_index",
            "f"."tempo_hours",
            "f"."sum_line_hours",
            "f"."n_tokens_total",
            "f"."n_tokens_invalid",
            "f"."n_tokens_zero",
            "f"."prodotto_row",
            "f"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v1" "f"
          WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "op_line" AS (
         SELECT "base"."year",
            "base"."operator_id",
            "base"."manager_id",
            "base"."ship_id",
            "base"."costr",
            "base"."commessa",
            "base"."capo_id",
            "base"."unit",
            "base"."rapportino_row_id",
            "sum"("base"."tempo_hours") FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "hours_valid",
            "sum"("base"."prodotto_alloc") FILTER (WHERE (("base"."prodotto_alloc" IS NOT NULL) AND ("base"."prodotto_alloc" > (0)::numeric))) AS "prodotto_alloc_sum",
            "max"("base"."n_tokens_invalid") AS "n_tokens_invalid",
            "max"("base"."n_tokens_zero") AS "n_tokens_zero",
            "max"("base"."n_tokens_total") AS "n_tokens_total"
           FROM "base"
          GROUP BY "base"."year", "base"."operator_id", "base"."manager_id", "base"."ship_id", "base"."costr", "base"."commessa", "base"."capo_id", "base"."unit", "base"."rapportino_row_id"
        )
 SELECT "year",
    "operator_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "capo_id",
    "unit",
    "sum"("hours_valid") AS "hours_valid",
    "sum"("prodotto_alloc_sum") AS "prodotto_alloc_sum",
        CASE
            WHEN ("sum"("hours_valid") <= (0)::numeric) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc_sum") / "sum"("hours_valid"))
        END AS "productivity_index",
    "sum"("n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("n_tokens_zero") AS "tempo_zero_tokens",
    "sum"("n_tokens_total") AS "tempo_total_tokens"
   FROM "op_line"
  GROUP BY "year", "operator_id", "manager_id", "ship_id", "costr", "commessa", "capo_id", "unit";


ALTER VIEW "public"."direzione_operator_kpi_year_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_year_v1" IS 'Direction KPI year (civil) per operator; unit MT/PZ only; n_tokens de-duplicated per line.';



CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_year_v2" AS
 WITH "base" AS (
         SELECT (EXTRACT(year FROM "f"."report_date"))::integer AS "year",
            "f"."report_date",
            "f"."rapportino_id",
            "f"."capo_id",
            "f"."costr",
            "f"."commessa",
            "f"."ship_id",
            "f"."ship_code",
            "f"."ship_name",
            "f"."manager_id",
            "f"."rapportino_row_id",
            "f"."row_index",
            "f"."categoria",
            "f"."descrizione",
            "f"."attivita_id",
            "f"."activity_type",
            "f"."unit",
            "f"."operator_id",
            "f"."line_index",
            "f"."tempo_hours",
            "f"."sum_line_hours",
            "f"."n_tokens_total",
            "f"."n_tokens_invalid",
            "f"."n_tokens_zero",
            "f"."prodotto_row",
            "f"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v1" "f"
          WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "op_line" AS (
         SELECT "b"."year",
            "b"."operator_id",
            "b"."manager_id",
            "b"."ship_id",
            "b"."costr",
            "b"."commessa",
            "b"."capo_id",
            "b"."unit",
            "b"."rapportino_row_id",
            "sum"("b"."tempo_hours") FILTER (WHERE (("b"."tempo_hours" IS NOT NULL) AND ("b"."tempo_hours" > (0)::numeric))) AS "hours_valid",
            "sum"("b"."prodotto_alloc") FILTER (WHERE (("b"."prodotto_alloc" IS NOT NULL) AND ("b"."prodotto_alloc" > (0)::numeric))) AS "prodotto_alloc_sum",
            "max"("b"."n_tokens_invalid") AS "n_tokens_invalid",
            "max"("b"."n_tokens_zero") AS "n_tokens_zero",
            "max"("b"."n_tokens_total") AS "n_tokens_total",
            "max"("o"."cognome") AS "cognome",
            "max"("o"."nome") AS "nome",
            "max"("o"."operator_code") AS "operator_code",
            "max"("o"."operator_key") AS "operator_key",
            "max"(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE("o"."cognome", ''::"text") || ' '::"text") || COALESCE("o"."nome", ''::"text"))), ''::"text"), NULLIF("o"."name", ''::"text"))) AS "operator_name"
           FROM ("base" "b"
             LEFT JOIN "public"."operators" "o" ON (("o"."id" = "b"."operator_id")))
          GROUP BY "b"."year", "b"."operator_id", "b"."manager_id", "b"."ship_id", "b"."costr", "b"."commessa", "b"."capo_id", "b"."unit", "b"."rapportino_row_id"
        )
 SELECT "year",
    "operator_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "capo_id",
    "unit",
    "sum"("hours_valid") AS "hours_valid",
    "sum"("prodotto_alloc_sum") AS "prodotto_alloc_sum",
        CASE
            WHEN ("sum"("hours_valid") <= (0)::numeric) THEN NULL::numeric
            ELSE ("sum"("prodotto_alloc_sum") / "sum"("hours_valid"))
        END AS "productivity_index",
    "sum"("n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("n_tokens_zero") AS "tempo_zero_tokens",
    "sum"("n_tokens_total") AS "tempo_total_tokens",
    "max"("operator_name") AS "operator_name",
    "max"("cognome") AS "cognome",
    "max"("nome") AS "nome",
    "max"("operator_code") AS "operator_code",
    "max"("operator_key") AS "operator_key"
   FROM "op_line"
  GROUP BY "year", "operator_id", "manager_id", "ship_id", "costr", "commessa", "capo_id", "unit";


ALTER VIEW "public"."direzione_operator_kpi_year_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."direzione_operator_kpi_year_v3" AS
 WITH "base" AS (
         SELECT (EXTRACT(year FROM "direzione_operator_facts_v4"."report_date"))::integer AS "year",
            "direzione_operator_facts_v4"."report_date",
            "direzione_operator_facts_v4"."operator_id",
            "direzione_operator_facts_v4"."capo_id",
            "direzione_operator_facts_v4"."manager_id",
            "direzione_operator_facts_v4"."ship_id",
            "direzione_operator_facts_v4"."costr",
            "direzione_operator_facts_v4"."commessa",
            "direzione_operator_facts_v4"."unit",
            "direzione_operator_facts_v4"."tempo_hours",
            "direzione_operator_facts_v4"."previsto_alloc",
            "direzione_operator_facts_v4"."prodotto_alloc"
           FROM "public"."direzione_operator_facts_v4"
          WHERE ("direzione_operator_facts_v4"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
        ), "agg" AS (
         SELECT "base"."year",
            "base"."operator_id",
            "base"."capo_id",
            "base"."manager_id",
            "base"."ship_id",
            "base"."costr",
            "base"."commessa",
            "base"."unit",
            "count"(*) AS "tokens_total",
            "count"(*) FILTER (WHERE ("base"."tempo_hours" IS NULL)) AS "tokens_invalid",
            "count"(*) FILTER (WHERE ("base"."tempo_hours" = (0)::numeric)) AS "tokens_zero",
            "count"(*) FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "tokens_ok",
            "sum"("base"."previsto_alloc") FILTER (WHERE (("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "previsto_sum",
            "sum"("base"."prodotto_alloc") FILTER (WHERE (("base"."prodotto_alloc" IS NOT NULL) AND ("base"."prodotto_alloc" > (0)::numeric) AND ("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "prodotto_sum",
            "sum"(((("base"."prodotto_alloc" / NULLIF("base"."previsto_alloc", (0)::numeric)) * (100)::numeric) * "base"."tempo_hours")) FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric) AND ("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."prodotto_alloc" IS NOT NULL))) AS "pct_weighted_sum",
            "sum"("base"."tempo_hours") FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric) AND ("base"."previsto_alloc" IS NOT NULL) AND ("base"."previsto_alloc" > (0)::numeric) AND ("base"."prodotto_alloc" IS NOT NULL))) AS "pct_weight"
           FROM "base"
          GROUP BY "base"."year", "base"."operator_id", "base"."capo_id", "base"."manager_id", "base"."ship_id", "base"."costr", "base"."commessa", "base"."unit"
        )
 SELECT "year",
    "operator_id",
    "capo_id",
    "manager_id",
    "ship_id",
    "costr",
    "commessa",
    "unit",
    "previsto_sum",
    "prodotto_sum",
    "tokens_total",
    "tokens_invalid",
    "tokens_zero",
    "tokens_ok",
        CASE
            WHEN (("pct_weight" IS NULL) OR ("pct_weight" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("pct_weighted_sum" / "pct_weight")
        END AS "productivity_pct"
   FROM "agg";


ALTER VIEW "public"."direzione_operator_kpi_year_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."direzione_operator_kpi_year_v3" IS 'KPI Year v3: moyenne pondérée tempo_hours des pct token (pas ratio des sommes).';



CREATE TABLE IF NOT EXISTS "public"."impianti" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."impianti" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impianto_capi" (
    "impianto_id" "uuid" NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "week" "text" DEFAULT ''::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."impianto_capi" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_latest_file_by_ship_v1" AS
 SELECT DISTINCT ON ("ship_id") "ship_id",
    "id" AS "inca_file_id",
    "uploaded_at"
   FROM "public"."inca_files" "f"
  WHERE ("ship_id" IS NOT NULL)
  ORDER BY "ship_id", "uploaded_at" DESC NULLS LAST, "id" DESC;


ALTER VIEW "public"."inca_latest_file_by_ship_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_cavi_live_by_ship_v1" AS
 SELECT "lf"."ship_id",
    "c"."id",
    "c"."inca_file_id",
    "c"."costr",
    "c"."commessa",
    "c"."codice",
    "c"."descrizione",
    "c"."impianto",
    "c"."tipo",
    "c"."sezione",
    "c"."zona_da",
    "c"."zona_a",
    "c"."apparato_da",
    "c"."apparato_a",
    "c"."descrizione_da",
    "c"."descrizione_a",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."metri_sit_cavo",
    "c"."metri_sit_tec",
    "c"."pagina_pdf",
    "c"."rev_inca",
    "c"."stato_inca",
    "c"."created_at",
    "c"."updated_at",
    "c"."situazione",
    "c"."from_file_id",
    "c"."metri_previsti",
    "c"."metri_posati_teorici",
    "c"."metri_totali",
    "c"."marca_cavo",
    "c"."livello",
    "c"."metri_sta",
    "c"."stato_tec",
    "c"."stato_cantiere",
    "c"."situazione_cavo",
    "c"."livello_disturbo",
    "c"."wbs",
    "c"."codice_inca",
    "c"."progress_percent",
    "c"."progress_side"
   FROM ("public"."inca_latest_file_by_ship_v1" "lf"
     JOIN "public"."inca_cavi" "c" ON (("c"."inca_file_id" = "lf"."inca_file_id")));


ALTER VIEW "public"."inca_cavi_live_by_ship_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inca_cavi_snapshot" (
    "import_id" "uuid" NOT NULL,
    "inca_file_id" "uuid",
    "codice" "text" NOT NULL,
    "situazione" "text",
    "metri_teo" numeric,
    "metri_dis" numeric,
    "flag_changed_in_source" boolean DEFAULT false NOT NULL,
    "row_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inca_cavi_snapshot" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_cavi_with_data_posa_v1" AS
 WITH "posed" AS (
         SELECT "ric"."inca_cavo_id",
            "max"("r"."report_date") AS "data_posa"
           FROM ("public"."rapportino_inca_cavi" "ric"
             JOIN "public"."rapportini" "r" ON (("r"."id" = "ric"."rapportino_id")))
          WHERE ("ric"."step_type" = 'POSA'::"public"."cavo_step_type")
          GROUP BY "ric"."inca_cavo_id"
        )
 SELECT "c"."id",
    "c"."inca_file_id",
    "c"."costr",
    "c"."commessa",
    "c"."codice",
    "c"."descrizione",
    "c"."impianto",
    "c"."tipo",
    "c"."sezione",
    "c"."zona_da",
    "c"."zona_a",
    "c"."apparato_da",
    "c"."apparato_a",
    "c"."descrizione_da",
    "c"."descrizione_a",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."metri_sit_cavo",
    "c"."metri_sit_tec",
    "c"."pagina_pdf",
    "c"."rev_inca",
    "c"."stato_inca",
    "c"."created_at",
    "c"."updated_at",
    "c"."situazione",
    "c"."from_file_id",
    "c"."metri_previsti",
    "c"."metri_posati_teorici",
    "c"."metri_totali",
    "c"."marca_cavo",
    "c"."livello",
    "c"."metri_sta",
    "c"."stato_tec",
    "c"."stato_cantiere",
    "c"."situazione_cavo",
    "c"."livello_disturbo",
    "c"."wbs",
    "c"."codice_inca",
    "c"."progress_percent",
    "c"."progress_side",
    "posed"."data_posa"
   FROM ("public"."inca_cavi" "c"
     LEFT JOIN "posed" ON (("posed"."inca_cavo_id" = "c"."id")));


ALTER VIEW "public"."inca_cavi_with_data_posa_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_cavi_with_last_posa_and_capo_v1" AS
 SELECT "c"."id",
    "c"."inca_file_id",
    "c"."costr",
    "c"."commessa",
    "c"."codice",
    "c"."descrizione",
    "c"."impianto",
    "c"."tipo",
    "c"."sezione",
    "c"."zona_da",
    "c"."zona_a",
    "c"."apparato_da",
    "c"."apparato_a",
    "c"."descrizione_da",
    "c"."descrizione_a",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."metri_sit_cavo",
    "c"."metri_sit_tec",
    "c"."pagina_pdf",
    "c"."rev_inca",
    "c"."stato_inca",
    "c"."created_at",
    "c"."updated_at",
    "c"."situazione",
    "c"."from_file_id",
    "c"."metri_previsti",
    "c"."metri_posati_teorici",
    "c"."metri_totali",
    "c"."marca_cavo",
    "c"."livello",
    "c"."metri_sta",
    "c"."stato_tec",
    "c"."stato_cantiere",
    "c"."situazione_cavo",
    "c"."livello_disturbo",
    "c"."wbs",
    "c"."codice_inca",
    "c"."progress_percent",
    "c"."progress_side",
    "lp"."data_posa",
    "r"."capo_id",
    COALESCE(NULLIF(TRIM(BOTH FROM "p"."display_name"), ''::"text"), NULLIF(TRIM(BOTH FROM "p"."full_name"), ''::"text"), NULLIF(TRIM(BOTH FROM "r"."capo_name"), ''::"text")) AS "capo_label"
   FROM ((("public"."inca_cavi" "c"
     LEFT JOIN LATERAL ( SELECT "ric"."posa_date" AS "data_posa",
            "ric"."rapportino_id"
           FROM "public"."rapportino_inca_cavi" "ric"
          WHERE (("ric"."inca_cavo_id" = "c"."id") AND ("ric"."posa_date" IS NOT NULL) AND ("ric"."step_type" = 'POSA'::"public"."cavo_step_type"))
          ORDER BY "ric"."posa_date" DESC, "ric"."updated_at" DESC
         LIMIT 1) "lp" ON (true))
     LEFT JOIN "public"."rapportini" "r" ON (("r"."id" = "lp"."rapportino_id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "r"."capo_id")));


ALTER VIEW "public"."inca_cavi_with_last_posa_and_capo_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_cavi_with_last_posa_v1" AS
 SELECT "c"."id",
    "c"."inca_file_id",
    "c"."costr",
    "c"."commessa",
    "c"."codice",
    "c"."descrizione",
    "c"."impianto",
    "c"."tipo",
    "c"."sezione",
    "c"."zona_da",
    "c"."zona_a",
    "c"."apparato_da",
    "c"."apparato_a",
    "c"."descrizione_da",
    "c"."descrizione_a",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."metri_sit_cavo",
    "c"."metri_sit_tec",
    "c"."pagina_pdf",
    "c"."rev_inca",
    "c"."stato_inca",
    "c"."created_at",
    "c"."updated_at",
    "c"."situazione",
    "c"."from_file_id",
    "c"."metri_previsti",
    "c"."metri_posati_teorici",
    "c"."metri_totali",
    "c"."marca_cavo",
    "c"."livello",
    "c"."metri_sta",
    "c"."stato_tec",
    "c"."stato_cantiere",
    "c"."situazione_cavo",
    "c"."livello_disturbo",
    "c"."wbs",
    "c"."codice_inca",
    "c"."progress_percent",
    "c"."progress_side",
    "lp"."data_posa"
   FROM ("public"."inca_cavi" "c"
     LEFT JOIN ( SELECT "ric"."inca_cavo_id",
            "max"("ric"."posa_date") AS "data_posa"
           FROM "public"."rapportino_inca_cavi" "ric"
          WHERE (("ric"."posa_date" IS NOT NULL) AND ("ric"."step_type" = 'POSA'::"public"."cavo_step_type"))
          GROUP BY "ric"."inca_cavo_id") "lp" ON (("lp"."inca_cavo_id" = "c"."id")));


ALTER VIEW "public"."inca_cavi_with_last_posa_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rapportino_cavi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rapportino_id" "uuid" NOT NULL,
    "inca_cavo_id" "uuid" NOT NULL,
    "metri_previsti" numeric,
    "metri_posati" numeric DEFAULT 0 NOT NULL,
    "nota" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."rapportino_cavi" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_cavi_with_last_rapportino_v1" AS
 SELECT "c"."id",
    "c"."inca_file_id",
    "c"."costr",
    "c"."commessa",
    "c"."codice",
    "c"."descrizione",
    "c"."impianto",
    "c"."tipo",
    "c"."sezione",
    "c"."zona_da",
    "c"."zona_a",
    "c"."apparato_da",
    "c"."apparato_a",
    "c"."descrizione_da",
    "c"."descrizione_a",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."metri_sit_cavo",
    "c"."metri_sit_tec",
    "c"."pagina_pdf",
    "c"."rev_inca",
    "c"."stato_inca",
    "c"."created_at",
    "c"."updated_at",
    "c"."situazione",
    "c"."from_file_id",
    "c"."metri_previsti",
    "c"."metri_posati_teorici",
    "c"."metri_totali",
    "c"."marca_cavo",
    "c"."livello",
    "c"."metri_sta",
    "c"."stato_tec",
    "c"."stato_cantiere",
    "c"."situazione_cavo",
    "c"."livello_disturbo",
    "c"."wbs",
    "c"."codice_inca",
    "c"."progress_percent",
    "c"."progress_side",
    "lr"."last_report_date",
    "lr"."last_capo_name"
   FROM ("public"."inca_cavi" "c"
     LEFT JOIN LATERAL ( SELECT "r"."report_date" AS "last_report_date",
            COALESCE(NULLIF(TRIM(BOTH FROM "r"."capo_name"), ''::"text"), NULLIF(TRIM(BOTH FROM "p"."display_name"), ''::"text"), NULLIF(TRIM(BOTH FROM "p"."full_name"), ''::"text")) AS "last_capo_name"
           FROM (("public"."rapportino_cavi" "rc"
             JOIN "public"."rapportini" "r" ON (("r"."id" = "rc"."rapportino_id")))
             LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "r"."capo_id")))
          WHERE ("rc"."inca_cavo_id" = "c"."id")
          ORDER BY "r"."report_date" DESC NULLS LAST, "r"."updated_at" DESC NULLS LAST, "r"."created_at" DESC NULLS LAST
         LIMIT 1) "lr" ON (true));


ALTER VIEW "public"."inca_cavi_with_last_rapportino_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."inca_cavi_with_last_rapportino_v1" IS 'INCA cables enriched with last rapportino occurrence (Option B): last_report_date + last_capo_name.';



CREATE TABLE IF NOT EXISTS "public"."inca_percorsi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inca_cavo_id" "uuid" NOT NULL,
    "ordine" integer NOT NULL,
    "nodo" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "page" integer,
    "raw_kind" "text"
);


ALTER TABLE "public"."inca_percorsi" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_cavi_with_path" AS
 SELECT "c"."id",
    "c"."inca_file_id",
    "c"."costr",
    "c"."commessa",
    "c"."codice",
    "c"."descrizione",
    "c"."impianto",
    "c"."tipo",
    "c"."sezione",
    "c"."zona_da",
    "c"."zona_a",
    "c"."apparato_da",
    "c"."apparato_a",
    "c"."descrizione_da",
    "c"."descrizione_a",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."metri_sit_cavo",
    "c"."metri_sit_tec",
    "c"."pagina_pdf",
    "c"."rev_inca",
    "c"."stato_inca",
    "c"."created_at",
    "c"."updated_at",
    "p"."percorso_supports"
   FROM ("public"."inca_cavi" "c"
     LEFT JOIN LATERAL ( SELECT "array_agg"("ip"."nodo" ORDER BY "ip"."ordine") AS "percorso_supports"
           FROM "public"."inca_percorsi" "ip"
          WHERE ("ip"."inca_cavo_id" = "c"."id")) "p" ON (true));


ALTER VIEW "public"."inca_cavi_with_path" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inca_change_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_import_id" "uuid",
    "to_import_id" "uuid" NOT NULL,
    "inca_file_id" "uuid",
    "codice" "text" NOT NULL,
    "change_type" "public"."inca_change_type" NOT NULL,
    "severity" "public"."inca_change_severity" NOT NULL,
    "field" "text",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inca_change_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_prev_file_by_ship_v1" AS
 WITH "ranked" AS (
         SELECT "f"."ship_id",
            "f"."id" AS "inca_file_id",
            "f"."uploaded_at",
            "row_number"() OVER (PARTITION BY "f"."ship_id" ORDER BY "f"."uploaded_at" DESC, "f"."id" DESC) AS "rn"
           FROM "public"."inca_files" "f"
          WHERE ("f"."ship_id" IS NOT NULL)
        )
 SELECT "a"."ship_id",
    "a"."inca_file_id" AS "last_inca_file_id",
    "b"."inca_file_id" AS "prev_inca_file_id"
   FROM ("ranked" "a"
     LEFT JOIN "ranked" "b" ON ((("b"."ship_id" = "a"."ship_id") AND ("b"."rn" = 2))))
  WHERE ("a"."rn" = 1);


ALTER VIEW "public"."inca_prev_file_by_ship_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navemaster_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "costr" "text",
    "commessa" "text",
    "file_name" "text" NOT NULL,
    "file_bucket" "text" DEFAULT 'navemaster'::"text" NOT NULL,
    "file_path" "text" NOT NULL,
    "source_sha256" "text",
    "note" "text",
    "imported_by" "uuid",
    "imported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."navemaster_imports" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."navemaster_latest_import_v1" AS
 SELECT "id",
    "ship_id",
    "costr",
    "commessa",
    "file_name",
    "file_bucket",
    "file_path",
    "source_sha256",
    "note",
    "imported_by",
    "imported_at",
    "is_active"
   FROM "public"."navemaster_imports" "i"
  WHERE ("is_active" = true);


ALTER VIEW "public"."navemaster_latest_import_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navemaster_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "navemaster_import_id" "uuid" NOT NULL,
    "marcacavo" "text" NOT NULL,
    "descrizione" "text",
    "stato_cavo" "text",
    "situazione_cavo_conit" "text",
    "livello" "text",
    "sezione" "text",
    "tipologia" "text",
    "zona_da" "text",
    "zona_a" "text",
    "apparato_da" "text",
    "apparato_a" "text",
    "impianto" "text",
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."navemaster_rows" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."navemaster_live_v1" AS
 SELECT "nm"."ship_id",
    "nm"."id" AS "navemaster_import_id",
    "nm"."imported_at" AS "navemaster_imported_at",
    "r"."id" AS "navemaster_row_id",
    "r"."marcacavo",
    "r"."descrizione",
    "r"."stato_cavo",
    "r"."situazione_cavo_conit",
    "r"."livello",
    "r"."sezione",
    "r"."tipologia",
    "r"."zona_da",
    "r"."zona_a",
    "r"."apparato_da",
    "r"."apparato_a",
    "r"."impianto",
    "r"."payload",
    "ic"."id" AS "inca_cavo_id",
    "ic"."inca_file_id",
    "ic"."situazione" AS "situazione_inca",
    "ic"."metri_teo" AS "metri_teo_inca",
    "ic"."metri_dis" AS "metri_dis_inca",
    "ic"."updated_at" AS "inca_updated_at"
   FROM (("public"."navemaster_latest_import_v1" "nm"
     JOIN "public"."navemaster_rows" "r" ON (("r"."navemaster_import_id" = "nm"."id")))
     LEFT JOIN "public"."inca_cavi_live_by_ship_v1" "ic" ON ((("ic"."ship_id" = "nm"."ship_id") AND ("ic"."codice" = "r"."marcacavo"))));


ALTER VIEW "public"."navemaster_live_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_diff_last_import_v1" AS
 WITH "files" AS (
         SELECT "inca_prev_file_by_ship_v1"."ship_id",
            "inca_prev_file_by_ship_v1"."last_inca_file_id",
            "inca_prev_file_by_ship_v1"."prev_inca_file_id"
           FROM "public"."inca_prev_file_by_ship_v1"
          WHERE ("inca_prev_file_by_ship_v1"."last_inca_file_id" IS NOT NULL)
        ), "last_cavi" AS (
         SELECT "f"."ship_id",
            "c"."codice",
            "c"."situazione",
            "c"."metri_teo",
            "c"."metri_dis",
            "c"."updated_at"
           FROM ("files" "f"
             JOIN "public"."inca_cavi" "c" ON (("c"."inca_file_id" = "f"."last_inca_file_id")))
        ), "prev_cavi" AS (
         SELECT "f"."ship_id",
            "c"."codice",
            "c"."situazione",
            "c"."metri_teo",
            "c"."metri_dis",
            "c"."updated_at"
           FROM ("files" "f"
             JOIN "public"."inca_cavi" "c" ON (("c"."inca_file_id" = "f"."prev_inca_file_id")))
        ), "u" AS (
         SELECT COALESCE("l"."ship_id", "p"."ship_id") AS "ship_id",
            COALESCE("l"."codice", "p"."codice") AS "codice",
            "p"."situazione" AS "before_situazione",
            "l"."situazione" AS "after_situazione",
            "p"."metri_teo" AS "before_metri_teo",
            "l"."metri_teo" AS "after_metri_teo",
            "p"."metri_dis" AS "before_metri_dis",
            "l"."metri_dis" AS "after_metri_dis",
            "p"."updated_at" AS "before_updated_at",
            "l"."updated_at" AS "after_updated_at"
           FROM ("last_cavi" "l"
             FULL JOIN "prev_cavi" "p" ON ((("p"."ship_id" = "l"."ship_id") AND ("p"."codice" = "l"."codice"))))
        ), "nm" AS (
         SELECT "navemaster_live_v1"."ship_id",
            "navemaster_live_v1"."marcacavo",
            "public"."nav_status_from_text"("navemaster_live_v1"."situazione_cavo_conit") AS "nav_status"
           FROM "public"."navemaster_live_v1"
        )
 SELECT "u"."ship_id",
    "u"."codice",
    "u"."before_situazione",
    "u"."after_situazione",
    "u"."before_metri_teo",
    "u"."after_metri_teo",
    "u"."before_metri_dis",
    "u"."after_metri_dis",
    "u"."before_updated_at",
    "u"."after_updated_at",
    ("u"."before_situazione" IS NULL) AS "is_new_in_last_import",
    (("u"."before_situazione" IS NOT NULL) AND ("u"."after_situazione" IS NOT NULL) AND ("u"."before_situazione" <> "u"."after_situazione")) AS "is_changed",
    (("nm"."nav_status" = 'P'::"public"."nav_status") AND ("public"."nav_status_from_text"("u"."after_situazione") <> 'P'::"public"."nav_status")) AS "is_alert_p_overwrite_candidate",
        CASE
            WHEN (("nm"."nav_status" = 'P'::"public"."nav_status") AND ("public"."nav_status_from_text"("u"."after_situazione") <> 'P'::"public"."nav_status")) THEN 'CRITICAL'::"public"."nav_severity"
            WHEN ("u"."before_situazione" IS NULL) THEN 'INFO'::"public"."nav_severity"
            WHEN (("u"."before_situazione" IS NOT NULL) AND ("u"."after_situazione" IS NOT NULL) AND ("u"."before_situazione" <> "u"."after_situazione")) THEN 'MAJOR'::"public"."nav_severity"
            ELSE 'INFO'::"public"."nav_severity"
        END AS "severity"
   FROM ("u"
     LEFT JOIN "nm" ON ((("nm"."ship_id" = "u"."ship_id") AND ("nm"."marcacavo" = "u"."codice"))));


ALTER VIEW "public"."inca_diff_last_import_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_export_ufficio_v1" AS
 WITH "events" AS (
         SELECT "ric"."costr_cache" AS "costr",
            "ric"."commessa_cache" AS "commessa",
            "ric"."codice_cache" AS "codice",
            "min"(
                CASE
                    WHEN (("ric"."step_type" = 'POSA'::"public"."cavo_step_type") AND ("ric"."progress_percent" >= (50)::numeric)) THEN "ric"."report_date_cache"
                    ELSE NULL::"date"
                END) AS "posa_first_date",
            "max"(
                CASE
                    WHEN (("ric"."step_type" = 'POSA'::"public"."cavo_step_type") AND ("ric"."progress_percent" >= (50)::numeric)) THEN "ric"."report_date_cache"
                    ELSE NULL::"date"
                END) AS "posa_last_date",
            "max"(
                CASE
                    WHEN (("ric"."step_type" = 'RIPRESA'::"public"."cavo_step_type") AND ("ric"."progress_percent" = (100)::numeric)) THEN "ric"."report_date_cache"
                    ELSE NULL::"date"
                END) AS "ripresa_date",
            "max"(
                CASE
                    WHEN ("ric"."step_type" = 'POSA'::"public"."cavo_step_type") THEN COALESCE("ric"."progress_percent", (0)::numeric)
                    ELSE (0)::numeric
                END) AS "max_posa_percent",
            "count"(*) FILTER (WHERE ("ric"."step_type" = 'RIPRESA'::"public"."cavo_step_type")) AS "ripresa_count"
           FROM ("public"."rapportino_inca_cavi" "ric"
             JOIN "public"."rapportini" "r" ON (("r"."id" = "ric"."rapportino_id")))
          WHERE (("r"."status" = ANY (ARRAY['VALIDATED_CAPO'::"text", 'APPROVED_UFFICIO'::"text"])) AND ("ric"."costr_cache" IS NOT NULL) AND ("ric"."codice_cache" IS NOT NULL))
          GROUP BY "ric"."costr_cache", "ric"."commessa_cache", "ric"."codice_cache"
        )
 SELECT "c"."id" AS "inca_cavo_id",
    "c"."inca_file_id",
    "c"."costr",
    "c"."commessa",
    "c"."codice",
    "c"."descrizione",
    "c"."impianto",
    "c"."tipo",
    "c"."sezione",
    "c"."zona_da",
    "c"."zona_a",
    "c"."apparato_da",
    "c"."apparato_a",
    "c"."marca_cavo",
    "c"."livello",
    "c"."wbs",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."metri_previsti",
    "c"."metri_posati_teorici",
    "c"."metri_totali",
        CASE
            WHEN ("e"."posa_first_date" IS NOT NULL) THEN 'P'::"text"
            ELSE COALESCE("c"."situazione", 'NP'::"text")
        END AS "situazione_export",
    "e"."posa_first_date",
    "e"."posa_last_date",
    "e"."ripresa_date",
    "e"."max_posa_percent",
        CASE
            WHEN (("e"."posa_first_date" IS NOT NULL) AND ("e"."max_posa_percent" < (100)::numeric) AND ("e"."ripresa_date" IS NULL)) THEN true
            ELSE false
        END AS "ripresa_required",
    "e"."ripresa_count"
   FROM ("public"."inca_cavi" "c"
     LEFT JOIN "events" "e" ON ((("e"."costr" = "c"."costr") AND ((("e"."commessa" IS NULL) AND ("c"."commessa" IS NULL)) OR ("e"."commessa" = "c"."commessa")) AND ("e"."codice" = "c"."codice"))));


ALTER VIEW "public"."inca_export_ufficio_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inca_import_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_key" "text" NOT NULL,
    "costr" "text",
    "commessa" "text",
    "project_code" "text",
    "mode" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "previous_inca_file_id" "uuid",
    "new_inca_file_id" "uuid",
    "content_hash" "text",
    "summary" "jsonb",
    "diff" "jsonb"
);


ALTER TABLE "public"."inca_import_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."inca_import_runs" IS 'Audit: each INCA import run (dry/commit/enrich) with diff vs previous snapshot.';



CREATE TABLE IF NOT EXISTS "public"."inca_import_summaries" (
    "import_id" "uuid" NOT NULL,
    "inca_file_id" "uuid",
    "total_rows" integer DEFAULT 0 NOT NULL,
    "inserted_count" integer DEFAULT 0 NOT NULL,
    "updated_count" integer DEFAULT 0 NOT NULL,
    "disappeared_allowed_count" integer DEFAULT 0 NOT NULL,
    "disappeared_unexpected_count" integer DEFAULT 0 NOT NULL,
    "eliminated_count" integer DEFAULT 0 NOT NULL,
    "reinstated_count" integer DEFAULT 0 NOT NULL,
    "rework_count" integer DEFAULT 0 NOT NULL,
    "flagged_count" integer DEFAULT 0 NOT NULL,
    "metri_dis_changed_count" integer DEFAULT 0 NOT NULL,
    "metri_teo_changed_count" integer DEFAULT 0 NOT NULL,
    "info_count" integer DEFAULT 0 NOT NULL,
    "warn_count" integer DEFAULT 0 NOT NULL,
    "block_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inca_import_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inca_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inca_file_id" "uuid",
    "file_name" "text",
    "source" "text" DEFAULT 'EXCEL_INCA'::"text" NOT NULL,
    "checksum_sha256" "text",
    "imported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "note" "text"
);


ALTER TABLE "public"."inca_imports" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_percorsi_nodes_v1" AS
 SELECT "upper"("btrim"("nodo")) AS "nodo",
    ("count"(*))::integer AS "occorrenze"
   FROM "public"."inca_percorsi"
  WHERE (("nodo" IS NOT NULL) AND ("btrim"("nodo") <> ''::"text"))
  GROUP BY ("upper"("btrim"("nodo")))
  ORDER BY (("count"(*))::integer) DESC, ("upper"("btrim"("nodo")));


ALTER VIEW "public"."inca_percorsi_nodes_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_percorsi_v1" AS
 SELECT "id",
    "inca_cavo_id",
    "ordine",
    "nodo",
    "page",
    "raw_kind",
    "created_at"
   FROM "public"."inca_percorsi";


ALTER VIEW "public"."inca_percorsi_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inca_rows" AS
 SELECT "id",
    "inca_file_id",
    "costr",
    "commessa",
    "codice",
    "rev_inca",
    NULL::"text" AS "livello",
    COALESCE("zona_da", "zona_a") AS "zona",
    "tipo",
    "sezione",
    "metri_teo" AS "metri_teorici",
    "metri_totali",
    "metri_previsti",
    "metri_posati_teorici",
    "stato_inca",
    "zona_da",
    "zona_a",
    "apparato_da",
    "apparato_a",
    "descrizione",
    "updated_at"
   FROM "public"."inca_cavi" "c";


ALTER VIEW "public"."inca_rows" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operator_daily_v1" AS
 SELECT "f"."report_date",
    "f"."operator_id",
    "concat"("upper"("o"."cognome"), ' ', "initcap"("o"."nome")) AS "operator_name",
    "count"(DISTINCT "f"."rapportino_row_id") AS "n_lines",
    "count"(*) FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "n_valid_time_lines",
    "count"(*) FILTER (WHERE (("f"."tempo_hours" IS NULL) OR ("f"."tempo_hours" <= (0)::numeric))) AS "n_invalid_time_lines",
    "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "total_hours",
    "count"(*) FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))) AS "n_alloc_lines",
    "sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))) AS "total_prodotto_alloc",
    "count"(*) AS "n_tokens_total",
    "sum"("f"."n_tokens_invalid") AS "tempo_invalid_tokens",
    "sum"("f"."n_tokens_zero") AS "tempo_zero_tokens",
        CASE
            WHEN ("sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) > (0)::numeric) THEN ("sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))) / "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))))
            ELSE NULL::numeric
        END AS "productivity_index"
   FROM ("public"."direzione_operator_facts_v1" "f"
     JOIN "public"."operators" "o" ON (("o"."id" = "f"."operator_id")))
  WHERE ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"]))
  GROUP BY "f"."report_date", "f"."operator_id", "o"."cognome", "o"."nome";


ALTER VIEW "public"."kpi_operator_daily_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operator_day_v1" AS
 SELECT "f"."report_date",
    "f"."operator_id",
    "od"."cognome",
    "od"."nome",
    "sum"("f"."tempo_hours") AS "ore",
    "sum"("f"."prodotto_alloc") AS "prodotto",
        CASE
            WHEN ("sum"("f"."tempo_hours") > (0)::numeric) THEN ("sum"("f"."prodotto_alloc") / "sum"("f"."tempo_hours"))
            ELSE NULL::numeric
        END AS "productivity_index"
   FROM ("public"."direzione_operator_facts_v1" "f"
     JOIN "public"."operators_display_v1" "od" ON (("od"."id" = "f"."operator_id")))
  GROUP BY "f"."report_date", "f"."operator_id", "od"."cognome", "od"."nome";


ALTER VIEW "public"."kpi_operator_day_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operator_line_previsto_v2" AS
 SELECT "f"."report_date",
    "f"."operator_id",
    COALESCE(NULLIF(TRIM(BOTH FROM "concat_ws"(' '::"text", "upper"("o"."cognome"), "initcap"("o"."nome"))), ''::"text"), NULLIF(TRIM(BOTH FROM "o"."name"), ''::"text"), '—'::"text") AS "operator_name",
    "f"."manager_id",
    "f"."capo_id",
    "f"."ship_id",
    "f"."ship_code",
    "f"."ship_name",
    NULLIF(TRIM(BOTH FROM "f"."costr"), ''::"text") AS "costr",
    NULLIF(TRIM(BOTH FROM "f"."commessa"), ''::"text") AS "commessa",
    "f"."rapportino_id",
    "f"."rapportino_row_id",
    "f"."row_index",
    NULLIF(TRIM(BOTH FROM "f"."categoria"), ''::"text") AS "categoria",
    NULLIF(TRIM(BOTH FROM "f"."descrizione"), ''::"text") AS "descrizione",
    "f"."activity_type",
    "f"."unit",
    "f"."tempo_hours",
    "f"."sum_line_hours",
    "f"."prodotto_row",
    "f"."prodotto_alloc",
    "rr"."previsto",
        CASE
            WHEN (("rr"."previsto" IS NULL) OR ("rr"."previsto" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("f"."tempo_hours" IS NULL) OR ("f"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("rr"."previsto" * ("f"."tempo_hours" / (8)::numeric))
        END AS "previsto_eff",
        CASE
            WHEN (("rr"."previsto" IS NULL) OR ("rr"."previsto" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("f"."tempo_hours" IS NULL) OR ("f"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("rr"."previsto" * ("f"."tempo_hours" / (8)::numeric)) <= (0)::numeric) THEN NULL::numeric
            WHEN ("f"."prodotto_alloc" IS NULL) THEN NULL::numeric
            ELSE ("f"."prodotto_alloc" / ("rr"."previsto" * ("f"."tempo_hours" / (8)::numeric)))
        END AS "indice_line"
   FROM (("public"."direzione_operator_facts_v1" "f"
     JOIN "public"."operators" "o" ON (("o"."id" = "f"."operator_id")))
     LEFT JOIN "public"."rapportino_rows" "rr" ON (("rr"."id" = "f"."rapportino_row_id")))
  WHERE (("f"."activity_type" = 'QUANTITATIVE'::"public"."activity_type") AND ("f"."unit" = ANY (ARRAY['MT'::"public"."activity_unit", 'PZ'::"public"."activity_unit"])) AND ("rr"."previsto" IS NOT NULL) AND ("rr"."previsto" > (0)::numeric) AND ("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric) AND ("f"."prodotto_alloc" IS NOT NULL));


ALTER VIEW "public"."kpi_operator_line_previsto_v2" OWNER TO "postgres";


COMMENT ON VIEW "public"."kpi_operator_line_previsto_v2" IS 'Line-level canonique: previsto_eff = previsto*(tempo/8). Indice line = prodotto_alloc/previsto_eff. Base = direzione_operator_facts_v1 (APPROVED_UFFICIO).';



CREATE OR REPLACE VIEW "public"."kpi_operator_family_day_v2" AS
 SELECT "report_date",
    "operator_id",
    "operator_name",
    "manager_id",
    "costr",
    "commessa",
    "categoria",
    "descrizione",
    "count"(DISTINCT "rapportino_row_id") AS "n_lines",
    "sum"("tempo_hours") AS "total_hours_indexed",
    "sum"("previsto_eff") AS "total_previsto_eff",
    "sum"("prodotto_alloc") AS "total_prodotto_alloc",
        CASE
            WHEN ("sum"("previsto_eff") > (0)::numeric) THEN ("sum"("prodotto_alloc") / "sum"("previsto_eff"))
            ELSE NULL::numeric
        END AS "productivity_index"
   FROM "public"."kpi_operator_line_previsto_v2" "l"
  GROUP BY "report_date", "operator_id", "operator_name", "manager_id", "costr", "commessa", "categoria", "descrizione";


ALTER VIEW "public"."kpi_operator_family_day_v2" OWNER TO "postgres";


COMMENT ON VIEW "public"."kpi_operator_family_day_v2" IS 'Indice par famille (categoria+descrizione) par jour: Σ(prodotto_alloc) / Σ(previsto_eff).';



CREATE OR REPLACE VIEW "public"."kpi_operator_family_day_v3" AS
 SELECT "report_date",
    "operator_id",
    "operator_name",
    "manager_id",
    "capo_id",
    "costr",
    "commessa",
    "categoria",
    "descrizione",
    ("count"(DISTINCT "rapportino_row_id"))::integer AS "n_lines",
    "sum"("tempo_hours") AS "total_hours_indexed",
    "sum"("previsto_eff") AS "total_previsto_eff",
    "sum"("prodotto_alloc") AS "total_prodotto_alloc",
        CASE
            WHEN ("sum"("previsto_eff") > (0)::numeric) THEN ("sum"("prodotto_alloc") / "sum"("previsto_eff"))
            ELSE NULL::numeric
        END AS "productivity_index"
   FROM "public"."kpi_operator_line_previsto_v2" "l"
  GROUP BY "report_date", "operator_id", "operator_name", "manager_id", "capo_id", "costr", "commessa", "categoria", "descrizione";


ALTER VIEW "public"."kpi_operator_family_day_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."kpi_operator_family_day_v3" IS 'Family day v3 (categoria+descrizione): Σ(prodotto_alloc)/Σ(previsto_eff).';



CREATE OR REPLACE VIEW "public"."kpi_operator_family_day_v3_capo_safe" AS
 SELECT "report_date",
    "operator_id",
    "operator_name",
    "manager_id",
    "capo_id",
    "costr",
    "commessa",
    "categoria",
    "descrizione",
    "n_lines",
    "total_hours_indexed",
    "total_previsto_eff",
    "total_prodotto_alloc",
    "productivity_index"
   FROM "public"."kpi_operator_family_day_v3"
  WHERE ("capo_id" = "auth"."uid"());


ALTER VIEW "public"."kpi_operator_family_day_v3_capo_safe" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operator_family_day_v3_manager_safe" AS
 SELECT "report_date",
    "operator_id",
    "operator_name",
    "manager_id",
    "capo_id",
    "costr",
    "commessa",
    "categoria",
    "descrizione",
    "n_lines",
    "total_hours_indexed",
    "total_previsto_eff",
    "total_prodotto_alloc",
    "productivity_index"
   FROM "public"."kpi_operator_family_day_v3"
  WHERE ("manager_id" = "auth"."uid"());


ALTER VIEW "public"."kpi_operator_family_day_v3_manager_safe" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operator_global_day_v2" AS
 SELECT "report_date",
    "operator_id",
    "operator_name",
    "manager_id",
    "costr",
    "commessa",
    "count"(DISTINCT "rapportino_row_id") AS "n_lines",
    "sum"("tempo_hours") AS "total_hours_indexed",
    "sum"("previsto_eff") AS "total_previsto_eff",
    "sum"("prodotto_alloc") AS "total_prodotto_alloc",
        CASE
            WHEN ("sum"("previsto_eff") > (0)::numeric) THEN ("sum"("prodotto_alloc") / "sum"("previsto_eff"))
            ELSE NULL::numeric
        END AS "productivity_index"
   FROM "public"."kpi_operator_line_previsto_v2" "l"
  GROUP BY "report_date", "operator_id", "operator_name", "manager_id", "costr", "commessa";


ALTER VIEW "public"."kpi_operator_global_day_v2" OWNER TO "postgres";


COMMENT ON VIEW "public"."kpi_operator_global_day_v2" IS 'Indice unique (global) par jour: Σ(prodotto_alloc) / Σ(previsto_eff). Includes costr/commessa/manager_id for filtering.';



CREATE OR REPLACE VIEW "public"."kpi_operator_global_day_v3" AS
 SELECT "report_date",
    "operator_id",
    "operator_name",
    "manager_id",
    "capo_id",
    "costr",
    "commessa",
    ("count"(DISTINCT "rapportino_row_id"))::integer AS "n_lines",
    "sum"("tempo_hours") AS "total_hours_indexed",
    "sum"("previsto_eff") AS "total_previsto_eff",
    "sum"("prodotto_alloc") AS "total_prodotto_alloc",
        CASE
            WHEN ("sum"("previsto_eff") > (0)::numeric) THEN ("sum"("prodotto_alloc") / "sum"("previsto_eff"))
            ELSE NULL::numeric
        END AS "productivity_index"
   FROM "public"."kpi_operator_line_previsto_v2" "l"
  GROUP BY "report_date", "operator_id", "operator_name", "manager_id", "capo_id", "costr", "commessa";


ALTER VIEW "public"."kpi_operator_global_day_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."kpi_operator_global_day_v3" IS 'Global day v3: Σ(prodotto_alloc)/Σ(previsto_eff). Includes manager_id/capo_id/costr/commessa for filtering.';



CREATE OR REPLACE VIEW "public"."kpi_operator_global_day_v3_capo_safe" AS
 SELECT "report_date",
    "operator_id",
    "operator_name",
    "manager_id",
    "capo_id",
    "costr",
    "commessa",
    "n_lines",
    "total_hours_indexed",
    "total_previsto_eff",
    "total_prodotto_alloc",
    "productivity_index"
   FROM "public"."kpi_operator_global_day_v3"
  WHERE ("capo_id" = "auth"."uid"());


ALTER VIEW "public"."kpi_operator_global_day_v3_capo_safe" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operator_global_day_v3_manager_safe" AS
 SELECT "report_date",
    "operator_id",
    "operator_name",
    "manager_id",
    "capo_id",
    "costr",
    "commessa",
    "n_lines",
    "total_hours_indexed",
    "total_previsto_eff",
    "total_prodotto_alloc",
    "productivity_index"
   FROM "public"."kpi_operator_global_day_v3"
  WHERE ("manager_id" = "auth"."uid"());


ALTER VIEW "public"."kpi_operator_global_day_v3_manager_safe" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operator_line_v1" AS
 WITH "base" AS (
         SELECT "rap"."id" AS "rapportino_id",
            "rap"."report_date",
            "rap"."capo_id",
            "rap"."crew_role",
            "rr"."id" AS "rapportino_row_id",
            "rr"."row_index",
            "rr"."categoria",
            "rr"."descrizione",
            "rr"."activity_id",
            "rr"."prodotto" AS "row_prodotto",
            "ro"."operator_id",
            COALESCE(NULLIF(TRIM(BOTH FROM "concat_ws"(' '::"text", "o"."cognome", "o"."nome")), ''::"text"), "o"."name", '—'::"text") AS "operator_name",
            "ro"."line_index",
            "ro"."tempo_raw",
            "ro"."tempo_hours"
           FROM ((("public"."rapportini" "rap"
             JOIN "public"."rapportino_rows" "rr" ON (("rr"."rapportino_id" = "rap"."id")))
             JOIN "public"."rapportino_row_operators" "ro" ON (("ro"."rapportino_row_id" = "rr"."id")))
             JOIN "public"."operators" "o" ON (("o"."id" = "ro"."operator_id")))
        ), "row_totals" AS (
         SELECT "base"."rapportino_row_id",
            "sum"("base"."tempo_hours") FILTER (WHERE (("base"."tempo_hours" IS NOT NULL) AND ("base"."tempo_hours" > (0)::numeric))) AS "row_hours_valid"
           FROM "base"
          GROUP BY "base"."rapportino_row_id"
        ), "filtered" AS (
         SELECT "b"."rapportino_id",
            "b"."report_date",
            "b"."capo_id",
            "b"."crew_role",
            "b"."rapportino_row_id",
            "b"."row_index",
            "b"."categoria",
            "b"."descrizione",
            "b"."activity_id",
            "b"."row_prodotto",
            "b"."operator_id",
            "b"."operator_name",
            "b"."line_index",
            "b"."tempo_raw",
            "b"."tempo_hours"
           FROM ("base" "b"
             LEFT JOIN "public"."catalogo_attivita" "ca" ON (("ca"."id" = "b"."activity_id")))
          WHERE (("upper"(TRIM(BOTH FROM COALESCE("b"."crew_role", ''::"text"))) <> 'ELETTRICISTA'::"text") OR ((("b"."activity_id" IS NOT NULL) AND (COALESCE("ca"."is_kpi", false) IS TRUE)) OR (("b"."activity_id" IS NULL) AND (("upper"(TRIM(BOTH FROM COALESCE("b"."descrizione", ''::"text"))) = 'STESURA'::"text") OR ("upper"(TRIM(BOTH FROM COALESCE("b"."descrizione", ''::"text"))) = 'RIPRESA CAVI'::"text") OR ("upper"(TRIM(BOTH FROM COALESCE("b"."descrizione", ''::"text"))) ~~ 'RIPRESA%'::"text")))))
        )
 SELECT "f"."rapportino_id",
    "f"."report_date",
    "f"."capo_id",
    "f"."rapportino_row_id",
    "f"."row_index",
    "f"."categoria",
    "f"."descrizione",
    "f"."row_prodotto",
    "f"."operator_id",
    "f"."operator_name",
    "f"."line_index",
    "f"."tempo_raw",
    "f"."tempo_hours",
    "rt"."row_hours_valid",
        CASE
            WHEN ("f"."row_prodotto" IS NULL) THEN NULL::numeric
            WHEN (("rt"."row_hours_valid" IS NULL) OR ("rt"."row_hours_valid" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("f"."tempo_hours" IS NULL) OR ("f"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("f"."row_prodotto" * ("f"."tempo_hours" / "rt"."row_hours_valid"))
        END AS "prodotto_alloc"
   FROM ("filtered" "f"
     LEFT JOIN "row_totals" "rt" ON (("rt"."rapportino_row_id" = "f"."rapportino_row_id")));


ALTER VIEW "public"."kpi_operator_line_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operator_productivity_daily_v1" AS
 WITH "line" AS (
         SELECT "l"."report_date",
            "l"."operator_id",
            "l"."rapportino_id",
            "l"."rapportino_row_id",
            "l"."tempo_hours",
            "l"."row_hours_valid",
            "l"."prodotto_alloc"
           FROM "public"."kpi_operator_line_v1" "l"
        ), "rows" AS (
         SELECT "rr"."id" AS "rapportino_row_id",
            "rr"."rapportino_id",
            "rr"."previsto"
           FROM "public"."rapportino_rows" "rr"
        ), "rap" AS (
         SELECT "r"."id" AS "rapportino_id",
            "r"."costr",
            "r"."commessa"
           FROM "public"."rapportini" "r"
        ), "alloc" AS (
         SELECT "l"."report_date",
            "l"."operator_id",
            COALESCE(NULLIF(TRIM(BOTH FROM "rap"."costr"), ''::"text"), NULL::"text") AS "costr",
            COALESCE(NULLIF(TRIM(BOTH FROM "rap"."commessa"), ''::"text"), NULL::"text") AS "commessa",
                CASE
                    WHEN (("l"."tempo_hours" IS NOT NULL) AND ("l"."tempo_hours" > (0)::numeric)) THEN "l"."prodotto_alloc"
                    ELSE NULL::numeric
                END AS "prodotto_alloc",
                CASE
                    WHEN (("l"."tempo_hours" IS NOT NULL) AND ("l"."tempo_hours" > (0)::numeric) AND ("l"."row_hours_valid" IS NOT NULL) AND ("l"."row_hours_valid" > (0)::numeric) AND ("rr"."previsto" IS NOT NULL)) THEN ("rr"."previsto" * ("l"."tempo_hours" / "l"."row_hours_valid"))
                    ELSE NULL::numeric
                END AS "previsto_alloc"
           FROM (("line" "l"
             LEFT JOIN "rows" "rr" ON ((("rr"."rapportino_row_id" = "l"."rapportino_row_id") AND ("rr"."rapportino_id" = "l"."rapportino_id"))))
             LEFT JOIN "rap" ON (("rap"."rapportino_id" = "l"."rapportino_id")))
        ), "ship_map" AS (
         SELECT "s"."id" AS "ship_id",
            NULLIF(TRIM(BOTH FROM "s"."code"), ''::"text") AS "ship_code"
           FROM "public"."ships" "s"
        ), "ship_mgr" AS (
         SELECT "sm"."ship_id",
            "sm"."manager_id"
           FROM "public"."ship_managers" "sm"
        ), "with_mgr" AS (
         SELECT "a"."report_date",
            "a"."operator_id",
            "a"."costr",
            "a"."commessa",
            "sm"."manager_id",
            "a"."previsto_alloc",
            "a"."prodotto_alloc"
           FROM (("alloc" "a"
             LEFT JOIN "ship_map" "m" ON (("m"."ship_code" = "a"."costr")))
             LEFT JOIN "ship_mgr" "sm" ON (("sm"."ship_id" = "m"."ship_id")))
        )
 SELECT "report_date",
    "operator_id",
    "manager_id",
    "costr",
    "commessa",
    "sum"("previsto_alloc") AS "previsto_alloc_sum",
    "sum"("prodotto_alloc") AS "prodotto_alloc_sum",
        CASE
            WHEN ("sum"("previsto_alloc") > (0)::numeric) THEN (("sum"("prodotto_alloc") / "sum"("previsto_alloc")) * (100)::numeric)
            ELSE NULL::numeric
        END AS "productivity_pct"
   FROM "with_mgr"
  GROUP BY "report_date", "operator_id", "manager_id", "costr", "commessa";


ALTER VIEW "public"."kpi_operator_productivity_daily_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."rapportini_canon_v1" AS
 SELECT "id",
    COALESCE("report_date", "data") AS "report_date",
    "capo_id",
    "user_id",
    "status",
    NULLIF(TRIM(BOTH FROM "costr"), ''::"text") AS "costr",
    NULLIF(TRIM(BOTH FROM "commessa"), ''::"text") AS "commessa",
    COALESCE("prodotto_totale", "prodotto_tot", "totale_prodotto") AS "prodotto_totale",
    "created_at",
    "updated_at"
   FROM "public"."rapportini" "r";


ALTER VIEW "public"."rapportini_canon_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."rapportini_canon_v1" IS 'Rapportini canon: report_date=coalesce(report_date,data). prodotto_totale=coalesce(prodotto_totale,prodotto_tot,totale_prodotto).';



CREATE OR REPLACE VIEW "public"."operator_facts_v1" AS
 WITH "rc" AS (
         SELECT "rapportini_canon_v1"."id",
            "rapportini_canon_v1"."report_date",
            "rapportini_canon_v1"."capo_id",
            "rapportini_canon_v1"."user_id",
            "rapportini_canon_v1"."status",
            "rapportini_canon_v1"."costr",
            "rapportini_canon_v1"."commessa",
            "rapportini_canon_v1"."prodotto_totale",
            "rapportini_canon_v1"."created_at",
            "rapportini_canon_v1"."updated_at"
           FROM "public"."rapportini_canon_v1"
          WHERE ("rapportini_canon_v1"."report_date" IS NOT NULL)
        ), "rr" AS (
         SELECT "rrr"."id" AS "row_id",
            "rrr"."rapportino_id",
            "rrr"."row_index",
            "rrr"."prodotto"
           FROM "public"."rapportino_rows" "rrr"
        ), "rro" AS (
         SELECT "ro"."id" AS "token_id",
            "ro"."rapportino_row_id" AS "row_id",
            "ro"."operator_id",
            "ro"."tempo_hours",
            "ro"."tempo_raw"
           FROM "public"."rapportino_row_operators" "ro"
          WHERE ("ro"."operator_id" IS NOT NULL)
        ), "row_hours" AS (
         SELECT "rro_1"."row_id",
            "sum"("rro_1"."tempo_hours") FILTER (WHERE (("rro_1"."tempo_hours" IS NOT NULL) AND ("rro_1"."tempo_hours" > (0)::numeric))) AS "sum_row_hours"
           FROM "rro" "rro_1"
          GROUP BY "rro_1"."row_id"
        ), "ops" AS (
         SELECT "o"."id" AS "operator_id",
            COALESCE(NULLIF(TRIM(BOTH FROM "concat_ws"(' '::"text", "o"."cognome", "o"."nome")), ''::"text"), NULLIF(TRIM(BOTH FROM "o"."name"), ''::"text"), '—'::"text") AS "operator_display_name",
            "o"."operator_code",
            "o"."operator_key",
            "o"."cognome",
            "o"."nome"
           FROM "public"."operators" "o"
        )
 SELECT "rc"."report_date",
    "rc"."id" AS "rapportino_id",
    "rc"."status",
    "rc"."costr",
    "rc"."commessa",
    "rc"."capo_id",
    "rr"."row_id",
    "rr"."row_index",
    "rr"."prodotto" AS "prodotto_row",
    "rro"."token_id",
    "rro"."operator_id",
    "ops"."operator_display_name",
    "ops"."cognome",
    "ops"."nome",
    "ops"."operator_code",
    "ops"."operator_key",
    "rro"."tempo_hours",
    NULLIF(TRIM(BOTH FROM "rro"."tempo_raw"), ''::"text") AS "tempo_raw",
    "rh"."sum_row_hours",
        CASE
            WHEN ("rr"."prodotto" IS NULL) THEN NULL::numeric
            WHEN (("rh"."sum_row_hours" IS NULL) OR ("rh"."sum_row_hours" <= (0)::numeric)) THEN NULL::numeric
            WHEN (("rro"."tempo_hours" IS NULL) OR ("rro"."tempo_hours" <= (0)::numeric)) THEN NULL::numeric
            ELSE ("rr"."prodotto" * ("rro"."tempo_hours" / "rh"."sum_row_hours"))
        END AS "prodotto_alloc"
   FROM (((("rro"
     JOIN "rr" ON (("rr"."row_id" = "rro"."row_id")))
     JOIN "rc" ON (("rc"."id" = "rr"."rapportino_id")))
     LEFT JOIN "row_hours" "rh" ON (("rh"."row_id" = "rro"."row_id")))
     LEFT JOIN "ops" ON (("ops"."operator_id" = "rro"."operator_id")));


ALTER VIEW "public"."operator_facts_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."operator_facts_v1" IS 'Facts: 1 token=(row_operator). prodotto_alloc prorata tempo_hours/sum_row_hours.';



CREATE OR REPLACE VIEW "public"."kpi_operatori_day_v1" AS
 SELECT "f"."report_date",
    "f"."operator_id",
    "max"(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE("o"."cognome", ''::"text") || ' '::"text") || COALESCE("o"."nome", ''::"text"))), ''::"text"), NULLIF("o"."name", ''::"text"), NULLIF("f"."operator_display_name", ''::"text"))) AS "operator_name",
    "max"("o"."cognome") AS "cognome",
    "max"("o"."nome") AS "nome",
    "max"(COALESCE("o"."operator_code", "f"."operator_code")) AS "operator_code",
    "max"(COALESCE("o"."operator_key", "f"."operator_key")) AS "operator_key",
    "count"(*) AS "tokens",
    "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "ore",
    "sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))) AS "prodotto",
        CASE
            WHEN (COALESCE("sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))), (0)::numeric) <= (0)::numeric) THEN NULL::numeric
            ELSE (COALESCE("sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))), (0)::numeric) / "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))))
        END AS "indice"
   FROM ("public"."operator_facts_v1" "f"
     LEFT JOIN "public"."operators" "o" ON (("o"."id" = "f"."operator_id")))
  GROUP BY "f"."report_date", "f"."operator_id";


ALTER VIEW "public"."kpi_operatori_day_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."kpi_operatori_day_v1" IS 'KPI Day per operatore: indice = sum(prodotto_alloc)/sum(ore).';



CREATE OR REPLACE VIEW "public"."kpi_operatori_day_v2" AS
 SELECT "f"."report_date",
    "f"."operator_id",
    "max"(COALESCE(NULLIF(TRIM(BOTH FROM ((COALESCE("o"."cognome", ''::"text") || ' '::"text") || COALESCE("o"."nome", ''::"text"))), ''::"text"), NULLIF("o"."name", ''::"text"), NULLIF("f"."operator_display_name", ''::"text"))) AS "operator_name",
    "max"("o"."cognome") AS "cognome",
    "max"("o"."nome") AS "nome",
    "max"(COALESCE("o"."operator_code", "f"."operator_code")) AS "operator_code",
    "max"(COALESCE("o"."operator_key", "f"."operator_key")) AS "operator_key",
    "count"(*) AS "tokens",
    "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))) AS "ore",
    "sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))) AS "prodotto",
        CASE
            WHEN (COALESCE("sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))), (0)::numeric) <= (0)::numeric) THEN NULL::numeric
            ELSE (COALESCE("sum"("f"."prodotto_alloc") FILTER (WHERE (("f"."prodotto_alloc" IS NOT NULL) AND ("f"."prodotto_alloc" > (0)::numeric))), (0)::numeric) / "sum"("f"."tempo_hours") FILTER (WHERE (("f"."tempo_hours" IS NOT NULL) AND ("f"."tempo_hours" > (0)::numeric))))
        END AS "indice"
   FROM ("public"."operator_facts_v1" "f"
     LEFT JOIN "public"."operators" "o" ON (("o"."id" = "f"."operator_id")))
  GROUP BY "f"."report_date", "f"."operator_id";


ALTER VIEW "public"."kpi_operatori_day_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operatori_month_v1" AS
 SELECT (EXTRACT(year FROM "report_date"))::integer AS "year",
    (EXTRACT(month FROM "report_date"))::integer AS "month",
    ("date_trunc"('month'::"text", ("report_date")::timestamp without time zone))::"date" AS "month_start_date",
    "operator_id",
    "max"("operator_name") AS "operator_name",
    "max"("cognome") AS "cognome",
    "max"("nome") AS "nome",
    "max"("operator_code") AS "operator_code",
    "max"("operator_key") AS "operator_key",
    "sum"("tokens") AS "tokens",
    "sum"("ore") AS "ore",
    "sum"("prodotto") AS "prodotto",
        CASE
            WHEN ("sum"("ore") > (0)::numeric) THEN ("sum"("prodotto") / "sum"("ore"))
            ELSE NULL::numeric
        END AS "indice"
   FROM "public"."kpi_operatori_day_v1" "d"
  GROUP BY (EXTRACT(year FROM "report_date")), (EXTRACT(month FROM "report_date")), (("date_trunc"('month'::"text", ("report_date")::timestamp without time zone))::"date"), "operator_id";


ALTER VIEW "public"."kpi_operatori_month_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operatori_week_v1" AS
 SELECT (EXTRACT(isoyear FROM "report_date"))::integer AS "iso_year",
    (EXTRACT(week FROM "report_date"))::integer AS "iso_week",
    ("date_trunc"('week'::"text", ("report_date")::timestamp without time zone))::"date" AS "week_start_date",
    "operator_id",
    "max"("operator_name") AS "operator_name",
    "max"("cognome") AS "cognome",
    "max"("nome") AS "nome",
    "max"("operator_code") AS "operator_code",
    "max"("operator_key") AS "operator_key",
    "sum"("tokens") AS "tokens",
    "sum"("ore") AS "ore",
    "sum"("prodotto") AS "prodotto",
        CASE
            WHEN ("sum"("ore") > (0)::numeric) THEN ("sum"("prodotto") / "sum"("ore"))
            ELSE NULL::numeric
        END AS "indice"
   FROM "public"."kpi_operatori_day_v1" "d"
  GROUP BY (EXTRACT(isoyear FROM "report_date")), (EXTRACT(week FROM "report_date")), (("date_trunc"('week'::"text", ("report_date")::timestamp without time zone))::"date"), "operator_id";


ALTER VIEW "public"."kpi_operatori_week_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kpi_operatori_year_v1" AS
 SELECT (EXTRACT(year FROM "report_date"))::integer AS "year",
    "operator_id",
    "max"("operator_name") AS "operator_name",
    "max"("cognome") AS "cognome",
    "max"("nome") AS "nome",
    "max"("operator_code") AS "operator_code",
    "max"("operator_key") AS "operator_key",
    "sum"("tokens") AS "tokens",
    "sum"("ore") AS "ore",
    "sum"("prodotto") AS "prodotto",
        CASE
            WHEN ("sum"("ore") > (0)::numeric) THEN ("sum"("prodotto") / "sum"("ore"))
            ELSE NULL::numeric
        END AS "indice"
   FROM "public"."kpi_operatori_day_v1" "d"
  GROUP BY (EXTRACT(year FROM "report_date")), "operator_id";


ALTER VIEW "public"."kpi_operatori_year_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manager_capo_scope" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."manager_capo_scope" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."manager_my_capi_v1" AS
 SELECT "c"."id" AS "capo_id",
    "c"."email" AS "capo_email",
    "c"."display_name" AS "capo_display_name",
    "a"."created_at" AS "assigned_at"
   FROM ("public"."manager_capo_assignments" "a"
     JOIN "public"."profiles" "c" ON (("c"."id" = "a"."capo_id")))
  WHERE (("a"."active" = true) AND ("a"."manager_id" = "auth"."uid"()) AND ("c"."app_role" = 'CAPO'::"text"));


ALTER VIEW "public"."manager_my_capi_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."models" (
    "id" bigint NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "righe" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "models_role_check" CHECK (("role" = ANY (ARRAY['ELETTRICISTA'::"text", 'CARPENTERIA'::"text", 'MONTAGGIO'::"text"])))
);


ALTER TABLE "public"."models" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."models_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."models_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."models_id_seq" OWNED BY "public"."models"."id";



CREATE OR REPLACE VIEW "public"."navemaster_active_inca_file_v1" AS
 WITH "ranked" AS (
         SELECT "inca_files"."ship_id",
            "inca_files"."id" AS "inca_file_id",
            "inca_files"."uploaded_at",
            "row_number"() OVER (PARTITION BY "inca_files"."ship_id" ORDER BY "inca_files"."uploaded_at" DESC) AS "rn"
           FROM "public"."inca_files"
          WHERE ("inca_files"."file_type" = 'XLSX'::"text")
        )
 SELECT "r1"."ship_id",
    "r1"."inca_file_id",
    "r1"."uploaded_at",
    "r2"."inca_file_id" AS "prev_inca_file_id",
    "r2"."uploaded_at" AS "prev_uploaded_at"
   FROM ("ranked" "r1"
     LEFT JOIN "ranked" "r2" ON ((("r2"."ship_id" = "r1"."ship_id") AND ("r2"."rn" = 2))))
  WHERE ("r1"."rn" = 1);


ALTER VIEW "public"."navemaster_active_inca_file_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navemaster_inca_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "inca_file_id" "uuid" NOT NULL,
    "marcacavo" "text" NOT NULL,
    "navemaster_state" "text",
    "inca_state" "text",
    "rule" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "severity" "text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "navemaster_inca_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['CRITICAL'::"text", 'MAJOR'::"text", 'INFO'::"text"])))
);


ALTER TABLE "public"."navemaster_inca_alerts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."navemaster_inca_cavi_current_v1" AS
 WITH "latest" AS (
         SELECT DISTINCT ON ("inca_files"."ship_id", "inca_files"."costr", "inca_files"."commessa") "inca_files"."id" AS "inca_file_id",
            "inca_files"."ship_id",
            "inca_files"."costr",
            "inca_files"."commessa",
            "inca_files"."uploaded_at" AS "inca_uploaded_at",
            "inca_files"."file_name",
            "inca_files"."file_path",
            "inca_files"."file_type"
           FROM "public"."inca_files"
          WHERE (("inca_files"."file_type" IS NULL) OR ("inca_files"."file_type" = 'XLSX'::"text"))
          ORDER BY "inca_files"."ship_id", "inca_files"."costr", "inca_files"."commessa", "inca_files"."uploaded_at" DESC NULLS LAST, "inca_files"."id" DESC
        )
 SELECT "l"."ship_id",
    "l"."costr",
    "l"."commessa",
    "l"."inca_file_id",
    "l"."inca_uploaded_at",
    "l"."file_name" AS "inca_file_name",
    "l"."file_path" AS "inca_file_path",
    "l"."file_type" AS "inca_file_type",
    "c"."codice" AS "marcacavo",
    "c"."codice_inca",
    "c"."tipo",
    "c"."situazione",
    "c"."metri_teo",
    "c"."metri_dis",
    "c"."descrizione",
    "c"."impianto",
    "c"."stato_cantiere"
   FROM ("latest" "l"
     JOIN "public"."inca_cavi" "c" ON (("c"."inca_file_id" = "l"."inca_file_id")));


ALTER VIEW "public"."navemaster_inca_cavi_current_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navemaster_inca_diff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "inca_file_id" "uuid" NOT NULL,
    "marcacavo" "text" NOT NULL,
    "nav_status" "text",
    "inca_status_prev" "text",
    "inca_status_new" "text",
    "match_prev" boolean,
    "match_new" boolean,
    "severity" "text" NOT NULL,
    "rule" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "prev_value" numeric,
    "new_value" numeric,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "navemaster_inca_diff_severity_check" CHECK (("severity" = ANY (ARRAY['CRITICAL'::"text", 'MAJOR'::"text", 'INFO'::"text"])))
);


ALTER TABLE "public"."navemaster_inca_diff" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."navemaster_inca_latest_file_v1" AS
 SELECT DISTINCT ON ("ship_id", "costr", "commessa") "id" AS "inca_file_id",
    "ship_id",
    "costr",
    "commessa",
    "uploaded_at",
    "file_name",
    "file_path",
    "file_type"
   FROM "public"."inca_files"
  WHERE (("file_type" IS NULL) OR ("file_type" = 'XLSX'::"text"))
  ORDER BY "ship_id", "costr", "commessa", "uploaded_at" DESC NULLS LAST, "id" DESC;


ALTER VIEW "public"."navemaster_inca_latest_file_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."navemaster_inca_latest_alerts_v1" AS
 SELECT "lf"."ship_id",
    "lf"."costr",
    "lf"."commessa",
    "lf"."inca_file_id",
    "a"."id",
    "a"."marcacavo",
    "a"."rule",
    "a"."severity",
    "a"."meta",
    "a"."created_at",
    "a"."navemaster_state",
    "a"."inca_state"
   FROM ("public"."navemaster_inca_latest_file_v1" "lf"
     JOIN "public"."navemaster_inca_alerts" "a" ON (("a"."inca_file_id" = "lf"."inca_file_id")));


ALTER VIEW "public"."navemaster_inca_latest_alerts_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."navemaster_inca_latest_diff_v1" AS
 SELECT "lf"."ship_id",
    "lf"."costr",
    "lf"."commessa",
    "lf"."inca_file_id",
    "d"."id",
    "d"."marcacavo",
    "d"."rule",
    "d"."severity",
    "d"."prev_value",
    "d"."new_value",
    "d"."meta",
    "d"."created_at",
    "d"."nav_status",
    "d"."inca_status_prev",
    "d"."inca_status_new",
    "d"."match_prev",
    "d"."match_new"
   FROM ("public"."navemaster_inca_latest_file_v1" "lf"
     JOIN "public"."navemaster_inca_diff" "d" ON (("d"."inca_file_id" = "lf"."inca_file_id")));


ALTER VIEW "public"."navemaster_inca_latest_diff_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."navemaster_inca_live_by_file_v1" AS
 WITH "files" AS (
         SELECT "f"."id" AS "inca_file_id",
            "f"."ship_id",
            "f"."uploaded_at",
            ( SELECT "p"."id"
                   FROM "public"."inca_files" "p"
                  WHERE (("p"."ship_id" = "f"."ship_id") AND ("p"."file_type" = 'XLSX'::"text") AND ("p"."uploaded_at" < "f"."uploaded_at"))
                  ORDER BY "p"."uploaded_at" DESC
                 LIMIT 1) AS "prev_inca_file_id"
           FROM "public"."inca_files" "f"
          WHERE ("f"."file_type" = 'XLSX'::"text")
        )
 SELECT "f"."ship_id",
    "f"."inca_file_id",
    "f"."uploaded_at" AS "snapshot_at",
    "c"."id" AS "inca_cavo_id",
    "c"."codice" AS "marcacavo",
    false AS "marcacavo_asteriscato",
    "c"."descrizione",
    COALESCE(NULLIF(TRIM(BOTH FROM "c"."situazione"), ''::"text"), 'NP'::"text") AS "stato_cantiere",
    "c"."livello",
    "c"."sezione",
    "c"."metri_teo" AS "metri_old",
    "c"."metri_dis" AS "metri_new",
    (COALESCE("c"."metri_dis", (0)::numeric) - COALESCE("c"."metri_teo", (0)::numeric)) AS "diff_mt",
    "c"."apparato_da" AS "app_part",
    "c"."apparato_a" AS "app_arr",
    "c"."zona_da" AS "pt_part",
    "c"."zona_a" AS "pt_arr"
   FROM ("files" "f"
     JOIN "public"."inca_cavi" "c" ON (("c"."inca_file_id" = "f"."inca_file_id")))
UNION ALL
 SELECT "f"."ship_id",
    "f"."inca_file_id",
    "f"."uploaded_at" AS "snapshot_at",
    NULL::"uuid" AS "inca_cavo_id",
    "pc"."codice" AS "marcacavo",
    true AS "marcacavo_asteriscato",
    "pc"."descrizione",
    'MISSING'::"text" AS "stato_cantiere",
    "pc"."livello",
    "pc"."sezione",
    "pc"."metri_teo" AS "metri_old",
    "pc"."metri_dis" AS "metri_new",
    NULL::numeric AS "diff_mt",
    "pc"."apparato_da" AS "app_part",
    "pc"."apparato_a" AS "app_arr",
    "pc"."zona_da" AS "pt_part",
    "pc"."zona_a" AS "pt_arr"
   FROM ("files" "f"
     JOIN "public"."inca_cavi" "pc" ON (("pc"."inca_file_id" = "f"."prev_inca_file_id")))
  WHERE (("f"."prev_inca_file_id" IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
           FROM "public"."inca_cavi" "cc"
          WHERE (("cc"."inca_file_id" = "f"."inca_file_id") AND ("cc"."codice" = "pc"."codice"))))));


ALTER VIEW "public"."navemaster_inca_live_by_file_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."navemaster_inca_live_v1" AS
 WITH "active" AS (
         SELECT "navemaster_active_inca_file_v1"."ship_id",
            "navemaster_active_inca_file_v1"."inca_file_id",
            "navemaster_active_inca_file_v1"."uploaded_at",
            "navemaster_active_inca_file_v1"."prev_inca_file_id"
           FROM "public"."navemaster_active_inca_file_v1"
          WHERE ("navemaster_active_inca_file_v1"."inca_file_id" IS NOT NULL)
        )
 SELECT "a"."ship_id",
    "a"."inca_file_id",
    "a"."uploaded_at" AS "snapshot_at",
    "c"."id" AS "inca_cavo_id",
    "c"."codice" AS "marcacavo",
    false AS "marcacavo_asteriscato",
    "c"."descrizione",
    COALESCE(NULLIF(TRIM(BOTH FROM "c"."situazione"), ''::"text"), 'NP'::"text") AS "stato_cantiere",
    "c"."livello",
    "c"."sezione",
    "c"."metri_teo" AS "metri_old",
    "c"."metri_dis" AS "metri_new",
    (COALESCE("c"."metri_dis", (0)::numeric) - COALESCE("c"."metri_teo", (0)::numeric)) AS "diff_mt",
    "c"."apparato_da" AS "app_part",
    "c"."apparato_a" AS "app_arr",
    "c"."zona_da" AS "pt_part",
    "c"."zona_a" AS "pt_arr"
   FROM ("active" "a"
     JOIN "public"."inca_cavi" "c" ON (("c"."inca_file_id" = "a"."inca_file_id")))
UNION ALL
 SELECT "a"."ship_id",
    "a"."inca_file_id",
    "a"."uploaded_at" AS "snapshot_at",
    NULL::"uuid" AS "inca_cavo_id",
    "pc"."codice" AS "marcacavo",
    true AS "marcacavo_asteriscato",
    "pc"."descrizione",
    'MISSING'::"text" AS "stato_cantiere",
    "pc"."livello",
    "pc"."sezione",
    "pc"."metri_teo" AS "metri_old",
    "pc"."metri_dis" AS "metri_new",
    NULL::numeric AS "diff_mt",
    "pc"."apparato_da" AS "app_part",
    "pc"."apparato_a" AS "app_arr",
    "pc"."zona_da" AS "pt_part",
    "pc"."zona_a" AS "pt_arr"
   FROM ("active" "a"
     JOIN "public"."inca_cavi" "pc" ON (("pc"."inca_file_id" = "a"."prev_inca_file_id")))
  WHERE (("a"."prev_inca_file_id" IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
           FROM "public"."inca_cavi" "cc"
          WHERE (("cc"."inca_file_id" = "a"."inca_file_id") AND ("cc"."codice" = "pc"."codice"))))));


ALTER VIEW "public"."navemaster_inca_live_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."objectives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "total_target" numeric NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."objectives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operator_kpi_facts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "period" "public"."kpi_period" NOT NULL,
    "ref_date" "date",
    "year_iso" integer,
    "week_iso" integer,
    "plan_id" "uuid",
    "slot_id" "uuid",
    "hours_worked" numeric(6,2),
    "hours_theoretical" numeric(6,2),
    "meters_installed" numeric(10,2),
    "defects_count" integer,
    "rework_count" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."operator_kpi_facts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operator_kpi_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "period" "public"."kpi_period" NOT NULL,
    "ref_date" "date",
    "year_iso" integer,
    "week_iso" integer,
    "productivity_pct" numeric(6,2) DEFAULT 0 NOT NULL,
    "attendance_pct" numeric(6,2) DEFAULT 0 NOT NULL,
    "quality_score" numeric(6,2) DEFAULT 0 NOT NULL,
    "rework_rate_pct" numeric(6,2) DEFAULT 0 NOT NULL,
    "total_hours_worked" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_hours_theoretical" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_meters_installed" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_defects" integer DEFAULT 0 NOT NULL,
    "total_rework" integer DEFAULT 0 NOT NULL,
    "computed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "computed_by" "uuid"
);


ALTER TABLE "public"."operator_kpi_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operator_ship_attendance" (
    "plan_date" "date" NOT NULL,
    "ship_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'PRESENT'::"text" NOT NULL,
    "reason" "text",
    "note" "text",
    "reported_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "operator_ship_attendance_status_check" CHECK (("status" = ANY (ARRAY['PRESENT'::"text", 'ABSENT'::"text", 'LATE'::"text", 'REPLACED'::"text", 'UNKNOWN'::"text"])))
);


ALTER TABLE "public"."operator_ship_attendance" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."operators_admin_list_v1" AS
 SELECT "id",
    "name" AS "legacy_name",
    COALESCE(NULLIF(TRIM(BOTH FROM "concat_ws"(' '::"text", "cognome", "nome")), ''::"text"), NULLIF(TRIM(BOTH FROM "name"), ''::"text"), '—'::"text") AS "display_name",
    "roles",
    "cognome",
    "nome",
    "birth_date",
    "operator_code",
    "operator_key",
    "created_by",
    "created_at",
    "updated_at",
    (("cognome" IS NULL) OR (TRIM(BOTH FROM "cognome") = ''::"text") OR ("nome" IS NULL) OR (TRIM(BOTH FROM "nome") = ''::"text") OR ("birth_date" IS NULL)) AS "is_identity_incomplete"
   FROM "public"."operators" "o";


ALTER VIEW "public"."operators_admin_list_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."operators_display_v2" AS
 SELECT "id",
    "cognome",
    "nome",
    "birth_date",
    "operator_code",
    "operator_key",
    "is_normalized",
    COALESCE(NULLIF(TRIM(BOTH FROM (("cognome" || ' '::"text") || "nome")), ''::"text"), NULLIF("name", ''::"text"), NULLIF("operator_code", ''::"text"), NULLIF("operator_key", ''::"text"), '—'::"text") AS "display_name"
   FROM "public"."operators" "o";


ALTER VIEW "public"."operators_display_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "capo_id" "uuid" NOT NULL,
    "role_key" "text" NOT NULL,
    "commessa" "text" DEFAULT ''::"text" NOT NULL,
    "descrizione" "text" DEFAULT ''::"text" NOT NULL,
    "ops_key" "text" DEFAULT ''::"text" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "ops" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."patterns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."percorso_cable_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cable_id" "uuid" NOT NULL,
    "seq" integer NOT NULL,
    "inca_code" "text" NOT NULL
);


ALTER TABLE "public"."percorso_cable_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."percorso_cables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "cable_label" "text" NOT NULL,
    "source_from" "text",
    "source_to" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."percorso_cables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."percorso_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ship_code" "text" NOT NULL,
    "commessa" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by" "uuid",
    "note" "text",
    "inca_file_id" "uuid"
);


ALTER TABLE "public"."percorso_documents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."percorso_documents_stats_v1" AS
 SELECT "d"."id" AS "document_id",
    "count"(DISTINCT "c"."id") AS "cables_count",
    "count"("s".*) AS "segments_count"
   FROM (("public"."percorso_documents" "d"
     LEFT JOIN "public"."percorso_cables" "c" ON (("c"."document_id" = "d"."id")))
     LEFT JOIN "public"."percorso_cable_segments" "s" ON (("s"."cable_id" = "c"."id")))
  GROUP BY "d"."id";


ALTER VIEW "public"."percorso_documents_stats_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."percorso_lot_cables" (
    "lot_id" "uuid" NOT NULL,
    "cable_id" "uuid" NOT NULL
);


ALTER TABLE "public"."percorso_lot_cables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."percorso_lot_segments" (
    "lot_id" "uuid" NOT NULL,
    "inca_code" "text" NOT NULL
);


ALTER TABLE "public"."percorso_lot_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."percorso_lot_validations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lot_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "validated_by" "uuid",
    "validated_at" timestamp with time zone DEFAULT "now"(),
    "decision" "text" NOT NULL,
    "note" "text",
    CONSTRAINT "percorso_lot_validations_decision_check" CHECK (("decision" = ANY (ARRAY['APPROVA'::"text", 'RIFIUTA'::"text"]))),
    CONSTRAINT "percorso_lot_validations_role_check" CHECK (("role" = ANY (ARRAY['CAPO'::"text", 'UFFICIO'::"text"])))
);


ALTER TABLE "public"."percorso_lot_validations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."percorso_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "sviluppo_by" "public"."percorso_sviluppo_by" NOT NULL,
    "status" "public"."percorso_lot_status" DEFAULT 'PROPOSTO'::"public"."percorso_lot_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "comment" "text"
);


ALTER TABLE "public"."percorso_lots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planning_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid",
    "actor_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "uuid",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."planning_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rapportini_corrections_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "old_rapportino_id" "uuid" NOT NULL,
    "new_rapportino_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rapportini_corrections_audit" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."rapportini_with_capo_v1" AS
 SELECT "r"."id",
    "r"."data",
    "r"."capo_id",
    "r"."capo_name",
    "r"."status",
    "r"."cost",
    "r"."commessa",
    "r"."totale_prodotto",
    "r"."ufficio_note",
    "r"."validated_by_capo_at",
    "r"."approved_by_ufficio_at",
    "r"."approved_by_ufficio",
    "r"."returned_by_ufficio_at",
    "r"."returned_by_ufficio",
    "r"."created_at",
    "r"."updated_at",
    "r"."user_id",
    "r"."crew_role",
    "r"."report_date",
    "r"."prodotto_tot",
    "r"."note_ufficio",
    "r"."costr",
    "r"."prodotto_totale",
    "p"."display_name" AS "capo_display_name",
    "p"."email" AS "capo_email",
    "p"."app_role" AS "capo_app_role"
   FROM ("public"."rapportini" "r"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "r"."capo_id")));


ALTER VIEW "public"."rapportini_with_capo_v1" OWNER TO "postgres";


COMMENT ON VIEW "public"."rapportini_with_capo_v1" IS 'Vue canonique: rapportini enrichi avec le CAPO résolu via profiles (capo_display_name/email/app_role). Ne pas dépendre de capo_name legacy.';



CREATE OR REPLACE VIEW "public"."ufficio_rapportini_list_v1" AS
 SELECT "r"."id",
    "r"."report_date",
    "r"."status",
    "r"."capo_id",
    "r"."crew_role",
    "r"."commessa",
    "r"."totale_prodotto",
    "r"."prodotto_totale",
    "r"."prodotto_tot",
    "r"."created_at",
    "r"."updated_at",
    "r"."supersedes_rapportino_id",
    "r"."superseded_by_rapportino_id",
    "r"."correction_reason",
    "r"."correction_created_by",
    "r"."correction_created_at",
    "p"."display_name" AS "capo_display_name",
    "p"."email" AS "capo_email",
    "p"."app_role" AS "capo_app_role"
   FROM ("public"."rapportini" "r"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "r"."capo_id")));


ALTER VIEW "public"."ufficio_rapportini_list_v1" OWNER TO "postgres";


ALTER TABLE ONLY "public"."models" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."models_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."capo_team_days"
    ADD CONSTRAINT "capo_team_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."capo_team_days"
    ADD CONSTRAINT "capo_team_days_unique_capo_ship_date" UNIQUE ("capo_id", "ship_id", "plan_date");



ALTER TABLE ONLY "public"."capo_team_members"
    ADD CONSTRAINT "capo_team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."capo_team_members"
    ADD CONSTRAINT "capo_team_members_unique_team_operator" UNIQUE ("team_id", "operator_id");



ALTER TABLE ONLY "public"."capo_teams"
    ADD CONSTRAINT "capo_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."capo_teams"
    ADD CONSTRAINT "capo_teams_unique_day_position" UNIQUE ("team_day_id", "position");



ALTER TABLE ONLY "public"."catalogo_attivita"
    ADD CONSTRAINT "catalogo_attivita_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalogo_ship_commessa_attivita"
    ADD CONSTRAINT "catalogo_ship_commessa_attivita_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalogo_ship_commessa_attivita"
    ADD CONSTRAINT "catalogo_ship_commessa_attivita_unique" UNIQUE ("ship_id", "commessa", "activity_id");



ALTER TABLE ONLY "public"."cncs_signal_runs"
    ADD CONSTRAINT "cncs_signal_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cncs_signals"
    ADD CONSTRAINT "cncs_signals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_drive_events"
    ADD CONSTRAINT "core_drive_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_file_audit"
    ADD CONSTRAINT "core_file_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_files"
    ADD CONSTRAINT "core_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_meta"
    ADD CONSTRAINT "core_meta_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."impianti"
    ADD CONSTRAINT "impianti_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impianto_capi"
    ADD CONSTRAINT "impianto_capi_pkey" PRIMARY KEY ("impianto_id", "capo_id", "week");



ALTER TABLE ONLY "public"."inca_cavi"
    ADD CONSTRAINT "inca_cavi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inca_cavi_snapshot"
    ADD CONSTRAINT "inca_cavi_snapshot_pkey" PRIMARY KEY ("import_id", "codice");



ALTER TABLE ONLY "public"."inca_change_events"
    ADD CONSTRAINT "inca_change_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inca_files"
    ADD CONSTRAINT "inca_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inca_import_runs"
    ADD CONSTRAINT "inca_import_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inca_import_summaries"
    ADD CONSTRAINT "inca_import_summaries_pkey" PRIMARY KEY ("import_id");



ALTER TABLE ONLY "public"."inca_imports"
    ADD CONSTRAINT "inca_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inca_percorsi"
    ADD CONSTRAINT "inca_percorsi_cavo_ordine_unique" UNIQUE ("inca_cavo_id", "ordine");



ALTER TABLE ONLY "public"."inca_percorsi"
    ADD CONSTRAINT "inca_percorsi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_capo_assignments"
    ADD CONSTRAINT "manager_capo_assignments_pkey" PRIMARY KEY ("capo_id");



ALTER TABLE ONLY "public"."manager_capo_scope"
    ADD CONSTRAINT "manager_capo_scope_manager_id_capo_id_key" UNIQUE ("manager_id", "capo_id");



ALTER TABLE ONLY "public"."manager_capo_scope"
    ADD CONSTRAINT "manager_capo_scope_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_plans"
    ADD CONSTRAINT "manager_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."models"
    ADD CONSTRAINT "models_capo_id_role_key" UNIQUE ("capo_id", "role");



ALTER TABLE ONLY "public"."models"
    ADD CONSTRAINT "models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navemaster_imports"
    ADD CONSTRAINT "navemaster_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navemaster_inca_alerts"
    ADD CONSTRAINT "navemaster_inca_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navemaster_inca_diff"
    ADD CONSTRAINT "navemaster_inca_diff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navemaster_rows"
    ADD CONSTRAINT "navemaster_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navemaster_rows"
    ADD CONSTRAINT "navemaster_rows_unique_import_codice" UNIQUE ("navemaster_import_id", "marcacavo");



ALTER TABLE ONLY "public"."objectives"
    ADD CONSTRAINT "objectives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operator_kpi_facts"
    ADD CONSTRAINT "operator_kpi_facts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operator_kpi_snapshots"
    ADD CONSTRAINT "operator_kpi_snapshots_operator_id_period_ref_date_year_iso_key" UNIQUE ("operator_id", "period", "ref_date", "year_iso", "week_iso");



ALTER TABLE ONLY "public"."operator_kpi_snapshots"
    ADD CONSTRAINT "operator_kpi_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patterns"
    ADD CONSTRAINT "patterns_capo_id_role_key_commessa_descrizione_ops_key_key" UNIQUE ("capo_id", "role_key", "commessa", "descrizione", "ops_key");



ALTER TABLE ONLY "public"."patterns"
    ADD CONSTRAINT "patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."percorso_cable_segments"
    ADD CONSTRAINT "percorso_cable_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."percorso_cables"
    ADD CONSTRAINT "percorso_cables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."percorso_documents"
    ADD CONSTRAINT "percorso_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."percorso_lot_cables"
    ADD CONSTRAINT "percorso_lot_cables_pkey" PRIMARY KEY ("lot_id", "cable_id");



ALTER TABLE ONLY "public"."percorso_lot_segments"
    ADD CONSTRAINT "percorso_lot_segments_pkey" PRIMARY KEY ("lot_id", "inca_code");



ALTER TABLE ONLY "public"."percorso_lot_validations"
    ADD CONSTRAINT "percorso_lot_validations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."percorso_lots"
    ADD CONSTRAINT "percorso_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_capo_slots"
    ADD CONSTRAINT "plan_capo_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_capo_slots"
    ADD CONSTRAINT "plan_capo_slots_plan_id_capo_id_key" UNIQUE ("plan_id", "capo_id");



ALTER TABLE ONLY "public"."plan_slot_members"
    ADD CONSTRAINT "plan_slot_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planning_audit"
    ADD CONSTRAINT "planning_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rapportini_corrections_audit"
    ADD CONSTRAINT "rapportini_corrections_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rapportini"
    ADD CONSTRAINT "rapportini_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rapportino_cavi"
    ADD CONSTRAINT "rapportino_cavi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rapportino_inca_cavi"
    ADD CONSTRAINT "rapportino_inca_cavi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rapportino_row_operators"
    ADD CONSTRAINT "rapportino_row_operators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rapportino_rows"
    ADD CONSTRAINT "rapportino_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ship_capos"
    ADD CONSTRAINT "ship_capos_pkey" PRIMARY KEY ("ship_id", "capo_id");



ALTER TABLE ONLY "public"."ship_managers"
    ADD CONSTRAINT "ship_managers_pkey" PRIMARY KEY ("ship_id", "manager_id");



ALTER TABLE ONLY "public"."ship_operators"
    ADD CONSTRAINT "ship_operators_pkey" PRIMARY KEY ("ship_id", "operator_id");



ALTER TABLE ONLY "public"."ships"
    ADD CONSTRAINT "ships_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "capo_ship_assignments_no_dup_ship" ON "public"."capo_ship_assignments" USING "btree" ("plan_date", "capo_id", "ship_id");



CREATE UNIQUE INDEX "capo_ship_assignments_unique" ON "public"."capo_ship_assignments" USING "btree" ("plan_date", "capo_id", "position");



CREATE UNIQUE INDEX "capo_ship_attendance_plan_ship_capo_uniq" ON "public"."capo_ship_attendance" USING "btree" ("plan_date", "ship_id", "capo_id");



CREATE UNIQUE INDEX "capo_ship_attendance_unique" ON "public"."capo_ship_attendance" USING "btree" ("plan_date", "ship_id", "capo_id");



CREATE UNIQUE INDEX "capo_ship_expected_operators_unique" ON "public"."capo_ship_expected_operators" USING "btree" ("plan_date", "ship_id", "operator_id");



CREATE INDEX "capo_team_days_capo_date_idx" ON "public"."capo_team_days" USING "btree" ("capo_id", "plan_date");



CREATE INDEX "capo_team_days_ship_date_idx" ON "public"."capo_team_days" USING "btree" ("ship_id", "plan_date");



CREATE INDEX "capo_team_members_operator_idx" ON "public"."capo_team_members" USING "btree" ("operator_id");



CREATE INDEX "capo_team_members_team_idx" ON "public"."capo_team_members" USING "btree" ("team_id");



CREATE INDEX "capo_teams_team_day_idx" ON "public"."capo_teams" USING "btree" ("team_day_id");



CREATE INDEX "catalogo_attivita_categoria_idx" ON "public"."catalogo_attivita" USING "btree" ("categoria");



CREATE INDEX "catalogo_attivita_descrizione_idx" ON "public"."catalogo_attivita" USING "btree" ("descrizione");



CREATE INDEX "catalogo_attivita_is_active_idx" ON "public"."catalogo_attivita" USING "btree" ("is_active");



CREATE INDEX "catalogo_attivita_search_idx" ON "public"."catalogo_attivita" USING "btree" ("lower"(TRIM(BOTH FROM "descrizione")));



CREATE INDEX "catalogo_attivita_synonyms_gin" ON "public"."catalogo_attivita" USING "gin" ("synonyms");



CREATE UNIQUE INDEX "catalogo_attivita_unique_cat_desc" ON "public"."catalogo_attivita" USING "btree" ("lower"(TRIM(BOTH FROM "categoria")), "lower"(TRIM(BOTH FROM "descrizione")));



CREATE UNIQUE INDEX "catalogo_attivita_unique_cat_desc_unit" ON "public"."catalogo_attivita" USING "btree" ("categoria", "descrizione", "unit");



CREATE INDEX "cncs_signal_runs_created_at_idx" ON "public"."cncs_signal_runs" USING "btree" ("created_at" DESC);



CREATE INDEX "cncs_signal_runs_rapportino_id_idx" ON "public"."cncs_signal_runs" USING "btree" ("rapportino_id");



CREATE INDEX "cncs_signals_code_idx" ON "public"."cncs_signals" USING "btree" ("code");



CREATE INDEX "cncs_signals_rapportino_id_idx" ON "public"."cncs_signals" USING "btree" ("rapportino_id");



CREATE INDEX "cncs_signals_run_id_idx" ON "public"."cncs_signals" USING "btree" ("run_id");



CREATE INDEX "core_drive_events_created_by_idx" ON "public"."core_drive_events" USING "btree" ("created_by");



CREATE INDEX "core_drive_events_event_type_idx" ON "public"."core_drive_events" USING "btree" ("event_type");



CREATE INDEX "core_drive_events_file_created_idx" ON "public"."core_drive_events" USING "btree" ("file_id", "created_at" DESC);



CREATE INDEX "core_drive_events_file_id_created_at_idx" ON "public"."core_drive_events" USING "btree" ("file_id", "created_at" DESC);



CREATE INDEX "core_drive_events_request_id_idx" ON "public"."core_drive_events" USING "btree" ("request_id");



CREATE INDEX "core_file_audit_file_idx" ON "public"."core_file_audit" USING "btree" ("core_file_id");



CREATE INDEX "core_file_audit_time_idx" ON "public"."core_file_audit" USING "btree" ("performed_at" DESC);



CREATE UNIQUE INDEX "core_files_bucket_path_key" ON "public"."core_files" USING "btree" ("storage_bucket", "storage_path");



CREATE INDEX "core_files_cantiere_categoria_idx" ON "public"."core_files" USING "btree" ("cantiere", "categoria", "created_at" DESC);



CREATE INDEX "core_files_claim_idx" ON "public"."core_files" USING "btree" ("claim_id");



CREATE INDEX "core_files_inca_idx" ON "public"."core_files" USING "btree" ("inca_file_id", "inca_cavo_id");



CREATE INDEX "core_files_kpi_idx" ON "public"."core_files" USING "btree" ("kpi_ref");



CREATE INDEX "core_files_rapportino_id_idx" ON "public"."core_files" USING "btree" ("rapportino_id");



CREATE INDEX "core_files_rapportino_idx" ON "public"."core_files" USING "btree" ("rapportino_id");



CREATE INDEX "core_files_version_idx" ON "public"."core_files" USING "btree" ("version_of", "version_num");



CREATE INDEX "idx_catalogo_ship_commessa_attivita_active" ON "public"."catalogo_ship_commessa_attivita" USING "btree" ("is_active");



CREATE INDEX "idx_catalogo_ship_commessa_attivita_activity" ON "public"."catalogo_ship_commessa_attivita" USING "btree" ("activity_id");



CREATE INDEX "idx_catalogo_ship_commessa_attivita_ship_commessa" ON "public"."catalogo_ship_commessa_attivita" USING "btree" ("ship_id", "commessa");



CREATE INDEX "idx_rapportino_inca_codice" ON "public"."rapportino_inca_cavi" USING "btree" ("costr_cache", "codice_cache");



CREATE INDEX "idx_rapportino_inca_lookup" ON "public"."rapportino_inca_cavi" USING "btree" ("rapportino_id");



CREATE UNIQUE INDEX "impianti_ship_code_uq" ON "public"."impianti" USING "btree" ("ship_id", "code");



CREATE INDEX "inca_cavi_codice_inca_idx" ON "public"."inca_cavi" USING "btree" ("codice_inca");



CREATE INDEX "inca_cavi_commessa_idx" ON "public"."inca_cavi" USING "btree" ("commessa");



CREATE UNIQUE INDEX "inca_cavi_file_codice_unique" ON "public"."inca_cavi" USING "btree" ("inca_file_id", "codice");



CREATE INDEX "inca_cavi_file_idx" ON "public"."inca_cavi" USING "btree" ("inca_file_id");



CREATE INDEX "inca_cavi_file_stato_idx" ON "public"."inca_cavi" USING "btree" ("inca_file_id", "stato_inca");



CREATE INDEX "inca_cavi_from_file_idx" ON "public"."inca_cavi" USING "btree" ("from_file_id");



CREATE INDEX "inca_cavi_last_import_id_idx" ON "public"."inca_cavi" USING "btree" ("last_import_id");



CREATE INDEX "inca_cavi_missing_latest_idx" ON "public"."inca_cavi" USING "btree" ("missing_in_latest_import");



CREATE INDEX "inca_cavi_progress_idx" ON "public"."inca_cavi" USING "btree" ("inca_file_id", "progress_percent", "progress_side");



CREATE INDEX "inca_cavi_snapshot_file_codice_idx" ON "public"."inca_cavi_snapshot" USING "btree" ("inca_file_id", "codice");



CREATE INDEX "inca_cavi_snapshot_import_id_idx" ON "public"."inca_cavi_snapshot" USING "btree" ("import_id");



CREATE INDEX "inca_change_events_codice_idx" ON "public"."inca_change_events" USING "btree" ("codice");



CREATE INDEX "inca_change_events_severity_idx" ON "public"."inca_change_events" USING "btree" ("severity");



CREATE INDEX "inca_change_events_to_import_id_idx" ON "public"."inca_change_events" USING "btree" ("to_import_id");



CREATE INDEX "inca_files_costr_commessa_idx" ON "public"."inca_files" USING "btree" ("costr", "commessa");



CREATE INDEX "inca_files_group_key_uploaded_at_idx" ON "public"."inca_files" USING "btree" ("group_key", "uploaded_at" DESC);



CREATE INDEX "inca_files_project_idx" ON "public"."inca_files" USING "btree" ("costr", "commessa", "project_code");



CREATE INDEX "inca_files_ship_id_idx" ON "public"."inca_files" USING "btree" ("ship_id");



CREATE INDEX "inca_import_runs_group_key_created_at_idx" ON "public"."inca_import_runs" USING "btree" ("group_key", "created_at" DESC);



CREATE INDEX "inca_imports_imported_at_idx" ON "public"."inca_imports" USING "btree" ("imported_at");



CREATE INDEX "inca_imports_inca_file_id_idx" ON "public"."inca_imports" USING "btree" ("inca_file_id");



CREATE INDEX "inca_percorsi_cavo_ordine_idx" ON "public"."inca_percorsi" USING "btree" ("inca_cavo_id", "ordine");



CREATE INDEX "inca_percorsi_nodo_idx" ON "public"."inca_percorsi" USING "btree" ("nodo");



CREATE INDEX "manager_capo_assignments_active_idx" ON "public"."manager_capo_assignments" USING "btree" ("active");



CREATE INDEX "manager_capo_assignments_manager_id_idx" ON "public"."manager_capo_assignments" USING "btree" ("manager_id");



CREATE INDEX "manager_capo_scope_capo_idx" ON "public"."manager_capo_scope" USING "btree" ("capo_id");



CREATE INDEX "manager_capo_scope_manager_idx" ON "public"."manager_capo_scope" USING "btree" ("manager_id");



CREATE INDEX "manager_plans_date_idx" ON "public"."manager_plans" USING "btree" ("plan_date");



CREATE INDEX "manager_plans_is_locked_idx" ON "public"."manager_plans" USING "btree" ("is_locked") WHERE ("is_locked" = true);



CREATE INDEX "manager_plans_manager_idx" ON "public"."manager_plans" USING "btree" ("manager_id");



CREATE INDEX "manager_plans_status_idx" ON "public"."manager_plans" USING "btree" ("status");



CREATE UNIQUE INDEX "manager_plans_unique_day" ON "public"."manager_plans" USING "btree" ("manager_id", "plan_date") WHERE ("period_type" = 'DAY'::"public"."plan_period_type");



CREATE UNIQUE INDEX "manager_plans_unique_week" ON "public"."manager_plans" USING "btree" ("manager_id", "year_iso", "week_iso") WHERE ("period_type" = 'WEEK'::"public"."plan_period_type");



CREATE INDEX "manager_plans_week_idx" ON "public"."manager_plans" USING "btree" ("year_iso", "week_iso");



CREATE UNIQUE INDEX "navemaster_imports_one_active_per_ship_idx" ON "public"."navemaster_imports" USING "btree" ("ship_id") WHERE ("is_active" = true);



CREATE INDEX "navemaster_imports_ship_active_idx" ON "public"."navemaster_imports" USING "btree" ("ship_id", "is_active", "imported_at" DESC);



CREATE INDEX "navemaster_imports_ship_idx" ON "public"."navemaster_imports" USING "btree" ("ship_id");



CREATE INDEX "navemaster_inca_alerts_inca_rule_sev_idx" ON "public"."navemaster_inca_alerts" USING "btree" ("inca_file_id", "rule", "severity");



CREATE INDEX "navemaster_inca_alerts_ship_idx" ON "public"."navemaster_inca_alerts" USING "btree" ("ship_id", "created_at" DESC);



CREATE INDEX "navemaster_inca_diff_inca_idx" ON "public"."navemaster_inca_diff" USING "btree" ("inca_file_id");



CREATE INDEX "navemaster_inca_diff_inca_rule_sev_idx" ON "public"."navemaster_inca_diff" USING "btree" ("inca_file_id", "rule", "severity");



CREATE INDEX "navemaster_inca_diff_ship_idx" ON "public"."navemaster_inca_diff" USING "btree" ("ship_id", "created_at" DESC);



CREATE UNIQUE INDEX "navemaster_one_active_per_ship" ON "public"."navemaster_imports" USING "btree" ("ship_id") WHERE "is_active";



CREATE INDEX "navemaster_rows_import_id_idx" ON "public"."navemaster_rows" USING "btree" ("navemaster_import_id");



CREATE INDEX "navemaster_rows_import_idx" ON "public"."navemaster_rows" USING "btree" ("navemaster_import_id");



CREATE INDEX "navemaster_rows_marcacavo_idx" ON "public"."navemaster_rows" USING "btree" ("marcacavo");



CREATE UNIQUE INDEX "navemaster_rows_unique_codice" ON "public"."navemaster_rows" USING "btree" ("navemaster_import_id", "marcacavo");



CREATE INDEX "operator_kpi_facts_operator_idx" ON "public"."operator_kpi_facts" USING "btree" ("operator_id");



CREATE INDEX "operator_kpi_facts_plan_idx" ON "public"."operator_kpi_facts" USING "btree" ("plan_id");



CREATE INDEX "operator_kpi_facts_ref_date_idx" ON "public"."operator_kpi_facts" USING "btree" ("ref_date");



CREATE INDEX "operator_kpi_facts_slot_idx" ON "public"."operator_kpi_facts" USING "btree" ("slot_id");



CREATE INDEX "operator_kpi_facts_week_idx" ON "public"."operator_kpi_facts" USING "btree" ("year_iso", "week_iso");



CREATE INDEX "operator_kpi_snapshots_operator_idx" ON "public"."operator_kpi_snapshots" USING "btree" ("operator_id");



CREATE INDEX "operator_kpi_snapshots_ref_date_idx" ON "public"."operator_kpi_snapshots" USING "btree" ("ref_date");



CREATE INDEX "operator_kpi_snapshots_week_idx" ON "public"."operator_kpi_snapshots" USING "btree" ("year_iso", "week_iso");



CREATE UNIQUE INDEX "operator_ship_attendance_plan_ship_operator_uniq" ON "public"."operator_ship_attendance" USING "btree" ("plan_date", "ship_id", "operator_id");



CREATE UNIQUE INDEX "operator_ship_attendance_unique" ON "public"."operator_ship_attendance" USING "btree" ("plan_date", "ship_id", "operator_id");



CREATE INDEX "operators_cognome_nome_search_idx" ON "public"."operators" USING "btree" ("lower"(TRIM(BOTH FROM COALESCE("cognome", ''::"text"))), "lower"(TRIM(BOTH FROM COALESCE("nome", ''::"text"))));



CREATE UNIQUE INDEX "operators_name_unique" ON "public"."operators" USING "btree" ("name");



CREATE UNIQUE INDEX "operators_operator_code_unique" ON "public"."operators" USING "btree" ("lower"(TRIM(BOTH FROM "operator_code"))) WHERE (("operator_code" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "operator_code")) > 0));



CREATE UNIQUE INDEX "operators_operator_key_unique" ON "public"."operators" USING "btree" ("operator_key") WHERE ("operator_key" IS NOT NULL);



CREATE INDEX "percorso_cable_segments_cable_id_seq_idx" ON "public"."percorso_cable_segments" USING "btree" ("cable_id", "seq");



CREATE INDEX "percorso_cable_segments_inca_code_idx" ON "public"."percorso_cable_segments" USING "btree" ("inca_code");



CREATE INDEX "percorso_documents_inca_file_id_idx" ON "public"."percorso_documents" USING "btree" ("inca_file_id");



CREATE INDEX "plan_capo_slots_capo_idx" ON "public"."plan_capo_slots" USING "btree" ("capo_id");



CREATE INDEX "plan_capo_slots_plan_idx" ON "public"."plan_capo_slots" USING "btree" ("plan_id");



CREATE INDEX "plan_slot_members_operator_idx" ON "public"."plan_slot_members" USING "btree" ("operator_id");



CREATE INDEX "plan_slot_members_slot_idx" ON "public"."plan_slot_members" USING "btree" ("slot_id");



CREATE UNIQUE INDEX "plan_slot_members_unique_plan_operator" ON "public"."plan_slot_members" USING "btree" ("plan_id", "operator_id");



CREATE INDEX "planning_audit_actor_idx" ON "public"."planning_audit" USING "btree" ("actor_id");



CREATE INDEX "planning_audit_created_idx" ON "public"."planning_audit" USING "btree" ("created_at");



CREATE INDEX "planning_audit_plan_idx" ON "public"."planning_audit" USING "btree" ("plan_id");



CREATE INDEX "rapportini_capo_date_idx" ON "public"."rapportini" USING "btree" ("capo_id", "data" DESC);



CREATE INDEX "rapportini_corrections_audit_new_idx" ON "public"."rapportini_corrections_audit" USING "btree" ("new_rapportino_id");



CREATE INDEX "rapportini_corrections_audit_old_idx" ON "public"."rapportini_corrections_audit" USING "btree" ("old_rapportino_id");



CREATE INDEX "rapportini_costr_commessa_idx" ON "public"."rapportini" USING "btree" ("costr", "commessa");



CREATE INDEX "rapportini_report_date_idx" ON "public"."rapportini" USING "btree" ("report_date");



CREATE INDEX "rapportini_returned_inbox_idx" ON "public"."rapportini" USING "btree" ("capo_id", "crew_role", "updated_at" DESC) WHERE ("status" = 'RETURNED'::"text");



CREATE INDEX "rapportini_superseded_by_idx" ON "public"."rapportini" USING "btree" ("superseded_by_rapportino_id");



CREATE INDEX "rapportini_supersedes_idx" ON "public"."rapportini" USING "btree" ("supersedes_rapportino_id");



CREATE UNIQUE INDEX "rapportini_user_crew_date_key" ON "public"."rapportini" USING "btree" ("user_id", "crew_role", "report_date");



CREATE INDEX "rapportino_cavi_by_cavo" ON "public"."rapportino_cavi" USING "btree" ("inca_cavo_id");



CREATE INDEX "rapportino_cavi_by_rapportino" ON "public"."rapportino_cavi" USING "btree" ("rapportino_id");



CREATE INDEX "rapportino_cavi_inca_cavo_id_idx" ON "public"."rapportino_cavi" USING "btree" ("inca_cavo_id");



CREATE INDEX "rapportino_cavi_inca_cavo_id_rapportino_id_idx" ON "public"."rapportino_cavi" USING "btree" ("inca_cavo_id", "rapportino_id");



CREATE UNIQUE INDEX "rapportino_cavi_unique" ON "public"."rapportino_cavi" USING "btree" ("rapportino_id", "inca_cavo_id");



CREATE INDEX "rapportino_inca_cavi_inca_idx" ON "public"."rapportino_inca_cavi" USING "btree" ("inca_cavo_id");



CREATE UNIQUE INDEX "rapportino_inca_cavi_ripresa_unique_by_codice" ON "public"."rapportino_inca_cavi" USING "btree" ("costr_cache", "commessa_cache", "codice_cache") WHERE ("step_type" = 'RIPRESA'::"public"."cavo_step_type");



CREATE UNIQUE INDEX "rapportino_inca_cavi_unique" ON "public"."rapportino_inca_cavi" USING "btree" ("rapportino_id", "inca_cavo_id");



CREATE INDEX "rapportino_rows_activity_id_idx" ON "public"."rapportino_rows" USING "btree" ("activity_id");



CREATE INDEX "rapportino_rows_rapportino_id_idx" ON "public"."rapportino_rows" USING "btree" ("rapportino_id");



CREATE INDEX "rapportino_rows_rapportino_id_position_idx" ON "public"."rapportino_rows" USING "btree" ("rapportino_id", "position");



CREATE INDEX "rro_operator_id_idx" ON "public"."rapportino_row_operators" USING "btree" ("operator_id");



CREATE INDEX "rro_row_id_idx" ON "public"."rapportino_row_operators" USING "btree" ("rapportino_row_id");



CREATE UNIQUE INDEX "rro_row_line_unique" ON "public"."rapportino_row_operators" USING "btree" ("rapportino_row_id", "line_index");



CREATE UNIQUE INDEX "rro_row_operator_unique" ON "public"."rapportino_row_operators" USING "btree" ("rapportino_row_id", "operator_id");



CREATE INDEX "ship_capos_capo_id_idx" ON "public"."ship_capos" USING "btree" ("capo_id");



CREATE INDEX "ship_capos_ship_id_idx" ON "public"."ship_capos" USING "btree" ("ship_id");



CREATE INDEX "ship_operators_operator_id_idx" ON "public"."ship_operators" USING "btree" ("operator_id");



CREATE INDEX "ship_operators_ship_id_active_idx" ON "public"."ship_operators" USING "btree" ("ship_id", "active");



CREATE INDEX "ships_ship_code_idx" ON "public"."ships" USING "btree" ("code");



CREATE UNIQUE INDEX "uniq_ripresa_per_cavo" ON "public"."rapportino_inca_cavi" USING "btree" ("costr_cache", "codice_cache") WHERE ("step_type" = 'RIPRESA'::"public"."cavo_step_type");



CREATE OR REPLACE TRIGGER "before_ins_rapportino_inca_cache" BEFORE INSERT ON "public"."rapportino_inca_cavi" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fill_rapportino_inca_cache"();



CREATE OR REPLACE TRIGGER "operators_require_identity" BEFORE INSERT OR UPDATE ON "public"."operators" FOR EACH ROW EXECUTE FUNCTION "public"."trg_operators_require_identity"();



CREATE OR REPLACE TRIGGER "rapportini_apply_inca_progress_on_status" AFTER UPDATE OF "status" ON "public"."rapportini" FOR EACH ROW EXECUTE FUNCTION "public"."trg_rapportini_apply_inca_progress_on_status"();



CREATE OR REPLACE TRIGGER "rapportini_status_product_trg" AFTER UPDATE OF "status" ON "public"."rapportini" FOR EACH ROW EXECUTE FUNCTION "public"."trg_rapportini_on_status_product"();



CREATE OR REPLACE TRIGGER "set_profile_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_profile_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_models" BEFORE UPDATE ON "public"."models" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_operators" BEFORE UPDATE ON "public"."operators" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_patterns" BEFORE UPDATE ON "public"."patterns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_profiles" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "t_archive_on_rapportino_approved" AFTER UPDATE OF "status" ON "public"."rapportini" FOR EACH ROW EXECUTE FUNCTION "public"."trg_archive_on_rapportino_approved"();



CREATE OR REPLACE TRIGGER "trg_capo_team_days_fill_owner" BEFORE INSERT ON "public"."capo_team_days" FOR EACH ROW EXECUTE FUNCTION "public"."capo_team_days_fill_owner"();



CREATE OR REPLACE TRIGGER "trg_capo_team_days_updated_at" BEFORE UPDATE ON "public"."capo_team_days" FOR EACH ROW EXECUTE FUNCTION "public"."core_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_capo_team_members_updated_at" BEFORE UPDATE ON "public"."capo_team_members" FOR EACH ROW EXECUTE FUNCTION "public"."core_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_capo_teams_updated_at" BEFORE UPDATE ON "public"."capo_teams" FOR EACH ROW EXECUTE FUNCTION "public"."core_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_catalogo_attivita_updated_at" BEFORE UPDATE ON "public"."catalogo_attivita" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_catalogo_ship_commessa_attivita_updated_at" BEFORE UPDATE ON "public"."catalogo_ship_commessa_attivita" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_consolidate_inca_on_rapportino_approved" AFTER UPDATE OF "status" ON "public"."rapportini" FOR EACH ROW EXECUTE FUNCTION "public"."fn_consolidate_inca_on_rapportino_approved"();



CREATE OR REPLACE TRIGGER "trg_core_drive_events_block_delete" BEFORE DELETE ON "public"."core_drive_events" FOR EACH ROW EXECUTE FUNCTION "public"."core_drive_events_block_mutations"();



CREATE OR REPLACE TRIGGER "trg_core_drive_events_block_update" BEFORE UPDATE ON "public"."core_drive_events" FOR EACH ROW EXECUTE FUNCTION "public"."core_drive_events_block_mutations"();



CREATE OR REPLACE TRIGGER "trg_core_file_versioning" BEFORE INSERT ON "public"."core_files" FOR EACH ROW EXECUTE FUNCTION "public"."replace_core_file_version"();



CREATE OR REPLACE TRIGGER "trg_fill_plan_id_on_slot_member" BEFORE INSERT OR UPDATE OF "slot_id" ON "public"."plan_slot_members" FOR EACH ROW EXECUTE FUNCTION "public"."fn_fill_plan_id_on_slot_member"();



CREATE OR REPLACE TRIGGER "trg_guard_profiles_capo_ui_mode_v1" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profiles_capo_ui_mode_v1"();



CREATE OR REPLACE TRIGGER "trg_hydrate_rapportino_inca_cavi_caches" BEFORE INSERT OR UPDATE OF "rapportino_id", "inca_cavo_id" ON "public"."rapportino_inca_cavi" FOR EACH ROW EXECUTE FUNCTION "public"."fn_hydrate_rapportino_inca_cavi_caches"();



CREATE OR REPLACE TRIGGER "trg_hydrate_rapportino_rows_previsto" BEFORE INSERT OR UPDATE OF "descrizione", "activity_id", "previsto", "rapportino_id", "categoria" ON "public"."rapportino_rows" FOR EACH ROW EXECUTE FUNCTION "public"."fn_hydrate_rapportino_rows_previsto"();



CREATE OR REPLACE TRIGGER "trg_manager_plans_updated_at" BEFORE UPDATE ON "public"."manager_plans" FOR EACH ROW EXECUTE FUNCTION "public"."updated_at"();



CREATE OR REPLACE TRIGGER "trg_norm_commessa_inca_cavi" BEFORE INSERT OR UPDATE ON "public"."inca_cavi" FOR EACH ROW EXECUTE FUNCTION "public"."fn_normalize_commessa_upper"();



CREATE OR REPLACE TRIGGER "trg_norm_commessa_inca_files" BEFORE INSERT OR UPDATE ON "public"."inca_files" FOR EACH ROW EXECUTE FUNCTION "public"."fn_normalize_commessa_upper"();



CREATE OR REPLACE TRIGGER "trg_norm_commessa_rapportini" BEFORE INSERT OR UPDATE ON "public"."rapportini" FOR EACH ROW EXECUTE FUNCTION "public"."fn_normalize_commessa_upper"();



CREATE OR REPLACE TRIGGER "trg_operator_auto_normalize" BEFORE INSERT OR UPDATE ON "public"."operators" FOR EACH ROW EXECUTE FUNCTION "public"."fn_operator_auto_normalize"();



CREATE OR REPLACE TRIGGER "trg_operators_set_operator_key" BEFORE INSERT OR UPDATE OF "cognome", "birth_date" ON "public"."operators" FOR EACH ROW EXECUTE FUNCTION "public"."trg_operators_set_operator_key"();



CREATE OR REPLACE TRIGGER "trg_plan_capo_slots_updated_at" BEFORE UPDATE ON "public"."plan_capo_slots" FOR EACH ROW EXECUTE FUNCTION "public"."updated_at"();



CREATE OR REPLACE TRIGGER "trg_plan_slot_members_updated_at" BEFORE UPDATE ON "public"."plan_slot_members" FOR EACH ROW EXECUTE FUNCTION "public"."updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_frozen_update" BEFORE DELETE OR UPDATE ON "public"."core_files" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_update_on_frozen_files"();



CREATE OR REPLACE TRIGGER "trg_profiles_sync_roles" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_roles"();



CREATE OR REPLACE TRIGGER "trg_rapportino_inca_cavi_auto_tp" AFTER INSERT OR UPDATE OF "metri_posati" ON "public"."rapportino_inca_cavi" FOR EACH ROW EXECUTE FUNCTION "public"."trg_auto_tp_from_progress"();



CREATE OR REPLACE TRIGGER "trg_rro_updated_at" BEFORE UPDATE ON "public"."rapportino_row_operators" FOR EACH ROW EXECUTE FUNCTION "public"."updated_at"();



CREATE OR REPLACE TRIGGER "trg_ship_operators_updated_at" BEFORE UPDATE ON "public"."ship_operators" FOR EACH ROW EXECUTE FUNCTION "public"."updated_at"();



ALTER TABLE ONLY "public"."capo_ship_assignments"
    ADD CONSTRAINT "capo_ship_assignments_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."capo_ship_assignments"
    ADD CONSTRAINT "capo_ship_assignments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."capo_ship_assignments"
    ADD CONSTRAINT "capo_ship_assignments_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."capo_ship_attendance"
    ADD CONSTRAINT "capo_ship_attendance_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."capo_ship_attendance"
    ADD CONSTRAINT "capo_ship_attendance_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."capo_ship_expected_operators"
    ADD CONSTRAINT "capo_ship_expected_operators_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."capo_ship_expected_operators"
    ADD CONSTRAINT "capo_ship_expected_operators_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."capo_ship_expected_operators"
    ADD CONSTRAINT "capo_ship_expected_operators_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."capo_ship_expected_operators"
    ADD CONSTRAINT "capo_ship_expected_operators_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."capo_team_days"
    ADD CONSTRAINT "capo_team_days_ship_fk" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."capo_team_members"
    ADD CONSTRAINT "capo_team_members_operator_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."capo_team_members"
    ADD CONSTRAINT "capo_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."capo_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."capo_teams"
    ADD CONSTRAINT "capo_teams_team_day_id_fkey" FOREIGN KEY ("team_day_id") REFERENCES "public"."capo_team_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalogo_ship_commessa_attivita"
    ADD CONSTRAINT "catalogo_ship_commessa_attivita_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."catalogo_attivita"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."catalogo_ship_commessa_attivita"
    ADD CONSTRAINT "catalogo_ship_commessa_attivita_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."catalogo_ship_commessa_attivita"
    ADD CONSTRAINT "catalogo_ship_commessa_attivita_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cncs_signal_runs"
    ADD CONSTRAINT "cncs_signal_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."cncs_signal_runs"
    ADD CONSTRAINT "cncs_signal_runs_rapportino_id_fkey" FOREIGN KEY ("rapportino_id") REFERENCES "public"."rapportini"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cncs_signals"
    ADD CONSTRAINT "cncs_signals_rapportino_id_fkey" FOREIGN KEY ("rapportino_id") REFERENCES "public"."rapportini"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cncs_signals"
    ADD CONSTRAINT "cncs_signals_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."cncs_signal_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_drive_events"
    ADD CONSTRAINT "core_drive_events_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."core_files"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."core_drive_events"
    ADD CONSTRAINT "core_drive_events_prev_event_id_fkey" FOREIGN KEY ("prev_event_id") REFERENCES "public"."core_drive_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."core_file_audit"
    ADD CONSTRAINT "core_file_audit_core_file_id_fkey" FOREIGN KEY ("core_file_id") REFERENCES "public"."core_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_file_audit"
    ADD CONSTRAINT "core_file_audit_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."core_files"
    ADD CONSTRAINT "core_files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."core_files"
    ADD CONSTRAINT "core_files_inca_cavo_id_fkey" FOREIGN KEY ("inca_cavo_id") REFERENCES "public"."inca_cavi"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."core_files"
    ADD CONSTRAINT "core_files_inca_file_id_fkey" FOREIGN KEY ("inca_file_id") REFERENCES "public"."inca_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."core_files"
    ADD CONSTRAINT "core_files_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."core_files"
    ADD CONSTRAINT "core_files_rapportino_id_fkey" FOREIGN KEY ("rapportino_id") REFERENCES "public"."rapportini"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."core_files"
    ADD CONSTRAINT "core_files_version_of_fkey" FOREIGN KEY ("version_of") REFERENCES "public"."core_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."core_meta"
    ADD CONSTRAINT "core_meta_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."impianti"
    ADD CONSTRAINT "impianti_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impianto_capi"
    ADD CONSTRAINT "impianto_capi_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impianto_capi"
    ADD CONSTRAINT "impianto_capi_impianto_id_fkey" FOREIGN KEY ("impianto_id") REFERENCES "public"."impianti"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inca_cavi"
    ADD CONSTRAINT "inca_cavi_from_file_id_fkey" FOREIGN KEY ("from_file_id") REFERENCES "public"."inca_files"("id");



ALTER TABLE ONLY "public"."inca_cavi"
    ADD CONSTRAINT "inca_cavi_inca_file_id_fkey" FOREIGN KEY ("inca_file_id") REFERENCES "public"."inca_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inca_cavi_snapshot"
    ADD CONSTRAINT "inca_cavi_snapshot_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."inca_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inca_change_events"
    ADD CONSTRAINT "inca_change_events_from_import_id_fkey" FOREIGN KEY ("from_import_id") REFERENCES "public"."inca_imports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inca_change_events"
    ADD CONSTRAINT "inca_change_events_to_import_id_fkey" FOREIGN KEY ("to_import_id") REFERENCES "public"."inca_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inca_files"
    ADD CONSTRAINT "inca_files_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "public"."inca_import_runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inca_files"
    ADD CONSTRAINT "inca_files_previous_inca_file_id_fkey" FOREIGN KEY ("previous_inca_file_id") REFERENCES "public"."inca_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inca_files"
    ADD CONSTRAINT "inca_files_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inca_files"
    ADD CONSTRAINT "inca_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inca_import_runs"
    ADD CONSTRAINT "inca_import_runs_new_inca_file_id_fkey" FOREIGN KEY ("new_inca_file_id") REFERENCES "public"."inca_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inca_import_runs"
    ADD CONSTRAINT "inca_import_runs_previous_inca_file_id_fkey" FOREIGN KEY ("previous_inca_file_id") REFERENCES "public"."inca_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inca_import_summaries"
    ADD CONSTRAINT "inca_import_summaries_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."inca_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inca_percorsi"
    ADD CONSTRAINT "inca_percorsi_cavo_id_fkey" FOREIGN KEY ("inca_cavo_id") REFERENCES "public"."inca_cavi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_capo_assignments"
    ADD CONSTRAINT "manager_capo_assignments_capo_fk" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_capo_assignments"
    ADD CONSTRAINT "manager_capo_assignments_manager_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_capo_scope"
    ADD CONSTRAINT "manager_capo_scope_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_capo_scope"
    ADD CONSTRAINT "manager_capo_scope_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."manager_capo_scope"
    ADD CONSTRAINT "manager_capo_scope_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_plans"
    ADD CONSTRAINT "manager_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."manager_plans"
    ADD CONSTRAINT "manager_plans_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."models"
    ADD CONSTRAINT "models_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navemaster_imports"
    ADD CONSTRAINT "navemaster_imports_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."navemaster_imports"
    ADD CONSTRAINT "navemaster_imports_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navemaster_inca_alerts"
    ADD CONSTRAINT "navemaster_inca_alerts_inca_file_id_fkey" FOREIGN KEY ("inca_file_id") REFERENCES "public"."inca_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navemaster_inca_alerts"
    ADD CONSTRAINT "navemaster_inca_alerts_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navemaster_inca_diff"
    ADD CONSTRAINT "navemaster_inca_diff_inca_file_id_fkey" FOREIGN KEY ("inca_file_id") REFERENCES "public"."inca_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navemaster_inca_diff"
    ADD CONSTRAINT "navemaster_inca_diff_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navemaster_rows"
    ADD CONSTRAINT "navemaster_rows_navemaster_import_id_fkey" FOREIGN KEY ("navemaster_import_id") REFERENCES "public"."navemaster_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."objectives"
    ADD CONSTRAINT "objectives_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."operator_kpi_facts"
    ADD CONSTRAINT "operator_kpi_facts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."operator_kpi_facts"
    ADD CONSTRAINT "operator_kpi_facts_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."operator_kpi_facts"
    ADD CONSTRAINT "operator_kpi_facts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."manager_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operator_kpi_facts"
    ADD CONSTRAINT "operator_kpi_facts_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."plan_capo_slots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operator_kpi_snapshots"
    ADD CONSTRAINT "operator_kpi_snapshots_computed_by_fkey" FOREIGN KEY ("computed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."operator_kpi_snapshots"
    ADD CONSTRAINT "operator_kpi_snapshots_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."operator_ship_attendance"
    ADD CONSTRAINT "operator_ship_attendance_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."operator_ship_attendance"
    ADD CONSTRAINT "operator_ship_attendance_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."patterns"
    ADD CONSTRAINT "patterns_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."percorso_cable_segments"
    ADD CONSTRAINT "percorso_cable_segments_cable_id_fkey" FOREIGN KEY ("cable_id") REFERENCES "public"."percorso_cables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."percorso_cables"
    ADD CONSTRAINT "percorso_cables_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."percorso_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."percorso_documents"
    ADD CONSTRAINT "percorso_documents_inca_file_id_fkey" FOREIGN KEY ("inca_file_id") REFERENCES "public"."inca_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."percorso_documents"
    ADD CONSTRAINT "percorso_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."percorso_lot_cables"
    ADD CONSTRAINT "percorso_lot_cables_cable_id_fkey" FOREIGN KEY ("cable_id") REFERENCES "public"."percorso_cables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."percorso_lot_cables"
    ADD CONSTRAINT "percorso_lot_cables_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."percorso_lots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."percorso_lot_segments"
    ADD CONSTRAINT "percorso_lot_segments_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."percorso_lots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."percorso_lot_validations"
    ADD CONSTRAINT "percorso_lot_validations_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."percorso_lots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."percorso_lot_validations"
    ADD CONSTRAINT "percorso_lot_validations_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."percorso_lots"
    ADD CONSTRAINT "percorso_lots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."percorso_lots"
    ADD CONSTRAINT "percorso_lots_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."percorso_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_capo_slots"
    ADD CONSTRAINT "plan_capo_slots_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."plan_capo_slots"
    ADD CONSTRAINT "plan_capo_slots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."plan_capo_slots"
    ADD CONSTRAINT "plan_capo_slots_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."manager_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_slot_members"
    ADD CONSTRAINT "plan_slot_members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."plan_slot_members"
    ADD CONSTRAINT "plan_slot_members_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."plan_slot_members"
    ADD CONSTRAINT "plan_slot_members_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."plan_capo_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planning_audit"
    ADD CONSTRAINT "planning_audit_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."planning_audit"
    ADD CONSTRAINT "planning_audit_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."manager_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rapportino_cavi"
    ADD CONSTRAINT "rapportino_cavi_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."rapportino_cavi"
    ADD CONSTRAINT "rapportino_cavi_inca_cavo_id_fkey" FOREIGN KEY ("inca_cavo_id") REFERENCES "public"."inca_cavi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rapportino_cavi"
    ADD CONSTRAINT "rapportino_cavi_rapportino_id_fkey" FOREIGN KEY ("rapportino_id") REFERENCES "public"."rapportini"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rapportino_inca_cavi"
    ADD CONSTRAINT "rapportino_inca_cavi_inca_cavo_id_fkey" FOREIGN KEY ("inca_cavo_id") REFERENCES "public"."inca_cavi"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rapportino_inca_cavi"
    ADD CONSTRAINT "rapportino_inca_cavi_rapportino_id_fkey" FOREIGN KEY ("rapportino_id") REFERENCES "public"."rapportini"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rapportino_row_operators"
    ADD CONSTRAINT "rapportino_row_operators_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rapportino_row_operators"
    ADD CONSTRAINT "rapportino_row_operators_rapportino_row_id_fkey" FOREIGN KEY ("rapportino_row_id") REFERENCES "public"."rapportino_rows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rapportino_rows"
    ADD CONSTRAINT "rapportino_rows_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."catalogo_attivita"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rapportino_rows"
    ADD CONSTRAINT "rapportino_rows_rapportino_id_fkey" FOREIGN KEY ("rapportino_id") REFERENCES "public"."rapportini"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ship_capos"
    ADD CONSTRAINT "ship_capos_capo_id_fkey" FOREIGN KEY ("capo_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ship_capos"
    ADD CONSTRAINT "ship_capos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ship_capos"
    ADD CONSTRAINT "ship_capos_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ship_managers"
    ADD CONSTRAINT "ship_managers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ship_managers"
    ADD CONSTRAINT "ship_managers_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ship_operators"
    ADD CONSTRAINT "ship_operators_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ship_operators"
    ADD CONSTRAINT "ship_operators_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ship_operators"
    ADD CONSTRAINT "ship_operators_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE CASCADE;



CREATE POLICY "Profiles are insertable by owner" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Profiles are updatable by owner" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "admin_delete_all_manager_plans" ON "public"."manager_plans" FOR DELETE USING ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_insert_all_manager_plans" ON "public"."manager_plans" FOR INSERT WITH CHECK ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_read_all_kpi_facts" ON "public"."operator_kpi_facts" FOR SELECT USING ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_read_all_kpi_snapshots" ON "public"."operator_kpi_snapshots" FOR SELECT USING ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_read_all_manager_capo_scope" ON "public"."manager_capo_scope" FOR SELECT USING ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_read_all_manager_plans" ON "public"."manager_plans" FOR SELECT USING ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_read_all_plan_capo_slots" ON "public"."plan_capo_slots" FOR SELECT USING ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_read_all_plan_slot_members" ON "public"."plan_slot_members" FOR SELECT USING ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_read_all_planning_audit" ON "public"."planning_audit" FOR SELECT USING ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "admin_update_all_manager_plans" ON "public"."manager_plans" FOR UPDATE USING ("public"."is_role"('ADMIN'::"text")) WITH CHECK ("public"."is_role"('ADMIN'::"text"));



CREATE POLICY "audit_select_direzione" ON "public"."core_file_audit" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = ANY (ARRAY['DIREZIONE'::"text", 'ADMIN'::"text"]))))));



CREATE POLICY "capo can insert rapportini" ON "public"."rapportini" FOR INSERT TO "authenticated" WITH CHECK (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo can manage rows" ON "public"."rapportino_rows" TO "authenticated" USING (("rapportino_id" IN ( SELECT "rapportini"."id"
   FROM "public"."rapportini"
  WHERE ("rapportini"."capo_id" = "auth"."uid"())))) WITH CHECK (("rapportino_id" IN ( SELECT "rapportini"."id"
   FROM "public"."rapportini"
  WHERE ("rapportini"."capo_id" = "auth"."uid"()))));



CREATE POLICY "capo can update rapportini" ON "public"."rapportini" FOR UPDATE TO "authenticated" USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo own models CRUD" ON "public"."models" TO "authenticated" USING ((("capo_id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("capo_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "capo_delete_rapportini_own" ON "public"."rapportini" FOR DELETE TO "authenticated" USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_delete_rapportino_inca" ON "public"."rapportino_inca_cavi" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_inca_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text")))));



CREATE POLICY "capo_delete_rows_own" ON "public"."rapportino_rows" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_rows"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text")))));



CREATE POLICY "capo_insert_operator_attendance_for_assigned_ship" ON "public"."operator_ship_attendance" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ship_capos" "sc"
  WHERE (("sc"."ship_id" = "operator_ship_attendance"."ship_id") AND ("sc"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_insert_own_ship_attendance" ON "public"."capo_ship_attendance" FOR INSERT TO "authenticated" WITH CHECK ((("capo_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."ship_capos" "sc"
  WHERE (("sc"."ship_id" = "capo_ship_attendance"."ship_id") AND ("sc"."capo_id" = "auth"."uid"()))))));



CREATE POLICY "capo_insert_rapportini_own" ON "public"."rapportini" FOR INSERT TO "authenticated" WITH CHECK (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_insert_rapportino_cavi" ON "public"."rapportino_cavi" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text")))));



CREATE POLICY "capo_insert_rapportino_inca" ON "public"."rapportino_inca_cavi" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_inca_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text")))));



CREATE POLICY "capo_insert_rows_own" ON "public"."rapportino_rows" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_rows"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text")))));



CREATE POLICY "capo_read_own_expected_operators" ON "public"."capo_ship_expected_operators" FOR SELECT USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_read_own_members" ON "public"."plan_slot_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."plan_capo_slots" "s"
  WHERE (("s"."id" = "plan_slot_members"."slot_id") AND ("s"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_read_own_ship_assignments" ON "public"."capo_ship_assignments" FOR SELECT USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_read_own_slots" ON "public"."plan_capo_slots" FOR SELECT USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_select_own_ship_attendance" ON "public"."capo_ship_attendance" FOR SELECT TO "authenticated" USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_select_rapportini_own" ON "public"."rapportini" FOR SELECT TO "authenticated" USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_select_rapportino_cavi" ON "public"."rapportino_cavi" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_select_rapportino_inca" ON "public"."rapportino_inca_cavi" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_inca_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_select_rows_own" ON "public"."rapportino_rows" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_rows"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"())))));



ALTER TABLE "public"."capo_ship_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."capo_ship_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."capo_ship_expected_operators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."capo_team_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "capo_team_days_delete_own" ON "public"."capo_team_days" FOR DELETE TO "authenticated" USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_team_days_insert_own" ON "public"."capo_team_days" FOR INSERT TO "authenticated" WITH CHECK (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_team_days_select_own" ON "public"."capo_team_days" FOR SELECT TO "authenticated" USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_team_days_update_own" ON "public"."capo_team_days" FOR UPDATE TO "authenticated" USING (("capo_id" = "auth"."uid"())) WITH CHECK (("capo_id" = "auth"."uid"()));



ALTER TABLE "public"."capo_team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "capo_team_members_delete_own" ON "public"."capo_team_members" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."capo_teams" "t"
     JOIN "public"."capo_team_days" "d" ON (("d"."id" = "t"."team_day_id")))
  WHERE (("t"."id" = "capo_team_members"."team_id") AND ("d"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_team_members_insert_own" ON "public"."capo_team_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."capo_teams" "t"
     JOIN "public"."capo_team_days" "d" ON (("d"."id" = "t"."team_day_id")))
  WHERE (("t"."id" = "capo_team_members"."team_id") AND ("d"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_team_members_select_own" ON "public"."capo_team_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."capo_teams" "t"
     JOIN "public"."capo_team_days" "d" ON (("d"."id" = "t"."team_day_id")))
  WHERE (("t"."id" = "capo_team_members"."team_id") AND ("d"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_team_members_update_own" ON "public"."capo_team_members" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."capo_teams" "t"
     JOIN "public"."capo_team_days" "d" ON (("d"."id" = "t"."team_day_id")))
  WHERE (("t"."id" = "capo_team_members"."team_id") AND ("d"."capo_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."capo_teams" "t"
     JOIN "public"."capo_team_days" "d" ON (("d"."id" = "t"."team_day_id")))
  WHERE (("t"."id" = "capo_team_members"."team_id") AND ("d"."capo_id" = "auth"."uid"())))));



ALTER TABLE "public"."capo_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "capo_teams_delete_own" ON "public"."capo_teams" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."capo_team_days" "d"
  WHERE (("d"."id" = "capo_teams"."team_day_id") AND ("d"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_teams_insert_own" ON "public"."capo_teams" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."capo_team_days" "d"
  WHERE (("d"."id" = "capo_teams"."team_day_id") AND ("d"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_teams_select_own" ON "public"."capo_teams" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."capo_team_days" "d"
  WHERE (("d"."id" = "capo_teams"."team_day_id") AND ("d"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_teams_update_own" ON "public"."capo_teams" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."capo_team_days" "d"
  WHERE (("d"."id" = "capo_teams"."team_day_id") AND ("d"."capo_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."capo_team_days" "d"
  WHERE (("d"."id" = "capo_teams"."team_day_id") AND ("d"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_update_operator_attendance_for_assigned_ship" ON "public"."operator_ship_attendance" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ship_capos" "sc"
  WHERE (("sc"."ship_id" = "operator_ship_attendance"."ship_id") AND ("sc"."capo_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ship_capos" "sc"
  WHERE (("sc"."ship_id" = "operator_ship_attendance"."ship_id") AND ("sc"."capo_id" = "auth"."uid"())))));



CREATE POLICY "capo_update_own_ship_attendance" ON "public"."capo_ship_attendance" FOR UPDATE TO "authenticated" USING ((("capo_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."ship_capos" "sc"
  WHERE (("sc"."ship_id" = "capo_ship_attendance"."ship_id") AND ("sc"."capo_id" = "auth"."uid"())))))) WITH CHECK ((("capo_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."ship_capos" "sc"
  WHERE (("sc"."ship_id" = "capo_ship_attendance"."ship_id") AND ("sc"."capo_id" = "auth"."uid"()))))));



CREATE POLICY "capo_update_rapportini_own" ON "public"."rapportini" FOR UPDATE TO "authenticated" USING (("capo_id" = "auth"."uid"())) WITH CHECK (("capo_id" = "auth"."uid"()));



CREATE POLICY "capo_update_rapportino_cavi" ON "public"."rapportino_cavi" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text")))));



CREATE POLICY "capo_update_rapportino_inca" ON "public"."rapportino_inca_cavi" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_inca_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_inca_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text")))));



CREATE POLICY "capo_update_rows_own" ON "public"."rapportino_rows" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_rows"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_rows"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()) AND ("r"."status" <> 'APPROVED_UFFICIO'::"text")))));



CREATE POLICY "capo_validate" ON "public"."percorso_lot_validations" FOR INSERT WITH CHECK ((("role" = 'CAPO'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'CAPO'::"public"."app_role"))))));



ALTER TABLE "public"."catalogo_attivita" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalogo_attivita_delete_admin" ON "public"."catalogo_attivita" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"public"."app_role")))));



CREATE POLICY "catalogo_attivita_insert_admin" ON "public"."catalogo_attivita" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"public"."app_role")))));



CREATE POLICY "catalogo_attivita_read" ON "public"."catalogo_attivita" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "catalogo_attivita_select_authenticated" ON "public"."catalogo_attivita" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "catalogo_attivita_update_admin" ON "public"."catalogo_attivita" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"public"."app_role")))));



CREATE POLICY "catalogo_attivita_write_admin" ON "public"."catalogo_attivita" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"public"."app_role")))));



ALTER TABLE "public"."catalogo_ship_commessa_attivita" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalogo_ship_commessa_read" ON "public"."catalogo_ship_commessa_attivita" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "catalogo_ship_commessa_write_admin" ON "public"."catalogo_ship_commessa_attivita" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"public"."app_role")))));



ALTER TABLE "public"."cncs_signal_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cncs_signal_runs_select_via_rapportini" ON "public"."cncs_signal_runs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE ("r"."id" = "cncs_signal_runs"."rapportino_id"))));



ALTER TABLE "public"."cncs_signals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cncs_signals_select_via_rapportini" ON "public"."cncs_signals" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE ("r"."id" = "cncs_signals"."rapportino_id"))));



ALTER TABLE "public"."core_drive_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "core_drive_events_select_via_core_files" ON "public"."core_drive_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."core_files" "f"
  WHERE ("f"."id" = "core_drive_events"."file_id"))));



ALTER TABLE "public"."core_file_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."core_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "core_files_delete_direzione" ON "public"."core_files" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = ANY (ARRAY['DIREZIONE'::"text", 'ADMIN'::"text"]))))));



CREATE POLICY "core_files_insert" ON "public"."core_files" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = ANY (ARRAY['CAPO'::"text", 'UFFICIO'::"text", 'MANAGER'::"text", 'DIREZIONE'::"text", 'ADMIN'::"text"])) AND (("p"."app_role" = ANY (ARRAY['DIREZIONE'::"text", 'ADMIN'::"text"])) OR ("core_files"."cantiere" = COALESCE("p"."default_costr", "core_files"."cantiere")) OR (("to_jsonb"("p".*) ? 'allowed_cantieri'::"text") AND ("core_files"."cantiere" = ANY (COALESCE("p"."allowed_cantieri", ARRAY[]::"text"[])))))))));



CREATE POLICY "core_files_select" ON "public"."core_files" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."app_role" = ANY (ARRAY['DIREZIONE'::"text", 'ADMIN'::"text"])) OR ("core_files"."cantiere" = COALESCE("p"."default_costr", "core_files"."cantiere")) OR (("to_jsonb"("p".*) ? 'allowed_cantieri'::"text") AND ("core_files"."cantiere" = ANY (COALESCE("p"."allowed_cantieri", ARRAY[]::"text"[])))))))));



CREATE POLICY "core_files_update" ON "public"."core_files" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."app_role" = ANY (ARRAY['DIREZIONE'::"text", 'ADMIN'::"text"])) OR ("core_files"."created_by" = "auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."app_role" = ANY (ARRAY['DIREZIONE'::"text", 'ADMIN'::"text"])) OR ("core_files"."created_by" = "auth"."uid"()))))));



CREATE POLICY "create_lots" ON "public"."percorso_lots" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['CAPO'::"public"."app_role", 'UFFICIO'::"public"."app_role"]))))));



ALTER TABLE "public"."impianti" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "impianti_admin_all" ON "public"."impianti" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "impianti_manager_read_perimeter" ON "public"."impianti" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "impianti"."ship_id") AND ("sm"."manager_id" = "auth"."uid"())))));



ALTER TABLE "public"."impianto_capi" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "impianto_capi_admin_all" ON "public"."impianto_capi" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "impianto_capi_manager_read_perimeter" ON "public"."impianto_capi" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."impianti" "i"
     JOIN "public"."ship_managers" "sm" ON (("sm"."ship_id" = "i"."ship_id")))
  WHERE (("i"."id" = "impianto_capi"."impianto_id") AND ("sm"."manager_id" = "auth"."uid"())))));



ALTER TABLE "public"."inca_cavi" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inca_cavi_capo_select" ON "public"."inca_cavi" FOR SELECT USING (((("public"."core_current_profile"())."app_role" = 'CAPO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "inca_cavi_direzione_select" ON "public"."inca_cavi" FOR SELECT USING ((("public"."core_current_profile"())."app_role" = 'DIREZIONE'::"text"));



CREATE POLICY "inca_cavi_manager_select" ON "public"."inca_cavi" FOR SELECT USING (((("public"."core_current_profile"())."app_role" = 'MANAGER'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "inca_cavi_read_auth" ON "public"."inca_cavi" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inca_cavi_select_staff" ON "public"."inca_cavi" FOR SELECT TO "authenticated" USING ((("public"."core_current_profile"())."app_role" = ANY (ARRAY['UFFICIO'::"text", 'DIREZIONE'::"text", 'ADMIN'::"text"])));



CREATE POLICY "inca_cavi_ufficio_mutate" ON "public"."inca_cavi" USING (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[])))) WITH CHECK (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "inca_cavi_ufficio_select" ON "public"."inca_cavi" FOR SELECT USING (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "inca_cavi_write_ufficio_admin" ON "public"."inca_cavi" USING (("public"."is_ufficio"() OR "public"."is_admin"())) WITH CHECK (("public"."is_ufficio"() OR "public"."is_admin"()));



ALTER TABLE "public"."inca_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inca_files_capo_select" ON "public"."inca_files" FOR SELECT USING (((("public"."core_current_profile"())."app_role" = 'CAPO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "inca_files_direzione_select" ON "public"."inca_files" FOR SELECT USING ((("public"."core_current_profile"())."app_role" = 'DIREZIONE'::"text"));



CREATE POLICY "inca_files_insert" ON "public"."inca_files" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inca_files_insert_staff" ON "public"."inca_files" FOR INSERT TO "authenticated" WITH CHECK ((("public"."core_current_profile"())."app_role" = ANY (ARRAY['UFFICIO'::"text", 'DIREZIONE'::"text", 'ADMIN'::"text"])));



CREATE POLICY "inca_files_manager_select" ON "public"."inca_files" FOR SELECT USING (((("public"."core_current_profile"())."app_role" = 'MANAGER'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "inca_files_read_auth" ON "public"."inca_files" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inca_files_select" ON "public"."inca_files" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inca_files_select_staff" ON "public"."inca_files" FOR SELECT TO "authenticated" USING ((("public"."core_current_profile"())."app_role" = ANY (ARRAY['UFFICIO'::"text", 'DIREZIONE'::"text", 'ADMIN'::"text"])));



CREATE POLICY "inca_files_ufficio_mutate" ON "public"."inca_files" USING (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[])))) WITH CHECK (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "inca_files_ufficio_select" ON "public"."inca_files" FOR SELECT USING (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "inca_files_update" ON "public"."inca_files" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inca_files_write_ufficio_admin" ON "public"."inca_files" USING (("public"."is_ufficio"() OR "public"."is_admin"())) WITH CHECK (("public"."is_ufficio"() OR "public"."is_admin"()));



ALTER TABLE "public"."inca_percorsi" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inca_percorsi_read_auth" ON "public"."inca_percorsi" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inca_percorsi_write_ufficio_admin" ON "public"."inca_percorsi" USING (("public"."is_ufficio"() OR "public"."is_admin"())) WITH CHECK (("public"."is_ufficio"() OR "public"."is_admin"()));



CREATE POLICY "insert_own_inca_cavi" ON "public"."inca_cavi" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."inca_files" "f"
  WHERE (("f"."id" = "inca_cavi"."inca_file_id") AND ("f"."uploaded_by" = "auth"."uid"())))));



ALTER TABLE "public"."manager_capo_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manager_capo_scope" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manager_insert_audit" ON "public"."planning_audit" FOR INSERT WITH CHECK (("actor_id" = "auth"."uid"()));



CREATE POLICY "manager_insert_expected_operators" ON "public"."capo_ship_expected_operators" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."manager_id" = "auth"."uid"()) AND ("mca"."capo_id" = "capo_ship_expected_operators"."capo_id") AND ("mca"."active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."manager_id" = "auth"."uid"()) AND ("sm"."ship_id" = "capo_ship_expected_operators"."ship_id"))))));



CREATE POLICY "manager_insert_ship_assignments" ON "public"."capo_ship_assignments" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."manager_id" = "auth"."uid"()) AND ("mca"."capo_id" = "capo_ship_assignments"."capo_id") AND ("mca"."active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."manager_id" = "auth"."uid"()) AND ("sm"."ship_id" = "capo_ship_assignments"."ship_id"))))));



ALTER TABLE "public"."manager_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manager_read_own_assignments" ON "public"."manager_capo_assignments" FOR SELECT TO "authenticated" USING (("manager_id" = "auth"."uid"()));



CREATE POLICY "manager_read_own_audit" ON "public"."planning_audit" FOR SELECT USING (("actor_id" = "auth"."uid"()));



CREATE POLICY "manager_read_own_plans" ON "public"."manager_plans" FOR SELECT USING (("manager_id" = "auth"."uid"()));



CREATE POLICY "manager_read_own_scope" ON "public"."manager_capo_scope" FOR SELECT USING (("manager_id" = "auth"."uid"()));



CREATE POLICY "manager_rw_members_via_plan" ON "public"."plan_slot_members" USING ((EXISTS ( SELECT 1
   FROM ("public"."plan_capo_slots" "s"
     JOIN "public"."manager_plans" "p" ON (("p"."id" = "s"."plan_id")))
  WHERE (("s"."id" = "plan_slot_members"."slot_id") AND ("p"."manager_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."plan_capo_slots" "s"
     JOIN "public"."manager_plans" "p" ON (("p"."id" = "s"."plan_id")))
  WHERE (("s"."id" = "plan_slot_members"."slot_id") AND ("p"."manager_id" = "auth"."uid"())))));



CREATE POLICY "manager_rw_slots_via_plan" ON "public"."plan_capo_slots" USING ((EXISTS ( SELECT 1
   FROM "public"."manager_plans" "p"
  WHERE (("p"."id" = "plan_capo_slots"."plan_id") AND ("p"."manager_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."manager_plans" "p"
  WHERE (("p"."id" = "plan_capo_slots"."plan_id") AND ("p"."manager_id" = "auth"."uid"())))));



CREATE POLICY "manager_update_expected_operators" ON "public"."capo_ship_expected_operators" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."manager_id" = "auth"."uid"()) AND ("mca"."capo_id" = "capo_ship_expected_operators"."capo_id") AND ("mca"."active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."manager_id" = "auth"."uid"()) AND ("mca"."capo_id" = "capo_ship_expected_operators"."capo_id") AND ("mca"."active" = true)))));



CREATE POLICY "manager_update_ship_assignments" ON "public"."capo_ship_assignments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."manager_id" = "auth"."uid"()) AND ("mca"."capo_id" = "capo_ship_assignments"."capo_id") AND ("mca"."active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."manager_id" = "auth"."uid"()) AND ("mca"."capo_id" = "capo_ship_assignments"."capo_id") AND ("mca"."active" = true)))));



CREATE POLICY "manager_write_own_plans" ON "public"."manager_plans" USING (("manager_id" = "auth"."uid"())) WITH CHECK (("manager_id" = "auth"."uid"()));



CREATE POLICY "manager_write_own_scope" ON "public"."manager_capo_scope" USING (("manager_id" = "auth"."uid"())) WITH CHECK (("manager_id" = "auth"."uid"()));



CREATE POLICY "mca_admin_all" ON "public"."manager_capo_assignments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'ADMIN'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'ADMIN'::"text")))));



CREATE POLICY "mca_manager_read_own" ON "public"."manager_capo_assignments" FOR SELECT TO "authenticated" USING ((("active" = true) AND ("manager_id" = "auth"."uid"())));



ALTER TABLE "public"."models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "models_select_owner_or_direction" ON "public"."models" FOR SELECT USING ((("capo_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'DIREZIONE'::"text"))))));



CREATE POLICY "models_update_owner_only" ON "public"."models" FOR UPDATE USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "models_upsert_owner_only" ON "public"."models" FOR INSERT WITH CHECK (("capo_id" = "auth"."uid"()));



ALTER TABLE "public"."navemaster_imports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "navemaster_imports_read" ON "public"."navemaster_imports" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "navemaster_imports_write" ON "public"."navemaster_imports" TO "authenticated" USING ("public"."navemaster_can_manage"()) WITH CHECK ("public"."navemaster_can_manage"());



ALTER TABLE "public"."navemaster_rows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "navemaster_rows_read" ON "public"."navemaster_rows" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "navemaster_rows_write" ON "public"."navemaster_rows" TO "authenticated" USING ("public"."navemaster_can_manage"()) WITH CHECK ("public"."navemaster_can_manage"());



ALTER TABLE "public"."objectives" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "objectives_select_all_for_direction" ON "public"."objectives" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'DIREZIONE'::"text")))));



CREATE POLICY "objectives_write_direction" ON "public"."objectives" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'DIREZIONE'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'DIREZIONE'::"text")))));



ALTER TABLE "public"."operator_kpi_facts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operator_kpi_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operator_ship_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operators" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operators_admin_all" ON "public"."operators" TO "authenticated" USING ("public"."core_is_admin"()) WITH CHECK ("public"."core_is_admin"());



CREATE POLICY "operators_read_all_for_logged" ON "public"."operators" FOR SELECT TO "authenticated" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "owner_rapportino_can_crud" ON "public"."rapportino_inca_cavi" USING ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_inca_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rapportini" "r"
  WHERE (("r"."id" = "rapportino_inca_cavi"."rapportino_id") AND ("r"."capo_id" = "auth"."uid"())))));



ALTER TABLE "public"."patterns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patterns_select_owner_only" ON "public"."patterns" FOR SELECT USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "patterns_write_owner_only" ON "public"."patterns" USING (("capo_id" = "auth"."uid"())) WITH CHECK (("capo_id" = "auth"."uid"()));



ALTER TABLE "public"."percorso_cable_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."percorso_cables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."percorso_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "percorso_documents_insert_service_role" ON "public"."percorso_documents" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "percorso_documents_insert_ufficio" ON "public"."percorso_documents" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "percorso_documents_select_authenticated" ON "public"."percorso_documents" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."percorso_lot_cables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."percorso_lot_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."percorso_lot_validations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."percorso_lots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_capo_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_slot_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planning_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles self update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_admin_select_all" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_self_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."rapportini" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rapportini_capo_insert" ON "public"."rapportini" FOR INSERT WITH CHECK (((("public"."core_current_profile"())."app_role" = 'CAPO'::"text") AND ("capo_id" = "auth"."uid"()) AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "rapportini_capo_update" ON "public"."rapportini" FOR UPDATE USING (((("public"."core_current_profile"())."app_role" = 'CAPO'::"text") AND ("capo_id" = "auth"."uid"()) AND ("status" <> 'APPROVED_UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[])))) WITH CHECK (((("public"."core_current_profile"())."app_role" = 'CAPO'::"text") AND ("capo_id" = "auth"."uid"()) AND ("status" <> 'APPROVED_UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "rapportini_direzione_select" ON "public"."rapportini" FOR SELECT USING ((("public"."core_current_profile"())."app_role" = 'DIREZIONE'::"text"));



CREATE POLICY "rapportini_manager_select" ON "public"."rapportini" FOR SELECT USING (((("public"."core_current_profile"())."app_role" = 'MANAGER'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "rapportini_manager_select_perimeter" ON "public"."rapportini" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."ship_managers" "sm"
     JOIN "public"."ships" "s" ON (("s"."id" = "sm"."ship_id")))
  WHERE (("sm"."manager_id" = "auth"."uid"()) AND ("s"."code" = "rapportini"."costr")))));



CREATE POLICY "rapportini_select_ufficio" ON "public"."rapportini" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'UFFICIO'::"text")))));



CREATE POLICY "rapportini_ufficio_select" ON "public"."rapportini" FOR SELECT USING (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "rapportini_ufficio_update" ON "public"."rapportini" FOR UPDATE USING (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[])))) WITH CHECK (((("public"."core_current_profile"())."app_role" = 'UFFICIO'::"text") AND (("costr" = ANY (("public"."core_current_profile"())."allowed_cantieri")) OR (("public"."core_current_profile"())."allowed_cantieri" = ARRAY[]::"text"[]))));



CREATE POLICY "rapportini_update_ufficio" ON "public"."rapportini" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'UFFICIO'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'UFFICIO'::"text")))));



ALTER TABLE "public"."rapportino_cavi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rapportino_inca_cavi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rapportino_row_operators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rapportino_rows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rapportino_rows_backoffice_select_fast" ON "public"."rapportino_rows" FOR SELECT USING ((("public"."core_current_profile"())."app_role" = ANY (ARRAY['UFFICIO'::"text", 'DIREZIONE'::"text", 'MANAGER'::"text", 'ADMIN'::"text"])));



CREATE POLICY "read_all_docs" ON "public"."percorso_documents" FOR SELECT USING (true);



CREATE POLICY "rro_delete" ON "public"."rapportino_row_operators" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR "public"."capo_owns_rapportino_row"("rapportino_row_id")));



CREATE POLICY "rro_insert" ON "public"."rapportino_row_operators" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR "public"."capo_owns_rapportino_row"("rapportino_row_id")));



CREATE POLICY "rro_select" ON "public"."rapportino_row_operators" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR "public"."is_ufficio"() OR "public"."capo_owns_rapportino_row"("rapportino_row_id")));



CREATE POLICY "rro_update" ON "public"."rapportino_row_operators" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR "public"."capo_owns_rapportino_row"("rapportino_row_id"))) WITH CHECK (("public"."is_admin"() OR "public"."capo_owns_rapportino_row"("rapportino_row_id")));



CREATE POLICY "select_own_inca_cavi" ON "public"."inca_cavi" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."inca_files" "f"
  WHERE (("f"."id" = "inca_cavi"."inca_file_id") AND ("f"."uploaded_by" = "auth"."uid"())))));



ALTER TABLE "public"."ship_capos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ship_capos_admin_all" ON "public"."ship_capos" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "ship_capos_capo_select_own" ON "public"."ship_capos" FOR SELECT TO "authenticated" USING (("capo_id" = "auth"."uid"()));



CREATE POLICY "ship_capos_manager_delete_perimeter" ON "public"."ship_capos" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "ship_capos"."ship_id") AND ("sm"."manager_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."capo_id" = "ship_capos"."capo_id") AND ("mca"."manager_id" = "auth"."uid"()) AND ("mca"."active" = true))))));



CREATE POLICY "ship_capos_manager_insert_perimeter" ON "public"."ship_capos" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "ship_capos"."ship_id") AND ("sm"."manager_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."capo_id" = "ship_capos"."capo_id") AND ("mca"."manager_id" = "auth"."uid"()) AND ("mca"."active" = true))))));



CREATE POLICY "ship_capos_manager_select_perimeter" ON "public"."ship_capos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "ship_capos"."ship_id") AND ("sm"."manager_id" = "auth"."uid"())))));



CREATE POLICY "ship_capos_manager_update_perimeter" ON "public"."ship_capos" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = ANY (ARRAY['MANAGER'::"text", 'ADMIN'::"text"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "ship_capos"."ship_id") AND ("sm"."manager_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."manager_id" = "auth"."uid"()) AND ("mca"."capo_id" = "ship_capos"."capo_id") AND ("mca"."active" = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = ANY (ARRAY['MANAGER'::"text", 'ADMIN'::"text"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "ship_capos"."ship_id") AND ("sm"."manager_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."manager_capo_assignments" "mca"
  WHERE (("mca"."manager_id" = "auth"."uid"()) AND ("mca"."capo_id" = "ship_capos"."capo_id") AND ("mca"."active" = true))))));



CREATE POLICY "ship_capos_select_manager_or_capo" ON "public"."ship_capos" FOR SELECT TO "authenticated" USING ((("capo_id" = "auth"."uid"()) OR ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = ANY (ARRAY['MANAGER'::"text", 'ADMIN'::"text"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "ship_capos"."ship_id") AND ("sm"."manager_id" = "auth"."uid"())))))));



ALTER TABLE "public"."ship_managers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ship_managers_admin_all" ON "public"."ship_managers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ship_managers_manager_select_own" ON "public"."ship_managers" FOR SELECT TO "authenticated" USING (("manager_id" = "auth"."uid"()));



ALTER TABLE "public"."ship_operators" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ship_operators_admin_all" ON "public"."ship_operators" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "ship_operators_admin_insert" ON "public"."ship_operators" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'ADMIN'::"text")))));



CREATE POLICY "ship_operators_admin_select" ON "public"."ship_operators" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'ADMIN'::"text")))));



CREATE POLICY "ship_operators_admin_update" ON "public"."ship_operators" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'ADMIN'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'ADMIN'::"text")))));



CREATE POLICY "ship_operators_manager_select_perimeter" ON "public"."ship_operators" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "ship_operators"."ship_id") AND ("sm"."manager_id" = "auth"."uid"())))));



ALTER TABLE "public"."ships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ships_admin_select" ON "public"."ships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'ADMIN'::"text")))));



CREATE POLICY "ships_capo_select_assigned" ON "public"."ships" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'CAPO'::"text")))) AND ("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."ship_capos" "sc"
  WHERE (("sc"."ship_id" = "ships"."id") AND ("sc"."capo_id" = "auth"."uid"()))))));



CREATE POLICY "ships_manager_select_perimeter" ON "public"."ships" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = 'MANAGER'::"text")))) AND ("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."ship_managers" "sm"
  WHERE (("sm"."ship_id" = "ships"."id") AND ("sm"."manager_id" = "auth"."uid"()))))));



CREATE POLICY "ships_office_select" ON "public"."ships" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = ANY (ARRAY['UFFICIO'::"text", 'DIREZIONE'::"text", 'ADMIN'::"text"]))))) AND ("is_active" = true)));



CREATE POLICY "ufficio_direzione_select_rapportino_cavi" ON "public"."rapportino_cavi" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."app_role" = ANY (ARRAY['UFFICIO'::"text", 'DIREZIONE'::"text"]))))));



CREATE POLICY "ufficio_validate" ON "public"."percorso_lot_validations" FOR INSERT WITH CHECK ((("role" = 'UFFICIO'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'UFFICIO'::"public"."app_role"))))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_manager_for_capo"("p_capo_id" "uuid", "p_manager_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_manager_for_capo"("p_capo_id" "uuid", "p_manager_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_manager_for_capo"("p_capo_id" "uuid", "p_manager_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_operator_identity"("p_operator_id" "uuid", "p_cognome" "text", "p_nome" "text", "p_birth_date" "date", "p_operator_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_operator_identity"("p_operator_id" "uuid", "p_cognome" "text", "p_nome" "text", "p_birth_date" "date", "p_operator_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_operator_identity"("p_operator_id" "uuid", "p_cognome" "text", "p_nome" "text", "p_birth_date" "date", "p_operator_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_operator_identity"("p_operator_id" "uuid", "p_cognome" "text", "p_nome" "text", "p_birth_date" "date", "p_operator_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."capo_can_write_assigned_ship"("p_plan_date" "date", "p_ship_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."capo_can_write_assigned_ship"("p_plan_date" "date", "p_ship_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_can_write_assigned_ship"("p_plan_date" "date", "p_ship_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_can_write_assigned_ship"("p_plan_date" "date", "p_ship_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."capo_can_write_ship_attendance"("p_plan_date" "date", "p_ship_id" "uuid", "p_capo_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."capo_can_write_ship_attendance"("p_plan_date" "date", "p_ship_id" "uuid", "p_capo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_can_write_ship_attendance"("p_plan_date" "date", "p_ship_id" "uuid", "p_capo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_can_write_ship_attendance"("p_plan_date" "date", "p_ship_id" "uuid", "p_capo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."capo_get_team_day_v1"("p_ship_id" "uuid", "p_plan_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_get_team_day_v1"("p_ship_id" "uuid", "p_plan_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_get_team_day_v1"("p_ship_id" "uuid", "p_plan_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."capo_kpi_worktime_v1"("p_costr" "text", "p_commessa" "text", "p_date_from" "date", "p_date_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_kpi_worktime_v1"("p_costr" "text", "p_commessa" "text", "p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_kpi_worktime_v1"("p_costr" "text", "p_commessa" "text", "p_date_from" "date", "p_date_to" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."capo_mega_kpi_stesura_v1"("p_costr" "text", "p_commessa" "text", "p_inca_file_id" "uuid", "p_date_from" "date", "p_date_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_mega_kpi_stesura_v1"("p_costr" "text", "p_commessa" "text", "p_inca_file_id" "uuid", "p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_mega_kpi_stesura_v1"("p_costr" "text", "p_commessa" "text", "p_inca_file_id" "uuid", "p_date_from" "date", "p_date_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."capo_my_ships_v1"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."capo_my_ships_v1"() TO "anon";
GRANT ALL ON FUNCTION "public"."capo_my_ships_v1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_my_ships_v1"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."capo_my_team_for_date_v1"("p_plan_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."capo_my_team_for_date_v1"("p_plan_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_my_team_for_date_v1"("p_plan_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_my_team_for_date_v1"("p_plan_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."capo_owns_rapportino_row"("p_row_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_owns_rapportino_row"("p_row_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_owns_rapportino_row"("p_row_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."capo_returned_summary"("p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_returned_summary"("p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_returned_summary"("p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."capo_returned_summary_debug"("p_capo_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."capo_returned_summary_debug"("p_capo_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_returned_summary_debug"("p_capo_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."capo_team_days_fill_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."capo_team_days_fill_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."capo_team_days_fill_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_inca_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."clear_inca_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_inca_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_app_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_app_role_upper"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_app_role_upper"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_app_role_upper"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_apply_rapportino_inca_progress"("p_rapportino_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."core_apply_rapportino_inca_progress"("p_rapportino_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_apply_rapportino_inca_progress"("p_rapportino_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."core_current_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."core_current_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_current_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_current_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_db_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_db_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_db_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_drive_append_event"("p_file_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_note" "text", "p_prev_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."core_drive_append_event"("p_file_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_note" "text", "p_prev_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_drive_append_event"("p_file_id" "uuid", "p_event_type" "text", "p_payload" "jsonb", "p_note" "text", "p_prev_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."core_drive_assert_role"("allowed" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."core_drive_assert_role"("allowed" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_drive_assert_role"("allowed" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."core_drive_current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_drive_current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_drive_current_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_drive_emit_upload_event"("p_file_id" "uuid", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."core_drive_emit_upload_event"("p_file_id" "uuid", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_drive_emit_upload_event"("p_file_id" "uuid", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."core_drive_events_block_mutations"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_drive_events_block_mutations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_drive_events_block_mutations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_drive_freeze_file"("p_file_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."core_drive_freeze_file"("p_file_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_drive_freeze_file"("p_file_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."core_drive_soft_delete_file"("p_file_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."core_drive_soft_delete_file"("p_file_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_drive_soft_delete_file"("p_file_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."core_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_parse_tempo_hours"("p_raw" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."core_parse_tempo_hours"("p_raw" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_parse_tempo_hours"("p_raw" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."core_profiles_public_by_ids"("p_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."core_profiles_public_by_ids"("p_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."core_profiles_public_by_ids"("p_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_profiles_public_by_ids"("p_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."core_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."core_status_text"("v" "anyelement") TO "anon";
GRANT ALL ON FUNCTION "public"."core_status_text"("v" "anyelement") TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_status_text"("v" "anyelement") TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON FUNCTION "public"."current_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_capo_mega_kpi_kind"("p_descr" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_capo_mega_kpi_kind"("p_descr" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_capo_mega_kpi_kind"("p_descr" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_consolidate_inca_on_rapportino_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_consolidate_inca_on_rapportino_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_consolidate_inca_on_rapportino_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_fill_plan_id_on_slot_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fill_plan_id_on_slot_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fill_plan_id_on_slot_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_hydrate_rapportino_inca_cavi_caches"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_hydrate_rapportino_inca_cavi_caches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_hydrate_rapportino_inca_cavi_caches"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_hydrate_rapportino_rows_previsto"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_hydrate_rapportino_rows_previsto"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_hydrate_rapportino_rows_previsto"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_normalize_commessa_upper"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_normalize_commessa_upper"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_normalize_commessa_upper"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_operator_auto_normalize"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_operator_auto_normalize"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_operator_auto_normalize"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_operator_identity_required"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_operator_identity_required"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_operator_identity_required"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_operator_key"("cognome" "text", "birth_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_operator_key"("cognome" "text", "birth_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_operator_key"("cognome" "text", "birth_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_rapportino_apply_product"("p_rapportino_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_rapportino_apply_product"("p_rapportino_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_rapportino_apply_product"("p_rapportino_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_resolve_ship_id_from_commessa"("p_commessa" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_resolve_ship_id_from_commessa"("p_commessa" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_resolve_ship_id_from_commessa"("p_commessa" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_profiles_capo_ui_mode_v1"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_profiles_capo_ui_mode_v1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_profiles_capo_ui_mode_v1"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."inca_increment_eliminated"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."inca_increment_eliminated"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."inca_increment_eliminated"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."inca_increment_reinstated"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."inca_increment_reinstated"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."inca_increment_reinstated"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."inca_increment_rework"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."inca_increment_rework"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."inca_increment_rework"("p_inca_file_id" "uuid", "p_codes" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."inca_search_cavi_by_nodes"("p_inca_file_id" "uuid", "p_nodes" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."inca_search_cavi_by_nodes"("p_inca_file_id" "uuid", "p_nodes" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."inca_search_cavi_by_nodes"("p_inca_file_id" "uuid", "p_nodes" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"("p_uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("p_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("p_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("p_uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_rapportino_approved"("p_rapportino_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_rapportino_approved"("p_rapportino_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_rapportino_approved"("p_rapportino_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_role"("role_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_role"("role_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_role"("role_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_ufficio"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_ufficio"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_ufficio"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_core_file_action"("p_core_file_id" "uuid", "p_action" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_core_file_action"("p_core_file_id" "uuid", "p_action" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_core_file_action"("p_core_file_id" "uuid", "p_action" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."manager_apply_week_to_days_v1"("p_week_plan_id" "uuid", "p_overwrite" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."manager_apply_week_to_days_v1"("p_week_plan_id" "uuid", "p_overwrite" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."manager_apply_week_to_days_v1"("p_week_plan_id" "uuid", "p_overwrite" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_apply_week_to_days_v1"("p_week_plan_id" "uuid", "p_overwrite" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."manager_my_capi"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."manager_my_capi"() TO "anon";
GRANT ALL ON FUNCTION "public"."manager_my_capi"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_my_capi"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manager_my_capi_ui_modes_v1"() TO "anon";
GRANT ALL ON FUNCTION "public"."manager_my_capi_ui_modes_v1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_my_capi_ui_modes_v1"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."manager_my_capi_v1"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."manager_my_capi_v1"() TO "anon";
GRANT ALL ON FUNCTION "public"."manager_my_capi_v1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_my_capi_v1"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."manager_my_operators_v1"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."manager_my_operators_v1"() TO "anon";
GRANT ALL ON FUNCTION "public"."manager_my_operators_v1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_my_operators_v1"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."manager_my_ships_v1"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."manager_my_ships_v1"() TO "anon";
GRANT ALL ON FUNCTION "public"."manager_my_ships_v1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_my_ships_v1"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manager_set_capo_ui_mode_v1"("p_capo_id" "uuid", "p_mode" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."manager_set_capo_ui_mode_v1"("p_capo_id" "uuid", "p_mode" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_set_capo_ui_mode_v1"("p_capo_id" "uuid", "p_mode" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."manager_set_week_status_v1"("p_week_plan_id" "uuid", "p_next_status" "public"."plan_status", "p_overwrite" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."manager_set_week_status_v1"("p_week_plan_id" "uuid", "p_next_status" "public"."plan_status", "p_overwrite" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."manager_set_week_status_v1"("p_week_plan_id" "uuid", "p_next_status" "public"."plan_status", "p_overwrite" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_set_week_status_v1"("p_week_plan_id" "uuid", "p_next_status" "public"."plan_status", "p_overwrite" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."nav_status_from_text"("x" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."nav_status_from_text"("x" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."nav_status_from_text"("x" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."navemaster_can_manage"() TO "anon";
GRANT ALL ON FUNCTION "public"."navemaster_can_manage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."navemaster_can_manage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_inca_situazione"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_inca_situazione"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_inca_situazione"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."percorso_propose_lots"("p_document_id" "uuid", "p_min_core_segments" integer, "p_min_cables" integer, "p_max_lots" integer, "p_dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."percorso_propose_lots"("p_document_id" "uuid", "p_min_core_segments" integer, "p_min_cables" integer, "p_max_lots" integer, "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."percorso_propose_lots"("p_document_id" "uuid", "p_min_core_segments" integer, "p_min_cables" integer, "p_max_lots" integer, "p_dry_run" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."ping"() TO "anon";
GRANT ALL ON FUNCTION "public"."ping"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ping"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_update_on_frozen_files"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_update_on_frozen_files"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_update_on_frozen_files"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_operator_kpi_snapshot"("p_operator_id" "uuid", "p_period" "public"."kpi_period", "p_ref_date" "date", "p_year_iso" integer, "p_week_iso" integer, "p_actor" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_operator_kpi_snapshot"("p_operator_id" "uuid", "p_period" "public"."kpi_period", "p_ref_date" "date", "p_year_iso" integer, "p_week_iso" integer, "p_actor" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_operator_kpi_snapshot"("p_operator_id" "uuid", "p_period" "public"."kpi_period", "p_ref_date" "date", "p_year_iso" integer, "p_week_iso" integer, "p_actor" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace_core_file_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."replace_core_file_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_core_file_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_profile_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_profile_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_profile_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_rapportini_capo_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_rapportini_capo_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_rapportini_capo_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_rapportino_row_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_rapportino_row_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_rapportino_row_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_rapportino_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_rapportino_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_rapportino_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_capo_id_from_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_capo_id_from_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_capo_id_from_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_archive_on_rapportino_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_archive_on_rapportino_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_archive_on_rapportino_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_auto_tp_from_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_auto_tp_from_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_auto_tp_from_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fill_rapportino_inca_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fill_rapportino_inca_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fill_rapportino_inca_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_operators_require_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_operators_require_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_operators_require_identity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_operators_set_operator_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_operators_set_operator_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_operators_set_operator_key"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_rapportini_apply_inca_progress_on_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_rapportini_apply_inca_progress_on_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_rapportini_apply_inca_progress_on_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_rapportini_on_status_product"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_rapportini_on_status_product"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_rapportini_on_status_product"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ufficio_approve_rapportino"("p_rapportino_id" "uuid", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."ufficio_create_correction_rapportino"("p_rapportino_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ufficio_create_correction_rapportino"("p_rapportino_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ufficio_create_correction_rapportino"("p_rapportino_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ufficio_create_correction_rapportino"("p_rapportino_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."manager_capo_assignments" TO "anon";
GRANT ALL ON TABLE "public"."manager_capo_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_capo_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."admin_capo_manager_v1" TO "anon";
GRANT ALL ON TABLE "public"."admin_capo_manager_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_capo_manager_v1" TO "service_role";



GRANT ALL ON TABLE "public"."ship_managers" TO "anon";
GRANT ALL ON TABLE "public"."ship_managers" TO "authenticated";
GRANT ALL ON TABLE "public"."ship_managers" TO "service_role";



GRANT ALL ON TABLE "public"."ships" TO "anon";
GRANT ALL ON TABLE "public"."ships" TO "authenticated";
GRANT ALL ON TABLE "public"."ships" TO "service_role";



GRANT ALL ON TABLE "public"."admin_manager_perimeter_v1" TO "anon";
GRANT ALL ON TABLE "public"."admin_manager_perimeter_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_manager_perimeter_v1" TO "service_role";



GRANT ALL ON TABLE "public"."manager_plans" TO "anon";
GRANT ALL ON TABLE "public"."manager_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_plans" TO "service_role";



GRANT ALL ON TABLE "public"."plan_capo_slots" TO "anon";
GRANT ALL ON TABLE "public"."plan_capo_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_capo_slots" TO "service_role";



GRANT ALL ON TABLE "public"."plan_slot_members" TO "anon";
GRANT ALL ON TABLE "public"."plan_slot_members" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_slot_members" TO "service_role";



GRANT ALL ON TABLE "public"."admin_planning_overview_v1" TO "anon";
GRANT ALL ON TABLE "public"."admin_planning_overview_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_planning_overview_v1" TO "service_role";



GRANT ALL ON TABLE "public"."ship_capos" TO "anon";
GRANT ALL ON TABLE "public"."ship_capos" TO "authenticated";
GRANT ALL ON TABLE "public"."ship_capos" TO "service_role";



GRANT ALL ON TABLE "public"."admin_ship_capos_v1" TO "anon";
GRANT ALL ON TABLE "public"."admin_ship_capos_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_ship_capos_v1" TO "service_role";



GRANT ALL ON TABLE "public"."operators" TO "authenticated";
GRANT ALL ON TABLE "public"."operators" TO "service_role";



GRANT ALL ON TABLE "public"."ship_operators" TO "anon";
GRANT ALL ON TABLE "public"."ship_operators" TO "authenticated";
GRANT ALL ON TABLE "public"."ship_operators" TO "service_role";



GRANT ALL ON TABLE "public"."admin_ship_operators_v1" TO "anon";
GRANT ALL ON TABLE "public"."admin_ship_operators_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_ship_operators_v1" TO "service_role";



GRANT ALL ON TABLE "public"."rapportini" TO "anon";
GRANT ALL ON TABLE "public"."rapportini" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportini" TO "service_role";



GRANT ALL ON TABLE "public"."rapportini_norm_v1" TO "anon";
GRANT ALL ON TABLE "public"."rapportini_norm_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportini_norm_v1" TO "service_role";



GRANT ALL ON TABLE "public"."ships_norm_v1" TO "anon";
GRANT ALL ON TABLE "public"."ships_norm_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."ships_norm_v1" TO "service_role";



GRANT ALL ON TABLE "public"."rapportini_ship_resolution_v1" TO "anon";
GRANT ALL ON TABLE "public"."rapportini_ship_resolution_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportini_ship_resolution_v1" TO "service_role";



GRANT ALL ON TABLE "public"."admin_ship_resolution_anomalies_v1" TO "anon";
GRANT ALL ON TABLE "public"."admin_ship_resolution_anomalies_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_ship_resolution_anomalies_v1" TO "service_role";



GRANT ALL ON TABLE "public"."archive_rapportini_v1" TO "anon";
GRANT ALL ON TABLE "public"."archive_rapportini_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."archive_rapportini_v1" TO "service_role";



GRANT ALL ON TABLE "public"."archive_rapportino_cavi_v1" TO "anon";
GRANT ALL ON TABLE "public"."archive_rapportino_cavi_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."archive_rapportino_cavi_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_cavi" TO "anon";
GRANT ALL ON TABLE "public"."inca_cavi" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_cavi" TO "service_role";



GRANT ALL ON TABLE "public"."rapportino_inca_cavi" TO "anon";
GRANT ALL ON TABLE "public"."rapportino_inca_cavi" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportino_inca_cavi" TO "service_role";



GRANT ALL ON TABLE "public"."archive_rapportino_inca_cavi_v1" TO "anon";
GRANT ALL ON TABLE "public"."archive_rapportino_inca_cavi_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."archive_rapportino_inca_cavi_v1" TO "service_role";



GRANT ALL ON TABLE "public"."catalogo_attivita" TO "anon";
GRANT ALL ON TABLE "public"."catalogo_attivita" TO "authenticated";
GRANT ALL ON TABLE "public"."catalogo_attivita" TO "service_role";



GRANT ALL ON TABLE "public"."catalogo_ship_commessa_attivita" TO "anon";
GRANT ALL ON TABLE "public"."catalogo_ship_commessa_attivita" TO "authenticated";
GRANT ALL ON TABLE "public"."catalogo_ship_commessa_attivita" TO "service_role";



GRANT ALL ON TABLE "public"."rapportino_rows" TO "anon";
GRANT ALL ON TABLE "public"."rapportino_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportino_rows" TO "service_role";



GRANT ALL ON TABLE "public"."archive_rapportino_rows_v1" TO "anon";
GRANT ALL ON TABLE "public"."archive_rapportino_rows_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."archive_rapportino_rows_v1" TO "service_role";



GRANT ALL ON TABLE "public"."capo_ship_expected_operators" TO "anon";
GRANT ALL ON TABLE "public"."capo_ship_expected_operators" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_ship_expected_operators" TO "service_role";



GRANT ALL ON TABLE "public"."capo_expected_operators_today_v1" TO "anon";
GRANT ALL ON TABLE "public"."capo_expected_operators_today_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_expected_operators_today_v1" TO "service_role";



GRANT ALL ON TABLE "public"."capo_my_team_v1" TO "anon";
GRANT ALL ON TABLE "public"."capo_my_team_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_my_team_v1" TO "service_role";



GRANT ALL ON TABLE "public"."operators_display_v1" TO "anon";
GRANT ALL ON TABLE "public"."operators_display_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."operators_display_v1" TO "service_role";



GRANT ALL ON TABLE "public"."capo_my_team_v2" TO "anon";
GRANT ALL ON TABLE "public"."capo_my_team_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_my_team_v2" TO "service_role";



GRANT ALL ON TABLE "public"."capo_returned_inbox_v1" TO "anon";
GRANT ALL ON TABLE "public"."capo_returned_inbox_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_returned_inbox_v1" TO "service_role";



GRANT ALL ON TABLE "public"."capo_ship_assignments" TO "anon";
GRANT ALL ON TABLE "public"."capo_ship_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_ship_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."capo_ship_attendance" TO "anon";
GRANT ALL ON TABLE "public"."capo_ship_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_ship_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."capo_team_days" TO "anon";
GRANT ALL ON TABLE "public"."capo_team_days" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_team_days" TO "service_role";



GRANT ALL ON TABLE "public"."capo_team_members" TO "anon";
GRANT ALL ON TABLE "public"."capo_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_team_members" TO "service_role";



GRANT ALL ON TABLE "public"."capo_teams" TO "anon";
GRANT ALL ON TABLE "public"."capo_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_teams" TO "service_role";



GRANT ALL ON TABLE "public"."capo_team_day_full_v1" TO "anon";
GRANT ALL ON TABLE "public"."capo_team_day_full_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_team_day_full_v1" TO "service_role";



GRANT ALL ON TABLE "public"."capo_today_ship_assignments_v1" TO "anon";
GRANT ALL ON TABLE "public"."capo_today_ship_assignments_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."capo_today_ship_assignments_v1" TO "service_role";



GRANT ALL ON TABLE "public"."catalogo_ship_commessa_attivita_public_v1" TO "anon";
GRANT ALL ON TABLE "public"."catalogo_ship_commessa_attivita_public_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."catalogo_ship_commessa_attivita_public_v1" TO "service_role";



GRANT ALL ON TABLE "public"."cncs_signal_runs" TO "anon";
GRANT ALL ON TABLE "public"."cncs_signal_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."cncs_signal_runs" TO "service_role";



GRANT ALL ON TABLE "public"."cncs_signals" TO "anon";
GRANT ALL ON TABLE "public"."cncs_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."cncs_signals" TO "service_role";



GRANT ALL ON TABLE "public"."core_drive_events" TO "anon";
GRANT ALL ON TABLE "public"."core_drive_events" TO "authenticated";
GRANT ALL ON TABLE "public"."core_drive_events" TO "service_role";



GRANT ALL ON TABLE "public"."core_file_audit" TO "anon";
GRANT ALL ON TABLE "public"."core_file_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."core_file_audit" TO "service_role";



GRANT ALL ON TABLE "public"."core_files" TO "anon";
GRANT ALL ON TABLE "public"."core_files" TO "authenticated";
GRANT ALL ON TABLE "public"."core_files" TO "service_role";



GRANT ALL ON TABLE "public"."core_meta" TO "anon";
GRANT ALL ON TABLE "public"."core_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."core_meta" TO "service_role";



GRANT ALL ON TABLE "public"."inca_files" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."inca_files" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_files" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_inca_teorico" TO "anon";
GRANT ALL ON TABLE "public"."direzione_inca_teorico" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_inca_teorico" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_inca_vs_rapportini" TO "anon";
GRANT ALL ON TABLE "public"."direzione_inca_vs_rapportini" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_inca_vs_rapportini" TO "service_role";



GRANT ALL ON TABLE "public"."rapportino_row_operators" TO "anon";
GRANT ALL ON TABLE "public"."rapportino_row_operators" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportino_row_operators" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_facts_v3" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_facts_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_facts_v3" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_facts_v2" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_facts_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_facts_v2" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_daily_v3" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_daily_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_daily_v3" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_facts_v1" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_facts_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_facts_v1" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_facts_v4" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_facts_v4" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_facts_v4" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v1" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v1" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v2" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v2" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v3" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v3" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v3_manager_safe" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v3_manager_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v3_manager_safe" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v4_manager_safe" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v4_manager_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_day_v4_manager_safe" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v1" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v1" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v2" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v2" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v3" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_month_v3" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v1" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v1" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v2" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v2" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v3" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_week_v3" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v1" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v1" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v2" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v2" TO "service_role";



GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v3" TO "anon";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."direzione_operator_kpi_year_v3" TO "service_role";



GRANT ALL ON TABLE "public"."impianti" TO "anon";
GRANT ALL ON TABLE "public"."impianti" TO "authenticated";
GRANT ALL ON TABLE "public"."impianti" TO "service_role";



GRANT ALL ON TABLE "public"."impianto_capi" TO "anon";
GRANT ALL ON TABLE "public"."impianto_capi" TO "authenticated";
GRANT ALL ON TABLE "public"."impianto_capi" TO "service_role";



GRANT ALL ON TABLE "public"."inca_latest_file_by_ship_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_latest_file_by_ship_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_latest_file_by_ship_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_cavi_live_by_ship_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_cavi_live_by_ship_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_cavi_live_by_ship_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_cavi_snapshot" TO "anon";
GRANT ALL ON TABLE "public"."inca_cavi_snapshot" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_cavi_snapshot" TO "service_role";



GRANT ALL ON TABLE "public"."inca_cavi_with_data_posa_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_cavi_with_data_posa_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_cavi_with_data_posa_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_cavi_with_last_posa_and_capo_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_cavi_with_last_posa_and_capo_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_cavi_with_last_posa_and_capo_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_cavi_with_last_posa_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_cavi_with_last_posa_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_cavi_with_last_posa_v1" TO "service_role";



GRANT ALL ON TABLE "public"."rapportino_cavi" TO "anon";
GRANT ALL ON TABLE "public"."rapportino_cavi" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportino_cavi" TO "service_role";



GRANT ALL ON TABLE "public"."inca_cavi_with_last_rapportino_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_cavi_with_last_rapportino_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_cavi_with_last_rapportino_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_percorsi" TO "anon";
GRANT ALL ON TABLE "public"."inca_percorsi" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_percorsi" TO "service_role";



GRANT ALL ON TABLE "public"."inca_cavi_with_path" TO "anon";
GRANT ALL ON TABLE "public"."inca_cavi_with_path" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_cavi_with_path" TO "service_role";



GRANT ALL ON TABLE "public"."inca_change_events" TO "anon";
GRANT ALL ON TABLE "public"."inca_change_events" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_change_events" TO "service_role";



GRANT ALL ON TABLE "public"."inca_prev_file_by_ship_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_prev_file_by_ship_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_prev_file_by_ship_v1" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_imports" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_imports" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_latest_import_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_latest_import_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_latest_import_v1" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_rows" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_rows" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_live_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_live_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_live_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_diff_last_import_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_diff_last_import_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_diff_last_import_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_export_ufficio_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_export_ufficio_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_export_ufficio_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_import_runs" TO "anon";
GRANT ALL ON TABLE "public"."inca_import_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_import_runs" TO "service_role";



GRANT ALL ON TABLE "public"."inca_import_summaries" TO "anon";
GRANT ALL ON TABLE "public"."inca_import_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_import_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."inca_imports" TO "anon";
GRANT ALL ON TABLE "public"."inca_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_imports" TO "service_role";



GRANT ALL ON TABLE "public"."inca_percorsi_nodes_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_percorsi_nodes_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_percorsi_nodes_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_percorsi_v1" TO "anon";
GRANT ALL ON TABLE "public"."inca_percorsi_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_percorsi_v1" TO "service_role";



GRANT ALL ON TABLE "public"."inca_rows" TO "anon";
GRANT ALL ON TABLE "public"."inca_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."inca_rows" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_daily_v1" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_daily_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_daily_v1" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_day_v1" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_day_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_day_v1" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_line_previsto_v2" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_line_previsto_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_line_previsto_v2" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_family_day_v2" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_family_day_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_family_day_v2" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3_capo_safe" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3_capo_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3_capo_safe" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3_manager_safe" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3_manager_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_family_day_v3_manager_safe" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_global_day_v2" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_global_day_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_global_day_v2" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3_capo_safe" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3_capo_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3_capo_safe" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3_manager_safe" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3_manager_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_global_day_v3_manager_safe" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_line_v1" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_line_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_line_v1" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operator_productivity_daily_v1" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operator_productivity_daily_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operator_productivity_daily_v1" TO "service_role";



GRANT ALL ON TABLE "public"."rapportini_canon_v1" TO "anon";
GRANT ALL ON TABLE "public"."rapportini_canon_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportini_canon_v1" TO "service_role";



GRANT ALL ON TABLE "public"."operator_facts_v1" TO "anon";
GRANT ALL ON TABLE "public"."operator_facts_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_facts_v1" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operatori_day_v1" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operatori_day_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operatori_day_v1" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operatori_day_v2" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operatori_day_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operatori_day_v2" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operatori_month_v1" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operatori_month_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operatori_month_v1" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operatori_week_v1" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operatori_week_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operatori_week_v1" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_operatori_year_v1" TO "anon";
GRANT ALL ON TABLE "public"."kpi_operatori_year_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_operatori_year_v1" TO "service_role";



GRANT ALL ON TABLE "public"."manager_capo_scope" TO "anon";
GRANT ALL ON TABLE "public"."manager_capo_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_capo_scope" TO "service_role";



GRANT ALL ON TABLE "public"."manager_my_capi_v1" TO "anon";
GRANT ALL ON TABLE "public"."manager_my_capi_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_my_capi_v1" TO "service_role";



GRANT ALL ON TABLE "public"."models" TO "anon";
GRANT ALL ON TABLE "public"."models" TO "authenticated";
GRANT ALL ON TABLE "public"."models" TO "service_role";



GRANT ALL ON SEQUENCE "public"."models_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."models_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."models_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_active_inca_file_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_active_inca_file_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_active_inca_file_v1" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_inca_alerts" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_inca_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_inca_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_inca_cavi_current_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_inca_cavi_current_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_inca_cavi_current_v1" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_inca_diff" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_inca_diff" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_inca_diff" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_inca_latest_file_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_inca_latest_file_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_inca_latest_file_v1" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_inca_latest_alerts_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_inca_latest_alerts_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_inca_latest_alerts_v1" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_inca_latest_diff_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_inca_latest_diff_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_inca_latest_diff_v1" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_inca_live_by_file_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_inca_live_by_file_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_inca_live_by_file_v1" TO "service_role";



GRANT ALL ON TABLE "public"."navemaster_inca_live_v1" TO "anon";
GRANT ALL ON TABLE "public"."navemaster_inca_live_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."navemaster_inca_live_v1" TO "service_role";



GRANT ALL ON TABLE "public"."objectives" TO "anon";
GRANT ALL ON TABLE "public"."objectives" TO "authenticated";
GRANT ALL ON TABLE "public"."objectives" TO "service_role";



GRANT ALL ON TABLE "public"."operator_kpi_facts" TO "anon";
GRANT ALL ON TABLE "public"."operator_kpi_facts" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_kpi_facts" TO "service_role";



GRANT ALL ON TABLE "public"."operator_kpi_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."operator_kpi_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_kpi_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."operator_ship_attendance" TO "anon";
GRANT ALL ON TABLE "public"."operator_ship_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_ship_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."operators_admin_list_v1" TO "anon";
GRANT ALL ON TABLE "public"."operators_admin_list_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."operators_admin_list_v1" TO "service_role";



GRANT ALL ON TABLE "public"."operators_display_v2" TO "anon";
GRANT ALL ON TABLE "public"."operators_display_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."operators_display_v2" TO "service_role";



GRANT ALL ON TABLE "public"."patterns" TO "anon";
GRANT ALL ON TABLE "public"."patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."patterns" TO "service_role";



GRANT ALL ON TABLE "public"."percorso_cable_segments" TO "anon";
GRANT ALL ON TABLE "public"."percorso_cable_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."percorso_cable_segments" TO "service_role";



GRANT ALL ON TABLE "public"."percorso_cables" TO "anon";
GRANT ALL ON TABLE "public"."percorso_cables" TO "authenticated";
GRANT ALL ON TABLE "public"."percorso_cables" TO "service_role";



GRANT ALL ON TABLE "public"."percorso_documents" TO "anon";
GRANT ALL ON TABLE "public"."percorso_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."percorso_documents" TO "service_role";



GRANT ALL ON TABLE "public"."percorso_documents_stats_v1" TO "anon";
GRANT ALL ON TABLE "public"."percorso_documents_stats_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."percorso_documents_stats_v1" TO "service_role";



GRANT ALL ON TABLE "public"."percorso_lot_cables" TO "anon";
GRANT ALL ON TABLE "public"."percorso_lot_cables" TO "authenticated";
GRANT ALL ON TABLE "public"."percorso_lot_cables" TO "service_role";



GRANT ALL ON TABLE "public"."percorso_lot_segments" TO "anon";
GRANT ALL ON TABLE "public"."percorso_lot_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."percorso_lot_segments" TO "service_role";



GRANT ALL ON TABLE "public"."percorso_lot_validations" TO "anon";
GRANT ALL ON TABLE "public"."percorso_lot_validations" TO "authenticated";
GRANT ALL ON TABLE "public"."percorso_lot_validations" TO "service_role";



GRANT ALL ON TABLE "public"."percorso_lots" TO "anon";
GRANT ALL ON TABLE "public"."percorso_lots" TO "authenticated";
GRANT ALL ON TABLE "public"."percorso_lots" TO "service_role";



GRANT ALL ON TABLE "public"."planning_audit" TO "anon";
GRANT ALL ON TABLE "public"."planning_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."planning_audit" TO "service_role";



GRANT ALL ON TABLE "public"."rapportini_corrections_audit" TO "anon";
GRANT ALL ON TABLE "public"."rapportini_corrections_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportini_corrections_audit" TO "service_role";



GRANT ALL ON TABLE "public"."rapportini_with_capo_v1" TO "anon";
GRANT ALL ON TABLE "public"."rapportini_with_capo_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."rapportini_with_capo_v1" TO "service_role";



GRANT ALL ON TABLE "public"."ufficio_rapportini_list_v1" TO "anon";
GRANT ALL ON TABLE "public"."ufficio_rapportini_list_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."ufficio_rapportini_list_v1" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";









  create table "public"."capo_team_days" (
    "id" uuid not null default gen_random_uuid(),
    "capo_id" uuid not null,
    "ship_id" uuid not null,
    "plan_date" date not null,
    "source_plan_id" uuid,
    "status" text not null default 'DRAFT'::text,
    "note" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid
      );


alter table "public"."capo_team_days" enable row level security;


  create table "public"."capo_team_members" (
    "id" uuid not null default gen_random_uuid(),
    "team_id" uuid not null,
    "operator_id" uuid not null,
    "planned_minutes" integer not null default 480,
    "position" integer not null default 0,
    "role_tag" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."capo_team_members" enable row level security;


  create table "public"."capo_teams" (
    "id" uuid not null default gen_random_uuid(),
    "team_day_id" uuid not null,
    "name" text not null,
    "position" integer not null default 0,
    "deck" text,
    "zona" text,
    "activity_code" text,
    "note" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."capo_teams" enable row level security;

alter table "archive"."rapportino_rows" add column "position" integer;

alter table "public"."manager_plans" add column "is_locked" boolean not null default false;

alter table "public"."manager_plans" add column "locked_at" timestamp with time zone;

alter table "public"."manager_plans" add column "locked_by" uuid;

alter table "public"."manager_plans" add column "unlocked_at" timestamp with time zone;

alter table "public"."manager_plans" add column "unlocked_by" uuid;

alter table "public"."rapportini" alter column "data" set default CURRENT_DATE;

CREATE INDEX archive_rapportino_rows_rapportino_id_position_idx ON archive.rapportino_rows USING btree (rapportino_id, "position");

CREATE INDEX capo_team_days_capo_date_idx ON public.capo_team_days USING btree (capo_id, plan_date);

CREATE UNIQUE INDEX capo_team_days_pkey ON public.capo_team_days USING btree (id);

CREATE INDEX capo_team_days_ship_date_idx ON public.capo_team_days USING btree (ship_id, plan_date);

CREATE UNIQUE INDEX capo_team_days_unique_capo_ship_date ON public.capo_team_days USING btree (capo_id, ship_id, plan_date);

CREATE INDEX capo_team_members_operator_idx ON public.capo_team_members USING btree (operator_id);

CREATE UNIQUE INDEX capo_team_members_pkey ON public.capo_team_members USING btree (id);

CREATE INDEX capo_team_members_team_idx ON public.capo_team_members USING btree (team_id);

CREATE UNIQUE INDEX capo_team_members_unique_team_operator ON public.capo_team_members USING btree (team_id, operator_id);

CREATE UNIQUE INDEX capo_teams_pkey ON public.capo_teams USING btree (id);

CREATE INDEX capo_teams_team_day_idx ON public.capo_teams USING btree (team_day_id);

CREATE UNIQUE INDEX capo_teams_unique_day_position ON public.capo_teams USING btree (team_day_id, "position");

CREATE INDEX manager_plans_is_locked_idx ON public.manager_plans USING btree (is_locked) WHERE (is_locked = true);

alter table "public"."capo_team_days" add constraint "capo_team_days_pkey" PRIMARY KEY using index "capo_team_days_pkey";

alter table "public"."capo_team_members" add constraint "capo_team_members_pkey" PRIMARY KEY using index "capo_team_members_pkey";

alter table "public"."capo_teams" add constraint "capo_teams_pkey" PRIMARY KEY using index "capo_teams_pkey";

alter table "public"."capo_team_days" add constraint "capo_team_days_ship_fk" FOREIGN KEY (ship_id) REFERENCES public.ships(id) ON DELETE RESTRICT not valid;

alter table "public"."capo_team_days" validate constraint "capo_team_days_ship_fk";

alter table "public"."capo_team_days" add constraint "capo_team_days_status_chk" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'LOCKED'::text]))) not valid;

alter table "public"."capo_team_days" validate constraint "capo_team_days_status_chk";

alter table "public"."capo_team_days" add constraint "capo_team_days_unique_capo_ship_date" UNIQUE using index "capo_team_days_unique_capo_ship_date";

alter table "public"."capo_team_members" add constraint "capo_team_members_minutes_chk" CHECK (((planned_minutes >= 0) AND (planned_minutes <= (24 * 60)))) not valid;

alter table "public"."capo_team_members" validate constraint "capo_team_members_minutes_chk";

alter table "public"."capo_team_members" add constraint "capo_team_members_operator_fk" FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE RESTRICT not valid;

alter table "public"."capo_team_members" validate constraint "capo_team_members_operator_fk";

alter table "public"."capo_team_members" add constraint "capo_team_members_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.capo_teams(id) ON DELETE CASCADE not valid;

alter table "public"."capo_team_members" validate constraint "capo_team_members_team_id_fkey";

alter table "public"."capo_team_members" add constraint "capo_team_members_unique_team_operator" UNIQUE using index "capo_team_members_unique_team_operator";

alter table "public"."capo_teams" add constraint "capo_teams_team_day_id_fkey" FOREIGN KEY (team_day_id) REFERENCES public.capo_team_days(id) ON DELETE CASCADE not valid;

alter table "public"."capo_teams" validate constraint "capo_teams_team_day_id_fkey";

alter table "public"."capo_teams" add constraint "capo_teams_unique_day_position" UNIQUE using index "capo_teams_unique_day_position";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.capo_get_team_day_v1(p_ship_id uuid, p_plan_date date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
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
$function$
;

create or replace view "public"."capo_team_day_full_v1" as  SELECT d.id AS team_day_id,
    d.capo_id,
    d.ship_id,
    d.plan_date,
    d.status,
    d.note AS day_note,
    d.created_at AS day_created_at,
    d.updated_at AS day_updated_at,
    t.id AS team_id,
    t.name AS team_name,
    t."position" AS team_position,
    t.deck AS team_deck,
    t.zona AS team_zona,
    t.activity_code AS team_activity_code,
    t.note AS team_note,
    m.id AS member_id,
    m.operator_id,
    m.planned_minutes,
    m."position" AS member_position,
    m.role_tag AS member_role_tag
   FROM ((public.capo_team_days d
     LEFT JOIN public.capo_teams t ON ((t.team_day_id = d.id)))
     LEFT JOIN public.capo_team_members m ON ((m.team_id = t.id)));


CREATE OR REPLACE FUNCTION public.capo_team_days_fill_owner()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.core_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.debug_whoami()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'uid', auth.uid(),
    'jwt_sub', current_setting('request.jwt.claim.sub', true),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  );
$function$
;

create or replace view "public"."inca_head_by_project_v1" as  SELECT DISTINCT ON (costr, commessa) id AS inca_file_id,
    costr,
    commessa,
    uploaded_at
   FROM public.inca_files
  WHERE (file_type = 'XLSX'::text)
  ORDER BY costr, commessa, uploaded_at DESC;


CREATE OR REPLACE FUNCTION public.test_set_auth(uid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text,
    true
  );
end;
$function$
;

create or replace view "public"."archive_rapportino_rows_v1" as  SELECT rr.id,
    rr.rapportino_id,
    rr.row_index,
    rr.categoria,
    rr.descrizione,
    rr.operatori,
    rr.tempo,
    COALESCE(rr.previsto, csca.previsto_value, ca.previsto_value) AS previsto,
    rr.prodotto,
    rr.note,
    rr.created_at,
    rr.updated_at,
    rr.activity_id,
    COALESCE(ca.activity_type, ca_global.activity_type) AS activity_type,
    COALESCE(ca.unit, ca_global.unit) AS unit,
    COALESCE(csca.previsto_value, ca_global.previsto_value) AS previsto_catalog_value,
    COALESCE(csca.is_active, ca_global.is_active, false) AS catalog_is_active
   FROM (((((public.rapportino_rows rr
     JOIN public.rapportini r ON ((r.id = rr.rapportino_id)))
     LEFT JOIN LATERAL ( SELECT sh.id AS ship_id
           FROM public.ships sh
          WHERE ((sh.costr = r.costr) AND (sh.commessa = r.commessa))
          ORDER BY sh.is_active DESC, sh.created_at DESC
         LIMIT 1) s ON (true))
     LEFT JOIN public.catalogo_ship_commessa_attivita csca ON (((csca.ship_id = s.ship_id) AND (csca.commessa = r.commessa) AND (csca.activity_id = rr.activity_id))))
     LEFT JOIN public.catalogo_attivita ca_global ON ((ca_global.id = rr.activity_id)))
     LEFT JOIN public.catalogo_attivita ca ON ((ca.id = rr.activity_id)));


CREATE OR REPLACE FUNCTION public.capo_can_write_assigned_ship(p_plan_date date, p_ship_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    (public.core_current_profile()).app_role = 'CAPO'::text
    and exists (
      select 1
      from public.capo_ship_assignments a
      where a.capo_id = auth.uid()
        and a.plan_date = p_plan_date
        and a.ship_id = p_ship_id
    );
$function$
;

CREATE OR REPLACE FUNCTION public.capo_can_write_ship_attendance(p_plan_date date, p_ship_id uuid, p_capo_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.capo_kpi_worktime_v1(p_costr text, p_commessa text DEFAULT NULL::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.capo_returned_summary(p_role text)
 RETURNS TABLE(returned_count bigint, last_id uuid, last_report_date date, last_costr text, last_commessa text, last_updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
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

-- Cas où il n'y a aucun RETURNED : on renvoie quand même 1 ligne avec count=0
select
  (select count(*) from base) as returned_count,
  null::uuid,
  null::date,
  null::text,
  null::text,
  null::timestamptz
where not exists (select 1 from last_one);
$function$
;

CREATE OR REPLACE FUNCTION public.core_current_profile()
 RETURNS public.core_current_profile_type
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.core_drive_emit_upload_event(p_file_id uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.core_drive_soft_delete_file(p_file_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.current_profile()
 RETURNS public.profiles
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.*
  from public.profiles p
  where p.id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.fn_capo_mega_kpi_kind(p_descr text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT
    CASE
      WHEN p_descr IS NULL OR btrim(p_descr) = '' THEN 'OTHER'
      WHEN lower(p_descr) LIKE '%fascett%' THEN 'FASCETTATURA'
      WHEN lower(p_descr) LIKE '%ripresa%' THEN 'RIPRESA'
      WHEN lower(p_descr) LIKE '%stesura%' THEN 'STESURA'
      ELSE 'OTHER'
    END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_consolidate_inca_on_rapportino_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fn_hydrate_rapportino_rows_previsto()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fn_rapportino_apply_product(p_rapportino_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fn_resolve_ship_id_from_commessa(p_commessa text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.guard_profiles_capo_ui_mode_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manager_my_capi()
 RETURNS TABLE(capo_id uuid, display_name text, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manager_my_capi_ui_modes_v1()
 RETURNS TABLE(capo_id uuid, display_name text, email text, capo_ui_mode text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manager_my_capi_v1()
 RETURNS TABLE(capo_id uuid, display_name text, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manager_my_operators_v1()
 RETURNS TABLE(operator_id uuid, operator_name text, operator_roles text[], created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manager_set_capo_ui_mode_v1(p_capo_id uuid, p_mode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nav_status_from_text(x text)
 RETURNS public.nav_status
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case upper(trim(coalesce(x, '')))
    when 'P'  then 'P'::public.nav_status
    when 'R'  then 'R'::public.nav_status
    when 'T'  then 'T'::public.nav_status
    when 'B'  then 'B'::public.nav_status
    when 'E'  then 'E'::public.nav_status
    when 'NP' then 'NP'::public.nav_status
    else 'NP'::public.nav_status
  end
$function$
;

CREATE OR REPLACE FUNCTION public.percorso_propose_lots(p_document_id uuid, p_min_core_segments integer, p_min_cables integer, p_max_lots integer, p_dry_run boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_update_on_frozen_files()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if old.frozen_at is not null then
    raise exception 'Document gelé juridiquement. Aucune modification autorisée.';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recompute_operator_kpi_snapshot(p_operator_id uuid, p_period public.kpi_period, p_ref_date date, p_year_iso integer, p_week_iso integer, p_actor uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_profile_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trg_auto_tp_from_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trg_fill_rapportino_inca_cache()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trg_rapportini_on_status_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.ufficio_create_correction_rapportino(p_rapportino_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

grant delete on table "public"."capo_team_days" to "anon";

grant insert on table "public"."capo_team_days" to "anon";

grant references on table "public"."capo_team_days" to "anon";

grant select on table "public"."capo_team_days" to "anon";

grant trigger on table "public"."capo_team_days" to "anon";

grant truncate on table "public"."capo_team_days" to "anon";

grant update on table "public"."capo_team_days" to "anon";

grant delete on table "public"."capo_team_days" to "authenticated";

grant insert on table "public"."capo_team_days" to "authenticated";

grant references on table "public"."capo_team_days" to "authenticated";

grant select on table "public"."capo_team_days" to "authenticated";

grant trigger on table "public"."capo_team_days" to "authenticated";

grant truncate on table "public"."capo_team_days" to "authenticated";

grant update on table "public"."capo_team_days" to "authenticated";

grant delete on table "public"."capo_team_days" to "service_role";

grant insert on table "public"."capo_team_days" to "service_role";

grant references on table "public"."capo_team_days" to "service_role";

grant select on table "public"."capo_team_days" to "service_role";

grant trigger on table "public"."capo_team_days" to "service_role";

grant truncate on table "public"."capo_team_days" to "service_role";

grant update on table "public"."capo_team_days" to "service_role";

grant delete on table "public"."capo_team_members" to "anon";

grant insert on table "public"."capo_team_members" to "anon";

grant references on table "public"."capo_team_members" to "anon";

grant select on table "public"."capo_team_members" to "anon";

grant trigger on table "public"."capo_team_members" to "anon";

grant truncate on table "public"."capo_team_members" to "anon";

grant update on table "public"."capo_team_members" to "anon";

grant delete on table "public"."capo_team_members" to "authenticated";

grant insert on table "public"."capo_team_members" to "authenticated";

grant references on table "public"."capo_team_members" to "authenticated";

grant select on table "public"."capo_team_members" to "authenticated";

grant trigger on table "public"."capo_team_members" to "authenticated";

grant truncate on table "public"."capo_team_members" to "authenticated";

grant update on table "public"."capo_team_members" to "authenticated";

grant delete on table "public"."capo_team_members" to "service_role";

grant insert on table "public"."capo_team_members" to "service_role";

grant references on table "public"."capo_team_members" to "service_role";

grant select on table "public"."capo_team_members" to "service_role";

grant trigger on table "public"."capo_team_members" to "service_role";

grant truncate on table "public"."capo_team_members" to "service_role";

grant update on table "public"."capo_team_members" to "service_role";

grant delete on table "public"."capo_teams" to "anon";

grant insert on table "public"."capo_teams" to "anon";

grant references on table "public"."capo_teams" to "anon";

grant select on table "public"."capo_teams" to "anon";

grant trigger on table "public"."capo_teams" to "anon";

grant truncate on table "public"."capo_teams" to "anon";

grant update on table "public"."capo_teams" to "anon";

grant delete on table "public"."capo_teams" to "authenticated";

grant insert on table "public"."capo_teams" to "authenticated";

grant references on table "public"."capo_teams" to "authenticated";

grant select on table "public"."capo_teams" to "authenticated";

grant trigger on table "public"."capo_teams" to "authenticated";

grant truncate on table "public"."capo_teams" to "authenticated";

grant update on table "public"."capo_teams" to "authenticated";

grant delete on table "public"."capo_teams" to "service_role";

grant insert on table "public"."capo_teams" to "service_role";

grant references on table "public"."capo_teams" to "service_role";

grant select on table "public"."capo_teams" to "service_role";

grant trigger on table "public"."capo_teams" to "service_role";

grant truncate on table "public"."capo_teams" to "service_role";

grant update on table "public"."capo_teams" to "service_role";


  create policy "capo_ship_assignments_select_ufficio_scoped"
  on "public"."capo_ship_assignments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.ufficio_capo_scopes s
  WHERE ((s.ufficio_id = auth.uid()) AND (s.capo_id = capo_ship_assignments.capo_id) AND (s.ship_id = capo_ship_assignments.ship_id) AND (s.active = true)))));



  create policy "capo_team_days_delete_own"
  on "public"."capo_team_days"
  as permissive
  for delete
  to authenticated
using ((capo_id = auth.uid()));



  create policy "capo_team_days_insert_own"
  on "public"."capo_team_days"
  as permissive
  for insert
  to authenticated
with check ((capo_id = auth.uid()));



  create policy "capo_team_days_select_own"
  on "public"."capo_team_days"
  as permissive
  for select
  to authenticated
using ((capo_id = auth.uid()));



  create policy "capo_team_days_update_own"
  on "public"."capo_team_days"
  as permissive
  for update
  to authenticated
using ((capo_id = auth.uid()))
with check ((capo_id = auth.uid()));



  create policy "capo_team_members_delete_own"
  on "public"."capo_team_members"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.capo_teams t
     JOIN public.capo_team_days d ON ((d.id = t.team_day_id)))
  WHERE ((t.id = capo_team_members.team_id) AND (d.capo_id = auth.uid())))));



  create policy "capo_team_members_insert_own"
  on "public"."capo_team_members"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (public.capo_teams t
     JOIN public.capo_team_days d ON ((d.id = t.team_day_id)))
  WHERE ((t.id = capo_team_members.team_id) AND (d.capo_id = auth.uid())))));



  create policy "capo_team_members_select_own"
  on "public"."capo_team_members"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.capo_teams t
     JOIN public.capo_team_days d ON ((d.id = t.team_day_id)))
  WHERE ((t.id = capo_team_members.team_id) AND (d.capo_id = auth.uid())))));



  create policy "capo_team_members_update_own"
  on "public"."capo_team_members"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.capo_teams t
     JOIN public.capo_team_days d ON ((d.id = t.team_day_id)))
  WHERE ((t.id = capo_team_members.team_id) AND (d.capo_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.capo_teams t
     JOIN public.capo_team_days d ON ((d.id = t.team_day_id)))
  WHERE ((t.id = capo_team_members.team_id) AND (d.capo_id = auth.uid())))));



  create policy "capo_teams_delete_own"
  on "public"."capo_teams"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.capo_team_days d
  WHERE ((d.id = capo_teams.team_day_id) AND (d.capo_id = auth.uid())))));



  create policy "capo_teams_insert_own"
  on "public"."capo_teams"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.capo_team_days d
  WHERE ((d.id = capo_teams.team_day_id) AND (d.capo_id = auth.uid())))));



  create policy "capo_teams_select_own"
  on "public"."capo_teams"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.capo_team_days d
  WHERE ((d.id = capo_teams.team_day_id) AND (d.capo_id = auth.uid())))));



  create policy "capo_teams_update_own"
  on "public"."capo_teams"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.capo_team_days d
  WHERE ((d.id = capo_teams.team_day_id) AND (d.capo_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.capo_team_days d
  WHERE ((d.id = capo_teams.team_day_id) AND (d.capo_id = auth.uid())))));



  create policy "admin_delete_all_manager_plans"
  on "public"."manager_plans"
  as permissive
  for delete
  to public
using (public.is_role('ADMIN'::text));



  create policy "admin_insert_all_manager_plans"
  on "public"."manager_plans"
  as permissive
  for insert
  to public
with check (public.is_role('ADMIN'::text));



  create policy "admin_update_all_manager_plans"
  on "public"."manager_plans"
  as permissive
  for update
  to public
using (public.is_role('ADMIN'::text))
with check (public.is_role('ADMIN'::text));


CREATE TRIGGER trg_capo_team_days_fill_owner BEFORE INSERT ON public.capo_team_days FOR EACH ROW EXECUTE FUNCTION public.capo_team_days_fill_owner();

CREATE TRIGGER trg_capo_team_days_updated_at BEFORE UPDATE ON public.capo_team_days FOR EACH ROW EXECUTE FUNCTION public.core_set_updated_at();

CREATE TRIGGER trg_capo_team_members_updated_at BEFORE UPDATE ON public.capo_team_members FOR EACH ROW EXECUTE FUNCTION public.core_set_updated_at();

CREATE TRIGGER trg_capo_teams_updated_at BEFORE UPDATE ON public.capo_teams FOR EACH ROW EXECUTE FUNCTION public.core_set_updated_at();

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();



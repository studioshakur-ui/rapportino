-- supabase/migrations/20260118090000_manager_week_materialize_and_capo_team_by_date.sql
--
-- Manager: Apply WEEK plan to DAY plans (Mon-Fri) while preserving day overrides by default.
-- CAPO: Date-driven team reader to align Rapportino navigation (?date=YYYY-MM-DD) with planning.
--
-- Canon:
-- - CAPO consumes DAY plans.
-- - WEEK is a template; DAY can override.
-- - Default behavior is NON-DESTRUCTIVE: do not overwrite non-empty day slots unless p_overwrite=true.

begin;

-- -----------------------------------------------------------------------------
-- CAPO: team for an explicit day (no CURRENT_DATE ambiguity)
-- -----------------------------------------------------------------------------

drop function if exists public.capo_my_team_for_date_v1(date);

create or replace function public.capo_my_team_for_date_v1(p_plan_date date)
returns table(
  operator_id uuid,
  capo_id uuid,
  plan_id uuid,
  operator_name text,
  operator_position integer,
  slot_id uuid
)
language sql
stable
security definer
set search_path to 'public', 'auth'
as $$
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

alter function public.capo_my_team_for_date_v1(date) owner to postgres;

revoke all on function public.capo_my_team_for_date_v1(date) from public;
grant all on function public.capo_my_team_for_date_v1(date) to anon;
grant all on function public.capo_my_team_for_date_v1(date) to authenticated;
grant all on function public.capo_my_team_for_date_v1(date) to service_role;

comment on function public.capo_my_team_for_date_v1(date)
is 'CAPO: operators assigned by Manager for a specific DAY plan date (PUBLISHED/FROZEN). Avoids CURRENT_DATE timezone ambiguity.';

-- -----------------------------------------------------------------------------
-- MANAGER: WEEK template -> DAY plans (Mon-Fri)
-- -----------------------------------------------------------------------------

drop function if exists public.manager_apply_week_to_days_v1(uuid, boolean);

create or replace function public.manager_apply_week_to_days_v1(
  p_week_plan_id uuid,
  p_overwrite boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
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

alter function public.manager_apply_week_to_days_v1(uuid, boolean) owner to postgres;

revoke all on function public.manager_apply_week_to_days_v1(uuid, boolean) from public;
grant all on function public.manager_apply_week_to_days_v1(uuid, boolean) to anon;
grant all on function public.manager_apply_week_to_days_v1(uuid, boolean) to authenticated;
grant all on function public.manager_apply_week_to_days_v1(uuid, boolean) to service_role;

comment on function public.manager_apply_week_to_days_v1(uuid, boolean)
is 'MANAGER: materialize WEEK plan into DAY plans for Mon-Fri. Default is non-destructive (preserve day overrides unless overwrite=true).';

-- -----------------------------------------------------------------------------
-- MANAGER: set WEEK status and propagate to Mon-Fri DAY plans
-- -----------------------------------------------------------------------------

drop function if exists public.manager_set_week_status_v1(uuid, public.plan_status, boolean);

create or replace function public.manager_set_week_status_v1(
  p_week_plan_id uuid,
  p_next_status public.plan_status,
  p_overwrite boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
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

alter function public.manager_set_week_status_v1(uuid, public.plan_status, boolean) owner to postgres;

revoke all on function public.manager_set_week_status_v1(uuid, public.plan_status, boolean) from public;
grant all on function public.manager_set_week_status_v1(uuid, public.plan_status, boolean) to anon;
grant all on function public.manager_set_week_status_v1(uuid, public.plan_status, boolean) to authenticated;
grant all on function public.manager_set_week_status_v1(uuid, public.plan_status, boolean) to service_role;

comment on function public.manager_set_week_status_v1(uuid, public.plan_status, boolean)
is 'MANAGER: set WEEK status and propagate to Mon-Fri DAY plans. Calls manager_apply_week_to_days_v1 first.';

commit;

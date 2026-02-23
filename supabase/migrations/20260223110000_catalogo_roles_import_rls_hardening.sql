begin;

-- ============================================================
-- CNCS Catalogo hardening + dynamic roles + import runs
-- ============================================================

-- 0) Soft-delete support (no hard delete for historical integrity)
alter table if exists public.catalogo_attivita
  add column if not exists deleted_at timestamptz null;

alter table if exists public.catalogo_ship_commessa_attivita
  add column if not exists deleted_at timestamptz null;

create index if not exists catalogo_attivita_deleted_at_idx
  on public.catalogo_attivita (deleted_at);

create index if not exists catalogo_ship_commessa_deleted_at_idx
  on public.catalogo_ship_commessa_attivita (deleted_at);

-- 1) Dynamic catalog roles (metier)
create table if not exists public.catalogo_roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null,
  label_it text not null,
  label_fr text null,
  label_en text null,
  is_active boolean not null default true,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create unique index if not exists catalogo_roles_role_key_norm_uk
  on public.catalogo_roles (lower(trim(role_key)));

create index if not exists catalogo_roles_active_idx
  on public.catalogo_roles (is_active)
  where deleted_at is null;

drop trigger if exists trg_catalogo_roles_updated_at on public.catalogo_roles;
create trigger trg_catalogo_roles_updated_at
before update on public.catalogo_roles
for each row execute function public.set_updated_at();

alter table public.catalogo_roles enable row level security;
revoke all on public.catalogo_roles from anon;
revoke all on public.catalogo_roles from authenticated;
grant select on public.catalogo_roles to authenticated;

drop policy if exists "catalogo_roles_select_authenticated" on public.catalogo_roles;
create policy "catalogo_roles_select_authenticated"
on public.catalogo_roles
for select
to authenticated
using (deleted_at is null);

drop policy if exists "catalogo_roles_insert_admin" on public.catalogo_roles;
create policy "catalogo_roles_insert_admin"
on public.catalogo_roles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "catalogo_roles_update_admin" on public.catalogo_roles;
create policy "catalogo_roles_update_admin"
on public.catalogo_roles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.catalogo_roles(role_key, label_it, label_fr, label_en, is_active)
values
  ('electricista', 'Elettricista', 'Electricien', 'Electrician', true),
  ('carpentieri', 'Carpentieri', 'Charpentiers', 'Carpenters', true),
  ('montaggio', 'Montaggio', 'Montage', 'Assembly', true)
on conflict ((lower(trim(role_key)))) do update
set
  label_it = excluded.label_it,
  label_fr = excluded.label_fr,
  label_en = excluded.label_en,
  is_active = excluded.is_active,
  deleted_at = null,
  updated_at = now();

-- 2) Activity <-> role pivot
create table if not exists public.catalogo_attivita_roles (
  activity_id uuid not null references public.catalogo_attivita(id) on delete cascade,
  role_id uuid not null references public.catalogo_roles(id) on delete restrict,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (activity_id, role_id)
);

create index if not exists catalogo_attivita_roles_role_idx
  on public.catalogo_attivita_roles(role_id);

alter table public.catalogo_attivita_roles enable row level security;
revoke all on public.catalogo_attivita_roles from anon;
revoke all on public.catalogo_attivita_roles from authenticated;
grant select on public.catalogo_attivita_roles to authenticated;

drop policy if exists "catalogo_attivita_roles_select_authenticated" on public.catalogo_attivita_roles;
create policy "catalogo_attivita_roles_select_authenticated"
on public.catalogo_attivita_roles
for select
to authenticated
using (true);

drop policy if exists "catalogo_attivita_roles_insert_admin" on public.catalogo_attivita_roles;
create policy "catalogo_attivita_roles_insert_admin"
on public.catalogo_attivita_roles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "catalogo_attivita_roles_delete_admin" on public.catalogo_attivita_roles;
create policy "catalogo_attivita_roles_delete_admin"
on public.catalogo_attivita_roles
for delete
to authenticated
using (public.is_admin());

-- 3) Import runs + row traceability
create table if not exists public.catalogo_import_runs (
  run_id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('GLOBAL','SCOPED')),
  scope_ship_id uuid null references public.ships(id) on delete set null,
  scope_commessa text null,
  file_name text null,
  file_size_bytes bigint null,
  file_mime text null,
  mapping jsonb not null default '{}'::jsonb,
  status text not null default 'PREVIEW' check (status in ('PREVIEW','APPLIED','FAILED')),
  stats jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  applied_at timestamptz null
);

create table if not exists public.catalogo_import_run_rows (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.catalogo_import_runs(run_id) on delete cascade,
  row_index integer not null,
  action text not null check (action in ('insert','update','noop','invalid')),
  payload jsonb not null,
  error_text text null,
  created_at timestamptz not null default now()
);

create index if not exists catalogo_import_run_rows_run_idx
  on public.catalogo_import_run_rows(run_id, row_index);

alter table public.catalogo_import_runs enable row level security;
alter table public.catalogo_import_run_rows enable row level security;

revoke all on public.catalogo_import_runs from anon;
revoke all on public.catalogo_import_runs from authenticated;
revoke all on public.catalogo_import_run_rows from anon;
revoke all on public.catalogo_import_run_rows from authenticated;

grant select on public.catalogo_import_runs to authenticated;
grant select on public.catalogo_import_run_rows to authenticated;

drop policy if exists "catalogo_import_runs_admin_all" on public.catalogo_import_runs;
create policy "catalogo_import_runs_admin_all"
on public.catalogo_import_runs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "catalogo_import_run_rows_admin_all" on public.catalogo_import_run_rows;
create policy "catalogo_import_run_rows_admin_all"
on public.catalogo_import_run_rows
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 4) Ensure audit table exists (some environments missed older seed migration)
create table if not exists public.catalogo_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor uuid null,
  action text not null,
  table_name text not null,
  ship_id uuid null,
  commessa text null,
  activity_id uuid null,
  before_row jsonb null,
  after_row jsonb null
);

create index if not exists catalogo_events_at_idx on public.catalogo_events (at desc);
create index if not exists catalogo_events_ship_commessa_idx on public.catalogo_events (ship_id, commessa);
create index if not exists catalogo_events_activity_idx on public.catalogo_events (activity_id);

-- 5) Hardening audit log: prevent direct client inserts
alter table public.catalogo_events enable row level security;

revoke insert, update, delete on public.catalogo_events from anon;
revoke insert, update, delete on public.catalogo_events from authenticated;
grant select on public.catalogo_events to authenticated;

drop policy if exists "catalogo_events_insert_authenticated" on public.catalogo_events;
drop policy if exists "catalogo_events_select_admin" on public.catalogo_events;
create policy "catalogo_events_select_admin"
on public.catalogo_events
for select
to authenticated
using (public.is_admin());

create or replace function public.catalogo_events_reject_direct_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() <= 1 then
    raise exception 'Direct insert into catalogo_events is forbidden'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.catalogo_events_reject_direct_insert() from public;
grant execute on function public.catalogo_events_reject_direct_insert() to authenticated;

drop trigger if exists trg_catalogo_events_reject_direct_insert on public.catalogo_events;
create trigger trg_catalogo_events_reject_direct_insert
before insert on public.catalogo_events
for each row execute function public.catalogo_events_reject_direct_insert();

-- 6) Canonical catalog audit triggers (append-only)
create or replace function public.catalogo_log_ship_commessa_attivita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();

  if tg_op = 'INSERT' then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'INSERT', 'catalogo_ship_commessa_attivita', new.ship_id, new.commessa, new.activity_id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'UPDATE', 'catalogo_ship_commessa_attivita', new.ship_id, new.commessa, new.activity_id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'DELETE', 'catalogo_ship_commessa_attivita', old.ship_id, old.commessa, old.activity_id, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

create or replace function public.catalogo_log_attivita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();

  if tg_op = 'INSERT' then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'INSERT', 'catalogo_attivita', null, null, new.id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'UPDATE', 'catalogo_attivita', null, null, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.catalogo_events(actor, action, table_name, ship_id, commessa, activity_id, before_row, after_row)
    values (v_actor, 'DELETE', 'catalogo_attivita', null, null, old.id, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_catalogo_log_ship_commessa_attivita on public.catalogo_ship_commessa_attivita;
create trigger trg_catalogo_log_ship_commessa_attivita
after insert or update or delete on public.catalogo_ship_commessa_attivita
for each row execute function public.catalogo_log_ship_commessa_attivita();

drop trigger if exists trg_catalogo_log_attivita on public.catalogo_attivita;
create trigger trg_catalogo_log_attivita
after insert or update or delete on public.catalogo_attivita
for each row execute function public.catalogo_log_attivita();

-- 7) No hard delete: force soft-delete only
create or replace function public.catalogo_prevent_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Hard delete forbidden on %, use deleted_at/is_active instead', tg_table_name
    using errcode = '42501';
end;
$$;

revoke all on function public.catalogo_prevent_hard_delete() from public;
grant execute on function public.catalogo_prevent_hard_delete() to authenticated;

drop trigger if exists trg_catalogo_attivita_prevent_delete on public.catalogo_attivita;
create trigger trg_catalogo_attivita_prevent_delete
before delete on public.catalogo_attivita
for each row execute function public.catalogo_prevent_hard_delete();

drop trigger if exists trg_catalogo_ship_commessa_prevent_delete on public.catalogo_ship_commessa_attivita;
create trigger trg_catalogo_ship_commessa_prevent_delete
before delete on public.catalogo_ship_commessa_attivita
for each row execute function public.catalogo_prevent_hard_delete();

-- 8) Normalize commessa before write
create or replace function public.catalogo_normalize_commessa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.commessa is not null then
    new.commessa := upper(trim(new.commessa));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_catalogo_normalize_commessa on public.catalogo_ship_commessa_attivita;
create trigger trg_catalogo_normalize_commessa
before insert or update on public.catalogo_ship_commessa_attivita
for each row execute function public.catalogo_normalize_commessa();

-- 9) Harden base catalog RLS
alter table public.catalogo_attivita enable row level security;
alter table public.catalogo_ship_commessa_attivita enable row level security;

revoke all on public.catalogo_attivita from anon;
revoke all on public.catalogo_attivita from authenticated;
revoke all on public.catalogo_ship_commessa_attivita from anon;
revoke all on public.catalogo_ship_commessa_attivita from authenticated;

grant select on public.catalogo_attivita to authenticated;
grant select on public.catalogo_ship_commessa_attivita to authenticated;

drop policy if exists "catalogo_attivita_delete_admin" on public.catalogo_attivita;
drop policy if exists "catalogo_attivita_insert_admin" on public.catalogo_attivita;
drop policy if exists "catalogo_attivita_read" on public.catalogo_attivita;
drop policy if exists "catalogo_attivita_select_authenticated" on public.catalogo_attivita;
drop policy if exists "catalogo_attivita_update_admin" on public.catalogo_attivita;
drop policy if exists "catalogo_attivita_write_admin" on public.catalogo_attivita;

drop policy if exists "catalogo_ship_commessa_read" on public.catalogo_ship_commessa_attivita;
drop policy if exists "catalogo_ship_commessa_write_admin" on public.catalogo_ship_commessa_attivita;

create policy "catalogo_attivita_select_authenticated"
on public.catalogo_attivita
for select
to authenticated
using (deleted_at is null or public.is_admin());

create policy "catalogo_attivita_insert_admin"
on public.catalogo_attivita
for insert
to authenticated
with check (public.is_admin());

create policy "catalogo_attivita_update_admin"
on public.catalogo_attivita
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "catalogo_ship_commessa_select_admin"
on public.catalogo_ship_commessa_attivita
for select
to authenticated
using (public.is_admin());

create policy "catalogo_ship_commessa_insert_admin"
on public.catalogo_ship_commessa_attivita
for insert
to authenticated
with check (public.is_admin());

create policy "catalogo_ship_commessa_update_admin"
on public.catalogo_ship_commessa_attivita
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 10) Effective scoped view for CAPO/UFFICIO/MANAGER/DIREZIONE/ADMIN
create or replace view public.catalogo_scope_effective_v2 as
select
  csca.id as catalogo_item_id,
  csca.ship_id,
  s.code as ship_code,
  s.name as ship_name,
  s.costr,
  csca.commessa,
  csca.activity_id,
  ca.categoria,
  ca.descrizione,
  ca.activity_type,
  ca.unit as unit_default,
  csca.unit_override,
  coalesce(csca.unit_override, ca.unit) as unit_effective,
  csca.previsto_value,
  csca.is_active,
  csca.note,
  csca.created_at,
  csca.updated_at,
  coalesce(role_pack.role_keys, array[]::text[]) as role_keys,
  coalesce(role_pack.roles_json, '[]'::jsonb) as roles_json
from public.catalogo_ship_commessa_attivita csca
join public.catalogo_attivita ca on ca.id = csca.activity_id
join public.ships s on s.id = csca.ship_id
left join lateral (
  select
    array_agg(cr.role_key order by cr.role_key) as role_keys,
    jsonb_agg(
      jsonb_build_object(
        'id', cr.id,
        'role_key', cr.role_key,
        'label_it', cr.label_it,
        'label_fr', cr.label_fr,
        'label_en', cr.label_en
      )
      order by cr.role_key
    ) as roles_json
  from public.catalogo_attivita_roles car
  join public.catalogo_roles cr on cr.id = car.role_id
  where car.activity_id = ca.id
    and cr.deleted_at is null
    and cr.is_active = true
) as role_pack on true
where
  csca.deleted_at is null
  and ca.deleted_at is null
  and (
    public.is_admin()
    or public.is_role('UFFICIO')
    or public.is_role('MANAGER')
    or public.is_role('DIREZIONE')
    or exists (
      select 1
      from public.ship_capos sc
      where sc.ship_id = csca.ship_id
        and sc.capo_id = auth.uid()
    )
  );

grant select on public.catalogo_scope_effective_v2 to authenticated;

-- 11) Import preview/apply RPC
create or replace function public.catalogo_import_preview(
  p_kind text,
  p_scope_ship_id uuid default null,
  p_scope_commessa text default null,
  p_file_name text default null,
  p_file_size_bytes bigint default null,
  p_file_mime text default null,
  p_mapping jsonb default '{}'::jsonb,
  p_rows jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_commessa text;
  v_run_id uuid := gen_random_uuid();
  v_total int := 0;
  v_insert int := 0;
  v_update int := 0;
  v_noop int := 0;
  v_invalid int := 0;
  v_samples jsonb := '[]'::jsonb;
  v_row jsonb;
  v_idx int := 0;
  v_categoria text;
  v_descrizione text;
  v_unit text;
  v_activity_type text;
  v_prev numeric;
  v_is_active boolean;
  v_note text;
  v_unit_override text;
  v_activity_id uuid;
  v_existing record;
  v_action text;
  v_err text;
  v_role_keys jsonb;
begin
  perform public.require_admin();

  v_kind := upper(trim(coalesce(p_kind, '')));
  if v_kind not in ('GLOBAL', 'SCOPED') then
    raise exception 'Invalid kind: % (expected GLOBAL or SCOPED)', p_kind using errcode = '22023';
  end if;

  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'p_rows must be a JSON array' using errcode = '22023';
  end if;

  if v_kind = 'SCOPED' then
    if p_scope_ship_id is null then
      raise exception 'scope_ship_id is required for SCOPED import' using errcode = '22023';
    end if;
    v_commessa := upper(trim(coalesce(p_scope_commessa, '')));
    if v_commessa = '' then
      raise exception 'scope_commessa is required for SCOPED import' using errcode = '22023';
    end if;
  end if;

  insert into public.catalogo_import_runs(
    run_id, kind, scope_ship_id, scope_commessa, file_name, file_size_bytes, file_mime, mapping, status, stats, errors
  )
  values (
    v_run_id,
    v_kind,
    p_scope_ship_id,
    case when v_kind = 'SCOPED' then v_commessa else null end,
    p_file_name,
    p_file_size_bytes,
    p_file_mime,
    coalesce(p_mapping, '{}'::jsonb),
    'PREVIEW',
    '{}'::jsonb,
    '[]'::jsonb
  );

  for v_row in
    select value
    from jsonb_array_elements(p_rows)
  loop
    v_idx := v_idx + 1;
    v_total := v_total + 1;

    v_categoria := upper(trim(coalesce(v_row->>'categoria', '')));
    v_descrizione := trim(coalesce(v_row->>'descrizione', ''));
    v_unit := upper(trim(coalesce(v_row->>'unit', 'NONE')));
    v_activity_type := upper(trim(coalesce(v_row->>'activity_type', 'QUANTITATIVE')));
    v_note := nullif(trim(coalesce(v_row->>'note', '')), '');
    v_unit_override := nullif(upper(trim(coalesce(v_row->>'unit_override', ''))), '');
    v_role_keys := coalesce(v_row->'role_keys', '[]'::jsonb);

    v_prev := null;
    if coalesce(v_row->>'previsto_value', '') <> '' then
      begin
        v_prev := (v_row->>'previsto_value')::numeric;
      exception when others then
        v_prev := null;
      end;
    end if;

    v_is_active := coalesce((v_row->>'is_active')::boolean, true);
    v_err := null;
    v_action := 'invalid';
    v_activity_id := null;

    if v_categoria = '' or v_descrizione = '' then
      v_err := 'categoria/descrizione required';
    elsif v_kind = 'GLOBAL' and v_unit not in ('MT','MQ','PZ','COEFF','NONE') then
      v_err := 'invalid unit';
    elsif v_kind = 'GLOBAL' and v_activity_type not in ('QUANTITATIVE','FORFAIT','QUALITATIVE') then
      v_err := 'invalid activity_type';
    end if;

    if v_err is null then
      if v_kind = 'GLOBAL' then
        select a.id, a.previsto_value, a.activity_type::text as activity_type, a.is_active
        into v_existing
        from public.catalogo_attivita a
        where lower(trim(a.categoria)) = lower(trim(v_categoria))
          and lower(trim(a.descrizione)) = lower(trim(v_descrizione))
          and a.unit::text = v_unit
          and a.deleted_at is null
        limit 1;

        if v_existing.id is null then
          v_action := 'insert';
        elsif coalesce(v_existing.previsto_value, -99999999::numeric) <> coalesce(v_prev, -99999999::numeric)
              or coalesce(v_existing.activity_type, '') <> v_activity_type
              or coalesce(v_existing.is_active, true) <> coalesce(v_is_active, true) then
          v_action := 'update';
        else
          v_action := 'noop';
        end if;

        insert into public.catalogo_import_run_rows(run_id, row_index, action, payload, error_text)
        values (
          v_run_id,
          v_idx,
          v_action,
          jsonb_build_object(
            'categoria', v_categoria,
            'descrizione', v_descrizione,
            'unit', v_unit,
            'activity_type', v_activity_type,
            'previsto_value', v_prev,
            'is_active', v_is_active,
            'role_keys', v_role_keys
          ),
          null
        );
      else
        begin
          if coalesce(v_row->>'activity_id', '') <> '' then
            v_activity_id := (v_row->>'activity_id')::uuid;
          end if;
        exception when others then
          v_activity_id := null;
        end;

        if v_activity_id is null then
          select a.id into v_activity_id
          from public.catalogo_attivita a
          where lower(trim(a.categoria)) = lower(trim(v_categoria))
            and lower(trim(a.descrizione)) = lower(trim(v_descrizione))
            and a.unit::text = v_unit
            and a.deleted_at is null
          limit 1;
        end if;

        if v_activity_id is null then
          v_err := 'activity not found in global catalog';
        else
          select c.id, c.previsto_value, c.is_active, c.unit_override, c.note
          into v_existing
          from public.catalogo_ship_commessa_attivita c
          where c.ship_id = p_scope_ship_id
            and upper(trim(c.commessa)) = v_commessa
            and c.activity_id = v_activity_id
          limit 1;

          if v_existing.id is null then
            v_action := 'insert';
          elsif coalesce(v_existing.previsto_value, -99999999::numeric) <> coalesce(v_prev, -99999999::numeric)
              or coalesce(v_existing.is_active, true) <> coalesce(v_is_active, true)
              or coalesce(v_existing.unit_override::text, '') <> coalesce(v_unit_override, '')
              or coalesce(v_existing.note, '') <> coalesce(v_note, '') then
            v_action := 'update';
          else
            v_action := 'noop';
          end if;

          insert into public.catalogo_import_run_rows(run_id, row_index, action, payload, error_text)
          values (
            v_run_id,
            v_idx,
            v_action,
            jsonb_build_object(
              'ship_id', p_scope_ship_id,
              'commessa', v_commessa,
              'activity_id', v_activity_id,
              'previsto_value', v_prev,
              'unit_override', v_unit_override,
              'is_active', v_is_active,
              'note', v_note
            ),
            null
          );
        end if;
      end if;
    end if;

    if v_err is not null then
      v_action := 'invalid';
      insert into public.catalogo_import_run_rows(run_id, row_index, action, payload, error_text)
      values (
        v_run_id,
        v_idx,
        'invalid',
        jsonb_build_object('raw', v_row),
        v_err
      );

      if jsonb_array_length(v_samples) < 50 then
        v_samples := v_samples || jsonb_build_array(
          jsonb_build_object('row_index', v_idx, 'error', v_err)
        );
      end if;
    end if;

    if v_action = 'insert' then v_insert := v_insert + 1; end if;
    if v_action = 'update' then v_update := v_update + 1; end if;
    if v_action = 'noop' then v_noop := v_noop + 1; end if;
    if v_action = 'invalid' then v_invalid := v_invalid + 1; end if;
  end loop;

  update public.catalogo_import_runs
  set
    stats = jsonb_build_object(
      'total', v_total,
      'insert', v_insert,
      'update', v_update,
      'noop', v_noop,
      'invalid', v_invalid
    ),
    errors = v_samples
  where run_id = v_run_id;

  return jsonb_build_object(
    'ok', true,
    'run_id', v_run_id,
    'kind', v_kind,
    'counts', jsonb_build_object(
      'total', v_total,
      'insert', v_insert,
      'update', v_update,
      'noop', v_noop,
      'invalid', v_invalid
    ),
    'samples', v_samples
  );
end;
$$;

create or replace function public.catalogo_import_apply(
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.catalogo_import_runs%rowtype;
  v_row record;
  v_activity_id uuid;
  v_count_applied int := 0;
  v_count_skipped int := 0;
  v_role_key text;
  v_role_id uuid;
begin
  perform public.require_admin();

  select * into v_run
  from public.catalogo_import_runs
  where run_id = p_run_id
  for update;

  if v_run.run_id is null then
    raise exception 'Run not found: %', p_run_id using errcode = '22023';
  end if;

  if v_run.status = 'APPLIED' then
    return jsonb_build_object(
      'ok', true,
      'run_id', p_run_id,
      'status', 'APPLIED',
      'message', 'already applied'
    );
  end if;

  for v_row in
    select *
    from public.catalogo_import_run_rows r
    where r.run_id = p_run_id
    order by r.row_index asc
  loop
    if v_row.action not in ('insert','update') then
      v_count_skipped := v_count_skipped + 1;
      continue;
    end if;

    if v_run.kind = 'GLOBAL' then
      select a.id into v_activity_id
      from public.catalogo_attivita a
      where lower(trim(a.categoria)) = lower(trim(v_row.payload->>'categoria'))
        and lower(trim(a.descrizione)) = lower(trim(v_row.payload->>'descrizione'))
        and a.unit::text = (v_row.payload->>'unit')
      limit 1;

      if v_activity_id is null then
        insert into public.catalogo_attivita(
          categoria,
          descrizione,
          activity_type,
          unit,
          previsto_value,
          is_active,
          deleted_at
        )
        values (
          v_row.payload->>'categoria',
          v_row.payload->>'descrizione',
          (v_row.payload->>'activity_type')::public.activity_type,
          (v_row.payload->>'unit')::public.activity_unit,
          (v_row.payload->>'previsto_value')::numeric,
          coalesce((v_row.payload->>'is_active')::boolean, true),
          null
        )
        returning id into v_activity_id;
      else
        update public.catalogo_attivita
        set
          activity_type = (v_row.payload->>'activity_type')::public.activity_type,
          previsto_value = (v_row.payload->>'previsto_value')::numeric,
          is_active = coalesce((v_row.payload->>'is_active')::boolean, true),
          deleted_at = null,
          updated_at = now()
        where id = v_activity_id;
      end if;

      delete from public.catalogo_attivita_roles where activity_id = v_activity_id;
      if jsonb_typeof(v_row.payload->'role_keys') = 'array' then
        for v_role_key in
          select trim(value::text, '"')
          from jsonb_array_elements(v_row.payload->'role_keys')
        loop
          select r.id into v_role_id
          from public.catalogo_roles r
          where lower(trim(r.role_key)) = lower(trim(v_role_key))
            and r.deleted_at is null
          limit 1;

          if v_role_id is not null then
            insert into public.catalogo_attivita_roles(activity_id, role_id)
            values (v_activity_id, v_role_id)
            on conflict do nothing;
          end if;
        end loop;
      end if;
    else
      insert into public.catalogo_ship_commessa_attivita(
        ship_id,
        commessa,
        activity_id,
        previsto_value,
        unit_override,
        is_active,
        note,
        deleted_at
      )
      values (
        (v_row.payload->>'ship_id')::uuid,
        upper(trim(v_row.payload->>'commessa')),
        (v_row.payload->>'activity_id')::uuid,
        (v_row.payload->>'previsto_value')::numeric,
        case when coalesce(v_row.payload->>'unit_override', '') = '' then null else (v_row.payload->>'unit_override')::public.activity_unit end,
        coalesce((v_row.payload->>'is_active')::boolean, true),
        nullif(v_row.payload->>'note', ''),
        null
      )
      on conflict (ship_id, commessa, activity_id)
      do update set
        previsto_value = excluded.previsto_value,
        unit_override = excluded.unit_override,
        is_active = excluded.is_active,
        note = excluded.note,
        deleted_at = null,
        updated_at = now();
    end if;

    v_count_applied := v_count_applied + 1;
  end loop;

  update public.catalogo_import_runs
  set
    status = 'APPLIED',
    applied_at = now(),
    stats = coalesce(stats, '{}'::jsonb) || jsonb_build_object(
      'applied', v_count_applied,
      'skipped', v_count_skipped
    )
  where run_id = p_run_id;

  return jsonb_build_object(
    'ok', true,
    'run_id', p_run_id,
    'status', 'APPLIED',
    'applied', v_count_applied,
    'skipped', v_count_skipped
  );
exception
  when others then
    update public.catalogo_import_runs
    set status = 'FAILED'
    where run_id = p_run_id;
    raise;
end;
$$;

revoke all on function public.catalogo_import_preview(text, uuid, text, text, bigint, text, jsonb, jsonb) from public;
grant execute on function public.catalogo_import_preview(text, uuid, text, text, bigint, text, jsonb, jsonb) to authenticated;

revoke all on function public.catalogo_import_apply(uuid) from public;
grant execute on function public.catalogo_import_apply(uuid) to authenticated;

commit;

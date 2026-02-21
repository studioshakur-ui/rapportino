-- supabase/migrations/20260221193000_ufficio_capo_delegation_v1.sql
-- CNCS: UFFICIO delegation to manage rapportini for some CAPO (ship-scoped, audit-defensible by date)

begin;

------------------------------------------------------------
-- 0) Preconditions (fail fast, no guessing)
------------------------------------------------------------
do $$
begin
  -- must exist (your DB has it)
  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='rapportini'
  ) then
    raise exception 'Missing table public.rapportini';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='capo_ship_assignments'
  ) then
    raise exception 'Missing table public.capo_ship_assignments';
  end if;

  -- must have capo_id + data in rapportini (your DB does)
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='rapportini' and column_name='capo_id'
  ) then
    raise exception 'public.rapportini.capo_id is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='rapportini' and column_name='data'
  ) then
    raise exception 'public.rapportini.data is missing';
  end if;

  -- capo_ship_assignments must have (capo_id, ship_id, plan_date)
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='capo_ship_assignments' and column_name='capo_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='capo_ship_assignments' and column_name='ship_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='capo_ship_assignments' and column_name='plan_date'
  ) then
    raise exception 'public.capo_ship_assignments must have (capo_id, ship_id, plan_date)';
  end if;
end $$;

------------------------------------------------------------
-- 1) Table: public.ufficio_capo_scopes (ship-scoped)
-- NOTE: NO FK on ship_id on purpose (ships_norm_v1 is a view in your stack)
------------------------------------------------------------
create table if not exists public.ufficio_capo_scopes (
  id uuid primary key default gen_random_uuid(),

  ufficio_id uuid not null references public.profiles(id) on delete cascade,
  capo_id uuid not null references public.profiles(id) on delete cascade,
  ship_id uuid not null,

  active boolean not null default true,

  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists ufficio_capo_scopes_unique
  on public.ufficio_capo_scopes (ufficio_id, capo_id, ship_id);

create index if not exists ufficio_capo_scopes_ufficio_active_idx
  on public.ufficio_capo_scopes (ufficio_id, active);

create index if not exists ufficio_capo_scopes_capo_active_idx
  on public.ufficio_capo_scopes (capo_id, active);

create index if not exists ufficio_capo_scopes_ship_active_idx
  on public.ufficio_capo_scopes (ship_id, active);

alter table public.ufficio_capo_scopes enable row level security;

------------------------------------------------------------
-- 2) Alter public.rapportini: add delegation fields
------------------------------------------------------------
alter table public.rapportini
  add column if not exists created_by uuid;

alter table public.rapportini
  add column if not exists acting_for_capo_id uuid;

alter table public.rapportini
  add column if not exists last_edited_by uuid;

-- Backfill created_by deterministically (NO guessing, uses existing columns)
update public.rapportini
set created_by = coalesce(created_by, user_id, capo_id)
where created_by is null;

do $$
begin
  if exists (select 1 from public.rapportini where created_by is null) then
    raise exception 'Backfill failed: some public.rapportini.created_by still NULL (need repair rows with NULL user_id+capo_id)';
  end if;
end $$;

alter table public.rapportini
  alter column created_by set not null;

create index if not exists rapportini_created_by_idx
  on public.rapportini (created_by);

create index if not exists rapportini_acting_for_capo_id_idx
  on public.rapportini (acting_for_capo_id);

------------------------------------------------------------
-- 3) RLS on public.rapportini
------------------------------------------------------------
alter table public.rapportini enable row level security;

-- Clean previous versions if any (idempotent migration behavior)
drop policy if exists rapportini_select_capo on public.rapportini;
drop policy if exists rapportini_select_ufficio_scope on public.rapportini;
drop policy if exists rapportini_insert_capo on public.rapportini;
drop policy if exists rapportini_insert_ufficio_scope on public.rapportini;
drop policy if exists rapportini_update_capo on public.rapportini;
drop policy if exists rapportini_update_ufficio_scope on public.rapportini;

-- CAPO: read own reports
create policy rapportini_select_capo
on public.rapportini
for select
using (capo_id = auth.uid());

-- UFFICIO: read delegated reports if:
-- - scope active for (ufficio, capo, ship)
-- - capo is assigned to that ship on the SAME day as rapportini.data (CNCS audit-defensible)
create policy rapportini_select_ufficio_scope
on public.rapportini
for select
using (
  exists (
    select 1
    from public.ufficio_capo_scopes s
    join public.capo_ship_assignments csa
      on csa.capo_id = rapportini.capo_id
     and csa.ship_id = s.ship_id
     and csa.plan_date = rapportini.data
    where s.ufficio_id = auth.uid()
      and s.capo_id = rapportini.capo_id
      and s.active = true
  )
);

-- CAPO: can insert only for self
create policy rapportini_insert_capo
on public.rapportini
for insert
with check (
  capo_id = auth.uid()
  and acting_for_capo_id is null
);

-- UFFICIO: can insert only if delegated (acting_for_capo_id = capo_id) and scope+assignment match date
create policy rapportini_insert_ufficio_scope
on public.rapportini
for insert
with check (
  acting_for_capo_id is not null
  and acting_for_capo_id = capo_id
  and exists (
    select 1
    from public.ufficio_capo_scopes s
    join public.capo_ship_assignments csa
      on csa.capo_id = rapportini.capo_id
     and csa.ship_id = s.ship_id
     and csa.plan_date = rapportini.data
    where s.ufficio_id = auth.uid()
      and s.capo_id = rapportini.capo_id
      and s.active = true
  )
);

-- CAPO: update own reports only while DRAFT
create policy rapportini_update_capo
on public.rapportini
for update
using (capo_id = auth.uid() and status = 'DRAFT')
with check (capo_id = auth.uid() and status = 'DRAFT');

-- UFFICIO: update delegated reports only while DRAFT and scope+assignment match date
create policy rapportini_update_ufficio_scope
on public.rapportini
for update
using (
  status = 'DRAFT'
  and exists (
    select 1
    from public.ufficio_capo_scopes s
    join public.capo_ship_assignments csa
      on csa.capo_id = rapportini.capo_id
     and csa.ship_id = s.ship_id
     and csa.plan_date = rapportini.data
    where s.ufficio_id = auth.uid()
      and s.capo_id = rapportini.capo_id
      and s.active = true
  )
)
with check (status = 'DRAFT');

------------------------------------------------------------
-- 4) RLS on public.ufficio_capo_scopes (manage by ADMIN/MANAGER only)
------------------------------------------------------------
drop policy if exists ufficio_capo_scopes_manage_admin_manager on public.ufficio_capo_scopes;
drop policy if exists ufficio_capo_scopes_read_self on public.ufficio_capo_scopes;

-- Admin/Manager: full manage
create policy ufficio_capo_scopes_manage_admin_manager
on public.ufficio_capo_scopes
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.app_role in ('ADMIN','MANAGER')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.app_role in ('ADMIN','MANAGER')
  )
);

-- UFFICIO can read his own scopes (useful for UI dropdown), but cannot write
create policy ufficio_capo_scopes_read_self
on public.ufficio_capo_scopes
for select
using (ufficio_id = auth.uid());

commit;
-- supabase/migrations/20260222194000_cncs_ufficio_scope_s2_capo_costr.sql
-- CNCS — UFFICIO acting-for delegation (S2)
-- Scope = (ufficio_id, capo_id, costr)
-- Industrial-grade hardening:
-- - Remove any global UFFICIO access to rapportini
-- - CAPO can update ONLY DRAFT
-- - UFFICIO can SELECT/INSERT/UPDATE ONLY within scope AND ONLY DRAFT (for updates)
-- - Acting-for must be explicit + fully auditable

begin;

------------------------------------------------------------
-- 0) Preconditions
------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='rapportini'
  ) then
    raise exception 'Missing public.rapportini';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='ufficio_capo_scopes'
  ) then
    raise exception 'Missing public.ufficio_capo_scopes (apply delegation baseline migration first)';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='profiles'
  ) then
    raise exception 'Missing public.profiles';
  end if;
end $$;

alter table public.rapportini enable row level security;
alter table public.ufficio_capo_scopes enable row level security;

------------------------------------------------------------
-- 1) rapportini — ensure audit columns exist
------------------------------------------------------------
alter table public.rapportini
  add column if not exists created_by uuid;

alter table public.rapportini
  add column if not exists acting_for_capo_id uuid;

alter table public.rapportini
  add column if not exists last_edited_by uuid;

-- Backfill created_by safely for legacy rows
update public.rapportini
set created_by = coalesce(created_by, user_id, capo_id)
where created_by is null;

do $$
begin
  if exists (select 1 from public.rapportini where created_by is null) then
    raise exception 'Backfill failed: rapportini.created_by still NULL for some rows';
  end if;
end $$;

alter table public.rapportini
  alter column created_by set not null;

------------------------------------------------------------
-- 2) ufficio_capo_scopes — add costr for S2
------------------------------------------------------------
alter table public.ufficio_capo_scopes
  add column if not exists costr text;

-- If ship_id exists and ships table exists, backfill costr from ships.code
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='ufficio_capo_scopes'
      and column_name='ship_id'
  ) and exists (
    select 1
    from information_schema.tables
    where table_schema='public' and table_name='ships'
  ) then
    -- Backfill only when costr is missing
    update public.ufficio_capo_scopes s
    set costr = sh.code
    from public.ships sh
    where s.costr is null
      and s.ship_id is not null
      and sh.id = s.ship_id;
  end if;
end $$;

-- Enforce S2: costr must be present (fail fast if not)
do $$
begin
  if exists (select 1 from public.ufficio_capo_scopes where costr is null) then
    raise exception 'CNCS S2 requires ufficio_capo_scopes.costr NOT NULL. Backfill missing costr then re-run.';
  end if;
end $$;

alter table public.ufficio_capo_scopes
  alter column costr set not null;

-- Unique scope key for S2
drop index if exists public.ufficio_scope_unique;
drop index if exists public.ufficio_capo_scopes_unique;

create unique index if not exists ufficio_capo_scopes_ufficio_capo_costr_unique
  on public.ufficio_capo_scopes (ufficio_id, capo_id, costr);

------------------------------------------------------------
-- 3) rapportini — DROP dangerous / redundant policies
------------------------------------------------------------
-- Global UFFICIO access (must go)
drop policy if exists rapportini_select_ufficio on public.rapportini;
drop policy if exists rapportini_update_ufficio on public.rapportini;
drop policy if exists rapportini_ufficio_select on public.rapportini;
drop policy if exists rapportini_ufficio_update on public.rapportini;

-- Old scope policies (ship/date-based) — replaced by S2
drop policy if exists rapportini_select_ufficio_scope on public.rapportini;
drop policy if exists rapportini_insert_ufficio_scope on public.rapportini;
drop policy if exists rapportini_update_ufficio_scope on public.rapportini;

-- CAPO duplicates (we recreate canon)
drop policy if exists "capo can insert rapportini" on public.rapportini;
drop policy if exists capo_insert_rapportini_own on public.rapportini;
drop policy if exists rapportini_capo_insert on public.rapportini;
drop policy if exists rapportini_insert_capo on public.rapportini;
drop policy if exists capo_select_rapportini_own on public.rapportini;
drop policy if exists rapportini_select_capo on public.rapportini;
drop policy if exists capo_update_rapportini_own on public.rapportini;
drop policy if exists "capo can update rapportini" on public.rapportini;
drop policy if exists rapportini_capo_update on public.rapportini;
drop policy if exists rapportini_update_capo on public.rapportini;

-- Audit hardening: CAPO must not delete rapportini
drop policy if exists capo_delete_rapportini_own on public.rapportini;

------------------------------------------------------------
-- 3B) SAFETY — drop canonical policies we (re)create below
-- Postgres has no CREATE POLICY IF NOT EXISTS, so make this migration idempotent.
------------------------------------------------------------
drop policy if exists rapportini_select_capo_own on public.rapportini;
drop policy if exists rapportini_insert_capo_own on public.rapportini;
drop policy if exists rapportini_update_capo_own_draft on public.rapportini;
drop policy if exists rapportini_select_ufficio_scoped_s2 on public.rapportini;
drop policy if exists rapportini_insert_ufficio_scoped_s2 on public.rapportini;
drop policy if exists rapportini_update_ufficio_scoped_s2_draft on public.rapportini;

drop policy if exists ufficio_capo_scopes_manage_admin_manager on public.ufficio_capo_scopes;
drop policy if exists ufficio_capo_scopes_read_self on public.ufficio_capo_scopes;

------------------------------------------------------------
-- 4) rapportini — CANONICAL S2 policies (authenticated only)
------------------------------------------------------------

-- CAPO: select own
create policy rapportini_select_capo_own
on public.rapportini
for select
to authenticated
using (capo_id = auth.uid());

-- CAPO: insert own (no delegation)
create policy rapportini_insert_capo_own
on public.rapportini
for insert
to authenticated
with check (
  capo_id = auth.uid()
  and acting_for_capo_id is null
  and created_by = auth.uid()
);

-- CAPO: update own DRAFT only
create policy rapportini_update_capo_own_draft
on public.rapportini
for update
to authenticated
using (
  capo_id = auth.uid()
  and status = 'DRAFT'
)
with check (
  capo_id = auth.uid()
  and status = 'DRAFT'
);

-- UFFICIO: select within S2 scope
create policy rapportini_select_ufficio_scoped_s2
on public.rapportini
for select
to authenticated
using (
  exists (
    select 1
    from public.ufficio_capo_scopes s
    where s.ufficio_id = auth.uid()
      and s.capo_id = rapportini.capo_id
      and s.costr = rapportini.costr
      and s.active = true
  )
);

-- UFFICIO: insert within scope, explicit acting-for + audit fields
create policy rapportini_insert_ufficio_scoped_s2
on public.rapportini
for insert
to authenticated
with check (
  acting_for_capo_id is not null
  and acting_for_capo_id = capo_id
  and created_by = auth.uid()
  and exists (
    select 1
    from public.ufficio_capo_scopes s
    where s.ufficio_id = auth.uid()
      and s.capo_id = rapportini.capo_id
      and s.costr = rapportini.costr
      and s.active = true
  )
);

-- UFFICIO: update within scope, DRAFT only
create policy rapportini_update_ufficio_scoped_s2_draft
on public.rapportini
for update
to authenticated
using (
  status = 'DRAFT'
  and exists (
    select 1
    from public.ufficio_capo_scopes s
    where s.ufficio_id = auth.uid()
      and s.capo_id = rapportini.capo_id
      and s.costr = rapportini.costr
      and s.active = true
  )
)
with check (status = 'DRAFT');

------------------------------------------------------------
-- 5) ufficio_capo_scopes — harden policies (authenticated only)
------------------------------------------------------------
create policy ufficio_capo_scopes_manage_admin_manager
on public.ufficio_capo_scopes
for all
to authenticated
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

create policy ufficio_capo_scopes_read_self
on public.ufficio_capo_scopes
for select
to authenticated
using (ufficio_id = auth.uid());

------------------------------------------------------------
-- 6) Privileges — reduce blast radius (RLS is the real gate)
------------------------------------------------------------
revoke all on table public.rapportini from anon;
revoke all on table public.ufficio_capo_scopes from anon;

commit;
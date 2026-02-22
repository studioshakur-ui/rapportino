begin;

------------------------------------------------------------
-- 0) Preconditions: table exists + RLS on
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
    raise exception 'Missing public.ufficio_capo_scopes (apply delegation migration first)';
  end if;
end $$;

alter table public.rapportini enable row level security;
alter table public.ufficio_capo_scopes enable row level security;

------------------------------------------------------------
-- 1) Ensure delegation columns exist + backfill
------------------------------------------------------------
alter table public.rapportini
  add column if not exists created_by uuid;

alter table public.rapportini
  add column if not exists acting_for_capo_id uuid;

alter table public.rapportini
  add column if not exists last_edited_by uuid;

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
-- 2) DROP dangerous / redundant policies on rapportini
--    (We keep MANAGER/DIREZIONE selects if you already rely on them.)
------------------------------------------------------------

-- UFFICIO global access (MUST GO)
drop policy if exists rapportini_select_ufficio on public.rapportini;
drop policy if exists rapportini_update_ufficio on public.rapportini;
drop policy if exists rapportini_ufficio_select on public.rapportini;
drop policy if exists rapportini_ufficio_update on public.rapportini;

-- Redundant CAPO inserts/updates (we will recreate canon)
drop policy if exists "capo can insert rapportini" on public.rapportini;
drop policy if exists capo_insert_rapportini_own on public.rapportini;
drop policy if exists rapportini_capo_insert on public.rapportini;
drop policy if exists rapportini_insert_capo on public.rapportini;

drop policy if exists capo_update_rapportini_own on public.rapportini;
drop policy if exists "capo can update rapportini" on public.rapportini;
drop policy if exists rapportini_capo_update on public.rapportini;
drop policy if exists rapportini_update_capo on public.rapportini;

-- Delete by CAPO (audit hardening)
drop policy if exists capo_delete_rapportini_own on public.rapportini;

-- Old scope-based ones (we replace with canonical)
drop policy if exists rapportini_select_ufficio_scope on public.rapportini;
drop policy if exists rapportini_insert_ufficio_scope on public.rapportini;
drop policy if exists rapportini_update_ufficio_scope on public.rapportini;

-- Capo select duplicates (we keep one canonical)
drop policy if exists capo_select_rapportini_own on public.rapportini;
drop policy if exists rapportini_select_capo on public.rapportini;

------------------------------------------------------------
-- 3) CANONICAL POLICIES (CNCS-grade)
--    - CAPO: own select + insert + update DRAFT only
--    - UFFICIO: scoped select + insert + update DRAFT only (acting-for)
------------------------------------------------------------

-- CAPO SELECT own
create policy rapportini_select_capo_own
on public.rapportini
for select
to authenticated
using (capo_id = auth.uid());

-- CAPO INSERT own (not acting-for)
create policy rapportini_insert_capo_own
on public.rapportini
for insert
to authenticated
with check (
  capo_id = auth.uid()
  and acting_for_capo_id is null
  and created_by = auth.uid()
);

-- CAPO UPDATE own DRAFT only
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

-- UFFICIO SELECT scoped
create policy rapportini_select_ufficio_scoped
on public.rapportini
for select
to authenticated
using (
  exists (
    select 1
    from public.ufficio_capo_scopes s
    where s.ufficio_id = auth.uid()
      and s.capo_id = rapportini.capo_id
      and s.active = true
  )
);

-- UFFICIO INSERT scoped acting-for (must be explicit + traceable)
create policy rapportini_insert_ufficio_scoped
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
      and s.active = true
  )
);

-- UFFICIO UPDATE scoped DRAFT only (audit-safe)
create policy rapportini_update_ufficio_scoped_draft
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
      and s.active = true
  )
)
with check (status = 'DRAFT');

------------------------------------------------------------
-- 4) ufficio_capo_scopes policies hardening
--    Keep: manage by ADMIN/MANAGER, read own by UFFICIO
--    BUT restrict to authenticated (not public)
------------------------------------------------------------
drop policy if exists ufficio_capo_scopes_manage_admin_manager on public.ufficio_capo_scopes;
drop policy if exists ufficio_capo_scopes_read_self on public.ufficio_capo_scopes;

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
-- 5) Optional but strongly recommended: revoke anon privileges
--    (RLS already blocks, but this reduces blast radius)
------------------------------------------------------------
revoke all on table public.rapportini from anon;
revoke all on table public.ufficio_capo_scopes from anon;
-- NOTE: do NOT revoke on capo_ship_assignments here unless you confirm API needs it.

commit;
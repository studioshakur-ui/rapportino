-- supabase/migrations/20260222190000_navemaster_scope_capo_b2.sql
-- 20260222190000_navemaster_scope_capo_b2.sql
-- NAVEMASTER — Scope read for CAPO (B2)
--
-- Goal
-- - Enforce ship-scope for NAVEMASTER reads.
-- - CAPO: read-only, limited to ships in his scope (ship_capos OR today's capo_ship_assignments).
-- - UFFICIO / ADMIN / DIREZIONE / MANAGER: read (and existing write rules remain managed by navemaster_can_manage()).
--
-- Notes
-- - We tighten legacy permissive policies (USING true).
-- - We enable RLS on navemaster_inca_alerts + navemaster_inca_diff (previously rowsecurity=false in baseline).
-- - We also provide a scoped ships view for the NAVEMASTER UI.

begin;

-- 1) Helper: is role in set
create or replace function public.navemaster_role_in(p_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = any (p_roles)
  );
$$;

-- 2) CAPO scope predicate (ship-level)
create or replace function public.navemaster_can_read_ship(p_ship_id uuid)
returns boolean
language sql
stable
as $$
  -- Wide read roles
  select
    public.navemaster_role_in(array['ADMIN','UFFICIO','DIREZIONE','MANAGER'])
    OR
    -- CAPO scope (permanent mapping)
    exists (
      select 1
      from public.ship_capos sc
      where sc.ship_id = p_ship_id
        and sc.capo_id = auth.uid()
        -- baseline: ship_capos has no is_active flag; presence of the row is the scope
    )
    OR
    -- CAPO scope (today's assignment)
    exists (
      select 1
      from public.capo_ship_assignments a
      where a.ship_id = p_ship_id
        and a.capo_id = auth.uid()
        and a.plan_date = current_date
    );
$$;

comment on function public.navemaster_can_read_ship(uuid)
is 'Returns true if current user can READ NAVEMASTER data for the given ship (ADMIN/UFFICIO/DIREZIONE/MANAGER or CAPO in scope).';

-- 3) Scoped ships view for NAVEMASTER UI (prevents showing ships outside scope)
-- NOTE: ships might have RLS disabled; this view guarantees UI filtering.
create or replace view public.navemaster_ships_scope_v1 as
select
  s.*
from public.ships s
where public.navemaster_can_read_ship(s.id);

comment on view public.navemaster_ships_scope_v1
is 'Ships visible in NAVEMASTER UI (scoped by navemaster_can_read_ship).';

-- 4) Tighten policies (legacy v1)

-- 4.1 navemaster_imports
alter table public.navemaster_imports enable row level security;

drop policy if exists navemaster_imports_read on public.navemaster_imports;
create policy navemaster_imports_read
on public.navemaster_imports
for select
to authenticated
using (public.navemaster_can_read_ship(ship_id));

-- write stays managed by navemaster_can_manage() (already defined in baseline)

-- 4.2 navemaster_rows (ship_id via navemaster_imports)
alter table public.navemaster_rows enable row level security;

drop policy if exists navemaster_rows_read on public.navemaster_rows;
create policy navemaster_rows_read
on public.navemaster_rows
for select
to authenticated
using (
  exists (
    select 1
    from public.navemaster_imports i
    where i.id = navemaster_rows.navemaster_import_id
      and public.navemaster_can_read_ship(i.ship_id)
  )
);

-- write stays managed by navemaster_can_manage() (already defined in baseline)

-- 4.3 navemaster_inca_alerts (enable RLS + scoped read)
alter table public.navemaster_inca_alerts enable row level security;

drop policy if exists navemaster_inca_alerts_read on public.navemaster_inca_alerts;
create policy navemaster_inca_alerts_read
on public.navemaster_inca_alerts
for select
to authenticated
using (public.navemaster_can_read_ship(ship_id));

drop policy if exists navemaster_inca_alerts_write on public.navemaster_inca_alerts;
create policy navemaster_inca_alerts_write
on public.navemaster_inca_alerts
for all
to authenticated
using (public.navemaster_can_manage())
with check (public.navemaster_can_manage());

-- 4.4 navemaster_inca_diff (enable RLS + scoped read)
alter table public.navemaster_inca_diff enable row level security;

drop policy if exists navemaster_inca_diff_read on public.navemaster_inca_diff;
create policy navemaster_inca_diff_read
on public.navemaster_inca_diff
for select
to authenticated
using (public.navemaster_can_read_ship(ship_id));

drop policy if exists navemaster_inca_diff_write on public.navemaster_inca_diff;
create policy navemaster_inca_diff_write
on public.navemaster_inca_diff
for all
to authenticated
using (public.navemaster_can_manage())
with check (public.navemaster_can_manage());

commit;
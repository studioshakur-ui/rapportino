-- supabase/migrations/20260110210000_fix_capo_ship_attendance_rls.sql
--
-- Fix: CAPO cannot upsert into public.capo_ship_attendance
-- ("new row violates row-level security policy for table capo_ship_attendance").
--
-- Strategy:
-- - Validate write authorization via a SECURITY DEFINER function owned by postgres.
-- - Rebuild INSERT/UPDATE policies on capo_ship_attendance to rely on that function.
-- - Add a CAPO SELECT policy for completeness/diagnostics.

begin;

-- Ensure RLS is enabled (idempotent).
alter table if exists public.capo_ship_attendance enable row level security;

-- Helper: can the current CAPO write attendance for (plan_date, ship_id, capo_id)?
-- Notes:
-- - SECURITY DEFINER + postgres owner ensures this check is not affected by RLS on capo_ship_assignments.
-- - We still require capo_id = auth.uid() so a CAPO can only write for himself.
create or replace function public.capo_can_write_ship_attendance(
  p_plan_date date,
  p_ship_id uuid,
  p_capo_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
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

-- Helper: can the current CAPO write any ship-scoped rows for (plan_date, ship_id)?
-- Used for operator_ship_attendance policies (table does not have capo_id column).
create or replace function public.capo_can_write_assigned_ship(
  p_plan_date date,
  p_ship_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
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

alter function public.capo_can_write_assigned_ship(date, uuid) owner to postgres;

revoke all on function public.capo_can_write_assigned_ship(date, uuid) from public;
grant execute on function public.capo_can_write_assigned_ship(date, uuid) to authenticated;
grant execute on function public.capo_can_write_assigned_ship(date, uuid) to service_role;

alter function public.capo_can_write_ship_attendance(date, uuid, uuid) owner to postgres;

revoke all on function public.capo_can_write_ship_attendance(date, uuid, uuid) from public;
grant execute on function public.capo_can_write_ship_attendance(date, uuid, uuid) to authenticated;
grant execute on function public.capo_can_write_ship_attendance(date, uuid, uuid) to service_role;

-- Rebuild policies (idempotent).
drop policy if exists capo_insert_own_ship_attendance on public.capo_ship_attendance;
create policy capo_insert_own_ship_attendance
on public.capo_ship_attendance
as permissive
for insert
to authenticated
with check (
  public.capo_can_write_ship_attendance(plan_date, ship_id, capo_id)
);

drop policy if exists capo_update_own_ship_attendance on public.capo_ship_attendance;
create policy capo_update_own_ship_attendance
on public.capo_ship_attendance
as permissive
for update
to authenticated
using (
  public.capo_can_write_ship_attendance(plan_date, ship_id, capo_id)
)
with check (
  public.capo_can_write_ship_attendance(plan_date, ship_id, capo_id)
);

-- Optional but useful: CAPO can read his own attendance rows.
drop policy if exists capo_select_own_ship_attendance on public.capo_ship_attendance;
create policy capo_select_own_ship_attendance
on public.capo_ship_attendance
as permissive
for select
to authenticated
using (
  capo_id = auth.uid()
);

-- Harden operator_ship_attendance policies (same authorization concept: CAPO must be assigned to ship/day).
alter table if exists public.operator_ship_attendance enable row level security;

drop policy if exists capo_insert_operator_attendance_for_assigned_ship on public.operator_ship_attendance;
create policy capo_insert_operator_attendance_for_assigned_ship
on public.operator_ship_attendance
as permissive
for insert
to authenticated
with check (
  public.capo_can_write_assigned_ship(plan_date, ship_id)
);

drop policy if exists capo_update_operator_attendance_for_assigned_ship on public.operator_ship_attendance;
create policy capo_update_operator_attendance_for_assigned_ship
on public.operator_ship_attendance
as permissive
for update
to authenticated
using (
  public.capo_can_write_assigned_ship(plan_date, ship_id)
)
with check (
  public.capo_can_write_assigned_ship(plan_date, ship_id)
);

commit;

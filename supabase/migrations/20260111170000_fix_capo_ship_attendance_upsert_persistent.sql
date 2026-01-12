begin;

alter table public.capo_ship_attendance enable row level security;

-- Drop the legacy policies that conflict with persistent ship assignment
drop policy if exists capo_insert_own_ship_attendance on public.capo_ship_attendance;
drop policy if exists capo_select_own_ship_attendance on public.capo_ship_attendance;
drop policy if exists capo_update_own_ship_attendance on public.capo_ship_attendance;

-- Recreate stable policies: perimeter = ship_capos (persistent assignment)

create policy capo_select_own_ship_attendance
on public.capo_ship_attendance
as permissive
for select
to authenticated
using (capo_id = auth.uid());

create policy capo_insert_own_ship_attendance
on public.capo_ship_attendance
as permissive
for insert
to authenticated
with check (
  capo_id = auth.uid()
  and exists (
    select 1
    from public.ship_capos sc
    where sc.ship_id = capo_ship_attendance.ship_id
      and sc.capo_id = auth.uid()
  )
);

create policy capo_update_own_ship_attendance
on public.capo_ship_attendance
as permissive
for update
to authenticated
using (
  capo_id = auth.uid()
  and exists (
    select 1
    from public.ship_capos sc
    where sc.ship_id = capo_ship_attendance.ship_id
      and sc.capo_id = auth.uid()
  )
)
with check (
  capo_id = auth.uid()
  and exists (
    select 1
    from public.ship_capos sc
    where sc.ship_id = capo_ship_attendance.ship_id
      and sc.capo_id = auth.uid()
  )
);

commit;

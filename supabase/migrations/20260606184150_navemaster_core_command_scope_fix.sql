begin;

create or replace function public.navemaster_can_manage()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.core_command_is_owner()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.app_role in ('ADMIN', 'DIREZIONE', 'UFFICIO', 'MANAGER')
    );
$$;

comment on function public.navemaster_can_manage()
is 'CORE COMMAND owner or legacy office/admin roles can manage Navemaster imports.';

revoke all on function public.navemaster_can_manage() from public;
grant execute on function public.navemaster_can_manage() to authenticated;
grant execute on function public.navemaster_can_manage() to service_role;

create or replace function public.navemaster_can_read_ship(p_ship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.core_command_is_owner()
    or public.navemaster_can_manage()
    or exists (
      select 1
      from public.ship_capos sc
      where sc.ship_id = p_ship_id
        and sc.capo_id = auth.uid()
    );
$$;

comment on function public.navemaster_can_read_ship(uuid)
is 'CORE COMMAND owner, legacy office/admin roles, or scoped CAPO can read Navemaster data for a ship.';

revoke all on function public.navemaster_can_read_ship(uuid) from public;
grant execute on function public.navemaster_can_read_ship(uuid) to authenticated;
grant execute on function public.navemaster_can_read_ship(uuid) to service_role;

create or replace view public.navemaster_ships_scope_v1 as
select s.*
from public.ships s
where public.navemaster_can_read_ship(s.id);

comment on view public.navemaster_ships_scope_v1
is 'Ships visible in Navemaster after CORE COMMAND scope simplification.';

drop policy if exists navemaster_imports_read on public.navemaster_imports;
create policy navemaster_imports_read
on public.navemaster_imports
for select
to authenticated
using (public.navemaster_can_read_ship(ship_id));

drop policy if exists navemaster_imports_write on public.navemaster_imports;
create policy navemaster_imports_write
on public.navemaster_imports
for all
to authenticated
using (public.navemaster_can_manage())
with check (public.navemaster_can_manage());

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

drop policy if exists navemaster_rows_write on public.navemaster_rows;
create policy navemaster_rows_write
on public.navemaster_rows
for all
to authenticated
using (public.navemaster_can_manage())
with check (public.navemaster_can_manage());

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

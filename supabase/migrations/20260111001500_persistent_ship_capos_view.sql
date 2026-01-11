-- Persistent ship -> capo assignments
-- Canonical rule: Manager assigns ships to capi in a PERENNE way via public.ship_capos.
-- The CAPO app stays compatible by reading public.capo_today_ship_assignments_v1,
-- whose plan_date is forced to CURRENT_DATE.

create or replace view public.capo_today_ship_assignments_v1 as
select
  current_date as plan_date,
  sc.ship_id,
  s.costr,
  s.commessa,
  s.code as ship_code,
  s.name as ship_name,
  (row_number() over (partition by sc.capo_id order by sc.created_at, sc.ship_id))::smallint as position
from public.ship_capos sc
join public.ships s on s.id = sc.ship_id
where sc.capo_id = auth.uid();

grant select on public.capo_today_ship_assignments_v1 to anon, authenticated, service_role;

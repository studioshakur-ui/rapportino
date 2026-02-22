-- Admin planning overview v2: add human-readable labels for manager/capo/operator
create or replace view "public"."admin_planning_overview_v2" as
select
  p.id as plan_id,
  p.manager_id,
  pm.display_name as manager_display_name,
  pm.full_name as manager_full_name,
  pm.email as manager_email,
  p.period_type,
  p.plan_date,
  p.year_iso,
  p.week_iso,
  p.status,
  p.created_at,
  p.updated_at,
  s.id as slot_id,
  s.capo_id,
  pc.display_name as capo_display_name,
  pc.full_name as capo_full_name,
  pc.email as capo_email,
  s."position" as capo_position,
  m.operator_id,
  o.name as operator_name,
  o.cognome as operator_cognome,
  o.nome as operator_nome,
  m."position" as operator_position
from public.manager_plans p
join public.plan_capo_slots s on s.plan_id = p.id
left join public.plan_slot_members m on m.slot_id = s.id
left join public.profiles pm on pm.id = p.manager_id
left join public.profiles pc on pc.id = s.capo_id
left join public.operators o on o.id = m.operator_id;

comment on view "public"."admin_planning_overview_v2" is
  'Admin global planning overview: Plan -> CAPO slots -> Operators. Includes profile/operator labels for UI.';

grant all on table "public"."admin_planning_overview_v2" to "anon";
grant all on table "public"."admin_planning_overview_v2" to "authenticated";
grant all on table "public"."admin_planning_overview_v2" to "service_role";

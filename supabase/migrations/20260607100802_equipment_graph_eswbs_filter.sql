begin;

create or replace view public.equipment_graph
with (security_invoker = true) as
with equipment_edges as (
  select
    upper(trim(coalesce(nullif(ic.apparato_da, ''), nullif(dli.app_partenza, '')))) as equipment_code,
    coalesce(nullif(ic.descrizione_da, ''), nullif(ic.apparato_da, ''), upper(trim(nullif(dli.app_partenza, '')))) as equipment_name,
    coalesce(nullif(ic.tipo, ''), nullif(ic.sezione, ''), 'ESWBS') as equipment_type,
    coalesce(nullif(ic.zona_da, ''), nullif(dli.perimetro, '')) as zone,
    coalesce(nullif(ic.impianto, ''), 'SYSTEM UNASSIGNED') as system,
    dli.cable_code_normalized as cable_code,
    'outgoing'::text as direction,
    upper(trim(coalesce(nullif(ic.apparato_a, ''), nullif(dli.app_arrivo, '')))) as related_equipment
  from public.daily_list_items dli
  left join public.inca_cavi ic on ic.id = dli.inca_cavo_id
  where upper(trim(coalesce(nullif(ic.apparato_da, ''), nullif(dli.app_partenza, '')))) ~ '^\d{12}$'

  union all

  select
    upper(trim(coalesce(nullif(ic.apparato_a, ''), nullif(dli.app_arrivo, '')))) as equipment_code,
    coalesce(nullif(ic.descrizione_a, ''), nullif(ic.apparato_a, ''), upper(trim(nullif(dli.app_arrivo, '')))) as equipment_name,
    coalesce(nullif(ic.tipo, ''), nullif(ic.sezione, ''), 'ESWBS') as equipment_type,
    coalesce(nullif(ic.zona_a, ''), nullif(dli.perimetro, '')) as zone,
    coalesce(nullif(ic.impianto, ''), 'SYSTEM UNASSIGNED') as system,
    dli.cable_code_normalized as cable_code,
    'incoming'::text as direction,
    upper(trim(coalesce(nullif(ic.apparato_da, ''), nullif(dli.app_partenza, '')))) as related_equipment
  from public.daily_list_items dli
  left join public.inca_cavi ic on ic.id = dli.inca_cavo_id
  where upper(trim(coalesce(nullif(ic.apparato_a, ''), nullif(dli.app_arrivo, '')))) ~ '^\d{12}$'
)
select
  equipment_code,
  max(equipment_name) as equipment_name,
  max(equipment_type) as equipment_type,
  max(zone) as zone,
  max(system) as system,
  coalesce(
    jsonb_agg(distinct cable_code) filter (where direction = 'incoming'),
    '[]'::jsonb
  ) as incoming_cables,
  coalesce(
    jsonb_agg(distinct cable_code) filter (where direction = 'outgoing'),
    '[]'::jsonb
  ) as outgoing_cables,
  coalesce(
    jsonb_agg(distinct related_equipment) filter (
      where related_equipment is not null
        and related_equipment <> equipment_code
        and related_equipment ~ '^\d{12}$'
    ),
    '[]'::jsonb
  ) as related_equipments
from equipment_edges
group by equipment_code;

comment on view public.equipment_graph is
  'CORE COMMAND P4: graphe ESWBS lecture seule. Seuls les codes equipement a 12 chiffres sont gardes comme noeuds.';

grant select on public.equipment_graph to authenticated;
grant all on public.equipment_graph to service_role;

commit;

-- P0.2 Stage B3 — re-match des daily_list_items existants contre le fichier
-- INCA actif, avec la logique non destructive strict/loose + provenance.
--
-- Corrige le bug historique : l'ancien matcher (.maybeSingle sur marca_cavo)
-- échouait dès qu'un cavo existait dans 2 fichiers INCA → ~145 faux "fuori INCA".
-- Ici : clé stricte (préfixe préservé) prioritaire, loose unique sinon,
-- loose ambigu jamais auto-assigné. Idempotent.

with active as (
  select id from public.inca_files where file_type = 'XLSX' order by uploaded_at desc limit 1
),
inca_keys as (
  select c.id,
    upper(replace(replace(trim(coalesce(c.marca_cavo, c.codice)), ' ', ''), '*', '')) as strict_k,
    regexp_replace(upper(replace(replace(trim(coalesce(c.marca_cavo, c.codice)), ' ', ''), '*', '')), '^[0-9]+[-/][0-9]+', '') as loose_k
  from public.inca_cavi c
  where c.inca_file_id = (select id from active)
),
strict_idx as (select strict_k, count(distinct id) n, min(id::text)::uuid id from inca_keys group by strict_k),
loose_idx  as (select loose_k,  count(distinct id) n, min(id::text)::uuid id from inca_keys group by loose_k),
d as (
  select di.id,
    upper(replace(replace(trim(di.cable_code_raw), ' ', ''), '*', '')) as strict_k,
    regexp_replace(upper(replace(replace(trim(di.cable_code_raw), ' ', ''), '*', '')), '^[0-9]+[-/][0-9]+', '') as loose_k
  from public.daily_list_items di
),
resolved as (
  select d.id,
    case when s.n = 1 then 'strict' when l.n = 1 then 'loose' when l.n > 1 then 'ambiguous' else 'none' end as src,
    case when s.n = 1 then 1.0 when l.n = 1 then 0.7 else 0 end as conf,
    case when s.n = 1 then s.id when l.n = 1 then l.id else null end as new_id
  from d
  left join strict_idx s on s.strict_k = d.strict_k
  left join loose_idx  l on l.loose_k  = d.loose_k
)
update public.daily_list_items di
set inca_cavo_id     = coalesce(r.new_id, di.inca_cavo_id),
    match_source     = r.src,
    match_confidence = r.conf
from resolved r
where r.id = di.id;

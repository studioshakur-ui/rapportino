begin;

-- 1) Fonction canonique : normalise les codes câble pour jointure stable
create or replace function public.norm_inca_codice(v text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      upper(trim(v)),
      '\s+',
      ' ',
      'g'
    ),
    ''
  )
$$;

comment on function public.norm_inca_codice(text) is
'Normalise un codice INCA (upper+trim+collapse spaces). Utilisée pour joindre historique rapportino ↔ head INCA sans perte.';

-- 2) Colonnes "norm" (stockées) pour indexer correctement
alter table public.inca_cavi
  add column if not exists codice_norm text;

update public.inca_cavi
set codice_norm = public.norm_inca_codice(codice)
where codice_norm is distinct from public.norm_inca_codice(codice);

alter table public.rapportino_inca_cavi
  add column if not exists codice_cache_norm text;

update public.rapportino_inca_cavi
set codice_cache_norm = public.norm_inca_codice(codice_cache)
where codice_cache_norm is distinct from public.norm_inca_codice(codice_cache);

-- 3) Index (indispensable)
create index if not exists inca_cavi_head_codice_norm_idx
  on public.inca_cavi (inca_file_id, costr, commessa, codice_norm);

create index if not exists ric_cache_norm_join_idx
  on public.rapportino_inca_cavi (costr_cache, commessa_cache, codice_cache_norm);
-- IMPORTANT: drop views explicitly because CREATE OR REPLACE cannot change column set/order
drop view if exists public.inca_cavi_with_last_posa_and_capo_v2;
drop view if exists public.inca_cavi_with_last_posa_and_capo_v3;

create view public.inca_cavi_with_last_posa_and_capo_v3
with (security_invoker = true) as
with posa as (
  select distinct on (ric.codice_cache_norm, ric.costr_cache, ric.commessa_cache)
    ric.codice_cache_norm,
    ric.costr_cache,
    ric.commessa_cache,
    ric.posa_date as data_posa,
    p.full_name as capo_label
  from public.rapportino_inca_cavi ric
  join public.rapportini r
    on r.id = ric.rapportino_id
  left join public.profiles p
    on p.id = r.capo_id
  where ric.codice_cache_norm is not null
  order by ric.codice_cache_norm, ric.costr_cache, ric.commessa_cache, ric.posa_date desc nulls last
)
select
  c.*,
  posa.data_posa,
  posa.capo_label
from public.inca_cavi c
left join posa
  on posa.codice_cache_norm = c.codice_norm
 and posa.costr_cache = c.costr
 and posa.commessa_cache = c.commessa;

-- (si tu veux garder l’alias v2)
create view public.inca_cavi_with_last_posa_and_capo_v2
with (security_invoker = true) as
select * from public.inca_cavi_with_last_posa_and_capo_v3;
-- 4) Vue canonique : posa/capo via JOINTURE NORMEE (PAS via id)
-- Remplace ta logique fragile et récupère data posa/capo même après import HEAD.
create or replace view public.inca_cavi_with_last_posa_and_capo_v3
with (security_invoker = true) as
with posa as (
  select distinct on (ric.codice_cache_norm, ric.costr_cache, ric.commessa_cache)
    ric.codice_cache_norm,
    ric.costr_cache,
    ric.commessa_cache,
    ric.posa_date as data_posa,
    p.full_name as capo_label
  from public.rapportino_inca_cavi ric
  join public.rapportini r
    on r.id = ric.rapportino_id
  left join public.profiles p
    on p.id = r.capo_id
  where ric.codice_cache_norm is not null
  order by ric.codice_cache_norm, ric.costr_cache, ric.commessa_cache, ric.posa_date desc nulls last
)
select
  c.*,
  posa.data_posa,
  posa.capo_label
from public.inca_cavi c
left join posa
  on posa.codice_cache_norm = c.codice_norm
 and posa.costr_cache = c.costr
 and posa.commessa_cache = c.commessa;

comment on view public.inca_cavi_with_last_posa_and_capo_v3 is
'Vue canonique INCA + posa/capo (join normalisée via codice_norm). security_invoker=true pour RLS safe.';

commit;
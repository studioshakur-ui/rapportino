-- 20260219201000_inca_situazione_null_L_and_views_security_invoker.sql
-- Canon update (Feb 2026):
-- - DB stores L as NULL (never store 'L' as text)
-- - KPI bucket NP = (NULL + T + B + R)
-- - Ensure INCA views are SECURITY INVOKER (RLS evaluated as the authenticated user)
-- - Ensure cockpit RPC uses canonical v3 view

begin;

-- 1) DATA FIX: normalize any legacy 'L' to NULL (idempotent)
update public.inca_cavi
set situazione = null
where trim(coalesce(situazione, '')) = 'L';

-- 2) DOMAIN CONSTRAINT: forbid 'L' text, allow NULL + atomic states
alter table public.inca_cavi
  drop constraint if exists inca_cavi_situazione_check;

alter table public.inca_cavi
  add constraint inca_cavi_situazione_check
  check (
    (situazione is null)
    or (situazione = any (array['T','P','R','B','E']))
  );

comment on column public.inca_cavi.situazione is
  'NULL=L (libero/disponibile). T=tagliato, B=bloccato, R=richiesta, P=posato, E=eliminato. KPI NP = (NULL + T + B + R).';

-- 3) VIEWS: recreate v3 with SECURITY INVOKER; keep v2 as alias (also security invoker)
drop view if exists public.inca_cavi_with_last_posa_and_capo_v3;

create or replace view public.inca_cavi_with_last_posa_and_capo_v3
with (security_invoker = true)
as
with posa as (
  select distinct on (
    regexp_replace(trim(replace(ric.codice_cache, chr(160), ' ')), '\\s+', ' ', 'g'),
    ric.costr_cache,
    ric.commessa_cache
  )
    regexp_replace(trim(replace(ric.codice_cache, chr(160), ' ')), '\\s+', ' ', 'g') as codice_norm,
    ric.costr_cache,
    ric.commessa_cache,
    ric.posa_date as posa_date,
    coalesce(
      p_capo.display_name,
      p_capo.full_name,
      p_user.display_name,
      p_user.full_name,
      r.capo_name
    ) as capo_label
  from public.rapportino_inca_cavi ric
  join public.rapportini r
    on r.id = ric.rapportino_id
  left join public.profiles p_capo
    on p_capo.id = r.capo_id
  left join public.profiles p_user
    on p_user.id = r.user_id
  where
    ric.step_type = 'POSA'::public.cavo_step_type
    and ric.posa_date is not null
    and ric.codice_cache is not null
    and ric.costr_cache is not null
    and ric.commessa_cache is not null
  order by
    regexp_replace(trim(replace(ric.codice_cache, chr(160), ' ')), '\\s+', ' ', 'g'),
    ric.costr_cache,
    ric.commessa_cache,
    ric.posa_date desc,
    r.updated_at desc,
    ric.updated_at desc
)
select
  c.*,
  case when c.situazione = 'P' then posa.posa_date else null end as data_posa,
  case when c.situazione = 'P' then posa.capo_label else null end as capo_label
from public.inca_cavi c
left join posa
  on posa.codice_norm = regexp_replace(trim(replace(c.codice, chr(160), ' ')), '\\s+', ' ', 'g')
  and posa.costr_cache = c.costr
  and posa.commessa_cache = c.commessa;

comment on view public.inca_cavi_with_last_posa_and_capo_v3 is
  'INCA cables + last POSA date (ric.posa_date) + capo label (via rapportini.capo_id); strict chantier: outputs masked unless situazione = P; SECURITY INVOKER for RLS correctness.';

drop view if exists public.inca_cavi_with_last_posa_and_capo_v2;
create or replace view public.inca_cavi_with_last_posa_and_capo_v2
with (security_invoker = true)
as
select * from public.inca_cavi_with_last_posa_and_capo_v3;

comment on view public.inca_cavi_with_last_posa_and_capo_v2 is
  'Alias to v3 (strict chantier masking; capo via capo_id; posa_date from rapportino_inca_cavi). SECURITY INVOKER.';

-- 4) RPC: point cockpit query to canonical v3 view (stable semantics)
create or replace function public.inca_cockpit_query_v1(
  p_inca_file_id uuid,
  p_filters jsonb default '[]',
  p_sort jsonb default '[]',
  p_page int default 1,
  p_page_size int default 100
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_offset int := (p_page - 1) * p_page_size;
  v_result jsonb;
begin
  with base as (
    select *
    from public.inca_cavi_with_last_posa_and_capo_v3
    where inca_file_id = p_inca_file_id
  )
  select jsonb_build_object(
    'rows', (
      select jsonb_agg(b)
      from (
        select *
        from base
        limit p_page_size offset v_offset
      ) b
    ),
    'total', (select count(*) from base)
  )
  into v_result;

  return v_result;
end;
$$;

commit;

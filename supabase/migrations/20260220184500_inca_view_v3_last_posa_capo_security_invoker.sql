-- 20260220184500_inca_view_v3_last_posa_capo_security_invoker.sql
-- Canonical INCA cockpit view:
-- - Reads from public.inca_cavi (HEAD by inca_file_id)
-- - Enriches each cable with last posa_date + capo label from rapportini history
-- - Uses SECURITY INVOKER so RLS is evaluated for the caller (safe for CAPO/UFFICIO/etc.)
-- - Does NOT mask history based on situazione (Objective B: avoid "lost data" perception)

begin;

-- 1) Canonical V3 view
create or replace view public.inca_cavi_with_last_posa_and_capo_v3
with (security_invoker = true) as
with posa as (
  select distinct on (ric.codice_cache, ric.costr_cache, ric.commessa_cache)
    ric.codice_cache,
    ric.costr_cache,
    ric.commessa_cache,
    ric.posa_date as data_posa,
    p.full_name as capo_label
  from public.rapportino_inca_cavi ric
  join public.rapportini r
    on r.id = ric.rapportino_id
  left join public.profiles p
    on p.id = r.capo_id
  where ric.codice_cache is not null
    and ric.costr_cache is not null
    and ric.commessa_cache is not null
  order by
    ric.codice_cache,
    ric.costr_cache,
    ric.commessa_cache,
    ric.posa_date desc nulls last
)
select
  c.*,
  posa.data_posa,
  posa.capo_label
from public.inca_cavi c
left join posa
  on posa.codice_cache = c.codice
 and posa.costr_cache = c.costr
 and posa.commessa_cache = c.commessa;

comment on view public.inca_cavi_with_last_posa_and_capo_v3 is
'INCA cockpit canonical view: inca_cavi enriched with last posa_date + capo_label from rapportini history. security_invoker=true (RLS safe).';

-- 2) Backward-compatible alias V2 -> V3 (prevents drift / conflicting migrations)
create or replace view public.inca_cavi_with_last_posa_and_capo_v2
with (security_invoker = true) as
select *
from public.inca_cavi_with_last_posa_and_capo_v3;

comment on view public.inca_cavi_with_last_posa_and_capo_v2 is
'Backward-compatible alias to V3. Do not redefine independently.';

commit;

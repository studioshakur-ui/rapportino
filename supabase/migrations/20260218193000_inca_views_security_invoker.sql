-- Fix cockpit returning 0 rows: ensure RLS is evaluated as INVOKER (authenticated user)
-- instead of view owner. Supabase/PostgREST best practice.

begin;

-- Recreate the view with security_invoker so auth.role()/JWT-based RLS works.
create or replace view public.inca_cavi_with_last_posa_and_capo_v1
with (security_invoker = true)
as
select
  c.id,
  c.inca_file_id,
  c.costr,
  c.commessa,
  c.codice,
  c.descrizione,
  c.impianto,
  c.tipo,
  c.sezione,
  c.zona_da,
  c.zona_a,
  c.apparato_da,
  c.apparato_a,
  c.descrizione_da,
  c.descrizione_a,
  c.metri_teo,
  c.metri_dis,
  c.metri_sit_cavo,
  c.metri_sit_tec,
  c.pagina_pdf,
  c.rev_inca,
  c.stato_inca,
  c.created_at,
  c.updated_at,
  c.situazione,
  c.from_file_id,
  c.metri_previsti,
  c.metri_posati_teorici,
  c.metri_totali,
  c.marca_cavo,
  c.livello,
  c.metri_sta,
  c.stato_tec,
  c.stato_cantiere,
  c.situazione_cavo,
  c.livello_disturbo,
  c.wbs,
  c.codice_inca,
  c.progress_percent,
  c.progress_side,
  lp.data_posa,
  r.capo_id,
  coalesce(
    nullif(trim(both from p.display_name), ''),
    nullif(trim(both from p.full_name), ''),
    nullif(trim(both from r.capo_name), '')
  ) as capo_label
from public.inca_cavi c
left join lateral (
  select
    ric.posa_date as data_posa,
    ric.rapportino_id
  from public.rapportino_inca_cavi ric
  where
    ric.inca_cavo_id = c.id
    and ric.posa_date is not null
    and ric.step_type = 'POSA'::public.cavo_step_type
  order by ric.posa_date desc, ric.updated_at desc
  limit 1
) lp on true
left join public.rapportini r on r.id = lp.rapportino_id
left join public.profiles p on p.id = r.capo_id;

-- Optional but recommended: keep sibling views consistent if you use them from the client.
create or replace view public.inca_cavi_with_last_posa_v1
with (security_invoker = true)
as
select
  c.id,
  c.inca_file_id,
  c.costr,
  c.commessa,
  c.codice,
  c.descrizione,
  c.impianto,
  c.tipo,
  c.sezione,
  c.zona_da,
  c.zona_a,
  c.apparato_da,
  c.apparato_a,
  c.descrizione_da,
  c.descrizione_a,
  c.metri_teo,
  c.metri_dis,
  c.metri_sit_cavo,
  c.metri_sit_tec,
  c.pagina_pdf,
  c.rev_inca,
  c.stato_inca,
  c.created_at,
  c.updated_at,
  c.situazione,
  c.from_file_id,
  c.metri_previsti,
  c.metri_posati_teorici,
  c.metri_totali,
  c.marca_cavo,
  c.livello,
  c.metri_sta,
  c.stato_tec,
  c.stato_cantiere,
  c.situazione_cavo,
  c.livello_disturbo,
  c.wbs,
  c.codice_inca,
  c.progress_percent,
  c.progress_side,
  lp.data_posa
from public.inca_cavi c
left join (
  select
    ric.inca_cavo_id,
    max(ric.posa_date) as data_posa
  from public.rapportino_inca_cavi ric
  where ric.posa_date is not null
    and ric.step_type = 'POSA'::public.cavo_step_type
  group by ric.inca_cavo_id
) lp on lp.inca_cavo_id = c.id;

commit;

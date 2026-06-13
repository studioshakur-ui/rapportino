-- navemaster_perimetro_cavi — drill-down des câbles qui retiennent un périmètre.
--
-- Pour un navire (dernier fichier INCA actif) et un périmètre donné, renvoie les
-- câbles qui ne sont PAS encore livrables (NOT (posé ET collegato)) : c'est le
-- "pourquoi" concret derrière le da_completare du tableau périmètre.
-- Lecture seule. Mêmes définitions que navemaster_perimetro_board (légende SDC) :
--   posé = situazione='P' ; collegato = collegato in ('C','1','2') ; bloqué = situazione='B'.

create or replace function public.navemaster_perimetro_cavi(p_ship_id uuid, p_perimetro text)
returns table (
  codice         text,
  marca_cavo     text,
  situazione     text,
  collegato      text,
  posato         boolean,
  is_collegato   boolean,
  bloccato       boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inca_file_id uuid;
begin
  if not (public.navemaster_is_ufficio_or_admin() or public.core_command_is_owner()) then
    raise exception 'navemaster_perimetro_cavi: not allowed';
  end if;

  select a.inca_file_id into v_inca_file_id
  from public.navemaster_active_inca_file_v1 a
  where a.ship_id = p_ship_id;

  if v_inca_file_id is null then
    raise exception 'navemaster_perimetro_cavi: no INCA file found for ship_id=%', p_ship_id;
  end if;

  return query
  select
    c.codice,
    c.marca_cavo,
    c.situazione,
    c.collegato,
    (coalesce(c.situazione, '') = 'P')                          as posato,
    (coalesce(c.collegato, '') in ('C','1','2'))                as is_collegato,
    (coalesce(c.situazione, '') = 'B')                          as bloccato
  from public.inca_cavi c
  where c.inca_file_id = v_inca_file_id
    and c.perimetro = p_perimetro
    and not (coalesce(c.situazione, '') = 'P' and coalesce(c.collegato, '') in ('C','1','2'))
  -- bloqués d'abord, puis non posés, puis posés-non-collegati
  order by (coalesce(c.situazione, '') = 'B') desc,
           (coalesce(c.situazione, '') = 'P') asc,
           c.codice asc
  limit 500;
end;
$$;

revoke all on function public.navemaster_perimetro_cavi(uuid, text) from public;
grant execute on function public.navemaster_perimetro_cavi(uuid, text) to authenticated;
grant execute on function public.navemaster_perimetro_cavi(uuid, text) to service_role;

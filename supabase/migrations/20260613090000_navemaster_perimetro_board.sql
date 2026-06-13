-- navemaster_perimetro_board — read-model périmètre (Phase B du copilote consegna).
--
-- Calcule, par périmètre et pour le dernier fichier INCA actif du navire,
-- l'avancement live des DEUX axes vers la consegna. Lecture seule, aucune écriture.
--
-- Définitions métier (légende SDC) :
--   posé      = inca_cavi.situazione = 'P'
--   collegato = inca_cavi.collegato in ('C','1','2')
--   bloqué    = inca_cavi.situazione = 'B'
--   da_completare = NOT (posé ET collegato)  -- ce qui retient encore la consegna
-- TODO consegna stricte = collegato "entrambi" : la distinction fine des codes
--   C/1/2 (partenza / arrivo / entrambi) reste à confirmer avec le bureau Conit.

create or replace function public.navemaster_perimetro_board(p_ship_id uuid)
returns table (
  perimetro        text,
  data_consegna    date,
  giorni_al_target integer,
  tot_cavi         integer,
  posati           integer,
  collegati        integer,
  bloccati         integer,
  da_completare    integer,
  pct_posa         integer,
  pct_coll         integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inca_file_id uuid;
begin
  -- auth gate : mêmes droits de lecture que le reste de navemaster
  if not (public.navemaster_is_ufficio_or_admin() or public.core_command_is_owner()) then
    raise exception 'navemaster_perimetro_board: not allowed';
  end if;

  -- dernier fichier INCA actif du navire (même résolution que navemaster_compute_run_v2)
  select a.inca_file_id into v_inca_file_id
  from public.navemaster_active_inca_file_v1 a
  where a.ship_id = p_ship_id;

  if v_inca_file_id is null then
    raise exception 'navemaster_perimetro_board: no INCA file found for ship_id=%', p_ship_id;
  end if;

  return query
  select
    c.perimetro,
    max(c.data_consegna_perimetro)                                                        as data_consegna,
    (max(c.data_consegna_perimetro) - current_date)::int                                  as giorni_al_target,
    count(*)::int                                                                          as tot_cavi,
    (count(*) filter (where c.situazione = 'P'))::int                                      as posati,
    (count(*) filter (where c.collegato in ('C','1','2')))::int                            as collegati,
    (count(*) filter (where c.situazione = 'B'))::int                                      as bloccati,
    -- coalesce : un collegato/situazione NULL doit compter comme "non fait"
    -- (sinon la logique tri-valuée SQL exclut à tort les posés-non-collegati).
    (count(*) filter (where not (coalesce(c.situazione, '') = 'P' and coalesce(c.collegato, '') in ('C','1','2'))))::int as da_completare,
    round(100.0 * (count(*) filter (where c.situazione = 'P')) / nullif(count(*), 0))::int  as pct_posa,
    round(100.0 * (count(*) filter (where c.collegato in ('C','1','2'))) / nullif(count(*), 0))::int as pct_coll
  from public.inca_cavi c
  where c.inca_file_id = v_inca_file_id
    and coalesce(nullif(btrim(c.perimetro), ''), '') <> ''
  group by c.perimetro
  -- les plus proches d'être livrables (posé) d'abord, puis les plus en retard
  order by 9 desc nulls last, 3 asc nulls last;
end;
$$;

revoke all on function public.navemaster_perimetro_board(uuid) from public;
grant execute on function public.navemaster_perimetro_board(uuid) to authenticated;
grant execute on function public.navemaster_perimetro_board(uuid) to service_role;

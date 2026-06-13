begin;

create or replace function public.navemaster_perimetro_board(p_ship_id uuid)
returns table (
  perimetro text,
  data_consegna date,
  giorni_al_target integer,
  tot_cavi integer,
  posati integer,
  collegati integer,
  bloccati integer,
  da_completare integer,
  pct_posa integer,
  pct_coll integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inca_file_id uuid;
begin
  if not public.navemaster_can_read_ship(p_ship_id) then
    raise exception 'navemaster_perimetro_board: not allowed';
  end if;

  -- resolve inca_file_id (latest XLSX for ship)
  select a.inca_file_id into v_inca_file_id
  from public.navemaster_active_inca_file_v1 a
  where a.ship_id = p_ship_id;

  if v_inca_file_id is null then
    raise exception 'navemaster_perimetro_board: no INCA file found for ship_id=%', p_ship_id;
  end if;

  -- TODO consegna stricte = entrambi
  return query
  with board as (
    select
      c.perimetro,
      c.data_consegna_perimetro as data_consegna,
      count(*)::integer as tot_cavi,
      count(*) filter (where c.situazione = 'P')::integer as posati,
      count(*) filter (where c.collegato in ('C', '1', '2'))::integer as collegati,
      count(*) filter (where c.situazione = 'B')::integer as bloccati,
      (count(*) - count(*) filter (where c.situazione = 'P' and c.collegato in ('C', '1', '2')))::integer as da_completare
    from public.inca_cavi c
    where c.inca_file_id = v_inca_file_id
      and coalesce(nullif(trim(c.perimetro), ''), '') <> ''
    group by c.perimetro, c.data_consegna_perimetro
  )
  select
    b.perimetro,
    b.data_consegna,
    (b.data_consegna - current_date)::integer as giorni_al_target,
    b.tot_cavi,
    b.posati,
    b.collegati,
    b.bloccati,
    b.da_completare,
    round(100.0 * b.posati / nullif(b.tot_cavi, 0))::integer as pct_posa,
    round(100.0 * b.collegati / nullif(b.tot_cavi, 0))::integer as pct_coll
  from board b
  order by pct_posa desc nulls last, giorni_al_target asc nulls last;
end;
$$;

comment on function public.navemaster_perimetro_board(uuid)
is 'Read-only Navemaster perimeter board for the active INCA file of a ship: posa/collegato progress toward consegna.';

revoke all on function public.navemaster_perimetro_board(uuid) from public;
grant execute on function public.navemaster_perimetro_board(uuid) to authenticated;
grant execute on function public.navemaster_perimetro_board(uuid) to service_role;

commit;

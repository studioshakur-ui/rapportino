alter table public.inca_cavi
  add column if not exists sist_partenza text,
  add column if not exists sist_arrivo text,
  add column if not exists data_sist_partenza date,
  add column if not exists data_sist_arrivo date,
  add column if not exists coll_fattibile text,
  add column if not exists numero_pin integer,
  add column if not exists tot_collegamenti numeric;

drop function if exists public.navemaster_perimetro_board(uuid);

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
  pct_coll         integer,
  sistemati        integer,
  da_posare        integer,
  da_sistemare     integer,
  pronto_coll      integer,
  coll_parziale    integer,
  pct_sist         integer,
  coll_previsti    numeric,
  coll_fatti       numeric,
  pct_coll_pin     integer
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
    raise exception 'navemaster_perimetro_board: not allowed';
  end if;

  select a.inca_file_id into v_inca_file_id
  from public.navemaster_active_inca_file_v1 a
  where a.ship_id = p_ship_id;

  if v_inca_file_id is null then
    raise exception 'navemaster_perimetro_board: no INCA file found for ship_id=%', p_ship_id;
  end if;

  return query
  with base as (
    select
      c.*,
      (
        (coalesce(c.sist_partenza, '') = 'OK' and coalesce(c.sist_arrivo, '') = 'OK')
        or coalesce(c.collegato, '') = '2'
      ) as sistemato
    from public.inca_cavi c
    where c.inca_file_id = v_inca_file_id
      and coalesce(nullif(btrim(c.perimetro), ''), '') <> ''
  )
  select
    b.perimetro,
    max(b.data_consegna_perimetro) as data_consegna,
    (max(b.data_consegna_perimetro) - current_date)::int as giorni_al_target,
    count(*)::int as tot_cavi,
    (count(*) filter (where b.situazione = 'P'))::int as posati,
    (count(*) filter (where b.collegato in ('C','1','2')))::int as collegati,
    (count(*) filter (where b.situazione = 'B'))::int as bloccati,
    (count(*) filter (where not (coalesce(b.situazione, '') = 'P' and coalesce(b.collegato, '') in ('C','1','2'))))::int as da_completare,
    round(100.0 * (count(*) filter (where b.situazione = 'P')) / nullif(count(*), 0))::int as pct_posa,
    round(100.0 * (count(*) filter (where b.collegato in ('C','1','2'))) / nullif(count(*), 0))::int as pct_coll,
    (count(*) filter (where b.sistemato))::int as sistemati,
    (count(*) filter (where coalesce(b.situazione, '') <> 'P'))::int as da_posare,
    (count(*) filter (where b.situazione = 'P' and not b.sistemato and coalesce(b.collegato, '') not in ('C','1','2')))::int as da_sistemare,
    (count(*) filter (where b.situazione = 'P' and b.sistemato and coalesce(b.collegato, '') not in ('C','1','2')))::int as pronto_coll,
    (count(*) filter (where b.collegato in ('C','1')))::int as coll_parziale,
    round(100.0 * (count(*) filter (where b.sistemato)) / nullif(count(*), 0))::int as pct_sist,
    sum(coalesce(b.tot_collegamenti, 0)) as coll_previsti,
    sum(
      case
        when b.collegato = '2' then coalesce(b.tot_collegamenti, 0)
        when b.collegato in ('C','1') then coalesce(b.tot_collegamenti, 0) / 2.0
        else 0
      end
    ) as coll_fatti,
    round(
      100.0
      * sum(
        case
          when b.collegato = '2' then coalesce(b.tot_collegamenti, 0)
          when b.collegato in ('C','1') then coalesce(b.tot_collegamenti, 0) / 2.0
          else 0
        end
      )
      / nullif(sum(coalesce(b.tot_collegamenti, 0)), 0)
    )::int as pct_coll_pin
  from base b
  group by b.perimetro
  order by 9 desc nulls last, 3 asc nulls last;
end;
$$;

revoke all on function public.navemaster_perimetro_board(uuid) from public;
grant execute on function public.navemaster_perimetro_board(uuid) to authenticated;
grant execute on function public.navemaster_perimetro_board(uuid) to service_role;

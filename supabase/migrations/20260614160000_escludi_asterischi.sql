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
        or coalesce(c.collegato, '') = 'C'
      ) as sistemato
    from public.inca_cavi c
    where c.inca_file_id = v_inca_file_id
      and coalesce(nullif(btrim(c.perimetro), ''), '') <> ''
      and coalesce(c.codice, '') not like '%*%'
  )
  select
    b.perimetro,
    max(b.data_consegna_perimetro) as data_consegna,
    (max(b.data_consegna_perimetro) - current_date)::int as giorni_al_target,
    count(*)::int as tot_cavi,
    (count(*) filter (where b.situazione = 'P'))::int as posati,
    (count(*) filter (where b.collegato in ('C','1','2')))::int as collegati,
    (count(*) filter (where b.situazione = 'B'))::int as bloccati,
    (count(*) filter (where not (coalesce(b.situazione, '') = 'P' and coalesce(b.collegato, '') = 'C')))::int as da_completare,
    round(100.0 * (count(*) filter (where b.situazione = 'P')) / nullif(count(*), 0))::int as pct_posa,
    round(100.0 * (count(*) filter (where b.collegato in ('C','1','2'))) / nullif(count(*), 0))::int as pct_coll,
    (count(*) filter (where b.sistemato))::int as sistemati,
    (count(*) filter (where coalesce(b.situazione, '') <> 'P'))::int as da_posare,
    (count(*) filter (where b.situazione = 'P' and not b.sistemato and coalesce(b.collegato, '') not in ('C','1','2')))::int as da_sistemare,
    (count(*) filter (where b.situazione = 'P' and b.sistemato and coalesce(b.collegato, '') not in ('C','1','2')))::int as pronto_coll,
    (count(*) filter (where b.collegato in ('1','2')))::int as coll_parziale,
    round(100.0 * (count(*) filter (where b.sistemato)) / nullif(count(*), 0))::int as pct_sist,
    sum(coalesce(b.tot_collegamenti, 0)) as coll_previsti,
    sum(
      case
        when b.collegato = 'C' then coalesce(b.tot_collegamenti, 0)
        when b.collegato in ('1','2') then coalesce(b.tot_collegamenti, 0) / 2.0
        else 0
      end
    ) as coll_fatti,
    round(
      100.0
      * sum(
        case
          when b.collegato = 'C' then coalesce(b.tot_collegamenti, 0)
          when b.collegato in ('1','2') then coalesce(b.tot_collegamenti, 0) / 2.0
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

create or replace function public.navemaster_perimetro_cavi(p_ship_id uuid, p_perimetro text)
returns table (
  codice                 text,
  marca_cavo             text,
  situazione             text,
  bloccato               boolean,
  posato                 boolean,
  sist_partenza          text,
  sist_arrivo            text,
  data_sist_partenza     date,
  data_sist_arrivo       date,
  collegato              text,
  coll_partenza          boolean,
  coll_arrivo            boolean,
  numero_pin             integer,
  tot_collegamenti       numeric,
  coll_fattibile         text,
  apparato_da            text,
  apparato_a             text,
  descrizione_da         text,
  descrizione_a          text,
  note_sistemazione      text,
  problematiche_coll     text,
  problematiche_posa     text,
  op_lista_sist          text,
  inca_data_posa         date,
  inca_data_collegamento date,
  stage                  text,
  manca                  text
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
  with base as (
    select
      c.*,
      (coalesce(c.situazione, '') = 'P') as is_posato,
      (coalesce(c.situazione, '') = 'B') as is_bloccato,
      ((coalesce(c.sist_partenza, '') = 'OK' and coalesce(c.sist_arrivo, '') = 'OK') or coalesce(c.collegato, '') = 'C') as is_sistemato,
      (coalesce(c.collegato, '') in ('C','1')) as is_coll_partenza,
      (coalesce(c.collegato, '') in ('C','2')) as is_coll_arrivo
    from public.inca_cavi c
    where c.inca_file_id = v_inca_file_id
      and c.perimetro = p_perimetro
      and coalesce(c.codice, '') not like '%*%'
      and not (coalesce(c.situazione, '') = 'P' and coalesce(c.collegato, '') in ('C','1','2'))
  )
  select
    b.codice,
    b.marca_cavo,
    b.situazione,
    b.is_bloccato as bloccato,
    b.is_posato as posato,
    b.sist_partenza,
    b.sist_arrivo,
    b.data_sist_partenza,
    b.data_sist_arrivo,
    b.collegato,
    b.is_coll_partenza as coll_partenza,
    b.is_coll_arrivo as coll_arrivo,
    b.numero_pin,
    b.tot_collegamenti,
    b.coll_fattibile,
    b.apparato_da,
    b.apparato_a,
    b.descrizione_da,
    b.descrizione_a,
    b.note_sistemazione,
    b.problematiche_coll,
    b.problematiche_posa,
    b.op_lista_sist,
    b.inca_data_posa,
    b.inca_data_collegamento,
    case
      when b.is_bloccato then 'bloccato'
      when not b.is_posato then 'da_posare'
      when not b.is_sistemato and coalesce(b.collegato, '') not in ('C','1','2') then 'da_sistemare'
      when b.is_posato and b.is_sistemato and coalesce(b.collegato, '') not in ('C','1','2') then 'pronto_coll'
      when coalesce(b.collegato, '') in ('1','2') then 'coll_parziale'
      else 'da_sistemare'
    end as stage,
    case
      when b.is_bloccato then 'sbloccare'
      when not b.is_posato then 'posare'
      when not b.is_sistemato and coalesce(b.sist_partenza, '') <> 'OK' and coalesce(b.sist_arrivo, '') <> 'OK' then 'sistemare partenza e arrivo'
      when not b.is_sistemato and coalesce(b.sist_partenza, '') <> 'OK' then 'sistemare partenza'
      when not b.is_sistemato and coalesce(b.sist_arrivo, '') <> 'OK' then 'sistemare arrivo'
      when coalesce(b.collegato, '') = '1' then 'collegare arrivo'
      when coalesce(b.collegato, '') = '2' then 'collegare partenza'
      when b.is_posato and b.is_sistemato and coalesce(b.collegato, '') not in ('C','1','2') then 'collegare partenza e arrivo'
      else 'verificare'
    end as manca
  from base b
  order by
    case
      when b.is_bloccato then 0
      when not b.is_posato then 1
      when not b.is_sistemato and coalesce(b.collegato, '') not in ('C','1','2') then 2
      when b.is_posato and b.is_sistemato and coalesce(b.collegato, '') not in ('C','1','2') then 3
      when coalesce(b.collegato, '') in ('1','2') then 4
      else 5
    end,
    b.codice asc
  limit 500;
end;
$$;

revoke all on function public.navemaster_perimetro_cavi(uuid, text) from public;
grant execute on function public.navemaster_perimetro_cavi(uuid, text) to authenticated;
grant execute on function public.navemaster_perimetro_cavi(uuid, text) to service_role;

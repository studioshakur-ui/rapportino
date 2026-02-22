set check_function_bodies = off;

create or replace function public.capo_mega_kpi_stesura_v1(
  p_costr text,
  p_commessa text default null,
  p_inca_file_id uuid default null,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
norm as (
  select
    nullif(lower(btrim(p_costr)), '') as costr_norm,
    nullif(lower(btrim(p_commessa)), '') as commessa_norm
),

inca_pick as (
  select
    coalesce(
      p_inca_file_id,
      (
        select f.id
        from public.inca_files f
        join norm n on true
        where (n.costr_norm is null or lower(btrim(f.costr)) = n.costr_norm)
          and (n.commessa_norm is null or lower(btrim(f.commessa)) = n.commessa_norm)
        order by f.uploaded_at desc
        limit 1
      )
    ) as inca_file_id
),

range_ctx as (
  select
    coalesce(p_date_from, (current_date - interval '45 days')::date) as date_from,
    coalesce(p_date_to, current_date) as date_to
),

inca_scope as (
  select
    ip.inca_file_id,
    coalesce(sum(c.metri_teo), 0)::numeric as metri_teo_total,
    coalesce(sum(c.metri_dis), 0)::numeric as metri_dis_total,
    coalesce(sum(greatest(coalesce(c.metri_teo, 0), coalesce(c.metri_dis, 0))), 0)::numeric as metri_ref_total,
    coalesce(
      sum(
        case
          when c.progress_percent is not null then
            greatest(coalesce(c.metri_teo, 0), coalesce(c.metri_dis, 0)) * (c.progress_percent::numeric / 100.0)
          when c.situazione = 'P' then
            greatest(coalesce(c.metri_teo, 0), coalesce(c.metri_dis, 0))
          else 0
        end
      ),
      0
    )::numeric as inca_progress_m
  from inca_pick ip
  left join public.inca_cavi c
    on c.inca_file_id = ip.inca_file_id
  group by ip.inca_file_id
),

inca_rows as (
  select
    c.data_posa::date as posa_date,
    greatest(coalesce(c.metri_teo, 0), coalesce(c.metri_dis, 0))::numeric as metri_ref,
    case
      when c.progress_percent is not null then c.progress_percent::numeric / 100.0
      when c.situazione = 'P' then 1.0
      else 0.0
    end as pct
  from public.inca_cavi_with_last_posa_and_capo_v3 c
  join inca_pick ip on c.inca_file_id = ip.inca_file_id
  where c.data_posa is not null
),

daily as (
  select
    r.posa_date as date,
    coalesce(sum(r.metri_ref * r.pct), 0)::numeric as stesura_m
  from inca_rows r
  join range_ctx rg on true
  where r.posa_date between rg.date_from and rg.date_to
  group by r.posa_date
),

daily2 as (
  select
    d.date,
    d.stesura_m,
    0::numeric as ripresa_m,
    d.stesura_m::numeric as stesura_giorno_m,
    0::numeric as fascettatura_m
  from daily d
),

daily_cum as (
  select
    d.*,
    sum(d.stesura_giorno_m) over (order by d.date rows between unbounded preceding and current row)
      as stesura_cum_m
  from daily2 d
),

headline as (
  select
    (select date_to from range_ctx)::date as today_date,
    (select coalesce(stesura_m,0) from daily2 where date = (select date_to from range_ctx)::date) as today_stesura_m,
    (select coalesce(ripresa_m,0) from daily2 where date = (select date_to from range_ctx)::date) as today_ripresa_m,
    (select coalesce(stesura_giorno_m,0) from daily2 where date = (select date_to from range_ctx)::date) as today_stesura_giorno_m,
    (select fascettatura_m from daily2 where date = (select date_to from range_ctx)::date) as today_fascettatura_m,
    (select coalesce(stesura_cum_m, 0) from daily_cum order by date desc limit 1) as stesura_cum_m,
    (select inca_progress_m from inca_scope) as inca_progress_m
)

select jsonb_build_object(
  'meta', jsonb_build_object(
    'costr', p_costr,
    'commessa', p_commessa,
    'from', (select date_from from range_ctx),
    'to', (select date_to from range_ctx),
    'scope', jsonb_build_object(
      'inca_file_id', (select inca_file_id from inca_scope),
      'metri_teo_total', (select metri_teo_total from inca_scope),
      'metri_dis_total', (select metri_dis_total from inca_scope),
      'metri_ref_total', (select metri_ref_total from inca_scope),
      'offset_m', 0
    ),
    'rules', jsonb_build_object(
      'stesura_giorno_includes', jsonb_build_array('INCA progress'),
      'excluded', jsonb_build_array('RAPPORTINO'),
      'inca_progress', jsonb_build_array('situazione=P', 'progress_percent 50/70/100'),
      'unit', 'm'
    )
  ),
  'headline', jsonb_build_object(
    'today', jsonb_build_object(
      'date', (select today_date from headline),
      'stesura_m', (select today_stesura_m from headline),
      'ripresa_m', (select today_ripresa_m from headline),
      'stesura_giorno_m', (select today_stesura_giorno_m from headline),
      'fascettatura_m', (select today_fascettatura_m from headline)
    ),
    'cumulative', jsonb_build_object(
      'stesura_cum_m', (select stesura_cum_m from headline),
      'inca_progress_m', (select inca_progress_m from headline),
      'progress_pct',
        case
          when (select metri_ref_total from inca_scope) > 0
            then round(((select inca_progress_m from headline) / (select metri_ref_total from inca_scope) * 100.0)::numeric, 4)
          else null
        end
    )
  ),
  'series', jsonb_build_object(
    'daily', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'date', d.date,
            'stesura_m', d.stesura_m,
            'ripresa_m', d.ripresa_m,
            'stesura_giorno_m', d.stesura_giorno_m,
            'fascettatura_m', d.fascettatura_m,
            'stesura_cum_m', d.stesura_cum_m
          )
          order by d.date
        )
        from daily_cum d
      ),
      '[]'::jsonb
    ),
    'events', jsonb_build_array()
  ),
  'drilldown', jsonb_build_object(
    'available', true,
    'note', 'Courbe basée uniquement sur INCA (situazione + progress_percent). Rapportino exclu.'
  )
);
$$;

grant execute on function public.capo_mega_kpi_stesura_v1(text, text, uuid, date, date) to authenticated;

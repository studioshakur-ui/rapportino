begin;

-- ============================================================
-- Direzione AI Dashboard (CNCS Executive) — v1
-- Metrics are computed server-side (views/functions only).
-- ============================================================

-- 1) Radar Giornaliero (risk summary, current open state)
drop view if exists public.direzione_ai_anomalies_total_v1 cascade;
drop view if exists public.direzione_ai_anomalies_v1 cascade;
drop view if exists public.direzione_ai_projection_v1 cascade;
drop view if exists public.direzione_ai_daily_risk_v1 cascade;
drop view if exists public.direzione_ai_performance_rank_v1 cascade;
drop view if exists public.direzione_ai_stability_v1 cascade;
drop view if exists public.direzione_ai_radar_v1 cascade;
create view public.direzione_ai_radar_v1 as
with alerts as (
  select
    costr,
    commessa,
    count(*) filter (where severity = 'CRITICAL'::public.nav_severity and status = 'OPEN'::public.navemaster_alert_status)::numeric as alerts_open_critical,
    count(*) filter (where severity = 'MAJOR'::public.nav_severity and status = 'OPEN'::public.navemaster_alert_status)::numeric as alerts_open_major,
    count(*) filter (where status = 'OPEN'::public.navemaster_alert_status)::numeric as alerts_open_total,
    count(*) filter (where type = 'METRI_MISMATCH'::public.navemaster_alert_type and status = 'OPEN'::public.navemaster_alert_status)::numeric as alerts_open_metri_mismatch
  from public.navemaster_alerts
  group by grouping sets ((costr, commessa), (costr), ())
),
blocks as (
  select
    costr,
    commessa,
    count(*) filter (where unblocked_at is null)::numeric as blocks_open,
    count(*) filter (where unblocked_at is null and severity = 'CRITICAL'::public.nav_severity)::numeric as blocks_open_critical
  from public.blocchi_locali
  group by grouping sets ((costr, commessa), (costr), ())
),
anomalies as (
  select
    costr,
    commessa,
    count(*)::numeric as anomalies_open
  from public.admin_ship_resolution_anomalies_v1
  where report_date >= current_date - 6
  group by grouping sets ((costr, commessa), (costr), ())
),
combined as (
  select
    costr,
    commessa,
    alerts_open_critical,
    alerts_open_major,
    alerts_open_total,
    alerts_open_metri_mismatch,
    0::numeric as blocks_open,
    0::numeric as blocks_open_critical,
    0::numeric as anomalies_open
  from alerts
  union all
  select
    costr,
    commessa,
    0::numeric,
    0::numeric,
    0::numeric,
    0::numeric,
    blocks_open,
    blocks_open_critical,
    0::numeric
  from blocks
  union all
  select
    costr,
    commessa,
    0::numeric,
    0::numeric,
    0::numeric,
    0::numeric,
    0::numeric,
    0::numeric,
    anomalies_open
  from anomalies
),
agg as (
  select
    costr,
    commessa,
    sum(alerts_open_critical)::numeric as alerts_open_critical,
    sum(alerts_open_major)::numeric as alerts_open_major,
    sum(alerts_open_total)::numeric as alerts_open_total,
    sum(alerts_open_metri_mismatch)::numeric as alerts_open_metri_mismatch,
    sum(blocks_open)::numeric as blocks_open,
    sum(blocks_open_critical)::numeric as blocks_open_critical,
    sum(anomalies_open)::numeric as anomalies_open
  from combined
  group by costr, commessa
)
select
  costr,
  commessa,
  current_date as as_of_date,
  case
    when costr is null then 'GLOBAL'
    when commessa is null then 'COSTR'
    else 'COMMESSA'
  end as scope_level,
  coalesce(alerts_open_critical, 0)::numeric as alerts_open_critical,
  coalesce(alerts_open_major, 0)::numeric as alerts_open_major,
  coalesce(alerts_open_total, 0)::numeric as alerts_open_total,
  coalesce(alerts_open_metri_mismatch, 0)::numeric as alerts_open_metri_mismatch,
  coalesce(blocks_open, 0)::numeric as blocks_open,
  coalesce(blocks_open_critical, 0)::numeric as blocks_open_critical,
  coalesce(anomalies_open, 0)::numeric as anomalies_open
from agg;

comment on view public.direzione_ai_radar_v1 is
  'Radar giornaliero (stato attuale): alert aperti + blocchi + anomalie ship resolution (ultimi 7 giorni).';

-- 2) CNCS Stability Score (0–100, explainable)
drop view if exists public.direzione_ai_stability_v1;
create view public.direzione_ai_stability_v1 as
select
  costr,
  commessa,
  scope_level,
  as_of_date,
  alerts_open_critical,
  alerts_open_major,
  blocks_open,
  anomalies_open,
  alerts_open_metri_mismatch,
  greatest(
    0,
    least(
      100,
      100
      - (5 * alerts_open_critical)
      - (3 * alerts_open_major)
      - (2 * blocks_open)
      - (1 * anomalies_open)
      - (1 * alerts_open_metri_mismatch)
    )
  ) as stability_score
from public.direzione_ai_radar_v1;

comment on view public.direzione_ai_stability_v1 is
  'CNCS Stability Score: 100 - 5*C - 3*M - 2*B - 1*A - 1*MM.';

-- 3) Daily risk index (new events by day)
drop view if exists public.direzione_ai_daily_risk_v1;
create view public.direzione_ai_daily_risk_v1 as
with alerts as (
  select
    date(created_at) as day_date,
    costr,
    commessa,
    count(*) filter (where severity = 'CRITICAL'::public.nav_severity) as alerts_critical,
    count(*) filter (where severity = 'MAJOR'::public.nav_severity) as alerts_major
  from public.navemaster_alerts
  where created_at >= current_date - 30
  group by grouping sets ((date(created_at), costr, commessa), (date(created_at), costr), (date(created_at)))
),
blocks as (
  select
    date(blocked_at) as day_date,
    costr,
    commessa,
    count(*) as blocks_new
  from public.blocchi_locali
  where blocked_at >= current_date - 30
  group by grouping sets ((date(blocked_at), costr, commessa), (date(blocked_at), costr), (date(blocked_at)))
),
anomalies as (
  select
    report_date as day_date,
    costr,
    commessa,
    count(*) as anomalies
  from public.admin_ship_resolution_anomalies_v1
  where report_date >= current_date - 30
  group by grouping sets ((report_date, costr, commessa), (report_date, costr), (report_date))
),
combined as (
  select day_date, costr, commessa, alerts_critical, alerts_major, 0::bigint as blocks_new, 0::bigint as anomalies
  from alerts
  union all
  select day_date, costr, commessa, 0::bigint, 0::bigint, blocks_new, 0::bigint
  from blocks
  union all
  select day_date, costr, commessa, 0::bigint, 0::bigint, 0::bigint, anomalies
  from anomalies
),
agg as (
  select
    day_date,
    costr,
    commessa,
    sum(alerts_critical) as alerts_critical,
    sum(alerts_major) as alerts_major,
    sum(blocks_new) as blocks_new,
    sum(anomalies) as anomalies
  from combined
  group by day_date, costr, commessa
)
select
  day_date,
  costr,
  commessa,
  case
    when costr is null then 'GLOBAL'
    when commessa is null then 'COSTR'
    else 'COMMESSA'
  end as scope_level,
  alerts_critical,
  alerts_major,
  blocks_new,
  anomalies,
  (5 * alerts_critical + 3 * alerts_major + 2 * blocks_new + 1 * anomalies) as risk_index
from agg;

comment on view public.direzione_ai_daily_risk_v1 is
  'Indice rischio giornaliero (eventi nuovi): 5*C + 3*M + 2*Blocchi + 1*Anomalie.';

-- 4) 7-day projection (linear trend on last 7 days)
drop view if exists public.direzione_ai_projection_v1;
create view public.direzione_ai_projection_v1 as
with base_days as (
  select generate_series(current_date - 6, current_date, interval '1 day')::date as day_date
),
groups as (
  select distinct costr, commessa, scope_level
  from public.direzione_ai_daily_risk_v1
  where day_date >= current_date - 30
),
grid as (
  select g.costr, g.commessa, g.scope_level, d.day_date
  from groups g
  cross join base_days d
),
data as (
  select
    g.costr,
    g.commessa,
    g.scope_level,
    g.day_date,
    coalesce(r.risk_index, 0) as risk_index,
    (g.day_date - (current_date - 6))::int as day_idx
  from grid g
  left join public.direzione_ai_daily_risk_v1 r
    on r.day_date = g.day_date
   and r.costr is not distinct from g.costr
   and r.commessa is not distinct from g.commessa
   and r.scope_level = g.scope_level
),
stats as (
  select
    costr,
    commessa,
    scope_level,
    regr_slope(risk_index::numeric, day_idx::numeric) as slope,
    regr_intercept(risk_index::numeric, day_idx::numeric) as intercept,
    count(*) as points
  from data
  group by costr, commessa, scope_level
)
select
  s.costr,
  s.commessa,
  s.scope_level,
  (current_date + gs.day_offset)::date as forecast_date,
  greatest(0, (s.intercept + s.slope * (6 + gs.day_offset)::numeric)) as forecast_risk_index,
  s.slope,
  s.intercept,
  s.points,
  (current_date - 6)::date as base_from,
  current_date::date as base_to
from stats s
cross join generate_series(1, 7) as gs(day_offset);

comment on view public.direzione_ai_projection_v1 is
  'Proiezione 7 giorni: trend lineare su ultimi 7 giorni di rischio.';

-- 5) Top/Bottom performance ranking (last 7 days, approved)
drop view if exists public.direzione_ai_performance_rank_v1;
create view public.direzione_ai_performance_rank_v1 as
with base as (
  select
    r.report_date,
    rs.ship_id,
    rs.ship_code,
    rs.ship_name,
    rs.costr,
    rs.commessa,
    rr.previsto,
    rr.prodotto
  from public.rapportini r
  join public.rapportini_ship_resolution_v1 rs on rs.rapportino_id = r.id
  join public.archive_rapportino_rows_v1 rr on rr.rapportino_id = r.id
  where r.status = 'APPROVED_UFFICIO'
    and r.report_date >= current_date - 6
    and r.report_date <= current_date
)
select
  ship_id,
  ship_code,
  ship_name,
  costr,
  commessa,
  sum(coalesce(previsto, 0)) as previsto_sum,
  sum(coalesce(prodotto, 0)) as prodotto_sum,
  count(*) as righe_count,
  case
    when sum(coalesce(previsto, 0)) > 0 then sum(coalesce(prodotto, 0)) / sum(coalesce(previsto, 0))
    else null
  end as performance_ratio
from base
group by ship_id, ship_code, ship_name, costr, commessa;

comment on view public.direzione_ai_performance_rank_v1 is
  'Performance ratio per nave (ultimi 7 giorni): Σprodotto / Σprevisto.';

-- 6) Structural anomalies (open)
drop view if exists public.direzione_ai_anomalies_v1;
create view public.direzione_ai_anomalies_v1 as
with nav as (
  select
    costr,
    commessa,
    ('NAV_' || type::text) as anomaly_type,
    count(*) as open_count
  from public.navemaster_alerts
  where status = 'OPEN'::public.navemaster_alert_status
  group by grouping sets ((costr, commessa, type), (costr, type), (type))
),
ship as (
  select
    costr,
    commessa,
    'SHIP_RESOLUTION'::text as anomaly_type,
    count(*) as open_count
  from public.admin_ship_resolution_anomalies_v1
  where report_date >= current_date - 6
  group by grouping sets ((costr, commessa), (costr), ())
),
combined as (
  select costr, commessa, anomaly_type, open_count from nav
  union all
  select costr, commessa, anomaly_type, open_count from ship
)
select
  costr,
  commessa,
  case
    when costr is null then 'GLOBAL'
    when commessa is null then 'COSTR'
    else 'COMMESSA'
  end as scope_level,
  anomaly_type,
  sum(open_count) as open_count
from combined
group by costr, commessa, scope_level, anomaly_type;

comment on view public.direzione_ai_anomalies_v1 is
  'Anomalie strutturali aperte: NAVEMASTER alert + ship resolution.';

drop view if exists public.direzione_ai_anomalies_total_v1;
create view public.direzione_ai_anomalies_total_v1 as
select
  costr,
  commessa,
  scope_level,
  sum(open_count) as open_count
from public.direzione_ai_anomalies_v1
group by costr, commessa, scope_level;

comment on view public.direzione_ai_anomalies_total_v1 is
  'Totale anomalie strutturali aperte per scope.';

commit;
